#!/usr/bin/env python3
"""Provident Studio MCP server — CAS and OPS as tools, for Claude in Cowork.

A project is a SESSION FILE on disk (`.adstudio.json` / `.smpstudio.json`), the very file the
studios' Save writes and Open Session reads. Every tool reads or writes one, so a project made
here opens in the studio, and a project saved in the studio can be edited and exported here.

Underneath, the studio itself does the work. A private headless Chrome loads the real
`.dc.html` document from this repository and the tools call its engine — `normState`,
`buildOps`, the renderers, `doExport` and its file names — so a render here is the export,
not an imitation of it. Nothing is reimplemented.

Speaks MCP over stdio (newline-delimited JSON-RPC). Standard library only.
"""
import base64
import functools
import hashlib
import http.server
import json
import mimetypes
import os
import sys
import threading
import time
import traceback
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from chrome import Chrome, ChromeError  # noqa: E402

ROOT = os.path.abspath(os.environ.get("PROVIDENT_STUDIO_ROOT") or os.path.join(HERE, "..", ".."))
FILES = {"cas": "Provident Campaign Studio.dc.html", "ops": "Provident Organic Studio.dc.html"}
EXT = {"cas": ".adstudio.json", "ops": ".smpstudio.json"}
APP = {"provident-ad-studio": "cas", "provident-smp-studio": "ops"}


def _default_out():
    env = os.environ.get("PROVIDENT_STUDIO_OUT")
    if env:
        return os.path.expanduser(env)
    cowork = os.path.expanduser("~/Claude")
    base = cowork if os.path.isdir(cowork) else os.path.expanduser("~/Documents")
    return os.path.join(base, "Provident Studio")


OUT = _default_out()
PAGE_JS = open(os.path.join(HERE, "page.js"), encoding="utf-8").read()


def log(*a):
    print("[provident-studio]", *a, file=sys.stderr, flush=True)


# ── a local web server for the studio files: Chrome refuses a relative font URL over file://,
# so the studio has to be SERVED to render in its own typeface ────────────────────────────────
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def _serve():
    h = functools.partial(_Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class Studio:
    """One headless Chrome, one tab, loaded with whichever studio and session the last call needed."""

    def __init__(self):
        self.srv = None
        self.chrome = None
        self.where = None      # 'cas' | 'ops'
        self.loaded = None     # sha1 of the session text the page holds

    def _boot(self):
        if self.chrome:
            return
        self.srv = self.srv or _serve()
        self.chrome = Chrome()
        self.chrome.call("Page.addScriptToEvaluateOnNewDocument", {"source": PAGE_JS})
        mimetypes.add_type("application/javascript", ".js")

    def url(self, studio):
        return "http://127.0.0.1:%d/%s" % (self.srv.server_address[1], urllib.parse.quote(FILES[studio]))

    def ev(self, expr, timeout=300):
        try:
            return self.chrome.evaluate(expr, timeout)
        except ChromeError as e:
            raise ToolError(str(e).split("\n")[0].replace("Error: ", "", 1))

    def _wait(self, timeout=45):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if self.chrome.evaluate("!!(window.__ps && __ps.ready())", 10):
                    return
            except ChromeError:
                pass
            time.sleep(0.25)
        raise ToolError("The studio did not finish loading in the headless browser.")

    def open(self, studio):
        """Navigate to a studio's document (its splash, or whatever it resumes)."""
        self._boot()
        if self.where != studio:
            try:
                self.chrome.evaluate("try{StudioBase.reloading=true}catch(e){};1", 5)
            except ChromeError:
                pass
            self.chrome.call("Page.navigate", {"url": self.url(studio)})
            self.where = studio
            self.loaded = None
            time.sleep(0.4)
            self._wait()

    def load(self, studio, text):
        """Put a session into the page through the studio's own applyProject, then reload."""
        key = hashlib.sha1(text.encode()).hexdigest()
        self.open(studio)
        if self.loaded == key:
            return
        self.ev("__ps.apply(%s).then(()=>1)" % text, 120)
        self.chrome.call("Page.reload", {"ignoreCache": True})
        time.sleep(0.4)
        self._wait()
        # the studio fills its "which slots hold a picture" map from a timer; give it a beat
        self.ev("__ps.warm().then(()=>__ps.sleep(900)).then(()=>1)", 60)
        self.loaded = key

    def mark(self, text):
        self.loaded = hashlib.sha1(text.encode()).hexdigest()

    def close(self):
        if self.chrome:
            self.chrome.close()
        self.chrome = None


class ToolError(Exception):
    pass


S = Studio()


# ── session files ──────────────────────────────────────────────────────────────────────────
def _abs(p):
    if not p:
        raise ToolError("A project path is required.")
    p = os.path.expanduser(str(p))
    if not os.path.isabs(p):
        p = os.path.join(OUT, p)
    return os.path.abspath(p)


def read_session(path):
    path = _abs(path)
    if not os.path.exists(path):
        raise ToolError("No project at %s" % path)
    try:
        text = open(path, encoding="utf-8").read()
        d = json.loads(text)
    except ValueError as e:
        raise ToolError("%s is not valid JSON — %s" % (path, e))
    studio = APP.get(d.get("app")) or ("cas" if (d.get("state") or {}).get("variants") else "ops")
    if not isinstance(d.get("state"), dict):
        raise ToolError("%s carries no project data." % path)
    return path, studio, json.dumps(d)


def write_session(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def _load(path):
    path, studio, text = read_session(path)
    S.load(studio, text)
    return path, studio


def _save(path):
    text = S.ev("__ps.session()")
    write_session(path, text)
    S.mark(text)
    return text


def _summary(path):
    s = S.ev("__ps.summary()")
    s["project_file"] = path
    return s


# ── tools ──────────────────────────────────────────────────────────────────────────────────
def t_catalog(a):
    studio = _studio(a)
    S.open(studio)
    return S.ev("__ps.catalog()")


def _studio(a):
    st = str(a.get("studio") or "").lower()
    st = {"campaign": "cas", "ads": "cas", "organic": "ops", "posts": "ops"}.get(st, st)
    if st not in FILES:
        raise ToolError('studio must be "cas" (Campaign Ads Studio) or "ops" (Organic Post Studio).')
    return st


def t_new(a):
    studio = _studio(a)
    S.open(studio)
    name = a.get("name") or ""
    sess = S.ev("JSON.stringify(__ps.fresh(%s, %s))" % (json.dumps(a.get("template") or ""), json.dumps(name)))
    path = a.get("path")
    if not path:
        stem = "".join(c for c in (name or a.get("template") or "project") if c.isalnum() or c in " -_").strip() or "project"
        path = os.path.join(OUT, stem, stem + EXT[studio])
    path = _abs(path)
    if not path.endswith(EXT[studio]):
        path += EXT[studio]
    if os.path.exists(path) and not a.get("overwrite"):
        raise ToolError("%s already exists. Pass overwrite: true, or another path." % path)
    S.load(studio, sess)
    _save(path)
    return _summary(path)


def t_read(a):
    path, _ = _load(a.get("path"))
    return _summary(path)


def t_edit(a):
    path, _ = _load(a.get("path"))
    ops = a.get("edits") or []
    if not isinstance(ops, list) or not ops:
        raise ToolError("edits must be a non-empty list.")
    done = S.ev("__ps.edit(%s)" % json.dumps(ops))
    _save(path)
    out = _summary(path)
    out["applied"] = done
    return out


def t_image(a):
    path, studio = _load(a.get("path"))
    slot = a.get("slot")
    if not slot:
        raise ToolError("slot is required — read the project to see its image_slots.")
    slots = S.ev("__ps.slots()")
    known = {s["slot"]: s for s in slots}
    if slot not in known:
        raise ToolError("This project has no slot %r. It has: %s" % (slot, ", ".join(known)))
    if a.get("remove"):
        S.ev("__ps.clear(%s)" % json.dumps(slot))
        _save(path)
        return {"slot": slot, "cleared": True, "project_file": path}
    src = os.path.expanduser(str(a.get("file") or ""))
    if not src or not os.path.isfile(src):
        raise ToolError("file must be the path of an image on this Mac (got %r)." % src)
    data = open(src, "rb").read()
    mime = mimetypes.guess_type(src)[0] or "application/octet-stream"
    if not mime.startswith("image/"):
        raise ToolError("%s is not an image." % src)
    cut = a.get("remove_background")
    if cut is None:
        cut = bool(known[slot].get("remove_background"))
    note = S.ev("__ps.image(%s,%s,%s,%s,%s)" % (
        json.dumps(slot), json.dumps(base64.b64encode(data).decode()), json.dumps(os.path.basename(src)),
        json.dumps(mime), "true" if cut else "false"), 400)
    _save(path)
    return {"slot": slot, "label": known[slot]["label"], "stored": True, "note": note or "", "project_file": path}


def t_preview(a):
    path, studio = _load(a.get("path"))
    opt = {"scale": float(a.get("scale") or 0.5)}
    if a.get("indexes") is not None:
        opt["indexes"] = [int(i) for i in a["indexes"]]
    if a.get("sizes"):
        opt["sizes"] = list(a["sizes"])
    shots = S.ev("__ps.preview(%s)" % json.dumps(opt), 300)
    if not shots:
        raise ToolError("Nothing to show for those indexes/sizes.")
    content = []
    for sh in shots[: int(a.get("max") or 20)]:
        content.append({"type": "text", "text": sh["label"]})
        content.append({"type": "image", "data": sh["data"], "mimeType": "image/jpeg"})
    return {"__content__": content}


def t_export(a):
    path, studio = _load(a.get("path"))
    fmt = str(a.get("format") or "png").lower()
    if fmt == "jpeg":
        fmt = "jpg"
    if fmt not in ("png", "jpg", "svg", "pdf"):
        raise ToolError("format must be png, jpg, svg or pdf.")
    # beside the session file by default — the studio's Source folder layout
    out_dir = os.path.expanduser(a.get("out_dir") or os.path.dirname(path))
    with_proj = bool(a.get("include_assets", False))
    res = S.ev("__ps.export(%s, %s)" % (json.dumps(fmt), "true" if with_proj else "false"), 600)
    if res["status"].startswith("Cannot export"):
        raise ToolError(res["status"])
    written = []
    for f in res["files"]:
        rel = os.path.normpath(f["name"]).lstrip(os.sep)
        if rel.startswith(".."):
            continue
        dest = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(base64.b64decode(f["b64"]))
        written.append(dest)
    renders = [w for w in written if not w.endswith(EXT[studio]) and os.sep + "Assets" + os.sep not in w]
    out = {"out_dir": out_dir, "renders": renders}
    other = [w for w in written if w not in renders]
    if other:
        out["other_files"] = other
    if "feed only" in res["status"]:
        out["note"] = "Feed only — the story is hidden on this project. Edit {op:'set', path:'storyOn', value:true} to export it too."
    return out


TOOLS = [
    {
        "name": "studio_catalog",
        "description": (
            "Describe what a Provident studio can make. CAS (Campaign Ads Studio) makes paid Meta ads "
            "(1:1 feed, 9:16 story, optional 16:9 and 2:1 Eventbrite banners) from free-form design components. "
            "OPS (Organic Post Studio) makes organic feed (3:4) and story (9:16) posts from locked templates: "
            "listed (just listed/sold), weekly (weekly listings), review (Google reviews), agents (top agents), "
            "award (congratulations), carousel, rcover (reel thumbnail). Returns templates, the fields each slide "
            "asks for (with required flags, options and formats) or the component types and styles. Call this first."
        ),
        "inputSchema": {"type": "object", "properties": {
            "studio": {"type": "string", "enum": ["cas", "ops"]}}, "required": ["studio"]},
        "fn": t_catalog,
    },
    {
        "name": "studio_new_project",
        "description": (
            "Start a project from a template and save it as a session file (opens in the studio with Open Session). "
            "OPS template ids: listed, weekly, review, agents, award, carousel, rcover. CAS: blank, or a template name "
            "(New launch, Event, Payment plan, Spec ladder). Fields start empty — fill them with studio_edit. "
            "Returns the project summary: slides/components, every field and its current value, and the image slots."
        ),
        "inputSchema": {"type": "object", "properties": {
            "studio": {"type": "string", "enum": ["cas", "ops"]},
            "template": {"type": "string"},
            "name": {"type": "string", "description": "CAS: the campaign name. OPS: a custom file name (optional — OPS names files from the content)."},
            "path": {"type": "string", "description": "Where to save the session file. Default: a folder per project under the Provident Studio output folder."},
            "overwrite": {"type": "boolean"}}, "required": ["studio", "template"]},
        "fn": t_new,
    },
    {
        "name": "studio_read_project",
        "description": "Read a CAS or OPS session file and summarise it: every slide or component with its fields and values, the image slots and whether each is filled, and (OPS) what is still missing before export.",
        "inputSchema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
        "fn": t_read,
    },
    {
        "name": "studio_edit",
        "description": (
            "Apply a list of edits to a project and save it. Edits run through the studio's own update and "
            "normalisation, exactly like typing in its controls.\n"
            "OPS edits: {op:'fields', slide:<index>, fields:{key:value}} (keys from the summary; a 'points' field takes "
            "an array or a ' | '-joined string) · {op:'add_slide', kind?, at?, fields?} · {op:'remove_slide', slide} · "
            "{op:'move_slide', slide, to} · {op:'layout', slide, kind} (carousel pages: cfront, cstats, cbul, ctext, ccta).\n"
            "CAS edits: {op:'component', id, variant?, fields?:{text|sub|chips|cols}, style?, size?:'s'|'m'|'l'|'xl', "
            "cluster?:'top'|'bottom', hidden?} · {op:'add_component', type, variant?, fields?, style?, size?, cluster?, after?} · "
            "{op:'remove_component', id, variant?} · {op:'variant', variant, fields:{align:'left'|'center', bg:'dark'|'light', "
            "logoPos:'top'|'bottom', wide:true, banner:true}} · {op:'add_variant'} · {op:'set_mode', mode:'single'|'carousel'}.\n"
            "Both: {op:'set', path:'dotted.path', value} for anything else on the project state (e.g. 'agent.name', "
            "'campaign', 'glassFill', 'storyOn', 'customName'); value null deletes."
        ),
        "inputSchema": {"type": "object", "properties": {
            "path": {"type": "string"},
            "edits": {"type": "array", "items": {"type": "object"}}}, "required": ["path", "edits"]},
        "fn": t_edit,
    },
    {
        "name": "studio_set_image",
        "description": (
            "Put an image file from this Mac into one of the project's image slots (photo, portrait, QR code, logo, icon), "
            "through the studio's own encoder. Agent photos are cut out automatically by the local background-removal "
            "service when it is running (remove_background overrides). remove:true empties the slot."
        ),
        "inputSchema": {"type": "object", "properties": {
            "path": {"type": "string"}, "slot": {"type": "string"}, "file": {"type": "string"},
            "remove_background": {"type": "boolean"}, "remove": {"type": "boolean"}}, "required": ["path", "slot"]},
        "fn": t_image,
    },
    {
        "name": "studio_preview",
        "description": (
            "Render the project and return images to look at — the export's own render at reduced scale. "
            "OPS: one per slide (sizes ['ft'] feed 3:4 by default, 'st' story 9:16). CAS: one per variant/page "
            "(sizes ['sq'] by default; also 'st', 'ls' 16:9, 'bn'/'bs' banners). indexes limits which slides/variants."
        ),
        "inputSchema": {"type": "object", "properties": {
            "path": {"type": "string"}, "indexes": {"type": "array", "items": {"type": "integer"}},
            "sizes": {"type": "array", "items": {"type": "string"}}, "scale": {"type": "number"},
            "max": {"type": "integer"}}, "required": ["path"]},
        "fn": t_preview,
    },
    {
        "name": "studio_export",
        "description": (
            "Export final files with the studio's own export: png, jpg, svg or pdf, the studio's own file names and "
            "folders (CAS: Variant A/B/C folders with feed, Story and Eventbrite Banners; OPS: one file per slide, "
            "_3x4 and, if the story is shown, _9x16). Files go beside the session file unless out_dir is given; "
            "include_assets also writes the studio's session copy and Assets/ folder. Refuses with the list of what is missing when a required field or QR is empty."
        ),
        "inputSchema": {"type": "object", "properties": {
            "path": {"type": "string"}, "format": {"type": "string", "enum": ["png", "jpg", "svg", "pdf"]},
            "out_dir": {"type": "string"}, "include_assets": {"type": "boolean"}}, "required": ["path"]},
        "fn": t_export,
    },
]
BY_NAME = {t["name"]: t for t in TOOLS}

INSTRUCTIONS = (
    "Tools for Provident's two design studios. CAS = Campaign Ads Studio (paid Meta ads), OPS = Organic "
    "Post Studio (organic posts from locked templates). Workflow: studio_catalog → studio_new_project (or "
    "studio_read_project on an existing .adstudio.json/.smpstudio.json) → studio_edit / studio_set_image → "
    "studio_preview to look at it → studio_export. Fill every required field; never invent listing numbers, "
    "prices or names — ask. Brand rules (fonts, colours, margins, layout) are enforced by the templates; "
    "you supply words and pictures. Projects default to: " + OUT
)


def call_tool(name, args):
    t = BY_NAME.get(name)
    if not t:
        raise ToolError("Unknown tool %s" % name)
    res = t["fn"](args or {})
    if isinstance(res, dict) and "__content__" in res:
        return {"content": res["__content__"]}
    return {"content": [{"type": "text", "text": json.dumps(res, indent=1, ensure_ascii=False)}]}


def handle(msg):
    mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
    if method == "initialize":
        return {"protocolVersion": params.get("protocolVersion") or "2025-06-18",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "provident-studio", "version": "1.0.0"},
                "instructions": INSTRUCTIONS}
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": [{k: v for k, v in t.items() if k != "fn"} for t in TOOLS]}
    if method == "tools/call":
        try:
            return call_tool(params.get("name"), params.get("arguments"))
        except ToolError as e:
            return {"content": [{"type": "text", "text": str(e)}], "isError": True}
        except Exception as e:  # keep the server alive whatever a tool did
            log(traceback.format_exc())
            if isinstance(e, (ChromeError, OSError)):
                S.close()
                S.where = S.loaded = None
            return {"content": [{"type": "text", "text": "Internal error: %s" % e}], "isError": True}
    if mid is None:
        return None  # a notification
    raise LookupError(method)


def main():
    log("root", ROOT, "· out", OUT)
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            mid = msg.get("id")
            try:
                res = handle(msg)
                if mid is None:
                    continue
                reply = {"jsonrpc": "2.0", "id": mid, "result": res}
            except LookupError as e:
                reply = {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": "Method not found: %s" % e}}
            sys.stdout.write(json.dumps(reply) + "\n")
            sys.stdout.flush()
    finally:
        S.close()


if __name__ == "__main__":
    main()
