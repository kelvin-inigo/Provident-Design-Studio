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

## Two engines and the redesign (branch `cas-genfill-engines`, 2026-11-20)

By request: "give option to choose from higgsfield or firefly" plus "/impeccable redesign" of the editor.

- **Engine** is the first choice in the rail, as two option cards (a radiogroup):
  - **Nano Banana 2.1** (Google, through Higgsfield) is the default.
  - **Firefly** is the second option.
  - The last pick is remembered per browser (`provident-genfill-engine`).
  - Each card states what it needs when it can't run (sign-in, install). The Nano Banana card always shows Higgsfield's own price ("2 credits each", read from `/quote`, never hard-coded).
- **Nano Banana path:**
  - CAS composes the whole frame at the nearest shape the model makes (`nanoPlan`: 1:1, 3:4, 9:16 exact; 1.91:1 and 2:1 composed at 16:9 with the extra rows split top and bottom), with the bands roughed in from the blurred photo, at 2048 long side.
  - It sends that plus a PNG mask (white = paint, the photo black).
  - The helper uploads both with `higgsfield upload create`, then runs `generate create nano_banana_2_1 --image-references <id> --mask '{"id":<id>,"type":"image"}' --is_inpaint true --aspect_ratio … --resolution 2k --seed …` once per variation, then `wait`, `get` (`result_url`) and a download.
  - CAS crops back to the frame and pastes the original photo over the middle, the same as Firefly.
  - "Describe the surroundings" (optional, 400 characters) is appended to a fixed outpaint prompt. It shows for Nano Banana only, because Generative Expand takes no prompt.
  - The button carries the price ("Generate · 6 credits" for 3 variations).
- **Redesign:**
  - Sentence-case section heads at 14/600 replace the tracked uppercase labels, which DESIGN.md bans in the chrome.
  - The band label is now "Nano Banana fills this" (sentence case, with a spark), no longer a tracked caps pill.
  - The kit's own switch (fill track, resting tint for the chosen tab) replaces CAS's `p-seg`; ghost pills replace `p-ghost`.
  - The selection ring, slider and progress bar take `--ps-link`, not the resting navy (which was under 3:1 against the card).
  - The radio ring uses `--ps-dim` (3:1+).
  - Results sit at the top of the rail with numbered thumbnails.
  - A caption on the stage gives the size and pixels.
  - The summary ("Adds 467 px above · 466 px below") sits over the button.
- **Verified** (worktree on :8796, helper on :7316, both themes, 375 px):
  - Contrast: every text at least 4.5:1 and the radio ring at least 3:1, on the chosen and unchosen cards.
  - The engine choice drives the button, band label, prompt box and variations line.
  - `nanoPlan` is correct for all five sizes.
  - At 375 px nothing scrolls sideways.
- **Merged to main 2026-11-20 by request ("push now"), before a real Nano Banana generation** (2 credits). `generate cost` accepts the mask object without validating its shape, so the first real run is what proves it.

## First real Nano Banana run, and the fix (2026-11-20)

The first real result (an Avenew Dubai Islands story) came back with a **second, sharpened copy of the
lagoon** under the photo and extra towers above it, plus hard lines at both seams. The user's words: "I just
want to retain the original photo, and just extend it".

- **Cause:** the bands were prefilled with a blurred, enlarged copy of the whole photo (the preview's look).
  Nano Banana read that blur as a scene and rendered it sharp. The original was then pasted back with a
  hard edge.
- **Fix:**
  - **Prefill:** the bands are now the photo's two outermost rows and columns stretched to the edges
    (softened), over the photo's average colour (`smear`).
  - **Mask:** it reaches 3% into the photo on each generated side, at least 8 px (`overlap`), so the model
    blends across the edge.
  - **Paste-back:** `finish` fades the original over that strip with a linear alpha ramp. Firefly keeps its
    hard paste, because Generative Expand keeps the pixels.
  - **Prompt:** it now says the white areas are empty canvas, and that nothing in the photo may be
    repeated, mirrored or duplicated.
- **Proven without credits:** a stand-in helper captured the real request (a 1152 × 2048 frame plus its
  mask) and returned the frame. The prefill, mask, overlap and fade all came out as intended. How good the
  extension looks is up to the model, so it is not proven.
- **Fallback if Nano Banana still invents:** Higgsfield's `flux_2_pro_outpaint` takes exact expand pixels
  per side, like Firefly: about 2.6 credits for +400/+400 on a 1200² and 3.5 for +1500/+1500, per the
  connector's estimate. The CLI's `generate cost` for it is broken: it asks for `input_width` and then
  rejects that parameter.

## The helper is a login item (2026-11-25, by request: "fix this", on ngrok and Vercel)
CAS's Generate said "Needs the helper on this computer… python3 tools/genfill/serve.py" on every
address: the helper only ran while someone kept a Terminal open, and :7315 was closed. The page
always calls this Mac's `127.0.0.1:7315` (no host check), and serve.py already sends
`Access-Control-Allow-Private-Network`, so an https page (Vercel, ngrok) reaches it once it runs.
`tools/genfill/install.sh` / `env.sh` / `uninstall.sh` mirror tools/photoshop: serve.py copied to
`~/Library/Application Support/Provident/genfill` (a login item cannot read ~/Documents),
`ae.provident.genfill` (RunAtLoad, KeepAlive), log `~/Library/Logs/Provident/genfill.log`. The plist
sets PATH (`~/.local/node/bin` first): the Higgsfield CLI is `#!/usr/bin/env node`, and launchd starts
with /usr/bin:/bin. `claude` is found by serve.py's own glob in Application Support. Rerun install.sh
after any change to serve.py (the login item runs the copy). genfill.js's off message names the
installer. Installed here: /health `{ok, claude: true, higgsfield: ok}`; fetched from a page on
provident-design-studio.vercel.app. Chrome may ask once per site to allow local network access.

## OPS and CASV open the same editor (2026-11-25)
OPS: **Generate** on a page's Background picture (`genOpen(id)`, see `docs/notes/ops-templates.md`).
CASV (branch `video-studio`): **Extend photo** on a photo clip. Neither changes `genfill.js`.
