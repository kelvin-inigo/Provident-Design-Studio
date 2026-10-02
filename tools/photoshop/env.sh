# Where the Photoshop helper lives on this Mac. Sourced by install.sh, serve.sh and
# uninstall.sh so the three cannot disagree about a path.
#
# NOT inside this repository, for the reason tools/rembg/env.sh gives: macOS refuses a
# login item read access to ~/Documents. The edits folder sits beside the helper, in
# Application Support, for the same reason — the helper has to read what Photoshop saves.
APP="$HOME/Library/Application Support/Provident/photoshop"
LABEL=ae.provident.photoshop
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/Provident/photoshop.log"
PORT=7312
