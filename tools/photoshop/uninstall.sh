#!/bin/sh
# Remove everything install.sh created, including any files left in Edits/.
set -eu
cd "$(dirname "$0")"
. ./env.sh
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "Stopped the login item." || true
rm -f "$PLIST"
rm -rf "$APP"
rmdir "$(dirname "$APP")" 2>/dev/null || true
rm -f "$LOG"
rmdir "$(dirname "$LOG")" 2>/dev/null || true
echo "Removed the Photoshop helper."
