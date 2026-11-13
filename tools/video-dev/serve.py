"""Local server for the Video Studio prototype: the repo's static files, never cached.

    python3 tools/video-dev/serve.py [port]        # default 8794

Then open http://localhost:8794/Provident%20Video%20Studio.html
"""
import base64
import json
import os
import re
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8794
QUEUE = os.path.join(ROOT, '_animate')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # ── the animate queue: photos waiting to be turned into video by the animate-photos skill ──
    # One folder, `_animate/` (git-ignored): <id>.json is the job, <id>.jpg the start frame the
    # studio rendered, <id>.mp4 the finished clip the skill downloads. Status lives in the json:
    # queued -> working -> done (or failed) -> placed.
    def _json(self, code, obj):
        out = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def _jobs(self):
        os.makedirs(QUEUE, exist_ok=True)
        jobs = []
        for f in sorted(os.listdir(QUEUE)):
            if f.endswith('.json'):
                try:
                    jobs.append(json.load(open(os.path.join(QUEUE, f))))
                except Exception:
                    pass
        return jobs

    def do_POST(self):
        path = self.path.split('?')[0]
        n = int(self.headers.get('Content-Length') or 0)
        try:
            body = json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            return self._json(400, {'error': 'bad json'})
        jid = str(body.get('id') or '')
        if not re.match(r'^[a-z0-9]{4,16}$', jid):
            return self._json(400, {'error': 'bad id'})
        os.makedirs(QUEUE, exist_ok=True)
        jp = os.path.join(QUEUE, jid + '.json')
        if path == '/api/animate/job':
            m = re.match(r'^data:image/jpeg;base64,(.+)$', body.get('photo') or '', re.S)
            if not m:
                return self._json(400, {'error': 'photo must be a JPEG data URL'})
            open(os.path.join(QUEUE, jid + '.jpg'), 'wb').write(base64.b64decode(m.group(1)))
            job = {k: body.get(k) for k in ('id', 'name', 'move', 'prompt', 'duration', 'aspect', 'mode', 'model')}
            job.update(status='queued', photo=jid + '.jpg', at=int(time.time()))
            json.dump(job, open(jp, 'w'), indent=1)
            return self._json(200, job)
        if path in ('/api/animate/placed', '/api/animate/cancel') and os.path.exists(jp):
            if path.endswith('cancel'):
                for ext in ('.json', '.jpg', '.mp4'):
                    try:
                        os.remove(os.path.join(QUEUE, jid + ext))
                    except OSError:
                        pass
                return self._json(200, {'id': jid, 'status': 'cancelled'})
            job = json.load(open(jp))
            job['status'] = 'placed'
            json.dump(job, open(jp, 'w'), indent=1)
            return self._json(200, job)
        return self._json(404, {'error': 'not found'})

    def do_GET(self):
        if self.path.split('?')[0] == '/api/animate/jobs':
            return self._json(200, {'jobs': self._jobs()})
        if self.path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', '/Provident%20Video%20Studio.html')
            self.end_headers()
            return
        super().do_GET()


if __name__ == '__main__':
    print('Video Studio on http://localhost:%d/' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
