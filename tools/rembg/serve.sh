#!/bin/sh
# Run the background-removal service in THIS terminal, from this folder's own copy
# of cutout_server.py — for trying a change to it. You do not need this to use the
# studio: install.sh makes the service a login item and it runs by itself.
#
# ctrl-c stops it. Flags pass straight through to cutout_server.py (--model,
# --refine, --provider, --port).
set -eu
cd "$(dirname "$0")"
. ./env.sh
PY="$APP/venv/bin/python"
[ -x "$PY" ] || { echo "Not installed yet — run ./install.sh first." >&2; exit 1; }

case " $* " in
  *" --port"*) ;;
  *)
    if curl -fsS -m 2 "http://127.0.0.1:$PORT/health" 2>/dev/null | grep -q provident-cutout; then
      echo "Background removal is already running — install.sh made it a login item, so it starts by itself."
      echo "Its log:  tail -f \"$LOG\""
      echo "To run this folder's copy here instead, stop the login item first:"
      echo "  launchctl bootout gui/$(id -u)/$LABEL"
      echo "and run ./install.sh afterwards to put it back."
      exit 0
    fi ;;
esac
exec "$PY" -u cutout_server.py "$@"
