#!/bin/sh
# Remove everything install.sh created. The tracked files stay.
set -eu
cd "$(dirname "$0")"
rm -rf .venv
printf 'Removed the virtualenv.\n'
printf 'Model weights (~1.1GB) are in ~/.rembg — delete that too? [y/N] '
read -r a
case "$a" in [yY]*) rm -rf "$HOME/.rembg"; echo "Removed ~/.rembg." ;; *) echo "Kept ~/.rembg." ;; esac
printf 'uv itself is at ~/.local/bin/uv and was left alone.\n'
