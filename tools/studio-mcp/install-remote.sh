#!/bin/sh
# The studio tools for a client OFF this Mac — the Grok bot, or any remote MCP client — as a
# login item on this Mac, with a tunnel in front of it. Run it once per Mac; run it again after a
# `git pull` (it serves the studios from a copy of this folder). Nothing needs admin rights.
#
#   sh tools/studio-mcp/install-remote.sh                       install or update the service
#   sh tools/studio-mcp/install-remote.sh --token "Rizi"        a token for one person — printed ONCE
#   sh tools/studio-mcp/install-remote.sh --revoke "Rizi"       take that person's token back
#   sh tools/studio-mcp/install-remote.sh --tunnel ngrok studio.ngrok-free.dev
#   sh tools/studio-mcp/install-remote.sh --tunnel cloudflared studio.example.com [tunnel name]
#   sh tools/studio-mcp/install-remote.sh --remove              stop both login items (tokens and projects stay)
#
# It writes, all outside the repository:
#   ~/Library/Application Support/Provident/studio-remote/repo        the copy of this folder the service runs
#   …/studio-remote/projects                                          the bot's projects and exports
#   …/studio-remote/tokens.json, secret, public-url                   this Mac's secrets — never commit them
#   ~/Library/LaunchAgents/ae.provident.studio-remote.plist           the service (port 7313)
#   ~/Library/LaunchAgents/ae.provident.studio-tunnel.plist           the tunnel, once one is set up
#   ~/Library/Logs/Provident/studio-remote.log, studio-tunnel.log
set -eu
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")"
. ./env.sh
REPO="$(cd ../.. && pwd)"
PY=/usr/bin/python3
DOMAIN="gui/$(id -u)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
usage() { sed -n '2,12p' "$SELF"; }
xml() { printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }
public_url() { [ -f "$APP/public-url" ] && cat "$APP/public-url" || true; }

# tokens.json: { "<token>": {"name": "...", "made": "YYYY-MM-DD"} }
token_add() {
  mkdir -p "$APP"
  "$PY" - "$APP/tokens.json" "$1" "$(public_url)" <<'PYCODE'
import json, os, secrets, sys, time
path, name, pub = sys.argv[1], sys.argv[2].strip(), sys.argv[3].strip()
d = {}
if os.path.exists(path):
    with open(path) as f:
        d = json.load(f)
tok = secrets.token_urlsafe(24)
d[tok] = {"name": name, "made": time.strftime("%Y-%m-%d")}
fd = os.open(path + ".tmp", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
os.write(fd, json.dumps(d, indent=1).encode()); os.close(fd)
os.replace(path + ".tmp", path)
print()
print("Token for %s — shown once, keep it where passwords go:" % name)
print("  " + tok)
print()
print("Connector address (for a form that takes only a URL):")
print("  %s/t/%s/mcp" % (pub or "https://<your tunnel host>", tok))
print("Or the address %s/mcp with the header  Authorization: Bearer %s" % (pub or "https://<your tunnel host>", tok))
PYCODE
}
token_revoke() {
  "$PY" - "$APP/tokens.json" "$1" <<'PYCODE'
import json, os, sys
path, name = sys.argv[1], sys.argv[2].strip().lower()
d = json.load(open(path)) if os.path.exists(path) else {}
keep = {k: v for k, v in d.items() if (v.get("name") or "").strip().lower() != name}
print("Removed %d token(s) for %s." % (len(d) - len(keep), sys.argv[2]))
fd = os.open(path + ".tmp", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
os.write(fd, json.dumps(keep, indent=1).encode()); os.close(fd)
os.replace(path + ".tmp", path)
PYCODE
}
bootout() { launchctl bootout "$DOMAIN/$1" 2>/dev/null || true; }
bootstrap() {
  n=0
  until launchctl bootstrap "$DOMAIN" "$1" 2>/dev/null; do
    n=$((n + 1)); [ $n -lt 10 ] || { echo "Could not start $1 — see: launchctl print $DOMAIN/$2" >&2; exit 1; }
    sleep 1
  done
}

MODE="${1:-}"
case "$MODE" in
  --remove)
    bootout "$LABEL"; bootout "$TLABEL"
    rm -f "$PLIST" "$TPLIST"
    echo "Stopped and removed both login items. Tokens and projects stay in $APP; delete that folder to forget them."
    exit 0 ;;
  --token)
    token_add "${2:?a name, e.g. --token Rizi}"
    exit 0 ;;
  --revoke)
    token_revoke "${2:?the name the token was made for}"
    exit 0 ;;
  --tunnel)
    KIND="${2:?ngrok or cloudflared}"; HOST="${3:?the public host name, e.g. studio.ngrok-free.dev}"; TNAME="${4:-provident-studio}"
    HOST="${HOST#https://}"; HOST="${HOST%/}"
    case "$KIND" in
      ngrok)
        BIN="$(command -v ngrok || true)"; [ -n "$BIN" ] || for c in /opt/homebrew/bin/ngrok /usr/local/bin/ngrok "$HOME/bin/ngrok"; do [ -x "$c" ] && BIN="$c" && break; done
        [ -n "$BIN" ] || { echo "ngrok is not installed. Download it from https://ngrok.com/download (or: brew install ngrok), then run: ngrok config add-authtoken <your authtoken>" >&2; exit 1; }
        "$BIN" config check >/dev/null 2>&1 || { echo "ngrok has no authtoken yet. Run: ngrok config add-authtoken <your authtoken>  (from dashboard.ngrok.com)" >&2; exit 1; }
        ARGS="<string>$(xml "$BIN")</string><string>http</string><string>--url=https://$(xml "$HOST")</string><string>--log=stdout</string><string>127.0.0.1:$PORT</string>" ;;
      cloudflared)
        BIN="$(command -v cloudflared || true)"; [ -n "$BIN" ] || for c in /opt/homebrew/bin/cloudflared /usr/local/bin/cloudflared; do [ -x "$c" ] && BIN="$c" && break; done
        [ -n "$BIN" ] || { echo "cloudflared is not installed (brew install cloudflared). Then: cloudflared tunnel login · cloudflared tunnel create $TNAME · cloudflared tunnel route dns $TNAME $HOST" >&2; exit 1; }
        "$BIN" tunnel info "$TNAME" >/dev/null 2>&1 || { echo "No tunnel called $TNAME yet. Run: cloudflared tunnel login · cloudflared tunnel create $TNAME · cloudflared tunnel route dns $TNAME $HOST" >&2; exit 1; }
        ARGS="<string>$(xml "$BIN")</string><string>tunnel</string><string>run</string><string>--url</string><string>http://127.0.0.1:$PORT</string><string>$(xml "$TNAME")</string>" ;;
      *) echo "--tunnel takes ngrok or cloudflared" >&2; exit 2 ;;
    esac
    mkdir -p "$APP" "$(dirname "$TPLIST")" "$(dirname "$TLOG")"
    printf 'https://%s' "$HOST" > "$APP/public-url"
    cat > "$TPLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$TLABEL</string>
  <key>ProgramArguments</key><array>$ARGS</array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$(xml "$TLOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$TLOG")</string>
</dict>
</plist>
PLISTEOF
    plutil -lint -s "$TPLIST"
    bootout "$TLABEL"; bootstrap "$TPLIST" "$TLABEL"
    say "Tunnel registered: https://$HOST → 127.0.0.1:$PORT (log: $TLOG)"
    echo "Now (re)installing the service so it knows its public address…" ;;
  "") ;;
  *) usage; exit 2 ;;
esac

# ── the service ──
say "Copying the studios into Application Support (the login item cannot read ~/Documents)"
mkdir -p "$APP/repo" "$APP/projects" "$(dirname "$PLIST")" "$(dirname "$LOG")"
rsync -a --delete \
  --exclude .git --exclude .claude --exclude exports --exclude scratchpad --exclude custom-components \
  --exclude .impeccable --exclude 'tools/rembg/src' --exclude 'tools/rembg/.venv' --exclude 'tools/meta-ads' \
  --exclude '__pycache__' --exclude '.DS_Store' --exclude '.env' --exclude '.env.*' \
  "$REPO/" "$APP/repo/"
echo "repo: $APP/repo ($(du -sk "$APP/repo" | awk '{printf "%.0f", $1/1024}') MB)"

[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || [ -n "${PROVIDENT_CHROME:-}" ] || \
  echo "WARNING: Google Chrome is not in /Applications — the studio needs it to render. Install Chrome, or set PROVIDENT_CHROME." >&2

FIRST=""
if ! "$PY" -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d else 1)' "$APP/tokens.json" 2>/dev/null; then
  FIRST=1
fi

PUB="$(public_url)"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>-u</string>
    <string>$(xml "$APP/repo/tools/studio-mcp/remote.py")</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PROVIDENT_STUDIO_ROOT</key><string>$(xml "$APP/repo")</string>
    <key>PROVIDENT_STUDIO_OUT</key><string>$(xml "$APP/projects")</string>
    <key>PROVIDENT_REMOTE_HOME</key><string>$(xml "$APP")</string>
    <key>PROVIDENT_REMOTE_PORT</key><string>$PORT</string>
    <key>PROVIDENT_REMOTE_PUBLIC_URL</key><string>$(xml "$PUB")</string>
    <key>PATH</key><string>/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin</string>
  </dict>
  <key>WorkingDirectory</key><string>$(xml "$APP")</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>5</integer>
  <key>StandardOutPath</key><string>$(xml "$LOG")</string>
  <key>StandardErrorPath</key><string>$(xml "$LOG")</string>
</dict>
</plist>
PLISTEOF
plutil -lint -s "$PLIST"

say "Registering the login item"
bootout "$LABEL"; bootstrap "$PLIST" "$LABEL"

i=0
while [ $i -lt 20 ]; do
  if curl -fsS -m 2 "http://127.0.0.1:$PORT/health" 2>/dev/null | grep -q '"ok": true'; then
    say "Done. The studio tools answer on http://127.0.0.1:$PORT — at every login, with nothing to start."
    echo "Projects and exports: $APP/projects"
    echo "Log:                  $LOG"
    if [ -n "$PUB" ]; then echo "Public address:       $PUB  (connector URL: $PUB/mcp, or $PUB/t/<token>/mcp)"; else
      echo "No tunnel yet: run  sh tools/studio-mcp/install-remote.sh --tunnel ngrok <host>  (or cloudflared) to put it on the internet."; fi
    if [ -n "$FIRST" ]; then
      say "No tokens yet — making the first one for you"
      token_add "$(id -F 2>/dev/null || echo "$USER")"
    else
      echo "Tokens: $("$PY" -c 'import json,sys; print(", ".join(sorted(v.get("name","?") for v in json.load(open(sys.argv[1])).values())))' "$APP/tokens.json")  — add one per person with --token \"Name\""
    fi
    exit 0
  fi
  i=$((i + 1)); sleep 1
done
echo "The login item is registered but not answering yet. Its log: $LOG" >&2
tail -n 20 "$LOG" 2>/dev/null || true
exit 1
