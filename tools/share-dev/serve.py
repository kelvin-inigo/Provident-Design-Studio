"""Local test server for shared edit links.

Serves the repo the way Vercel does: the static files, plus /api/share routed to
api/share.py. With no store configured it runs on an in-memory one (SHARE_DEV=1), so
nothing leaves this computer and everything is gone when it stops.

    python3 tools/share-dev/serve.py [port]        # default 8790

Then open http://localhost:8790/Provident%20Organic%20Studio.dc.html and, once, in its
console: localStorage.setItem('provident-share-base', location.origin). Without that the
studios talk to the public website's store (share-link.js, shareBase()).
"""
import importlib.util
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if not (os.environ.get('KV_REST_API_URL') or os.environ.get('UPSTASH_REDIS_REST_URL')):
    os.environ['SHARE_DEV'] = '1'
spec = importlib.util.spec_from_file_location('share', os.path.join(ROOT, 'api', 'share.py'))
share = importlib.util.module_from_spec(spec)
spec.loader.exec_module(share)
sys.path.insert(0, os.path.dirname(__file__))
import drive_mock  # noqa: E402  the Google Drive stand-in (review links stored on Drive)

# Silent Google sign-in (api/gauth.py) against a stand-in for Google's token endpoint, below:
# the code 'dev-code' signs in, the refresh token 'rt-dev' renews, anything else is refused.
# Set GAUTH_REAL=1 to leave the environment alone (a real secret, Google's real endpoint).
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
if os.environ.get('GAUTH_REAL') != '1':
    os.environ.setdefault('GOOGLE_CLIENT_SECRET', 'dev-secret')
    os.environ['GAUTH_TOKEN_URL'] = 'http://127.0.0.1:%d/gauth-mock/token' % PORT
    os.environ['GAUTH_REVOKE_URL'] = 'http://127.0.0.1:%d/gauth-mock/revoke' % PORT
gspec = importlib.util.spec_from_file_location('gauth', os.path.join(ROOT, 'api', 'gauth.py'))
gauth = importlib.util.module_from_spec(gspec)
gspec.loader.exec_module(gauth)
GMOCK = {'refreshes': 0, 'revoked': 0}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _api(self, method):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        code, ctype, out = share.route(method, urllib.parse.urlsplit(self.path).query, body)
        self.send_response(code)
        for k, v in share.CORS.items():
            self.send_header(k, v)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def is_api(self):
        return urllib.parse.urlsplit(self.path).path == '/api/share'

    def _gauth(self, method):
        u = urllib.parse.urlsplit(self.path)
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        import json as _j
        if u.path == '/gauth-mock/token':
            f = {k: v[0] for k, v in urllib.parse.parse_qs(body.decode()).items()}
            if f.get('grant_type') == 'authorization_code' and f.get('code') == 'dev-code':
                code, d = 200, {'access_token': 'dev', 'expires_in': 3600, 'refresh_token': 'rt-dev'}
            elif f.get('grant_type') == 'refresh_token' and f.get('refresh_token') == 'rt-dev' and f.get('client_secret') == os.environ.get('GOOGLE_CLIENT_SECRET'):
                GMOCK['refreshes'] += 1
                code, d = 200, {'access_token': 'dev', 'expires_in': 3600}
            else:
                code, d = 400, {'error': 'invalid_grant'}
            out, ctype, extra = _j.dumps(d).encode(), 'application/json', []
        elif u.path == '/gauth-mock/revoke':
            GMOCK['revoked'] += 1
            code, ctype, out, extra = 200, 'application/json', b'{}', []
        elif u.path == '/gauth-mock':
            code, ctype, out, extra = 200, 'application/json', _j.dumps(GMOCK).encode(), []
        else:
            code, ctype, out, extra = gauth.route(method, u.query, self.headers, body)
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        for k, v in extra:
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def is_gauth(self):
        p = urllib.parse.urlsplit(self.path).path
        return p == '/api/gauth' or p.startswith('/gauth-mock')

    def is_drive(self):
        p = urllib.parse.urlsplit(self.path).path
        return p.startswith('/drive/v3/') or p.startswith('/upload/drive/v3/') or p == '/drive-mock'

    def _drive(self, method):
        u = urllib.parse.urlsplit(self.path)
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        if u.path == '/drive-mock':  # the test's own view of the stand-in: its tree, or a reset
            if 'reset' in u.query: drive_mock.reset()
            import json as _j
            code, ctype, out = 200, 'application/json', _j.dumps(drive_mock.snapshot()).encode()
        else:
            code, ctype, out = drive_mock.route(method, u.path, u.query, self.headers, body)
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def do_GET(self):
        if self.is_gauth(): return self._gauth('GET')
        if self.is_api(): return self._api('GET')
        if self.is_drive(): return self._drive('GET')
        return super().do_GET()

    def do_POST(self):
        if self.is_gauth(): return self._gauth('POST')
        if self.is_api(): return self._api('POST')
        if self.is_drive(): return self._drive('POST')
        self.send_error(405)

    def do_PATCH(self):
        if self.is_drive(): return self._drive('PATCH')
        self.send_error(405)

    def do_DELETE(self):
        if self.is_drive(): return self._drive('DELETE')
        self.send_error(405)

    def do_OPTIONS(self):
        if self.is_api(): return self._api('OPTIONS')
        self.send_error(405)

    def end_headers(self):
        if not self.is_api() and not self.is_drive() and not self.is_gauth():
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a): pass


if __name__ == '__main__':
    port = PORT
    print('share dev server on http://localhost:%d  (store: %s)' % (port, 'memory' if os.environ.get('SHARE_DEV') == '1' else 'upstash'))
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
