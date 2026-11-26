"""Local server for the Video Studio prototype: the repo's static files, never cached.

    python3 tools/video-dev/serve.py [port]        # default 8794
    python3 tools/video-dev/serve.py --claude-login  # once: lets the studio write prompts from photos

Then open http://localhost:8794/Provident%20Video%20Studio.html
"""
import base64
import glob
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
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8794
QUEUE = os.path.join(ROOT, '_animate')
# Finished videos waiting for CAS. CASV records the Reel and the Square, parks both here, and the
# CAS website (which holds the Google sign-in) fetches them from this computer and uploads them to
# the ad set's Drive folder. `_outbox/` is git-ignored: <id>.json the record, <id>_9x16.mp4,
# <id>_1x1.mp4, <id>.jpg the poster, <id>.notes.json the comments CAS sends back.
OUTBOX = os.path.join(ROOT, '_outbox')
# Only these pages may read the outbox from a browser. Add more with CASV_ORIGINS="https://a,https://b".
# The second is PDS served from the office server (tools/office-server on main, 2026-11-24).
SITES = ['https://provident-design-studio.vercel.app', 'https://design-studio.ngrok-free.dev'] + [o.strip() for o in os.environ.get('CASV_ORIGINS', '').split(',') if o.strip()]
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
# THE WORKING FOLDER (2026-11-26, by request: "avoid saving in the browser, all files need to be on
# Google Drive"). The page keeps nothing in the browser any more: the project and every media file
# it is working with live here, `_work/<port>/` (git-ignored), until Save sends them to the ad
# set's Drive folder. state.json holds the small things (the project, the last video, the library's
# folders); each media file is <id>.bin with its facts in <id>.json. The save window on the
# Design Studio site reads the same routes (/api/work/…).
WORK = os.path.join(ROOT, '_work', str(PORT))
WORK_KEYS = ('project', 'prev', 'logos', 'lib', 'drive')
WORK_LOCK = threading.Lock()


def work_state():
    try:
        return json.load(open(os.path.join(WORK, 'state.json')))
    except Exception:
        return {}


def work_write(name, obj):
    os.makedirs(WORK, exist_ok=True)
    fp = os.path.join(WORK, name)
    with open(fp + '.part', 'w') as f:
        json.dump(obj, f)
    os.replace(fp + '.part', fp)


def site_ok(origin):
    return bool(origin) and (origin in SITES or re.match(r'^http://(localhost|127\.0\.0\.1)(:\d+)?$', origin) is not None)


# ── Generate now: Higgsfield's own command-line tool (`npm i -g @higgsfield/cli`, then
# `higgsfield auth login` once). It spends the signed-in account's plan credits, the same as the
# website, and needs no Claude and no API key. Nothing here runs without the studio's explicit
# /api/animate/run, which the page only sends after showing the cost.
HF = shutil.which('higgsfield') or os.path.expanduser('~/.local/node/bin/higgsfield')
SIGN_IN = "Higgsfield's tool is not signed in on this computer. Run `higgsfield auth login` in Terminal, or use Send to the animate queue."


# ── Have Claude write it from the photo (2026-11-19). The prompt-to-write job no longer waits for
# someone to run /animate-photos: this server runs Claude Code headless on it at once (about a
# minute, no Higgsfield credits). It reads the start frame and writes all 14 sections with the
# photo-to-video-prompt skill plus the CASV rules below. Claude Code must be signed in on this
# computer once (`claude auth login`); the desktop app's own copy is found when `claude` is not on
# PATH. Without it the job fails with the fix, and /animate-photos still answers it the old way.
SKILLS = os.path.join(ROOT, '.claude', 'skills')
CLAUDE_LOGIN = ('Claude is not signed in on this computer, so it cannot read the photo. Run '
                '`python3 tools/video-dev/serve.py --claude-login` in Terminal once and sign in, then press the button again.')
CASV_RULES = """These CASV rules override the framework:
- The camera move is the user's. CAMERA starts with this move phrase as written: "{move_phrase}". Add only the shadow-side placement and the colour words. Do not pick another move.
- The clip is {duration} seconds at {aspect}: ACTION's three beats add up to {duration} seconds.
- Extra direction from the user (work it into SCENE CONTEXT or ACTION; empty means none): "{note}"
- The user's People setting says: {people}. The photo wins: describe every person you actually see (ACTIVE REFERENCES, PERFORMANCE, POSITIVE LOCKS). Only if you see no one does PERFORMANCE read "No people in frame; none appear."
- {frame}
- AUDIO is always: "Natural sound of the environment in each scene, every interaction with the environment, accurate sound details." followed by the ambience you would pick.
- POSITIVE LOCKS always ends: "No new people, objects, text or logos appear."
- 2,500 characters is Higgsfield's hard cap: aim for about 2,200 for the whole prompt, all 14 headings in order. Keep each section to one or two tight sentences."""
EXT_RULE = ('The flat grey bands above and below the photo are not part of the shot: before the video is made, Nano Banana fills them '
            'with more of the same scene (more sky above, more ground, water or foreground below). Write LOCATION MAP and FIRST FRAME '
            'for that taller frame, with the photo in the middle, and never mention grey bands, borders or letterboxing.')
# EXTEND FIRST (2026-11-20): a photo wider than the video comes centred between flat grey bands
# (job['ext'] = its {y, h} at the video's size). Nano Banana 2.1 paints the bands; the original photo
# is then pasted back over the middle, feathered at the seams, so its pixels cannot drift. Needs
# Pillow for the paste; without it the painted frame is used as it comes.
EXT_MODEL = 'nano_banana_2_1'
EXT_PROMPT = ('Outpaint this image to a full vertical {aspect} frame. The middle band is a real photograph: keep it exactly as it is, '
              'in the same place and at the same size, with every detail, colour and line unchanged. Only replace the flat grey bands '
              'above and below it: continue the scene naturally upward (more of the same sky) and downward (more of the same ground, '
              'water or foreground), matching perspective, light, colour, grain and focus so the seams cannot be seen. No new people, '
              'objects, text or logos; no borders, no frames.')


def ext_args(job, photo):
    return [EXT_MODEL, '--prompt', EXT_PROMPT.format(aspect=job.get('aspect') or '9:16'), '--aspect_ratio', job.get('aspect') or '9:16',
            '--resolution', '2k', '--image', photo]


def ext_merge(padded, painted, y, h, out, feather=32):
    """Paste the photo band of `padded` back over `painted` (resized to the padded size), feathered."""
    try:
        from PIL import Image, ImageDraw, ImageFilter
    except ImportError:
        shutil.copyfile(painted, out)
        return False
    base = Image.open(padded).convert('RGB')
    top = Image.open(painted).convert('RGB').resize(base.size, Image.LANCZOS)
    if h <= 2 * feather:                   # no band given: use the painted frame as it comes
        top.save(out, quality=94)
        return False
    m = Image.new('L', base.size, 0)
    ImageDraw.Draw(m).rectangle([0, y + feather, base.size[0], y + h - feather], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather / 2))
    top.paste(base, (0, 0), m)
    top.save(out, quality=94)
    return True


def ext_run(job):
    """Extend the job's photo. Returns (start-frame file name, None) or (None, reason)."""
    photo = os.path.join(QUEUE, job['photo'])
    rc, out = hf('generate', 'create', *ext_args(job, photo), timeout=180)
    m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out)
    if rc or not m:
        return None, 'Nano Banana could not extend the photo: ' + (out or 'no job id came back')[-240:]
    hf('generate', 'wait', m.group(0), '--timeout', '6m', '--interval', '3s', '--quiet', timeout=400)
    rc, out = hf('generate', 'get', m.group(0))
    u, ext = hf_result(out, 'png|jpg|jpeg|webp')
    if rc or not u:
        return None, 'Nano Banana did not return the extended photo: ' + (out or '')[-240:]
    raw = os.path.join(QUEUE, job['id'] + '.ext-raw.' + ext)
    with urllib.request.urlopen(u, timeout=120) as r, open(raw, 'wb') as f:
        shutil.copyfileobj(r, f)
    name = job['id'] + '.ext.jpg'
    box = job.get('ext') or {}
    ext_merge(photo, raw, int(box.get('y') or 0), int(box.get('h') or 0), os.path.join(QUEUE, name))
    return name, None


DESC_SCHEMA = {'type': 'object', 'required': ['prompt', 'sheet', 'words'], 'additionalProperties': False,
               'properties': {'prompt': {'type': 'string'}, 'sheet': {'type': 'string'}, 'words': {'type': 'string'}}}


def claude_bin():
    found = [shutil.which('claude'), os.path.expanduser('~/.local/bin/claude'), os.path.expanduser('~/.claude/local/claude')]
    found += sorted(glob.glob(os.path.expanduser('~/Library/Application Support/Claude/claude-code/*/*/claude.app/Contents/MacOS/claude')),
                    key=os.path.getmtime, reverse=True)
    return next((p for p in found if p and os.access(p, os.X_OK)), None)


def claude_env():
    # started from inside a Claude Code session, the parent's variables would make this one refuse to run
    return {k: v for k, v in os.environ.items() if not k.startswith(('CLAUDECODE', 'CLAUDE_CODE_'))}


def desc_run(jp):
    """Write one prompt from its photo. Runs in its own thread; the job file carries the state."""
    def save(**k):
        job = json.load(open(jp)); job.update(k); json.dump(job, open(jp, 'w'), indent=1); return job
    try:
        job = save(step='writing', started=int(time.time()))
        cb = claude_bin()
        if not cb:
            return save(status='failed', error='Claude Code is not on this computer. Run /animate-photos in Claude instead.')
        skill = open(os.path.join(SKILLS, 'photo-to-video-prompt', 'SKILL.md')).read()
        ask = ('Read the photo at %s (the first frame of the video, exactly as the studio frames it). Then follow the '
               'skill below: Pass 1 analysis sheet, Pass 2 word bank, Pass 3 the prompt with all 14 headings, and its checks.\n\n'
               % os.path.join(QUEUE, job['photo'])
               + CASV_RULES.format(move_phrase=job.get('move_phrase') or job.get('move') or '', duration=job.get('duration') or 5,
                                   aspect=job.get('aspect') or '9:16', note=job.get('note') or '', people='yes' if job.get('people') else 'no',
                                   frame=EXT_RULE if job.get('extend') else 'The photo fills the frame exactly as you see it.')
               + '\n\nAnswer with the JSON only: "prompt" the finished prompt, "sheet" Pass 1 in short, "words" Pass 2.'
               + '\n\n--- THE SKILL ---\n' + skill)
        def run(q, tools):
            r = subprocess.run([cb, '-p', q, '--model', 'sonnet', '--output-format', 'json', '--json-schema', json.dumps(DESC_SCHEMA)] + tools,
                               capture_output=True, text=True, timeout=420, cwd=os.path.expanduser('~'), env=claude_env())
            out = (r.stdout or '') + (r.stderr or '')
            if 'Not logged in' in out or 'Please run /login' in out:
                raise LookupError(CLAUDE_LOGIN)
            try:
                res = json.loads(r.stdout)
                return res.get('structured_output') or json.loads(re.search(r'\{.*\}', res.get('result') or '', re.S).group(0))
            except Exception:
                raise LookupError('Claude gave no prompt back. ' + out.strip()[-240:])
        try:
            w = run(ask, ['--allowedTools', 'Read', '--add-dir', QUEUE])
            text = str(w.get('prompt') or '').strip()
            # over the cap: one more pass that only tightens the words (no photo, so it is quick)
            if len(text) > 2500:
                save(step='shortening')
                w2 = run('This Higgsfield prompt is %d characters; the cap is 2,500. Rewrite it to about 2,200 characters: keep all 14 headings '
                         'in the same order, every fact, the CAMERA line\'s first sentence word for word, the AUDIO sentence and the last POSITIVE LOCKS '
                         'sentence word for word; cut repetition and filler. Answer with the JSON only: "prompt" the shortened prompt, "sheet" and "words" '
                         'copied from below.\n\nsheet: %s\nwords: %s\n\n--- THE PROMPT ---\n%s' % (len(text), w.get('sheet') or '', w.get('words') or '', text),
                         [])
                if len(str(w2.get('prompt') or '').strip()) <= 2500:
                    w = w2
                text = str(w.get('prompt') or '').strip()
        except LookupError as e:
            return save(status='failed', error=str(e))
        if len(text) > 2500:
            return save(status='failed', error='Claude wrote %d characters; Higgsfield takes 2,500. Press the button again.' % len(text))
        if 'SCENE CONTEXT' not in text or 'POSITIVE LOCKS' not in text:
            return save(status='failed', error='Claude left out some of the 14 sections. Press the button again.')
        save(status='described', prompt=text, prompt_by='claude', read=False, sheet=w.get('sheet') or '', words=w.get('words') or '', step=None)
    except subprocess.TimeoutExpired:
        save(status='failed', error='Claude took more than seven minutes. Press the button again.')
    except Exception as e:                   # never leave a clip reading "Claude is writing it" forever
        try:
            save(status='failed', error='%s: %s' % (type(e).__name__, e))
        except Exception:
            pass


HF_DUR = {'seedance_2_5': (4, 30), 'kling3_0': (3, 15), 'cinematic_studio_video_v2': (3, 12)}


def hf_args(job, photo):
    """The tool's params for one job. Same settings table as the animate-photos skill."""
    pro = job.get('mode') == 'pro'
    model = job.get('model') or 'seedance_2_5'
    lo, hi = HF_DUR.get(model, (3, 12))    # Higgsfield's own limits (2026-11-25); it refuses anything outside them
    a = [model, '--prompt', job.get('prompt') or '', '--duration', str(max(lo, min(hi, int(job.get('duration') or 5)))),
         '--aspect_ratio', job.get('aspect') or '9:16', '--start-image', photo]
    if a[0] == 'seedance_2_5':
        res = job.get('resolution') if job.get('resolution') in ('480p', '720p', '1080p', '4k') else ('1080p' if pro else '720p')
        bit = job.get('bitrate') if job.get('bitrate') in ('standard', 'high') else ('high' if pro else 'standard')
        a += ['--mode', 'omni_reference', '--resolution', res, '--bitrate_mode', bit, '--generate_audio', 'true']
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
        job = save(started=int(time.time()))
        if job.get('extend') and not job.get('start'):
            job = save(step='extending')
            name, err = ext_run(job)
            if err:
                return save(status='failed', error=err)
            job = save(start=name)
        job = save(step='sending')
        rc, out = hf('generate', 'create', *hf_args(job, os.path.join(QUEUE, job.get('start') or job['photo'])), timeout=300)
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
        if self.path.startswith(('/api/outbox/', '/api/animate/', '/api/inbox/photo', '/api/work/')) and site_ok(o):
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
        if path == '/api/convert':                # a video Chrome cannot play (ProRes, often with alpha)
            # CONVERT ON IMPORT (2026-11-26, by request: "i wanted to upload an alpha bg … this browser
            # cannot play 10.mov"). macOS's own avconvert re-encodes it as HEVC with alpha, which Chrome
            # on a Mac plays and draws with its transparency. No ffmpeg needed. Returns the new file.
            if n <= 0 or n > 4096 * 1024 * 1024:
                return self._json(400, {'error': 'bad size'})
            tmp = os.path.join(WORK, 'convert'); os.makedirs(tmp, exist_ok=True)
            src, out = os.path.join(tmp, q['id'] + '.in.mov'), os.path.join(tmp, q['id'] + '.out.mov')
            with open(src, 'wb') as f:
                left = n
                while left > 0:
                    chunk = self.rfile.read(min(left, 1 << 20))
                    if not chunk:
                        break
                    f.write(chunk); left -= len(chunk)
            try:
                if left:
                    return self._json(400, {'error': 'incomplete'})
                r = subprocess.run(['/usr/bin/avconvert', '--preset', 'PresetHEVCHighestQualityWithAlpha', '--source', src, '--output', out, '--replace'],
                                   capture_output=True, text=True, timeout=1800)
                if r.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) == 0:
                    return self._json(422, {'error': 'macOS could not convert this file' + ((': ' + (r.stderr or r.stdout).strip().splitlines()[-1][:200]) if (r.stderr or r.stdout).strip() else '.')})
                self.send_response(200)
                self.send_header('Content-Type', 'video/quicktime')
                self.send_header('Content-Length', str(os.path.getsize(out)))
                self.end_headers()
                with open(out, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return
            except subprocess.TimeoutExpired:
                return self._json(504, {'error': 'The conversion took longer than 30 minutes.'})
            finally:
                for fp in (src, out):
                    try:
                        os.remove(fp)
                    except OSError:
                        pass
        if path == '/api/work/media':             # one media file into the working folder
            if n <= 0 or n > 2048 * 1024 * 1024:
                return self._json(400, {'error': 'bad size'})
            os.makedirs(WORK, exist_ok=True)
            dest = os.path.join(WORK, q['id'] + '.bin')
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
        if path == '/api/work/state':             # one small thing the page used to keep in the browser
            key = body.get('key')
            if key not in WORK_KEYS or not isinstance(body.get('value'), (str, type(None))):
                return self._json(400, {'error': 'bad request'})
            with WORK_LOCK:
                st = work_state()
                if body.get('value') is None:
                    st.pop(key, None)
                else:
                    st[key] = body['value']
                work_write('state.json', st)
            return self._json(200, {'ok': True})
        if path in ('/api/work/meta', '/api/work/del'):
            wid = str(body.get('id') or '')
            if not re.match(r'^[a-z0-9]{4,16}$', wid):
                return self._json(400, {'error': 'bad id'})
            if path.endswith('del'):
                for ext in ('.bin', '.json'):
                    try:
                        os.remove(os.path.join(WORK, wid + ext))
                    except OSError:
                        pass
                return self._json(200, {'ok': True})
            if not isinstance(body.get('meta'), dict):
                return self._json(400, {'error': 'bad request'})
            work_write(wid + '.json', dict(body['meta'], id=wid))
            return self._json(200, {'ok': True})
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
            job = {k: body.get(k) for k in ('id', 'name', 'move', 'move_phrase', 'prompt', 'duration', 'resolution', 'bitrate', 'aspect', 'mode', 'model', 'note', 'people', 'sig', 'read', 'kind', 'extend', 'ext')}
            if job.get('extend'):                    # the same words /animate-photos sends to Nano Banana
                job['extend_prompt'] = EXT_PROMPT.format(aspect=job.get('aspect') or '9:16')
            job = {k: v for k, v in job.items() if v is not None}
            job.update(status='describe' if job.get('kind') == 'describe' else 'queued', photo=jid + '.jpg', at=int(time.time()))
            json.dump(job, open(jp, 'w'), indent=1)
            if job['status'] == 'describe':          # written now, not when /animate-photos next runs
                threading.Thread(target=desc_run, args=(jp,), daemon=True).start()
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
                credits = float(m.group(1))
                if job.get('extend'):                # the extension is priced and shown in the same total
                    rc, out = hf('generate', 'cost', *ext_args(job, os.path.join(QUEUE, job['photo'])))
                    m = re.search(r'"credits(?:_exact)?"\s*:\s*([0-9.]+)', out)
                    if rc or not m:
                        return self._json(200, {'error': out[-300:] or 'Higgsfield gave no price for the extension.'})
                    credits += float(m.group(1))
                return self._json(200, {'id': jid, 'credits': round(credits, 2)})
            job['status'] = 'working'
            json.dump(job, open(jp, 'w'), indent=1)
            threading.Thread(target=hf_run, args=(jp,), daemon=True).start()
            return self._json(200, job)
        if path in ('/api/animate/placed', '/api/animate/cancel') and os.path.exists(jp):
            if path.endswith('cancel'):
                for f in glob.glob(os.path.join(QUEUE, jid + '.*')):     # .json .jpg .mp4 and the extension's files
                    try:
                        os.remove(f)
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
        if path == '/api/work/state':
            return self._json(200, {'state': work_state()})
        if path == '/api/work/list':              # every media file in the working folder, with its facts
            rows = []
            for f in sorted(os.listdir(WORK)) if os.path.isdir(WORK) else []:
                if f.endswith('.json') and f != 'state.json' and os.path.exists(os.path.join(WORK, f[:-5] + '.bin')):
                    try:
                        m = json.load(open(os.path.join(WORK, f)))
                        m['size'] = os.path.getsize(os.path.join(WORK, f[:-5] + '.bin'))
                        m['mtime'] = os.path.getmtime(os.path.join(WORK, f[:-5] + '.bin'))
                        rows.append(m)
                    except Exception:
                        pass
            return self._json(200, {'media': rows})
        if path == '/api/work/media':
            q = self._q()
            fp = os.path.join(WORK, q.get('id', '') + '.bin')
            if not re.match(r'^[a-z0-9]{4,16}$', q.get('id', '')) or not os.path.exists(fp):
                return self._json(404, {'error': 'not found'})
            ctype = 'application/octet-stream'
            try:
                ctype = json.load(open(fp[:-4] + '.json')).get('type') or ctype
            except Exception:
                pass
            self.send_response(200)
            self.send_header('Content-Type', ctype if re.match(r'^[\w.+-]+/[\w.+-]+$', ctype) else 'application/octet-stream')
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
    if '--claude-login' in sys.argv:          # sign Claude Code in once, so the studio can write prompts from photos
        cb = claude_bin()
        sys.exit(subprocess.call([cb, 'auth', 'login'], env=claude_env()) if cb else 'Claude Code is not on this computer.')
    if '--merge-ext' in sys.argv:             # /animate-photos: paste the photo back over Nano Banana's frame
        i = sys.argv.index('--merge-ext')
        padded, painted, y, h, out = sys.argv[i + 1:i + 6]
        print('merged' if ext_merge(padded, painted, int(y), int(h), out) else 'used as it came (no Pillow, or no band)')
        sys.exit(0)
    print('Video Studio on http://localhost:%d/' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
