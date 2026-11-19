"""The video tools: build a Video Studio (CASV) project and hand it over to the designer.

CASV is not part of this checkout's site; it runs from its own local server on this Mac
(`python3 tools/video-dev/serve.py`, port 8794). These tools open that page in their OWN
headless Chrome (a throwaway profile, so never the designer's project), drive it through
`VideoStudio.bot`, and keep the result as one `.casv` file under the projects folder. The file
is the truth: every call loads it into the page, changes it and writes it back.

Hand-over is the same inbox CAS's "Open in Video Studio" uses: the file is PUT to
`/api/outbox/back`, and the designer's CASV asks whether to open it.

No generation here: animating photos, voiceover and music spend Higgsfield credits and stay
with the designer.
"""
import base64
import json
import mimetypes
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from chrome import Chrome, ChromeError

CASV = (os.environ.get("PROVIDENT_CASV_URL") or "http://127.0.0.1:8794").rstrip("/")
PAGE = CASV + "/Provident%20Video%20Studio.html"
EXT = ".casv"
MEDIA_MAX = 300 * 1024 * 1024
PIECE = 3 * 1024 * 1024            # raw bytes per base64 piece across the DevTools socket
NOT_RUNNING = ("The Video Studio is not running on the studio Mac. Someone there has to start it "
               "(python3 tools/video-dev/serve.py) before a video can be made or handed over.")
TYPES = {".mp4": "video/mp4", ".mov": "video/quicktime", ".m4v": "video/mp4", ".webm": "video/webm",
         ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
         ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac"}


def tools(core):
    """The tool list, bound to server.py's ToolError, projects folder and path rules."""
    ToolError = core.ToolError

    class Page:
        def __init__(self):
            self.chrome = None
            self.loaded = None          # (path, mtime) of the file the page holds

        def ev(self, expr, timeout=300):
            try:
                return self.chrome.evaluate(expr, timeout)
            except ChromeError as e:
                raise ToolError(str(e).split("\n")[0].replace("Error: ", "", 1))

        def boot(self):
            try:
                urllib.request.urlopen(PAGE, timeout=4).close()
            except (OSError, urllib.error.URLError):
                raise ToolError(NOT_RUNNING)
            if self.chrome:
                return
            self.chrome = Chrome()
            self.chrome.call("Page.navigate", {"url": PAGE})
            deadline = time.time() + 45
            while time.time() < deadline:
                try:
                    st = self.chrome.evaluate("window.VideoStudio ? (VideoStudio.bot ? (VideoStudio.bot.ready ? 2 : 1) : 0) : -1", 10)
                    if st == 2:
                        return
                    if st == 0:
                        break
                except ChromeError:
                    pass
                time.sleep(0.3)
            self.chrome.close()
            self.chrome = None
            raise ToolError("The Video Studio on the studio Mac is an older copy without the bot's tools, or did not load. It needs updating there.")

        def push(self, data):
            key = uuid.uuid4().hex[:10]
            for i in range(0, max(len(data), 1), PIECE):
                self.ev("VideoStudio.bot.push(%s,%s)" % (json.dumps(key), json.dumps(base64.b64encode(data[i:i + PIECE]).decode())), 120)
            return key

        def load(self, path):
            self.boot()
            if not os.path.isfile(path):
                raise ToolError("No video project at %s. Start one with video_new." % path)
            stamp = (path, os.path.getmtime(path))
            if self.loaded == stamp:
                return
            self.loaded = None
            self.ev("VideoStudio.bot.open(%s).then(()=>1)" % json.dumps(self.push(open(path, "rb").read())), 300)
            self.loaded = stamp

        def save(self, path):
            n = self.ev("VideoStudio.bot.pack()", 300)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path + ".part", "wb") as f:
                for i in range(0, n, PIECE):
                    f.write(base64.b64decode(self.ev("VideoStudio.bot.chunk(%d,%d)" % (i, PIECE), 120)))
            os.replace(path + ".part", path)
            self.loaded = (path, os.path.getmtime(path))

    V = Page()

    def vpath(p):
        p = core._abs(p)
        return p if p.endswith(EXT) else p + EXT

    def fetch(url):
        if not url.lower().startswith("https://"):
            raise ToolError("url must start with https:// (got %r)." % url)
        req = urllib.request.Request(url, headers={"User-Agent": "provident-studio/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read(MEDIA_MAX + 1)
                ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                disp = r.headers.get("Content-Disposition") or ""
                final = r.geturl()
        except Exception as e:
            raise ToolError("Could not fetch %s — %s" % (url, e))
        if len(data) > MEDIA_MAX:
            raise ToolError("%s is over %d MB." % (url, MEDIA_MAX // (1024 * 1024)))
        m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)', disp)
        name = urllib.parse.unquote(m.group(1)) if m else (os.path.basename(urllib.parse.urlsplit(final).path) or "file")
        return data, ctype, name

    def t_new(a):
        name = str(a.get("name") or "").strip()
        if not name:
            raise ToolError("name is required: what the video is called.")
        size = str(a.get("size") or "9:16")
        if size not in ("9:16", "1:1"):
            raise ToolError('size must be "9:16" (Reel) or "1:1" (Square).')
        stem = "".join(c for c in name if c.isalnum() or c in " -_").strip() or "video"
        path = vpath(a.get("path") or os.path.join(core.OUT, stem, stem + EXT))
        if os.path.exists(path) and not a.get("overwrite"):
            raise ToolError("%s already exists. Pass overwrite: true, or another name." % path)
        V.boot()
        res = V.ev("VideoStudio.bot.start(%s,%s)" % (json.dumps(name), json.dumps(size)))
        V.save(path)
        return {"project_file": path, "project": res}

    def t_media(a):
        path = vpath(a.get("path"))
        V.load(path)
        url = str(a.get("url") or "").strip()
        if url:
            data, ctype, name = fetch(url)
        else:
            src = os.path.expanduser(str(a.get("file") or ""))
            if not src or not os.path.isfile(src):
                raise ToolError("Pass url (an https link to the video, photo or sound), or file (a path on the studio Mac).")
            if os.path.getsize(src) > MEDIA_MAX:
                raise ToolError("%s is over %d MB." % (src, MEDIA_MAX // (1024 * 1024)))
            data, ctype, name = open(src, "rb").read(), "", os.path.basename(src)
        if a.get("name"):
            name = str(a["name"]) + os.path.splitext(name)[1]
        ext = os.path.splitext(name)[1].lower()
        mime = ctype if ctype.split("/")[0] in ("video", "image", "audio") else TYPES.get(ext) or mimetypes.guess_type(name)[0] or ""
        if mime.split("/")[0] not in ("video", "image", "audio"):
            raise ToolError("%s is not a video, photo or sound (it is %s). A Google Drive file needs a direct download link — "
                            "https://drive.google.com/uc?export=download&id=<file id> — shared with anyone with the link." % (name, ctype or "an unknown type"))
        if not ext:
            name += next((e for e, t in TYPES.items() if t == mime), "")
        rec = V.ev("VideoStudio.bot.addMedia(%s,%s,%s,%s)" % (json.dumps(V.push(data)), json.dumps(name), json.dumps(mime), json.dumps("logo" if a.get("as") == "logo" else "media")), 300)
        V.save(path)
        return {"media": rec, "project_file": path,
                "note": "It is in the library, not on the timeline yet. Place it with video_edit: add_clip (video, photo) or add_audio (sound)."}

    def t_edit(a):
        path = vpath(a.get("path"))
        V.load(path)
        ops = a.get("ops") or []
        if not isinstance(ops, list):
            raise ToolError("ops must be a list.")
        if not ops:
            return {"project_file": path, "project": V.ev("VideoStudio.bot.summary()")}
        try:
            res = V.ev("VideoStudio.bot.edit(%s)" % json.dumps(ops), 120)
        except ToolError:
            V.loaded = None             # the page may hold half the list; the file does not
            raise
        V.save(path)
        res["project_file"] = path
        return res

    def t_hand(a):
        path = vpath(a.get("path"))
        if not os.path.isfile(path):
            raise ToolError("No video project at %s." % path)
        V.load(path)
        info = V.ev("VideoStudio.bot.summary()")
        if not info.get("clips"):
            raise ToolError("This video has nothing on its timeline yet. Add a clip before handing it over.")
        who = str(a.get("from") or "the Grok bot")[:40]
        title = info.get("name") or os.path.splitext(os.path.basename(path))[0]
        hid = uuid.uuid4().hex[:12]
        q = urllib.parse.urlencode({"id": hid, "title": title, "from": who})
        size = os.path.getsize(path)
        with open(path, "rb") as f:
            req = urllib.request.Request(CASV + "/api/outbox/back?" + q, data=f, method="PUT",
                                         headers={"Content-Length": str(size), "Content-Type": "application/octet-stream", "Origin": "http://127.0.0.1"})
            try:
                with urllib.request.urlopen(req, timeout=600) as r:
                    ok = 200 <= r.status < 300
            except (OSError, urllib.error.URLError) as e:
                raise ToolError("%s (%s)" % (NOT_RUNNING, e))
        if not ok:
            raise ToolError("The Video Studio did not accept the hand-over.")
        return {"handed_over": True, "title": title, "seconds": info.get("seconds"), "project_file": path,
                "note": "The Video Studio on the studio Mac now asks the designer whether to open “%s”. It shows within about 15 seconds while "
                        "the Video Studio is open there. It is an editable project, not a finished video: the designer checks it, exports it and sends it to CAS." % title}

    path_p = {"type": "string", "description": "The video's project file (.casv), as video_new returned it."}
    return [
        {
            "name": "video_new",
            "description": (
                "Start a video in the Video Studio (CASV): a short branded video for a Meta ad or an organic post. "
                "size is 9:16 (Reel, the default) or 1:1 (Square). Returns the project file (.casv) every other video tool takes. "
                "The Provident wordmark is already on it. Needs the Video Studio running on the studio Mac."
            ),
            "inputSchema": {"type": "object", "properties": {
                "name": {"type": "string"}, "size": {"type": "string", "enum": ["9:16", "1:1"]},
                "path": {"type": "string"}, "overwrite": {"type": "boolean"}}, "required": ["name"]},
            "fn": t_new,
        },
        {
            "name": "video_add_media",
            "description": (
                "Bring a video clip (MP4, H.264), a photo (JPG, PNG) or a sound (MP3, WAV, M4A) into the video's library, from an https url "
                "(a Drive file as a direct download link, shared with anyone with the link) or a file on the studio Mac. Up to 300 MB. "
                "Returns its media id, length and size. It is not on the timeline until video_edit places it."
            ),
            "inputSchema": {"type": "object", "properties": {
                "path": path_p, "url": {"type": "string"}, "file": {"type": "string"},
                "name": {"type": "string", "description": "A short name for it in the library."}}, "required": ["path"]},
            "fn": t_media,
        },
        {
            "name": "video_edit",
            "description": (
                "Change the video with a list of ops, applied in order; returns the whole project (clips, texts, audio, media, length in seconds). "
                "An empty list only reads it. Ops: "
                "{op:'add_clip', media, from?, to?, seconds?, index?, fit?:'fill'|'fit', mute?} — clips play one after another in list order; from/to trim a video (seconds into the file), seconds is how long a photo shows (default 3). "
                "{op:'add_text', preset?:'headline'|'full'|'caption'|'centre'|'number', text, eyebrow?, sub?, at, seconds, size?:'Small'|'Medium'|'Large'|'Jumbo', pos?:'top'|'centre'|'bottom', align?:'left'|'centre', anim?:'none'|'fade'|'rise'|'lines'|'words'} — at is when it appears (seconds from the start). "
                "{op:'add_audio', media, track?:'music'|'sound', at?, volume?} — music starts at 0 and is cut to the video's length. "
                "{op:'set', id, …the same fields} changes a clip, text or audio by its id (index moves a clip). {op:'remove', id}. "
                "{op:'wordmark', on?, align?:'left'|'centre', vpos?:'top'|'bottom', ink?:'white'|'navy'}. {op:'size', size:'9:16'|'1:1'}. {op:'name', name}. "
                "Brand rules: sentence-case headlines, no invented prices, permits or listing numbers; keep texts short and never two at the same place at once."
            ),
            "inputSchema": {"type": "object", "properties": {
                "path": path_p, "ops": {"type": "array", "items": {"type": "object"}}}, "required": ["path"]},
            "fn": t_edit,
        },
        {
            "name": "video_hand_over",
            "description": (
                "Hand the video to the designer: it appears in the Video Studio on the studio Mac with the question whether to open it. "
                "It is an editable project, not a finished file — the designer reviews it, exports it and sends it to CAS. "
                "You cannot animate photos, make a voiceover or music, export, or send to CAS: those are the designer's."
            ),
            "inputSchema": {"type": "object", "properties": {
                "path": path_p, "from": {"type": "string", "description": "Who is handing it over, as the designer should read it. Default: the Grok bot."}}, "required": ["path"]},
            "fn": t_hand,
        },
    ]
