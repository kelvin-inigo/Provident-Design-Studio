#!/bin/sh
# Remove everything install.sh created. The tracked files stay.
set -eu
cd "$(dirname "$0")"
. ./env.sh
if [ "$(uname)" = Darwin ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null && echo "Stopped the login item." || true
  rm -f "$PLIST"
fi
rm -rf "$APP"
rmdir "$(dirname "$APP")" 2>/dev/null || true
rm -rf .venv                      # where an install from before 29 September 2026 put it
rm -f "$LOG"
rmdir "$(dirname "$LOG")" 2>/dev/null || true
printf 'Removed the service, its Python and its log.\n'
printf 'Model weights (~1.1GB) are in ~/.rembg — delete that too? [y/N] '
read -r a
case "$a" in [yY]*) rm -rf "$HOME/.rembg"; echo "Removed ~/.rembg." ;; *) echo "Kept ~/.rembg." ;; esac
printf 'uv itself is at ~/.local/bin/uv and was left alone.\n'
