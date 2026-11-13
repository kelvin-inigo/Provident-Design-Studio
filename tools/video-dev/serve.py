"""Local server for the Video Studio prototype: the repo's static files, never cached.

    python3 tools/video-dev/serve.py [port]        # default 8794

Then open http://localhost:8794/Provident%20Video%20Studio.html
"""
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8794
QUEUE = os.path.join(ROOT, '_animate')


# ── Generate now: Higgsfield's own command-line tool (`npm i -g @higgsfield/cli`, then
# `higgsfield auth login` once). It spends the signed-in account's plan credits, the same as the
# website, and needs no Claude and no API key. Nothing here runs without the studio's explicit
# /api/animate/run, which the page only sends after showing the cost.
HF = shutil.which('higgsfield') or os.path.expanduser('~/.local/node/bin/higgsfield')
SIGN_IN = "Higgsfield's tool is not signed in on this computer. Run `higgsfield auth login` in Terminal, or use Send to the animate queue."


def hf_args(job, photo):
    """The tool's params for one job. Same settings table as the animate-photos skill."""
    pro = job.get('mode') == 'pro'
    a = [job.get('model') or 'seedance_2_5', '--prompt', job.get('prompt') or '', '--duration', str(int(job.get('duration') or 5)),
         '--aspect_ratio', job.get('aspect') or '9:16', '--start-image', photo]
    if a[0] == 'seedance_2_5':
        a += ['--mode', 'omni_reference', '--resolution', '1080p' if pro else '720p',
              '--bitrate_mode', 'high' if pro else 'standard', '--generate_audio', 'false']
    else:                                   # kling3_0, cinematic_studio_video_v2
        a += ['--mode', 'pro' if pro else 'std', '--sound', 'off']
    return a


def hf(*args, timeout=120):
    if not os.path.exists(HF):
        return 1, "Higgsfield's tool is not installed on this computer (npm i -g @higgsfield/cli)."
    try:
        r = subprocess.run([HF, *args, '--json', '--no-color'], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return 1, 'Higgsfield did not answer in time.'
    out = (r.stdout or '') + (r.stderr or '')
    if r.returncode and re.search(r'auth login|No workspace|not logged|unauthor', out, re.I):
        return 1, SIGN_IN
    return r.returncode, out.strip()


def hf_run(jp):
    """Create, wait, download. Runs in its own thread; the job file carries the state."""
    def save(**k):
        job = json.load(open(jp)); job.update(k); json.dump(job, open(jp, 'w'), indent=1); return job
    try:
        job = json.load(open(jp))
        rc, out = hf('generate', 'create', *hf_args(job, os.path.join(QUEUE, job['photo'])), timeout=300)
        m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out)
        if rc or not m:
            return save(status='failed', error=(out or 'no job id came back')[-300:])
        save(job_id=m.group(0))
        hf('generate', 'wait', m.group(0), '--timeout', '25m', '--interval', '5s', '--quiet', timeout=1600)
        rc, out = hf('generate', 'get', m.group(0))
        u = re.search(r'https://[^"\s]+\.mp4[^"\s]*', out)
        if rc or not u:
            return save(status='failed', error=(out or 'no video came back')[-300:])
        mp4 = os.path.join(QUEUE, job['id'] + '.mp4')
        with urllib.request.urlopen(u.group(0), timeout=300) as r, open(mp4, 'wb') as f:
            shutil.copyfileobj(r, f)
        save(status='done', video=job['id'] + '.mp4')
    except Exception as e:                   # never leave a clip reading "Generating…" forever
        try:
            save(status='failed', error='%s: %s' % (type(e).__name__, e))
        except Exception:
            pass


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
        if path in ('/api/animate/cost', '/api/animate/run') and os.path.exists(jp):
            job = json.load(open(jp))
            if job.get('status') != 'queued':
                return self._json(200, {'error': 'That job is already %s.' % job.get('status')})
            if path.endswith('cost'):
                rc, out = hf('generate', 'cost', *hf_args(job, os.path.join(QUEUE, job['photo'])))
                m = re.search(r'"credits(?:_exact)?"\s*:\s*([0-9.]+)', out) or re.search(r'([0-9]+(?:\.[0-9]+)?)\s*credits', out, re.I)
                if rc or not m:
                    return self._json(200, {'error': out[-300:] or 'Higgsfield gave no price.'})
                return self._json(200, {'id': jid, 'credits': float(m.group(1))})
            job['status'] = 'working'
            json.dump(job, open(jp, 'w'), indent=1)
            threading.Thread(target=hf_run, args=(jp,), daemon=True).start()
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
