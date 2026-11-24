"""Static server for Provident Design Studio on the office server (behind ngrok).

Serves the repo's files the way the public site does, nothing else: no /api (the studios
call the live Vercel store through share-link.js shareBase()), no dev sign-in or Drive
stand-in. Refuses hidden paths (.env, .git, .claude), Python sources and tools/.
"""
import os, sys, posixpath, urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else '~/Provident-Design-Studio')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
DENY_TOP = {'tools', 'api', 'exports', 'custom-components', 'scratchpad', 'node_modules'}
DENY_EXT = ('.py', '.pyc', '.sh', '.env', '.log', '.db', '.pem', '.key')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def blocked(self):
        p = posixpath.normpath(urllib.parse.unquote(urllib.parse.urlsplit(self.path).path))
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


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
