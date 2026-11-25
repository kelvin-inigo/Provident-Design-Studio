#!/bin/sh
# Remove everything install.sh created.
set -eu
cd "$(dirname "$0")"
. ./env.sh
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "Stopped the login item." || true
rm -f "$PLIST"
rm -rf "$APP"
rmdir "$(dirname "$APP")" 2>/dev/null || true
rm -f "$LOG"
rmdir "$(dirname "$LOG")" 2>/dev/null || true
echo "Removed the Generative fill helper."
