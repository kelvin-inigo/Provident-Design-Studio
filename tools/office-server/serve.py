"""Provident Design Studio on the office server (behind ngrok).

Serves the repo's files the way the public site does, AND its own /api/share and /api/gauth
(2026-11-25, by request): api/share.py runs here unchanged on the office server's own store
(store_disk.Disk, in PDS_DATA, default ~/pds-data, outside the repo so a sync never touches it),
so the studios opened at design-studio.ngrok-free.dev keep their links, ad sets, photos, access
list and hub tasks on this machine instead of on Vercel. tools/office-server/pull-vercel.py
copied the Vercel store across once.

Secrets come from the repo's .env (git-ignored, copied by hand): GOOGLE_CLIENT_SECRET,
ACCESS_ADMIN, SHARE_ADMIN_KEY, ROAM_API_KEY, HUB_PUSH_KEY, HUB_DESIGN_KEY, ANTHROPIC_API_KEY,
GITHUB_TOKEN — the same names as in Vercel. Never the dev stand-ins: SHARE_DEV is cleared.

Refuses hidden paths (.env, .git, .claude), Python and shell files, tools/, the api/ sources,
exports/ and folder listings. Listens on 127.0.0.1 only; ngrok's Google sign-in is the door.
"""
import importlib.util
import os
import posixpath
import sys
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
DENY_TOP = {'tools', 'api', 'exports', 'custom-components', 'scratchpad', 'node_modules'}
DENY_EXT = ('.py', '.pyc', '.sh', '.env', '.log', '.db', '.pem', '.key')
MAX_BODY = 8 * 1024 * 1024


def load_env(path):
    # KEY=value lines; a value already in the environment wins. Comments and bare names skipped.
    try:
        with open(path, encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, v = line.split('=', 1)
                v = v.strip().strip('"\'')
                if k.strip() and v:
                    os.environ.setdefault(k.strip(), v)
    except FileNotFoundError:
        pass


load_env(os.path.join(ROOT, '.env'))
load_env(os.path.join(ROOT, '.env.vercel'))   # the keys copied from Vercel (git-ignored)
# the in-memory store and the dev hub key are for tools/share-dev only, never here
for k in ('SHARE_DEV', 'SHARE_DEV_QUOTA', 'GAUTH_TOKEN_URL', 'GAUTH_REVOKE_URL', 'ACCESS_GOOGLE_BASE'):
    os.environ.pop(k, None)
DATA = os.path.abspath(os.path.expanduser((sys.argv[3] if len(sys.argv) > 3 else '') or os.environ.get('PDS_DATA') or '~/pds-data'))

sys.path.insert(0, HERE)
from store_disk import Disk  # noqa: E402


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'api', name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


share = load('share')
gauth = load('gauth')
share._store = Disk(DATA)   # share.store() hands this out from now on
# The office store has room Upstash's free plan does not: report against the disk's own size
os.environ.setdefault('SHARE_STORE_MB', '20000')
share.STORE_MB = int(os.environ['SHARE_STORE_MB'])


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _path(self):
        return urllib.parse.urlsplit(self.path).path

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > MAX_BODY:
            return None
        return self.rfile.read(n) if n else b''

    def _send(self, code, ctype, out, extra=None):
        self.send_response(code)
        for k, v in (extra.items() if isinstance(extra, dict) else extra or []):
            self.send_header(k, v)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(out)))
        super().end_headers()
        self.wfile.write(out)

    def _api(self, method):
        p = self._path()
        if p not in ('/api/share', '/api/gauth'):
            return False
        body = self._body()
        if body is None:
            self._send(413, 'application/json', b'{"error":"That request is too large."}')
            return True
        q = urllib.parse.urlsplit(self.path).query
        if p == '/api/share':
            code, ctype, out = share.route(method, q, body)
            self._send(code, ctype, out, share.CORS)
        else:
            code, ctype, out, extra = gauth.route(method, q, self.headers, body)
            self._send(code, ctype, out, extra)
        return True

    def do_GET(self):
        if not self._api('GET'):
            super().do_GET()

    def do_HEAD(self):
        super().do_HEAD()

    def do_POST(self):
        if not self._api('POST'):
            self.send_error(405)

    def do_OPTIONS(self):
        if not self._api('OPTIONS'):
            self.send_error(405)

    def blocked(self):
        p = posixpath.normpath(urllib.parse.unquote(self._path()))
        parts = [s for s in p.split('/') if s]
        if any(s.startswith('.') for s in parts):
            return True
        if parts and parts[0] in DENY_TOP:
            return True
        return p.lower().endswith(DENY_EXT)

    def send_head(self):
        if self.blocked():
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, fmt, *a):
        if self._path().startswith('/api/'):
            sys.stderr.write('%s %s\n' % (self.log_date_time_string(), fmt % a))


if __name__ == '__main__':
    print('PDS office server on 127.0.0.1:%d  files: %s  store: %s' % (PORT, ROOT, DATA), flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
