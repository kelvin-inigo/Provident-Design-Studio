#!/bin/sh
# Start the background-removal service the Organic Studio talks to.
# Leave it running while you work; ctrl-c stops it. Flags pass straight through
# to cutout_server.py (--model, --refine, --provider, --port).
set -eu
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { echo "Not installed yet — run ./install.sh first." >&2; exit 1; }
exec .venv/bin/python -u cutout_server.py "$@"
