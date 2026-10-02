# Provident Studio MCP server

CAS (Campaign Ads Studio) and OPS (Organic Post Studio) as tools for Claude in **Cowork** —
or any MCP client. Claude can start a project from a template, fill in the words, drop in
photos, look at the result and export the final files, without anyone clicking through the
studio.

## Install (once per Mac)

```bash
sh "tools/studio-mcp/install.sh"
```

Then quit Claude (⌘Q) and reopen it. The server shows up as **provident-studio** in Claude's
connectors. Remove it with `install.sh --remove`. Needs Google Chrome; nothing else — it is
standard-library Python 3.9, the `/usr/bin/python3` every Mac has.

Background removal for agent photos uses the existing local service (`tools/rembg/install.sh`).
Without it, photos are stored as they are and the tool says so.

## The tools

| tool | does |
|---|---|
| `studio_catalog` | templates, the fields each slide asks for (required, options, formats), CAS component types and styles |
| `studio_new_project` | a project from a template, saved as a session file |
| `studio_read_project` | every field and its value, the image slots, what is still missing |
| `studio_edit` | fill fields, add/remove/move slides, switch carousel layouts; CAS components, styles, sizes, variants, carousel mode |
| `studio_set_image` | an image file into a slot (photo, portrait, QR, logo, icon), cut out automatically where the studio would |
| `studio_preview` | renders returned as images, so Claude can see the post |
| `studio_export` | PNG / JPG / SVG / PDF with the studio's own names and folders |

## How it works

**A project is a session file** — the `.adstudio.json` / `.smpstudio.json` the studio's
**Save** writes and **Open Session** reads. So a project made here opens in the studio for
fine-tuning, and one saved in the studio can be edited and exported here. Projects default to
`~/Documents/Provident Studio/<name>/` (`PROVIDENT_STUDIO_OUT` changes it); exports go beside the
session file.

**The studio does the work.** The server serves this repository on a loopback port and opens the
real `.dc.html` in a private headless Chrome, then calls its engine — `applyProject`, `normState`,
`buildOps`, the renderers, `doExport` — through `page.js`. A render here IS the export; nothing
about the artwork is reimplemented, so a template change in the studio reaches the tools for free.

**It cannot touch your own studio.** Chrome runs on a throwaway profile, so its photo store and
localStorage are its own; the on-disk `.image-slots.state.json` is only ever read.

| file | |
|---|---|
| `server.py` | MCP over stdio (JSON-RPC, one message per line), the tool definitions, session files |
| `chrome.py` | launches headless Chrome and speaks the DevTools protocol (a 60-line WebSocket client) |
| `page.js` | injected into every studio page: reaches the engine and implements each tool's in-page half |
| `install.sh` | adds or removes the entry in `claude_desktop_config.json` (backup beside it) |

## When it breaks

- **"The studio did not finish loading"** — a studio change threw on boot. Open the studio in
  Chrome and read the console.
- **A field name changed** — the tools read `OrganicStudio.FIELDS`, `CampaignStudio.VOPT` and the
  rest live, so they follow; but `page.js` names a handful of engine methods (`applyProject`,
  `exportBlockers`, `modList`, `dropMod`, `csConvert`, `sLabel`, `renderVals().addVariant` …). Renaming
  one of those needs the same rename here.
- Logs go to stderr: in Claude, Settings → Developer → provident-studio → logs.
