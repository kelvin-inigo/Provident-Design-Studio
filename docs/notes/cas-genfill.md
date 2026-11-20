# CAS Generative fill (Firefly) — on `main` since 2026-11-20 (staged on `cas-genfill` first)

By request: "a generative layer in CAS … snap edge to edge … let the user choose a focal point … a
modal editor with Firefly controls, in PDS UI and UX. Stage this concept and let's test it first."
Tested on the branch, then merged to `main` the same day by request ("I need it on the main vercel
live app"), with architecture PDF Revision 1.25, `engine-map.json` (parts `genfill`, `adobe`; check
`genfill` under Check this Mac), `CAS-OPS-GUIDE.md` §12 and `GROK-BOT-INSTRUCTIONS.md`. On the live
site the button only works on a computer running the helper.

## What it is

- **Generate** button in the Photo row (after Reframe) → `genOpen(vi)` → `ProvidentGenfill.open` (`genfill.js`).
- The modal puts the variant's main photo in a size's frame (1:1, 3:4, 9:16, 1.91:1, 2:1, from
  `CampaignStudio.PXT`). Opens on the first of 9:16 › 1.91:1 › 3:4 › 2:1 › 1:1 whose shape differs
  from the photo's.
- **Snap**: `scale` 1 = contain, so the photo spans the fitting axis edge to edge (square in 9:16 →
  full width, bands top/bottom; square in 1.91:1 → full height, bands left/right). Photo size 50–100%
  shrinks it so every side is generated.
- **Focus**: the crosshair (fx, fy of the photo) sits at an anchor (ax, ay of the frame). Dragging
  the crosshair moves the focus; dragging the photo moves the anchor; both clamp so the photo stays
  inside the frame. Arrow keys move the crosshair. "Show copy margins" draws the size's `pad`.
- Bands preview as a blurred stretch labelled "Firefly fills this" until a result arrives.
- Variations 1–3 (one Firefly generation each). Result is size-checked, the original photo is pasted
  back over the middle, stored as JPEG ≤ 3840 long side.
- **Use on <size>**: 1:1 writes `adstudio-bg-<vi>`; any other size writes `adstudio-bg-<vi>-<size>`
  and sets `bgSep[size]` (same as "Edit separately"), so the main photo and other sizes are untouched.
  A photo store write: Undo does not take it back; re-linking the size returns the shared photo.

## Transport

`tools/genfill/serve.py`, stdlib only, `127.0.0.1:7315` (7311 cut-out, 7312 Photoshop, 7313 is the
Grok bot's remote bridge). Override: `localStorage['provident-genfill-url']`. It runs
`claude -p --allowedTools mcp__claude_ai_Adobe "Bash(curl:*)"` in a temp job folder: upload to
Creative Cloud (initialize → curl PUT → finalize), `image_generative_expand` with the exact
`expandPixels`, poll, curl the PNGs back. No Adobe keys anywhere; it uses the Adobe connector on the
user's Claude account. Steps are read off `stream-json` tool calls for the modal's status line.
Capability, never a requirement: helper off → Generate disabled with the start command.

Limits: Generative Expand takes ≤ 4096 px per side; the frame is capped there (upload reduced).

## Verified (2026-11-20, worktree served on :8796, fresh project)

- Helper alone: 1024² → 1024×1820 in 47s, seamless sky and boulevard.
- In CAS: opened on 9:16, 398/398; a real drag of the photo → 607 top / 189 bottom; Generate → status
  Connecting › Uploading › Firefly is generating › Downloading › Done in 53s; Use on 9:16 →
  `adstudio-bg-0` still 1024², `adstudio-bg-0-st` 1024×1820, Story canvas paints it full bleed,
  rail shows "9:16 own photo". 2:1 snapped full height with bands left/right.
- Helper-off message and disabled Generate; no console errors; both themes looked right (no WCAG
  measurement pass yet).
- No paint path touched: the CAS diff is the script tag, one button, one renderVals key, `genOpen`.

## Open questions for the user

- Prompt field: the MCP's Generative Expand takes no prompt. Firefly Services' API does (needs an
  Adobe Developer client id/secret).
- Speed: ~50s is mostly Claude orchestrating; `GENFILL_MODEL=haiku` may cut it.
- "Generate all sizes" in one go, and whether 1:1 should ever replace the main photo.
