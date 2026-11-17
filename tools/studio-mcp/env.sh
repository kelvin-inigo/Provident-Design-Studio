# Where the REMOTE studio tools (remote.py — for the Grok bot, or any MCP client off this Mac)
# live on this Mac. Sourced by install-remote.sh and the tunnel scripts so they cannot disagree.
# The stdio server for Claude Desktop (install.sh) does not use this file.
#
# NOT inside this repository, for the reason tools/rembg/env.sh gives: macOS refuses a login item
# read access to ~/Documents. So install-remote.sh copies the repository (15 MB) into Application
# Support and the service serves the studios from that copy; run it again after a `git pull`.
APP="$HOME/Library/Application Support/Provident/studio-remote"
LABEL=ae.provident.studio-remote
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/Provident/studio-remote.log"
TLABEL=ae.provident.studio-tunnel
TPLIST="$HOME/Library/LaunchAgents/$TLABEL.plist"
TLOG="$HOME/Library/Logs/Provident/studio-tunnel.log"
PORT=7313
