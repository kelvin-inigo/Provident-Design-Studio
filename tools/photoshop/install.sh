#!/bin/sh
# Set up Edit in Photoshop for CAS and OPS. Run it ONCE; after that the helper runs by
# itself as a login item. Needs no admin rights and nothing beyond macOS's own python3.
# Idempotent — run it again after a change to ps_server.py. uninstall.sh removes it all.
#
#   ~/Library/Application Support/Provident/photoshop        the helper
#   ~/Library/Application Support/Provident/photoshop/Edits  the files Photoshop edits
#   ~/Library/LaunchAgents/ae.provident.photoshop.plist      the login item
#   ~/Library/Logs/Provident/photoshop.log                   its log
set -eu
cd "$(dirname "$0")"
. ./env.sh
[ "$(uname)" = Darwin ] || { echo "Photoshop editing is Mac-only (it uses open -a and sips)." >&2; exit 1; }
xml() { printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

mkdir -p "$APP/Edits" "$(dirname "$PLIST")" "$(dirname "$LOG")"
cp ps_server.py "$APP/ps_server.py"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-u</string>
    <string>$(xml "$APP/ps_server.py")</string>
    <string>--port</string><string>$PORT</string>
    <string>--launchd</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml "$APP")</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$(xml "$LOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$LOG")</string>
</dict>
</plist>
PLISTEOF
plutil -lint -s "$PLIST"
DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
n=0
until launchctl bootstrap "$DOMAIN" "$PLIST" 2>/dev/null; do
  n=$((n + 1)); [ $n -lt 10 ] || { echo "Could not start the login item — see: launchctl print $DOMAIN/$LABEL" >&2; exit 1; }
  sleep 1
done
i=0
while [ $i -lt 15 ]; do
  if H=$(curl -fsS -m 2 "http://127.0.0.1:$PORT/health" 2>/dev/null); then
    echo "Done. $H"
    echo "The studios pick it up within 15 seconds; no reload needed. Log: $LOG"
    exit 0
  fi
  i=$((i + 1)); sleep 1
done
echo "The login item is registered but not answering yet. Its log: $LOG" >&2
exit 1
