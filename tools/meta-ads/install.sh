#!/usr/bin/env bash
# One-time setup for tools/meta-ads on this Mac. Safe to run again.
#  1. installs Meta's official Ads CLI (`meta`, PyPI `meta-ads`, Python 3.12) with uv
#  2. creates kit/.env and kit/ad-config.json from their examples if they are missing
#  3. runs the kit's own doctor
# It never asks for or stores a token: put ACCESS_TOKEN / AD_ACCOUNT_ID in kit/.env yourself.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT="$HERE/kit"
if ! command -v jq >/dev/null 2>&1; then echo "jq is required (macOS ships it at /usr/bin/jq)." >&2; exit 1; fi
if command -v meta >/dev/null 2>&1; then
  echo "meta CLI: $(meta --version)"
elif command -v uv >/dev/null 2>&1; then
  uv tool install --python 3.12 meta-ads
else
  echo "Needs uv (https://docs.astral.sh/uv/) or: python3.12 -m pip install meta-ads" >&2; exit 1
fi
[[ -f "$KIT/.env" ]] || { cp "$KIT/.env.example" "$KIT/.env"; chmod 600 "$KIT/.env"; echo "created kit/.env (mock mode — add your token to go live)"; }
[[ -f "$KIT/ad-config.json" ]] || cp "$KIT/ad-config.example.json" "$KIT/ad-config.json"
grep -q '^META_PAGE_ID=' "$KIT/.env" || printf '\n# CAS bridge (cas-to-meta.py): the Page the ads run as, and the ad set they go into\nMETA_PAGE_ID=\nMETA_ADSET_ID=\n' >> "$KIT/.env"
chmod +x "$KIT/run.sh" "$KIT/scripts/meta-kit.sh" "$HERE/cas-to-meta.py"
"$KIT/scripts/meta-kit.sh" doctor
