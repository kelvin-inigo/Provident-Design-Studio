#!/bin/bash
# One-time switch of the office server to its own share store (2026-11-25). Run ON the server:
#     bash ~/Provident-Design-Studio/tools/office-server/install.sh
# 1. installs pds-studio and pds-sync from the repo into ~/pds-deploy (from now on pds-sync keeps
#    them current and restarts the server whenever api/ or tools/office-server/ change on main)
# 2. copies the Vercel share store into ~/pds-data when .env has the Upstash address and token
#    (photos as files under ~/pds-data/images/, everything else in ~/pds-data/store.db)
# 3. restarts the server and checks /api/share answers
set -e
R=$HOME/Provident-Design-Studio
D=$HOME/pds-deploy
export PDS_DATA="${PDS_DATA:-$HOME/pds-data}"
mkdir -p "$D/logs" "$PDS_DATA"
chmod 700 "$PDS_DATA"
for f in pds-studio pds-sync; do
  cp "$R/tools/office-server/$f" "$D/$f.new" && chmod +x "$D/$f.new" && mv -f "$D/$f.new" "$D/$f"
done
echo "installed: $D/pds-studio, $D/pds-sync"
for f in "$R/.env" "$R/.env.vercel"; do
  # KEY=value lines only; an empty value is skipped so it never hides a default
  [ -f "$f" ] && while IFS='=' read -r k v; do
    case "$k" in ''|\#*) continue;; esac
    [ -n "$v" ] && export "$k=$v"
  done < "$f"
done
if [ -n "${KV_REST_API_URL:-$UPSTASH_REDIS_REST_URL}" ]; then
  python3 "$R/tools/office-server/pull-vercel.py" "$PDS_DATA"
else
  echo "No KV_REST_API_URL / KV_REST_API_TOKEN in $R/.env — the Vercel store was NOT copied."
  echo "Add them (Vercel › Settings › Environment Variables) and run:  python3 $R/tools/office-server/pull-vercel.py $PDS_DATA"
fi
missing=""
for k in GOOGLE_CLIENT_SECRET ACCESS_ADMIN SHARE_ADMIN_KEY; do [ -z "${!k}" ] && missing="$missing $k"; done
[ -n "$missing" ] && echo "Not in .env (copy from Vercel for sign-in, roles and share-admin to work here):$missing"
"$D/pds-studio" restart-server
