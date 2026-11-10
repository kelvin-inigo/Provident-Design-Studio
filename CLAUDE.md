# Provident Design Studio

Internal brand tools for Provident Real Estate. **CAS** is the Campaign Ads Studio
(`Provident Campaign Studio.dc.html`, paid Meta ads). **OPS** is the Organic Post Studio
(`Provident Organic Studio.dc.html`, feed and story posts from locked templates). Use the
acronyms in replies.

This file holds the standing rules only. The full history — every decision, measurement and
trap from Aug–Nov 2026 — lives in `docs/notes/`. **Read the relevant note before changing an
area**; it records why things are the way they are and what was tried and rejected.

| note | read before touching |
|---|---|
| `docs/notes/brand-rules.md` | any canvas output (binding rules, also summarised below) |
| `docs/notes/architecture.md` | runtime.js, studio-base.js, storage, workspaces, recents, renderer parity, the MCP server, Photoshop, rembg |
| `docs/notes/chrome-and-design-system.md` | `ui-design-system/`, tokens, any chrome colour/radius/type, contrast |
| `docs/notes/cas.md` | CAS panels, components (modLayout), sizes, exports, Copy view, Arabic mirror, Unbranded look |
| `docs/notes/ops-templates.md` | any OPS template, buildOps, the guided run / form rail, the carousel |
| `docs/notes/reviews-sharing-drive.md` | ad sets, review links, Status, share-link.js, api/share.py, Drive, sign-in and roles |
| `docs/notes/ops-posts-and-hub.md` | post-flow.js, OPS Home, the Content Hub, Send |
| `docs/notes/landing-page.md` | root `index.html` |
| `docs/notes/web-image-studio.md` | `web-image-studio.html` |

Setup docs: `docs/google-drive-setup.md`, `docs/share-links-setup.md`,
`docs/studio-access-setup.md`, `docs/studio-endpoint.md`.

## Files

| file | what it is |
|---|---|
| `Provident Campaign Studio.dc.html` / `Provident Organic Studio.dc.html` | the two studios; peers, each opens on its own splash |
| `studio-base.js` | `StudioBase`, shared by both — ONE copy; a fix lands once |
| `runtime.js` | storage stand-in (IndexedDB), Safari fallbacks, the image encoder, `?ws=` workspaces. One long function: never add a second `var` of an existing name |
| `share-link.js` | edit links, ad set reviews, Status, Drive store (`dsApi`) |
| `post-flow.js` | OPS posts on Drive (Draft › Design › Copy check › Ready), OPS Home |
| `access.js` | Google sign-in gate and roles, both studios and the landing page |
| `api/share.py`, `api/gauth.py` | Vercel functions (share store on Upstash, Google refresh tokens) |
| `image-slot.js` · `support.js` · `_ds/` · `fonts/` · `icon-tags.js` · `vendor/` | shared |
| `ui-design-system/` | the chrome design system; CAS, OPS and the image tool mirror it |
| `CAS-OPS-GUIDE.md` | the user-facing guide (for Claude Cowork) — update it when a label, button, flow or export name a user sees changes |
| `tools/` | rembg cut-out service, Photoshop helper, studio-mcp server, share dev server + Drive stand-in |

Head order in both studios: `runtime.js` → `support.js` → `studio-base.js` (then the
studio-specific scripts), parser-inserted, never in the helmet.

## Standing rules

**Canvas and chrome are separate systems.** Artwork reads `CampaignStudio.PAL` /
`OrganicStudio.ART` literals; chrome reads `--ps-*` tokens. Never put a `var(--ps-*)` or a
colour literal at a call site in `buildOps` or a canvas preview style. Merging the two leaked
the UI's blue into finished posts once.

**A kit change fans out.** Edit `ui-design-system/` first, then mirror into all three
consumers' stylesheets AND their JS style objects (inline styles beat every rule) in the same
pass, then verify in the browser.

**Preview and export share one geometry.** Each template/component has one layout source
(`modLayout`, `listedBox`, `csBox`, `revBox`, `rcvBox` …) read by both `buildOps` and the
preview. Anything that changes how an op paints lands in BOTH renderers of BOTH studios
(`renderOpsToCanvas` / `renderOpsToSvg` are duplicated per studio).

**The guided run is a projection of the advanced workspace** (OPS: one markup serves the run
and the All-controls rail). Change both in one pass; check both directions.

**Prove the artwork did not move.** After any change near the canvas: op-signature census
against the pre-change file served alongside as `_PRE` (both warm — a cold first load gives
spurious `wkSpecBox` diffs), or a whole-file diff showing zero artwork-path lines.

**Check the winner, not the rule.** These sheets end in override blocks; measure computed
values in the browser, reload into a theme rather than toggling, finish transitions and
animations first (the pane's timeline is frozen). Contrast bar is WCAG AA (4.5 / 3 large /
3 non-text), ancestor opacity composited. A solid navy fill carries no stroke; a wash keeps
its ring.

**Recurring traps** (details in the notes):
- No interpolated `src=`, `d=` or `points=` attributes — the browser parses them before DC
  interpolates. Use `data-src` / masks.
- `data-x="{{ bool }}"` renders `"false"`, which `[data-x]` matches; use `'1'` / `undefined`.
- Never write a star-slash or a closing style tag inside a CSS comment.
- Never write camelCase SVG attributes (`viewBox`…) inside a CSS string.
- A later duplicate key in an object literal silently wins — scan `renderVals` after edits.
- An if/else chain has no protection: add per-kind keys AFTER the terminating `else`.
- The canvas preview is shrunk with a transform (`StudioBase.scaleBox`), never `zoom`.
- Read the photo store only via `StudioBase.sidecar()` / `img()`.
- After editing `studio-base.js` or a `.dc.html`, bust the browser cache before trusting a test.
- Synthetic events do not hit-test: prove a gesture layer is reachable with
  `elementFromPoint` or a real pointer. The Browser pane's screenshot frame can be ~1.28x CSS px.
- Pointer events for drag, never native DnD.
- A new project or tab inherits no Source folder, photo or brief.
- Never hardcode secrets in this public repo; tokens are per computer or in Vercel env.

**Deleted on purpose — do not rebuild:** YouTube Demand Gen, the Meta Ads kit bridge, CAS's
Publish tab / Meta ad text, the OPS support desk, the iOS app shell, CAS's Send / From the hub,
the Projects folder view, the old in-editor guided wizard.

## Brand rules (binding; full text in `docs/notes/brand-rules.md`)

- Google Sans Flex only. Headers Regular 400; everything else Light 300; tracked caps at 500 for
  eyebrows and small labels. No second typeface, no highlight/serif emphasis.
- No gold in canvas output except the recorded exemptions (ranking badge, award line, agent
  designation, carousel overline, brass highlight). Orange #F3793C never on dark grounds.
- Campaign 9:16 margins 100 / 260 / 100 / 460 (Reels safe area), rail reserve `railR` 170 on the
  bottom cluster only; 1:1 margins 80.
- Full-bleed photo; copy clusters top/bottom, at most ~40% of the canvas.
- Logo: the `provident.` wordmark only, left or centre, never right. QR a small rounded square in
  a bottom corner, or top right in the wordmark's row (campaign). Kicker bars framed or rule-flanked, never solid.
- Type scale: minor third ×1.200 from the 24px floor (`CampaignStudio.TYPE`).
- Organic: feed 1080×1440 (80/90 margins), story 1080×1920 (200 top); layouts fixed per template;
  scrims cover only the text areas; property pages need their own QR and a listing number (no
  length rule); exports flat with `_3x4` / `_9x16` suffixes.
