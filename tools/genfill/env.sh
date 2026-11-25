# Where the Generative fill helper lives on this Mac. Sourced by install.sh and uninstall.sh
# so the two cannot disagree about a path.
#
# NOT inside this repository, for the reason tools/rembg/env.sh gives: macOS refuses a login
# item read access to ~/Documents. serve.py reads nothing from the repo, so a copy runs as is.
APP="$HOME/Library/Application Support/Provident/genfill"
LABEL=ae.provident.genfill
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/Provident/genfill.log"
PORT=7315
# a login item starts with /usr/bin:/bin only: the Higgsfield tool is a Node script
# (#!/usr/bin/env node), and claude may sit in ~/.local/bin
HELPER_PATH="$HOME/.local/node/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
