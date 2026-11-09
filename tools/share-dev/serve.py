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
import time
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
# Sign-in to the studio (api/share.py, op=acc*): the dev admin is the Drive stand-in's fixed
# account, and the server checks tokens against the stand-in's /drive/v3/about.
os.environ.setdefault('ACCESS_ADMIN', 'kelvin.inigo@providentestate.com')
os.environ.setdefault('ACCESS_GOOGLE_BASE', 'http://127.0.0.1:%d' % PORT)
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
            # DRIVE_DELAY_MS=200 adds a round trip's worth of latency to every Drive request, to
            # time a page against something nearer to Google than localhost
            if os.environ.get('DRIVE_DELAY_MS'): time.sleep(int(os.environ['DRIVE_DELAY_MS']) / 1000)
            code, ctype, out = drive_mock.route(method, u.path, u.query, self.headers, body)
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    # SIGN IN WITHOUT GOOGLE (2026-11-03): /dev-signin lists the admin and the seeded team; a
    # click stores a stand-in token ('dev:<email>:<name>', which the Drive stand-in and the
    # access check accept) and opens the home. This server only — the website never has it.
    def _dev_signin(self):
        import html as _h, json as _j
        people = [(share.acc_admin(), 'Admin')] + [(e, r) for e, r in share.ACC_SEED.items() if e != share.acc_admin()]
        word = {'Admin': 'Admin', 'designer': 'Designer', 'smm': 'Social media manager', 'cten': 'Content team \u00b7 English',
                'ctar': 'Content team \u00b7 Arabic', 'pm': 'Performance marketing', 'ct': 'Content team', 'dmt': 'Digital Marketing Team'}
        rows = ''.join('<button data-e="%s"><b>%s</b><small>%s</small></button>' % (_h.escape(e), _h.escape(word.get(r, r)), _h.escape(e)) for e, r in people)
        out = ('''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test sign-in</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#131519;color:#fff;font:300 15px/1.5 system-ui,sans-serif}
main{width:min(440px,calc(100vw - 32px))}h1{font-weight:400;font-size:24px;margin:0 0 6px}p{color:#b8bcc6;margin:0 0 20px}
button{display:grid;width:100%;text-align:left;gap:2px;margin:0 0 8px;padding:14px 16px;border:0;border-radius:12px;background:#1d2024;color:#fff;font:inherit;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
button:hover{background:#252931}button b{font-weight:500}small{color:#b8bcc6;font-size:13px}</style>
<main><h1>Sign in for testing</h1><p>Local test server only. Pick who to be; the home opens signed in as them, with that role's queue, New and Access.</p>__ROWS__
<p style="margin-top:16px;font-size:13px">Empty? <a href="/dev-seed" style="color:#fff">Fill it with demo data</a>. To switch, come back to /dev-signin. The admin can also use Access \u203a Preview the home as.</p></main>
<script>
// ?as=<email, or a role word such as pm>&go=<home route>: signs in without a click, for a
// browser that cannot be scripted (Safari)
function signIn(em, go) {
  var o = location.origin, name = em.split('@')[0];
  name = ({ 'exec4.graphics': 'Aisha Rahman', 'exec5.graphics': 'Marco Santos', 'exec10.media': 'Layla Haddad', 'exec1.content': 'Priya Nair',
    'exec2.content': 'Omar Khalil', 'digitalmarketing.lead1': 'Dennis Bugos' })[name] || name;
  if (em === __ADMIN__) name = 'Kelvin Inigo';
  localStorage.setItem('provident-share-base', o); localStorage.setItem('provident-drive-base', o);
  localStorage.setItem('provident-drive-tok', JSON.stringify({ at: 'dev:' + em + ':' + name, exp: Date.now() + 365 * 864e5 }));
  localStorage.setItem('provident-drive-who', JSON.stringify({ email: em, name: name }));
  localStorage.setItem('provident-status-root', __ROOT__); localStorage.setItem('provident-posts-root', __ROOT__);
  ['provident-acc-me', 'provident-inbox-cas', 'provident-inbox-ops', 'provident-status-sum'].forEach(function (k) { localStorage.removeItem(k); });
  sessionStorage.clear();
  location.href = '/index.html#/' + (go || '');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('button[data-e]'); if (b) signIn(b.dataset.e);
});
(function () {
  var q = new URLSearchParams(location.search), as = q.get('as'); if (!as) return;
  var bs = [].slice.call(document.querySelectorAll('button[data-e]')), hit = bs.filter(function (b) {
    return b.dataset.e === as || b.textContent.toLowerCase().indexOf(as.toLowerCase()) >= 0; })[0];
  if (as === 'pm') hit = bs.filter(function (b) { return /Performance/.test(b.textContent); })[0];
  if (hit) signIn(hit.dataset.e, q.get('go') || '');
})();
</script>''').replace('__ROWS__', rows).replace('__ADMIN__', _j.dumps(share.acc_admin())).replace('__ROOT__', _j.dumps(drive_mock.SEED['id'])).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    # DEMO DATA (2026-11-03): /dev-seed fills the stand-ins with campaigns and posts at every
    # stage, access requests and saved projects (seed.js), signed in as the admin.
    def _dev_seed(self):
        import json as _j
        out = ('''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo data</title>
<script>
window.SEED_ROOT = __ROOT__; window.SEED_ADMIN = __ADMIN__;
localStorage.setItem('provident-share-base', location.origin); localStorage.setItem('provident-drive-base', location.origin);
localStorage.setItem('provident-drive-tok', JSON.stringify({ at: 'dev:' + __ADMIN__ + ':Kelvin Inigo', exp: Date.now() + 365 * 864e5 }));
localStorage.setItem('provident-status-root', __ROOT__); localStorage.setItem('provident-posts-root', __ROOT__);
</script>
<script src="/studio-base.js"></script><script src="/share-link.js"></script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#131519;color:#fff;font:300 15px/1.5 system-ui,sans-serif}
main{width:min(520px,calc(100vw - 32px))}h1{font-weight:400;font-size:24px;margin:0 0 6px}p{color:#b8bcc6;margin:0 0 18px}
button{height:44px;padding:0 20px;border:0;border-radius:999px;background:#fff;color:#131519;font:500 15px system-ui,sans-serif;cursor:pointer}
button:disabled{opacity:.6;cursor:default}ol{margin:20px 0 0;padding-left:20px;color:#b8bcc6;font-size:13.5px}</style>
<main><h1>Fill with demo data</h1>
<p>Local test server only. Adds 7 campaigns and 7 posts across every stage (ticket, design, copy check, translation, ready), the team's names, 3 access requests, and 12 saved projects on this computer. Run it once after the server starts; it starts empty each time.</p>
<button id="go" type="button">Fill it</button><ol id="log"></ol></main>
<script src="/tools/share-dev/seed.js"></script>''').replace('__ROOT__', _j.dumps(drive_mock.SEED['id'])).replace('__ADMIN__', _j.dumps(share.acc_admin())).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def do_GET(self):
        if urllib.parse.urlsplit(self.path).path == '/dev-signin': return self._dev_signin()
        if urllib.parse.urlsplit(self.path).path == '/dev-seed': return self._dev_seed()
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
    print('sign in without Google: http://localhost:%d/dev-signin' % port)
    print('demo data: http://localhost:%d/dev-seed' % port)
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
