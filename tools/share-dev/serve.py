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


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _api(self, method):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        code, ctype, out = share.app(method, urllib.parse.urlsplit(self.path).query, body)
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

    def do_GET(self):
        if self.is_api(): return self._api('GET')
        return super().do_GET()

    def do_POST(self):
        if self.is_api(): return self._api('POST')
        self.send_error(405)

    def do_OPTIONS(self):
        if self.is_api(): return self._api('OPTIONS')
        self.send_error(405)

    def end_headers(self):
        if not self.is_api():
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a): pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
    print('share dev server on http://localhost:%d  (store: %s)' % (port, 'memory' if os.environ.get('SHARE_DEV') == '1' else 'upstash'))
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
