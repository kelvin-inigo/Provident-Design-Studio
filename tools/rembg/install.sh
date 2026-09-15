#!/bin/sh
# One-time setup for the Organic Studio's background-removal service.
#
# Idempotent: run it again any time. It installs nothing system-wide and needs
# no admin rights — everything lands in this folder or in ~/.local/bin, and
# `uninstall.sh` removes it.
set -eu
cd "$(dirname "$0")"

SRC=src/rembg-main
VENV=.venv
PY=3.13

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

[ -d "$SRC" ] || { echo "Missing $SRC — unpack the rembg repo there first." >&2; exit 1; }

# 1. uv. rembg needs Python >= 3.11 and macOS ships 3.9, so a Python has to come
#    from somewhere. uv is one self-contained binary that brings its own.
if command -v uv >/dev/null 2>&1; then UV=$(command -v uv)
elif [ -x "$HOME/.local/bin/uv" ]; then UV="$HOME/.local/bin/uv"
else
  say "Installing uv (a self-contained Python manager, ~36MB, no admin needed)"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  UV="$HOME/.local/bin/uv"
fi
echo "uv: $("$UV" --version)"

# 2. A private interpreter + the library.
if [ ! -x "$VENV/bin/python" ]; then
  say "Creating a private Python $PY"
  "$UV" venv --python "$PY" "$VENV"
fi

say "Installing rembg and onnxruntime (~390MB)"
# rembg's pyproject derives its version from git tags via poetry-dynamic-versioning.
# There are none here — and worse, it would find THIS repo's tags — so bypass it.
POETRY_DYNAMIC_VERSIONING_BYPASS=0.0.0 \
  "$UV" pip install --python "$VENV/bin/python" "./$SRC[cpu]"

# 3. Weights. Downloaded once into ~/.rembg (the library's own location, so it is
#    shared with any other rembg on this machine and survives moving this folder).
say "Downloading models (~1.1GB, once)"
"$VENV/bin/python" - <<'PY'
from rembg.sessions.bria_rmbg import BriaRmBgSession
from rembg.matting import _ViTMatteFiles, DEFAULT_VARIANT
print("segmenter:", BriaRmBgSession.download_models())
print("refiner:  ", _ViTMatteFiles.download_models(variant=DEFAULT_VARIANT))
PY

say "Done. Start it with:  ./tools/rembg/serve.sh"
echo "The studio picks it up on its own within 15 seconds — no reload needed."
