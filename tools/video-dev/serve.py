"""Local server for the Video Studio prototype: the repo's static files, never cached.

    python3 tools/video-dev/serve.py [port]        # default 8794

Then open http://localhost:8794/Provident%20Video%20Studio.html
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8794


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', '/Provident%20Video%20Studio.html')
            self.end_headers()
            return
        super().do_GET()


if __name__ == '__main__':
    print('Video Studio on http://localhost:%d/' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
