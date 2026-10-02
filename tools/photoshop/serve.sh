#!/bin/sh
# Run the Photoshop helper in this terminal (instead of the login item). ctrl-c stops it.
set -eu
cd "$(dirname "$0")"
. ./env.sh
mkdir -p "$APP"
cp ps_server.py "$APP/ps_server.py"
exec /usr/bin/python3 -u "$APP/ps_server.py" --port "$PORT"
