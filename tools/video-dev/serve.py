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
# Finished videos waiting for CAS. CASV records the Reel and the Square, parks both here, and the
# CAS website (which holds the Google sign-in) fetches them from this computer and uploads them to
# the ad set's Drive folder. `_outbox/` is git-ignored: <id>.json the record, <id>_9x16.mp4,
# <id>_1x1.mp4, <id>.jpg the poster, <id>.notes.json the comments CAS sends back.
OUTBOX = os.path.join(ROOT, '_outbox')
# Only these pages may read the outbox from a browser. Add more with CASV_ORIGINS="https://a,https://b".
SITES = ['https://provident-design-studio.vercel.app'] + [o.strip() for o in os.environ.get('CASV_ORIGINS', '').split(',') if o.strip()]
PARTS = {'9x16': ('_9x16.mp4', 'video/mp4'), '1x1': ('_1x1.mp4', 'video/mp4'), 'poster': ('.jpg', 'image/jpeg'),
         'project': ('.casv', 'application/octet-stream'),
         # CAS's Edit in CASV: the video CASV's "Send back to CAS" records, which CAS places as the
         # design's video background (2026-11-17). Not a video of its own: no <id>.json is written.
         'bg': ('_bg.mp4', 'video/mp4')}
# THE PROJECT GOES WITH THE VIDEO (2026-11-16). Send to CAS also parks <id>.casv: the project and
# the media it uses, one file. CAS saves it in the ad set's Drive folder beside the two videos, and
# its "Open in Video Studio" hands it back here: PUT /api/outbox/back writes `_inbox/<id>.casv`
# (git-ignored), which the studio page offers to open (/api/inbox/list, /file, /done).
INBOX = os.path.join(ROOT, '_inbox')


def site_ok(origin):
    return bool(origin) and (origin in SITES or re.match(r'^http://(localhost|127\.0\.0\.1)(:\d+)?$', origin) is not None)


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
              '--bitrate_mode', 'high' if pro else 'standard', '--generate_audio', 'true']
    else:                                   # kling3_0, cinematic_studio_video_v2
        a += ['--mode', 'pro' if pro else 'std', '--sound', 'on']
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


HF_SEEN = {}                               # id -> result_url, from the last listing; the page only ever names an id


def hf_library(size):
    """The account's finished videos, newest first (`generate list --video`): free, read-only."""
    rc, out = hf('generate', 'list', '--video', '--size', str(size), timeout=60)
    if rc:
        return {'error': 'signin' if out == SIGN_IN else (out[-300:] or 'Higgsfield gave no list.')}
    try:
        rows = json.loads(out)
    except Exception:
        return {'error': 'Higgsfield gave no list.'}
    if isinstance(rows, dict):
        rows = rows.get('items') or rows.get('jobs') or []
    items = []
    for r in rows:
        u = r.get('result_url') or ''
        if r.get('status') != 'completed' or not re.match(r'^https://[^ ]+\.(mp4|mov|webm)(\?|$)', u) or not r.get('id'):
            continue
        p = r.get('params') or {}
        HF_SEEN[r['id']] = u
        items.append({'id': r['id'], 'model': r.get('display_name') or r.get('job_type') or 'Video', 'at': r.get('created_at'),
                      'seconds': p.get('duration'), 'w': p.get('width'), 'h': p.get('height'), 'aspect': p.get('aspect_ratio') or '',
                      'thumb': r.get('thumbnail_url') or '', 'url': u, 'prompt': (p.get('prompt') or '')[:400]})
    return {'items': items, 'more': len(rows) >= size}


def hf_result(out, exts):
    """The finished file's URL from `generate get --json`: result_url, never a URL buried in the
    params (a voice's preview sample is an .mp3 too, and was once downloaded by mistake)."""
    try:
        u = json.loads(out).get('result_url') or ''
    except Exception:
        u = ''
    m = re.search(r'\.(%s)(?:\?|$)' % exts, u)
    return (u, m.group(1)) if m else ('', '')


def hf_run(jp):
    """Create, wait, download. Runs in its own thread; the job file carries the state."""
    def save(**k):
        job = json.load(open(jp)); job.update(k); json.dump(job, open(jp, 'w'), indent=1); return job
    try:
        job = save(step='sending', started=int(time.time()))
        rc, out = hf('generate', 'create', *hf_args(job, os.path.join(QUEUE, job['photo'])), timeout=300)
        m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out)
        if rc or not m:
            return save(status='failed', error=(out or 'no job id came back')[-300:])
        save(job_id=m.group(0), step='rendering')
        hf('generate', 'wait', m.group(0), '--timeout', '25m', '--interval', '5s', '--quiet', timeout=1600)
        rc, out = hf('generate', 'get', m.group(0))
        u, _ = hf_result(out, 'mp4|mov|webm')
        if rc or not u:
            return save(status='failed', error=(out or 'no video came back')[-300:])
        save(step='downloading')
        mp4 = os.path.join(QUEUE, job['id'] + '.mp4')
        with urllib.request.urlopen(u, timeout=300) as r, open(mp4, 'wb') as f:
            shutil.copyfileobj(r, f)
        save(status='done', video=job['id'] + '.mp4', done_at=int(time.time()))
    except Exception as e:                   # never leave a clip reading "Generating…" forever
        try:
            save(status='failed', error='%s: %s' % (type(e).__name__, e))
        except Exception:
            pass


# ── voiceovers: a script spoken by a chosen voice. Mac voices are free and offline (`say`);
# Higgsfield voices go through the same tool as Generate now (text2speech_v2, ElevenLabs engine)
# and spend credits, so the page prices them first and asks.
MAC_VOICES = ['Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Rishi']
_voices = {}


def voice_list():
    if not _voices:
        try:
            have = subprocess.run(['say', '-v', '?'], capture_output=True, text=True, timeout=10).stdout
        except Exception:
            have = ''
        _voices['mac'] = [v for v in MAC_VOICES if re.search(r'^%s\s' % v, have, re.M)]
        rc, out = hf('voices', 'list', '--size', '100')
        try:
            items = json.loads(out)
            items = items if isinstance(items, list) else (items.get('items') or items.get('voices') or items.get('data') or [])
            # preview clips are not in the tool's listing; `_animate/voice-previews.json` (id -> gender, url)
            # was saved once from Higgsfield's own voice list. A voice missing from it has no sample.
            try:
                pv = json.load(open(os.path.join(QUEUE, 'voice-previews.json')))
            except Exception:
                pv = {}
            _voices['hf'] = [{'id': v['id'], 'name': v.get('name'), 'type': v.get('voice_type'),
                              'gender': (pv.get(v['id']) or {}).get('gender', ''), 'preview': (pv.get(v['id']) or {}).get('url', '')}
                             for v in items if v.get('status') == 'completed']
        except Exception:
            _voices['hf'] = []
            _voices['note'] = out[-200:] if rc else ''
    return _voices


def tts_args(body):
    return ['text2speech_v2', '--prompt', str(body.get('text') or '')[:5000], '--variant', 'elevenlabs',
            '--voice_id', str(body.get('voice_id') or ''), '--voice_type', str(body.get('voice_type') or 'preset')]


def music_args(body):
    """Instrumental music from a description. Sonilo is the cheap one; ElevenLabs Music v2.5 is the
    other. Always instrumental: a voiceover sits on top."""
    model = 'elevenlabs_music_v2_5' if body.get('model') == 'elevenlabs' else 'sonilo_music'
    a = [model, '--prompt', str(body.get('text') or '')[:2000], '--duration', str(int(max(5, min(180, float(body.get('duration') or 30)))))]
    return a + (['--force_instrumental', 'true'] if model.startswith('eleven') else [])


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        o = self.headers.get('Origin')
        # CAS (the website or a local copy) reads the outbox, and since 2026-11-17 also generates its
        # video backgrounds through the animate queue and hands CASV a photo (/api/inbox/photo)
        if self.path.startswith(('/api/outbox/', '/api/animate/', '/api/inbox/photo')) and site_ok(o):
            self.send_header('Access-Control-Allow-Origin', o)
            self.send_header('Vary', 'Origin')
        super().end_headers()

    def do_OPTIONS(self):                     # the website asking before it reads this computer
        self.send_response(204 if site_ok(self.headers.get('Origin')) else 403)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Max-Age', '600')
        self.end_headers()

    def _q(self):
        from urllib.parse import urlparse, parse_qs
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def _out(self):
        os.makedirs(OUTBOX, exist_ok=True)
        rows = []
        for f in os.listdir(OUTBOX):
            if f.endswith('.json') and not f.endswith('.notes.json'):
                try:
                    rows.append(json.load(open(os.path.join(OUTBOX, f))))
                except Exception:
                    pass
        return sorted(rows, key=lambda r: -r.get('at', 0))

    def do_PUT(self):                         # CASV parks one recorded file: raw bytes, no JSON
        q, n = self._q(), int(self.headers.get('Content-Length') or 0)
        path, back = self.path.split('?')[0], False
        if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')):
            return self._json(400, {'error': 'bad request'})
        if path == '/api/outbox/back':            # CAS hands a saved project back to this computer
            back = True
        elif path != '/api/outbox/file' or q.get('part') not in PARTS:
            return self._json(400, {'error': 'bad request'})
        if n <= 0 or n > (2048 if back or q.get('part') == 'project' else 600) * 1024 * 1024:
            return self._json(400, {'error': 'bad size'})
        os.makedirs(INBOX if back else OUTBOX, exist_ok=True)
        if back:
            json.dump({'id': q['id'], 'title': (q.get('title') or 'Video')[:80], 'at': int(time.time()), 'bytes': n, 'from': (q.get('from') or '')[:40]},
                      open(os.path.join(INBOX, q['id'] + '.json'), 'w'), indent=1)
        # written beside, then renamed: a reader polling for the file never gets half of it
        dest = os.path.join(INBOX, q['id'] + '.casv') if back else os.path.join(OUTBOX, q['id'] + PARTS[q['part']][0])
        with open(dest + '.part', 'wb') as f:
            left = n
            while left > 0:
                chunk = self.rfile.read(min(left, 1 << 20))
                if not chunk:
                    break
                f.write(chunk)
                left -= len(chunk)
        if left:
            os.remove(dest + '.part')
            return self._json(400, {'error': 'incomplete'})
        os.replace(dest + '.part', dest)
        return self._json(200, {'ok': True, 'bytes': n})

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
        if path == '/api/inbox/done':             # the studio opened (or declined) a project handed back
            for ext in ('.json', '.casv'):
                try:
                    os.remove(os.path.join(INBOX, jid + ext))
                except OSError:
                    pass
            return self._json(200, {'ok': True})
        if path == '/api/inbox/photo':            # CAS's Edit in CASV: the photo a new video starts with
            m = re.match(r'^data:image/jpeg;base64,(.+)$', body.get('photo') or '', re.S)
            if not m:
                return self._json(400, {'error': 'photo must be a JPEG data URL'})
            os.makedirs(INBOX, exist_ok=True)
            open(os.path.join(INBOX, jid + '.jpg'), 'wb').write(base64.b64decode(m.group(1)))
            return self._json(200, {'ok': True})
        if path == '/api/outbox/meta':            # the record for a parked video, written last
            os.makedirs(OUTBOX, exist_ok=True)
            rec = {k: body.get(k) for k in ('id', 'title', 'dur', 'sizes', 'project')}
            rec['at'] = int(time.time())
            json.dump(rec, open(os.path.join(OUTBOX, jid + '.json'), 'w'), indent=1)
            return self._json(200, {'ok': True})
        if path == '/api/outbox/notes':           # CAS hands the reviewers' timeline comments back
            os.makedirs(OUTBOX, exist_ok=True)
            json.dump({'id': jid, 'notes': body.get('notes') or [], 'at': int(time.time())}, open(os.path.join(OUTBOX, jid + '.notes.json'), 'w'), indent=1)
            return self._json(200, {'ok': True})
        os.makedirs(QUEUE, exist_ok=True)
        jp = os.path.join(QUEUE, jid + '.json')
        if path == '/api/animate/job':
            m = re.match(r'^data:image/jpeg;base64,(.+)$', body.get('photo') or '', re.S)
            if not m:
                return self._json(400, {'error': 'photo must be a JPEG data URL'})
            open(os.path.join(QUEUE, jid + '.jpg'), 'wb').write(base64.b64decode(m.group(1)))
            # kind 'describe' (CASV, 2026-11-19): no video, only a prompt Claude writes from the photo
            # (status describe -> described); `read` on a video job asks Claude to write it first
            job = {k: body.get(k) for k in ('id', 'name', 'move', 'move_phrase', 'prompt', 'duration', 'aspect', 'mode', 'model', 'note', 'people', 'sig', 'read', 'kind')}
            job = {k: v for k, v in job.items() if v is not None}
            job.update(status='describe' if job.get('kind') == 'describe' else 'queued', photo=jid + '.jpg', at=int(time.time()))
            json.dump(job, open(jp, 'w'), indent=1)
            return self._json(200, job)
        if path == '/api/music/cost':
            rc, out = hf('generate', 'cost', *music_args(body))
            m = re.search(r'"credits(?:_exact)?"\s*:\s*([0-9.]+)', out)
            if rc or not m:
                return self._json(200, {'error': out[-300:] or 'Higgsfield gave no price.'})
            return self._json(200, {'credits': float(m.group(1))})
        if path == '/api/music/make':
            if not str(body.get('text') or '').strip():
                return self._json(200, {'error': 'Describe the music first.'})
            rc, out = hf('generate', 'create', *music_args(body), timeout=180)
            m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out)
            if rc or not m:
                return self._json(200, {'error': (out or 'no job id came back')[-300:]})
            hf('generate', 'wait', m.group(0), '--timeout', '8m', '--interval', '4s', '--quiet', timeout=520)
            rc, out = hf('generate', 'get', m.group(0))
            u, ext = hf_result(out, 'mp3|wav|m4a|ogg')
            if rc or not u:
                return self._json(200, {'error': (out or 'no audio came back')[-300:]})
            name = jid + '.' + ext
            with urllib.request.urlopen(u, timeout=180) as r, open(os.path.join(QUEUE, name), 'wb') as f:
                shutil.copyfileobj(r, f)
            return self._json(200, {'file': name})
        if path == '/api/voice/cost':
            rc, out = hf('generate', 'cost', *tts_args(body))
            m = re.search(r'"credits(?:_exact)?"\s*:\s*([0-9.]+)', out)
            if rc or not m:
                return self._json(200, {'error': out[-300:] or 'Higgsfield gave no price.'})
            return self._json(200, {'credits': float(m.group(1))})
        if path == '/api/voice/make':
            text = str(body.get('text') or '').strip()[:5000]
            if not text:
                return self._json(200, {'error': 'There is no script to speak.'})
            if body.get('mac'):
                if body['mac'] not in MAC_VOICES:
                    return self._json(200, {'error': 'That Mac voice is not available.'})
                out = os.path.join(QUEUE, jid + '.wav')
                wpm = int(body.get('wpm') or 0)
                r = subprocess.run(['say', '-v', body['mac']] + (['-r', str(max(90, min(320, wpm)))] if wpm else []) + ['--data-format=LEI16@44100', '-o', out, text], capture_output=True, text=True, timeout=120)
                if r.returncode or not os.path.exists(out):
                    return self._json(200, {'error': (r.stderr or 'The Mac voice failed.')[-200:]})
                return self._json(200, {'file': jid + '.wav'})
            rc, out = hf('generate', 'create', *tts_args(body), timeout=180)
            m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out)
            if rc or not m:
                return self._json(200, {'error': (out or 'no job id came back')[-300:]})
            hf('generate', 'wait', m.group(0), '--timeout', '5m', '--interval', '3s', '--quiet', timeout=330)
            rc, out = hf('generate', 'get', m.group(0))
            u, ext = hf_result(out, 'mp3|wav|m4a|ogg')
            if rc or not u:
                return self._json(200, {'error': (out or 'no audio came back')[-300:]})
            name = jid + '.' + ext
            with urllib.request.urlopen(u, timeout=120) as r, open(os.path.join(QUEUE, name), 'wb') as f:
                shutil.copyfileobj(r, f)
            return self._json(200, {'file': name})
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
        if self.path.split('?')[0] == '/api/voice/list':
            return self._json(200, voice_list())
        if self.path.split('?')[0] == '/api/hf/list':            # the Higgsfield library pop-up
            try:
                size = max(1, min(120, int(self._q().get('size') or 24)))
            except ValueError:
                size = 24
            return self._json(200, hf_library(size))
        if self.path.split('?')[0] == '/api/hf/file':            # one listed video, fetched here so the page gets it same-origin
            hid = self._q().get('id', '')
            u = HF_SEEN.get(hid) if re.match(r'^[0-9a-f-]{36}$', hid) else None
            if not u:
                return self._json(404, {'error': 'not found'})
            ext = re.search(r'\.(mp4|mov|webm)(\?|$)', u).group(1)
            try:
                with urllib.request.urlopen(u, timeout=300) as r:
                    data = r.read()
            except Exception as e:
                return self._json(502, {'error': '%s: %s' % (type(e).__name__, e)})
            self.send_response(200)
            self.send_header('Content-Type', {'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm'}[ext])
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path.split('?')[0] == '/api/animate/jobs':
            return self._json(200, {'jobs': self._jobs()})
        path = self.path.split('?')[0]
        if path in ('/api/animate/file', '/api/inbox/photo'):   # a finished clip for CAS; CAS's photo for the page
            q = self._q()
            fp = os.path.join(QUEUE, q.get('id', '') + '.mp4') if path.endswith('file') else os.path.join(INBOX, q.get('id', '') + '.jpg')
            if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')) or not os.path.exists(fp):
                return self._json(404, {'error': 'not found'})
            self.send_response(200)
            self.send_header('Content-Type', 'video/mp4' if path.endswith('file') else 'image/jpeg')
            self.send_header('Content-Length', str(os.path.getsize(fp)))
            self.end_headers()
            with open(fp, 'rb') as f:
                shutil.copyfileobj(f, self.wfile)
            return
        if path == '/api/outbox/list':
            return self._json(200, {'videos': self._out()})
        if path == '/api/inbox/list':
            rows = []
            if os.path.isdir(INBOX):
                for f in os.listdir(INBOX):
                    if f.endswith('.json') and os.path.exists(os.path.join(INBOX, f[:-5] + '.casv')):
                        try:
                            rows.append(json.load(open(os.path.join(INBOX, f))))
                        except Exception:
                            pass
            return self._json(200, {'projects': sorted(rows, key=lambda r: -r.get('at', 0))})
        if path == '/api/inbox/file':
            q = self._q()
            fp = os.path.join(INBOX, q.get('id', '') + '.casv')
            if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')) or not os.path.exists(fp):
                return self._json(404, {'error': 'not found'})
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(os.path.getsize(fp)))
            self.end_headers()
            with open(fp, 'rb') as f:
                while True:
                    chunk = f.read(1 << 20)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            return
        if path == '/api/outbox/notes':
            q = self._q()
            fp = os.path.join(OUTBOX, q.get('id', '') + '.notes.json')
            if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')) or not os.path.exists(fp):
                return self._json(200, {'notes': []})
            return self._json(200, json.load(open(fp)))
        if path == '/api/outbox/file':
            q = self._q()
            if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')) or q.get('part') not in PARTS:
                return self._json(400, {'error': 'bad request'})
            fp = os.path.join(OUTBOX, q['id'] + PARTS[q['part']][0])
            if not os.path.exists(fp):
                return self._json(404, {'error': 'not found'})
            self.send_response(200)
            self.send_header('Content-Type', PARTS[q['part']][1])
            self.send_header('Content-Length', str(os.path.getsize(fp)))
            self.end_headers()
            with open(fp, 'rb') as f:
                while True:
                    chunk = f.read(1 << 20)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            return
        if self.path in ('/', '/index.html'):
            self.send_response(302)
            self.send_header('Location', '/Provident%20Video%20Studio.html')
            self.end_headers()
            return
        super().do_GET()


if __name__ == '__main__':
    print('Video Studio on http://localhost:%d/' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
