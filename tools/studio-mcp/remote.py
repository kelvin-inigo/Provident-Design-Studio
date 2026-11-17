#!/usr/bin/env python3
"""Provident Studio — the studio tools over HTTP, for the Grok bot (or any MCP client off this Mac).

server.py speaks MCP over stdio to a client on this Mac. This serves the SAME tools — the same
`TOOLS`, the same headless studio, the same session files — over HTTP, so a remote client can drive
CAS and OPS through a tunnel: Grok's custom connector (grok.com › Connectors › New › Custom), the
xAI API's `mcp` tool, or Claude's remote connectors. Nothing about the tools is reimplemented.

Transports: MCP Streamable HTTP (POST /mcp) and the older SSE pair (GET /sse, POST /messages).

Who may call: every request carries a token — `Authorization: Bearer <token>`, or, for a connector
form that takes only a URL, the token in the path: https://<host>/t/<token>/mcp. Tokens are made
by install-remote.sh --token "<name>", one per person, in tokens.json under PROVIDENT_REMOTE_HOME.
NEVER in this repository — it is public. The headless studio has no Google sign-in (access.js is
off when the page cannot reach the server), so this token IS the gate.

What a remote caller may touch: only the projects folder (PROVIDENT_STUDIO_OUT). A path outside it
is refused, a `file` outside it is refused — pictures come in by `url`. Exports and previews go
back as signed links (/f/<expiry>/<signature>/<file>) that need no token and open for LINK_DAYS.
Standard library only, like the rest of the server.
"""
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import queue
import re
import secrets
import sys
import threading
import time
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import server as core  # noqa: E402  — the tools, the headless studio, the session files

HOME = os.path.expanduser(os.environ.get("PROVIDENT_REMOTE_HOME") or "~/Library/Application Support/Provident/studio-remote")
PORT = int(os.environ.get("PROVIDENT_REMOTE_PORT") or 7313)
PUBLIC = (os.environ.get("PROVIDENT_REMOTE_PUBLIC_URL") or "").rstrip("/")
LINK_DAYS = int(os.environ.get("PROVIDENT_REMOTE_LINK_DAYS") or 14)
IMAGES = os.environ.get("PROVIDENT_REMOTE_IMAGES", "1") != "0"   # 0: previews come back as links only
IDLE_CLOSE = int(os.environ.get("PROVIDENT_REMOTE_IDLE_MIN") or 30) * 60  # close Chrome after this long unused
MAX_BODY = 32 * 1024 * 1024
OUT = core.OUT
LAST = {"t": time.time()}
SSE = {}          # session id -> queue of replies, for the older SSE transport
LOCK = threading.Lock()   # one headless Chrome, one tab: tool calls take turns


def log(*a):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), "[studio-remote]", *a, file=sys.stderr, flush=True)


# ── tokens and the link secret: per-Mac files under HOME, never in the repository ──────────
def tokens():
    try:
        with open(os.path.join(HOME, "tokens.json"), encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError):
        return {}
    return d if isinstance(d, dict) else {}


def who_is(tok):
    """The name behind a token, or None. Constant-time per token."""
    if not tok:
        return None
    for k, v in tokens().items():
        if hmac.compare_digest(str(k), str(tok)):
            return (v or {}).get("name") or "someone"
    return None


_SECRET = []


def secret():
    if _SECRET:
        return _SECRET[0]
    p = os.path.join(HOME, "secret")
    try:
        s = open(p, encoding="utf-8").read().strip()
    except OSError:
        s = ""
    if len(s) < 32:
        s = secrets.token_hex(32)
        os.makedirs(HOME, exist_ok=True)
        fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        os.write(fd, s.encode())
        os.close(fd)
    _SECRET.append(s.encode())
    return _SECRET[0]


def sign(rel, exp):
    return hmac.new(secret(), ("%s|%d" % (rel, exp)).encode("utf-8"), hashlib.sha256).hexdigest()[:24]


def link(path, base):
    """A signed https link to a file under the projects folder; None for anything else."""
    rel = os.path.relpath(os.path.abspath(path), OUT)
    if rel.startswith(".."):
        return None
    exp = int(time.time()) + LINK_DAYS * 86400
    return "%s/f/%d/%s/%s" % (base, exp, sign(rel, exp), urllib.parse.quote(rel))


# ── a remote caller stays inside the projects folder ───────────────────────────────────────
def inside(v, what):
    p = os.path.expanduser(str(v))
    p = os.path.abspath(p if os.path.isabs(p) else os.path.join(OUT, p))
    if p != OUT and not p.startswith(OUT + os.sep):
        raise core.ToolError("%s must be inside the projects folder here (%s) — use a path relative to it." % (what, OUT))
    return p


def guard(name, args):
    args = dict(args or {})
    for k in ("path", "out_dir"):
        if args.get(k):
            args[k] = inside(args[k], k)
    if name == "studio_set_image" and args.get("file") and not args.get("url"):
        args["file"] = inside(args["file"], "file")   # a render or an earlier upload; anything else comes by url
    return args


REMOTE_NOTE = (
    "\n\nYou are connected from outside the Mac that runs the studios. Paths are relative to the projects folder; "
    "use studio_list_projects to find an existing project. Pictures go in with studio_set_image's `url` (an https "
    "link to the image — a Drive file shared with anyone with the link, as a direct download link), not a file path. "
    "studio_export and studio_preview answer with https links to the files, which open for %d days without signing in; "
    "give the user those links. Never make up a listing number, price, permit, phone number or name — ask." % LINK_DAYS
)


# ── results for a remote reader: files become links ────────────────────────────────────────
def enrich(name, args, res, base):
    content = res.get("content") or []
    if name == "studio_export" and content and content[0].get("type") == "text":
        try:
            d = json.loads(content[0]["text"])
        except ValueError:
            return res
        links = []
        for p in (d.get("renders") or []) + (d.get("other_files") or []):
            u = link(p, base)
            if u:
                links.append({"file": os.path.relpath(p, d.get("out_dir") or OUT), "url": u})
        d["links"] = links
        d["links_note"] = "The links open without signing in and last %d days. The files stay in %s on the studio Mac." % (LINK_DAYS, d.get("out_dir") or OUT)
        content[0]["text"] = json.dumps(d, indent=1, ensure_ascii=False)
    elif name == "studio_preview":
        try:
            pdir = os.path.join(os.path.dirname(core._abs(args.get("path"))), "_previews")
            os.makedirs(pdir, exist_ok=True)
        except (core.ToolError, OSError):
            return res
        out, label = [], "preview"
        for c in content:
            if c.get("type") == "text":
                label = c["text"]
                continue
            if c.get("type") == "image":
                fn = re.sub(r"[^A-Za-z0-9._-]+", "-", label).strip("-") or "preview"
                p = os.path.join(pdir, fn + ".jpg")
                with open(p, "wb") as f:
                    f.write(base64.b64decode(c["data"]))
                out.append({"type": "text", "text": "%s — %s" % (label, link(p, base))})
                if IMAGES:
                    out.append(c)
                continue
            out.append(c)
        res["content"] = out
    return res


def dispatch(msg, who, base):
    """One JSON-RPC message in, one reply out (None for a notification). Mirrors server.main()."""
    mid, method, params = msg.get("id"), msg.get("method"), msg.get("params") or {}
    LAST["t"] = time.time()
    if method == "tools/call":
        name, args = params.get("name"), params.get("arguments") or {}
        t0 = time.time()
        try:
            args = guard(name, args)
            with LOCK:
                res = core.call_tool(name, args)
            res = enrich(name, args, res, base)
        except core.ToolError as e:
            res = {"content": [{"type": "text", "text": str(e)}], "isError": True}
        except Exception as e:  # keep serving whatever a tool did
            log(traceback.format_exc())
            if isinstance(e, (core.ChromeError, OSError)):
                core.S.close()
                core.S.where = core.S.loaded = None
            res = {"content": [{"type": "text", "text": "Internal error: %s" % e}], "isError": True}
        log(who, "·", name, "·", "%.1fs" % (time.time() - t0), "· error" if res.get("isError") else "· ok")
        return None if mid is None else {"jsonrpc": "2.0", "id": mid, "result": res}
    try:
        with LOCK:
            res = core.handle(msg)
    except LookupError as e:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": "Method not found: %s" % e}}
    if mid is None or res is None:
        return None
    if method == "initialize":
        res["instructions"] = (res.get("instructions") or "") + REMOTE_NOTE
        log(who, "· initialize ·", json.dumps((params.get("clientInfo") or {}).get("name") or "?"))
    return {"jsonrpc": "2.0", "id": mid, "result": res}


HOME_PAGE = """<!doctype html><meta charset="utf-8"><title>Provident Studio tools</title>
<style>body{font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:40em;margin:4em auto;padding:0 1em;color:#1b2a41}code{background:#eef1f6;padding:.1em .3em;border-radius:4px}</style>
<h1>Provident Studio tools</h1>
<p>An MCP server for the Campaign Ads Studio and the Organic Post Studio. It answers tool calls from
a connected assistant — there is nothing to see here.</p>
<p>To connect: add this address as a custom connector, with the token the admin gave you. Health: <code>/health</code>.</p>"""


class H(BaseHTTPRequestHandler):
    server_version = "provident-studio-remote/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    # ── plumbing ──
    def _send(self, code, body=b"", ctype="application/json; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    def _route(self):
        u = urllib.parse.urlsplit(self.path)
        path, tok = u.path, None
        m = re.match(r"^/t/([A-Za-z0-9_-]{16,})(/.*)?$", path)
        if m:
            tok, path = m.group(1), m.group(2) or "/"
        return tok, (path.rstrip("/") or "/"), urllib.parse.parse_qs(u.query)

    def _who(self, tok):
        h = self.headers.get("Authorization") or ""
        if h.lower().startswith("bearer "):
            tok = tok or h[7:].strip()
        return who_is(tok)

    def _deny(self):
        self._send(401, json.dumps({"error": "This server needs a token: Authorization: Bearer <token>, or /t/<token>/mcp."}),
                   extra={"WWW-Authenticate": 'Bearer realm="provident-studio"'})

    def _base(self):
        if PUBLIC:
            return PUBLIC
        proto = self.headers.get("X-Forwarded-Proto") or "http"
        host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host") or "127.0.0.1:%d" % PORT
        return "%s://%s" % (proto.split(",")[0].strip(), host.split(",")[0].strip())

    # ── Streamable HTTP and the SSE pair ──
    def do_POST(self):
        tok, path, q = self._route()
        if path not in ("/mcp", "/messages"):
            return self._send(404, json.dumps({"error": "not found"}))
        who = self._who(tok)
        if not who:
            return self._deny()
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            return self._send(413, json.dumps({"error": "request too large"}))
        try:
            body = json.loads(self.rfile.read(n).decode("utf-8") if n else "null")
        except (ValueError, UnicodeDecodeError):
            return self._send(400, json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}))
        msgs = body if isinstance(body, list) else [body]
        if not msgs or not all(isinstance(m, dict) for m in msgs):
            return self._send(400, json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}}))
        base = self._base()
        if path == "/messages":
            ch = SSE.get((q.get("session") or [""])[0])
            if ch is None:
                return self._send(404, json.dumps({"error": "no such SSE session — open GET /sse first"}))
            for m in msgs:
                r = dispatch(m, who, base)
                if r is not None:
                    ch.put(r)
            return self._send(202, "Accepted", "text/plain")
        replies = [r for r in (dispatch(m, who, base) for m in msgs) if r is not None]
        extra = {}
        if any(m.get("method") == "initialize" for m in msgs):
            extra["Mcp-Session-Id"] = secrets.token_urlsafe(16)
        if not replies:
            return self._send(202, "", extra=extra)
        return self._send(200, json.dumps(replies if isinstance(body, list) else replies[0], ensure_ascii=False), extra=extra)

    def do_GET(self):
        tok, path, q = self._route()
        if path == "/health":
            return self._send(200, json.dumps({"ok": True, "service": "provident-studio-remote", "tools": len(core.TOOLS),
                                               "tokens": len(tokens()), "chrome": "up" if core.S.chrome else "idle"}))
        if path == "/":
            return self._send(200, HOME_PAGE, "text/html; charset=utf-8")
        if path.startswith("/f/"):
            return self._file(path)
        if path == "/mcp":
            return self._send(405, json.dumps({"error": "no server-started stream here; POST your messages to this address"}), extra={"Allow": "POST, DELETE"})
        if path == "/sse":
            who = self._who(tok)
            if not who:
                return self._deny()
            return self._sse(tok, who)
        return self._send(404, json.dumps({"error": "not found"}))

    def do_HEAD(self):
        self.do_GET()

    def do_DELETE(self):
        tok, path, q = self._route()
        if path == "/mcp":
            return self._send(200, "{}")
        return self._send(404, json.dumps({"error": "not found"}))

    def _sse(self, tok, who):
        sid = secrets.token_urlsafe(16)
        ch = queue.Queue()
        SSE[sid] = ch
        self.close_connection = True
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        prefix = "/t/%s" % tok if tok else ""
        try:
            self.wfile.write(("event: endpoint\ndata: %s/messages?session=%s\n\n" % (prefix, sid)).encode())
            self.wfile.flush()
            while True:
                try:
                    r = ch.get(timeout=15)
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
                    continue
                self.wfile.write(("event: message\ndata: %s\n\n" % json.dumps(r, ensure_ascii=False)).encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            SSE.pop(sid, None)
            log(who, "· sse closed")

    # ── a signed link to an export or preview ──
    def _file(self, path):
        m = re.match(r"^/f/(\d+)/([0-9a-f]{24})/(.+)$", path)
        if not m:
            return self._send(404, json.dumps({"error": "not found"}))
        exp, sig, rel = int(m.group(1)), m.group(2), urllib.parse.unquote(m.group(3))
        if time.time() > exp:
            return self._send(410, "This link has expired. Ask for the export again.", "text/plain; charset=utf-8")
        if not hmac.compare_digest(sig, sign(rel, exp)):
            return self._send(403, "This link is not valid.", "text/plain; charset=utf-8")
        p = os.path.abspath(os.path.join(OUT, rel))
        if not p.startswith(OUT + os.sep) or not os.path.isfile(p):
            return self._send(404, "That file is no longer here.", "text/plain; charset=utf-8")
        ctype = mimetypes.guess_type(p)[0] or "application/octet-stream"
        with open(p, "rb") as f:
            data = f.read()
        name = os.path.basename(p).replace('"', "")
        return self._send(200, data, ctype, extra={"Content-Disposition": 'inline; filename="%s"' % name})


def janitor():
    """Chrome is a few hundred MB; hand it back when nobody has called for a while."""
    while True:
        time.sleep(60)
        if core.S.chrome and time.time() - LAST["t"] > IDLE_CLOSE and not LOCK.locked():
            with LOCK:
                core.S.close()
                core.S.where = core.S.loaded = None
            log("closed the idle studio")


def main():
    host, port = "127.0.0.1", PORT
    for a in sys.argv[1:]:
        if a == "--lan":
            host = "0.0.0.0"
        elif a.startswith("--port="):
            port = int(a.split("=", 1)[1])
    os.makedirs(OUT, exist_ok=True)
    secret()
    n = len(tokens())
    log("root", core.ROOT, "· projects", OUT)
    log("listening on http://%s:%d · %d token%s · public url %s" % (host, port, n, "" if n == 1 else "s", PUBLIC or "(taken from each request)"))
    if not n:
        log('NO TOKENS YET — nobody can connect. Run: sh tools/studio-mcp/install-remote.sh --token "Name"')
    threading.Thread(target=janitor, daemon=True).start()
    srv = ThreadingHTTPServer((host, port), H)
    srv.daemon_threads = True
    try:
        srv.serve_forever()
    finally:
        core.S.close()


if __name__ == "__main__":
    main()
