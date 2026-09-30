# Where the background-removal service lives on this Mac. Sourced by install.sh,
# serve.sh and uninstall.sh, so the three can never disagree about a path.
#
# NOT inside this repository: the service runs as a login item, and macOS refuses a
# login item read access to ~/Documents ("Operation not permitted"). Application
# Support is the place a per-user program's files belong, and it is not protected.
APP="$HOME/Library/Application Support/Provident/cutout"
LABEL=ae.provident.cutout
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/Provident/cutout.log"
PORT=7311
