#!/usr/bin/env python3
"""Generative fill for CAS — a loopback helper that extends a photo to a canvas with Adobe Firefly.

STAGED PROTOTYPE (branch `cas-genfill`, 2026-11-20). Not on main, not on the live site.

    python3 tools/genfill/serve.py            # serves http://127.0.0.1:7315

WHY A HELPER, AND WHY CLAUDE CODE
---------------------------------
A web page cannot hold an Adobe sign-in. The user's Adobe account is connected to their Claude account
(the "Adobe" connector), and Claude Code on this computer can use it headless — the same trick CASV's
server uses to write video prompts. So this helper runs `claude -p` with ONLY the Adobe connector and
`curl` allowed, in a job folder of its own, and asks it to: upload the photo to Creative Cloud, call
Photoshop's Generative Expand (Firefly) with the exact pixels CAS computed, wait, and download the
result. No Adobe keys live here or in the repo.

Like the cut-out service it is a CAPABILITY: with the helper off, CAS's modal still opens and shows the
layout, and says Generate is unavailable.

API (JSON, CORS open, loopback only)
  GET  /health                -> {ok, claude}
  POST /expand                {image: dataURL (jpeg/png), expand: {left,right,top,bottom}, variations: 1-3}
                              -> {job}
  GET  /job/<id>              -> {state: queued|running|done|failed, step, results: [dataURL], error}
"""
import base64
import glob
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('GENFILL_PORT') or (sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].isdigit() else 7315))
MODEL = os.environ.get('GENFILL_MODEL', 'sonnet')
WORK = os.path.join(tempfile.gettempdir(), 'pds-genfill')
JOBS = {}
LOCK = threading.Lock()
MAX_BODY = 40 * 1024 * 1024


def claude_bin():
    found = [shutil.which('claude'), os.path.expanduser('~/.local/bin/claude'), os.path.expanduser('~/.claude/local/claude')]
    found += sorted(glob.glob(os.path.expanduser('~/Library/Application Support/Claude/claude-code/*/*/claude.app/Contents/MacOS/claude')),
                    key=os.path.getmtime, reverse=True)
    return next((p for p in found if p and os.access(p, os.X_OK)), None)


def claude_env():
    # started from inside a Claude Code session, the parent's variables would make this one refuse to run
    return {k: v for k, v in os.environ.items() if not k.startswith(('CLAUDECODE', 'CLAUDE_CODE_'))}


PROMPT = """You are a file-processing step inside a design tool. Work only in the current folder and only with
the Adobe tools (mcp__claude_ai_Adobe__*) and curl. Do not ask questions; do not describe the image.

The photo is ./{name} ({size} bytes, {w}x{h}, {mime}).

1. Call adobe_mandatory_init.
2. Call asset_initialize_file_upload with path "pds-genfill/{job}.{ext}", file_size {size}, media_type "{mime}",
   block_size 52428800. It returns a transfer document with ONE block transfer URL.
3. Upload the bytes: curl -sS -X PUT -H "Content-Type: {mime}" --data-binary @{name} "<that block URL>"
4. Call asset_finalize_file_upload with the filename it gave you and the transfer document (keep "repo:size": {size}).
   Take the presignedAssetUrl from the result.
5. Call image_generative_expand {n} time(s), once per seed in {seeds}, each with
   imageURIs [presignedAssetUrl], options {{"expandPixels": {expand}, "seeds": [<that seed>]}}, outputFileType "png",
   sessionId "-1". If a result says status "working", call image_get_task_status with its taskId until it has outputUrl.
6. Download each result in seed order: curl -sSL -o out-<k>.png "<outputUrl>"   (k = 1, 2, 3 ...)
7. Reply with one line: DONE <number of files>, or FAILED <the Adobe error, verbatim and short>.
"""

STEPS = [  # tool name fragment -> what the modal says
    ('adobe_mandatory_init', 'Connecting to Adobe'),
    ('asset_initialize_file_upload', 'Uploading the photo to Adobe'),
    ('asset_finalize_file_upload', 'Uploading the photo to Adobe'),
    ('image_generative_expand', 'Firefly is generating the edges'),
    ('image_get_task_status', 'Firefly is generating the edges'),
]


def set_job(jid, **k):
    with LOCK:
        JOBS[jid].update(k)


def run(jid, folder, name, mime, w, h, expand, n):
    try:
        cb = claude_bin()
        if not cb:
            return set_job(jid, state='failed', error='Claude Code is not on this computer, so the helper cannot reach Adobe.')
        size = os.path.getsize(os.path.join(folder, name))
        seeds = [random.randint(1, 2 ** 31 - 1) for _ in range(n)]
        q = PROMPT.format(name=name, size=size, w=w, h=h, mime=mime, job=jid, ext=name.rsplit('.', 1)[-1],
                          n=n, seeds=json.dumps(seeds), expand=json.dumps(expand))
        set_job(jid, state='running', step='Starting Claude', started=time.time())
        cmd = [cb, '-p', q, '--model', MODEL, '--output-format', 'stream-json', '--verbose',
               '--allowedTools', 'mcp__claude_ai_Adobe', 'Bash(curl:*)']
        p = subprocess.Popen(cmd, cwd=folder, env=claude_env(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        last = ''
        deadline = time.time() + 600
        for line in p.stdout:
            if time.time() > deadline:
                p.kill()
                return set_job(jid, state='failed', error='Adobe took longer than 10 minutes. Try again.')
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            if ev.get('type') == 'assistant':
                for c in (ev.get('message') or {}).get('content') or []:
                    if c.get('type') == 'tool_use':
                        nm = c.get('name') or ''
                        inp = json.dumps(c.get('input') or {})
                        step = next((s for f, s in STEPS if f in nm), None)
                        if nm == 'Bash' and 'out-' in inp:
                            step = 'Downloading the result'
                        elif nm == 'Bash' and 'PUT' in inp:
                            step = 'Uploading the photo to Adobe'
                        if step:
                            set_job(jid, step=step)
            elif ev.get('type') == 'result':
                last = str(ev.get('result') or '')
        p.wait()
        outs = sorted(glob.glob(os.path.join(folder, 'out-*.png')))
        good = []
        for o in outs:
            with open(o, 'rb') as f:
                b = f.read()
            if b[:8] == b'\x89PNG\r\n\x1a\n' or b[:3] == b'\xff\xd8\xff':
                kind = 'png' if b[:4] == b'\x89PNG' else 'jpeg'
                good.append('data:image/%s;base64,%s' % (kind, base64.b64encode(b).decode()))
        if not good:
            m = re.search(r'FAILED\s*(.*)', last)
            err = (m.group(1).strip() if m else last.strip()[-300:]) or 'Adobe returned no picture.'
            if 'not logged in' in last.lower() or 'login' in last.lower():
                err = 'Claude Code is not signed in on this computer. Run `claude auth login` once in Terminal.'
            return set_job(jid, state='failed', error=err)
        set_job(jid, state='done', step='Done', results=good, took=round(time.time() - JOBS[jid]['started'], 1))
    except Exception as e:  # noqa: BLE001 — a failure must reach the modal, never kill the thread silently
        set_job(jid, state='failed', error='The helper hit an error: %s' % e)


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):
        sys.stderr.write('[genfill] ' + (fmt % a) + '\n')

    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self._cors()
        self.end_headers()
        self.wfile.write(b)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Max-Age', '86400')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/health'):
            return self._send(200, {'ok': True, 'claude': bool(claude_bin()), 'model': MODEL})
        m = re.match(r'^/job/([0-9a-f]{12})$', self.path)
        if m:
            with LOCK:
                j = dict(JOBS.get(m.group(1)) or {})
            if not j:
                return self._send(404, {'error': 'No such job.'})
            j.pop('started', None)
            if j.get('state') == 'running':
                j['elapsed'] = round(time.time() - JOBS[m.group(1)].get('started', time.time()))
            return self._send(200, j)
        self._send(404, {'error': 'Not found.'})

    def do_POST(self):
        if self.path != '/expand':
            return self._send(404, {'error': 'Not found.'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            return self._send(413, {'error': 'The photo is too large to send.'})
        try:
            body = json.loads(self.rfile.read(n))
            m = re.match(r'^data:(image/(png|jpeg));base64,(.+)$', body.get('image') or '', re.S)
            if not m:
                return self._send(400, {'error': 'Send the photo as a PNG or JPEG data URL.'})
            raw = base64.b64decode(m.group(3))
            ex = body.get('expand') or {}
            expand = {k: max(0, min(4096, int(ex.get(k) or 0))) for k in ('left', 'right', 'top', 'bottom')}
            if not any(expand.values()):
                return self._send(400, {'error': 'Nothing to generate: the photo already fills the frame.'})
            w, h = int(body.get('w') or 0), int(body.get('h') or 0)
            nvar = max(1, min(3, int(body.get('variations') or 1)))
        except (ValueError, TypeError) as e:
            return self._send(400, {'error': 'Bad request: %s' % e})
        jid = uuid.uuid4().hex[:12]
        folder = os.path.join(WORK, jid)
        os.makedirs(folder, exist_ok=True)
        ext = 'png' if m.group(2) == 'png' else 'jpg'
        name = 'in.' + ext
        with open(os.path.join(folder, name), 'wb') as f:
            f.write(raw)
        with LOCK:
            JOBS[jid] = {'state': 'queued', 'step': 'Queued', 'results': [], 'error': '', 'expand': expand, 'started': time.time()}
        threading.Thread(target=run, args=(jid, folder, name, m.group(1), w, h, expand, nvar), daemon=True).start()
        self._send(200, {'job': jid})


if __name__ == '__main__':
    os.makedirs(WORK, exist_ok=True)
    print('Generative fill helper on http://127.0.0.1:%d  (Claude Code: %s, model %s)' % (PORT, claude_bin() or 'NOT FOUND', MODEL))
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
