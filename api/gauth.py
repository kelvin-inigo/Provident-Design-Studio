"""Google sign-in that renews itself: the authorisation-code flow, with the refresh token held
by the browser in an HttpOnly cookie that only this function can read.

Why a server: the browser-only token model gives an access token for about an hour and no way
to renew it without a click (Google's popup). A REFRESH token can renew it silently, but it
needs the OAuth client SECRET, which cannot live in a page. So:

  GET  /api/gauth?op=status    -> {on, client}      on = this deployment has the secret
  POST /api/gauth?op=exchange  {code}               the code from Google's popup (redirect
                                                    'postmessage') -> an access token; the
                                                    refresh token goes into the cookie
  POST /api/gauth?op=refresh                        the cookie -> a new access token, no popup
  POST /api/gauth?op=signout                        revoke and clear the cookie

The cookie (`pgr`) is HttpOnly, Secure, SameSite=Strict and scoped to /api/gauth, and its
value is SEALED (encrypt-then-MAC, keyed from the client secret), so neither page scripts nor
anyone reading the cookie jar can use the refresh token outside this function. POSTs must carry
`X-Provident: 1`, which a cross-site form cannot send; there are no CORS headers, so only the
site itself can read an answer.

Environment (Vercel, never the repo): GOOGLE_CLIENT_SECRET (required to switch it on),
GOOGLE_CLIENT_ID (defaults to the studios' public client id). GAUTH_TOKEN_URL and
GAUTH_REVOKE_URL exist only so tools/share-dev can stand in for Google. Admin steps:
docs/google-drive-setup.md.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

CLIENT_DEFAULT = '210522580023-ajcrfmscqohgbdq36t6ph4mrhnk9u5s3.apps.googleusercontent.com'
COOKIE = 'pgr'
MAX_AGE = 180 * 24 * 3600   # Google keeps an unused refresh token for six months


def client_id():
    return os.environ.get('GOOGLE_CLIENT_ID') or CLIENT_DEFAULT


def secret():
    return os.environ.get('GOOGLE_CLIENT_SECRET') or ''


def token_url():
    return os.environ.get('GAUTH_TOKEN_URL') or 'https://oauth2.googleapis.com/token'


def revoke_url():
    return os.environ.get('GAUTH_REVOKE_URL') or 'https://oauth2.googleapis.com/revoke'


# ---- sealing: SHA-256 counter-mode keystream, then HMAC-SHA256 over nonce + ciphertext ----
def _keys():
    root = hashlib.sha256(b'provident-gauth|' + secret().encode()).digest()
    return hmac.new(root, b'enc', hashlib.sha256).digest(), hmac.new(root, b'mac', hashlib.sha256).digest()


def _stream(k, nonce, n):
    out, i = b'', 0
    while len(out) < n:
        out += hashlib.sha256(k + nonce + i.to_bytes(4, 'big')).digest()
        i += 1
    return out[:n]


def seal(text):
    ke, km = _keys()
    nonce = secrets.token_bytes(16)
    pt = text.encode()
    ct = bytes(a ^ b for a, b in zip(pt, _stream(ke, nonce, len(pt))))
    tag = hmac.new(km, nonce + ct, hashlib.sha256).digest()[:16]
    return base64.urlsafe_b64encode(nonce + ct + tag).decode().rstrip('=')


def unseal(v):
    try:
        raw = base64.urlsafe_b64decode(v + '=' * (-len(v) % 4))
    except Exception:
        return None
    if len(raw) < 33:
        return None
    ke, km = _keys()
    nonce, ct, tag = raw[:16], raw[16:-16], raw[-16:]
    if not hmac.compare_digest(tag, hmac.new(km, nonce + ct, hashlib.sha256).digest()[:16]):
        return None
    return bytes(a ^ b for a, b in zip(ct, _stream(ke, nonce, len(ct)))).decode('utf-8', 'replace')


# ---- Google ----
def google(url, form):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(form).encode(),
                                 headers={'Content-Type': 'application/x-www-form-urlencoded'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except Exception:
            return e.code, {}
    except Exception as e:
        return 502, {'error': 'unreachable', 'error_description': str(e)}


def cookie_of(headers):
    for part in (headers.get('Cookie') or '').split(';'):
        k, _, v = part.strip().partition('=')
        if k == COOKIE:
            return v
    return ''


def set_cookie(value, age):
    return ('Set-Cookie', '%s=%s; Path=/api/gauth; Max-Age=%d; HttpOnly; Secure; SameSite=Strict' % (COOKIE, value, age))


def out(code, d, extra=None):
    return code, 'application/json', json.dumps(d, separators=(',', ':')).encode(), extra or []


def route(method, query, headers, body):
    q = {k: v[0] for k, v in urllib.parse.parse_qs(query).items()}
    op = q.get('op', '')
    if method == 'GET' and op == 'status':
        return out(200, {'on': bool(secret()), 'client': client_id()})
    if method != 'POST':
        return out(404, {'error': 'Unknown request.'})
    if headers.get('X-Provident') != '1':
        return out(403, {'error': 'Missing X-Provident header.'})
    if not secret():
        return out(503, {'error': 'Silent Google sign-in is not set up on this site (GOOGLE_CLIENT_SECRET).'})
    try:
        b = json.loads(body or b'{}')
    except ValueError:
        b = {}

    if op == 'exchange':
        code = str(b.get('code') or '')
        if not code:
            return out(400, {'error': 'No code.'})
        st, d = google(token_url(), {'code': code, 'client_id': client_id(), 'client_secret': secret(),
                                    'redirect_uri': 'postmessage', 'grant_type': 'authorization_code'})
        if st != 200 or not d.get('access_token'):
            return out(400, {'error': 'Google refused the sign-in (%s).' % (d.get('error_description') or d.get('error') or st)})
        extra = []
        if d.get('refresh_token'):
            extra.append(set_cookie(seal(json.dumps({'rt': d['refresh_token'], 'at': int(time.time())})), MAX_AGE))
        return out(200, {'access_token': d['access_token'], 'expires_in': d.get('expires_in', 3600),
                         'kept': bool(d.get('refresh_token'))}, extra)

    if op == 'refresh':
        raw = unseal(cookie_of(headers)) if cookie_of(headers) else None
        try:
            rt = json.loads(raw)['rt'] if raw else ''
        except (ValueError, KeyError, TypeError):
            rt = ''
        if not rt:
            return out(401, {'error': 'Not signed in on this computer.'})
        st, d = google(token_url(), {'refresh_token': rt, 'client_id': client_id(), 'client_secret': secret(),
                                    'grant_type': 'refresh_token'})
        if st == 200 and d.get('access_token'):
            # sliding: the cookie lives another six months from each use
            return out(200, {'access_token': d['access_token'], 'expires_in': d.get('expires_in', 3600)},
                       [set_cookie(cookie_of(headers), MAX_AGE)])
        if d.get('error') in ('invalid_grant', 'unauthorized_client'):
            # revoked, expired or the password changed: forget it, the next click signs in again
            return out(401, {'error': 'Google ended this sign-in — sign in again.'}, [set_cookie('', 0)])
        return out(502, {'error': 'Google did not answer (%s).' % (d.get('error') or st)})

    if op == 'signout':
        raw = unseal(cookie_of(headers)) if cookie_of(headers) else None
        try:
            rt = json.loads(raw)['rt'] if raw else ''
        except (ValueError, KeyError, TypeError):
            rt = ''
        if rt:
            google(revoke_url(), {'token': rt})
        return out(200, {'ok': True}, [set_cookie('', 0)])

    return out(404, {'error': 'Unknown request.'})


class handler(BaseHTTPRequestHandler):
    def _go(self, method):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        code, ctype, data, extra = route(method, urllib.parse.urlsplit(self.path).query, self.headers, body)
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        for k, v in extra:
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self): self._go('GET')
    def do_POST(self): self._go('POST')
    def log_message(self, *a): pass
