#!/usr/bin/env python3
"""Local background-removal service for the Provident Organic Studio.

The studio is a single `.dc.html` that runs offline, straight off the disk, and
carries no build step. So the model cannot live inside it: the weights alone are
about 1.1GB, and there is no JS toolchain here to bundle an ONNX runtime with.
This is the other half of that trade — a service on loopback that the studio
calls when it is running and does without when it is not.

WHY THIS AND NOT `rembg s`
--------------------------
`rembg`'s own server does the same job, and three things made a thin wrapper the
better host:

  * `rembg/commands/s_command.py` imports gradio at module scope, so `--no-ui`
    still drags in the whole Gradio + FastAPI + aiohttp tree. This file needs
    nothing but the standard library, which halves the install.
  * It binds 0.0.0.0 by default. This is a personal tool that accepts arbitrary
    images and runs a network on them; it has no business on the LAN.
  * It opens a browser window on startup, and it loads models lazily — so the
    first upload pays a 60s model load with no way to warm it.

Everything that actually removes a background is rembg's, called through its
public API (`new_session`, `remove`).

THE EDGE QUALITY IS THE POINT, AND IT IS A MEASURED CHOICE
----------------------------------------------------------
rembg offers four edge treatments. Measured on Provident's own studio portraits
(dark suits on a dark wall, and a ponytail against it):

  naive            a hard mask, with the backdrop's colour still mixed into
                   every semi-transparent pixel — the halo that reads as "fuzzy"
  alpha_matting    WORST of the four here: pymatting's closed-form solver leaves
                   a wide grey frizz around shoulders and hair. Do not enable it.
  decontaminate    naive, plus the foreground colour unmixed. Clean, cheap.
  vitmatte         a network refines the mask into a real alpha at 1024x1024,
                   then the same unmixing runs on the result. Tightest
                   silhouette, keeps flyaway hair, no halo. DEFAULT.

`vitmatte` costs one extra 1024x1024 inference over `decontaminate`. That is the
whole reason to prefer it, and `--refine decontaminate` is the fallback when the
wait matters more than the edge.

AND THE SEGMENTER IS WHAT PICKS THE SUBJECT, WHICH IS WHY THE BIG MODEL STAYS
-----------------------------------------------------------------------------
ViTMatte does the edge work whatever produced the trimap, so on a single figure
all three segmenters below look alike. They part company on WHO to keep. On a
portrait cropped out of a group shot, measured:

  bria-rmbg          977MB  ~12-19s   keeps the subject alone. CORRECT.
  isnet-general-use  170MB  ~2.6-3.4s kept a whole second person from the
                                      background, semi-transparent
  u2net_human_seg    168MB  ~2.0s     same failure

Agent photos are routinely shot in an office or at an event with colleagues
behind them, so that is not an edge case — it is the common one. `--model
isnet-general-use` is the fast, small option for anyone who only ever shoots on
a clean backdrop, and it is 5x quicker; the default is correct rather than fast.

CoreML was measured and REJECTED: `--provider coreml` stalls indefinitely
compiling a 977MB BiRefNet (0% CPU, no progress after ten minutes). It is left
in only because "why is a Mac tool not using the Neural Engine" is otherwise a
question every future reader has to re-derive. It may be worth a try with
`--model isnet-general-use`; it was not tested there.

Endpoints, all CORS-open to `*` because the studio's origin is `null` when the
document is opened from the disk:

  GET  /health   cheap liveness + what the service is configured to do
  POST /cutout   raw image bytes in, `image/png` with alpha out
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# 40MB. `providentEncodeFile` caps the long side at 3840px, so nothing the
# studio stores is anywhere near this; the cap exists to bound a stray paste.
MAX_BYTES = 40 * 1024 * 1024

# Below this share of opaque pixels essentially everything was erased, and
# storing that would silently empty the slot. Refuse instead, so the studio can
# keep the original and say why.
#
# It catches TOTAL erasure and nothing subtler, deliberately: a salient-object
# model hands back an arbitrary blob for an image with no subject in it —
# measured at 44.6% opaque on a flat grey field — and a real portrait is often
# 20-60% opaque too, so no threshold can separate the two. Detecting "that isn't
# a person" is not this guard's job; the preview shows the result immediately.
MIN_COVERAGE = 0.005

# Above this share of fully-transparent pixels the upload is ALREADY a cut-out.
# Re-running the model on one is wasted time and can only damage an alpha
# channel somebody made by hand, so it is passed straight through.
PRECUT_TRANSPARENT = 0.02

STATE = {
    "model": "bria-rmbg",
    "refine": "vitmatte",
    "provider": "cpu",
    "ready": False,
    "error": None,
}

_lock = threading.Lock()
_session = None


def log(msg: str) -> None:
    sys.stderr.write(f"[cutout] {msg}\n")
    sys.stderr.flush()


def _providers(name: str):
    """ONNX Runtime execution providers, most preferred first.

    CoreML is not in rembg's own provider picker (`BaseSession.__init__` only
    ever reaches for CUDA, ROCm or OpenVINO), so on Apple silicon the library
    runs on CPU unless it is told otherwise.
    """
    if name == "cpu":
        return ["CPUExecutionProvider"]
    if name == "coreml":
        return ["CoreMLExecutionProvider", "CPUExecutionProvider"]
    raise ValueError(f"unknown provider {name!r}")


def warm() -> None:
    """Build both sessions and run one inference, before the port opens.

    Loading a 977MB model takes tens of seconds, and ViTMatte's session is built
    lazily on first use. Doing that inside the first upload is the difference
    between a feature that feels broken and one that feels instant.
    """
    global _session
    from PIL import Image
    from rembg import new_session, remove
    import onnxruntime as ort
    import rembg.matting as matting

    provs = _providers(STATE["provider"])

    t = time.time()
    _session = new_session(STATE["model"], providers=provs)
    log(f"{STATE['model']} loaded in {time.time() - t:.1f}s "
        f"on {_session.inner_session.get_providers()[0]}")

    if STATE["refine"] == "vitmatte":
        # `rembg.matting._get_session` hardcodes CPU/CUDA and has no provider
        # argument, so the only way to give ViTMatte the same provider as the
        # segmenter is to seed the cache it reads. `_sessions` is the library's
        # own dict; if it ever goes away this raises at startup rather than
        # silently running somewhere else.
        variant = matting.DEFAULT_VARIANT
        t = time.time()
        matting._sessions[variant] = ort.InferenceSession(
            matting._ViTMatteFiles.download_models(variant=variant),
            providers=provs,
        )
        log(f"vitmatte {variant} loaded in {time.time() - t:.1f}s")

    t = time.time()
    remove(Image.new("RGB", (64, 64), (128, 128, 128)), session=_session,
           **_refine_kwargs())
    log(f"warm-up inference {time.time() - t:.1f}s")


def _refine_kwargs():
    if STATE["refine"] == "vitmatte":
        return {"vitmatte": True}
    if STATE["refine"] == "decontaminate":
        return {"decontaminate": True}
    return {}


def cutout(raw: bytes):
    """bytes in, (png_bytes, note) out. Raises ValueError with a user-facing message."""
    from PIL import Image, ImageOps
    from rembg import remove

    try:
        src = Image.open(io.BytesIO(raw))
        src.load()
    except Exception:
        raise ValueError("That file could not be read as an image.")

    src = ImageOps.exif_transpose(src)

    # Already a cut-out? Leave it exactly as it is.
    if src.mode in ("RGBA", "LA") or (src.mode == "P" and "transparency" in src.info):
        alpha = src.convert("RGBA").getchannel("A")
        clear = sum(c for v, c in enumerate(alpha.histogram()) if v < 8)
        if clear / float(alpha.width * alpha.height) > PRECUT_TRANSPARENT:
            return raw, "already-cutout"

    with _lock:
        out = remove(src.convert("RGB"), session=_session, **_refine_kwargs())

    alpha = out.getchannel("A")
    opaque = sum(c for v, c in enumerate(alpha.histogram()) if v > 24)
    if opaque / float(alpha.width * alpha.height) < MIN_COVERAGE:
        raise ValueError("Almost nothing was left after removing the background.")

    buf = io.BytesIO()
    out.save(buf, "PNG")
    return buf.getvalue(), "cutout"


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "ProvidentCutout/1.0"

    def log_message(self, fmt, *args):  # quieter than the default access log
        pass

    def _cors(self):
        # The studio is opened from the disk as often as it is served, so its
        # origin is `null`. A wildcard is the only thing that covers both, and
        # it is safe here: the service is loopback-only and carries no
        # credentials or state a page could read back.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send(self, code, body, ctype, extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code, obj, extra=None):
        self._send(code, json.dumps(obj), "application/json", extra)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] in ("/health", "/"):
            self._json(200, {
                "service": "provident-cutout",
                "ok": bool(STATE["ready"]),
                "model": STATE["model"],
                "refine": STATE["refine"],
                "provider": STATE["provider"],
                "error": STATE["error"],
            })
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.split("?")[0] != "/cutout":
            self._json(404, {"error": "not found"})
            return
        if not STATE["ready"]:
            self._json(503, {"error": STATE["error"] or "still loading the model"})
            return

        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n <= 0:
            self._json(400, {"error": "no image in the request body"})
            return
        if n > MAX_BYTES:
            self._json(413, {"error": f"image is larger than {MAX_BYTES // 1048576}MB"})
            return

        raw = self.rfile.read(n)
        t = time.time()
        try:
            png, note = cutout(raw)
        except ValueError as e:
            self._json(422, {"error": str(e)})
            return
        except Exception as e:
            log("cutout failed:\n" + traceback.format_exc())
            self._json(500, {"error": f"background removal failed: {e}"})
            return

        ms = int((time.time() - t) * 1000)
        log(f"{note} {len(raw) // 1024}KB -> {len(png) // 1024}KB in {ms}ms")
        self._send(200, png, "image/png", {
            "X-Cutout": note,
            "X-Cutout-Ms": str(ms),
            "X-Cutout-Model": STATE["model"],
            "X-Cutout-Refine": STATE["refine"],
        })


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=int(os.getenv("CUTOUT_PORT", "7311")))
    ap.add_argument("--model", default=os.getenv("CUTOUT_MODEL", "bria-rmbg"),
                    help="rembg session name (default: bria-rmbg)")
    ap.add_argument("--refine", default=os.getenv("CUTOUT_REFINE", "vitmatte"),
                    choices=["vitmatte", "decontaminate", "none"],
                    help="edge treatment (default: vitmatte)")
    ap.add_argument("--provider", default=os.getenv("CUTOUT_PROVIDER", "cpu"),
                    choices=["cpu", "coreml"],
                    help="ONNX Runtime execution provider (default: cpu)")
    args = ap.parse_args()

    STATE.update(model=args.model, refine=args.refine, provider=args.provider)

    log(f"model={args.model} refine={args.refine} provider={args.provider}")
    log("loading models (first run downloads about 1.1GB into ~/.rembg)...")
    try:
        warm()
        STATE["ready"] = True
    except Exception as e:
        STATE["error"] = str(e)
        log("FAILED to load:\n" + traceback.format_exc())
        log("the service will answer /health but refuse uploads")

    # Loopback only, on purpose: see the module docstring.
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    log(f"ready on http://127.0.0.1:{args.port}  (ctrl-c to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        log("stopped")


if __name__ == "__main__":
    main()
