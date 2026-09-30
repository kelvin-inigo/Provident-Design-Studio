#!/bin/sh
# Set up background removal for the Organic Studio. Run it ONCE; after that the
# service runs by itself. It is registered as a login item, so it starts when you
# log in and macOS restarts it if it ever stops. Nothing has to be left open.
#
# Idempotent: run it again any time (after a change to cutout_server.py, or if the
# studio ever says background removal is off). Nothing needs admin rights. It writes:
#
#   ~/Library/Application Support/Provident/cutout    the service and its Python
#   ~/.rembg                                          the model weights (~1.1GB, once)
#   ~/Library/LaunchAgents/ae.provident.cutout.plist  the login item
#   ~/Library/Logs/Provident/cutout.log               its log
#   ~/.local/bin/uv                                   uv, if it is not here already
#
# and uninstall.sh removes all of it.
set -eu
cd "$(dirname "$0")"
. ./env.sh

SRC=src/rembg-main
PYV=3.13
VENV="$APP/venv"
PY="$VENV/bin/python"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
xml() { printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

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

# 2. A private interpreter + the library, in Application Support.
mkdir -p "$APP"
if [ ! -x "$PY" ]; then
  say "Creating a private Python $PYV"
  "$UV" venv --python "$PYV" "$VENV"
fi

say "Installing rembg and onnxruntime (~390MB; seconds if uv has them cached)"
# rembg's pyproject derives its version from git tags via poetry-dynamic-versioning.
# There are none here — and worse, it would find THIS repo's tags — so bypass it.
POETRY_DYNAMIC_VERSIONING_BYPASS=0.0.0 \
  "$UV" pip install --python "$PY" "./$SRC[cpu]"

# 3. Weights. Downloaded once into ~/.rembg (the library's own location, so it is
#    shared with any other rembg on this machine and survives moving this folder).
say "Checking the models (~1.1GB, downloaded once)"
"$PY" - <<'PYCODE'
from rembg.sessions.bria_rmbg import BriaRmBgSession
from rembg.matting import _ViTMatteFiles, DEFAULT_VARIANT
print("segmenter:", BriaRmBgSession.download_models())
print("refiner:  ", _ViTMatteFiles.download_models(variant=DEFAULT_VARIANT))
PYCODE

# 4. The server itself. A COPY, because the login item cannot read this folder;
#    running install.sh again is how a change to cutout_server.py reaches it.
cp cutout_server.py "$APP/cutout_server.py"

# An install from before 29 September 2026 kept its Python in tools/rembg/.venv.
# Nothing uses it now.
if [ -d .venv ]; then
  rm -rf .venv
  echo "Removed the old tools/rembg/.venv (the service's Python is in Application Support now)."
fi

if [ "$(uname)" != Darwin ]; then
  say "Done. This is not a Mac, so there is no login item: run ./tools/rembg/serve.sh while you work."
  exit 0
fi

# 5. The login item. RunAtLoad starts it now and at every login; KeepAlive restarts
#    it whenever it exits — which it does on purpose, 10 minutes after the last
#    cut-out, to hand its memory back (see cutout_server.py). Interactive, because a
#    person is waiting on every request it serves. On an idle Mac the class made no
#    measurable difference (12.1/13.2/10.9s against 12.3/11.5/10.7s at the default);
#    it is for a busy one, where the default class is the one macOS throttles.
say "Registering the login item"
mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(xml "$PY")</string>
    <string>-u</string>
    <string>$(xml "$APP/cutout_server.py")</string>
    <string>--launchd</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml "$APP")</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$(xml "$LOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$LOG")</string>
</dict>
</plist>
PLISTEOF
plutil -lint -s "$PLIST"

DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
# bootout returns before the job is fully gone, and a bootstrap straight after it
# can fail with "Input/output error" — so retry for a few seconds.
n=0
until launchctl bootstrap "$DOMAIN" "$PLIST" 2>/dev/null; do
  n=$((n + 1)); [ $n -lt 10 ] || { echo "Could not start the login item — see: launchctl print $DOMAIN/$LABEL" >&2; exit 1; }
  sleep 1
done

# A hand-started serve.sh would be holding the port; the login item waits for it.
HELD=$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
JOB=$(launchctl print "$DOMAIN/$LABEL" 2>/dev/null | awk '/^\tpid = /{print $3; exit}')
if [ -n "$HELD" ] && [ "$HELD" != "$JOB" ]; then
  echo "Port $PORT is held by process $HELD (serve.sh in a terminal?). Stop it with ctrl-c there;"
  echo "the login item is waiting and takes over by itself."
fi

i=0
while [ $i -lt 20 ]; do
  if curl -fsS -m 2 "http://127.0.0.1:$PORT/health" 2>/dev/null | grep -q '"ok": true'; then
    say "Done. Background removal now runs by itself — at every login, with nothing to start."
    echo "The studio picks it up within 15 seconds; no reload needed."
    echo "It loads the model on the first photo (a few seconds more that once) and"
    echo "lets the memory go 10 minutes after the last one."
    echo "Log: $LOG"
    exit 0
  fi
  i=$((i + 1)); sleep 1
done
echo "The login item is registered but not answering yet. Its log: $LOG" >&2
exit 1
