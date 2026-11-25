#!/bin/sh
# Set up Generative fill for CAS. Run it ONCE; after that the helper runs by itself as a login
# item, so CAS's Generate works on any PDS address this browser opens (localhost, Vercel, the
# office server's ngrok link). Needs no admin rights. Idempotent — run it again after a change
# to serve.py. uninstall.sh removes it all.
#
#   ~/Library/Application Support/Provident/genfill      the helper
#   ~/Library/LaunchAgents/ae.provident.genfill.plist    the login item
#   ~/Library/Logs/Provident/genfill.log                 its log
#
# The engines still need their own sign-ins on this computer: `higgsfield auth login` (Nano
# Banana) and Claude Code with the Adobe connector (Firefly). /health says which are ready.
set -eu
cd "$(dirname "$0")"
. ./env.sh
[ "$(uname)" = Darwin ] || { echo "The Generative fill login item is Mac-only; elsewhere run: python3 tools/genfill/serve.py" >&2; exit 1; }
xml() { printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

mkdir -p "$APP" "$(dirname "$PLIST")" "$(dirname "$LOG")"
cp serve.py "$APP/serve.py"
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
    <string>$(xml "$APP/serve.py")</string>
    <string>$PORT</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(xml "$HELPER_PATH")</string>
  </dict>
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
  if H=$(curl -fsS -m 3 "http://127.0.0.1:$PORT/health" 2>/dev/null); then
    echo "Done. $H"
    echo "CAS picks it up the next time Generate is opened. Log: $LOG"
    exit 0
  fi
  i=$((i + 1)); sleep 1
done
echo "The login item is registered but not answering yet. Its log: $LOG" >&2
exit 1
