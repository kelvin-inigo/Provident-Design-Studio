#!/usr/bin/env python3
"""Edit-in-Photoshop (and Illustrator) helper for CAS and OPS.

A raster goes to Photoshop; an SVG goes to Illustrator and comes back as SVG, so a
partner mark or a graphic stays vector the whole way.

A web page cannot launch a desktop app, and Photoshop has no URL scheme that opens
a file. This is the other half: a loopback service the studios call when it is
running and do without when it is not (the same contract as tools/rembg).

    GET  /health              {"ok": true, "photoshop": "Adobe Photoshop 2026"}
    POST /open?name=<stem>    reopen the newest saved file with that stem, untouched —
                              pressing the button again must not overwrite a PSD that
                              is still being worked on.
    POST /edit?name=<stem>    body = image bytes. Writes Edits/<stem>.<ext>,
                              removes any older file with that stem, opens it in
                              Photoshop. -> {"ok": true, "file": ..., "mtime": ...}
    GET  /stat?name=<stem>    the newest saved file with that stem -> {"mtime": ...}
    GET  /file?name=<stem>    that file's bytes, as PNG/JPEG/WebP. A PSD or TIFF is
                              converted with macOS's own `sips` first, so a ⌘S that
                              Photoshop turns into "Save as PSD" still comes back.

Standard library only (macOS's own python3 runs it). Binds 127.0.0.1, never the
LAN. A request can only ever touch files named <stem>.<ext> inside Edits/, where
<stem> is restricted to [A-Za-z0-9_-] — no path from the page ever reaches the disk.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
EDITS = os.path.join(HERE, "Edits")
# What the browser can decode as-is, and what sips can turn into a PNG for it.
DIRECT = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
          ".svg": "image/svg+xml"}
CONVERT = {".psd", ".psb", ".tif", ".tiff", ".heic"}
STEM = re.compile(r"^[A-Za-z0-9_-]{1,120}$")
MAX_BODY = 200 * 1024 * 1024


def adobe_app(product):
    """The newest installed Adobe <product>, as a path to its .app."""
    best = None
    for root in ("/Applications", os.path.expanduser("~/Applications")):
        try:
            names = os.listdir(root)
        except OSError:
            continue
        for n in names:
            m = re.match(r"^Adobe " + product + r"(?: (\d{4}))?(?:\.app)?$", n)
            if not m:
                continue
            year = int(m.group(1) or 0)
            path = os.path.join(root, n)
            # Photoshop names its bundle after its folder ("Adobe Photoshop 2026.app");
            # Illustrator does not ("Adobe Illustrator 2026/Adobe Illustrator.app").
            cands = [path] if path.endswith(".app") else [
                os.path.join(path, n + ".app"), os.path.join(path, "Adobe " + product + ".app")]
            app = next((c for c in cands if os.path.isdir(c)), None)
            if not app:
                continue
            if best is None or year > best[0]:
                best = (year, app)
    return best[1] if best else None


def photoshop_app():
    return adobe_app("Photoshop")


def app_for(ext):
    """An SVG opens in Illustrator — Photoshop would rasterise it — anything else in Photoshop."""
    return adobe_app("Illustrator") if ext == ".svg" else photoshop_app()


def app_name(app):
    """The name to show — the year-carrying folder for an app whose bundle omits it."""
    if not app:
        return None
    b = os.path.basename(app)[:-4]
    parent = os.path.basename(os.path.dirname(app))
    return parent if parent.startswith(b) and parent != b else b


def sniff(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    head = data[:2048].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in data[:4096].lower()):
        return ".svg"
    return None


def files_for(stem):
    out = []
    try:
        for n in os.listdir(EDITS):
            base, ext = os.path.splitext(n)
            ext = ext.lower()
            if base == stem and (ext in DIRECT or ext in CONVERT):
                p = os.path.join(EDITS, n)
                out.append((os.path.getmtime(p), p, ext))
    except OSError:
        pass
    out.sort(reverse=True)
    return out


def read_png_size(path):
    """(w, h) of a PNG, or None. Used only to sanity-check a sips conversion."""
    try:
        with open(path, "rb") as f:
            h = f.read(24)
        if h[:8] == b"\x89PNG\r\n\x1a\n":
            return int.from_bytes(h[16:20], "big"), int.from_bytes(h[20:24], "big")
    except OSError:
        pass
    return None


class Handler(BaseHTTPRequestHandler):
    server_version = "ProvidentPhotoshop/1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        # Chrome's Private Network Access preflight — a page reaching loopback.
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Cache-Control", "no-store")

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def stem(self, q):
        s = (q.get("name") or [""])[0]
        return s if STEM.match(s) else None

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path == "/health":
            app, ill = photoshop_app(), adobe_app("Illustrator")
            return self.send_json(200, {
                "ok": bool(app or ill),
                "photoshop": app_name(app),
                "illustrator": app_name(ill),
                "edits": EDITS,
            })
        stem = self.stem(q)
        if u.path in ("/stat", "/file") and not stem:
            return self.send_json(400, {"error": "Bad name."})
        if u.path == "/stat":
            fs = files_for(stem)
            if not fs:
                return self.send_json(404, {"error": "No file."})
            mt, p, ext = fs[0]
            return self.send_json(200, {"mtime": mt, "ext": ext, "file": os.path.basename(p)})
        if u.path == "/file":
            fs = files_for(stem)
            if not fs:
                return self.send_json(404, {"error": "No file."})
            mt, p, ext = fs[0]
            if ext in CONVERT:
                fd, tmp = tempfile.mkstemp(suffix=".png")
                os.close(fd)
                try:
                    r = subprocess.run(["/usr/bin/sips", "-s", "format", "png", p, "--out", tmp],
                                       capture_output=True, timeout=120)
                    if r.returncode != 0 or not read_png_size(tmp):
                        return self.send_json(422, {"error":
                            "Photoshop saved a %s this Mac cannot read. Save it as PNG or JPEG "
                            "with the same name instead (File > Save a Copy)." % ext[1:].upper()})
                    with open(tmp, "rb") as f:
                        data = f.read()
                finally:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass
                ctype = "image/png"
            else:
                # A save can still be in flight; wait for the size to settle.
                last = -1
                for _ in range(20):
                    sz = os.path.getsize(p)
                    if sz == last and sz > 0:
                        break
                    last = sz
                    time.sleep(0.15)
                with open(p, "rb") as f:
                    data = f.read()
                ctype = DIRECT[ext]
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("X-Mtime", str(mt))
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_json(404, {"error": "Not found."})

    def do_POST(self):
        u = urlparse(self.path)
        if u.path == "/open":
            stem = self.stem(parse_qs(u.query))
            fs = files_for(stem) if stem else []
            app = app_for(fs[0][2]) if fs else None
            if not fs or not app:
                return self.send_json(404, {"error": "Nothing to reopen."})
            subprocess.run(["/usr/bin/open", "-a", app, fs[0][1]], capture_output=True, timeout=30)
            return self.send_json(200, {"ok": True, "photoshop": app_name(app)})
        if u.path != "/edit":
            return self.send_json(404, {"error": "Not found."})
        stem = self.stem(parse_qs(u.query))
        if not stem:
            return self.send_json(400, {"error": "Bad name."})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return self.send_json(413, {"error": "That image is too large."})
        data = self.rfile.read(n)
        ext = sniff(data)
        if not ext:
            return self.send_json(415, {"error": "Only PNG, JPEG, WebP or SVG can be sent for editing."})
        app = app_for(ext)
        if not app:
            return self.send_json(503, {"error": ("Illustrator" if ext == ".svg" else "Photoshop") +
                                                " is not installed on this Mac."})
        os.makedirs(EDITS, exist_ok=True)
        # One file per stem: a PSD left by a previous edit would otherwise be "newer".
        for _, p, _ in files_for(stem):
            try:
                os.remove(p)
            except OSError:
                pass
        path = os.path.join(EDITS, stem + ext)
        with open(path, "wb") as f:
            f.write(data)
        r = subprocess.run(["/usr/bin/open", "-a", app, path], capture_output=True, timeout=30)
        if r.returncode != 0:
            return self.send_json(500, {"error": "Could not open " + app_name(app) + ": " +
                                        (r.stderr.decode(errors="replace").strip() or "unknown error")})
        return self.send_json(200, {"ok": True, "file": os.path.basename(path),
                                    "mtime": os.path.getmtime(path),
                                    "photoshop": app_name(app)})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=7312)
    ap.add_argument("--launchd", action="store_true",
                    help="run as the login item: wait for the port if a hand-started copy holds it")
    a = ap.parse_args()
    os.makedirs(EDITS, exist_ok=True)
    while True:
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
            break
        except OSError:
            if not a.launchd:
                raise
            time.sleep(5)
    sys.stderr.write("Photoshop helper on http://127.0.0.1:%d (edits in %s)\n" % (a.port, EDITS))
    srv.serve_forever()


if __name__ == "__main__":
    main()
