<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Web Image Studio (web-image-studio.html)

# Web Image Studio — a separate tool in this folder

`web-image-studio.html` is a standalone single-file app (no DC, no build) that prepares
photos for the three **websites**: providentestate.com, offplan-dubai.com and the
provident.ae landing pages. Three tabs, one photo in, every placement out as JPEG at an
exact pixel size under 300KB, written flat into a folder the user picks — no zip, no
subfolders. It replaced `photo-resizer.html`, which is deleted.

**The Developers canvas carries a VECTOR output.** `offplan-ad-dev` has a second group,
`{id:'logo', kind:'set', vector:true}` with one out `{w:152, h:133, pad:10, svg:true}`:
the exported file is 152 x 133, the logo is contained in **132 x 113** with 10px of clear
space, and it is **transparent** — the only output in this tool that is not a JPEG.

**It is a `set` with a `vector` flag, not a new kind.** `kind === 'set'` is branched on in
thirteen places — the state shape, source tracking, the output list, the readiness count,
rendering, the orphan sweep — and all of it is inherited for free. Only the export and the
preview need to know. Adding a `kind` would have meant thirteen edits and thirteen chances
to miss one. Verified: the tab went from "3 files" to "4 files" and 4/4 ready with no other
change.

**The fit is `preserveAspectRatio`, not arithmetic.** The source SVG is NESTED inside the
wrapper rather than unwrapped, with `x/y = pad`, `width/height = 132/113` and
`preserveAspectRatio="xMidYMid meet"`. Contain-fit and centring then come from the SVG spec
itself, `<defs>` and ids stay scoped, and there is no scale/translate maths to get wrong.
Verified on six source shapes — wide 3:1, tall 1:3, square, an off-origin viewBox, a 1x1
unit space and 4000x1200: the file is always 152 x 133, the ink always inside the clear
space, always centred, always filling one axis exactly.

Four things this needed that are easy to miss:

- **An SVG must never reach `decodeFile`.** `typeOk` is false for it, so `ingest` would
  rasterise a logo to JPEG — the one thing this output exists to avoid. `isSvgFile` is
  checked first.
- **Read the text from the BLOB, not a cached field.** After a reload `SRC` is rehydrated
  from IndexedDB and carries no `.svg`, so `svgTextOf` reads the blob and memoises.
- **A viewBox is synthesised from width/height when it is missing**, the same fix
  `providentSizeSvg` applies in the main studio and for the same reason: without an
  intrinsic ratio nothing can scale it. An SVG with neither is refused, with a message.
- **`readErr` swallows any message matching `/decode|cannot/i`** and rewrites it as
  "Could not read X". The actionable "…so it cannot be scaled" was being clobbered into the
  generic one; it is worded to stay out of that regex. Errors surface in `expstat`: a raster
  dropped in the vector slot is refused **at the drop**, not later at the output.

**The preview uses a DATA URL, not an object URL.** The object URL has to be revoked or it
leaks, and revoking it raced the image's own decode — the preview came back blank at
`naturalWidth 0` while the blob itself was perfectly good. The encode entry carries the SVG
text, so the preview is built from that. The vector output's preview is literally the
exported bytes, on a **checkerboard**: this output is transparent, and the flat-white
backdrop the rest of the tool uses would read as baked in. (That white-flatten rule is a
JPEG rule — see `drawDown`.) A vector output also gets **no reframe control**, because
contain-fit means there is no crop to set.

## The chrome is the UI kit now

> **SUPERSEDED, BY AN EXPLICIT DECISION: this tool is on `marketing-tools/STYLEGUIDE.md`
> (Prov Toys) now and is NO LONGER a mirror of `ui-design-system/`.** Everything below is
> the record of the kit conversion it used to carry, and it is still the reference for HOW a
> conversion is done in this file — one block at the end of the sheet plus a token swap, old
> names kept and redefined. The values are no longer what ships. See *THE TOOL WAS RE-SKINNED
> TO PROV TOYS* at the end of this file.


`web-image-studio.html` was on the **pre-two-mode palette** — a navy ground (#0A1120), the
old blue (#4E7A9E) and cream alphas for every line and ink — with `--ps-accent`, `--ps-ink`,
`--ps-fill` and `--ps-line` absent entirely. It is on `ui-design-system/provident-ui.css`.

**The kit cannot be `<link>`ed here.** This is a single standalone file opened straight off
the disk, which is why its font is base64-embedded; a relative font URL is refused over
`file://` and a linked stylesheet would end the single-file property. So the kit is
**mirrored**, exactly as it is into the two studios.

Done as **one block at the end of the stylesheet** plus a token swap, the convention in this
project. The old token names are kept and **redefined** rather than deleted, because ~100
rules in the file are written against `--ps-cream` / `--ps-hair-2` / `--ps-mute` /
`--ps-navy` / `--ps-blue*`; redefining them flips all of those for free. What changed:

- a control group was a **CARD** (border + fill + 12px + 5px gap) -> a **BAND**, 15px 16px
  with a 9px gap and an edge-to-edge seam
- captions were **tracked UPPERCASE at 11px** -> 12.5px sentence case; there is no all-caps
  in this chrome, and that rule postdates this tool
- every corner was 6px -> the kit's scale, and a button is a 999px pill
- the select chevron was **two 45-degree gradient stops** -> the Material glyph; the kit
  carries no gradient fills
- sliders got `-webkit-appearance:none` and the kit's track and thumb
- ~40 cream literals -> tokens, including four scrollbar rules

`SITES` at the top of the script is the **only** place a size, a default file name or a
cap is declared; naming, numbering, the readiness gate and the export all read it. An entry
carrying `group` is a **canvas within a tab**: Offplan is one segmented item whose caret
opens a menu of four canvases — Dubai/Projects, Abu Dhabi/Projects, Abu Dhabi/Area,
Abu Dhabi/Developers — grouped under their `groupLabel`. The two Projects canvases come from
**one** `offplanProjects()` factory, because a duplicate that can drift is not worth having.
Dubai/Projects keeps the id `offplan` so records written before the split still load.

**The destination folder is per canvas** (`folder:<id>`), not per app. Projects, Area and
Developers each export their own `Mobile.jpg`, so one shared folder would have them
overwriting each other and the same-name confirmation could not tell them apart. A legacy
single `folder` key migrates to whichever canvas is open, once.

**Custom sections are keyed by group** (`s.cust[gid]`), since Area's named gallery and
Provident's Extra images are both `kind:'custom'` on different canvases — a single shared
array poured them into the same section. A pre-split record holds one flat `custom` array and
migrates into that canvas's first custom group. `lockSize` is what separates the two: Area's
gallery is fixed at 544x350 and offers no size fields, Extra images stays editable.
Default names are the ones the live sites use, verified against the pages themselves —
Provident's CMS appends its own hash to `Mobile` / `Banner` / `Unique_selling_point`, and
the landing page loads `images/<project>/1.jpg`, so its files are literally `1`, `2`, `3`.
The Provident gallery is two zones (8 x 1150x600 then 2 x 1390x2000) with **continuous**
numbering across both, matching `Gallery_8` / `Gallery_9` being the tall ones on the live
page. Offplan's cap of 8 is soft because that page already runs 9.

**The chrome is measured off the live studio, not approximated.** Google Sans Flex is
**embedded as base64** from the design system's own `GoogleSansFlex-Variable.woff2`, because
a relative font URL is refused when the file is opened straight off the disk and the tool
then silently fell back to system sans. The stack is the token verbatim
(`'Google Sans Flex',system-ui,sans-serif`) and the base scale is Template Studio's live
body: **300 / 17px / 1.7**. Verified identical by measuring one string at 100px — 1010.8px
in both, against 1100.5px for generic sans. Every control matches a measured value:
`.p-in` 14px/400 at 8px 10px, `.p-lab` 13px/400, `.p-cap` 11px/500 at **.1em** (the dwtc
block reduces it from .16em), `.p-hint` 11px/300/1.5, `.p-ghost` 9px 19px, a primary at
13px 30px, `.p-grp` 12px padding with a 5px gap, **6px** radius throughout, a 54px top bar
and the wordmark at 20px/300/.04em. Take numbers from the running studio, never from
memory — several of these differ from what the stylesheet appears to say, because that
final override block rewrites them.

**Every section is one shape: input left, hairline, outputs right.** `twoCol()` builds it and
sets, gallery zones and extra images all go through it, so the drop target is always in the
same place and is visibly not part of the preview. A gallery with two zones is two rows, each
with its own drop column. The narrow column is 172px, which tracked caps overflow — the size
goes in the cap's quiet `s` half, stacked under the label.

**A card must carry its own padding in its width.** `.oc` is border-box with 9px padding and
a 1px border, so a card set to the frame's width pushes the preview 20px past its right
edge. That was the visible over-offset; the card is `box.w + 20`.

Four things that were earned the hard way and must not regress:

- **The folder picker has to be opened BEFORE the render pass.** `showDirectoryPicker`
  and `requestPermission` need transient user activation, which expires seconds after
  the click; encoding 17 outputs takes longer. Asking afterwards meant the picker never
  opened and the user was told they had not chosen a folder they were never offered.
  `ensureFolder()` resolves only to a handle that is **actually writable, or null** — a
  dismissed picker hands back the current folder, which on the denied path is the very
  one just refused, and returning it failed every write.
- **Storage failure must never cost the project.** Read, migrate and load are three
  failures with three answers: a failed read starts blank; a failed migration keeps the
  record and sets `saveBlocked`; a failed *photo* read keeps the arrangement, because
  pruning it and saving makes a transient error permanent. `indexedDB.open` also hangs
  behind another tab of the tool, so boot races it against a 5s timeout and comes up
  read-only rather than blank. `gcSources` only reclaims blobs unreferenced for 5
  minutes — a second tab writes a photo before the record naming it.
- **Every output owns its own frame** (`f = {z, cx, cy}`), because one source feeds
  402x769, 750x450 and 1920x1080. `rectOf()` is the single crop, read by both the CSS
  preview and the export draw, each axis on its own ratio. `clampCentre()` clamps the
  centre to what the frame can **reach**, not to 0..1: storing an unreachable centre
  gave a dead zone where dragging back moved nothing until the overshoot was retraced.
- **JPEG has no alpha.** A transparent PNG flattens to white, in the export and in the
  preview backdrop, so the two agree.

# THE IMAGE TOOL IS ON COINBASE NOW, WITH PROVIDENT'S TYPEFACE KEPT

> **The ACCENT is Provident Navy now, not Coinbase Blue.** Everything below about the
> structure — the token source, the pill, the retired kicker, the adapted type scale, the
> two registers — is what ships; only the blue itself and the surface tints were replaced.
> See *THE ACCENT IS PROVIDENT NAVY* at the end of this file.

`web-image-studio.html` follows **`nexu-io/open-design`, `design-systems/coinbase`**, by
explicit request, with one carve-out stated in the same breath: **Google Sans Flex stays.**
Coinbase ships a four-font proprietary system — CoinbaseDisplay / Sans / Text / Icons — and
none of it is available or wanted here, so what carries its hierarchy in this file is
**size, weight and line-height on one family**.

This is the **third** system this file has carried: the kit, then Prov Toys, now this. It
has not been a `ui-design-system/` mirror since the Prov Toys pass, so **the mirror count is
unchanged — Organic is still the only kit consumer.**

## THE VALUES COME FROM `design-tokens.json`, NOT FROM `DESIGN.md`

56 tokens, value for value. The prose is the authority on the RULES and the JSON is the
authority on the VALUES, and the two are not interchangeable — this is the same discipline
the Prov Toys pass recorded as "token source is `globals.css`, never the guide's prose."

| | |
|---|---|
| `--bg` / `--surface` | `#FFFFFF` / `#EEF0F3` |
| `--fg` / `--muted` | `#0A0B0D` / `#5B616E` |
| `--border` | `rgba(91,97,110,.2)` |
| `--accent` / `--accent-on` | **`#0052FF`** / `#FFFFFF` |
| `--accent-hover` / `--accent-active` | `#578BFA` / `#0667D0` |
| radius | sm 8 · md 16 · lg 32 · pill 9999 |
| elevation | `--elev-flat: none`, `--elev-ring: 0 0 0 1px var(--border)` |
| focus | `--focus-ring: 0 0 0 2px var(--fg)` — the FOREGROUND, not the accent |
| motion | 150ms / 200ms on `cubic-bezier(0.2,0,0,1)` |

**THE TOKEN FILE IS LIGHT-ONLY.** `DESIGN.md` documents dark *sections* (`#0A0B0D` ground,
`#282B31` dark card) rather than a dark theme, so a dark app shell is partly derived. Only
three things in this block are: the dark ramp, two mid greys, and the semantic trio. Each is
marked in the CSS.

## THE TWO REGISTERS SURVIVED, AND COINBASE ASKS FOR THEM IN ITS OWN WORDS

The pass before this one split one blue into a resting register and a reserved bright one.
Coinbase states the same rule outright — **"Don't use the blue decoratively — it's
functional only"** — so nothing had to be argued for a second time:

- **the resting selected state** is Coinbase's own *Blue Bordered* variant with a pale blue
  behind it, inside a **1px `#0052FF`** hairline, ink `#0052FF` light / `#6B98FB` dark.
  Measured **5.08:1** and **6.26:1**. **Both values were corrected one pass later** — the
  fill went OPAQUE (`#EBF1FF` / `#0F2147`) because a translucent one measures differently
  depending on what is behind it, and the dark ink was lifted off Coinbase's `#578BFA`
  because it failed on `--ps-fill` at 10px. See *CAMPAIGN IS ON COINBASE TOO*.
- **the action** is Coinbase Blue solid with white ink, **5.75:1**, still scoped to
  `.p-top` — the three site tabs and Export.

**The deep-fill boundary problem is answered the same way it was for the kit's navy and for
`#2F4C7F`: the hairline carries it.** The wash against its ground is far under 3:1; the
`#0052FF` hairline measures **5.75:1 on white and 3.18:1 on the dark rail**, both clear of
1.4.11. Three systems, three fills, one structural conclusion — **do not lighten the fill.**

**`--ps-accent-h` carries the bright step for the third time**, and for the reason it did
last time: `.p-btn` already reads that token, so the primary goes strong with no rule change
and the shared `studio-base.js` is not touched.

## THE PILL IS BACK, AND THE TRACKED-CAPS KICKER IS GONE

Both reverse the Prov Toys pass outright, and both are Coinbase's own rules:

- **Prov Toys took the pill OFF every labelled action** ("controls are rounded-lg, NOT
  pills"). Coinbase's rule is *"Don't use sharp corners on CTAs — 56px minimum"*, and at a
  36px control height a 56px radius **is** a full pill, so the token is the pill and the
  intent is exact. **A field is not a CTA** and keeps `--radius-sm` 8px; cards take
  `--radius-md` 16px.
- **Prov Toys made `.p-cap` a tracked-caps kicker.** Coinbase's whole scale is sentence
  case; its two small roles are Small 13/600 and Caption 14/600. So the kicker retires — and
  that **removes a hazard rather than merely changing a look**: uppercasing a caption
  *rewrote data* in the Prov Toys pass, turning `402 x 769` into `402 X 769`, which needed a
  hand-written per-container split to patch. With no uppercase anywhere it cannot happen.
  The `.sec-h` split is kept only for its tabular figures.

## THE MARKETING SCALE IS NOT USED, AND THAT IS THE ONE ADAPTATION

Coinbase's headings run **80 / 64 / 52 / 36 / 32** at a 1.00 line-height. That is a hero
page; this is a dense tool with a 172px column, and a 36px section heading would break the
layout outright. The role that actually matches a rail section header is Coinbase's own
**Feature Title, 18/600/1.33**, and that is what `.sec-h h2` takes. Its display sizes have
no element here to land on. Everything else is exact: body **16/400 at 1.5**
(`--text-base` / `--leading-body`), buttons **600 weight with +0.16px tracking**, headings
`-0.01em` (`--tracking-display`). The one other step down is the button SIZE — 14 rather
than 16, because a 36px-tall control in a tool rail cannot carry a 16px label.

**BODY IS REGULAR 400 NOW, which reverses the Light 300 body of both previous systems** —
and it was checked before being committed to, because a weight that silently clamps is
exactly the trap Readex Pro's `font-weight: 300 500` file sets. **The embedded Google Sans
Flex is declared `font-weight: 1 1000` and genuinely renders seven distinct widths from 100
to 900** (canvas 258.93 → 306.54 on one string; five distinct in the DOM). So Coinbase's
600/700 render rather than flatten. **Measure the axis, never trust the descriptor.**

## FOUR THINGS THAT NEEDED A DECISION

- **`.p-btn` WAS BLUE ON BLUE, and this is the third re-skin in a row to produce exactly
  this bug.** It fills with `--ps-accent-h` and read `--ps-accent-i` for its label — and
  `--ps-accent-i` is now the ink used on a *wash*, i.e. the blue. Both halves come from the
  one `--ps-primary` pair now. The fix is not the point; **enumerating every
  `--ps-accent-i` reader against its new fill** is, and it also caught `.fr .kill:hover`,
  which fills with `--ps-bad` and would have been blue on red.
- **The semantic trio is stated as SURFACE colours and this file reads them as INK on a
  faint wash.** `--success` measures 3.30:1 and `--warn` **1.92:1** as ink on white, so both
  are darkened at their own hue to 5.43 and 5.48; `--danger` passes as given (4.83). In dark
  only `--danger` needed lifting. That also retires this file's amber-chip failure.
- **The focus ring is the FOREGROUND colour, not the accent** — `--focus-ring` is
  `0 0 0 2px var(--fg)`, so it is near-black on light and white on dark and it inverts with
  the theme. That is a genuine Coinbase signature and the opposite of what every previous
  system here did.
- **PROVIDENT'S LOGOTYPE STAYS ORANGE, and it is the one deliberate departure.** Coinbase's
  palette is a blue-and-white binary with no orange in it. The wordmark's period is the
  brand's own mark rather than chrome, and the instruction was to keep Provident's identity,
  so `--ps-brand` survives with exactly one reader. It measures 2.76:1 in light and is
  exempt as a logotype — the same call, and the same exemption, the Prov Toys pass recorded.

## What is NOT re-skinned, for the reason it was not re-skinned twice before

The preview frame's dark checkerboard (`.fr`) and its pinned ink, and the JPEG white
flatten. These are not chrome, they are statements about the IMAGE: the checker means
"transparent" and must not become the page ground. Verified still pinned at
`rgb(11,15,20)` in **both** themes.

## Verification

- **Reloaded into each theme, never toggled into, with transitions finished** (this pane's
  document timeline is frozen — see the probe note in *ONE BLUE WAS DOING TWO JOBS*).
- **Contrast, ancestor opacity composited: light 3, dark 2 — zero real failures.** Light is
  the logotype's period plus the two disabled Export buttons; dark is those two alone. Both
  exemptions are ones this file already carried.
- Every derived value measured live rather than trusted: quiet ink **6.97:1** on the dark
  ground and **5.02** on the dark card, danger 5.47, success 5.97, warn 10.27, ink 19.69,
  link 6.07, white on the primary 5.75 and on its hover 5.44.
- **331 rules parse** (291 before), the tail rules are the new block's, **0 drop shadows** in
  either theme, and the radii land where intended — `.p-btn`/`.p-ghost` 9999px, `.p-in` 8px,
  `.oc`/`.drop` 16px.
- **The four-level dark ramp was a correction, not the first cut.** All four shell surfaces
  were first set to `#0A0B0D`, which left the rail, the stage and the ground as one flat
  black with no structure at all. `#0A0B0D` anchors the STAGE and `#282B31` the control
  surface; `#131519`, `#1D2024`, `#252931` and `#31353C` are the steps between. Light
  mirrors the relationship — **the rail is lighter than the stage in both themes.**
- `ui-design-system/`, `studio-base.js` and both `.dc.html` files are untouched.
