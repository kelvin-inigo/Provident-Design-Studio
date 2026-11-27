#!/bin/bash
# CASV on this Mac (2026-11-26): install on demand, update, open, sign in, uninstall.
#
# The site's "Install CASV" prompt (casv-get.js) copies this line; the designer pastes it in Terminal:
#   curl -fsSL https://raw.githubusercontent.com/kelvin-inigo/Provident-Design-Studio/video-studio/tools/video-dev/casv-local.sh | bash
#
# What it does: Apple's Command Line Tools if missing (Python 3 and Swift), CASV's files from the
# video-studio branch into ~/Provident Video Studio, a login item that keeps the helper on
# localhost:8794, the Higgsfield command line (its own Node in ~/.local/node), and a
# "Provident Video Studio" app in ~/Applications that updates CASV and opens it.
# While it runs it serves its progress on 127.0.0.1:8793 (netcat, no Python needed yet), which
# the site's progress bar reads. Nothing here holds a secret; sign-ins are the designer's own.
#
#   casv-local.sh [install] | update | open | signin | status | uninstall
main() {
  set -u
  REPO="${CASV_REPO:-kelvin-inigo/Provident-Design-Studio}"
  BRANCH="${CASV_BRANCH:-video-studio}"
  DIR="${CASV_DIR:-$HOME/Provident Video Studio}"
  PORT="${CASV_PORT:-8794}"
  FEEDPORT="${CASV_FEEDPORT:-8793}"
  LABEL="${CASV_LABEL:-ae.provident.casv}"
  APPS="${CASV_APPS:-$HOME/Applications}"
  APP="$APPS/Provident Video Studio.app"
  PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
  LOGS="$HOME/Library/Logs/Provident"
  NODE="$HOME/.local/node"
  PAGE="http://localhost:$PORT/Provident%20Video%20Studio.html"
  STAMP="$DIR/.casv-version"
  TMPD="$(mktemp -d "${TMPDIR:-/tmp}/casv.XXXXXX")"
  FEED="$TMPD/feed.json"
  trap 'feed_stop; rm -rf "$TMPD"' EXIT
  case "${1:-install}" in
    install) do_install ;;
    update) do_update && restart_helper; true ;;
    open) do_open ;;
    signin) do_signin ;;
    status) do_status ;;
    uninstall) do_uninstall ;;
    *) echo "usage: casv-local.sh [install|update|open|signin|status|uninstall]"; return 2 ;;
  esac
}

say() { printf '  %s\n' "$*"; }
jstr() { local s="${1//\\/\\\\}"; s="${s//\"/\\\"}"; printf '"%s"' "$s"; }

# ---- progress feed for the site's progress bar -------------------------------------------------
FEEDPID=''
progress() {  # pct, step text [, state: run|done|error]
  printf '{"pct":%s,"text":%s,"state":"%s","at":%s}' "$1" "$(jstr "$2")" "${3:-run}" "$(date +%s)" > "$FEED.tmp" && mv "$FEED.tmp" "$FEED"
  [ "${3:-run}" = run ] && say "$2…"
}
feed_start() {
  lsof -nP -iTCP:"$FEEDPORT" -sTCP:LISTEN >/dev/null 2>&1 && return
  touch "$TMPD/feed.on"
  ( while [ -f "$TMPD/feed.on" ]; do
      b="$(cat "$FEED" 2>/dev/null || echo '{}')"
      printf 'HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Private-Network: true\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nCache-Control: no-store\r\nContent-Type: application/json\r\nContent-Length: %s\r\nConnection: close\r\n\r\n%s' "${#b}" "$b" \
        | nc -l 127.0.0.1 "$FEEDPORT" >/dev/null 2>&1 || sleep 1
    done ) &
  FEEDPID=$!; disown "$FEEDPID" 2>/dev/null
}
feed_stop() {
  [ -n "$FEEDPID" ] || return 0
  sleep 6   # let the page read the last state
  rm -f "$TMPD/feed.on"; curl -s -m 1 "http://127.0.0.1:$FEEDPORT/" >/dev/null 2>&1
  kill "$FEEDPID" 2>/dev/null; FEEDPID=''
}
fail() { progress "${2:-0}" "$1" error; echo; echo "  CASV was not installed: $1" >&2; exit 1; }

# ---- pieces -------------------------------------------------------------------------------------
have_tools() { xcode-select -p >/dev/null 2>&1 && [ -x /usr/bin/swiftc ] && /usr/bin/python3 -c '' >/dev/null 2>&1; }

apple_tools() {
  have_tools && return 0
  progress 8 "Installing Apple's Command Line Tools (click Install in Apple's window)"
  xcode-select --install >/dev/null 2>&1 </dev/null
  local i=0
  until have_tools; do
    sleep 10; i=$((i + 1))
    [ $i -gt 360 ] && fail "Apple's Command Line Tools did not finish within an hour. Install them, then paste the line again." 8
    progress $((8 + (i > 90 ? 30 : i / 3))) "Installing Apple's Command Line Tools (Apple's window shows its own progress)"
  done
}

# Fetch the branch if it moved since the last fetch. Returns 0 when files changed, 1 when not.
fetch_code() {
  local sha src
  if [ -n "${CASV_TARBALL:-}" ]; then sha="local-$(date -r "$CASV_TARBALL" +%s)"; cp "$CASV_TARBALL" "$TMPD/casv.tgz" || return 2
  else
    # the newest commit: git's own protocol first (GitHub's API allows only 60 asks an hour per
    # network, and an office shares one: that limit stopped an install on 2026-11-26)
    sha="$(git ls-remote "https://github.com/$REPO.git" "refs/heads/$BRANCH" 2>/dev/null | cut -f1)"
    [ -n "$sha" ] || sha="$(curl -fsSL -m 20 -H 'Accept: application/vnd.github.sha' "https://api.github.com/repos/$REPO/commits/$BRANCH" 2>/dev/null)"
    [ -n "$sha" ] || { WHY="GitHub did not say which version is newest."; return 2; }
    [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$sha" ] && [ -f "$DIR/tools/video-dev/serve.py" ] && return 1
    curl -fsSL -m 600 "https://codeload.github.com/$REPO/tar.gz/$sha" -o "$TMPD/casv.tgz" || { WHY="The download from GitHub broke off."; return 2; }
  fi
  mkdir -p "$TMPD/src" && tar -xzf "$TMPD/casv.tgz" -C "$TMPD/src" || { WHY="The download could not be unpacked."; return 2; }
  src="$(find "$TMPD/src" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [ -f "$src/Provident Video Studio.html" ] && [ -f "$src/tools/video-dev/serve.py" ] || { WHY="The download is missing CASV's files."; return 2; }
  mkdir -p "$DIR"
  # a changed converter is rebuilt on its next use
  cmp -s "$src/tools/video-dev/casv-convert.swift" "$DIR/tools/video-dev/casv-convert.swift" 2>/dev/null || rm -f "$DIR/_work/bin/casv-convert"
  # the designer's own work (_work, _animate, _outbox, _inbox) is never touched
  rsync -a --delete --exclude '/_work/' --exclude '/_animate/' --exclude '/_outbox/' --exclude '/_inbox/' --exclude '/.casv-version' "$src/" "$DIR/" || { WHY="CASV's files could not be copied into $DIR."; return 2; }
  printf '%s' "$sha" > "$STAMP"
  return 0
}

higgsfield_cli() {
  command -v higgsfield >/dev/null 2>&1 && return 0
  [ -x "$NODE/bin/higgsfield" ] && return 0
  local node="$NODE/bin/node"
  if [ ! -x "$node" ]; then
    progress 72 "Getting Node for the Higgsfield tools"
    local arch base file sums
    arch="$( [ "$(uname -m)" = arm64 ] && echo arm64 || echo x64 )"
    base="https://nodejs.org/dist/latest-v22.x"
    sums="$(curl -fsSL -m 30 "$base/SHASUMS256.txt")" || return 1
    file="$(printf '%s\n' "$sums" | awk -v a="darwin-$arch.tar.gz" '$2 ~ a"$" {print $2; exit}')"
    [ -n "$file" ] || return 1
    curl -fsSL -m 600 "$base/$file" -o "$TMPD/node.tgz" || return 1
    [ "$(shasum -a 256 "$TMPD/node.tgz" | awk '{print $1}')" = "$(printf '%s\n' "$sums" | awk -v f="$file" '$2==f {print $1}')" ] || return 1
    mkdir -p "$NODE" && tar -xzf "$TMPD/node.tgz" -C "$NODE" --strip-components 1 || return 1
  fi
  progress 84 "Installing the Higgsfield command line"
  PATH="$NODE/bin:$PATH" "$NODE/bin/npm" install -g @higgsfield/cli >/dev/null 2>&1 </dev/null
}

write_agent() {
  mkdir -p "$LOGS" "$(dirname "$PLIST")"
  local d="${DIR//&/&amp;}"; d="${d//</&lt;}"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-u</string>
    <string>$d/tools/video-dev/serve.py</string>
    <string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$d</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$NODE/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$LOGS/casv.log</string>
  <key>StandardErrorPath</key><string>$LOGS/casv.log</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
}
restart_helper() { launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || { [ -f "$PLIST" ] && launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1; }; }
helper_up() { curl -s -o /dev/null -m 2 "http://127.0.0.1:$PORT/Provident%20Video%20Studio.html"; }
wait_helper() { local i; for i in $(seq 1 "${1:-30}"); do helper_up && return 0; sleep 1; done; return 1; }

write_app() {
  mkdir -p "$APPS"; rm -rf "$APP"
  local s="$DIR/tools/video-dev/casv-local.sh"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"
  osacompile -o "$APP" -e "do shell script \"/bin/bash \" & quoted form of \"$s\" & \" open > /dev/null 2>&1 &\"" >/dev/null 2>&1
  app_icon
}
# The launcher wears CASV's icon (the same "p" and play mark as the Chrome app), set again when an
# update brings a new one.
app_icon() {
  local src="$DIR/tools/video-dev/casv.icns" dst="$APP/Contents/Resources/applet.icns"
  [ -f "$src" ] && [ -d "$APP" ] || return 0
  cmp -s "$src" "$dst" || { cp "$src" "$dst" && touch "$APP"; }
}

# CASV is a Chrome web app (2026-11-27, casv-manifest.json). Open the installed app's window when
# there is one (Chrome's shim in "Chrome Apps.localized" names CASV's address); else the page in
# Chrome, whose File menu offers "Install CASV as an app"; a Mac without Chrome gets its browser.
chrome_app() {
  local a u
  for a in "$HOME/Applications/Chrome Apps.localized/"*.app "/Applications/Chrome Apps.localized/"*.app; do
    [ -f "$a/Contents/Info.plist" ] || continue
    u="$(/usr/libexec/PlistBuddy -c 'Print :CrAppModeShortcutURL' "$a/Contents/Info.plist" 2>/dev/null)"
    case "$u" in "http://localhost:$PORT/"*|"http://127.0.0.1:$PORT/"*) printf '%s' "$a"; return 0 ;; esac
  done
  return 1
}
open_page() {
  local a
  if a="$(chrome_app)"; then open "$a"
  elif [ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ]; then open -a "Google Chrome" "$PAGE"
  else open "$PAGE"; fi
}

# ---- commands -----------------------------------------------------------------------------------
do_install() {
  [ "$(uname)" = Darwin ] || { echo "CASV runs on a Mac only."; exit 1; }
  echo; echo "  Installing CASV, the Provident Video Studio"; echo
  : > "$FEED"; feed_start
  progress 3 "Starting"
  if helper_up && [ ! -f "$PLIST" ]; then
    fail "Something already answers on localhost:$PORT on this Mac (a copy of CASV started by hand?). Close it, then paste the line again." 3
  fi
  apple_tools
  progress 42 "Downloading CASV"
  WHY=''; fetch_code; case $? in 2) fail "CASV could not be downloaded: ${WHY:-no answer from GitHub.} Check the internet connection and paste the line again." 42 ;; esac
  progress 62 "Starting CASV's helper (it starts by itself at login from now on)"
  write_agent
  wait_helper 40 || fail "CASV's helper did not start. Its log is in ~/Library/Logs/Provident/casv.log." 62
  progress 70 "Checking the Higgsfield tools"
  higgsfield_cli || say "The Higgsfield tools could not be installed now; CASV works, generating video waits for them."
  progress 96 "Adding Provident Video Studio to Applications"
  write_app
  progress 100 "CASV is installed" done
  echo; say "Done. CASV runs at $PAGE"
  say "Open it any time from Applications › Provident Video Studio (it updates itself first)."
  say "In Chrome, the file menu (the video's name, top left) › Install CASV as an app gives it its own window."
  say "To generate video and write prompts, sign in once:"
  say "  bash \"$DIR/tools/video-dev/casv-local.sh\" signin"
  echo
  [ -n "${CASV_NO_OPEN:-}" ] || open_page
}

do_update() {
  WHY=''; fetch_code; local r=$?
  [ $r = 0 ] && say "CASV updated to $(cut -c1-7 < "$STAMP")."
  [ $r = 1 ] && say "CASV is up to date."
  [ $r = 2 ] && say "Could not check for an update: ${WHY:-offline?}"
  return $r
}

do_open() {
  do_update >/dev/null 2>&1 && restart_helper
  helper_up || restart_helper
  app_icon
  if wait_helper 30; then open_page
  else osascript -e 'display alert "CASV could not start" message "Its log is in ~/Library/Logs/Provident/casv.log."' >/dev/null 2>&1; fi
}

do_signin() {
  local hf; hf="$(command -v higgsfield || echo "$NODE/bin/higgsfield")"
  echo "  1. Higgsfield (generates video, voice and music):"
  PATH="$NODE/bin:$PATH" "$hf" auth login </dev/tty
  echo "  2. Claude (writes prompts from photos):"
  /usr/bin/python3 "$DIR/tools/video-dev/serve.py" --claude-login </dev/tty
}

do_status() {
  say "Folder:  $DIR ($( [ -f "$STAMP" ] && cut -c1-7 < "$STAMP" || echo 'not installed'))"
  say "Helper:  $(helper_up && echo "answering on localhost:$PORT" || echo 'not answering')"
  say "Login item: $( [ -f "$PLIST" ] && echo yes || echo no)   App: $( [ -d "$APP" ] && echo yes || echo no)"
}

do_uninstall() {
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1
  rm -f "$PLIST"; rm -rf "$APP"
  say "CASV's login item and app are removed. Its folder, with any unsaved work, stays at:"
  say "  $DIR"
}

main "$@"; exit $?
