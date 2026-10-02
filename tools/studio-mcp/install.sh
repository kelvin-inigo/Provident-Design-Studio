#!/bin/sh
# Registers the Provident Studio MCP server with the Claude desktop app, so Cowork (and chat)
# can use CAS and OPS as tools. Run once per Mac, then quit and reopen Claude.
#   sh tools/studio-mcp/install.sh            add or update the entry
#   sh tools/studio-mcp/install.sh --remove   take it out again
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
CFG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
mkdir -p "$(dirname "$CFG")"
[ -f "$CFG" ] && cp "$CFG" "$CFG.bak-provident-studio"
/usr/bin/python3 - "$CFG" "$HERE/server.py" "${1:-}" <<'EOF'
import json, os, sys
cfg, server, mode = sys.argv[1], sys.argv[2], sys.argv[3]
d = {}
if os.path.exists(cfg):
    with open(cfg) as f:
        d = json.load(f)
servers = d.setdefault("mcpServers", {})
if mode == "--remove":
    servers.pop("provident-studio", None)
    print("Removed provident-studio.")
else:
    servers["provident-studio"] = {"command": "/usr/bin/python3", "args": [server]}
    print("Registered provident-studio ->", server)
with open(cfg + ".tmp", "w") as f:
    json.dump(d, f, indent=2)
os.replace(cfg + ".tmp", cfg)
EOF
echo "Quit Claude (Cmd-Q) and open it again to load it."
