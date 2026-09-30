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
  * It opens a browser window on startup, and once a model is loaded it keeps it
    for the life of the process. This one hands the memory back (see below).

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

HOW IT RUNS: A LOGIN ITEM THAT IS EMPTY UNTIL AN UPLOAD ARRIVES
---------------------------------------------------------------
`install.sh` registers this as a per-user LaunchAgent (`ae.provident.cutout`), so
it starts at login and launchd restarts it whenever it exits. Nobody has to run
anything. It gets `--launchd`, which changes three things:

  * NOTHING LOADS AT START. The models load on the first cut-out that needs
    them, which costs about 3s on top of the ~12s inference. /health answers at
    once and says ok, so the studio offers the feature from the moment you log in.
  * IT EXITS `--idle-exit` MINUTES (default 10) AFTER THE LAST CUT-OUT, and
    launchd starts a fresh, empty process straight away. That is the whole point.
    Measured while it works: 1.6GB with the models loaded, 3.5-6.6GB once ONNX
    Runtime has run a few 1024x1024 inferences, and nothing short of the process
    ending hands that back. Empty, it is about 25MB.
  * IF THE PORT IS TAKEN (serve.sh running in a terminal) it waits for the port
    instead of exiting, so launchd is not restarting it every ten seconds.

It runs from ~/Library/Application Support/Provident/cutout, not from this
folder: macOS refuses a login item read access to ~/Documents ("Operation not
permitted", measured), and granting it would be a trip to Privacy & Security on
every Mac. `serve.sh` runs this folder's own copy in a terminal, for testing a
change; `install.sh` copies it into place.

THERE IS NO WARM-UP INFERENCE, and that is measured too. The old start-up ran one
64x64 inference so the first upload would be fast, and it did the opposite: the
first real cut-out after it took 20.2s against 12-13s for every later one, while a
process that had run nothing took 13.0s on its first. The likeliest reason is that
the warm-up sized ONNX Runtime's memory arena for a tiny image and the first real
one paid to regrow it; that part is inference, the timings are not.

Endpoints, all CORS-open to `*` because the studio's origin is `null` when the
document is opened from the disk:

  GET  /health   cheap liveness + what the service is configured to do. `ok` is
                 whether an upload would work — before the first load that is
                 checked on disk (the packages and the weights) without loading
  POST /cutout   raw image bytes in, `image/png` with alpha out
"""

from __future__ import annotations

import argparse
import errno
import importlib.util
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

# A load that FAILED is reported for this long, and then the next upload tries
# again. Without the expiry /health would say "off" for good and the studio would
# never send the upload that could find the problem gone.
RETRY_AFTER_S = 60

STATE = {
    "model": "bria-rmbg",
    "refine": "vitmatte",
    "provider": "cpu",
    "launchd": False,
    "idle_exit": 0,       # minutes; 0 = keep the models for the life of the process
    "ready": False,       # the models are loaded
    "error": None,        # why the last load failed, if it did
    "error_at": 0.0,
}

_lock = threading.Lock()        # one inference at a time
_load_lock = threading.Lock()   # one load at a time; an upload arriving mid-load waits
_busy_lock = threading.Lock()
_busy = 0                       # cut-out requests in progress
_last_use = time.time()
_session = None


class NotReady(Exception):
    """The models cannot be loaded. The message is for a person."""


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


def _rembg_home() -> str:
    # rembg's own resolution (`BaseSession.rembg_home`), repeated here so the
    # weights can be checked WITHOUT importing rembg: the import alone is a few
    # hundred MB, and not paying it until an upload arrives is what --launchd is for.
    if os.getenv("U2NET_HOME"):
        return os.path.expanduser(os.getenv("U2NET_HOME"))
    xdg = os.getenv("XDG_DATA_HOME")
    default = os.path.join(xdg, "rembg") if xdg else os.path.join("~", ".rembg")
    return os.path.expanduser(os.getenv("REMBG_HOME", default))


def _legacy_home() -> str:
    return os.path.expanduser(os.getenv(
        "U2NET_HOME", os.path.join(os.getenv("XDG_DATA_HOME", "~"), ".u2net")))


def _has_weights(name: str) -> bool:
    for d, pick in ((os.path.join(_rembg_home(), "models", name), lambda f: True),
                    (_legacy_home(), lambda f: f.startswith(name))):
        try:
            if any(f.endswith(".onnx") and pick(f) for f in os.listdir(d)):
                return True
        except OSError:
            pass
    return False


def preflight():
    """Why an upload would fail, checked on disk without loading anything — or None."""
    for mod in ("rembg", "onnxruntime", "PIL"):
        if importlib.util.find_spec(mod) is None:
            return f"{mod} is not installed in this Python \u2014 run tools/rembg/install.sh."
    need = [STATE["model"]] + (["vitmatte"] if STATE["refine"] == "vitmatte" else [])
    missing = [n for n in need if not _has_weights(n)]
    if missing:
        # Loading would start a 1GB download inside somebody's upload. Refuse
        # instead, and say what fixes it.
        return ("The model weights are not downloaded (" + ", ".join(missing)
                + ") \u2014 run tools/rembg/install.sh.")
    return None


def _fail(msg: str):
    STATE.update(error=msg, error_at=time.time())
    raise NotReady(msg)


def load() -> None:
    """Build both sessions, once. Every cut-out calls this and all but the first
    return at once; one that arrives while a load is running waits for it."""
    global _session, _last_use
    if STATE["ready"]:
        return
    with _load_lock:
        if STATE["ready"]:
            return
        why = preflight()
        if why:
            _fail(why)
        try:
            from rembg import new_session
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
                # own dict; if it ever goes away this raises here rather than
                # silently running somewhere else.
                variant = matting.DEFAULT_VARIANT
                t = time.time()
                matting._sessions[variant] = ort.InferenceSession(
                    matting._ViTMatteFiles.download_models(variant=variant),
                    providers=provs,
                )
                log(f"vitmatte {variant} loaded in {time.time() - t:.1f}s")
        except Exception as e:
            log("FAILED to load:\n" + traceback.format_exc())
            _fail(f"The background-removal model could not be loaded: {e}")
        STATE.update(ready=True, error=None)
        _last_use = time.time()


def health() -> dict:
    err = None
    if not STATE["ready"]:
        if STATE["error"] and time.time() - STATE["error_at"] < RETRY_AFTER_S:
            err = STATE["error"]
        else:
            err = preflight()
    return {
        "service": "provident-cutout",
        "ok": err is None,
        "loaded": bool(STATE["ready"]),
        "loading": _load_lock.locked() and not STATE["ready"],
        "launchd": STATE["launchd"],
        "idle_exit_min": STATE["idle_exit"],
        "model": STATE["model"],
        "refine": STATE["refine"],
        "provider": STATE["provider"],
        "error": err,
    }


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

    # Only now, so a pre-cut PNG never costs a model load.
    load()
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
            self._json(200, health())
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        global _busy, _last_use
        if self.path.split("?")[0] != "/cutout":
            self._json(404, {"error": "not found"})
            return
        # Counted from here, so the idle exit can never end a process that is
        # still reading somebody's upload.
        with _busy_lock:
            _busy += 1
        try:
            self._cutout()
        finally:
            with _busy_lock:
                _busy -= 1
                _last_use = time.time()

    def _cutout(self):
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
        except NotReady as e:
            self._json(503, {"error": str(e)})
            return
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


def watch_idle(srv, minutes: int) -> None:
    """Exit once the models have sat unused for `minutes`, so their memory goes back.

    Only meaningful under launchd: KeepAlive starts a fresh, empty process at once.
    The listening socket closes FIRST, so no new upload can start in this process,
    and anything already accepted is let finish.
    """
    while True:
        time.sleep(10)
        if not STATE["ready"]:
            continue
        with _busy_lock:
            idle = not _busy and time.time() - _last_use >= minutes * 60
        if not idle:
            continue
        log(f"no cut-out for {minutes} min \u2014 exiting so the model's memory goes back "
            f"(launchd starts a fresh, empty process)")
        srv.shutdown()
        srv.server_close()
        time.sleep(0.5)             # a request accepted just before the close registers
        deadline = time.time() + 300
        while time.time() < deadline:
            with _busy_lock:
                if not _busy:
                    break
            time.sleep(0.2)
        os._exit(0)


def bind(port: int, wait: bool):
    """The loopback listener. Run by hand, a taken port is an error to report;
    under launchd it is serve.sh in a terminal, so wait for it rather than exit
    and have launchd restart this every ten seconds."""
    warned = False
    while True:
        try:
            # Loopback only, on purpose: see the module docstring.
            return ThreadingHTTPServer(("127.0.0.1", port), Handler)
        except OSError as e:
            if e.errno != errno.EADDRINUSE:
                raise
            if not wait:
                log(f"port {port} is already in use \u2014 the service is probably running "
                    f"by itself already (install.sh makes it a login item). Check: "
                    f"curl http://127.0.0.1:{port}/health")
                sys.exit(1)
            if not warned:
                log(f"port {port} is in use (serve.sh in a terminal?) \u2014 waiting for it")
                warned = True
            time.sleep(5)


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
    ap.add_argument("--launchd", action="store_true",
                    help="run as the login item: load nothing until the first cut-out, "
                         "exit --idle-exit minutes after the last one, wait for a taken port")
    ap.add_argument("--idle-exit", type=int, default=int(os.getenv("CUTOUT_IDLE_EXIT", "10")),
                    metavar="MIN",
                    help="with --launchd: minutes after the last cut-out to exit (default 10; 0 never)")
    args = ap.parse_args()

    STATE.update(model=args.model, refine=args.refine, provider=args.provider,
                 launchd=args.launchd, idle_exit=args.idle_exit if args.launchd else 0)

    log(f"model={args.model} refine={args.refine} provider={args.provider}"
        + (f" launchd idle-exit={STATE['idle_exit']}min" if args.launchd else ""))

    srv = bind(args.port, wait=args.launchd)

    if args.launchd:
        why = preflight()
        log("waiting for the first cut-out before loading the models"
            + (f" \u2014 but: {why}" if why else ""))
        if STATE["idle_exit"] > 0:
            threading.Thread(target=watch_idle, args=(srv, STATE["idle_exit"]),
                             daemon=True).start()
    else:
        # Run by hand: load now, so a broken install shows up in this terminal
        # rather than in the first upload. The port is already open; an upload
        # that arrives mid-load waits for it.
        def _load_now():
            log("loading models (first run downloads about 1.1GB into ~/.rembg)...")
            try:
                load()
                log("models ready")
            except NotReady as e:
                log(f"the service will answer /health but refuse uploads: {e}")
        threading.Thread(target=_load_now, daemon=True).start()

    log(f"ready on http://127.0.0.1:{args.port}"
        + ("" if args.launchd else "  (ctrl-c to stop)"))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        log("stopped")


if __name__ == "__main__":
    main()
