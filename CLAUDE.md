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

# `ui-design-system/` — the chrome design system, and the one place to change it

Three files, and they are the source of truth for the **tool's own interface** across both
studios, the splash, the guided run and any new webapp:

| file | what it is |
|---|---|
| `provident-ui.css` | the library — tokens for both themes plus every `.p-*` component class |
| `provident-ui.tokens.json` | the same tokens, machine readable, with the rules attached |
| `index.html` | the reference page. It **links** the stylesheet, so it is a live test of the library rather than a description of it |

**This is NOT the brand/canvas system, and the separation is load-bearing.** Exported artwork
reads `CampaignStudio.PAL` / `OrganicStudio.ART` and never a `--ps-*` token — verified across
126 component × variant × size combinations. Merging the two is what leaked the UI's blue
into eight places in finished posts. The brand *web components* live in `_ds/`.

**Every number in it was MEASURED off the running studio**, never read out of the stylesheet.
That is not pedantry: the sheet ends in six override blocks (dwtc structure, panel rhythm,
surfaces-not-strokes, edge-to-edge dividers, the pill sweep, orange-in-the-top-bar), so what
a rule appears to say and what a control computes are routinely different.

## The propagation contract

The studios carry their CSS inlined in a `<helmet>` block **plus ~500 colour literals in JS
style objects that no stylesheet can reach**, so the library is not imported — it is
*mirrored*. When a change is asked for: edit `ui-design-system/`, then push the same change
into each studio's stylesheet **and** its style objects in the same pass, then verify in the
browser. A refactor to `<link>` the shared CSS was considered and rejected: it is large
surgery on a working file and the inline literals would still need converting by hand before
it did anything.

**THERE IS ONE MIRROR LEFT: `Provident Organic Studio.dc.html`.** It was three.
`web-image-studio.html` and then `Provident Campaign Studio.dc.html` were both re-skinned to
Prov Toys by explicit decision and left the kit. Splitting the studios into two documents did
not extract the chrome CSS, deliberately — its cascade order is load-bearing (see *What is
shared, and how*). **So `ui-design-system/` now governs exactly one document, and a kit change
reaches neither the image tool nor Campaign.** That is the standing cost of those decisions.
If Organic goes the same way the library has no consumer left and should be retired rather
than maintained.

**Verify a library change by CLONING THE GUIDE'S SPECIMENS INTO THE STUDIO.** This is the
only method that actually works, and three weaker ones were tried first:

1. *Probing the same class list on both pages* misses anything not currently mounted, and
   silently compares different STATES — `.p-opt` on the reference page is `[data-on]` and the
   studio's first one is not, which reported five colour "mismatches" that were not real.
2. *An element-only contrast audit* is blind to **pseudo-elements**, which is exactly where
   the slider's cream track hid. `getComputedStyle(el, '::-webkit-slider-runnable-track')`
   does not reliably report author styles either — compare the DECLARED rules instead, via
   `[...sheet.cssRules].filter(r => /slider-runnable-track/.test(r.selectorText))`.
3. *Grepping the studio for a class name* said `.p-btn` was "present" because it matched
   `.p-btn-q` and `.p-btn.p-sm`. There was no base `.p-btn` rule at all.

What works: load `ui-design-system/index.html` in a hidden same-origin iframe, copy its
specimen sections' `innerHTML` into a container **inside `.p-shell`**, and diff computed
values element-for-element in lockstep. Identical markup, two stylesheets, one document.
Mount it OUTSIDE `.p-shell` and every ancestor-scoped studio rule is skipped, so half the
controls report the browser default and you get a page of false findings. Compare design
properties only — never `width`/`height`, which follow the container.

That test found 28 mismatch groups where the first two methods found 4, including three
classes the studio did not define at all. It now reports **zero** across 693 elements.

## What building it found

**`.p-share-m .p-in` and `.p-sec-c .p-in` were deleted, not re-tokened.** Both re-added a
visible field border in `rgba(236,231,223,.35)`, a cream literal from when those two panels
were navy — where a 5% white fill is invisible and the border was the only thing showing the
field. Both grounds were neutralised long ago, so the override outlived its reason, and the
literal never flipped: **2.81:1** against the field's own fill on a dark rail, **1.07:1** on a
light one. Every field in the Share panel and the All-slides section had no visible edge in
light mode. A rail field was already `border-color:transparent` — a field is a FILL — so
removing the two rules makes every `.p-in` in the app identical, which is now verified: one
computed signature across all of them.

**~97 cream literals (`rgba(236,231,223,*)`) remain in the file.** Most are dead — overridden
by the theme block — which is why the app still measures clean. Auditing what actually *wins*
in light mode leaves two things: canvas artwork ink at 17:1 (correct by design, that is cream
on the dark canvas), and **`.modhandle` at 1:1** — the component drag handle painted cream on
a light canvas. **Now fixed — see *The canvas drag grips are CHROME* below.**

**Set `data-theme` before first paint.** The reference page originally restored it from a
script at the end of the body, which flashes the wrong theme AND leaves `getComputedStyle`
returning a mixed pre/post-flip picture — `.p-ghost` reported the dark palette while `:root`
already reported light, which reads exactly like a theming bug and cost a round here. A
three-line blocking script in `<head>` fixes both. This is the concrete form of the existing
"reload into a theme, don't toggle into it" rule.

**The page must be served, not opened from Finder.** Chrome refuses a relative *font* URL over
`file://`, so a double-clicked copy falls back to system sans and every specimen measurement
shifts — the same constraint that made `web-image-studio.html` base64-embed its font.

## The token audit — what a full pass over the library found

Run against the four rules of the frontend-design directive (ground in tokens · system before
layout · one cohesive direction · audit before styling), across the library and all three
mirrors. Method: the static sweep for literals, the clone-diff for guide-vs-studio, and the
composite-opacity contrast walk for what actually *wins*. Guide↔studio mismatch groups went
**20 → 6**, and all six survivors are the documented non-findings listed at the end.

### The library was documenting values it never declared

**The radius scale existed only in `provident-ui.tokens.json`.** `control: 10px`,
`tile: 13px`, `dropzone: 14px`, `guidedField: 16px` and `pill: 999px` were written down as
tokens and had **no CSS custom property behind them** — so 29 rules in the library and ~111
declarations across the three mirrors hardcoded them, and "change the pill radius" was an
edit in four files including ~20 JS style objects no stylesheet can reach. They are
`--ps-r-ctl` / `--ps-r-tile` / `--ps-r-drop` / `--ps-r-field` / `--ps-pill` now, declared in
`provident-ui.css` and mirrored into all three.

**There was no token for ink on an accent fill**, so five rules fell back to a literal:
four `#fff` on `.p-ghost[data-on]` / `.p-btn` / `.p-prev` / `.p-tabs button[data-on]`, plus
`rgba(255,255,255,.92)` for the three-stop slider's mark inside the fill. `--ps-accent-i` and
`--ps-accent-i-q`. **One value in both themes, and that is deliberate** — `--ps-accent`
(#487194) and `--ps-brand` (#F3793C) are themselves single-valued, so this is ink that has to
read on *them*, not on the page ground, and it must not flip.

Also: the slider thumb's `rgba(0,0,0,.35)` shadow never flipped (it is `--ps-shade` now — a
black shadow on a light ground was heavy), `--ps-chev` was declared in the CSS and missing
from the JSON, and one `border-radius:99px` sat among 23 `999px`.

### FOUR CLASSES THE LIBRARY DEFINED AND NEITHER STUDIO IMPLEMENTED

`.p-tag`, `.p-note`, `.p-pop` and `.p-step` had **no base rule in either `.dc.html`** —
markup using any of them rendered as a grey `2px outset` UA control. This is the third time
this exact failure has happened (`.p-btn` / `.p-badge` / `.p-choice` before it, and
`.p-btn-q` after), and it is the strongest argument for running the clone-diff after any
library addition. `.p-btn-q:disabled{opacity:.4}` was the same story — the studios dimmed
Undo/Redo only because an inline style object happened to set it.

`p-pop` was already a `@keyframes` name in both studios. Different namespace, no collision —
but check, because a class rule and a keyframe sharing a name is exactly the sort of thing
that looks like a collision and is not.

**New standing rule: every class this library defines must have a base rule in BOTH
studios.** It is in `provident-ui.tokens.json`'s `rules` array now.

### A modifier composes; it never re-declares its base

Two classes had drifted into being tiles of their own:

- **`.p-mini-i`** carried `height:62px`, the 13px radius, the fill AND the selected ring —
  all of which live on `.p-mini` in both studios, whose markup is
  `<span class="p-mini p-mini-i">`. So the guide re-boxed a box inside a box, against its own
  rule, and documented a standalone usage that renders unstyled in the studios.
- **`.p-ico-o`** re-declared the whole ghost surface. The studios' `.p-ico-o` is geometry
  only and composes with `.p-ghost` (`class="p-ghost p-ico-t p-ico-o"`).

Both are geometry-and-colour only now, and the guide's specimens were changed to the real
markup. **A specimen that works only because the library over-declares is a specimen that
lies.**

### The glyph specimen tile was missing from the library entirely

Both studios ship `.p-mini-g` / `.p-mini-ar` — the Typeface English/Arabic pair, where the
tile *is* the specimen of the face it selects. The library had neither, and instead carried a
generic `.p-mini b{font-weight:300}` catching any `<b>` in any tile at a weight **neither
studio uses**. The studios' measured values (400 / 27px / 1.3 Latin, 34px / 1.35 Arabic) are
documented now, with the reason Arabic is set larger and why `line-height:1` crops it.

### `.p-mini i` is `--ps-skel`; `-q` is the `.dim` MODIFIER

The library said `--ps-skel-q`, so every diagram in the guide read a third fainter than the
control it documents. The `.dim` / `.scrim` modifiers are declared now, which is what the
`-q` value is actually for.

### Organic's 32 cream literals are DEAD — measure what wins, never what is written

The static sweep found 32 `rgba(236,231,223,*)` literals and 9 hardcoded error reds in
Organic's `.gd-*` / `.wz-*` rules, and **none of them win** — the two-mode block at the end of
the sheet overrides all of them, exactly as it does for the ~97 in the pre-split file.
Composite-opacity contrast walk over the guided run and the top bar in light mode: **zero**
elements under 2.4:1 apart from two by-design opacity states and one real bug.
**That bar is superseded — it was below WCAG AA. See _The contrast bar was 2.4:1, and
that is why the failures passed_.**

**The real bug was `.gd-skip`** — quietness expressed as `opacity:.5`, which does not survive
the flip: **2.99:1 in dark and 2.12:1 in light**, on the one control that leaves the guided
run. The block above it explicitly exempted `.gd-skip` on the reasoning that its opacity is a
hover affordance — and *half* of that is true. The hover lift is state; the **rest** value is
quietness. So the rest state takes `--ps-dim` at opacity 1 and the lift became a colour
change. Measured after: **3.07 light / 4.44 dark**, still visibly quiet.

**A correction worth keeping, because it is the standing trap.** I reported
`web-image-studio.html`'s slider thumb as carrying the 2px white ring the kit removed — the
bug that put the thumb 2px below the track's centre line. It does not. I read the FIRST of
its slider blocks; a later one already sets `border:none` and the accent fill, so the thumb
computes correctly. **What a rule appears to say and what a control computes are routinely
different in these files, because every sheet ends in override blocks. Check the winner.**
A note to that effect is in the file so the dead block does not mislead the next reader.

### Verifying a token pass: prove the render did not move

A pure `999px` → `var(--ps-pill)` substitution is value-preserving *by construction* — so the
thing to prove is that nothing else moved with it. Capture a signature per element (all four
radii, colour, background, box-shadow, opacity, border width) in DOM order, before and after,
and diff:

| | elements | computed diffs |
|---|---|---|
| Campaign | 637 | **0** |
| Organic | 347 | 4 — all `99px → 999px`, the outlier normalising onto the scale |

The four are `.gs-*` promo bars 5–8px tall, where both values clamp to half the height and
render identically. Serve the pre-change copies alongside under a `_PRE ` name and drive both
through the same probe; `localStorage` is the channel between two same-origin tabs.

**Two substitutions were EXCLUDED, and getting this wrong would have leaked the chrome into
artwork.** Campaign's `wrapStyle` (reads `pal.chip`, sizes in `cq()`) and Organic's
`ctaPillStyle` (mirrors an op with `r = h/2`) are canvas previews, not chrome — they keep
their literals. Never substitute a bare `999px` either: `.gd-lock` uses one as a box-shadow
**spread**. Match `border-radius:999px` and `borderRadius: '999px'` explicitly.

The 10/13/14/16px radii in the studios were deliberately left mostly alone: each needs a
per-site judgement (`.gd-card` is artwork, `.p-modal-in`'s 14px is not a drop zone, several
are superseded by later blocks) and the value does not change either way. Only the
unambiguous ones moved — `.p-mini`'s tile radius, `.p-dash`'s drop radius, and the guided
run's field radius.

### The clone-diff's own traps, both hit again in this pass

- **`outerHTML` round-tripping breaks lockstep.** Re-parsing the guide's specimen sections
  conjured **12 extra elements** into existence and the element-for-element walk aborted. Use
  `document.importNode(node, true)` — it deep-clones the real nodes, so the structure is
  identical by construction.
- **Scope the comparison to `.demo`.** Comparing whole sections drowns the signal in
  `index.html`'s own documentation chrome — `h2`, `.lede`, `.spec`, `.facts`, `.why`, `code`,
  tables, `li`, `p.nm`, 90 groups of it — none of which has a studio counterpart by design.
  Inside `.demo` there are 128 elements and the findings are real. Drop `minHeight` too: it
  differs by UA reset, not by rule.
- **The guide `<link>`s its stylesheet, so the iframe serves a CACHED copy**, which reads
  exactly like "the fix didn't land". Bust both the page URL and every `link[rel=stylesheet]`
  href. This cost a round twice, once making four applied fixes look inert.

### The six survivors, so they do not get "fixed" later

`div.anat` (the guide's own anatomy diagram, no studio counterpart) · `.p-tri` padding and
`.p-tri-w` radius (the documented equivalent implementation — guide uses padding, studio uses
absolute insets, measured identical) · `.p-dock-b` border-*colour* on a **zero-width** border
(the widths match) plus its closed-dock `opacity:0` · `.p-dock-t`'s shadow, which the studio
scopes to `.p-dock-r` so the clone cannot inherit it · `.p-pop`'s `opacity`, mid-`p-rise`.

**And one that got documented rather than changed:** a `.p-grp` is 15px vertical in a rail and
13px in a panel (the dock and Share). Two contained values in two contexts is a system; this
one existed only in a comment above `.p-grp` while the guide computed 15px everywhere. It is
declared now (`.p-dock-b .p-grp,.p-share-m .p-grp{padding-block:13px}`) rather than unified,
because unifying it would have been a visual change to Campaign's dock that nobody asked for.

## THE THIRD MIRROR WAS BEHIND, and scoping the clone-diff is what found it

> **The parity work below was done and then SUPERSEDED the same day** — the tool was
> re-skinned to Prov Toys and is not a kit mirror any more, so its kit parity is moot. Three
> things in it are still live and are why it is kept: the **scoped clone-diff** method, the
> two **probe artefacts**, and the **correction to the AA table's light `--ps-dim`**, which is
> a fact about the kit and both studios. The three shared drifts it found in Campaign and
> Organic are also still open.


`web-image-studio.html` was last touched a day before `provident-ui.css`, so it was the mirror
the AA-contrast pass left behind. Reconciled to the kit; **five rules added, three literals
substituted, and every other rule byte-identical** (261 -> 266 authored, 256 -> 261 parsed).

**MOST OF IT HAD ALREADY LANDED, which is the first thing to know before re-auditing this
file.** Verified rather than assumed: 17 `.p-*` classes live in that app's DOM and **every one
has a rule** — zero of the UA-default defects the standing rule exists to catch. The AA tokens
match the kit exactly (`--ps-ink` #E8EAED, `--ps-ink-2` #A8B0BA, `--ps-dim` #8A939F dark /
#5E6874 light, `--ps-focus` #9CB8EA, `--ps-link` #8EADE1), and so do `::selection`,
`caret-color`, `text-underline-offset`, the tabular-nums list, `:focus-visible` and `--ps-chev`.

### What actually drifted, measured on COMPUTED values

| | kit | this file had |
|---|---|---|
| `--ps-accent-q` dark | `rgba(32,83,208,.22)` | `.20` |
| `.p-cap` | `align-items:baseline` | `center` |
| `.p-cap > s` | 11.5px / 400 | 11px / 300 |
| `.p-in` | `height:36px; line-height:normal` | no height -> **38.3px** from the body's 1.7 |
| `.p-lab > s` | `margin-left:auto` **and `text-align:right`** | the margin only |

**The `.p-cap` pair is the one that mattered here, because of what this app is.** Every output
size in the tool is written into a caption's quiet half — 26 of them — so centring set a 12.5px
label and an 11.5px value on two different lines of the same row. `.p-lab > s` is the same
shape: `margin-left:auto` pushes the box right and `text-align:right` is what keeps a value
that WRAPS from going ragged-left inside it, and one of the two rows in that rail wraps.

**`.p-in`'s 36px is the system's control height and this file was 2.3px over it** — the field
had no height at all and computed from `padding + line-height`. It ships with `textarea.p-in`
beside it, which is **inert today** (this app renders no textarea, verified) and is there
because the height would otherwise crush one to a single line the moment somebody adds one.
That is the pairing the kit already has, and the reason for it.

Two literals went onto the scale's own tokens — `.p-in` `10px` -> `--ps-r-ctl` and `.drop`
`14px` -> `--ps-r-drop`, both declared in the file already, so both are value-preserving by
construction and measured unchanged after (10px / 14px).

### THREE OF THE FIVE ARE SHARED BY ALL THREE MIRRORS

Checked, not assumed. `--ps-accent-q` is `.20` in **Campaign and Organic too**, neither sets a
`.p-in` height, and neither right-aligns `.p-lab > s`. Only the two `.p-cap` values were this
file's own — the studios already carry `baseline` and 11.5px. **So the kit is ahead of all
three mirrors on three values, and reconciling one mirror does not discharge that.** It is
three lines in each studio and it was left alone here because the request named this file.

### THE CLONE-DIFF NEEDS SCOPING WHEN THE TARGET IS NOT A STUDIO

The documented method — import the guide's own `.demo` specimens into the target document and
diff computed values in lockstep — reported **90 mismatch groups over 166 elements** here, and
essentially all of them were false. The tell is in the values: `13.3333px`, `rgba(0, 0, 0, 0)`,
`align-items: normal`, radius `0px` are a **UA button**, not a drift. The guide's specimens
exercise all 71 classes the library defines; this app has 17 of those controls and legitimately
styles no more. The standing rule that every library class needs a base rule says *studios* —
extending it to a third-party app mirror would mean ~50 rules for controls it does not have.

**So scope the walk to the classes the target's own markup uses**, and read that list off the
LIVE DOM rather than the source. Scoped, the same walk went 90 groups -> 5 real ones, and
after the fix **every class this app uses computes identically to the kit in both themes.**

### Two probe artefacts, both mine, both the file's own documented traps

- **A per-selector diff missed a later re-assert.** Comparing `select.p-in`'s declarations said
  this file still drew the chevron with two 45-degree gradient stops — the exact thing the kit
  pass removed. It does not: a later rule re-asserts `--ps-chev`, and reading one selector's
  block cannot see it. **Check the winner, not the rule** — and that applies to a *probe* as
  much as to a stylesheet.
- **A bare-class probe cannot judge a MODIFIER.** `.p-ico-o` alone reported a black glyph on
  #EFEFEF with a 2px border — UA defaults — in the *guide*, because the kit's `.p-ico-o` is
  geometry only and composes with `.p-ghost`. Composed as the markup actually writes it
  (`p-ghost p-ico-t p-ico-o`) it is **IDENTICAL**. A modifier composes; test it composed.

And one that cost a round: **the timed-out call still ran.** A `javascript_tool` timeout left a
loaded iframe and a second `#__clone` host in the DOM, `getElementById` removed only the first,
and the survivor poisoned a class census into reporting the guide's whole vocabulary as this
app's. Use `querySelectorAll` to clean up, and check the DOM is clean before trusting a census.
`requestAnimationFrame` never fires while the pane is hidden, so a probe that awaits one hangs
to the timeout — that is what left the leftovers.

### A CORRECTION TO THIS FILE: the light quiet-ink value recorded above was never shipped

The AA table in *The contrast bar was 2.4:1* gives light `--ps-dim` / `--ps-mute` as **#646E7C**.
The kit declares **#5E6874**, and its own comment measures that value at "5.02 on `--ps-fill`,
5.11 on `--ps-app`, 5.66 on a card" — comfortably AA, and it is what all three mirrors carry.
Measured here on this app's own ground: **5.06:1** at 11.5px. The table is what is wrong, not
the code; #646E7C appears in no file in this folder.

**Contrast after, both themes, ancestor opacity composited: 2 elements under AA in each, and
both are the disabled Export buttons** — 1.4.3 exempts a disabled control, which is the
exemption this file already records for Undo/Redo. Zero real failures.

**No kit change, so nothing is owed to the other mirrors by THIS pass** — the edit was
mirror-to-kit, not kit-to-mirrors. The three shared drifts above are a separate, pre-existing
debt. `provident-ui.css`, `provident-ui.tokens.json`, `index.html` and both `.dc.html` files
are unmodified, and `localStorage` on the test origin was empty before and after (the theme key
this file shares with the studios lives on the origin the user actually opens).

## The button pass — 15 shapes down to 10 roles

Applied to Campaign and the shared splash. **Measured before: 77 visible buttons in 42
distinct shapes**, of which ~15 were labelled actions. The other 27 are correctly different —
option tiles, palette cards, project miniatures, colour swatches — and the scan has to
exclude them or the number is meaningless.

**The radii were already clean.** In use: 0 / 8 / 10 / 50% / 999px, all on the guide's scale.
The scatter was **height, padding and weight**, 2–4px at a time, which is exactly why it read
as "different buttons everywhere" but resisted being pointed at. The one genuine rogue radius
was `dangerBtnStyle`'s **6px on a button**, which also carried three hardcoded reds.

**The fix was mostly the JS style objects, not CSS** — the documented trap. Ten markup sites
moved from `style="{{ xStyle }}"` to the guide's classes, which is the durable half: a future
change to the library now reaches them, where an inline object would keep winning.

Every surviving shape maps to a named role, and they are verified identical between the
reference page and the studio:

| role | h · padding · size/weight | where |
|---|---|---|
| `.p-ghost` | 35 · 9px 19px · 12/500 | top-bar and panel actions |
| `.p-ghost.p-sm` | 29 · 6px 14px · 12/500 | a control inside a rail group |
| `.p-btn` | 36 · 10px 16px · 13/500 | primary |
| `.p-btn-q` | 29 · 6px 12px · 12/400 | quiet (undo/redo) |
| `.p-prev` | 29 · 6px 13px · 12/500 | the two brand-orange controls |
| `.p-danger[.p-sm]` | as `.p-ghost` | destructive |
| `.p-link` | 22 · 3px 12px · 11/500 | small outlined link |
| `.p-badge` | 4px 14px · 12/500 | plate badges |
| `.p-tabs button` | 4px 12px · 12/500 | two halves of ONE control |
| `.p-dock-t` | 50 · 9px 18px · 12/400 | dock pills |

**`.p-sm` exists because 35px everywhere lengthens three rails you already scroll.** It sets
height and padding ONLY, so the parent's weight, colour and `[data-on]` state carry through
and a compact button is visibly the same button rather than a different one.

Four things this pass got wrong first:

- **Mirroring a library class means bringing the CLASS, not just the modifier.** Undo/Redo
  were converted to `.p-btn-q`, which existed in `ui-design-system/` and **not in the
  studio's stylesheet at all** — so they fell to the UA default (40px, `1px 6px`) and looked
  worse than before. Check the class exists in the target before switching markup to it.
- **My own premise was wrong, and the audit corrected it.** I inferred "about 10 segmented
  toggle groups" from `flex:1` in `btn()`; `flex:1` is there because they sit in a `.p-row`,
  and almost every one is a *single* boolean whose label states the state. Campaign's
  mutually-exclusive controls were already `.p-tabs` (Scrim) or `.p-opts` tiles. So the
  track conversion applied to nothing and the real work was unifying single toggles.
- **`data-on` needs a `'1'`/`undefined` flag, and the existing booleans are not one.**
  `fgOn` and `coOnFlag` are `!!(...)` for `<sc-if>`, where a boolean is fine. Reusing either
  for `data-on` renders `data-on="false"`, which `[data-on]` matches. Five new flags —
  `qrVisibleOn`, `coBrandOn`, `figTopSetOn`, `bigSetOn`, `fgShownOn`.
- **`+ New campaign` measured 3px taller than the primary beside it** on identical padding,
  because it inherits the shell's 1.7 line-height and the inline primary does not. It carries
  an explicit height now.

**Left alone deliberately:** Organic's editor (out of the requested scope; its `btn()` /
`darkBtn` are separate objects in its own `renderVals`, so nothing here touched it), and the
plate `activate`/`remove` buttons — already exactly the guide's badge values, and converting
them needs a new per-variant flag inside a `map`, which is more risk than the change is worth.
`.p-nav2` sidebar rows and `.p-panelbar` are navigation, not actions, and keep their own shape.

## The pass after it — everything the button sweep missed

The button sweep was reported as "applied" when it had only swept BUTTONS. The guide also
covers sliders, fields, tiles, drop zones, type roles and spacing, and none of those had been
diffed. The user found it immediately ("slider on the studio still looks old"). The lesson is
the method above, not the individual fixes.

### `-webkit-appearance:none` IS LOAD-BEARING, and its absence makes a rule INERT

The most instructive bug in this whole system. The studio's slider looked wrong beside the
guide, so the cream track literal was found and tokenised — and **nothing changed**, because
the rule was never being applied at all:

```
input[type=range]{accent-color:...;width:100%;height:18px}     /* no appearance:none */
input[type=range]::-webkit-slider-runnable-track{...}          /* SILENTLY IGNORED */
input[type=range]::-webkit-slider-thumb{...}                   /* SILENTLY IGNORED */
```

Without `-webkit-appearance:none` on the **input itself**, Chrome keeps NATIVE rendering and
ignores the track and thumb pseudo-elements entirely. So the control rendered as Chrome's own
slider tinted by `accent-color` — a thicker bar with a **filled progress portion** and a
larger thumb — while the stylesheet appeared to describe a 4px neutral track with a 14px
accent thumb. `getComputedStyle` on those pseudos does not report author styles either, so
neither reading the sheet nor probing the element reveals it.

**How to tell a native slider from a custom one at a glance: the FILL.** WebKit has no
progress pseudo-element, so a custom slider cannot have a filled portion. If the track is
coloured up to the thumb, you are looking at native rendering and every track/thumb rule you
wrote is dead. `accent-color` is dropped once appearance is none — it only tints native.

Three slider families existed and **all three were native**: `input[type=range]` (Campaign's
rails), `.gd-range` (the guided run), and `.rfc-z` (the reframe overlay). All three now carry
`appearance:none` plus identical 4px `--ps-line` track and 14px `--ps-accent` thumb, verified
by rendering all four — including the guide's — side by side at the same value.

**The reframe overlay was the last of the brass.** `image-slot.js` builds its shadow CSS as a
JS string, so no document stylesheet and no sweep could reach it: the zoom slider was
`accent-color:#C9A96A` and the Done button and active anchor buttons were `#C9A96A` fills —
gold, against the binding rule that gold is gone from the chrome entirely. **CSS custom
properties DO inherit through a shadow boundary** (verified: `var(--ps-accent)` resolves to
#487194 inside a shadow root, fallback unused), so those are tokens now and the overlay
follows the theme for the first time.

**The cream literal was real too**, just not the cause: both track rules are `var(--ps-line)`
now, and all 24 remaining cream literals in Campaign/shared chrome went with them. **All 24 remaining cream literals in Campaign/shared chrome went with
it** — mapped by role, not by alpha: a `color` at .45 → `--ps-dim` and at .75 → `--ps-ink-2`,
anything ≤.12 → `--ps-hair`, everything else → `--ps-line`. Campaign chrome now measures
**zero** cream literals. The guided run's (`.gd-*`) are Organic's and were left.

**Three classes the guide defines had NO base rule in the studio** — `.p-btn`, `.p-badge`,
`.p-choice`. Only `.p-btn.p-sm` existed, which is meaningless without `.p-btn`. Any markup
using them would have rendered as a grey `2px outset` UA button.

**Four numbers in the GUIDE were wrong, and the studio was right.** The guide is supposed to
be measured off the running studio; these four were not:

| | guide had | studio ships | fixed in |
|---|---|---|---|
| `.p-grp` padding | 13px 14px (a DOCK group) | 15px 16px in a rail | guide |
| `.p-dash` surface | `--ps-card` | `--ps-fill` | guide |
| `.p-tri-k` mark in the fill | `#fff` | `rgba(255,255,255,.92)` | guide |
| `.p-fld` ink | inherited | `--ps-dim` | guide |
| `.p-info` | solid accent disc, 14px | quiet accent-tinted disc, 15px | guide |

`.p-info` is the instructive one: I wrote it from CLAUDE.md's phrase "a filled disc, not a
ring" instead of measuring, and got both the size and the treatment wrong. Ten solid accent
dots per rail is the same noise problem the ring version had.

**`.p-chip` was a NAME COLLISION I introduced.** In the studio it is a 26 x 26 colour swatch
and has been for far longer than this library existed; the library's informational pill is
`.p-tag` now.

**Two "mismatches" were equivalent implementations, and "fixing" either would have broken a
working control.** The three-stop slider's 5px gutter is `padding` in the guide and absolute
insets on `.p-tri-w` in the studio — measured identical: 44px outer, 34px inner, 5px gutter
on both, and the child's own radius is invisible because the parent clips to the capsule.
`.p-sec`'s `gap: normal` vs `0px` computes the same for flex. **Measure the rendered result
before changing anything the diff flags.**

# Provident Design Studio — TWO documents, one system

**They were one file and they are not any more.** `Provident Design Studio.dc.html` held
both studios behind a chooser; it is **deleted**. There are two peers now, and neither is
"the main file":

| | `Provident Campaign Studio.dc.html` | `Provident Organic Studio.dc.html` |
|---|---|---|
| Use | paid Meta ads | organic feed + story posts |
| Method | free-form design-component palette | locked templates (listed / weekly / top agents / reviews / award) |
| Sizes | 1:1, 9:16, 16:9 | 3:4 feed, 9:16 story |
| localStorage | `provident-ad-studio-v2`, `adstudio-recents` | `provident-smp-studio-v2`, `smp-recents` |
| image-slot ids | `adstudio-*` | `smp-*` |
| session file | `.adstudio.json` | `.smpstudio.json` |

**The split was clean because the engines never referenced each other** — verified before
cutting: `CampaignStudio` and `OrganicStudio` name each other nowhere outside comments, and
only the shell ever touched both. So this is a separation, not an untangling.

Each document opens **straight on its own project splash**. The two-card chooser screen is
gone (`shOnChooser`, `shPickCampaign`, `shPickOrganic`, `shBackToChooser`, `goStudio` and
`syncEngine` with it) — opening the file *is* the choice. The top bar's segmented control
and the splash sidebar still show both studios: the current one is `[data-on]` with a no-op
`set`, and the other **navigates to the other document** via `Component.goOther(file)`.
`provident-studio` is no longer read or written by anything.

Both studios still read and write the same photo store (`.image-slots.state.json`), so an
image dropped in one is available to the other; the id prefixes above keep their slots from
colliding. That was true before the split and is unchanged.

## What is shared, and how — read this before changing anything twice

| | where it lives | rule |
|---|---|---|
| `StudioBase` | **`studio-base.js`**, ONE copy, `<script src>` in both `<head>`s | a fix lands once |
| the `.p-*` chrome CSS | **mirrored** in both `<helmet>` blocks | edit `ui-design-system/` first, then BOTH stylesheets **and** their JS style objects |
| `renderOpsToCanvas` / `renderOpsToSvg` | duplicated per studio, as before | anything that changes how an op paints lands in both files |

**`StudioBase` is external because a mirrored copy is a second place for every fix to
land** — 49KB of text metrics, `zip`, `buildPdf`, session loading, the folder API and the
placement-preview plumbing. It works with no build step because a top-level `class` in a
classic script creates a **global binding**, so `class CampaignStudio extends StudioBase`
resolves inside the `text/x-dc` block. Three things made it safe to extract, all checked
first: it extends nothing, it names neither engine, and **no static initialiser calls out**
(`crcTable` is a pure IIFE; every `window.provident*` touch is lazy). So "after
`runtime.js`" is the only ordering constraint.

**The chrome CSS is NOT extracted, and that is deliberate.** Its cascade order is
load-bearing — the sheet ends in six override blocks that decide what actually wins — so
splitting it into shared + per-studio means classifying ~1000 rules and getting the order
right. Instead each document keeps the **whole** sheet minus the other studio's rules.

**`autoGrow()` in `studio-base.js` looks for `.gd-bigta`, which only exists in Organic.** A
`querySelectorAll` that matches nothing is a no-op, so it stays shared rather than forking.

### How the CSS was cut, and how it was proved

Only the other studio's **large, comment-delimited feature blocks** were removed:

- Campaign loses the guided run, the guided-setup promo and the in-editor wizard rails
  (`.gd-*`, `.gs-*`, `.wz-*`, the `gdIn`/`gdAsk`/`gdFade`/`gsQ`/`gsFill` keyframes, and two
  whole `@media` blocks whose every inner rule was one of those) — 310 rules.
- Organic loses the whole placement-preview block and the design-system sheet (`.mk-*`,
  `.sp-*`) — 134 rules. **`.mk-g` is kept**, because it is not mockup furniture: it is the
  icon primitive every glyph in the shared top bar and panel bar is drawn with.

**Eleven MIXED rules name a `.gd-*` selector beside a `.p-*` one** (the pill sweep, the
select chevron, the scrollbar lists). Those were left exactly as they are: a selector that
matches nothing costs nothing, and rewriting a shared selector list does not. The one
exception is the `::-webkit-scrollbar-thumb` rule, where dropping the three `.gd-*`
selectors made it **byte-identical to a rule already in the sheet** — so the survivors kept
precisely the declarations they had.

**Proved at the RULE level in Chrome, not by reading the files.** Load the original and each
new document, dump `[...sheet.cssRules].map(r => r.cssText)`, hash each rule, pass one set
to the other tab through **`localStorage`** (same origin, so it is the shared channel), and
diff. The claim to prove is not "it looks right" — it is **`added === 0`**: every rule in
the new sheet is byte-identical to one in the original. Both files: 998 → 689 (Campaign) and
998 → 864 (Organic), **0 added**, and every removed rule accounted for. Counting rules alone
would have missed a silently *altered* one, which is exactly the failure this project has
hit before (a scripted CSS edit once swallowed half the sheet as nested CSS).

Four removals needed explaining rather than assuming, and each was checked in the DOM:
`.p-foot.p-foot-t` (0 uses in Campaign's markup, 1 in Organic's), the
`prefers-reduced-motion` block holding only `.gs-*`/`.gd-*` — a **second** one, for the
recents reel, correctly survives — the `(max-width:1060px)` block holding only
`.gd-in-zone`/`.gd-pv-zone`, and the trimmed thumb rule above.

## The cross-studio hand-over is a NAVIGATION now

`loadSessionFile` still treats the other studio's file as a hand-over rather than an error,
but the two studios are separate documents, so it cannot reload in place. `SESSIONS` carries
a **`file`** per entry and `reloadNow(url)` takes an optional destination — going through
`reloadNow` is what stands `StudioBase.reloading` up, so the `beforeunload` guard does not
fire on a move the user asked for. Assigning `location.href` at the call site would raise
Chrome's "Changes you made may not be saved" over a button they had just pressed.

`Component.goOther(file)` does the same for the studio switcher, and keeps the
`confirmDiscard()` guard the old in-app switcher carried.

Verified end to end: a `.adstudio.json` offered to Organic navigates to
`Provident Campaign Studio.dc.html`; a `.smpstudio.json` offered to Campaign navigates to
`Provident Organic Studio.dc.html`; a file for the studio you are already in reloads in
place (`reloadNow('')`); an **untagged** file identified by shape hands over correctly; an
explicitly empty project is still refused with a message and does not navigate; and clicking
the other studio with unsaved work raises the confirm and, on Cancel, stays put. Test it with
a stubbed `reloadNow` and **snapshot/restore every localStorage key the loader writes** — the
real thing overwrites the saved project for that studio.

## Organic has TWO rails, and its panel bar now says so

Campaign has `.p-rail-l` / `.p-rail-c` / `.p-rail-r`; Organic has only `.p-rail-l` and
`.p-rail-r`. The shared `.p-panelbar` rendered three buttons in both, so in Organic the
middle one opened a sheet with **nothing in it** — a latent bug the split exposed. Organic's
bar is two buttons now, named after the rails they actually reach: **Template** and
**Slide**.

Same class of thing: `bgSlotStyle` was only ever defined in `CampaignStudio`, and Organic's
markup referenced it for the Overlap-image drop zone. It never showed, because that block is
gated on `fgAllowed`, which is hardcoded false in Organic — so the reference was invisibly
dead in the combined file too. It was declared in Organic to make the document
self-contained. **SUPERSEDED: the Overlap-image group is DELETED from Organic**, along with
`fgAllowed`, `bgSlotStyle` and the three toggle keys — it was a second control on the very
slot Organic's *Parallax layer* already owns. See *The app-wide dead-feature audit*.

**The retired in-editor wizard is DELETED TOO** — it was left here as "soft-disabled, so
nothing else has to be re-wired", and it was carrying two live defects nobody could see. See
the audit section. **Left alone deliberately:** the **placement preview still works in
Organic's engine**
(`mockPlan`/`mockCopy`/`mockScale`/`mockRenderAll` are per-studio; `mockSync`/`mockShots`/
`mockSafeBox`/`mockSafeWrap` are in `StudioBase`) — only the button and the overlay markup
are Campaign's. Bringing it to Organic is the shell keys plus that markup, nothing more.

## Runtime

`runtime.js` is a parser-inserted script in `<head>`, **before `support.js`** — the
helmet mounts its `<script src>` tags with `createElement` and never clears `async`,
so `image-slot.js` can execute at any moment and everything it depends on has to
already exist. Don't move it into the `<helmet>` block.

Both documents' `<head>` is therefore `runtime.js` → `support.js` → **`studio-base.js`**,
in that order. `studio-base.js` only has to precede the `text/x-dc` block, so it goes last;
it is placed in `<head>` rather than the helmet for the same reason `runtime.js` is — the
helmet's tags are async and cannot be relied on to have run.

It does three things:

1. **Storage stand-in.** `image-slot.js` gates *all* editing — upload, Replace,
   double-click reframe — on `window.omelette.writeFile`, which only Design Cursor
   provides. Without this the studio is read-only in a browser. The shim backs that
   call with IndexedDB and patches `fetch` to serve `.image-slots.state.json` from
   it, seeding from the on-disk file on first open. Inside Design Cursor the whole
   block no-ops and the real sidecar is used.
2. **Safari fallbacks.** Four things the export path needs fail *silently* in
   Safari because every call site sits in a `try/catch`:
   `ctx.letterSpacing` (unsupported → tracked caps exported narrower than they
   rendered), `toDataURL('image/webp')` (pre-16.4 returns PNG), `ctx.roundRect`
   (pre-16.4 throws), `backdrop-filter` (needs `-webkit-`). Each is feature-detected
   with a real fallback — notably `window.providentFillText`, which advances per
   character using the same arithmetic `meas()` uses to reserve width.
3. **One image encoder.** `providentEncodeFile` produces a single export-grade copy
   per image, long side capped at 3840px — 2× the widest canvas (16:9 at 3840×2160),
   so no export ever upscales. Canvas and export read the same bytes, so framing is
   identical by construction. WebP where supported, JPEG on older Safari, PNG only
   when the image needs alpha; quality steps down only past a byte budget.

Exports offer JPEG 2× alongside PNG 2×. PNG is lossless but a 1:1 frame is ~6 MB and
9:16 ~9 MB; JPEG q0.94 lands at ~730 KB and ~1 MB for the same pixels, and is what
Meta ingests.

## Splash

The same splash markup is **mirrored** into both documents, laid out as a **project
browser**: a sidebar (studio rows, Library filter, Session actions) beside a main grid of
large 4:5 cards. The sidebar's studio rows come from the same `shTabs` the top bar reads, so
the other studio's row navigates to the other document; the old **"⌂ Both studios"** row is
gone with the chooser it pointed at. Those rows were rebuilt — the chip is the studio's own
canvas shape and the active one is a fill rather than a dot — and the **theme toggle lives in
the browser's header** as well as the editor's top bar; see *The studio switcher, redesigned*.
Ground is `--ps-deep` #0A1120 with cards on `--ps-card` #141E2E — deliberately darker
than the brand navy, which is kept as `--ps-card-h`, the surface a card lifts to on
hover, so #1A2942 still reads as the brand. The Library rows filter between All /
Templates / Recent via `state.splashView` on the shell. Card aspect is per studio —
Campaign 1:1 (matching its square canvas), **Organic 3:4** (matching its feed canvas) —
supplied as `cardMini`. Recent cards show the **master** filling the frame and fade the
other variants/slides in on hover, so a single-variant or single-slide project stays
static. Cards are the button — no separate Load control.

**ORGANIC'S TEMPLATE CARDS ARE REAL RENDERS; CAMPAIGN'S ARE STILL SKELETONS**, and the two
are deliberately different — see *Organic's template miniatures are real renders*. Campaign's
miniature is still generated from its own component list by `CampaignStudio.tplMarks()`,
setting the **wordmark, eyebrow and hero as real text** (the serif word in its own `<em>`,
since DC interpolates into a text node and would escape markup) with everything below them a
bar, so adding a Campaign template still needs no new markup. Campaign therefore keeps the
`.p-c-p i` mark rules and the canvas-dark `.p-c-p` pin its white bars depend on; Organic has
deleted both.

`CampaignStudio.TPL` holds four starting points lifted from `figma-kit/templates` —
**New launch, Event, Payment plan, Spec ladder** (ids `f`, `d`, `g`, `h`) — each carrying a
component set, layout preset and logo placement, with the kit's own copy. Five more
(Investment, Market move, Location-led, Editorial, Discovery) were removed on request;
dropping one is safe because the template id is never persisted into a session — `pickTpl`
only reads it to build the module list, and guards with `if (!tpl) return`. Organic passes
its five locked templates through the same card shape; its richer "Pick a template" screen
still exists behind **+ New post**.

**Open Session accepts EITHER studio's session file.** It used to scan the folder for
`this.sessionExt()` — the current studio's extension alone — so opening a folder holding a
Campaign project while standing in Organic answered "No .smpstudio.json here" and refused,
even though `loadSessionFile` treats a file for the other studio as a hand-over and opens it
without complaint. It now matches every extension in `SESSIONS`, which also means a folder
holding both can offer the newer of the two rather than only ever the current studio's.

**Load session (the file input under Share) is gone.** Open Session covers it and adopts the
folder at the same time, which the file input could never do — a file handle gives no access
to its parent.

**Open Session picks the FOLDER, not the file.** A file handle gives no access to its
parent (there is no `getParent()`), so choosing the folder is the only way to load the
session *and* adopt the root folder in one step. It collects **every**
`.adstudio.json` / `.smpstudio.json` in the folder and opens the one with the newest
`lastModified`, naming the others it left alone. It used to take the *first* match from
`h.values()`, which has no defined order — and folders accumulate session files, because
`projectFiles()` names the .json after `projName()` and `writeProject()` never removes
the old one, so renaming a campaign writes a second file and leaves the first. "First
match" therefore opened an arbitrary, often stale project.

## Loading a session — the failure modes that mattered

`StudioBase.loadSessionFile` is **one shared loader** — now literally one, in
`studio-base.js` — driven by `StudioBase.SESSIONS`, which maps each `app` tag to its studio,
**its document**, localStorage key, resume flag, one-shot notice key and image-slot prefix.
Each engine only declares `sessionApp()`. It replaced two near-identical per-studio copies
whose divergence was itself a bug: each rejected the other's file with "Not a valid session
file.", so a perfectly good Organic post offered to Campaign looked corrupt. A file for the
other studio is a **hand-over** — it writes that studio's keys and then **navigates to its
document**, `reloadNow(spec.file)`. See *The cross-studio hand-over is a NAVIGATION now*.

Rules the loader now holds to, each one earned:

- **Identify by tag, fall back to shape.** A file with no `app` tag (hand-edited, or
  written by an older build) is matched on whether its state has `variants`/`modules`
  or `slides`, instead of being called invalid.
- **`FileReader` needs an `onerror`.** Without one a failed read was a total no-op:
  the button did nothing and said nothing.
- **Never `.catch(() => {})` the photo write.** A rejected sidecar write meant the
  project reloaded with every photo missing and no hint why. Failure now writes
  `spec.notice`, a **one-shot** key that `load()` reads and clears — a status persisted
  into the saved state would resurface on every later reload.
- Distinct messages for corrupt JSON, a non-project .json, and a full quota. "Could
  not read session file." for all three told the user nothing.
- **An explicitly empty `variants: []` / `slides: []` is refused.** `spec.shape` only asks
  whether the key exists and `!![]` is true, so such a file sailed through and opened a
  studio with nothing in it. Only an *empty array* is refused — a missing key is an old
  file that migrates fine.

**Every one of those messages was invisible, which is the whole reason "opening a .json"
read as broken.** They all land in `exportStatus`, which the editor shows in its Share
panel and **the splash did not render at all** — and the splash is the only place Open
Session lives. So picking a folder with no session in it, or one whose file failed to
parse, did nothing and said nothing. `StudioBase.splashNoteVals()` now feeds a
`.p-br-note` line under the project browser's header (`'Ready.'` and blank suppressed), and
`openSessionFolder` reports a failed `pick()` instead of swallowing every error — only
`AbortError`, a dismissed picker, still passes silently.

**An empty array must not be survivable at load either.** Both `static load()`s treat a
saved `variants: []` / `slides: []` as no saved project and say so, because every render
reads `slides[activeSi]` / `variants[activeVi]` — an empty array white-screens the studio
rather than merely looking blank.

**`static load()` must not wrap parse *and* migration in one empty `catch`.** Both
engines did, and both fell through to `return d` — the defaults. So a single bad
property access anywhere in the migration chain silently threw the user's project away
and opened somebody else's default in its place: the file "opened", with no error, as
the wrong project. `OrganicStudio`'s `sl.f.yr` on a `tacover` slide with no `f` was
exactly this. Parse and migrate are now separate steps, a failed migration **keeps the
saved state** and reports itself, and `normState()` gives every slide an `f` before
anything reads through it.

**`Object.assign(defaults, saved)` is shallow**, so a saved `variants` array replaces
the defaults outright and every per-variant key added since that session was written
stays missing. Most render paths guard with `== null`; one that forgets reads
`undefined` and paints nothing. `CampaignStudio.normVariant()` fills the shape in once.
It derives `scaleBy` from the legacy single `scale` rather than defaulting it to 100 —
`scaleOf` prefers `scaleBy` when present, so defaulting would discard the scale an old
session actually saved.

A session file carries only the images that were in the shared store when it was
saved, keyed `adstudio-bg-<vi>`. A file holding just `adstudio-bg-2` opens with Master
and Variant 2 showing **no photo** — that is the file's contents, not a load failure.

## The guided run is a VIEW of the advanced workspace

This is the thing to hold on to, because getting it wrong produced three rounds of rework.
The guided screen is not a separate product with its own flow, copy and field list — it is
the advanced workspace **projected**: the same fields, the same controls, the same canvas,
revealed one at a time with the template-owned layers left out. Every time it was treated
as a brief to design something new it drifted, because a parallel implementation has its own
notion of what is editable and cannot stay in sync with the rail.

**Only per-post content is a question.** `OrganicStudio.FIELDS` is what the run asks for and
gates on; `OrganicStudio.FIXEDTEXT` names what the template writes identically every time
and therefore must NOT be an input:

| kind | template-owned | asked |
|---|---|---|
| cover | eyebrow | headline |
| cta | eyebrow, button label | headline |
| listed | the "in / on" connector | status, type, building, price, listing no. |
| prop | — | usp, type, building, city, bed, bath, area, price, listing no. |
| review | — | quote, reviewer, agent name, agent role |
| tacover | the whole "Top Agents of the …" headline, and the word "Team" after the team name | period, month/quarter/year, team |
| tagent | — | name, role, blurb |

`lockedFor(kind)` concatenates `LOCKED` (grid, margins, wordmark, wash) with that kind's
`FIXEDTEXT`, so the run *names* what the template owns rather than silently omitting it.
Asking a non-designer to retype "TOP PERFORMERS" on every ranking post is work with no
decision in it. The advanced rail still exposes these — that is the expert override.

## The Organic canvas pass — what auditing the four templates found

Run on the four templates as they actually **render**, not as they read: build each one with
plausible copy, `buildOps` → `renderOpsToCanvas` at full 1080, and look at the export. Four
defects, all fixed; three things left as proposals because they are taste or they move saved
work. **`ui-design-system` was deliberately NOT applied here** — it is the chrome system and
the canvas separation is binding. What carried over is its *discipline*: tokens instead of
literals, one place to change a value, and a proof that the render did not move.

### The "no colour literal in the artwork" rule had 76 violations

`ART` was introduced with the note that "a colour can never again be spelled out at a call
site". That was recorded as done and was not. A sweep of both artwork halves found:

| where | literals |
|---|---|
| `buildOps` + its geometry helpers (`taCard`, `taVariant`, `reviewCard`, `agentColsGeom`, `heroRuns`) | **38** |
| the canvas-**preview** style objects in `renderVals` | **38** |

Every one mapped onto a token that already existed or onto a role that plainly needed a name,
so `ART` gained `inkQ` · `ruleQ` / `ruleM` · `glass` / `glassEdge` · `pillEdge` · `hold` /
`holdEdge`. **Each new token took the exact value of the literal it replaced**, which is what
makes the pass provable: op signatures over 4 templates × 11 slides × 2 canvases, **392 ops,
0 differences**. Normalising a value is a separate, visible edit — `ruleQ` (.45) and `ruleM`
(.55) are two weights for one hairline job and should probably collapse, but that is a pixel
change and therefore a decision.

`heroRuns` was the one outside both windows — it sets `fill` on the runs it returns and
`drawLines` pushes that straight into an op, so a literal there reaches the export from a
function that looks like pure measurement.

**A stray `rgba(78,122,158,.85)` was still painting a bar in a template miniature** — the
retired chrome blue, in markup, where the CSS fix for the same bug had already landed.

### The Top agents template never drew its rank

`taRank(si)` existed, the slides rail printed "Rank 01", `SKEL.tagent` reserved a `__rank`
block, `taCard` computed `qpx` for it — and **no op ever painted it**, so five ranked
portraits shipped with nothing saying which was first. The blurb's 40-word cap is documented
as existing "so it clears the ranking numeral": the field was constrained to protect an
element that was not there.

It sits **beside the name, not beside the blurb**, and that is what makes it free — the name
row is ~280px of an 818px column, so the numeral goes in dead space and the blurb's column is
untouched. Measured: `+1` op, `0` changed, on all five cards and both canvases — **an existing
agents post keeps its line breaks.** A rank labels an identity, so pairing it with the
identity is also just right. It is drawn in `ART.soft`, not brass: two picker strings
promised the old accent and were stale against the binding rule.

**`taRank` read `this.state` while `buildOps` works on the state it was handed** — the same
coupling that once made `scrimStops` ignore a detached size's record. In the live editor the
two coincide, so it looks correct and silently returns the wrong rank for every render driven
by another state: recents thumbnails, the guided run's cards, a session being loaded. It takes
an optional state now; the two chrome call sites are unchanged.

### The property spec row hugged its content under edge-to-edge rules

> **REVERSED, and in the direction this section's own rule points.** `Property.svg` replaces
> the two edge-to-edge hairlines with a bordered rounded box sized to its data — the HUGGING
> case — so per-cell columns are now correct here. The rule below is unchanged and is what
> decided it. See *The weekly template was rebuilt to three supplied SVGs*.

The worst of both. The two horizontal hairlines spanned the full 920px inner width while the
four columns were sized to their own text — so the rules promised a full-width band and the
content delivered a cluster stopping at ~460px, with the dividers at uneven intervals because
"3" and "9,918 sq.ft." got different widths. Campaign already settled this exact question and
the rule is recorded two sections up: **equal columns are right edge to edge; per-cell widths
are right only when the panel hugs.** The columns are `innerW / n` now with a divider on each
boundary, and the indent stays on the same side as its rule.

**The preview was a third layout again** — `flex: 0 1 auto` with a `gap` and `flexWrap`, and
no column rules at all. It is `flex:none` plus an explicit equal `width` and `border-box`,
because a bordered, padded flex item takes its indent out of the *shared* free space and
leaves every content box equal instead, which is the trap Campaign's spec row documents.

### A single identity line fits; it does not wrap

> **REVERSED BY REQUEST — the listed card's role WRAPS now**, because
> "CONSULTANT - PRIMARY & SECONDARY SALES" is a real and common answer that a one-line fit
> could only render at 14.5px. The orphan this section objects to is real and is answered by
> a WIDOW RULE rather than by refusing to wrap. See *THE AGENT'S ROLE WRAPS* at the end of
> this file. The optical-size lesson below — a linear solve cannot fit this font, the fit has
> to be stepped, and the predicate must be the consumer's own test — is unchanged and still
> load-bearing.

"SENIOR CONSULTANT · PALM JUMEIRAH" measured ~446px against the listed panel's 422px column,
so it broke and orphaned "JUMEIRAH" — a two-line role with one word on the second reads as a
mistake and grew the panel for it. The price on the row above already fits-to-width for
exactly this reason. `roleMin` (.82) is its floor; past that it still wraps, so a genuinely
long role degrades instead of becoming unreadable.

**A LINEAR SOLVE CANNOT FIT THIS FONT, and that is why the first attempt still wrapped.**
Google Sans Flex carries an optical-size axis — width per em is not constant with px, measured
elsewhere in this project at a 21% swing — so `px * colW / measuredWidth` lands slightly OVER
the column every time, because the smaller size is relatively wider. It has to be **stepped**
until it fits. And the predicate must be the consumer's own test (`wrapPlain`'s `wide()`,
trailing tracking unit included): fitting the *ink* leaves up to one unit of overhang, which
is exactly enough for the consumer to disagree with the fit and break the line anyway.
**Match the consumer, not the geometry.**

### The ranking card was rebuilt to a supplied SVG

`tagent` — the Rank 01–05 slides — is now the supplied 1080x1440 design: a derived top row
over the photo, a giant fading ordinal in the image window, an opaque brand-navy panel, and
a brass place badge. Every number came off that file and is in `OrganicStudio.TA`, converted
to an offset from the margin or from the panel's own top edge so the 9:16 story follows for
free. The panel's height computes to **389** — the drawn value exactly — which is what says
the decomposition is right rather than merely close.

**The wordmark is gone from this slide kind.** The design puts the ranking's own period and
team in that band instead, and both halves are **derived from the cover slide**, so nothing
new is asked for: `Top agent - <taDate(cover)>` and `<cover.team> Team`. The carousel's cover
carries the brand.

**The panel is glass, but at .82 rather than .08 — see _The blur and the ground texture_
below, which supersedes an intermediate opaque version.** The original glass was
`rgba(255,255,255,.08)` and a translucent card that faint over a dark portrait read as almost
nothing, so the blurb sat on whatever the photograph happened to be. Reading the supplied
SVG's flat `#1a2942` literally fixed that and cost the blur; `ART.deepGlass`
(`rgba(26,41,66,.82)`) keeps the fix and gets the blur back.

**And the panel's type lands on the scale — the drawing corrected the codebase.** Blurb 29,
name 35, role 24 are 2.6 / 3.2 / 2.2cqw, three ADJACENT steps of the brand's own minor third,
where the card previously ran 34 / 46 / 24 with a gap in the middle. That is part of the
type-scale drift flagged in the pass above, fixed here by the design itself.

#### One size for the whole series, and the drawing could not decide it

> **SUPERSEDED — the five ranks are supplied vector art now, and the art settles it.** See
> *The ranking numerals are the supplied art* below. Everything in this subsection was true
> of a `text` op sized by a font metric; the five files are all 621 tall, so the series
> already carries one cap height and there is nothing to solve. The lesson worth keeping is
> the general one, and it is recorded under the listed card's role fit too: **this font's
> width per em is not constant with px, so a linear solve lands over the column every time
> and a fit has to be stepped.** That does not apply to an SVG, whose width per unit height
> is exactly constant — which is why `taOrdPx` is deleted rather than adapted.

The SVG shows `1st` only, and at a single px the five ordinals measure wildly differently:
**'1st' 858 against '2nd' 1316** at the same size, because a 1 is narrow and a 2 is not. So

- a size taken from the drawn `1st` sends `2nd` 236px off **both** edges, and
- fitting each ordinal to the same WIDTH gives five cards five different heights.

`taOrdPx(innerW)` therefore sizes the **widest member** to the inner width and every rank
uses that. The cost is real and worth knowing: `1st` renders ~416px of ink against the drawn
606. Fitting each rank to width instead is a two-line change if the series is allowed to vary.

**It has to be stepped, not solved** — the optical-size axis again. The linear guess
`px * innerW / measured` lands over the column every time because the smaller size is
relatively wider, exactly as the listed card's role fit does.

#### The ordinal is a `text` op with `grad`, not paths

> **SUPERSEDED, and reversed on purpose.** The ordinal is the supplied art now, drawn through
> the existing `image` op, so it carries the file's own **per-path** ramps — the very thing
> this subsection deliberately replaced with one canvas-space ramp. Using the attached files
> means accepting their fades; a single ramp across the whole word is now a request for
> different files, not a code change. Both capabilities this pass added to Organic's
> renderers — `grad` and `stroke`/`sw` on a `text` op — are left in place with no emitter in
> that engine, annotated at both renderers. Campaign's hero fade is still a live `grad`
> emitter, so the capability is not dead system-wide.

The SVG draws three glyph paths with a per-path `objectBoundingBox` ramp, so each letter gets
its own fade. `grad` is in CANVAS coordinates, which gives **one** ramp across the whole
word — which is what that op exists for. Group `opacity:.5` is baked into the stops rather
than applied as a layer: white at .5 fading to transparent.

**Text ops gained an optional `stroke` / `sw`, in BOTH renderers**, because the 1px white
hairline is what keeps the glyph's silhouette where the fill has faded to nothing. It is
guarded on `!o.ls`: `providentFillText` advances per character to fake tracking and there is
no `strokeText` equivalent of that, so a tracked run would stroke in the wrong places.
Verified inert elsewhere — **276 text ops across all four templates and both canvases, and
the only ten carrying a stroke are the ranking ordinals.**

#### The preview idiom is `top: baseline - px` with `lineHeight: baseLH(px)`

`baseLH` is a **line-height** (px x 1.32), constructed so a box of that height puts its
baseline exactly `px` below its own top. It is NOT an ascent to subtract from a `top`. Used
as one — which is what the first attempt did — every row sat ~20px high with no error
anywhere and the ordinal 417px out. The listed card's preview already had it right; copy
that, not the name.

A **multi-line** run is the exception: it advances by the op's own lead, so its first
baseline is `(lead - px(a+d))/2 + px*a` below the box top, not `px`.

**And measure it in ONE coordinate space.** Two probes reported 16–26px of drift that did not
exist: inside the zoomed canvas box `offsetTop` and computed `fontSize` are in CANVAS units
while `getBoundingClientRect` is screen px, and mixing them is the documented trap. Summing
`offsetTop` up the chain and adding the computed `fontSize` gives **preview against ops: 0.1px
or better on the top row, the name, the role and the 580px ordinal.**

#### Three places the drawing was not followed, and why

- **The blurb is Light 300, not the Regular the file exports.** The binding rule puts body
  copy at Light and reserves Regular for headers — the name beside it is correctly 400 — and
  a font-family string in an export is far likelier to be a tool artefact than a decision.
  It is one number if it was deliberate. Note it changes the wrap: Light fits `to` onto line
  two where the drawing has it on line three.
- **The panel is anchored to the bottom margin**, not to the drawn y. The SVG's panel sits
  6px inside its own margin, so the whole block reads 6px lower than the file; the margin is
  the grid and the 6px is slop.
- **The badge is centred on the name+role block** rather than pinned to its drawn y (3px
  apart), so it self-corrects when the blurb's line count changes. Its width is **derived
  from its label** — 133.92 of ink plus 2 x 28 of padding is exactly the drawn 190 — because
  the label changes per rank.

#### Two things carried in that conflict with binding rules

- **`ART.brass` #B0905C is against "no gold in canvas output at all."** It is here because
  the design specifies that exact hex on that exact shape and the attached render shows it,
  which is a decision rather than an artefact. Changing the one token to `warm` reverts it
  and nothing else moves.
- **The top row's ink is the brand navy, over a full-bleed photo, with no scrim on this slide
  kind.** Measured: **3.74:1 on the mock's #818181 backdrop, 14.59 on white, 1.44 on black.**
  So it depends on a light-to-mid studio portrait and is invisible until one lands — which is
  also the empty state the editor shows while the run is still asking for the photo.
  `SCRIMD.tagent` (85) is declared and unused; a top band is the fix if that matters.

#### The blur and the ground texture, and they are ONE change

**"Where's the blur effect?" and "put the attachment behind it" are the same question, which
is why they are one section.** Reading the supplied SVG's flat `#1a2942` as an opaque fill is
what silently dropped the blur: `backdrop-filter` under an opaque fill has no visible effect
whatever, so there was nothing to see AND nothing to blur. Over a flat black card there would
still have been nothing to blur. Both halves are now in:

| | value | where |
|---|---|---|
| the panel | `ART.deepGlass` (`.82`, later `.65`) + a `blur` op at `TA.panelBlur` — **30 now, see _The panel's blur, and why 235 was rejected_** | `taVariant`, the `tagent` branch, `K.taCardStyle` |
| the ground | `OrganicStudio.TEXBG` at `TEX.alpha` .3, `TEX.blend` `'luminosity'` | an `image` op after the photo; `K.taTexStyle` in the preview |

**THE BLEND IS THE POINT, NOT THE OPACITY.** Luminosity keeps only the texture's own light and
shade and takes hue and chroma from the photograph underneath, so five studio portraits shot
on five different days read as one carousel instead of five colour temperatures. A plain 30%
overlay washes all five toward the same grey-blue instead. Proved on a saturated backdrop
rather than asserted — over `#C81E1E`, luminosity holds the hue at **exactly 0°** and moves
only the lightness (200,30,30 → 217,75,75 in the light, 204,34,34 in the shade) while
`source-over` shifts the hue to −1.1° and greys the red to (196,84,86).

**The panel's alpha is what makes the blur visible, and it was measured before it was
chosen.** Against the WORST-CASE backdrop — a pure-white portrait — the panel composites to
rgb(66,78,99) and its white blurb measures **8.39:1**, the `ART.warm` role **7.91:1**, against
WCAG AA's 4.5. Over black they are 13.64 and 12.86. So no portrait, however bright, can make
this card unreadable, and the 18% that shows through is far too little to put the blurb back
on the photograph. The one number that gets slightly quieter is the `.33` white hairline
against its own fill, 2.85 → **2.35** on a bright backdrop; the panel's edge is carried by the
luminance step against the photo, not by the hairline, and the SVG specifies that exact alpha.

**Prove a blur by its VARIANCE, not by looking at it.** Over a 22px black/white comb inside
the panel, row 1310: unblurred sd 10.6 / range 31, blurred sd **5.0** / range 14, with the
**mean identical** (46.8 against 46.9). That is precisely what a Gaussian does, and it is a
check that works in a headless render where a screenshot of glass is unconvincing.

**The texture is FIXED to the canvas, not to the photograph.** It does not follow the
portrait's reframe, so re-cropping a face cannot slide the light across the wall behind it. It
is 3:4, so the feed lands it exactly (1080x1440 at 0,0) and the story cover-crops the sides
(1440x1920 at x −180) — the same `Math.max` cover the background photo uses, which is what
`background-size: cover` does in the preview, so the two agree by construction with no
arithmetic to keep in step.

**RANKING CARDS ONLY.** One `if (kind === 'tagent')` gates it; the preview declares
`taTexStyle: {display:'none'}` in the base `K` and overrides it there, because a render key
only some kinds set renders as the browser default. Verified in the live editor: the layer is
`display:none` on the cover and on with the right values on all five ranks.

**BUNDLED AS A DATA URI**, not uploaded and not fetched, for the reason the fonts are: this
studio runs offline and straight off the disk, so an asset held anywhere else is an asset that
is sometimes missing — and a template's own ground is not a question to ask the user. The
source is 2160x2880 (exactly 2x the feed canvas) and 3.9MB; it is a soft gradient carrying
almost no detail, so a **540x720 JPEG** is indistinguishable at 30% over a photograph and
costs 21KB of the document instead of five. `texAsset()` caches one `Image` for the life of
the document and `loadAssets` awaits `texReady()` **unconditionally** — `buildOps` is
synchronous and cover-fits from the intrinsic size, and one decode is cheaper than a condition
the next slide kind forgets to update. `texReady` settles on `img.complete`, not
`naturalWidth`: a decode that FAILED is also settled, and waiting on an event that has already
fired hangs every export.

**The `image` op gained `blend`, in all four renderers** per the parity contract, even though
only this one op emits it — an op handled in one engine and not the other is exactly how
Campaign's glass came to export flat. Canvas spells it `globalCompositeOperation`; SVG takes
`style="mix-blend-mode:…"`. It is safe inside the existing `save`/`clip` because the
separable/non-separable BLEND modes composite source-over — they change only where the source
draws. **Never route a Porter-Duff operator (`source-in`, `copy`) through it**: those act on
the whole surface. Campaign: 204 ops across four templates x three canvases, **0 carrying
`blend`**, both renderers clean — inert by construction.

**The SVG blur now reconstructs the texture too.** It can only re-draw layers it can NAME, so
it `<use>`s `#bgphoto` and now `#bgtex`. It still ignores the scrim, so SVG glass remains the
documented approximation.

**CORRECTION to what this section first claimed.** It said the missing layer left "a visible
seam along the panel's edge". That was reasoned, not measured, and when it was finally
measured the texture's contribution to the panel's backdrop came to about **6/255** — real,
worth having, and nowhere near a visible seam. The same measurement is what stopped the
ranking numeral's `#bgord` layer being oversold: see *The ranking numerals are the supplied
art*. **State the measurement or state that there isn't one.** Measured
against the canvas at six sample points: **exact on five** — the texture over the light
(151,151,151), the texture in the shade (118,118,118), the glass on a quiet spot, the brass
badge, the photo outside the panel — and **3/255** on the blurred glass over the comb, which
is `feGaussianBlur stdDeviation=16` against `filter: blur(16px)`.

**The preview's blur is a plain px length, NOT `cq()`.** The box is laid out at true canvas
units and shrunk with `zoom`, so `16px` there is 16 canvas units, which is the op's own
`amount` — the convention the listed card's chip and panel already use. Verified in the live
editor, one coordinate space: the panel's `offsetLeft/offsetTop/offsetWidth/offsetHeight` are
**80 / 999 / 920 / 351**, byte-for-byte the op's `x/y/w/h`, with `backdrop-filter: blur(16px)`
and `rgba(26,41,66,0.82)` computed.

**AND IT DOES NOT FIX THE TOP ROW — on a black portrait it is marginally worse.** The navy top
row over the ground, measured: mid-grey **3.74 → 4.45**, very dark **1.26 → 1.45**, pure black
**1.44 → 1.17**. Black gets worse because the texture lifts it to a 52 grey, which is almost
exactly the navy ink's own equivalent luminance — the ground moves ONTO the ink. Both numbers
are far below legibility either way, so nothing practical changed, but the dependency logged
in *Two things carried in that conflict with binding rules* is still open and the texture is
not its fix. `SCRIMD.tagent` (85) is still declared and unused.

#### The ranking numerals are the supplied art, fitted edge to edge

The Rank 01-05 numeral is no longer type. Five SVGs were supplied, one per rank, and they are
bundled and drawn through the **existing `image` op** — so this needed no new renderer
capability at all, which is what makes it safe.

**ALL FIVE FILES ARE 621 TALL and only the widths differ** (885.005 / 1235.186 / 1072.072 /
1125.769 / 1096.276). That single fact retires the stepped type fit: the series already
carries one cap height, so nothing has to be solved.

**AND THE ART BOX IS THE INK BOX.** Measured off the rasterisation, not parsed off the path
data: 0.0px of padding on all four sides of all five files. So fitting the BOX to the canvas
lands the INK on the canvas edges, and there is no side-bearing arithmetic.

**Each rank is fitted to the canvas width INDEPENDENTLY, and that is the whole decision.** A
uniform scale cannot make all five reach the edges — sizing the widest ('2nd') to the canvas
leaves '1st' 153px short at each side; sizing the narrowest to the canvas throws 213px of
'2nd' off both and cuts most of the 'nd'. That is arithmetic, not taste. Per rank, every card
is edge to edge. **The cost is that the heights vary 565 to 788, a 223px spread**, and the
rule the viewer reads is "always full width".

**It fits to `tk.W`, never to innerW.** 1080 on the feed and 1080 on the story, so one art
size serves both canvases and the story needs no second set of numbers — verified: identical
`w` and `h` on both, only the `y` differs.

**`TA.ordTop` became `TA.ordDrop`, a fraction of the CANVAS WIDTH below the top hairline**,
because a fraction of the rule-to-panel *window* is the wrong parameterisation once the art is
a fixed size: the story's window is 1224 against the feed's 856, so the same fraction pushed
the story numeral 130px down instead of 91 and left 550px of dead window under it. A fixed
drop puts every rank's **bright top on the same y** — on both canvases and across all five
cards, which is the series cue that actually reads — and it no longer moves when the blurb
grows from two lines to three. `.084 x 1080 = 90.7` reproduces the old feed position (90.8)
exactly, so nothing on the feed moved except the art itself.

**Anchor the sharp end, let the dissolved end vary.** The crown is the art's only hard edge
and it sits directly under a hard 1px hairline; the bottom is a faded tail over a photograph.
And only the rule is a grid constant — the panel's top is copy-dependent, so anchoring to it
would make the dominant graphic a function of how long somebody's blurb is.

**THE 1px STROKE IS NOT GRADIENT-FILLED, so the art has a visible bottom edge.** Measured: the
last scanline still carries alpha 128 (flat `#fff` at the group's .5) on every rank. The fill
fades; the silhouette does not. So the numeral reads as an outlined glyph with a fading fill —
and letting the tallest run 22px under the panel is a deliberate "passing behind the card",
not a clipping bug.

**`ordBleed` is .02 — 21.6px past each edge — and it is the one number to dial.** 0 is exactly
edge to edge and reads as "just fits", with the further hazard that the art's edge lands on
x = 0.0 where any rounding shows a 1px sliver of canvas. Measured costs per side: .01 clips
0.98% of the glyph run, .02 clips 1.92%, .04 clips 3.70% — and about .04-.06 is where a crop
starts to read as damage rather than bleed. On '2nd' and '3rd' the outermost ink is a curve's
tangent point, so the crop replaces a point with a short flat and is imperceptible; on '1st',
'4th' and '5th' it takes the '1' flag tip, the '4' apex and the '5' arm.

**NO `clip` ON THE OP, and that is what makes the bleed work.** All three surfaces clip at the
canvas edge on their own and identically: the canvas renderer has no pixels out there, the
exported SVG's outermost element is `overflow:hidden` by spec, and the preview box already
carries `overflow:hidden`. A clip rect would be a fourth answer to a settled question.

**BUNDLED AS BASE64, and base64 specifically.** These files contain `linearGradient` and
`gradientUnits`, and Design Cursor mangles element and attribute names carrying an uppercase
letter — it is what turned `viewBox` into `sc-camel-view-box` and silently painted an empty
box. Base64 leaves no name to find, and it is proven by the precedent: the ground texture's
base64 URI survives interpolation into a style object intact. **11.7KB for all five.** Two
further hazards base64 avoids, both real: a raw `data:image/svg+xml,<svg…>` URI cannot be
written into the exported SVG at all, because `renderOpsToSvg` does not escape `o.url`; and a
style value handed over as a CSS *string* is split on `;`, which truncates the URI at
`;base64,` — so **every data URI must live in a style OBJECT, never a semicolon-delimited
string**.

**Intrinsic size turned out to be irrelevant, and that was worth measuring rather than
hedging.** The worry was that `drawImage` rasterises an SVG at its intrinsic size and softens
an upscale. Two variants — intrinsic 885x621 and 1770x1242 — drawn to the same destination in
a 2x-scaled context came back **byte-identical across 3,274,560 pixels**, mean and max alpha
difference 0. Chrome rasterises an SVG image at the destination device resolution. So the
bundled art keeps its natural box and no @2x variant is needed.

**`bundledReady()` is one gate for every bundled asset, and it exists because there are TWO
consumers.** `loadAssets` is not the only path that hands an assets map to `buildOps` —
`backfillRecentThumbs` builds its own by hand, and it warmed neither the texture nor the
numerals, so a cold-start recents thumbnail of a ranking post rendered with both layers
silently missing. That was a live defect from the texture pass. Two call sites reading one
function is what stops the next bundled asset being forgotten by one of them.

**`taOrdBox` takes `ruleY` and NOT the panel's top, and that signature IS the anchor
decision** — the panel's y is copy-dependent and is not a term in the box. The parameter was
carried over from the window-fraction anchor and stopped being read; it is deleted rather than
left as an argument two call sites pass and nothing consults.

**`TA.ordAsc` STAYS — it is the badge's now, not the ordinal's.** It centres the place badge's
own label baseline, and deleting it with the ordinal makes that `y` NaN, which blanks the
label on all five ranks while the brass pill still draws, with nothing in the console. Its
comment says so. `TA_ORD`, `taOrd`, `taPlace` and `taRank` all stay live for the same reason —
they are the badge's label source and the rail's chrome. Only `taOrdPx`, `TA.ordTop`,
`taOrdInnerStyle` and the `taOrdinal` render key were dead, and all four are deleted.

**`#bgord` is emitted, and it is honestly worth about 2/255.** The numeral sits between the
texture and the panel and the tallest tucks under the glass, so the SVG blur's backdrop needs
to be able to name and re-draw it — the same shape as `#bgtex`, four edits under the parity
contract. But the measurement matters: at the art's own bottom only the 1px stroke survives, at
alpha 128, and a 16px blur spreads that to about **2/255**. The 31/255 discrepancy first
attributed to it was not the numeral at all — proven by comparing all five ranks, where the
four with **zero** panel overlap show the identical mean (3.32) and worst (218) as the one with
overlap, so that residual is type rasterisation between two engines and not a missing layer.
Keep the fix; do not claim it fixed a visible seam.

**The `blur` op's backdrop is a LIST now, not a chain of booleans.** `bdIds` collects the ids
of named ops in paint order as the walk emits them, so a blur only ever re-draws what was
already painted beneath it — correct by construction — and the next named layer is one entry
instead of a third boolean. Mirrored into Campaign, which emits none of them, for the reason
the parity contract exists.

**`isBg` is deliberately NOT reused for the other named layers.** It also subjects an op to the
photo-strength alpha (`state.imgO`), which would silently dim the texture or the numeral, and
it claims `id="bgphoto"`.

**Proved that nothing else moved, at the op level.** Op signatures over 4 templates x every
slide x both canvases, against the pre-change file served alongside: **22 groups, 12
byte-identical, and the 10 that changed are exactly the ten `agents/tagent` groups** — five
ranks x two canvases — each swapping one `text` op for one `image` op at an **identical op
count of 29**. Weekly, review, listed and the agents cover are untouched.

**The bleed's range is measured at both ends, and `ordBleed` is the only lever.** Floor
**.0046**: below that the overhang is under one device pixel in the recents thumbnail, which
renders at scale .2 — so the bleed stops existing at the size the card is actually browsed at.
Ceiling **.03**: above that the trailing `d`/`h` stem loses 30-33% of its width while the `n`
stems in the same word are untouched, and that comparison sits right there on the card. At the
shipped .02 the frame cuts 1.2 / 6.2 / 5.7 / 2.2 / 1.9% of each rank's ink and 22-25% of that
trailing stem. **.005 is the entire runner-up treatment** and needs no other change — it
reproduces a window-fraction anchor's feed position to about 1px and is better than it on the
story.

**"Edge to edge" is verified as contact, not as arithmetic.** Every rank's ink meets both
frame edges over a real vertical run — left 49.5 / 70.9 / 83.8 / 89.8 / 97.3 canvas px, right
88.8 / 483.8 / 557.4 / 297.3 / 304.3 — so none of the five is touching at a single tangent
point that would read as a near miss.

**The story carries a band of empty photograph the feed does not, and that is the price of one
art size.** The same 1123.2 x 565-788 art sits in a 1224-tall window instead of an 856-tall
one, so it fills 46-64% of it against the feed's 66-92% and the tallest rank still clears the
panel by 345px. Closing that would need a story-specific scale, which is exactly the drift the
one-set-of-ratios rule forbids. `ordDrop` is the only lever, and it moves both canvases.

**`#bgord` is exercised on the feed only, and only by rank 1** — it is the sole rank whose art
reaches the panel at all (21px under at two blurb lines, 59 at three, 97 at four). On the story
every rank clears the panel by 309-569px.

**The numeral is a third full-bleed layer, and that is a deliberate exception to the grid.** It
ignores the 80px feed / 100px story margins by 101.6 / 121.6px, against the organic rule that
nothing drifts off the grid. It sits beside the background photo and the ground texture as
full-bleed, on the `tagent` slide kind only.

**AND ONE THING LEFT AS A DECISION RATHER THAN APPLIED.** Each file carries `stroke-width="1"`
in its own units, so a per-rank fit renders that hairline at k canvas px — **0.909 to 1.269, a
40% spread** across the series (2nd 0.909, 4th 0.998, 5th 1.025, 3rd 1.048, 1st 1.269) — in the
one element that survives to the bottom of every glyph. Every other hairline on this card is
exactly 1 canvas px: the top rule, the panel edge, the blurb rule. Normalising it is one
substitution per file, `stroke-width` pre-divided by that rank's own scale (0.78793 / 1.09970 /
0.95448 / 1.00229 / 0.97603), and it does **not** grey the line — measured peak alpha 128 in
both variants at both 1x and 2x, contradicting the claim that it trades width for alpha. It is
not applied because it edits supplied artwork and the instruction was "use these attached";
it is a judgement about the art, not a defect to correct silently. Worth knowing that the
variation is an artefact of the per-rank fit, not of the drawing — each file was drawn with a
1px stroke at its own size.

#### The card went WHITE, and the layer order is now the design

Supplied as a reference render plus an explicit stack, bottom to top: **white background /
top text / the ground texture / the numeral / the portrait PNG / the blurb container.** Six
layers, and the order carries three consequences that are bigger than they look.

**THE GROUND IS WHITE ON THIS ONE SLIDE KIND, and `ART.base` was not touched.** "Organic's
canvas ground is black — everywhere" still holds for the other six kinds; `ART.paper`
(`#FFFFFF`) is a per-kind ground selected by `kind === 'tagent'` in the base rect and in the
preview's `canvasStyle`. White rather than the existing `ART.warm` #FAF8F4 for a measured
reason: **a luminosity blend over a ZERO-SATURATION backdrop yields a neutral grey**, so a pure
white base plus the texture produces the reference's neutral **208-250** ramp, all channels
within 3 of each other. A warm base would tint the whole ramp.

**THE PORTRAIT STOPPED BEING A BACKDROP.** Standing it above the numeral makes it a CUT-OUT:
a rectangular photo put there covers the ground, the texture and the numeral completely, so
the transparency is what the design now depends on. Its ops are collected into a local
`bgOps` and pushed by the tagent branch at its own point in the stack; every other kind
pushes them immediately, in the old position and order. It keeps `isBg`, so the photo-strength
slider still reaches it and the SVG blur can still name it `#bgphoto` — only its place changed.

**THE NUMERAL IS WHITE ART ON A WHITE GROUND, so it had to be recoloured.** It is tinted at
the op — `tintFlat: ART.deep` with `alpha: TA.ordAlpha` — rather than by re-cutting five
base64 files. `tintFlat` keeps the art's own alpha and replaces only the colour, so the
per-path fades and the 1px silhouette all survive as transparency; and the ink stays a token
in `ART` where the no-literals rule wants it. Verified that `tintFlat` works on a nested-SVG
source at all: 27,795 ink pixels in and out, peak alpha preserved at 128, ink recoloured.
Measured strengths, strongest ink against the ground it sits on: **.10 -> 3.4% darker, .12 ->
4.3%, .15 -> 5.3%, .20 -> 7.7%, .30 -> 12.0%.** The reference reads about 7-8%, hence `.20`.

**THE TEXTURE GOES OVER THE TOP ROW, and that is safe — measured, not assumed.** A 30%
luminosity blend lifts the navy ink from #1A2942 to rgb(41,56,81)..(61,76,101), so the row
reads **6.6-7.4:1** where it would read 9.1-11.1 above the texture. Well clear of AA either
way, and it puts the type IN the image rather than on it. Swapping the two pushes is the
one-line alternative. **And the old dependency is gone entirely**: this ink used to sit over a
full-bleed photograph with no scrim at 3.74:1 on mid-grey and 1.44:1 on black. `SCRIMD.tagent`
(85) stays declared and unused; it is no longer a fix anything needs.

**THE PANEL OPENED TO .65, AND .65 IS A FLOOR RATHER THAN A PREFERENCE.** The blur barely read
at .82. The worst-case backdrop is no longer a photograph — it is the new white ground showing
through the glass — and white blurb copy over that measures **4.86:1 at .65, 4.15 at .60, 3.62
at .55, 2.45 at .40**, against AA's 4.5. So .65 is the most transparent this panel can be while
its own copy stays legible, and it shows **35% of the blurred backdrop against 18% at .82** —
the blur roughly doubles in read. Over a dark suit it is 14.6:1 at any of these. The reference
render appears to use about .35-.40, which measures 2.2-2.8:1; that is the one place this
deliberately departs from it.

**The preview mirrors the stack with Z-INDEX, not by moving DOM.** 1 top row / 2 texture /
3 numeral / 4 portrait / 6 panel, with the white ground on the canvas's own `background`. It
works for the same reason Campaign's overlap cutout does — `frameStyle` is `position:absolute`
with `z-index:auto`, so it is NOT a stacking context and its positioned descendants compare
against the canvas directly, alongside the canvas's own children. **Never give `frameStyle` a
z-index.** Z-index was chosen over moving nodes precisely because it leaves the other six
kinds' document order untouched. Every layer below the portrait is `pointer-events:none`, so
the image-slot stays the drop target and double-click-to-reframe is unaffected.

**The numeral's preview is a MASK, not a background-image** — `mask-image` takes the art's
alpha and `background-color` supplies the ink, which is exactly what `tintFlat` does on
canvas. A background-image would paint the art's own white and vanish on the white ground.

**`imgOWrapStyle` became `bgWrapStyle`, per-slide-per-size.** It was one top-level key shared
by every slide, so the portrait could not take a per-kind z-index. Every other kind gets
exactly the old object; the old key is deleted rather than left unread.

**Two corrections to numbers this section first published**, both found by putting the stack
to a review pass rather than by re-reading it:

- **The panel's floor was measured against the wrong ground and the wrong bar.** The first
  figure, 4.86:1, is over grey ~248 — the textured ground's local maximum. But the panel now
  sits over the PORTRAIT, so a white shirt or a blown highlight puts **pure white** behind the
  glass, where .65 gives **4.73:1** for `ink` #fff and **4.46:1** for `warm` #FAF8F4, the role.
  And 4.46 is not the AA failure it looks like: every run on this panel is >=24px (blurb 29,
  name 35, role 24), which is WCAG **large text**, so the bar is 3:1 and the true floor is
  about alpha **.515**. .65 is comfortable rather than marginal.
- **The luminosity blend's stated reason is dead.** It existed to take hue and chroma from the
  photograph underneath so five portraits read as one carousel — and the portrait is ABOVE the
  texture now. Over a zero-saturation ground `SetLum(white, L)` is `(L,L,L)`, so the blend is
  byte-identical to a desaturated `source-over`. It is retained for the one thing it still
  does: over the navy top row it preserves that hue at full strength where source-over would
  dilute it to 70%.

**And two layer-order consequences a review pass caught that I had not.** The canvas div does
**NOT** establish a stacking context — measured in Chrome, against what the spec text for
`container-type` implies: it computes `contain: none`, and a `zoom` other than 1 creates none
either. So the six z-indexes escaped the canvas box and were held in place only by
`overflow:hidden` and by happening to sit below `.p-dock` (30) and `.p-selctl` (40). A
tagent-only `isolation: 'isolate'` on `canvasStyle` confines them, and it is render-neutral for
a structural reason: the canvas paints its own opaque ground first and clips the texture to that
box, so the blend resolves against the same pixels either way. Separately, **`guideStyle` kept
`z-index: auto` and sank under all six layers** — the dashed margin guide invisible on the one
slide kind whose geometry had just been rebuilt, and only with guides on, so nothing would have
caught it. It is `zIndex: 7` in the tagent branch, above the panel, because an overlay that
measures margins has to sit on top of what it measures. **Do not put a z-index on the shared
`guideStyle` declaration** — that lifts it over `frameStyle`'s content on the other six kinds.

**The card now depends on the portrait being a CUT-OUT and nothing said so.** A rectangular
photo at layer 5 covers the ground, the top row, the texture and the numeral completely — in
both the preview and the export, consistently, so there is no mismatch to catch it. The guided
run's hint now asks for "a CUT-OUT PNG on a transparent background… so a rectangular photo
would cover it". The drop-zone placeholder still says the old thing; making it per-kind needs a
render key the markup does not have yet, and that is the next step if this bites.

**The agents template's own miniature followed the card.** It was wrong on three counts once
the ground went white: a dark ground, a `provident.` wordmark the ranking card has not carried
since it was rebuilt to the SVG, and the numeral in **#4E7A9E — the retired chrome blue, in
artwork**, against the binding rule. It is the white ground, the navy top row, the faint numeral
and the glass panel now. **The SPLASH miniature for the same template depicts the COVER and was
correctly left dark** — one template, two miniatures, two different slide kinds.
**SUPERSEDED for the splash: the cover is white now too, so that miniature had to follow it as
well.** See *The cover was rebuilt to the reference*. The two miniatures still depict two
different slide kinds; they simply both sit on paper now.

**Found and deliberately NOT fixed, because they are other templates:** the same retired
`#4E7A9E` still paints the weekly miniature's eyebrow flanking rules (two spans) and the review
miniature's stars. Same rule, same bug, outside this pass's scope.
**BOTH ARE GONE NOW, and not by being recoloured** — the whole hand-drawn "Pick a template"
skeleton was deleted when Organic's miniatures became real renders. That is the durable fix
for this class: a miniature that IS the render cannot paint a colour the render does not.
See *Organic's template miniatures are real renders*.

**Both of the panel's hairlines were halved by request** — the divider inside it `.5 -> .25`
(`ART.hair`) and its external stroke `.33 -> .165` (`ART.hairEdge`). Read as HALVE rather than
as set-to-.5, because set-to-.5 would have raised the stroke and left the divider untouched,
and neither is a reduction. **Both tokens are panel-only with one call site each** — `hair` at
the divider op and its preview mirror, `hairEdge` read only by `taVariant` — so neither reaches
another slide kind. Not to be confused with the chrome's `--ps-hair`, a different namespace.
Measured after: the divider reads **2.24:1** over the panel on a suit and **1.63:1** where the
white ground shows through it, and the external stroke's inner half **1.7 / 1.38:1** with its
outer half at 1.04:1 on the ground, i.e. invisible — as it already was. **The panel's boundary
is carried by the fill step, not the stroke**: panel rgb(103,113,129) against the ground's 230
is 4.0:1 on its own, so the edge survives the stroke being a whisper.

#### The panel's blur, and why 235 was rejected

`TA.panelBlur` is **30**, and the journey there is the useful part. It was 16 — documented as
"the house glass value", one number across three cards — then **235** by request, then 30 when
235 came back as too blurry. All three were rendered and measured rather than judged off the
preview alone.

**It reaches the ranking card ALONE.** The listed card's footer panel, its transferred-date
chip and the review card carry their own hardcoded `amount:` literals (16 / 10 / 16), so this
token is panel-local. The three cards no longer read as exactly one material, and 30 is close
enough to 16 that nobody will read it as a different one.

**What each radius actually buys, measured with a cut-out standing behind the glass** — the
panel's luminance spread across the blurb band, and what white copy measures on it:

| `panelBlur` | luminance spread | white copy, worst | best |
|---|---|---|---|
| 16 | 0.139 | 4.94:1 | 14.18 |
| **30 (shipped)** | **0.133** | **5.01:1** | 13.77 |
| 60 | 0.105 | 5.15:1 | 10.61 |
| 235 (rejected) | 0.032 | 5.46:1 | 6.54 |

**30 IS A MODEST CHANGE FROM 16, AND THAT IS WORTH SAYING PLAINLY** — spread 0.133 against
0.139. The suit behind the panel still reads as a shape; its edge is just softer. **60 is the
midpoint** if the shape should stop being recognisable without the backdrop going flat, and it
is the one number to reach for next. 235 averages the backdrop into a plane, which is why it
raises the worst case highest and why it was rejected: the glass stops looking like glass.

**A RADIUS OF 235 BROKE THE CANVAS RENDERER, AND THE FIX IS STILL HERE BECAUSE IT IS CORRECT.**
Three things in the `blur` op were fine at 10-16 and wrong at 235; all three landed in **both**
studios per the parity contract and all three are kept:

- **The sample pad was 2 sigma; it is 3.** At 2 sigma about 2.3% of the kernel's mass still
  falls outside the tile.
- **THE TILE'S EDGES WERE TRANSPARENT, and this one still earns its place at 30.** The panel's
  left edge sits 80 units from the canvas edge — a third of a sigma at 235, and still only
  **2.7 sigma at 30**, so a Gaussian reaches past the tile either way. Transparent padding
  composites as a fade to nothing. Measured on the old algorithm at 235: the blurred backdrop's
  alpha ran **147 at the panel's left end, 216 at its middle, 147 at the right** — a symmetric
  27% wash-out, so the panel's ends read lighter than its middle. CSS `backdrop-filter`
  **clamps** (it duplicates edge pixels), which is why the preview was right and only the
  EXPORT was wrong. The tile now carries `pad` of replicated border on every side — four corner
  pixels and four stretched edge strips, then the region over the top.
- **The padded tile can be sampled DOWN, and at 30 it is not.** `q = max(1, round(amount / 24))`
  targets ~24px of sigma in tile space; at 30 that computes to **1**, so this panel samples at
  full resolution exactly as it always did. It exists because at 235 the 3-sigma pad runs
  **~28M pixels per buffer** and Chrome hands back a BLANK canvas rather than throwing — the
  documented over-large-canvas trap. Every radius in use today is under 36, so `q` is 1
  everywhere and the branch is dormant.

**Two buffers, not one.** The replicated strips have to be blurred too, so the filter cannot be
set on the draw that composites the tile — it is an unblurred padded tile, then a blur into a
second canvas, then only the INNER region drawn back. The padding was scaffolding for the kernel.

**Proved nothing else moved, by running the old algorithm against the new one on the same
backdrop.** Isolating the blurred layer (ops before the blur, then each algorithm) is stricter
than comparing composites, because the translucent fill would hide part of any difference:

| | ops checked | worst RGB | mean RGB |
|---|---|---|---|
| Organic review card, feed + story | 2 | **0** | 0 |
| Organic listed card, feed + story | 2 | 5 | **0.02** |
| Campaign hook/price/steps glass, 2 palettes x 3 canvases x 2 export scales | 36 | **4** | 0.39 |
| Organic ranking card at 235, 5 ranks x 2 canvases | 10 | 5 | 0.9 — **worst ALPHA 152, the fix** |

**THE SVG FILTER REGION CHANGE IS HARDENING, AND THERE IS NO MEASURED DEFECT BEHIND IT.** The
region was a fixed `x="-20%" y="-20%" width="140%" height="140%"`, and a percentage of the
filtered element's bbox cannot state a radius: it gives 20% of the layer, 216/288 units, where a
235 radius wants ~705. It is `filterUnits="userSpaceOnUse"` with the canvas box grown by 3 sigma
now. **But the reasoning did not survive measurement, three ways:** byte-identical to the
percentage form at radius 14 (Campaign, worst **0/255**), 4-5/255 from the canvas either way at
235, and **1/255** apart on a synthetic worst case — hard black/white bands under a 235 blur,
which is the only shape that could truncate. Chrome expands the region enough on its own. Keep
the change because a percentage region is wrong in principle here; **do not claim it fixed a
seam.** This is the same trap as the overstated `#bgtex` and `#bgord` seams: state the
measurement or state that there isn't one.

**A MEASUREMENT THAT LOOKED WRONG AND WAS, worth keeping as the method note.** The first pass at
the radius comparison reported all three radii as near-identical and the panel as already
uniform — because the stand-in portrait was **not in the ops at all**. `buildOps` reads the
photo as `assets['bg' + bgi]`, and a hand-built assets map keyed only on `bgSidFor(slide)` does
not match; the panel was blurring a bare textured ground, which is smooth at any radius. The
tell was `ops.filter(o => o.isBg)` coming back empty. **Check the op is in the list before
trusting a number measured off the render** — a missing layer does not error, it just makes
every variant agree.

**Verified live at 30:** `TA.panelBlur` 30, `taVariant().blur` 30 — one source for both
surfaces — the preview computing `backdrop-filter: blur(30px)` on a node at `offsetLeft 80 /
offsetTop 999 / 920 x 351`, byte-for-byte the op's `x/y/w/h`, and `q` 1 with a 90-unit pad.

#### The cover was rebuilt to the reference, and it is the ranking card's stack minus the numeral

Supplied as a 1500x2000 render of the finished cover. **The whole point is that it is the SAME
stack the five ranking cards use**, so the two share `isPaper`, the ground texture and the
panel material rather than each carrying its own:

```
1 white ground   2 wordmark + headline   3 the ground texture
4 the portrait CUT-OUT                   5 the footer bar
```

**What the reference DELETES, and both are deletions rather than omissions.** The
"Top performers" eyebrow with its two flanking rules, and the two-column Month/Team meta row
that sat between a pair of hairlines above the wordmark. The bar carries the same two facts in
a quarter of the height. So `FIXEDTEXT.tacover` no longer claims an eyebrow the template does
not draw — it names what it really owns now, which is the whole derived headline and the word
"Team". `SKEL.tacover`'s pre-render bars followed. Op count went **19 to 11**.

**EVERY NUMBER CAME OFF THE REFERENCE AND THEN LANDED ON A TOKEN THAT WAS ALREADY THERE**,
which is the result worth recording:

| | reference, converted to 1080 | what ships | expression |
|---|---|---|---|
| wordmark baseline | 126.7 | 123 | `pT + tk.logo * .8`, unchanged |
| headline px | ~119 | 117.8 | **`tk.hero * 1.28`, the value that was already there** |
| headline lead | 129.6 | 129.6 | `hpx * 1.1`, also already there |
| line 1 / line 2 baseline | 352.8 / 482.4 | 349 / 478 | `logoBase + hpx * TA.coverHeadGap` |
| bar box | top 1216.8, h 136.1, r ~28.8 | 1214, 136, 28 | `H - pB - h`, `TA.coverBarH`, `TA.panelR` |
| bar padding | ~57 left, ~53 right | 55 | `TA.pad`, the ranking panel's own |
| period ink | 190.8 | 190.8 | `tk.eyebrow` at 500, `.14em` |

**The size did NOT need changing, and that is the finding.** `tk.hero * 1.28` was already the
expression on this slide, and it is 117.8 against about 119 read off the file. Replacing an
expression that lands inside the measurement error with a literal fitted to a hand reading
would have been a downgrade. What changed is the WEIGHT, the CASE and the LINE BREAK.

**WEIGHT 300 IS AGAINST THE BINDING RULE "headers are Regular 400", and this is the third time
the project has taken that exemption on the same measured finding:** at this size Regular reads
as a slab. Campaign's Jumbo (1.55x hero) and the listed card's status word both went Light for
it. Against the reference's own ink, 300 gives 545.7 on line one where 400 gives 550.9, and the
file reads about 522.

**THE HEADLINE IS TWO EXPLICIT LINES, AND THAT IS THE DESIGN RATHER THAN A CONVENIENCE.** The
reference breaks after "Agents"; a natural wrap does not. "Top Agents of" measures 690 against
a 920 column, so `wrapRuns` keeps "of" on line one and the break lands in the wrong place.
Narrowing the wrap column to force it would have to sit in the ~70px window between 612
("of the Month") and 682, which is fragile and moves with the period word. So `taHead` returns
`l1` and `l2`, only the period word is dynamic, and each line still goes through the wrapper as
a guard so a long period degrades onto a third line instead of running off the canvas. Title
Case cannot come from `toTitle`, which always capitalises the FIRST word and would give
"Of the Month".

**`.14em` IS NOT A TASTE CALL.** Solving the reference's two ink widths independently gives
**.157** from "AUGUST 2026" and **.123** from "PRIMARY SALES TEAM" — they disagree because
reading an edge off a screenshot is worth about +-10px at this scale. .14 splits them inside
that error, and it is the brand's own tracked-caps value, derived the same way and
independently for the listed card's status.

**THE BAR READS ITS MATERIAL FROM `taVariant`, THE SAME FUNCTION THE FIVE PANELS DO**, so the
cover cannot drift from them: navy at .65 over its own backdrop blur with a hairline edge. That
is the whole reason to share it rather than declare a second glass.

**THE PORTRAIT BECAME A CUT-OUT HERE TOO**, which is what `isPaper` on the `bgPush` deferral
buys: a rectangular photo at layer 4 covers the ground, the wordmark and the headline
completely, in the preview and the export alike. The guided run's hint says so, mirroring the
ranking card's. **SUPERSEDED — layer 4 is the five RANK portraits now and the cover has no
photo of its own at all.** See *The cover's group shot* below.

**THE SCRIM IS GONE.** It pushed two bands over a full-bleed photograph; the ground is white
now and the bar is its own glass surface, so a wash would only grey the paper. `SCRIMD.tacover`
(80) stays declared and unused, exactly as `tagent`'s does.

**A BUG THIS EXPOSED IN A SHARED HELPER: `drawLogo` HARDCODED `A.ink`.** That is `#fff` — right
on the five black kinds and invisible on the cover's paper, and invisible **in the export
only**, because the preview's `logoStyle` picks its colour separately. It reads `isPaper` now.
`tagent` never calls `drawLogo` (it has no wordmark), so that test only ever means the cover.

**AND THE COVER'S WORDMARK LINE-HEIGHT HAD TO BE SOLVED RATHER THAN INHERITED.** `logoBase`
sets none, so it inherited `canvasStyle`'s 1.3 and the preview's baseline landed **7.8px below
the op's**. That gap is pre-existing on every kind that draws a top wordmark and harmless
there, because nothing is measured against it — but on the cover the wordmark is the anchor the
headline's own offset is taken from, so it has to agree. A flex item's box top IS the frame's
padding edge, and the op puts the baseline at `pT + logo * .8`, so half-leading plus ascent
must equal `.8`: **`lh = px * (1.6 - a + d)`**. The other kinds were deliberately left alone.

**Preview against ops, in one coordinate space:** headline first baseline **348.85 against
349**, its box `left 0 / width 1080 / fontSize 117.72 / lineHeight 129.49 / weight 300 /
rgb(26,41,66) / centre`; the bar `left 80 / top 1214 / 920 x 136 / radius 27.97 /
blur(30px) / rgba(26,41,66,.65)` — byte-for-byte the op; the two bar labels' baseline
**1290.6 against 1291**, `left 54.97` and `right 54.97` against `TA.pad` 55.

**Contrast on the bar, over the portrait as composited:** white period **13.99:1** worst,
brass team **4.66:1** worst. Both runs are >=24px tracked caps, so the bar is WCAG large text
at 3:1 — and the brass clears the body bar of 4.5 as well.

**Proved nothing else moved, at the op level.** Op signatures over 4 templates x every slide x
both canvases against the pre-change file served alongside: **22 groups, 20 byte-identical, and
the only 2 that changed are the two `agents/tacover` groups.** The five ranking cards are
byte-identical, which is what proves the `pushTex()` extraction and the `isPaper` swaps moved
nothing; weekly, listed and review are untouched.

**A PROBE TRAP WORTH MORE THAN THE CHECK IT BROKE: AN SVG RASTERISED THROUGH `new Image()`
CANNOT LOAD THE PAGE'S WEBFONT.** A data-URI SVG is an isolated document with no access to
external resources, so every glyph falls back to a system face. Comparing canvas against SVG at
a point inside glyph ink therefore reported **165/255** and looked exactly like a broken export.
Strip every `<text>` from BOTH sides and the non-text layers agree to **12/255 across 3,948
sample points**. So compare fills, blurs and images this way and never glyph positions — and
note the earlier ranking-card figures (0-5/255) were all sampled on fills for that reason,
without the reason being written down.

**Noticed and NOT changed, because nothing asked for it:** `renderOpsToSvg` emits
`font-family="Google Sans Flex, Google Sans Flex, sans-serif"` — the family is duplicated. It is
harmless (a repeated family in a font stack resolves to the same face) and pre-existing, and it
sits in a shared renderer path.

#### The cover's group shot: five floating, scalable rank portraits

By request the cover composites **whatever was uploaded on the five rank pages**, each figure
floating and scalable the way Campaign's uploaded SVG/PNG is — and with a **layer order that is
fixed rather than a default**.

**THE ORDER IS THE SPEC AND IT LIVES IN ONE ARRAY.** Given from the top down as
1st centre / 2nd left / 3rd right / 4th extreme left / 5th extreme right, so
`TA.GRPZ = ['5th','4th','3rd','2nd','1st']` is its reverse, which is paint order. `buildOps`
pushes in that order and the preview takes each figure's `z-index` from its index in the same
array, so the export and the editor cannot stack them differently. Verified: ops emit
`bggrp5th → bggrp1st` and the preview computes z **3,4,5,6,7** on the matching boxes.

**THE COVER HAS NO PHOTO OF ITS OWN ANY MORE.** It reads the rank slides' photos through the
same `bgIndexFor` those slides draw with, so there is never a sixth upload of five files
already in the project. `gdWantsPhoto` returns false for `tacover` and the preview sets
`bgWrapStyle: {display:'none'}` — leaving a drop target that is never drawn is worse than
having none. `bgOps` still collects on this kind because the prelude is shared; nothing reads it.

**`grpLayers` TAKES A RESOLVER, NOT AN ASSETS MAP, and that is the whole reason one function
can serve both surfaces.** `buildOps` has decoded `Image`s to hand; the preview only has
`_assetView.bgDims`, which the rAF tick measures off the store. `resolve(si) -> {u,w,h}` is the
narrowest thing both can supply. Two geometry paths here would drift exactly as the spec row's
three layouts once did.

**Defaults are FRACTIONS of the canvas** — `TA.GRPD`, x/y for the centre and `s` for the
fraction of canvas HEIGHT the box spans — so one value serves the feed and the story alike,
which is the same reason Campaign's floating graphic stores a fraction. The x values are
symmetric about .5 and read left to right as **4th / 2nd / 1st / 3rd / 5th**, centre figure
largest and highest, which is the arrangement the reference draws. Measured on the feed: centres
at **119 / 319 / 540 / 761 / 961**.

**THE DRAG NEEDS NO ZOOM MATHS**, for the same reason Campaign's does not: the fraction delta is
the CSS-pixel delta over the canvas's ON-SCREEN size. Here that number is the local `width`,
already in scope inside `mkCanvas` — Campaign reads it out of a `data-cwpx` attribute only
because its handler is built where it cannot see it, so **Organic needed no markup attribute for
this**. Verified with a REAL mouse drag: 4th went from `.11/.73` to `.2941/.6601` against a
predicted `.2918/.6618`, inside 0.002.

##### IT SHIPPED DEAD, AND THE TEST THAT PASSED IS THE LESSON

The first cut of this was **not draggable at all**, and it passed a test. Two separate faults,
both worth keeping:

**1. `frameStyle` IS `pointer-events:none`, AND THAT INHERITS.** The figures were put inside it
— that frame exists so the canvas stays clickable and the image-slot beneath stays the drop
target — so every figure computed `pointer-events: none` and no pointer could ever reach one.

**A SYNTHETIC EVENT DOES NOT HIT-TEST.** `el.dispatchEvent(new PointerEvent('pointerdown'))`
invokes the handler directly, so a drag driven that way "works" perfectly on an element nobody
can touch, and the arithmetic checks out to four decimals while the feature is inert. **Prove
REACHABILITY separately from the handler**: `document.elementFromPoint` at the element's own
centre, or a real pointer. Use synthetic events only for the maths.

**And `elementFromPoint` has its own precondition:** it returns `null` for every point when the
Browser pane is hidden, because the viewport is then **0 x 0** — it returned null even at the
canvas's top edge, which briefly looked like more evidence of the bug it was not measuring.
`resize_window` first, then hit-test. (The computed `pointer-events` value is what actually
carried the diagnosis; it is viewport-independent.)

**2. A CUT-OUT'S ELEMENT BOX IS RECTANGULAR, so box hit-testing hands the wrong figure.** Even
with pointer events restored, the top figure's transparent margin swallowed the clicks meant for
the ones behind it: measured **18%** of the 4th and 5th figures grabbable, in a narrow band. Five
overlapping boxes make this far worse than Campaign's single floating graphic, where the same
property is harmless.

So the architecture changed rather than the styling. The five figures are **paint only**
(`pointer-events:none`), and ONE hit layer spans the canvas at z 8, resolving the pointer
against each figure's **ALPHA**, top down, through `grpHitAt`. The alpha maps are 120px-wide
`Uint8Array`s built by the same `_refreshAV` tick that measures the photo — about 50KB for five
— and a missing map falls back to the rectangle, which only ever applies for the frame before
the first render lands. Handles moved onto their own overlay at z 11, because a child of a
`pointer-events:none` figure could never be grabbed either.

Measured after, as the share of each figure's own opaque ink that selects that figure:
**1st 100%, 2nd 75%, 3rd 76%, 4th 69%, 5th 69%** — up from 18%. The remainder is where a higher
figure's *body* genuinely covers a lower one, which is correct: you cannot grab what is hidden
behind a person. A real mouse drag on 4th, the worst case, now works.

**Nothing hit means let it through** — no `stopPropagation`, no `preventDefault` — so the click
still bubbles to the canvas and `sl.activate` keeps working, and clicking empty ground clears the
selection. The layer also sets its own cursor on `pointermove`, because a static `cursor:move` on
a full-canvas layer would claim the whole canvas is draggable.

**A corner scales PROPORTIONALLY** — height is the stored axis and width follows the art's own
aspect, so a figure can never be distorted. All four corners grow when dragged outward, by the
same amount: `.58 -> .68` for a 5%-of-height drag on each of nw/ne/sw/se. **SUPERSEDED — the
scale anchor is the figure's BOTTOM now, so the gain halved and the same drag gives `.58 -> .63`.
See _THE BOTTOM IS THE SCALE ANCHOR_ below.** Clamped to
`TA.grpMin/grpMax` (.12 to 1.6); a tight headshot legitimately needs to go over-tall. Verified
with a real corner drag too: `.53 -> .7039`, the drawn box's aspect exactly the file's
(0.55914 both), and x/y untouched by the scale.

**ONE UNDO ENTRY PER GESTURE, not one per pointermove.** The move writes through raw `setState`
(no undo, no localStorage) and the release commits — `_undoStack` is only 5 deep, so a per-frame
push would erase real history. Campaign's own graphic drag makes no undo entry at all; this is
strictly better. `_grpSel` (which figure shows handles) lives on the **instance** with
`forceUpdate`, per the standing rule that throwaway UI has no business in the saved project.

**EACH FIGURE IS A NAMED SVG LAYER, and it had to be a GENERIC name.** Only one op may carry
`id="bgphoto"` — an SVG cannot repeat an id — and the footer bar's blurred backdrop re-draws
layers *by name*, so without this SVG glass would blur the ground and the texture and lose the
five people standing directly behind the bar. The `image` op takes **`layerId`** now, in both
studios per the parity contract; the three existing booleans stay for the ops that read them.
Verified: the exported bar's backdrop reads
`<use #bgtex/> <use #bggrp5th/> … <use #bggrp1st/>`, all five present.

**A DEBUGGING TRAP THAT COST A ROUND, and it was my probe rather than the code.** I selected a
corner handle with `getComputedStyle(h).right !== 'auto'`, expecting the unset side to report
`auto`. **It does not** — the browser resolves both insets from the box, so `nw` reports
`right: 412.172px`. The selector silently grabbed the NW handle, dragging it "outward" ran
inward, and the scale appeared to shrink. Handles carry **`data-gdir`** now, the way Campaign's
do, so the DOM says which corner it is. **Identify an element by an attribute you set, never by
inferring it from a computed geometry value.**

**Proved nothing else moved.** Op signatures over 4 templates x every slide x both canvases,
against a baseline from **before both cover passes**: **22 groups, 20 byte-identical, and the
only 2 that differ are the cover's own.** That covers the `layerId` renderer change as well —
Campaign still loads, renders both paths clean and still emits `#bgphoto`.

**The cover's Eyebrow input went with the eyebrow.** The reference dropped that line, so the
field edited a value nothing draws — which is worse than a missing control, because it looks
like it works. `f.eyebrow` is left on the slide rather than migrated away: it costs nothing and a
saved project keeps whatever was typed. **The SEED went too, one pass later** — `tplSlides`
was still writing `eyebrow: 'Top performers'` into every new project, so the value nothing
renders was being created fresh each time. See *The app-wide dead-feature audit*, #6.

**PARTLY APPLIED SINCE: the figures still SIT by their file box, but they SCALE and PIN by
their ink.** The landing place and the drag are unchanged — a cut-out with a lot of transparent
margin still arrives smaller and higher than its neighbours until it is touched. What now reads
the ink is the bottom anchor, and it needed no `inkBox` call at all: the alpha map the hit test
already builds carries it. See *THE BOTTOM IS THE SCALE ANCHOR* below. Making the landing place
itself ink-relative is still the thing to reach for if a fresh group reads as badly aligned.

##### CHOOSING a layer is a RAIL control; MOVING one stays a canvas drag

Asked for because the five figures were "really hard to control". The alpha-accurate hit
test raised the grabbable share of each figure from 18% to 69–100% and that was as far as
clicking can go — **a figure standing entirely behind another has no reachable ink at all,
so no hit test of any accuracy could ever select it.** Selection is therefore a rail
control. The drag stays on the canvas, by request.

`Group photo layer` is one group in *This slide*: a row of five pills, a hint, a size
slider and two buttons.

- **The pills are the fixed spec order, front to back**, read off `TA.GRPZ` **reversed** —
  the same single array `buildOps` pushes in and the preview takes its z-index from, so the
  list cannot claim an order the artwork does not have.
- **A rank with no portrait yet is still listed**, quiet at `opacity:.38` and inert. A list
  of three where the stack has five reads as a bug; the hint says which are still waiting
  (`0 of 5 placed — 1st, 2nd, 3rd, 4th, 5th still need a portrait.`).
- The Size row and both buttons render **only while something is selected** — a disabled
  slider is worse than a line saying what to do first. Nothing is selected on arrival, so
  opening the cover does not draw a selection outline nobody asked for.
- It is a **gated group, not a `slideFields` row**. None of the six row types
  (`isInput`/`isArea`/`isSeg`/`isSelect`/`isStep`/`isNote`) fits a picker-plus-slider-plus-
  buttons object, and inventing a seventh to hold one control is worse than the gate the
  QR groups already use.
- `_grpSel` stays on the **instance** with `forceUpdate`, per the standing rule — the rail
  and the canvas read the same field, so they cannot disagree about what is selected.

##### THE BOTTOM IS THE SCALE ANCHOR, and it is the INK's bottom

By request a figure grows **upward** rather than out of its own centre: these five people
stand on a floor, and centre-anchored scaling lifted their feet so every size change needed
a second drag to undo.

**STORAGE DID NOT CHANGE, and that is what makes it provable.** `y` is still the CENTRE
fraction, `grpLayers` is untouched, `TA.GRPD` is untouched. What changed is the
**operation**: every path that writes `s` now also writes the `y` that holds the bottom.
Op signatures over 4 templates x every slide x both canvases, **with all five portraits
loaded so the cover's group ops are in the comparison: 22 groups, 22 byte-identical.**

Three functions, and every scale path reads them so the rail slider and the canvas corner
drag cannot anchor differently:

```js
grpInkBot(u)                       // the ink's bottom as a fraction of the box height
grpScaleY(fy, sOld, sNew, ib)      // fy' = fy + (sOld - sNew) * (ib - .5)
grpPinY(sNew, ib)                  // fy  = 1 - sNew * (ib - .5)
```

The derivation is one line: the bottom sits at `fy + s * (ib - .5)` of the canvas height, so
holding that constant gives `fy' = fy + (s - s') * (ib - .5)`. With `ib = 1` that is
`fy' = fy + (s - s')/2` — the centre rises by half of whatever height is added.

**THE ANCHOR IS THE INK, NOT THE FILE BOX, and that is the whole difference between a
figure standing on the floor and one hovering above it.** A cut-out exported with
transparent padding underneath is exactly the case a box anchor ruins — and this is the
first thing in the group-shot feature to need `inkBox`-class precision, which was
previously logged as "left as a decision, not applied". **It cost nothing: the alpha map
`grpHitAt` already builds is what it is read from**, scanned once per URL for the last row
carrying alpha > 24 and cached on the instance. `1` — the box's own floor — is the honest
fallback for the frame before the first render lands.

Measured on a synthetic cut-out with **15% transparent padding at its bottom**: the map
reported the ink bottom at **0.8519** against the 0.85 baked in (one row of a 270-row map),
and `Stand on bottom` put its **ink** on canvas y 1439.9 of 1440 while its **file box**
overshot by 63.9 — which is precisely the padding, and precisely what a box anchor would
have got wrong.

**Verified across sizes, and the anchor is exact.** Driving the rail slider on that same
figure, `s` .53 → .90 → .30: the ink bottom held at **1319.7 at every size** while the top
moved 669.6 → 215.7 → 951.7. Pinned, then scaled to 140%: ink bottom **1440.0**, unmoved.

- **`Stand on bottom`** pins the selected figure; **`Stand all`** levels every placed
  figure in one press, because five people standing on ONE floor is the point of a group
  shot and five separate presses is not. Measured after: all five ink bottoms on 1440.0.
- **The clamp on `y` had to change with it.** 0..1 on the centre cannot survive a bottom
  anchor — scaling a high figure up legitimately drives its centre above the top edge, and
  clamping there would silently break the very anchor this exists for, the figure creeping
  down as it grew. `grpClampY` allows `[-s/2, 1 + s/2]`: the box must still **overlap** the
  canvas. **The move drag had to take the same clamp**, or a figure scaled tall would snap
  down the instant it was dragged.
- **THE CORNER DRAG'S GAIN DROPPED FROM `dd * 2 / ch` TO `dd / ch`.** Centre-anchored,
  adding `s` moved each edge half as far, so the doubling was what made the dragged edge
  track the pointer. Bottom-anchored, the TOP edge takes the whole change — so the plain
  ratio tracks it and the old factor would run the top at twice the pointer. This
  supersedes the recorded "`.58 -> .68` for a 5%-of-height drag"; the same drag now gives
  `.58 -> .63`.
- **All four corners now grow upward.** A south handle still resizes but has no edge of its
  own to follow, which is the honest consequence of anchoring the bottom rather than a
  reason to delete two handles that work.

**Verified with REAL pointer drags, not synthetic events** — the rule this feature earned.
A real drag on 1st's NW handle: `s` .58 → **.6823** against a predicted .6821, the top
590.4 → 443, and the ink bottom held at **1425.5 against 1425.6**. A real drag on the hit
layer afterwards: `fx` .5 → **.4** and `fy` .6488 → **.567**, both exact to the pixel,
`s` untouched and **no snap to 0/1** — which is the clamp change proving itself.

**Preview against ops in one coordinate space, after all of it:** the five figures' boxes
agree to **0.5 canvas px** (the DOM reports `offsetLeft/Top` as integers, so that is the
rounding), with the ops emitting `bggrp5th → bggrp1st` and the preview computing z 3 → 7 on
the matching boxes.

**The empty case was exercised rather than reasoned about** — this feature's own lesson is
that it shipped dead and the test passed. With the five portraits removed from the store:
five quiet pills, `0 of 5 placed` naming all five, no handles, `Choose a layer above to size
it.`, and clicking a placeholder pill neither throws nor selects.

#### TWO SILENT BUGS IN THE SVG tintFlat BRANCH, in BOTH studios

Found because the new numeral is the first op to use `tintFlat` together with `alpha`.

- **`alpha` was never emitted.** The branch paints `<rect … fill=tint mask=…>` and wrote no
  `opacity`, so a tinted op exported at FULL strength while the canvas honoured the alpha. The
  numeral is tinted at .2, so it would have exported **five times too dark** — and only in the
  SVG.
- **A tinted op could not be a named backdrop layer.** It paints a `<rect>`, not an
  `<image>`, so it never reached the `bdIds` branch and a panel's blurred backdrop could not
  re-draw it.

**And a third, found by the same review pass and fixed with them: `blend` was dropped too.**
The canvas tint path honours it; the SVG one did not. Nothing emits `tintFlat` + `blend` today,
so it is hardening — but a capability handled on one side only is precisely what the parity
contract exists to prevent, and it was left behind in the very edit that fixed `alpha`.

**A tinted op paints a `<rect>`, not an `<image>`, and that shape difference is the lesson.**
Every capability added to the `image` op has to be checked against BOTH branches of
`renderOpsToSvg` — the plain one and the tinted one. `alpha`, `blend` and the named-layer id
were all present in the plain branch and absent from the tinted one.

All fixed in Organic and Campaign. Verified live:
`<rect id="bgord" … fill="#1A2942" mask="url(#fm1)" opacity="0.2"/>`, and the panel's backdrop
now reads `<use #bgtex/><use #bgord/><use #bgphoto/>` in paint order. Canvas against SVG across
the whole card: **0-3/255 at every sample point.**

**Proved nothing else moved, again at the op level** — this pass touched genuinely shared code
(the base rect's fill, the `bgOps` indirection, the texture's relocation out of the prelude,
both SVG renderers). Op signatures over 4 templates x every slide x both canvases against the
pre-change file: **22 groups, 12 byte-identical — weekly, review, listed and the agents COVER —
and 10 changed, exactly the ten `agents/tagent` groups**, at an unchanged op count of 29. The
order tells the whole story:

```
pre:   rect  image* image*  text text rect  image*        blur rrect ...
post:  rect  text text rect  image* image* image*         blur rrect ...
       ground  toprow+rule   texture numeral portrait      panel
```

#### A pre-existing bug this pass exposed: an if/else chain was SPLIT

Found by the trap sweep, not by looking. The ground-texture pass inserted
`if (kind === 'tagent') K.taTexStyle = …` between the `logoStyle` chain's last `else if` and
its terminating `else` — which **re-bound that `else` to the new `if`**. So every slide kind
that is not `tagent` had its `logoStyle` overwritten with the default, and the wordmark sat at
the TOP of the card in the editor while the op drew it at the bottom, on five of the seven
slide kinds. The ops were untouched, so **only the preview lied** — which is why nothing
caught it.

Verified fixed off the DOM rather than the source: cover and cta now compute `order: 2` with
`margin-top` resolving to ~899px and the wordmark at `offsetTop` **1297** of 1440. Before the
fix it would have been `order: 0` at `offsetTop` 0.

**An if/else chain has no syntax to protect itself. Add a per-kind key AFTER the chain's
terminating `else`, never inside it** — the comment above the block now says so.

### Left as proposals, not applied

- **Organic's type tokens are mostly off the brand's own scale.** Against the minor third
  ×1.200 from the 2.2cqw floor (23.8 / 28.1 / 34.6 / 41 / 49.7 / 59.4 / 71.3 / 85.3 / 102.6 at
  1080): **3 of 15 land on a step** (eyebrow, cta, role), eight are near-misses and three are
  **below the floor** — `specLab` 19, `priceLab` 22, `listno` 22, against a 23.8 minimum that
  exists so nothing is unreadable at feed size. Five of the eight are within 2.5% and snapping
  them is visually free; `hero` +7.9%, `ptitle` −7.4%, `name` −7.5% and `rname` +6.8% are a
  visible change. Not applied because `PXT` re-flows every saved post, and because the scale is
  written down as a *campaign* rule — extending it to Organic is a decision.
- ~~**The review card is the weakest of the four**~~ — **DONE.** All five faults below were
  fixed by rebuilding it to `Instagram Story - 39.svg`; see *The Google reviews card was
  rebuilt*. Kept as the record of what was wrong, because the list is what the rebuild was
  measured against:
  four type sizes inside one 30–34px band with everything centred, the quote no larger than its
  own attribution, two attributions in two places for one review, ~230px of dead canvas below
  the panel, and a circle-cropped avatar that contradicts the listed card's "never cropped to a
  circle".
- **`ruleQ` / `ruleM`** collapsing to one hairline weight.

## The app-wide dead-feature audit, and the ELEVEN fixes it produced

Asked for as a read-only sweep — "any feature that doesn't have a purpose" — then actioned in
full. The two examples given (the scrim on Top agents, the background upload on the cover) were
both real, and both turned out to be the same defect: **a control that outlived the render it
drives.** Everything below is chrome, gating or deletion. Proved at the op level:
**22 slide-by-canvas groups, all 22 byte-identical** against a baseline taken before the pass,
so not one pixel of artwork moved.

### THE GENERAL FIX IS A PREDICATE DERIVED FROM THE RENDER, not a hand-maintained list

Both examples had a control asking for a value the artwork could not use, and in both cases the
render already knew the answer. So the fix is a named predicate sitting beside the function it
is derived from, read by **every** surface — the rail, the guided run, the status line, the
export guard, the asset writer — so the control cannot again disagree with the render:

```js
// beside scrimBands, and derived from it
scrimUsed(state) {
  const tk = OrganicStudio.PXT.ft;
  // The `sl.kind === 'review'` clause that was here is GONE — it stood in for the old
  // full-canvas black rect, and the review's wash is a fixed navy ramp now. See the review
  // rebuild's own section.
  return (state.slides || []).some(sl => this.scrimBands(sl, tk).length > 0);
}
// beside bgSidFor
// `award` and then `review` joined it: THREE kinds now draw no uploaded background.
static photoUsed(kind) { return kind !== 'tacover' && kind !== 'award' && kind !== 'review'; }
photoOwn(sl) { return !!sl && OrganicStudio.photoUsed(sl.kind) && this.bgSidFor(sl) === sl.id; }
```

Measured, live, on all four templates: `scrimUsed` is **false on agents alone** and true on
listed / weekly / review — which matches the evidence that opened the audit (on the agents
template all 12 slide-by-canvas groups render byte-identically at scrim 20 against 90, with zero
scrim ops, while listed 2/2, weekly 6/6 and review 2/2 all change). `photoUsed` is **false on
`tacover` alone**.

**BOTH NUMBERS HAVE MOVED SINCE, and only because two more templates arrived.** With the award
and the rebuilt review in place: `scrimUsed` is false on **agents, review and award**,
`photoUsed` is false on **`tacover`, `award` and `review`**, and a third predicate of the same
shape — `imgOUsed` — is false on **review and award**. The method is unchanged; the tables are
not the fact, the derivation is.

**`scrimUsed` asks about the WHOLE PROJECT, and that is deliberate.** `scrimH` is project level
and the label says "all slides", so a per-active-slide test would make the control blink as you
move down the rail. No template mixes the two kinds, so nothing is lost.

**`photoUsed` and `photoOwn` are TWO tests, not one.** `photoUsed` is "is a photograph drawn on
this kind at all" — false only on the ranking cover, which composites the five rank portraits.
`photoOwn` is "does this slide supply its own file" — also false on a `cta`, which shares the
cover's photo. Collapsing them would have taken the CTA's shared photo out of the export.

### What each fix was

| # | what was wrong | fix |
|---|---|---|
| 1 | the wash slider on a template that takes no wash — **and** the guided run's Look step asking for it | both gated on `scrimUsed` |
| 2 | a Background image drop zone, a guided ask, a status line and an exported `photo-01-cover.*` on the kind with no photo of its own | all four gated on `photoUsed` / `photoOwn` |
| 3 | the guided run's story copy said the story "is exported alongside" after the export learned to skip it | both notes read `s.storyOn` |
| 4 | **Campaign's `guidesOn` was declared TWICE in one object literal** | split into `guidesOn` / `guidesBtnOn` |
| 5 | `static slide()` stamped `scrimH` on every slide from `SCRIMD`; only slide 0's copy was ever read | the default is taken from the opening slide's KIND |
| 6 | the cover seeded `eyebrow: 'Top performers'`, an element the rebuilt cover does not draw | seed dropped |
| 7 | `TIERNAMES.tacover` was missing, so the cover's fields had no group headings | `['Period', 'Team']` |
| 8 | the retired in-editor wizard — ~330 lines of markup, 49 CSS rules, ~40 render keys | **deleted** |
| 9 | Campaign's *Overlap image* group, a second control on the slot Organic's *Parallax layer* already owns, behind `fgAllowed: false` | **deleted** |
| 12 | Photo strength was wired end to end and had **no control in the advanced rail** | added to the Canvas group |

Two were carved out and are recorded at the end rather than actioned.

### #4 IS THE ONE WITH A USER-VISIBLE CONSEQUENCE, and it is a JS-object trap

`renderVals` declared `guidesOn: this.props.showGuides ?? false` and then, ~15 keys later,
`guidesOn: false,   // flip to true to bring Download layout guides back`. **A later key in the
same object literal silently wins**, so Design Cursor's own `showGuides` prop could never turn
the dashed margin overlay on in Campaign — while Organic, which declares the key once, worked.
Parking a *button* had killed an unrelated *overlay*.

Two concerns need two keys: `guidesOn` is the overlay (three `<sc-if>` sites, one per canvas),
`guidesBtnOn` parks the button. Verified by standing in for the prop: `showGuides: true` now
gives `guidesOn: true` with `guidesBtnOn` still false.

**There is no syntax error and no warning for a duplicate key in an object literal.** The check
is mechanical and worth running after any large `renderVals` edit: collect the top-level `key:`
names in the literal and look for a repeat.

### #8 — THE RETIRED WIZARD WAS NOT INERT, IT WAS BROKEN CODE THAT STILL RENDERED

`wizOn` was hard `false` and the markup was left in place "so nothing else has to be re-wired".
Two live defects were sitting inside it, and neither could ever be seen:

- **Its Files step called `doExport('zip')`.** `zip` is not one of the raster kinds, so it fell
  through to the `else` branch and wrote **SVGs** under a button labelled "Download zip". This is
  the same bug the guided run's Save-all button had, fixed there and left here.
- **Its PDF button read `exportPdf`, a key nothing declares.** The interpolation sweep found it:
  **17 unresolved keys before, 16 after, and the one that went is `exportPdf`.**

Deleted whole: the two `<sc-if wizOn>` rails, the `<sc-if wizAdvanced>` wrappers around the real
ones (hard `true`, so removing the wrapper is render-neutral), the wizard-only story note,
`static WIZ`, `wizIssues`, and every `wiz*` render key — plus `exportZip`, `zipLabel`,
`pdfLabel`, `nameHint` and `exportBtnStyle`, which had no other reader. **332 lines net.**

**The CSS check is `added === 0`, not the rule count.** Main sheet **902 → 852 rules**, and every
surviving rule byte-identical to one in the baseline: the 50 removed are 49 pure `.wz-*` rules
plus `.p-meta-q`, which went with its one user. Counting alone would have missed a silently
*altered* rule — the failure this project has hit before, when a scripted CSS edit swallowed half
a stylesheet as nested CSS.

**Six `.wz-*` selectors survive inside SHARED selector lists** (the pill sweep, the type-role
lists, the focus-ring list) and are left exactly as they are, by the rule the two-document split
established: a selector that matches nothing costs nothing, and rewriting a shared selector list
does. Campaign's seven mentions are the same case and were not touched.

### #5 — THE PER-SLIDE `scrimH` WAS DEAD EVEN BEFORE THIS, and measuring said so

`static slide()` wrote `scrimH: SCRIMD[kind]` onto every slide and the only reader was
`normState`'s `p.scrimH = (p.slides[0] && p.slides[0].scrimH) || 50`. But `defaults()` already
sets `scrimH: 50` and `pickTpl` builds from `defaults()`, so `p.scrimH` is never `null` on a new
project and **that line never fired**. Measured on the pre-change build: a new project is
**50 on all four templates** while the slides carried 75 / 80 / 80 / 70 that nothing read.

So `SCRIMD` is what it always meant — the default for the PROJECT-level value, keyed by the kind
the project opens on. `normState` reads it from `p.slides[0].kind` now, with a legacy per-slide
value still winning. Verified on every path, before against after:

| | PRE | NOW |
|---|---|---|
| new project, all four templates | 50 | **50** |
| legacy file, per-slide 62, no project value | 62 | **62** |
| legacy file, neither — listed / review | 75 / 70 | **75 / 70** |

`SCRIMD` keeps its `tacover` and `tagent` entries: they are inert (those kinds take no wash) and
the table is more useful as a complete list of the kinds.

### #12 — a control can be missing from the ONE screen that is supposed to have everything

Photo strength had state, both renderers, the preview and the guided run's Look step, and its
`imgOVal` / `onImgO` keys were read **only by the retired wizard's markup** — so deleting the
wizard would have removed the value's last control entirely. It is a group in the Canvas section
now — **gated on `imgOUsed` since the review rebuild**, and it was ungated here because every
kind then either carried a background photograph or, on the ranking cover,
the five group figures. Verified end to end at 45%: state 45, label "45%", the preview's
`.canvasbg` at `opacity: 0.45`, and `imgAlpha` — the single source the op reads — at 0.45.

**The lesson is the direction of the check.** The rule in this file is that the guided run is a
projection of the advanced workspace; this was the reverse — a value the run asked for that the
workspace could not set. Check both ways.

### What a pre-change project does on load, measured rather than assumed

A project shaped exactly as the old build wrote one — per-slide `scrimH` from `SCRIMD`, the
cover's seeded `eyebrow`, a stale `wizStep` — loads with **6 slides, `scrimH` 62 (the user's own
value), no migration warning, and no console error.** The stale fields ride along unread;
`normState` deliberately does not strip them, because a field that costs nothing is not worth a
migration that can fail.

### A PROBE TRAP THAT INVALIDATED A WHOLE MEASUREMENT: `eng.state` IS GETTER-ONLY

Testing the guided run per template by assigning `E.state = {…, tpl}` **silently did nothing** —
`state` is backed by one slice of the shell's state and has a getter with no setter, so the
assignment neither threw nor took. Four templates therefore reported the *live* project's answer
four times, which read as "the scrim ask is gone everywhere" — a fix that looked broken and was
not. The tell was `guideSteps()` returning the same five steps for weekly, which is documented to
drop the Agent step.

Anything reading `this.state` has to be tested on a real project of that template. Anything
taking a state argument — `scrimUsed(state)`, `normState(p)`, `buildOps(state, …)` — can be
tested directly, which is one more reason to write it that way.

### The two carve-outs, flagged rather than guessed at

- **Campaign's Design system sheet.** The audit can see that the top-bar button is commented out
  while `specPages` / `specDownload` and a 5-page PDF writer are live and correct. The two
  possible fixes are *opposite* — restore the button, or delete a working feature — and the file
  records the button as "parked, not removed" for a later release. That is a product decision,
  not a defect.
- **Renderer capabilities with no emitter.** Organic handles `grad` and `stroke`/`sw` on a `text`
  op and emits neither since the ranking ordinal became art; Campaign handles `blend`,
  `layerId`, `#bgtex` and `#bgord` and emits none. **Recommendation: leave them.** Deleting one
  edits the paint path for every slide kind on both canvases to remove a guarded branch that
  costs nothing, Campaign's hero is still a live `grad` emitter, and the parity contract exists
  precisely because an op handled on one side only is how Campaign's glass came to export flat.

## The weekly template was rebuilt to three supplied SVGs

`Cover.svg` / `CTA.svg` / `Property.svg`, all 1080x1440, one per slide kind — and `cover`,
`cta` and `prop` are used by **no other template**, so the whole change is scoped to weekly
by construction. Proved at the op level: **22 slide-by-canvas groups, 16 byte-identical, and
the only 6 that changed are the six weekly ones.** Listed, all six agents slides and review
are untouched.

The instruction was to copy the drawings accurately but never against the design guide —
"guide is key". Four places they disagreed, and each is called out below.

### MOST OF THE DRAWING'S NUMBERS WERE ALREADY TOKENS, which is the finding

| drawn | token | |
|---|---|---|
| wordmark 41 | `logo` | exact |
| chip label 24 | `eyebrow` | exact |
| property title 46 | `ptitle` | exact |
| spec value 34 | `spec` | exact |
| spec label 19 | `specLab` | exact |
| listing number 19 | `listno` | **moved 22 -> 19** to join `specLab` |
| headline 98 | `hero` is 92 | the one ratio: `98/92` |
| chip 86 tall, r 10, panel r 28, chip padding 28 | `TA.badgeH` / `badgeR` / `panelR` / `badgePadX` | the ranking card's own values — corroboration, not sharing |

So `OrganicStudio.WK` is small, and `headPx` is expressed as a ratio on `hero` rather than as
a literal 98 precisely so the 9:16 story follows for free (112.9 there, and it does).

### A PROBE BUG THAT NEARLY BECAME A DOCUMENTED FACT

The first width comparison concluded the drawings' advance widths ran 0.96x to 1.25x of the
truth and that the design tool had not used Google Sans Flex at all. **That was wrong, and it
was my probe**: `meas(text, px, weight, serif, ls)` takes `ls` in PIXELS and the probe passed
it in em, so every tracked run was measured with essentially no tracking. The tell was the
listing number — the shipped op landed on 198.8 against a drawn 198.788 while the probe
insisted that same run was 25% out.

Measured properly, the drawings agree far better, and the two that do not are exactly the
heavily tracked runs:

| run | mine / drawn |
|---|---|
| wordmark 41/300 at .04em | 1.003 |
| spec values 34/300 | 1.011 - 1.016 |
| 19px caps at .16em | 1.015 - 1.023 |
| property title 46/300 | 0.978 - 0.981 |
| **chip label 24/500 at .1em** | **1.077** |
| **headline 98/400 at -.046em** | **0.921 - 0.945** |

Both outliers behave as though the export tool applied only about half the stated
letter-spacing when computing its own centring offsets — dropping tracking widens a
negative-tracked run and narrows a positive-tracked one, which is the sign of each error. The
tracking values are authored intent, so they are kept and every WIDTH is measured here. Cost:
the chips come out ~7.7% wider than drawn and the headline lines ~6-8% narrower, both still
centred and well inside the 920 column.

**AND WARM THE FACE BEFORE BELIEVING ANY OF IT.** The spec panel first measured 761.7 against
the drawn 757; with every weight actually loaded it is **753.8**, and its four column edges
land at 213.1 / 335.2 / 471.5 / 705.7 against a drawn 212 / 334 / 470 / 706 — **every number
within 1.5px**. The 8px error was one unwarmed weight. `document.fonts.load` for each
size/weight pair, then `document.fonts.ready`, then measure.

### THE HEADLINES ARE TWO AUTHORED LINES, and that is measured rather than assumed

`wrapPlain` at 98px with -.046em tracking breaks "New Listings Available this Week" as
**"New Listings Available" / "this Week"** and the CTA's as **"Own the Home Others" /
"Dream About"** — both wrong. Both headlines are template-owned fixed text, so the break is
authored in `WK.WKHEAD`, exactly as `taHead` does for the agents cover. Anything else a saved
project holds still goes through `wrapPlain`, so a hand-edited headline degrades instead of
running off the canvas.

`wrapPlain` and never `wrapRuns`, because it measures with the run's own tracking — and this
run's tracking is NEGATIVE, so measuring at 0 breaks early. `drawLines` cannot draw it either:
it pushes no `ls`. The two lines are placed by hand and centred on the **ink** (`meas - ls`),
which for a negative `ls` is WIDER than the advance.

### THE WORDMARK MOVED TO THE TOP CENTRE, and that made an old gap load-bearing

All three drawings put it there; it was bottom-left on all three kinds. `drawLogo('center',
'top')` in the ops, `order: 0, alignSelf: center` in the preview.

**And it needed the solved line-height.** `logoBase` sets none, so the preview inherited
canvasStyle's 1.3 and its baseline landed ~8px below the op's — a gap recorded as harmless
"on every kind that draws a top wordmark, because nothing is measured against it". That is no
longer true here: all three weekly kinds now ANCHOR their headline or title to `logoBase`, so
the two have to agree. `lh = px * (1.6 - a + d)`, the same solve the agents cover uses.
Measured after: the wordmark's preview baseline is **0.06 canvas px** off its op.

### THE ONE COLOUR THE DRAWING DOES NOT GET: the CTA button's brass

`CTA.svg` fills its button with **#b0905c** and labels it #faf8f4. The FILL is right and the
COLOUR is not, and the two halves come from two different rules:

- "Kicker bars: hairline-framed or rule-flanked, never solid fills (solid reads as a CTA)" —
  so the cover's kicker is correctly a 1px frame, and the closing slide is the one element in
  the template that MAY be solid, because it *is* the call to action. No conflict.
- "No gold in canvas output at all" is binding and unqualified. So the fill is `ART.warm`
  (#FAF8F4) with `ART.deep` (#1A2942) ink — the brand-neutral solid chip this system already
  defines (Campaign's eyebrow `fill`: a cream chip with navy caps on a dark canvas).

Changing those two tokens back to `brass` / `warm` is the whole revert if the rule is ever
relaxed. Note the ranking card's brass badge took the opposite decision on the same question,
and it is recorded there as a deliberate departure; this one goes the other way because the
instruction here was explicit that the guide wins.

### THREE MORE PLACES THE DRAWING IS OVERRULED

- **The wash stays BLACK.** `Property.svg` draws its top gradient in navy #1a2942 at 50%.
  `N` was deliberately changed to black in both renderers ("a review with no photo read navy
  however black the rect underneath was"), and the ground is black. The drawing's *shape* is
  kept — one top band fading out — which is what `scrimBands` already produces. Verified: the
  cover's band is [0, 618] against a chip bottom of 597.9 plus the 20px of breathing room the
  organic rule states, and prop's is [0, 578] against a panel bottom of 558.1.
- **The listing number stays inside the bottom margin.** The drawing puts its second baseline
  at 1369 with the margin at 1350. "Nothing should drift off the grid" is an explicit organic
  rule, so the two-line block is bottom-anchored to the margin and the QR sits above it — the
  stack reads exactly as drawn and simply starts 19px higher.
- **"New Listing" stays plural.** `Cover.svg` reads "New Listing Available this Week"; the
  recorded fixed headline is "New Listings". The same file set contains "Stunning Beach View
  VIlla" with a capital I, so a singular/plural slip is far likelier than intent — and the
  plural is what a weekly roundup of several listings says.

### AND ONE THE GUIDE DOES NOT ACTUALLY SETTLE

The guide lists "property title" among the things that are **Regular 400**. `Property.svg`
draws it **Light 300** — and so does the shipped code, and always has. Two independent sources
against one line in a list headed "**Provident campaign rules**", where the separate organic
rules say nothing about weight. It stays Light 300. Flagged rather than silently resolved: it
is one token if the intent was Regular for organic too.

### The property page's spec panel HUGS, and that reverses an earlier pass on purpose

The drawing replaces the old pair of edge-to-edge hairlines with a bordered rounded box sized
to its data. The rule this codebase already settled is "**equal columns are right edge to
edge, where regular divisions read as deliberate; per-cell widths are right only when the
panel hugs**" — so a hugging panel takes per-cell columns, and the equal-column pass on this
one template is reversed in the direction that rule already pointed.

`wkSpecBox` is the single geometry source, read by `buildOps`, the preview AND `scrimBands`,
the same reason `listedBox` and `taCard` exist. `panelPad` 50 and `colGap` 80 (the divider
midway, so 40 of air each side) reproduce the drawing to 1.5px on every column and divider.
The overflow guard is **stepped, not solved** — this font's width per em is not constant with
px, the lesson the listed card's role fit records — and normal content never enters the loop.

### Two defects the rewrite removed

- **A dead branch.** The cover's ops branch contained `if (kind === 'cta') { ... }` nested
  inside `else if (kind === 'cover')`, which could never run — `cta` had its own branch
  further up. Both are one branch now, because the drawings give the two kinds one layout.
- **One op per WORD.** The property title went through `drawLines`, which pushes a text op per
  `parts` entry. Identical pixels in Latin, but it is the same shape as the bug that reversed
  every Arabic hero headline, and it makes a line impossible to diff against the preview's
  single text node. It is one op per line now, joined — as every other component here already
  does.

### `drawQr` and `qrBase` take a corner and a ring; the listed card keeps 8 / 1

The drawings give the weekly QR 220x220 at r4 with a **6px white quiet-zone ring**, against
`tk.qr`'s 250 at r8 with a 1px stroke. `tk.qr` is NOT changed — it is also the listed card's,
which is out of scope — so `WK.qr` carries 220 and both helpers gained defaulted `r` / `ring`
parameters.

**The ring is split half in, half out in the preview.** A canvas stroke is centred on the
edge; a CSS border is entirely inside the box. `border: cq(ring/2)` plus
`box-shadow: 0 0 0 cq(ring/2)` is what makes the two agree, and at the listed card's 1px the
outer half is sub-pixel so nothing there moves.

### A SCOPE ERROR, and what caught it

`const FAl = StudioBase.fontAsc()` was declared INSIDE the `tacover` branch of the
`logoStyle` if/else chain, so the weekly branch below could not see it: `FAl is not defined`,
thrown from `mkCanvas`, which white-screened the stage. **What caught it was the plates
disappearing from the DOM** — a probe looking for `.p-plate` returned 0 — not the console,
which was still showing stale errors from an earlier load. One ascent is hoisted above the
chain now. Same family as the documented `iw` shadowing: check every declaration in the
target scope before writing into it.

### Verification

- **Ops:** 22 groups, 16 byte-identical, 6 changed and all six weekly. Op counts 14 -> 9 on
  cover and CTA, 23 -> 16 on the property page.
- **Preview against ops, in one coordinate space:** 21 text runs matched, **worst baseline and
  left delta 2.47 canvas px** — which is **1.006 screen px** at the editor's 2.4545x zoom, the
  measurement floor. Every run that is not the 98px headline lands within **0.07**. The spec
  panel and all three QR boxes match their ops to 0.1 on x/y/w/h and exactly on radius.
- **A measurement trap inside that check:** computed lengths (`fontSize`, `lineHeight`,
  `borderRadius`) inside the zoomed canvas box are already CANVAS units, while
  `getBoundingClientRect` is screen px. The first pass scaled the computed values too and
  reported every run unmatched.
- **The story canvas follows from the ratios** — 112.9px headline, 135.5 lead, panel 800.2 x
  178.6 — and renders correctly with the 200px top margin.

## The canvas is the source of truth, and it was wrong

The headline highlight was removed from the brand rules, but it survived in the **canvas**
while the DOM preview had already dropped it — so the advanced editor looked correct and the
export and guided card did not. Organic's `buildOps` drew the second word of a `listed`
status in a hardcoded `#4E7A9E` at weight 300 against `#fff` at 400. It also measured that
run at weight 100 while drawing it at 400, so the centring was wrong by the difference.

Worse, that was not the only leak. Organic hardcoded the **chrome accent** into brand
artwork in eight places — eyebrow flanking rules, the topBar and keyline bars, the agent
role label and the review stars — so the UI's blue was being exported into finished posts,
against the binding rule that canvas output carries no accent. Campaign had always read
`pal.ruleGold` / `pal.accent` for exactly this reason.

`OrganicStudio.ART` (`ink` / `soft` / `rule` / `mute`) is now Organic's equivalent, and no
colour is spelled out at a call site. Verified: every op fill across all five canvases in
both studios, and no `#4E7A9E` remains in any artwork path — only in chrome (buttons,
badges, info icons). **Never write a colour literal into `buildOps` or a canvas preview
style.** The splash and template-pick miniatures had the same bug in CSS
(`.p-c-p i.tx em` painted `--ps-gold`, which resolves to the blue); they inherit now.

The accent word itself was only ever a **marker into** the headline — `heroRuns` found it
with `indexOf` and split the run there — so the headline already holds the full text and
`normState` clearing `sl.f.serif` drops nothing.

## The Just listed / Just sold card, and `listedBox`

> **REBUILT to a newer drawing.** See *REBUILT AGAIN, to `Instagram Story - 23.svg`* at the
> end of this section for what changed: the photo stayed full bleed but its crop is now
> bottom-anchored and pannable, the panel became the ranking card's glass, the status became
> Title Case Regular, the QR moved inside the panel and the transferred date was deleted.
> Everything below about
> `listedBox` as the one geometry source, the agent's face framing, the wrapping rows and the
> fitted price is unchanged and still load-bearing.

Built from a reference the user supplied. **The layer order IS the design — keep it:**

1. **Background photo** — full bleed, reframeable (double-click to drag and zoom)
2. **The status**, "JUST SOLD" / "JUST LISTED" — tracked caps, fitted inside the margins
3. **The parallax cut-out** — a PNG of the picture's own foreground, locked to the
   background's position and zoom, so it passes IN FRONT of the status
4. ~~The transferred-date chip~~ — **deleted**, not relevant any more
5. **The footer panel** — USP line, price, a rule, the agent's name and role
6. **The agent's PNG cut-out**, standing over the panel at the bottom right

**Two different cut-outs, and they are not interchangeable.** The parallax layer is
per-slide (`smp-fg-<id>`, drawn by `drawFg`, which already matches the background's crop);
the agent is project level (`smp-agent`). Neither is ever cropped to a circle — the old
circular agent slot is gone from the single-agent case. Organic's `fgAllowed` is still
hardcoded false, so the parallax layer has its own control (`pxAllowed`) rather than
Campaign's.

**The panel is a LIGHT surface on a dark canvas**, so it takes navy ink: `ART.card`,
`cardInk`, `cardMute`, `cardRule`. That is not an accent — navy and warm white are brand
neutrals, and it is the same relationship Campaign's light palette already uses.

**The price reads "AED 12 Million"** via `fmtPriceBig` — one decimal where it earns its
place, dropped when it is `.0`. The line above it is `listedLine`, which now leads with the
Marketing USP: "Stunning Beach View Villa in Palm Jumeirah", Title Case throughout.

**The transferred date is asked for only on a Sold card** (`fieldShown`), in the eyebrow
face — tracked caps at 500 on a light chip.

**The QR cannot go top-right: the status runs across that band.** It sits above the panel on
the left, gated on `qr.show`.

**The listing number is NOT printed on this card** — the QR carries it. The field and the
export gate stay, because the code has to encode a real listing, but nothing prints above the
square. `listnoOn` is therefore **`prop`-only**; weekly's property page still prints its
number, and the `listed` branch has no `qrListnoStyle` at all. (It used to be drawn above the
QR; before that, below it, where `listnoOn` ignored the QR entirely and painted the number on
top of the panel.)

### The status: ALL CAPS, TRACKED, and fitted — not bled

It was Title Case, negatively tracked, at 1.02 x the canvas, clipping off both edges. Now
it is `word.toUpperCase()` at `fit` (.88) of the canvas width, so it sits inside the margins
with air at both ends.

**The tracking is derived, not chosen.** Matching the reference's ink width AND its cap
height at once requires **.1392em** — the brand's own tracked-caps value — and no other
pairing of size and tracking satisfies both. At `track: .14` the fit lands at cap height 120
against the reference's 113, ink 942 against 947, left edge 67 against 66. That is also why
it reads so much smaller than the old bled version: tracking fills the width at a far
smaller size (165px against 314px). `at` moved .263 → **.231** to match the reference's
baseline.

Weight stays **Light 300** — the reference's strokes are light, and at this size Regular
reads as a slab (Campaign's Jumbo learned the same). Tracked caps at 500 is the *eyebrow*
role; this is a display line that happens to be tracked.

**`meas` reserves one tracking unit per character INCLUDING the last**, so the advance
carries a trailing unit that is never drawn — 23px on a run this size. The fit and the
centring both work from the **ink** width (`wordW = meas(...) - px * track`), and the preview
is positioned from that same `B.wordX` rather than by `text-align:center`, which would centre
the advance box and sit half a unit left of the op.

**The parallax cut-out is placed by its INK box** (`StudioBase.inkBox`, the helper the
co-brand lockup uses). A PNG exported with transparent padding still lands on the panel's
floor instead of floating. The agent is placed by her FACE — see below.

**`listedBox()` is the single geometry source**, read by `buildOps`, `scrimBands` and the
preview. Every row carries its own absolute `y`, so the ops and the preview place a run from
one number rather than each accumulating its own stack. The panel's height comes from its
contents, so it shrinks as fields empty and disappears when they all do.

### The agent is framed on her FACE, and the copy column stops before her

Both from a reference with the crop drawn on it. Measured back into canvas units at 1080:
the crop box is **402 x 498**, flush with the panel's right edge and standing on its floor;
the face box is **139 x 139**, centred in it, 4% down from its top. Those become ratios in
`LISTED` — `agentH` 1.45 x the panel's height, `agentW` **.45 x the PANEL's width**, and
`headTop` .04 of the box — so the whole block tracks the panel and the story canvas for
free. Verified against the reference: box/panel 1.449 against 1.448.

**The box's width is a fraction of the PANEL, never of its own height.** The copy column is
what is left beside it, so a width derived from the box's height — which grows with the
panel, which grows as the copy wraps — is circular and could not settle.

**`StudioBase.headBox()` finds the head with no face detector**, because there is none to
have: Chrome's `FaceDetector` was never shipped unflagged and no library can be loaded — the
studio runs offline, off the disk. A cut-out on transparency does not need one. Measure the
ink's width row by row: the head and hair are narrow, the width **jumps** at the shoulders,
and the narrowest row between the head's widest point and that jump is the neck. Three
things this had to get right, each of which broke a real case:

- **The steepest-widening row sits MID-RAMP**, so "the widest row above it" already contains
  the shoulders — every case failed the jump test at 1.03. The jump is judged from the head
  measured well above the ramp against the body well below it.
- **The search window runs to 85% of the ink, not half.** A full-body shot puts the shoulders
  13% down and a tight headshot puts them at **78%** — a halfway cap found the headshot's own
  crown and nothing else.
- **Take the ARGMAX of the widening, never the first row over a threshold.** The head's own
  top edge is a steep widening too. It is always shallower than the shoulders, but on long
  hair it clears a relative threshold and the head collapses to zero height.

It returns **null** rather than guessing — an opaque photo has ink edge to edge on every row,
and a weak jump means a logo, a torso, or a crop that starts at the shoulders. Null falls
back to the old ink-box placement, now clipped to the box like everything else.

Verified on seven cut-outs: half-body, full-body, tight headshot, one padded and off-centre
in a 1600x2400 file, long hair with no neck notch, arms held away from the body, and an
opaque photo. Every head within a few pixels of the truth; both opaque cases null.

**`agentPlace()` is the one placement**, read by `buildOps` and the preview, so they cannot
frame her differently. It is **FILL, then shift to the face** — two steps, in that order,
and it replaced a first pass that sized the head to a fixed .28 of the box and let a tight
crop leave air under it.

**Fill means COVER: scale until the INK covers the box on both axes.** Not contain, and that
is the whole trap — contain fits a tall figure *inside* the box and takes the head down with
it, which is the small-head render this section exists to remove. Cover on a standing figure
is width-driven, and shoulder width tracks the body, so the head comes out near the drawn
ratio on its own: measured **25.9% for a half-body and 25.8% for the same person full-body**,
against 28% drawn. It also means a crop too tight to reach the floor is simply scaled up
until it does — no cap, no air, and the face rises as it grows, which is what "fills the
space then automatically shifts up" asks for.

**Then the face goes on its mark and the result is CLAMPED, asymmetrically:**

- **Sideways, both ways.** A subject turned in her file has her head off the ink's centre, so
  anchoring the face alone would open a gap at the box's edge — against the copy column, or
  the panel's right inset.
- **Downward only.** The box's floor is the panel's floor and a gap there is visible. Its TOP
  edge sits in the middle of the picture, so the band above the crown is just photograph —
  and clamping the top would delete `headTop` outright, since the crown IS the ink's first
  row on any cut-out.

With no head the ink's top goes on the box's top instead (a portrait photo keeps its face)
and it centres sideways; cover already guarantees the floor is covered.

**The cost, and it is real:** the head's size now follows the ink's WIDTH, so a figure whose
widest point is not the shoulders gets a smaller head — measured **18.6% with the arms held
out** against 25.9% for the same body with them down. A tight headshot goes the other way at
**76%**, because that is all the file contains. If the head size ever needs to be bounded
again, bound it as a floor on the scale, not by going back to contain.

**Every row of the panel WRAPS**, to a column that ends `colGap` (36) before the box. `row()`
in `listedBox` puts each through `wrapPlain` and the row's height follows its line count, so
the panel takes the extra by growing upward from its fixed floor. The rule stays full inner
width and runs behind her, as the reference draws it.

**The panel's type is sized off the PANEL, not off the canvas.** The story's tokens run ~18%
larger than the feed's while its panel is 4% NARROWER — so copy that set on two clean lines
in the feed *truncated* in the story and broke the price across two lines. One panel is one
object and gets one size: the feed's tokens scaled by this panel's width against the feed's
(`pk = innerW / feedInnerW`), which is exactly 1 on the feed, so nothing there moves.
Measured after: feed panel 383 tall, story 373, same line breaks, price on one line in both.

- **`wrapPlain` measures with the run's own tracking.** `wrapRuns` measures at `ls` 0, which
  breaks the agent's tracked-caps role at the wrong word. It also hard-breaks a single word
  wider than the column, which would otherwise overhang the agent.
- **The USP is capped at `uspMax` (2) lines** and ellipsised past it. Without a cap the panel
  grows until it pushes the QR into the status word; with it, a 100-character USP leaves the
  panel exactly as tall as a two-line one. Verified.
- **The price is a FIGURE and never breaks.** It is fitted to the column, shrinking to at
  most `priceMin` (.72) of its nominal size, rather than wrapped. The story used to set
  "AED 3.2 Million" over two lines.
- **The column is reserved whether or not a photo has been uploaded.** The panel must not
  re-flow the moment one lands, and the guided run asks for the copy a whole step before the
  portrait. Verified: identical row widths and panel height with the slot empty.

**The preview clips with `clip-path: inset()`, not a wrapper div.** The insets are in the
element's own coordinate space, so `cq()` canvas units land on the op's pixels — and no
markup has to grow a second node in both size canvases. Note Chrome serialises
`inset(T R B L)` to three values when L equals R, which is not a bug.

Verified end to end for six upload shapes — half-body, full-body, tight headshot, padded and
off-centre, arms out, opaque photo. **Every crown lands within 1px of its mark** and every
case fills the box. Checked on all three surfaces, which share this one function: the DOM
preview's computed geometry; the canvas renderer read back pixel by pixel (the full-body's
paint spans the box's width and its bottom edge is *exactly* on the panel floor); and the SVG
export's own `<clipPath>` — `x 586 y 795.29 w 414 h 554.71` on the feed and `x 584
y 1177.13 w 396 h 642.87` on the story, both bottoms exactly on `H - pB`. Preview against
export on the same slide: **520 / 794 / 546 / 1433 against 520 / 793.59 / 546 / 1433.25**,
sub-pixel on both canvases.

Two agents still switch to `agentColsGeom` and suppress the cut-out; the other three
templates and every Campaign path are untouched — ten diff hunks, all inside the listed
card, `headBox`, the agent asset load and the two hint strings.

**The scrim carries the status only.** The panel is its own opaque surface; a second band
under it would darken the picture for nothing.

**`StudioBase.baseLH(px)` is why the preview lands on the ops' baselines.** A canvas op
places a run by its baseline; CSS places a line box by its top, and the gap is the font's
ascent — a metric no arithmetic can guess. `fontAsc()` measures it once off a canvas.
Verified: every run within 2.4px of 1080, and the agent layer to the pixel. A wrapped row
advances its own lines by `r.px * r.lh` from the row's `y` on both sides, so the two cannot
accumulate different stacks.

**A slot filled through the file PICKER fires neither `drop` nor `image-slot:reframe`** —
the only two triggers `_refreshAV` had — so the canvas kept showing no photo until something
else re-rendered. The rAF fill scan now schedules a refresh off `_filledStamp`.

**Two earlier passes on this card were reverted** — one that added a tagline strip, an
all-caps location line and a BRN, and one that made the agent the parallax layer. If those
look attractive again, they were both explicitly rejected.

### REBUILT AGAIN, to `Instagram Story - 23.svg` plus four explicit notes

The card above is superseded. Everything in it about `listedBox` being the single geometry
source, the agent's face-framing, the wrapped rows and the fitted price still stands; the
status treatment, the panel's material, the photo's window and the QR's place do not.

Proved at the op level: **22 slide-by-canvas groups, 20 byte-identical, and the only 2 that
changed are the two `listed` groups.** Weekly, agents and review are untouched.

**The drawing carries no background photo at all** — its only image is the agent — so the
photo's window is not derivable from it. The four notes are what specify it.

#### 1 — the photo is FULL BLEED, its crop is pinned to the bottom, and it pans

**I READ THIS WRONG FIRST AND IT IS WORTH RECORDING WHY.** "Have the upload image size on
canvas as 4:3 then pinned down on bottom" was built as a 4:3 WINDOW — `1080 x 810` at
`y 630` — which replaced the top 44% of the photograph with black. The scrim was then
removed on the reasoning that the wordmark and the status now sat on black. That reasoning is
circular: the black WAS the missing photograph. The user's words for it were exact — "i think
you misinterpret background image to scrim".

`photoWin(kind, tk)` returns the whole canvas on every kind. What "pinned down on bottom"
governs is the crop's vertical ANCHOR: a photo that overflows is cropped off the TOP rather
than centred, so the foot of the picture stays in frame. `-my` is the offset that does it —
bottom = `cy + dh/2 = PW.h` needs `cy = PW.h - dh/2`, which is exactly `by = -my` — and the
reframe crop and the pan are offsets FROM that anchor. 4:3 is the upload the card is designed
around: on a 3:4 canvas it covers by width with no vertical overflow at all, so the anchor is
free there and only bites on a taller upload.

**A LESSON ABOUT SCOPE, not just about this card.** A geometric instruction that removes
content is worth one sanity check against the reference image before building on it. The
attached JPG showed the photograph full bleed behind "Just Sold" the whole time.

`photoPlace(sl, tk, img, bg)` is the one placement, read by the photo's op, by the parallax
cut-out and by the preview — the shape `agentPlace` already has. **Two contributions to one
offset, clamped together:** the reframe overlay's own crop (`bg.s/x/y`, in the photo store)
and the pan this card adds (`f.phx/phy`, on the slide). Clamping the sum is what stops
either pulling the window off the picture, and **the clamp range IS the pan range** — a
photo with no overflow simply does not pan, which is correct rather than a limitation. A 3:2
upload measures `mx 20 / my 0` against the 3:4 canvas: horizontal only, exactly right.

**SUPERSEDED IN SCOPE — the photograph takes Campaign's whole gesture set now (scale, reframe
and drag), and the parallax is locked to all three. See *THE PHOTOGRAPH TAKES CAMPAIGN'S
GESTURE SET* below. What is in this paragraph is unchanged and still the reason the drag is
safe.**

**THE PAN IS CLAMPED AT STORE TIME, not only at placement.** Storing a raw overshoot gives a
dead zone where dragging back moves nothing until the overshoot has been retraced — the trap
`clampCentre` records in the image tool. Verified with a REAL pointer drag: `phx` went 0 ->
**0.0625**, which is the limit exactly, the photo's left edge landed flush with the window,
the op and the preview agreed to 0.01, and the gesture made **one** undo entry.

**The preview needs a PAINT LAYER, because a slot cannot match an op.** The image-slot owns
its own fit and its own crop, so panning it would either double-apply the crop or leave a
gap. Instead the window's wrapper clips, a `background-image` div inside it sits at exactly
`photoPlace`'s rect, and the slot stays underneath at `opacity: 0` once a photo exists —
still the drop target, still the double-click reframe host, and still showing its
placeholder while the card is empty. That is the pattern the icon tint and the ranking
cover's group figures already use here, and the reason is the same in all three.

#### 2 — the copy column carries a PADDING the USP wraps at, and the panel grows upward

Both behaviours already existed and are unchanged in principle; what changed is that
`colGap` is now named as the padding and the vertical rhythm is the drawing's.

**THE DRAWING CANNOT SUPPLY THE PADDING.** Its column is 436 wide and its USP breaks at 287,
so that break was typed by hand rather than measured — and reproducing it would need a
column under 311.9, which is 0.5px narrower than the price needs to sit at its full 55.
`colGap` is **50**, the panel's own pad: it keeps one rhythm and leaves the price at nominal
(312.4 of a 365.5 column). Past about 103 the price starts shrinking. The consequence is
visible and small: the USP breaks one word later than the drawing, after "in".

#### 3 — the panel is the RANKING CARD's material

By request: `ART.deepGlass` over a `blur` op at **`TA.panelBlur`** (30), with a 1px
`ART.panelEdge` hairline. It was `ART.card` — a light warm surface at .92 — so **every run
in it flipped from navy to white**, which is the same `isPaper` lesson `drawLogo` records:
the ink follows the ground it sits on.

**THE HAIRLINES ARE THE RANKING PANEL'S OWN, by request** — `ART.hairEdge` (.165) outside
and `ART.hair` (.25) for the divider inside. The drawing states .33 and .5 and both were
taken at first; beside the ranking card they read too loud, and matching that card is the
whole point of giving this one its material. A third near-identical `panelEdge` token was
introduced for the drawing's .33 and is retired: there is ONE glass panel edge in this file.

Verified live: the preview computes `blur(30px)` on a node at `80 / 934 / 920 x 416` with
radius 28, `rgba(26,41,66,.65)` and a `rgba(255,255,255,.33)` border — byte-for-byte the op's
own box, and the blur op's `amount` is 30.

#### 4 — the vertical rhythm is stated as BASELINE STEPS, and it sums to the drawn height

Which is what makes the panel's height derivable rather than fixed, and what lets it grow
upward from a pinned floor:

```
panel top  +76   -> USP first baseline      (then 38.4 per extra USP line)
           +68.6 -> price
           +56   -> the rule
           +74   -> the name
           +46   -> the role
           +57   -> the panel's floor
```

For the drawn two-line USP that sums to **416**, the drawn panel height, exactly. Measured
after: every baseline reproduces the drawing at a uniform **-32**, which is the one geometry
change — see below.

#### What the drawing loses to the guide, and one thing it loses to arithmetic

- **The panel sits ON the margins.** The drawing has it at `59..1020.32` against margins of
  `80..1000`, overhanging by 21 and 20.32 — asymmetric, so sloppy placement rather than
  intent — and its floor 32px below the bottom margin. "Nothing should drift off the grid" is
  an explicit organic rule, so the panel is `pL / innerW` with its floor on `H - pB`. That is
  the whole of the uniform -32: every baseline, the agent and the QR move with it.
- **The USP stays TITLE CASE.** The drawing sets it in sentence case; `listedLine` puts the
  Marketing USP through `toTitle`, which is a recorded brand-copy rule.
- **The status is fitted, not bled.** `statusFit` .95 steps a long status down. "Just Sold"
  measures 460 and "Just Listed" 532 against a 920 column, so nothing real triggers it.

#### The status reverses this card's own tracked-caps decision

It is **Title Case, Regular 400, at 140px with -.046em** — the same register the weekly
headline carries, so the two templates now read as one system. It was tracked caps at 165px
in Light 300, fitted to .88 of the canvas.

That older decision is kept in `LISTED`'s comment because its reasoning was sound *for that
drawing*: matching its ink width and its cap height at once needed .1392em, the brand's own
tracked-caps value, and no other pairing satisfied both. This drawing simply asks for a
different thing.

It is anchored to the **wordmark's baseline** (`statusGap` x its own px), not to a fraction
of H — and the wordmark therefore needed the solved line-height, `lh = px * (1.6 - a + d)`,
for the third time in this file. That gap is recorded as harmless "wherever nothing is
measured against the wordmark"; on this card something now is. Before the fix the preview's
wordmark sat **7.8px** below its op and **360px** left of it (it was still flowing
bottom-left); after, **0.06 / 0.07**.

**And the tracked-run width discrepancy shows up again, consistently.** "Just Sold" at
140/400/-.046em measures 460 against the drawing's 524 — a ratio of 0.877, the same family as
the weekly headline's 0.92-0.945, and untracked it would be 518. The export tool is applying
roughly none of the stated tracking when it computes its centring offsets. The tracking is
authored intent, so it is kept and the width is measured here.

#### THE SCRIM STAYS — one band, behind the wordmark and the status

It was briefly deleted, on the circular reasoning corrected above. With the photo full bleed
again the band is back, `[0, wordY + wpx * .18 + 20]`, and `scrimUsed` reports true for the
listed template as it always did. The panel needs no band of its own: it is a glass surface,
and a second one under it would darken the picture for nothing.

#### Two smaller moves

- **The QR is inside the panel now**, inset `qrIn` (33) from its bottom-right corner and
  over the agent's own body — both the drawing and the JPG show that overlap deliberately.
  It sat above the panel on the left, because the old status ran the full width through the
  top band; a centred 140px line does not, so that band is free and this one is uncontested.
  220 at r4 with the 6px quiet-zone ring, the same as the weekly kinds.
- **The transferred date is DELETED** — "not relevant anymore". The chip, the `sold` entry in
  `FIELDS`, its `fieldShown` clause, the rail input and the `chipR`/`chipPadX`/`chipH`
  constants all went. A saved project keeps whatever it typed into `f.sold`; nothing reads it.

#### Verification

- **Ops:** 22 groups, **20 byte-identical, 2 changed and both `listed`** — and the photo op
  specifically verified unchanged on every non-listed kind, which is what proves `photoPlace`
  reproduces the old full-canvas centred placement exactly for them.
- **The drawing's baseline steps** reproduce at a uniform -32 (the panel's floor moving onto
  the bottom margin), and the panel's height is **416**, the drawn value, exactly.
- **The agent lands where the drawing puts her**: left 545.4 against a drawn 545, height 634
  against a drawn 634.
- **Preview against ops:** 7 text runs matched. The wordmark is within **0.07**; the panel's
  five runs within **2.44** canvas px and the 140px status within **4.89**, which are 1 and 2
  device pixels at the editor's 2.4545x zoom — the measurement floor for a run that size.
  The glass panel matches the op's box, radius, fill, border and blur exactly.
- **The pan, with a real pointer**, not a synthetic event: clamped at the limit, no
  overshoot stored, preview and op agree to 0.01, one undo entry.

#### THE PARALLAX CUT-OUT IS NEVER STRETCHED, and it was

`drawFg` drew the cut-out at the BACKGROUND's own rect, which is only correct while the two
files share one intrinsic size — the "cut-out of the picture's own foreground" case it was
written for. Any other upload came out distorted, and the 4:3 window made it obvious:
measured a 3:4 cut-out drawn at aspect **1.778** from a 16:9 background, a **2.4x** stretch.
It was also being clipped to that window, so a tall subject lost its head to the black band.

It takes the background's SCALE and CENTRE now — `photoPlace` returns `k`, `cx`, `cy` — and
builds its own rect from its own dimensions, clipped to the canvas. When the two files do
share a size that is bit-identical to the old behaviour; when they do not, the cut-out stays
round. Verified: source aspect 0.75, drawn aspect **0.75**. The PREVIEW's copy of this had the
same flaw for a different reason and was fixed with it — see the gesture-set section below.

#### THE PHOTOGRAPH TAKES CAMPAIGN'S GESTURE SET, and the parallax follows all of it

By request: scale, reframe and drag, with the parallax layer locked to the photograph — the
floating-graphic gestures Campaign gives its uploaded art, applied to a background photo.

**Three things multiply into one scale and two add into one offset**, and that composition is
the whole reason the cut-out cannot come loose:

```
scale  = the cover fit  x  the reframe overlay's zoom (bg.s)  x  the corner drag (f.phs)
offset = the bottom anchor  +  the reframe's own pan (bg.x/y)  +  the canvas drag (f.phx/phy)
```

`photoPlace` returns `k`, `cx` and `cy` alongside the rect, and `drawFg` builds the cut-out's
own rect from its own dimensions at that same scale and centre. So every gesture moves both
layers by construction rather than by two code paths agreeing.

- **Drag** anywhere on the photo to move it, clamped at store time to what the overflow can
  actually reach.
- **A corner grip** scales it about the crop's own centre, so the point under the middle of
  the canvas stays there. Proportional — `phs` is a single multiplier and the height follows
  the art's aspect, so it can never distort. `phsMin` is **1** and that is not a preference:
  this is the background, and anything under cover would show the ground through it. You zoom
  in and pan; you cannot zoom out past the frame.
- **Double-click** still opens the reframe overlay, which is where the fine zoom and the
  Fill/Fit anchors live.
- **One undo entry per gesture**, not one per pointermove — `_undoStack` is 5 deep.

**THE GRIPS SIT AT THE CANVAS'S CORNERS, not the photograph's.** The picture is larger than
the frame — that overflow is what there is to pan into — so its own corners are off-canvas
and unreachable. The frame's corners are the crop's, which is the gesture every photo tool
uses. They show only on the ACTIVE slide, so the other plates stay clean.

##### Z-INDEX 11, AND THE SLOT IS WHY — the second un-hittable gesture layer in this file

The pan layer shipped at `z-index: 2`. **`image-slot` sets `z-index: 10` on its own host**, so
the slot was on top at every point of the canvas: measured with `elementFromPoint` over a
25-point grid, the slot won **25 of 25**, and a real pointerdown at the centre reached the
slot with the pan handler never firing. The drag *appeared* to work only because the test grab
happened to land somewhere it got through.

**PROVE REACHABILITY; NEVER INFER IT FROM A HANDLER THAT RAN.** This is the second time in
this file that a gesture layer has been un-hittable while its arithmetic checked out — the
ranking cover's figures were the first, for a different reason (`pointer-events: none`
inherited from `frameStyle`) — and both times the tell was `elementFromPoint`, not the
handler. At `z-index: 11` the layer wins 25 of 25. The grips are 12.

Worth knowing: the slot's `z-index: 10` is applied conditionally — it read `auto` on a later
sample — so a layer that tests fine once can still lose later. Sit above the maximum, not
above what it happens to be.

##### The double-click had to be FORWARDED once the layer went on top

`image-slot` listens for `dblclick` **on its host**, gated on `data-editable` and
`_reframes()`. With the pan layer above it the event never arrives, so the layer re-dispatches
one at the slot. That is a synthetic event aimed at the element that owns the listener —
nothing is being hit-tested, which is the case the "synthetic events do not hit-test" rule
exists to catch. Verified end to end with a REAL double-click: the slot gains `data-reframe`
and the overlay opens with its zoom slider at 100.

A probe note that cost a round: the reframe overlay lives **inside the slot's shadow root**,
so `document.querySelectorAll(':popover-open')` finds nothing and it reads as "the reframe did
not open". Look in the shadow root, or read `data-reframe` on the host.

##### The preview's parallax was never locked, and now is

`fgStyle` cover-fitted the cut-out to the canvas from its OWN dimensions while borrowing the
background's crop — so it matched neither the op (which scales it by the background's `k`) nor
the pan and scale. It goes through `photoPlace` too now. Both surfaces, one function.

##### Verification

- **Ops: 22 groups, 22 byte-identical.** The gestures add nothing to the artwork until one is
  used, which is what a default of `phs: 1` and `phx/phy: 0` should mean and now demonstrably
  does.
- **All four gestures with real pointer drags**, from a clean state: move took `phx` 0 ->
  0.0955 with `phy` correctly staying 0 (no vertical range at that scale); a corner took
  `phs` 1 -> 1.1432 with the drawn aspect **1.7778 against a source 1.7778**; the reframe
  opened; two undo entries for two gestures.
- **The parallax measured locked after both**: the same `k` 1.5243 and the same centre
  (643.1, 616.9) as the background, at its own aspect **0.75 against a source 0.75**.
- **A reset lives beside the photo in the rail**, offered only once a gesture has been used —
  scaling and panning into a corner is easy to do and fiddly to undo by hand, and a reset that
  resets nothing is exactly the kind of purposeless control the dead-feature audit went
  looking for.

#### A DIFF-NOISE TRAP: never let a helper's extra field ride along inside an OP

`photoWin` returns the window plus its `anchor`, and the first cut passed that whole object
through as the image op's `clip`. No pixel moved — the renderers read `x/y/w/h` and ignore
the rest — but **every photo op in every template changed signature**, which is precisely the
noise an op-level diff exists not to have: 20 groups lit up and each had to be read to find
that the only difference was `"anchor":"center"`. The clip is built as a plain rect now.

## Nothing the user is asked for is pre-filled

`tplSlides` seeds **no** user-facing value. A pre-filled headline or price reads as already
answered, so it gets skipped and ships as placeholder copy — "Address Hillcrest" going out
on a real listing is the failure mode. Template-owned text is the exception and keeps its
fixed value, because it is never asked for and a blank would render a post with a missing
line and no way to notice.

**Every asked field is required.** `req` used to be a subset (`usp`, `agentName`,
`agentRole`, the blurb were optional), which let a post ship with visibly blank lines. If it
is a question, it has to be answered: both `gdPhaseIssues` and `gdAskIssue` now gate on
presence in the field table, not on the flag. The flag still carries `len11`/`num` checks.

Weekly starts with **one** property. Further pages come from the run or the rail.

## The weekly cover and closing slide are entirely template-owned

> Both were **rebuilt to supplied SVGs** — see *The weekly template was rebuilt to three
> supplied SVGs*. What is below is unchanged and still true: the headlines are fixed text and
> neither screen offers an input for them. The closing slide's EYEBROW is gone entirely now,
> so `FIXEDTEXT.cta` no longer claims one and `tplSlides` no longer seeds it; the cover's
> eyebrow survives as its chip label.

Both headlines are fixed text — "New Listings Available this Week" and "Own the Home Others
Dream About" — so `FIELDS.cover` and `FIELDS.cta` are now **empty arrays**. Those two slide
kinds are used only by the weekly template, so this is scoped to weekly by construction.
Neither screen offers an input for them; `normState` refills a blank one, so a project saved
while they were editable does not render a card with no headline. They still take a
background photo and a QR, asked for in phase 1.

A slide kind with no asked fields is fine — it simply contributes nothing to phase 0.

## Title Case follows the brand's own copy

**AN ALL-CAPS WORD IS KEPT EXACTLY AS TYPED, and that is the one exception.** `toTitle` used
to lower-case the tail of every word unconditionally, so "Blakely Tower, JLT" came out "Jlt",
"DIFC" came out "Difc" and "Tower A" came out "Tower a" — this market runs on acronyms and
lettered towers, and an acronym re-cased is wrong rather than merely restyled. The test is
`w === w.toUpperCase() && w !== w.toLowerCase()`: the second half is what says the word holds
at least one CASED character, so "1361" and "-" fall through to the normal path (unchanged
either way) and an accented "ÉCOLE" is caught the same as an ASCII one. An all-caps word is
never looked up in SMALLWORDS — somebody who types "PALM JUMEIRAH IN DUBAI" meant all of it.

`toTitle` keeps small words lowercase after the first word, because the fixed headline is
"New Listings Available **this** Week". Capitalising every word gave "Ready **To** Move",
which contradicted the very headlines it sits beside. `SMALLWORDS` holds the list; the first
word is always capitalised so "in dubai marina" still opens on a capital. Applied to the
community name (as before) and now to the Marketing USP.

## What is left is shown only when it BLOCKS you

Two wrong answers were tried here before this one, and both failed the same way.

First a red paragraph across the top of the preview: it had to be re-read end to end to
find what had changed, and it sat over the post it was describing.

Then a persistent checklist in the input column — which was worse, because it **contradicts
the premise of the screen**. The whole point of one question at a time is to remove the wall
of fields; a permanent list of every outstanding ask puts the wall back, above the question,
and it is the first thing a non-designer reads. It also does not scale: Words is 9 rows for
one property and **33 for four**. And it was the fifth progress indicator, after the
progress bar, the phase dots, the step counter and the helper line.

What is actually true: within a phase you can move freely, so the outstanding list is only
ever actionable at **one moment** — when you try to leave a step unfinished. So it is raised
then and only then, in the input column under the field, each row jumping to the question
that fills it. At rest the screen carries a question, a field and nothing else.

- `gdPhaseGaps` derives the list from the **same per-ask gate** that stops you on a single
  question, so "what blocks the step" and "what you can click to fix it" cannot disagree,
  and `gdPhaseIssues` is now just its labels. That deleted a duplicate copy of the
  field-walking logic.
- Capped at `GD_BLOCK_MAX` (5) with "+ N more after these" — 27 rows is the wall of fields
  again, just raised at a worse moment. You can only fix one at a time.
- Re-tested against the live gate on **every render**, not cleared on navigation: a row the
  user has since filled drops off by itself and the panel disappears when the last one goes.
  Clearing it only in `goAsk` left it lingering, still listing things that were already done,
  after any state change that was not a navigation.
- It lives on the **instance** (`_gdBlock`), not in state — throwaway UI has no business in
  the saved project or the undo stack.
- If the ask you are standing on is itself empty, the inline "This one is required." answers
  it and the panel never appears; a list is only useful when *this* one is fine and earlier
  ones are not.

`gdAskTitle` is the single place an ask is named, used by both this list and the question
heading, so the two cannot drift.

## The pages ask goes FIRST, and why

Adding or deleting a page re-derives the whole ask list. Put the add/delete ask anywhere but
first and every index after the change shifts, throwing the user to a different question
mid-run. As the first ask of phase 0 it only ever renumbers what comes after it, and it reads
naturally: decide how many properties, then fill them in. `gdPageRows` / `gdAddPage` /
`gdDelPage` mirror the rail's own add/remove, and the first page has no delete — a weekly
with no property is not a post.

## Enter has to be bound at the DOCUMENT, not the field

`gdAskEnter` was on the text inputs' `onKeyDown`, so Enter worked on a text ask and did
nothing on a dropdown, a stepper, a drop zone or a slider — most of the run — while the
screen said "press Enter ↵" on every one of them. The handler now lives on `document` in the
shell's `componentDidMount`, gated on `screen === 'guide'`. A `TEXTAREA` keeps Enter for a
newline, `BUTTON` keeps its own activation, and any modifier combo is left alone. Because it
is capture-phase, the per-input handlers had to be **removed** or Enter advanced twice.

## Project-level fields the run used to miss

`FIELDS` is keyed by **slide kind**, so anything stored at project level was invisible to
it. The listed card prints an agent name, role and headshot — and optionally a second agent
— from `s.agent` / `s.agent2` / `s.agent2On` and the `smp-agent` / `smp-agent-2` slots, none
of which live on a slide. The run therefore never asked for any of it while happily printing
it on the card.

`gdAgentAsks(phase)` supplies them: name and role in phase 0 (gated, they are on the card),
a one-agent/two-agent segmented choice that adds or removes the second set, and the
portraits in phase 1. Portraits are asked for but **not** gated — blocking the run on a
headshot would strand anyone who does not have it to hand. `gdProjGet/gdProjSet` address
them by dotted path so one ask kind covers all of them.

When adding a control to a template, check whether it is per-slide or per-project. If it is
per-project it needs an entry here, not in `FIELDS`.

Two related traps found the same way, and the FIRST one has since REVERSED — the rebuilt
review draws a bundled ground and takes no background upload at all, so `photoUsed('review')`
is false and the run correctly asks for no photo on it. The lesson stands and the fact does
not. `gdWantsPhoto` excluded `review` on the reasoning that
"a review card has none" — it has a background slot like every other kind and the rail had
always offered it, so the run simply never asked for it. And the review portrait is
per-slide (`smp-agent-r<id>`), not the shared `smp-agent`, so an ask pointing at the shared
slot wrote to the wrong place. **Check the slot id in the rail markup before wiring an ask
to it.**

## Two parsers for one flag syntax is a standing hazard

`seg:Just listed|Just sold` broke **again**, this time only in the guided run: the rail's
parser had been fixed to take everything after `seg:` (the values contain spaces and it is
always the last flag) and the guide's copy still did `.split(' ')[0]`, so the Status question
offered a single option labelled "Just". Both copies, and the matching `sel:` pair, now take
everything after the marker. If a third reader of this syntax ever appears, fix it there too
or collapse them into one function.

## Chrome follows dwtc.provident.ae's structure, not its palette

Measured off the live page: headings Google Sans Flex **400** at about **-1.5%** tracking
with a 1.06–1.12 line-height; a flat **6px** radius on every control with no pills; buttons
at **500** with generous padding (12.8/30.4 primary, 8.8/19.2 secondary) and slightly
*positive* tracking; one subtle surface step between ground and panel. The page itself is
light (#FAF8F4 ground, #F4F1EC panels, navy ink) — the studio deliberately **stays dark**
and takes only the structure.

It is **one block at the end of the stylesheet**, which is the convention here: it overrides
47 pill radii and the scattered card radii without touching 47 call sites, and reverting is
deleting a block. Two things it must not touch, and does not:

- **Anything sized in `cqw` or `%`** — those are the canvas previews, the template
  miniatures and the iPhone mockup, whose corners are derived artwork geometry (the 62pt
  display corner, the 79.7pt body, the glass price pill). Squaring those would change the
  design, not the chrome.
- **Any preview style that mirrors a canvas op**, even when it is written in plain px. The
  sweep squared three of these and the previews stopped matching their exports: Organic's
  glass price pill and CTA pill (`r: h/2` in the op, so `999px` in the preview) and the icon
  chip. The rule: a preview mirroring an op with `r = h/2` is `999px`; one mirroring a fixed
  `r` uses `cq(r)`. Campaign's CTA already had it right — `rectV ? cq(8) : '999px'` against
  an op of `r: rectV ? 8 : bh/2` — and is the pattern to copy.
- **Slider tracks** keep `999px`; that is the control's own shape, and squaring it makes the
  thumb sit oddly. Circles keep `50%` and are never rewritten.

Inline styles beat the block (the documented trap), so the 23 inline `borderRadius: '999px'`
had to be changed at the style objects themselves.

Also settled in that pass: `.p-lab` is a **sentence-case field label**, not a tracked-caps
eyebrow. Grouping it with the eyebrows forced 500 weight and .1em tracking on every label in
the rail and read as heavy and gappy; only `.p-cap`, `.gd-ask-g` and `.gd-lockrow b` are
tracked caps.

**The guided screen's own furniture.** Text fields are dwtc's bordered rounded rectangle,
not an underline. Multiline fields autoresize from their starting rows to `GD_TA_MAX` (8)
lines and then scroll — `StudioBase.autoGrow` must reset `height` to `auto` before reading
`scrollHeight`, or the field grows and can never shrink. The step label, the phase dots and
the outstanding-items warning sit at the TOP of the preview zone; the helper line and the
locked-layer chips at the bottom. The bottom bar is **slide** navigation — Previous Slide /
Next Slide — and renders only for a carousel, since a single-page post has nothing to move
between; ask navigation is the Previous/Next pair in the input column, with no arrows.

**The Meta placement Preview is CAMPAIGN-only.** It used to be gated on `shIsCampaign`;
since the split it simply is not in Organic's document at all — neither the button nor the
overlay. The lesson that produced that gate still stands, though, and now applies to a
**mirrored** top bar rather than a shared one: the button once lived in the shared top bar
while the overlay sat inside `<sc-if shIsCampaign>`, so removing it "from Organic" silently
took the feature out of Campaign, the only studio where it worked. **The top bar is the same
markup in both documents; changing it in one changes nothing in the other.**

**Removed, deliberately:** the in-editor **Guided mode**
rail, which was a second guided experience competing with the step-by-step screen. It was
first hard-disabled (`wizOn` false, `wizAdvanced` true) and is now **deleted outright** —
markup, styles and render keys — so the editor is always the full workspace and the screen is
the only guided path. The `provident.` wordmark sits beside the
studio switcher again.

**Organic's canvas ground is black — everywhere EXCEPT the two PAPER kinds, the AWARD and the
REVIEW**, so there are FOUR grounds and `groundFor` answers for all of them. The review's is
`ART.deep`, the drawing's own navy: its bundled plate covers the canvas, so that rect is only
ever seen for the frame before the plate decodes — and it is also what the template card shows
once the skeleton strips the images, which is why it is navy rather than black.
`tagent` and `tacover` are white by request (`ART.paper`) and `award` is bronze `#8A6E45`
(`ART.bronze`), so there are THREE grounds and **`OrganicStudio.groundFor(kind)`** is the one
test that answers. `isPaper` still means what it says and was deliberately not extended — it
also governs the photo deferral and the wordmark's ink, and the award wants the ordinary
dark-kind answer for both. `ART.base` is untouched, so the other four cannot move.
See *The card went WHITE* and *The cover was rebuilt to the reference*. Four call sites read
that one test — the base rect, the photo's deferral into `bgOps`, the preview's `canvasStyle`
and the preview's z-index block — and `drawLogo` reads it for the wordmark's ink, because
`ART.ink` is `#fff` and would be invisible on paper. `ART.base` covers the base rect and the
preview box, but the review card was then scrimmed rather than gradient-banded and its
full-canvas scrim `N(a)` was still `rgba(26,41,66,a)`, so a review with no photo read navy
however black the rect underneath was. `N` is black in both renderers now — **and it must
stay black even though the rebuilt review's wash is deliberately NAVY again**: that ramp comes
from `OrganicStudio.deepA(a)`, a helper derived from `ART.deep`, precisely so this shared
black helper is not the place the colour is decided. `N` has other readers. The splash and template-pick
miniatures mocked the scrim in navy too — 24 gradient stops — and they follow the canvas, so
they are black as well. What stays navy is chrome (modal veil, skeleton bars, light-mode
miniature marks) and Campaign's LIGHT palette, where navy is the ink on a white canvas.

**The step indicator is a process stepper**, not four dots: a numbered plate per step, a
dotted connector between them and the step's name beneath — the same language as the
Process steps design component. Equal `flex:1 1 0` on every step is what lets the connector
be positioned from one plate's edge to the next; with intrinsic widths the labels ("Words"
vs "Refinement") would space them unevenly and the connectors would not line up. A step
shows a tick only once it is BEHIND you and clear — Refinement requires nothing, so keying
"done" off an empty issue list alone would tick a step that was never visited.

**Save all writes PNGs, and it used to write SVGs.** The guided button called
`doExport('zip')`, and `zip` is not one of the raster kinds — it fell through to the `else`
branch and produced `.svg` files, so "Download the images (zip)" handed out vector files.
It calls `doExport('png')` now and is labelled **Save all**, because with a source folder
set there is no zip involved: the renders, the session `.json` and `Assets/` go straight
into the folder. Without a folder the old zip-through-the-save-dialog path is unchanged.

**The PDF is feed only, and only offered for a carousel.** A PDF of a single card is just
that card, so `gdExpPdfOn` hides the button unless there is more than one slide, and the
document is built from `ft` alone — the story pages are dropped.

**Choosing a destination is its own step, and it is required.** Phase 3 is two asks —
`dest` then `export` — so the run never hands someone a download and leaves them hunting
for it. `gdExportBlockers()` is `exportBlockers()` plus "A folder to save into", and the
export step reads that: with no folder the download buttons are not rendered at all and
both actions refuse. The editor's own `exportBlockers()` is untouched, so the advanced
workspace still exports without a folder.

The one place it cannot be mandatory is a browser with no directory picker — Safari and
Firefox have no `showDirectoryPicker`, so `folderSupported()` is false there and the step
explains that each file will be placed via the OS save dialog instead. Making it mandatory
regardless would leave those users unable to export at all.

`:empty::before` was the wrong way to show the "No folder chosen yet" placeholder — DC
interpolation leaves a whitespace text node, so `:empty` never matches. It is a real value.

**"Change folder" must call `pick()`, not `folderOpen()`.** `folderOpen` is written for
"give me a usable folder": `f.handle || await f.ensure()`, and it only reaches the picker
when both come back empty. So once a folder was set it returned that handle and the button
did nothing at all. The guided step now calls `f.pick()` directly whenever `f.handle`
exists, and only falls back to `ensure()` when nothing is chosen yet — a remembered folder
whose permission lapsed is parked on `pending`, and `ensure()` revives it without a second
prompt. A dismissed picker is caught and leaves the current folder untouched. The editor's
own `chooseFolder` always called `pick()` directly and never had this bug.

**Export asks where to save.** `StudioBase.saveAs` opens the real OS dialog via
`showSaveFilePicker` so the user picks the folder and can rename in place, and falls back to
the old download when the API is missing (Safari, Firefox) or blocked. A cancelled dialog
returns `'cancelled'` and reports "nothing was saved" rather than a failed export — verified
across all four paths: no API, user cancels, happy path, and picker throwing. Setting a
project folder still bypasses the dialog entirely and writes straight into it.

## Organic step-by-step run

> **SUPERSEDED, BY EXPLICIT INSTRUCTION: the run is ONE PAGE AT A TIME now, not six content
> chunks.** The "SIX CHUNKS … do not reorganise it" rule and "if per-slide stepping looks
> attractive again, it is still wrong" below both stood until the run was reported as
> disoriented and jumping page to page. See *THE GUIDED RUN IS ONE PAGE AT A TIME* at the
> end of this file for the shape that ships and why the old objection no longer applies.
> Everything below about what is ASKED — FIELDS, FIXEDTEXT, gating, the pages ask going
> first, seeding a select, Enter at the document — is still true; only the ORDER changed.

A new post opens on `screen: 'guide'` — a **screen of its own**, not a rail in the editor:
one question at a time beside the post, which fills in as each answer lands.

**SIX CHUNKS, BY WHAT THE THING IS. This is the requested shape — do not reorganise it.**
`OrganicStudio.GDPHASE` is **Content → Photo → Agent → Listing → Look → Save**.

It began as Words → Pictures → Refinement → Export, which was accurate but read as two long
stretches: one step held every line of copy in the post and the next held every image. The
split is by *what the thing is* precisely so each step is short and announces itself —
nobody should feel they are part way through something endless. More steps, each smaller,
is the point; do not merge them back.

An even earlier pass ran **one step per slide**, interleaving "write the headline" with
"upload a photo" on every card, and left refinement and export out of the run altogether.
That was overriding an explicit instruction. If per-slide stepping looks attractive again,
it is still wrong.

**Steps that have nothing to ask do not appear.** A Google review has no QR and no listing
number — and since the rebuild no background photo, no wash and no photo strength either, so
it runs **Content → Agent → Save**; weekly has no agent block, so it
runs Content → Photo → Listing → Look → Save. `guideSteps()` filters `GDPHASE` down to the
phases that actually produced asks, and each surviving step keeps **`pi`**, its index into
`GDPHASE`. An ask's `phase` is always that `pi`, never a position in the filtered list —
so `idx` resolves with `steps.findIndex(st => st.pi === ask.phase)`, `goTo` jumps via
`steps[i].pi`, and the dots read `gdPhaseIssues(st2.pi)`. Mixing the two up silently sends
the stepper to the wrong step on any template that drops one.

**The Agent step is photo, then name, then role** — the order the block reads in on the
card. `AGENTFIELDS` names the per-slide fields that are agent details rather than copy
(`review`: agentName/agentRole; `tagent`: name/role), and `isAgentField` keeps the Content
step from asking for them twice. A listed card's agent is project-level (`s.agent`), a
review's is per-slide; both land in the same step. A ranking card's blurb stays as copy —
it is the card's message, not a contact detail.

**Two layouts, from the reference designs.** A single-slide template puts the questions in a
left column with one big card on the right; a carousel puts them above a **filmstrip** whose
active slide is centred and larger. Inactive cards still show their own skeleton, so the whole
carousel is legible at a glance.

**The card is the real 3:4 render**, not an approximation: `gdRenderAll()` runs the same
`buildOps` the export uses at `gdScale()` — **derived from the card's own CSS times the device
pixel ratio now, not the old flat 0.4**, which was 2.25x too small and is why the preview read
blurry; see *THE GUIDED CARD'S BITMAP WAS SMALLER THAN THE CARD* — and hands back a data URL
per slide.
That is the only way it can "look exactly like the template" and stay that way when the
template changes — a hand-drawn skeleton was a second layout to maintain and drifted
immediately. `gdSync()` is key-guarded on `strip(state)` plus a `_filledStamp` (so a photo
landing also invalidates), and the shell's `componentDidUpdate` calls it only while
`screen === 'guide'`.

`OrganicStudio.SKEL` survives as the **pre-render skeleton only** — the pulsing bars shown
before the first render lands, so the screen never opens on a blank rectangle.

**Sizing is off viewport HEIGHT, never width.** `min(76vh,700px)` for the single card,
`min(70vh,640px)` for the active carousel card. Width-based sizing overflowed the moment a
step carried more than three questions, which is what made the first carousel pass unusable.
The carousel is a masked reel — active card large and centred, neighbours faded off the right
edge — and the questions sit in a left column in both layouts, which is what actually fits
five questions.

**ONE CHUNK PER SCREEN, not one question.** This is the point of the six steps and the
thing that was missed the first time: renaming the phases while still paging one question
at a time left the run exactly as long as before. A chunk is **one step's questions for one
card** — `gdRows` is every ask sharing `phase + si` (post-level steps carry no card, so
they are one chunk each), and the input column renders them together. Weekly with one
property is 18 asks but **8 screens**; the Agent step is photo, name and role on one
screen, which is what "AGENT DETAILS (IMAGE + NAME + POSITION)" meant.

`gdRowView(ask, i, …)` builds one row's worth of view — label, control, slots, handlers —
so the loop can build several. The screen used to render exactly one of these.

`advance()` moves chunk to chunk, gating the **whole chunk**, and still checks the whole
PHASE when the next chunk belongs to a different step — a carousel's other cards are in
the same phase but a different chunk and must not be skipped.

A field is marked in red only once Next has been refused (`badOn` tests membership of
`_gdBlock`), and the message itself is only emitted then — `.gd-askbad` coloured on a flag
but always rendered its text, so every empty field announced itself on arrival. Landing on
a screen of eight fields already shouting is the wall of warnings the chunking exists to
avoid.

**Within a chunk the asks are still individually gated.** `guideAsks()` is the flat sequence of asks,
each tagged with its `phase`: phase 0 walks every slide's copy fields in tier order
(headline before supporting line before details), phase 1 walks every picture, QR and
`img`-flagged field, phase 2 is the two refinement sliders, phase 3 is export.
`state.gdAsk` is the **single** index: the step shown is `asks[gdAsk].phase` and the card
shown is `asks[gdAsk].si`, so step, question and preview can never disagree. The question carries a number
badge, the answer field is the largest thing on the screen, **Enter advances** (Shift+Enter
and textareas keep the newline), there is an `OK ✓` button with a `press Enter ↵` hint,
up/down chevrons, and a thin progress bar across the whole run. `gdAskIssue(ask)` gates a
single ask and returns prose, so the block reads as an answer to what was just typed.

For a property page that produces exactly: Marketing USP → Property type → Community /
building → City → Bed → Bath → Area → Price → Property photo → QR code → Listing number.

**The gate is on the phase boundary.** `gdPhaseIssues(pi)` is what a whole phase is still
short of, and `advance()` refuses to cross into the next phase while it returns anything,
naming every outstanding item ("Words is not finished — Property 02 — Community /
building"). Within a phase you can move freely; `gdAskIssue(ask)` still gates the single
ask you are on. Required copy is checked in phase 0 but **`img`-flagged fields are
deliberately left to phase 1** — gating phase 0 on a field that has not been asked for yet
would deadlock the run. Phase 2 requires nothing: refinement is a judgement, not a
requirement. Phase 3 is the whole of `exportBlockers()`, and when it is non-empty the
download buttons are not rendered at all.

Verified: a weekly carousel is 21 copy asks → 8 picture asks → 2 refinement → 1 export;
a single-slide announcement is 5 → 3 → 2 → 1. Blanking a required field blocks the Words
boundary and names it; a short listing number blocks export and removes the buttons.

**Moving between asks also moves `activeSi`.** That is what lets the input column reuse every
per-slide control the editor's rail already has — the property QR slot, the cut-out toggle,
the review agent — instead of a second copy of each. Never advance `gdStep` without it.

`OrganicStudio.PAGE` gives each slide kind its page title and a one-line purpose, shown as
the input zone's heading and folded into the helper line under the preview.

**The guided run offers the same control the rail offers, for the same field.** The flag
vocabulary carries the control type, so the spec is the single place it is decided:
`sel@ptypes` / `sel@city` / `sel:a|b` render a dropdown (and `sel@ptypes` / `sel@teams` keep
the rail's "+ Add new…" prompt), `step` renders the ‹ › stepper, `seg:a|b` the pill pair,
`area` a textarea, `num` / `len11` a filtered input. Field labels are the rail's labels —
`usp` is "Marketing USP" in both.

**`img` puts a field in the Images group** rather than in a tier, which is how the listing
number ends up beside the picture and the QR instead of in a "Reference" group of its own.
`TIERNAMES` gives per-kind group headings, so a property page reads Headline → Property
details → Images.

**Locked layers are marked, not offered.** `OrganicStudio.LOCKED` names them (grid, margins,
wordmark, wash) and there are deliberately no inputs for any of them — they are brand rules,
not choices. `.gd-lock` draws the template frame over the card and greys everything *outside*
it with `box-shadow: 0 0 0 999px`, so the margin band — where the wordmark and QR live —
reads as locked rather than as something the user forgot to fill.

**Two grounds.** The input zone sits on `--ps-deep`, the preview zone on the brand navy, with
a hairline between; the halves are different jobs and should not look like one surface.

**A field can depend on another answer.** `fieldsFor(kind, f)` takes the slide's own values
and drops fields that do not apply, through `fieldShown` — Top agents asks for a month only
when the period is Monthly, a quarter only when it is Quarterly. Every caller passes the
slide, so the run, the gate, the checklist and the rail all see the same list. The rail had
always done this conditionally; the run was asking for all three at once.

**Title Case is for the SHORT fields the user types** — property type, city, community,
Marketing USP, reviewer, agent name and role, team — applied at render, so what is stored is
whatever was typed. Deliberately excluded: the review quote and the agent blurb, because
title-casing a sentence reads as broken; the eyebrow-role labels, which are tracked caps by
design; and anything numeric. `propLines` used to LOWER-case the property type when a USP was
present, which is why "Ready to Move villa in …" appeared — it is `toTitle` now like the rest.

**A `<select>` has no empty state.** With an unset value the browser shows the FIRST
option, so the question read "Villa" while the field was still `''` and the card stayed
blank — the dropdown looked broken. `gdSeedSelect()` commits the displayed value the moment
that ask becomes current, called from the shell's `componentDidUpdate` **before** `gdSync`
so the card is built from the value already on screen. Only the ask you are on is seeded;
questions further down stay unanswered. This is the one exception to "nothing is pre-filled"
— a dropdown is always displaying an answer, so the preview has to agree with it.

**One Property type dropdown, two templates.** `selPtype()` in the rail is shared by the
listed card and the weekly property page, including the "+ Add new type…" prompt. It was
written inline for weekly, and copying it for listed would have been a second version to
keep in step. Bed and bath open at `0` rather than blank, so the stepper starts somewhere.

**Guided setup lives at the foot of the slides rail**, not in the top bar: a small looping
illustration of the run, the helper line, then the button — in that order. The loop is
4.2s, low-contrast and honours `prefers-reduced-motion`; it is an illustration, not an
alert.

**Scale and fade, nothing else.** A 260ms slide on `.gd-strip` was tried and read as
springy — not because of its easing but because the strip travelled while the active card's
height snapped, two motions fighting each other. The strip repositions instantly now and the
whole transition is the cards: `opacity` plus a `scale(.97) -> scale(1)` at .16s ease-out.
Do not reintroduce travel on the reel.

**Motion is small on purpose:** 140–200ms, `ease-out`, **3px** of travel, no overshoot, no
pulsing and no looping. Groups arrive first, then the fields inside them, 30ms apart. Two
earlier passes used spring curves and a pulsing Next and both read as fussy — verified that
nothing in the run animates longer than 200ms.

**How it is reached:** picking any template — from the project browser's cards or the
richer "Pick a template" screen — routes through `pickTpl`, which sets `screen: 'guide'`.
An existing project gets back in via **Guided setup** in the top bar (Organic only).
`gdSkip` / `Refine & export` leave for the editor.

**Four things that bit during the build:**

- **`load()` was overwriting `screen` on resume.** `pickTpl` sets `screen:'guide'` and then
  reloads, and the resume branch forced `'editor'` — so the run was discarded every single
  time and looked as though it had never been built. Resume now keeps `'guide'` when that is
  where the project was. Any new screen added to Organic has to be allowed for here.


- **`transform: translateX(calc(... var(--i) ...))` did not re-evaluate** when the custom
  property changed, so the filmstrip stayed pinned at its first offset. Centring is done by
  **measurement in the rAF tick** instead — which also handles resize for free. It has to
  live in **Organic's** tick; putting it in Campaign's meant it never ran.
- **`data-x="{{ someBoolean }}"` is the trap again.** `gdBlocked` was a boolean, so DC
  rendered `data-blocked="false"` and `[data-blocked]` matched it — the Next button styled
  itself as blocked even when the step was clear. Every one of these needs `'1'` / `undefined`
  (`gdBlockedOn`, `wizClearOn`, `wizBlockedOn`). Next also has a `data-ready` state that
  brightens and pulses once the step is satisfied.
- **`width:100%` plus padding needs `box-sizing:border-box`.** Without it the question inputs
  overflowed their column and a horizontal scrollbar appeared as a stray light bar under the
  fields.
- **Flag parsing must not split on spaces.** `seg:Just listed|Just sold` was being cut at the
  first space, so the segmented control offered "Just". `seg:` is always the last flag, so
  take everything after it.
- **Five questions in one column overflowed the viewport**, and the alternative — one question
  per screen, as the reference literally shows — turns a property into nine screens. Carousel
  steps go **two-up** in a grid instead, which keeps the step count down and still fits.

## Organic guided mode (in-editor rail) — DELETED

> **This whole section describes a feature that no longer exists.** The four-step in-editor
> rail was superseded by the step-by-step SCREEN above, hard-disabled (`wizOn: false`) at
> that point, and finally deleted markup-and-all by the audit pass — see *The app-wide
> dead-feature audit*, which also records the two live bugs it was still carrying. It is kept
> here because three things in it are still true and still load-bearing, each marked below:
> `OrganicStudio.FIELDS` as the one field table, `bgSidFor`, and the story canvas being off
> by default app-wide. Everything else — `WIZ`, `wizIssues`, `wizNext`, `wizPhotos`, the
> `guided` / `All controls` split — is gone.

Organic's default *was* a **four-step run** — Words → Pictures → Polish → Export — because it
is used mostly by people who do not design for a living. `state.guided !== false` turned it
on; the expert rails sat behind **All controls** (`guided: false`), which is
why nothing had to be deleted to build it.

**`OrganicStudio.FIELDS` declares every field once**: key, hierarchy tier, label,
flags (`req` `num` `len11` `area` `w40` `seg:a|b`) and a hint. The panel order, the tier
headings (`TIERS`: Headline → Supporting line → Details → Reference) and the gate all read
from that one table, so a field cannot be required by the gate but missing from the form,
or vice versa. Add a field there and it appears, validated, in the right tier.

**The gate is the point.** `wizIssues(step)` returns what is still missing:

- step 0 — every `req` field on every slide, plus `len11` digit checks
- step 1 — one photo per slide *that needs one*, plus the QR half of the export gate
- step 3 — the whole of `exportBlockers()`

`wizNext()` refuses to advance while the list is non-empty and **says what is missing**
rather than doing nothing. Verified: emptying a listing number blocks the step and reports
it; filling it advances. The step buttons carry a live count badge, so the work left is
visible before you get there.

`bgSidFor(sl)` is why the photo step asks for the right number of files: a `cta` slide
reuses the cover's picture and a `review` card has none, so neither gets a row of its own —
`wizPhotos` dedupes by slot id and notes the sharing on the cover row instead. Asking twice
for one file, or once for a file that is never used, is the failure this avoids.

**Only the feed is on screen — and that is now true APP-WIDE, not just in guided mode.**
`storyVisible` was `s.guided === false`, and since `load()` sets `guided = false` on the way
into the editor, every project opened with two canvases on the stage. It is `!!s.storyOn` now,
default off, with a **Show story 9:16 / Hide story 9:16** toggle in the canvas bar under the
stage — one instance, because `.p-cvbar` sits outside the per-slide plate loop where a
`.p-meta` button would have repeated six times.

**IT GOVERNS THE EXPORT TOO, and that REVERSES what shipped one pass earlier.** The first cut
was "it hides a preview, never an output" — the story was still written either way. By request
the two are one decision now: **if the story canvas is not on screen, its files are not in the
export.** `doExport` builds its size list from the flag (`['ft']` or `['ft','st']`), and every
raster and SVG path reads that list.

**The second asset load goes with it.** `loadAssets` decodes every photo, QR and portrait in
the project, and it was being called for `'st'` unconditionally — so a feed-only export paid
for a full second decode of everything and threw it away. Verified by instrumenting the call:
`['ft']` with the story hidden, `['ft','st']` with it shown.

**EVERY EXPORT ROW STATES ITS SIZES, because a silently halved output is worse than the old
behaviour.** `exportJpgDesc` / `exportPngDesc` / `exportSvgDesc` read the same flag and say
"feed only, story hidden" or "feed + story per slide" before the button is pressed, and the
status line appends `· feed only — the story canvas is hidden` after it. Do not let those drift
from `doExport`'s own list.

**`strip()` still deletes `storyOn`, and that is still right** even though the flag now has an
output consequence: which sizes you are *looking at* is not a change to the artwork, so it must
not churn the undo stack, the re-render key or a recents thumbnail. It rides in the saved
project, so the choice survives a reload.

**Two stale claims this pass corrected on the way, both plainly wrong before the toggle existed:**

- **`exportPdfDesc` promised "feed then story".** The PDF branch has always hardcoded `'ft'`
  and its own status line has always said "feed pages" — so the label had never been true. It
  reads "feed pages only" now, and the PDF is untouched by the toggle because it was already
  feed-only.
- **The All-slides tooltip promised "a Feed 3x4 and a Story 9x16 FOLDER".** Organic writes
  **flat** and always has, telling the two apart by a `_3x4` / `_9x16` filename suffix. It is a
  render key now so it can also state which sizes will ship. In the same place, `filePreview`
  showed the bare stem — a name the export never writes — and now shows the real suffixed
  filenames.

**Proved the artwork did not move without needing an op diff:** the change is seven hunks, and
no line touching `ops.push`, `renderOpsTo*` or a `buildOps(` call site differs from the
pre-change file. Verified end to end on a six-slide carousel: **6 files, none matching
`_9x16`** with the story hidden and **12** with it shown, for PNG and SVG alike.

The original note, still true of the guided run: the 9:16 story canvas is behind
`<sc-if value="{{ storyVisible }}">` (false in guided mode) — still built, still exported,
just not a second thing to worry about, with a line under the feed canvas saying so.

Organic gained **photo strength** (`state.imgO`, 10–100) to match the requested refinement
step; Campaign already had `bgO`. It needed three touches: the alpha on both `isBg` image
ops, `alpha` support in Organic's canvas renderer *and* its SVG renderer (neither read it
before — Campaign's did), and `imgOWrapStyle` on the preview's `.canvasbg`. Verified end to
end at 45%: op alpha 0.45, `.canvasbg` opacity 0.45, and `opacity="0.45"` on the exported
`<image id="bgphoto">`.

**STILL TRUE, and it very nearly went down with the wizard.** Its only control was in that
rail, so the value was fully wired and unsettable from the advanced workspace — the reverse of
this file's guided-mirrors-advanced rule. It is a group in the Canvas section of the rail now;
see *The app-wide dead-feature audit*, #12.

**Two traps re-confirmed here.** `_filled` is refreshed from a rAF tick, so photo checks
look stuck at "needs a photo" whenever the browser pane is not rendering — screenshot
before diagnosing. And `:empty` does not hide a DC-rendered span: the interpolation leaves a
whitespace text node, so the step badge needs an explicit `data-w` flag.

## The Google reviews card was rebuilt to `Instagram Story - 39.svg`

The old card was the weakest of the four and this file said so: *"four type sizes inside one
30-34px band with everything centred, the quote no larger than its own attribution, two
attributions in two places for one review, ~230px of dead canvas below the panel, and a
circle-cropped avatar that contradicts the listed card's 'never cropped to a circle'."* All
five are gone. `review` is used by no other template, so the whole change is scoped by
construction.

**Proved at the op level: 34 slide-by-canvas-and-card groups, all 34 byte-identical, 481
ops.** See *The shared-code change was isolated and proved inert* below for what that diff
actually compares and why it is the right one here.

### THE GROUND IS A BUNDLED PLATE, and the review has no photo upload at all

`google-reviews-bg.png` is 2160x2880 and 5.5MB. It measured **100% opaque**, so it
compresses as a photograph, and it went to **37KB of WebP at 1080x1440** — the canvas
exactly, so the feed lands it 1:1 with no resampling. `REV_BG` / `revAsset()` / `revReady()`,
with `revReady` joined into `bundledReady()`, the one gate both asset consumers read.

**Bundled, not uploaded, for the reason the fonts and the award's glitter are**: this studio
runs offline and off the disk, and a template's own ground is not a question to ask the user.

**FLAGGED `isTex`, and that is load-bearing rather than a label of convenience.** `isTex` is
what the SVG exporter names `#bgtex`, and the card's backdrop blur re-draws layers **by
name** — verified in the export: the blur group reads `<use href="#bgtex" filter="url(#bl2)"/>`.
Without a name, SVG glass would blur nothing and export flat. `isBg` would have been wrong
twice over: it subjects an op to the photo-strength alpha, and it claims `id="bgphoto"`.

**So `photoUsed` gained `review`** — the third kind that draws no uploaded background — which
takes out the Background-image drop zone, its guided ask, its status line and its exported
`photo-01-*` in one edit. **And the photo push in the prelude is now gated on that
predicate**, where it was unconditional: on `tacover`, `award` and `review` it was pushing
into a `bgOps` nothing reads, i.e. paying for a decode that draws nothing.

### THE QUOTE'S COLUMN IS BOUNDED BY THE AGENT, NOT BY THE CARD

This is the one thing the first cut got wrong, and the way it was caught is the useful part.
The card is **891** wide with 60 of padding, so the obvious column is 771 — and at 771 the
drawing's twelve lines wrapped to **five**. The drawn lines are ~28 characters, not ~66.

The agent stands over the card's right half from x 513, so the copy stops before her. Solved
from the drawn lines rather than guessed: measuring all twelve at 27/300 with -.024em, the
longest is **346.39** and the tightest overflow (line 6 plus the next word) is **357.79**, so
the drawn column is in **[346.39, 357.79)** and its right edge lands at 501.4..512.8 against
the window's own **513**. `colGap` is **6**, the dead centre of that window (colW 352), which
is where a font revision has the most room to move without re-breaking a line.

**At 352 the wrap reproduces the drawing's twelve lines word for word** — every break on the
drawn word.

**The lesson generalises: a column derived from the panel is wrong wherever something stands
in the panel.** The listed card already had `colGap` for exactly this and it was not carried
across. Reproducing the supplied wrap is the check that finds it; matching the panel's
padding is not.

### EVERY NUMBER CAME OFF THE SVG, and the vertical chain is a uniform +11.80

| | drawn | ours | d |
|---|---|---|---|
| card x / w | 95 / 891 | 95 / 891 | **0.00** |
| card h (12 lines) | 768.5 | 768.493 | **-0.01** |
| wordmark baseline | 111 | 122.80 | +11.80 |
| card top | 258.002 | 269.801 | +11.80 |
| star ink top | 318.002 | 329.801 | +11.80 |
| quote, first baseline | 432.502 | 444.301 | +11.80 |
| reviewer baseline | 956.502 | 968.295 | +11.79 |
| card bottom | 1026.502 | 1038.295 | +11.79 |
| agent name baseline | 1287.463 | 1287.499 | **+0.04** |
| agent role baseline | 1333.463 | 1333.500 | **+0.04** |

The +11.80 is the wordmark moving onto the studio's own `pT + tk.logo * .8`, and everything
above the identity block hangs off it — one consistent shift, the call the listed card's
uniform -32 and the award's -7.2 both record. The identity block is bottom-anchored to the
MARGIN instead, so it holds its place while the quote grows the card downward from a fixed
top; that is why it lands on the drawing to 0.04.

**And the parts sum to the drawn height exactly**: `quoteTop + 11 x lead + revGap + padBot`
= 174.5 + 422.4 + 101.6 + 70 = **768.5**. That is what says the decomposition is right rather
than merely close.

**The type lands on values already in the file.** The quote's 27 and its 1.4222 lead are the
listed card's own `uspPx` / `uspLead`; the identity block's 35 / 24 is that card's `namePx` /
`rolePx` verbatim. So the two templates print an agent the same way rather than nearly so.

### ONE TYPE SIZE SERVES BOTH CANVASES, and that is not a shortcut

`revBox` is the single geometry source — read by `buildOps`, by the preview and by the rail's
own word-count note, the shape `listedBox` / `taCard` / `wkSpecBox` / `awBox` already have.
The listed panel needs a `pk` scalar because its width differs per canvas; here that scalar
would be **1**, so there is nothing to scale: the card is 891 on the feed and 851 on the
story and its content column is set by the agent's window, which is at x 513 on both.

**THE CARD IS INSET INSIDE THE MARGINS, NOT A FRACTION OF W, and getting that wrong breaks
an explicit organic rule.** `.825 x W` reproduces the drawn 891 on the feed — and gives 891
on the story too, which puts the story's card **26px outside its right margin**. Read off the
drawing properly it is 15 in from the left margin and 14 in from the right (95..986 against
80..1000; the 1px asymmetry is drawing slop, and both numbers together reproduce 891 exactly).
Derived from `innerW` it is 14 inside the margin on **both** canvases, measured.

### THE BLUR CONTAINER IS THE HOUSE GLASS, by request

`ART.deepGlass` over a `blur` op at **`TA.panelBlur`** (30) with the single `ART.hairEdge`
stroke — the material the ranking panel and the listed panel already carry. The drawing
states an OPAQUE `#1a2942` with a `.33` stroke, and **reading that literally is exactly what
silently dropped the blur on the ranking card**: `backdrop-filter` under an opaque fill has
no visible effect whatever, so there was nothing to see and nothing to blur. There is ONE
glass panel edge in this file and this card takes it.

**Three ART tokens went with the old card, deleted rather than left dead**: `glass` and
`glassEdge` (the review was their last reader) and `pillEdge`, which had already lost its
only user when the weekly CTA was rebuilt. `inkQ` went too — see the note below. `centerText`
went with them: the old review card was its only caller. And `PXT` lost `quote`, `rname` and
`stars`, which nothing else ever read.

### THE SCRIM IS FIXED, NAVY AND RAMPED — and the slider disappears with it

The drawing's own `Rectangle_5`: a 1080x720 box at y 720 carrying a navy gradient that is
transparent at its top and solid 78.2% of the way down it. Emitted as ONE full-canvas `grad`
op with four stops (`scrimTop` .5, `scrimFull` .891 as fractions of H, so the story follows),
which is also why the preview can mirror it with a single background gradient on the
`scrimStyle` div that every kind already has.

**`N` IS UNCHANGED AND MUST STAY BLACK.** It is black in both renderers because "a review
with no photo read navy however black the rect underneath was" — the very card this pass
rebuilt. The navy here comes from **`OrganicStudio.deepA(a)`**, derived from `ART.deep` rather
than spelled out, so the no-literals rule holds and the navy is still declared once. The SVG
renderer's `grad` branch parses `rgba(r,g,b,a)`, which is exactly that shape — verified in the
export: `stop-opacity` 0 at 0, 0 at 0.5, 1 at 0.891.

**And `scrimUsed` lost its `sl.kind === 'review'` clause**, which was an always-true term
standing in for the old full-canvas black rect. It reads `scrimBands` alone now — the only
thing the slider actually drives — so the wash control disappears on the review template
exactly as it already does on Top agents. Measured after: `scrimUsed` is true on listed and
weekly, false on agents, review and award.

### THE CONTROLS, per `Group 62.png` — red removes, green redesigns

| | what happened |
|---|---|
| Overlay darkness | gone — `scrimUsed`, above |
| Photo strength | gone — a NEW predicate, `imgOUsed`, below |
| Background image | gone — `photoUsed('review')` |
| All slides | gone — `allSlidesOn`, and it was a PRE-EXISTING empty region on three templates |
| Agent — this review | redesigned, below |

**`imgOUsed(state)` is the third predicate derived from the render**, beside `scrimUsed` and
`photoUsed`. Photo strength reaches exactly two things — the alpha on an `isBg` op and the
ranking cover's group figures — and the review has neither. It was documented as needing no
gate on the reasoning — **since superseded by `imgOUsed`; the award and the review carry
neither** — that "every kind either carries a background photograph or, on the
ranking cover, the five group figures"; that reasoning has been false since the award card
landed. Measured: `imgOUsed` is true on listed, weekly and agents and **false on review AND
award**, so the pass removes a second dead control nobody had noticed.

**AND THE GUIDED RUN HAD TO BE GATED IN THE SAME PASS**, or the projection inverts. With the
rail's slider gated and the run's ask left alone, the run would be asking a question the
advanced workspace cannot answer — *the exact inversion the dead-feature audit records, in the
direction it warns about*. Both `scrim` and `imgo` are gated now, so on the review template
the whole **Look** step drops out: the run is **Content -> Agent -> Save**, verified, and the
rail shows the same three things.

**The All-slides section was ALREADY EMPTY on three templates.** All three of its groups are
template-scoped — `agentOn` and `qrGlobalOn` are listed-only, `awLogoGrpOn` is award-only — so
weekly, Top agents and Google reviews have all been rendering a caption over nothing.
`allSlidesOn` is read from the same three flags the groups are gated on, so the section cannot
claim to hold a control that is not rendering. One derived predicate fixes all three.

### THE AGENT IS A FULL-HEIGHT CUT-OUT IN THE RIGHT-HAND WINDOW

The drawing's red dashed box is **x 513, 567 x 1440** — the right 52.5% of the canvas at full
height — and it is the upload region. She is drawn **in FRONT of the card**, which is what the
reference render shows and what makes the card read as a surface she stands beside rather than
a pane she is behind. It is also why she needs no `layerId`: nothing blurs over her.

**Framed by the same `agentPlace` the listed card uses**, with `headTop` at that card's own
`.04`. So a headshot, a half-body and a full-body upload land identically, and identically on
BOTH cards, rather than each being framed by hand. Verified on a synthetic cut-out with a neck
notch and 8% of transparent padding at its foot: the crown lands on the mark to **0.00 on both
canvases and both axes**, the drawn aspect equals the file's to five decimals (no distortion),
and the ink covers the window on all three constrained sides.

**The cost is the one that card already documents**: cover is width-driven, so the head's size
follows the ink's width and a tight crop arrives large. One rule for both cards beats two.

**She is PAINT ONLY on the canvas and the rail is the drop target**, exactly as the listed
card's agent is — a child of `frameStyle` inherits `pointer-events: none`, which is the
documented reason. The preview places her with `clip-path: inset()` rather than a wrapper div,
so cq() canvas units land on the op's pixels and no markup grows a second node in both size
canvases.

**She is PER SLIDE (`smp-agent-r<id>`), not the project-level `smp-agent`**, so she needed a
per-slide view: `_assetView.ragent[si]`, carrying `ink` / `head` / `aspect`, scanned in the
same rAF tick that measures the photo and the parallax. Both scans cache on the URL, so the
export's own calls are free after it.

**Three places take the two scans, not one.** `loadAssets` needed them AFTER both of its paths
(the sidecar entry and `domFill`'s DOM fallback), and **`backfillRecentThumbs` needed them
too** — that map is built by hand, so a measurement `loadAssets` takes has to be taken there
as well or a cold-start recents thumbnail of a review frames the agent by her file box instead
of her face. That is `bundledReady`'s own lesson one layer down.

**The rail's drop zone carries the WINDOW's aspect**, derived from the constant that declares
it, so the target cannot come to depict a different crop than the card draws. It was a **58px
circle** — a crop this card has not used since it was rebuilt, and the same class of lie a
hand-drawn miniature is. 84px wide (the listed agent slot's own width, so the studio's two
agent drop zones share one) gives 213 tall; measured ratio **0.39377** against the window's
0.39375. Tall, and that is the honest consequence of depicting a full-height window — there is
room because this template's Canvas section holds that one group and nothing else.

### TWO IDENTICAL WHITES, AND A NAMED FLAG IS WHAT TELLS THEM APART

The template card is a skeleton by request — black ground in dark mode, paper in light — and
that is the one genuine design problem in the whole rebuild. On a paper ground the card must
stay dark navy glass with **white** copy inside it, while the wordmark and the identity block
must flip to **navy**. Both sets are `ART.ink` on the real card.

**`gnd` on the op is the answer, not a second white token.** `ART.inkQ` (`rgba(255,255,255,.94)`)
was sitting unused and would have done it — and it would have shipped a 6% dimmer wordmark on
every real review to serve a 238px preview. A flag costs the artwork nothing. It is the same
reasoning `tplGroundSwap`'s image filter already records: **filter by named flag, never by
`op === 'image'`.** `inkQ` is deleted.

Exactly three ops carry `gnd` — the wordmark, the agent name and the agent role — verified
across all five templates: only the review emits any.

**The review joins the award's branch in `tplGroundSwap`**, since both cards' grounds ARE
photographs; only the ground fill differs. The branch drops `grad` as well as `image`, because
a navy ramp over a themed ground is neither the drawing nor a layout — and **neither kind
emits any other gradient**, verified (`scrimBands` has no branch for either), so that filter
cannot reach a wash that carries information. The award's own card is proved unmoved by running
the OLD swap function against the new one on the same built ops: **byte-identical in both
themes, 5 ops each.**

Measured off the rendered cards:

| | dark | light |
|---|---|---|
| ground corner | rgb(0,0,0) | rgb(255,255,255) |
| card fill | rgb(18,26,44) | rgb(106,117,133) |
| white copy on the card | 17.36:1 | **4.67:1** |
| wordmark against the ground | 21.00:1 | **14.38:1** |
| agent name against the ground | 21.00:1 | **10.74:1** |
| brass stars against the card | 4.53:1 | — |

4.67:1 clears the 4.5 body bar outright, and every run on that card is >=24px, which is WCAG
large text at 3:1. The two light-mode ground figures are the `gnd` flag proving itself: without
it both would be white on white at 1.00:1.

**The demo quote was lengthened with it.** `TPLDEMO.review.quote` was one line, which at the
new 352 column left the tile mostly empty; it is seven lines now, filling the card the way the
drawing's twelve do. Demo copy only — `tplSlides` seeds nothing, so it reaches no project and
no export.

### The star row came out exact rather than fitted

Measured off the real face at 100px: the `★` glyph's advance is **1.000em**, its ink is
**0.980 x 0.950** and its ascent is **0.870**. So the drawing's 28.5 of ink height is **30px
exactly**, and five 30px stars 8 apart span 5x30 + 4x8 = **182**, which is the drawn row
(x 155..337) to 0.6px. The design tool placed a 30px Material star and the font agrees with it.

**The tracking is still SOLVED from the measurement rather than written as 8**, because `meas`
reserves one unit per character including the last: ink = advance + (n-1)*ls, so
`ls = (starW - natural) / (n-1)` lands the row on 182 whatever the face reports. It computes to
**8.0000** today — the drawing's own gap — and the op and the preview both read it, so they
cannot disagree.

### Three single-line runs are FITTED, because a name must not wrap

The reviewer to the quote's column, and the identity block to the column that starts at the
card's left edge. A long name would otherwise run under the agent — the failure the listed
card's role fit records. Stepped and never solved (this font's width per em is not constant
with px), floor `fitMin` .8, and the predicate is the consumer's own measurement with the
trailing tracking unit removed. The two bottom baselines read the FITTED sizes, or the block
would drift as a name shrank.

### The preview mirrors the ops, and the one place it cannot

**Preview against ops in ONE coordinate space, all seven runs plus the card: worst delta 0.51
canvas px**, which is the integer rounding of `offsetTop` — 0.21 device px at the measured
zoom, well under the floor. Every `x` exact; every size, weight, tracking and colour matching.
The card's box matches to 0.20 on y and 0.00 on x and w.

**The one honest gap is the hairline's THICKNESS, and it is shared with the other two glass
panels.** The op strokes 1 canvas px; Chrome floors a visible border at one device pixel, so
inside the zoomed box the preview's `border: 1px` computes to **2.45 canvas units**. Nothing
shifts — the card is `box-sizing: border-box` and its content is positioned against the canvas,
not against the card — so the only cost is that the edge reads heavier in the editor than in the
export. `box-shadow` is the documented fix and would be more faithful here, but the listed and
ranking panels both use a border, and making this one card's edge fainter than theirs would
break the very consistency this rebuild was asked for. **It is one substitution in three places
when someone wants it, not one in this card alone.**

**A PROBE NOTE THAT COST A ROUND: DC WRAPS INTERPOLATED TEXT IN A `span.sc-interp`.** A filter
for "an absolutely positioned element whose only child is a text node" therefore finds the
elements carrying LITERAL text and misses every interpolated one — it reported 2 runs out of 7
and looked exactly like a markup bug. Match on `textContent`, or on "has no element child".

### The export

- **SVG**: valid `viewBox="0 0 1080 1440"`, 2 images, 17 texts (12 quote lines + stars +
  reviewer + wordmark + name + role), 1 `linearGradient`, 1 filter, `id="bgtex"` present and
  re-drawn inside the card's blur backdrop. A base64 data URI carries no `<` or `&`, so
  `renderOpsToSvg` writing `o.url` unescaped is safe here.
- **Canvas against SVG on the non-text layers**: 31,724 sample points, **mean 0.52/255**, worst
  17/255 — and that worst is at (963, 270), on the card's own rounded top-right corner, i.e.
  rasteriser antialiasing between two engines. Text is stripped from BOTH sides because an SVG
  rasterised through `new Image()` is an isolated document and cannot load the page's webfont.

### The shared-code change was isolated and proved inert

A full pre-rebuild baseline would show the review's own groups changing, which is the point of
the change and tells you nothing. So the PRE served alongside was the **final file with exactly
the two shared-code lines reverted** — `photoUsed`'s definition and the prelude's photo-push
gate, the only edits in this pass that any other template's ops can reach. Everything else is
either inside `if (kind === 'review')`, dead-code removal with zero references (verified by
grep), chrome, or `tplGroundSwap`, which post-processes a template card and was proved
separately against its own old implementation.

**34 groups, 34 identical, 481 ops, 0 threw.** Ops for all five templates on both canvases,
plus each template's card in both themes.

Also checked: **no duplicate key in `renderVals`** (169 keys, no repeat); the interpolation
sweep unchanged against the same PRE (220 refs, same unresolved set, **no newly unresolved
key**); `<sc-if>`/`<sc-for>` balance identical to a pre-award baseline (the one "unclosed"
report is a bare `<sc-if>` inside a CSS comment, the documented false positive); **856 CSS
rules parse and this pass authored no CSS at all**; the file boots clean with `renderVals`
returning 287 keys and all five template shots rendering.

**The photo store was never touched.** The upload test ran through the slot's own `_ingest`
against `window.providentRuntime.mode === 'indexeddb'` — the runtime's shim, which writes to
the serving origin's IndexedDB — and the probe refuses outright if the mode is `omelette`.
`.image-slots.state.json`, `Provident Campaign Studio.dc.html`, `studio-base.js` and
`ui-design-system/` are all unmodified, verified by mtime. **No kit change, so nothing is owed
to the three mirrors.**

### THREE PREVIEW BUGS THE REVIEW REBUILD SURFACED, and only one of them was the review's

Reported as "design parts are not showing accordingly" in the editor while the EXPORT was
correct — which is the shape of every preview/op split in this file, and the reason each of
these is worth writing down separately.

#### 1 — DOCUMENT ORDER IS THE PAINT ORDER, so a layer's slot in the markup IS its z position

The review's bundled ground plate was put inside the `isReview` block, which lives inside
`frameStyle` — and `frameStyle` is declared AFTER the shared `scrimStyle` div. Two
`z-index:auto` absolute siblings paint in document order, so **the plate covered the navy
ramp in the editor while the ops had it the other way round**: ground, plate, scrim.

The plate is a sibling of `taTexStyle`/`scrimStyle` now, one slot above the scrim, and it is
declared for every kind (`display:none`) exactly as the ground texture is. Verified by walking
the canvas's own children: plate at index 2, scrim at index 3, with the scrim computing the
op's own four stops — `rgba(26,41,66,0) 0%, rgba(26,41,66,0) 50%, rgb(26,41,66) 89.1%, 100%`.

**The general rule, and it is the counterpart of the z-index note the ranking card records:**
z-index mirrors a stack without moving DOM, but a layer that carries NO z-index is placed by
where you put it. `frameStyle` exists to hold *content* inside the margins — a full-bleed
GROUND does not belong in it, whatever the surrounding branch is about.

#### 2 — THE PREVIEW AND THE OPS RESOLVED THE PHOTO'S RECORD DIFFERENTLY, twice

The reported symptom was the listed card's parallax cut-out sitting in the wrong place in the
editor and correctly in the export. **The arithmetic was not the bug**: `fgStyle` and `drawFg`
both go through `photoPlace`, and they agree to **0.0000** — measured across six
`s / x / y / phs / phx / phy` combinations AND across six upload aspects (16:9, 4:3, 1:1, 3:4,
9:16, 12:5). What differed was what each surface handed that one function.

**(a) The preview keyed the photo by `si`; the ops key it by `bgIndexFor(state, si)`.**
`_assetView.crops[i]` / `bgDims[i]` are stored per slide index, and a **weekly CTA shares the
COVER's photograph** — so the preview read the CTA's own (empty) record while the export read
the cover's. Measured: `bgIndexFor` differs from `si` on exactly one slide in the five
templates, `weekly/cta`. Both preview readers use that same expression now. `listed` has one
slide, so this was never the listed symptom — but it is a real defect in the same lines.

**(b) The ops had a fallback the preview did not, and the two branches disagree by the whole
bottom anchor.** `loadAssets` reads the sidecar; when a slot is filled in the DOM but carries
no sidecar record it falls back to `domSlotView` and hands `buildOps` a **`pct`** crop.
`photoPlace` has a separate branch for that — and the `pct` branch reads the slot's own
rendered rect, which is CENTRED and **does not apply `PW.anchor`**. `_refreshAV` had no such
fallback: it produced `{s:1,x:0,y:0}`, which does.

Measured on a 1080x1920 upload, where the anchor is live: the `pct` branch puts the centre at
**720** and the `s/x/y` branch at **480** — a 240-unit split, on the one card whose window is
bottom-anchored, and it moves the parallax with it because the cut-out is locked to that same
`k` and centre. Every other aspect happens to have `my = 0`, which is why this hides.

The preview takes the same fallback in the same order now — sidecar first, `domSlotView`
second — so `photoPlace` cannot take different branches on the two surfaces. One source, both
surfaces, which is the rule the rest of this file already runs on.

**A CORRECTION TO WHAT THIS SECTION FIRST CLAIMED.** It said (b) was "the only mechanism that
can produce" the reported dislocation, and that the bug could not be reproduced. Both were
wrong, and wrong for an instructive reason: every probe compared `fgStyle`'s computed value
against `drawFg`'s and got 0.0000, because both read the render values and the render values
were correct. The DOM was not. The real cause is below — a rAF tick writing over the element
after every render — and it reproduces every time. (a) and (b) are still real divergences and
are still fixed; they simply were not this.

#### 2b — THE REAL CAUSE WAS A rAF TICK WRITING OVER `fgStyle` EVERY FRAME

Everything above about the two input divergences is real and is kept. **Neither was the
reported bug.** The parallax cut-out sat in the wrong place in the editor because a
live-follow hack in Organic's rAF tick was overwriting the layer's geometry after every
render:

```js
document.querySelectorAll('[data-fgv]').forEach(layer => {
  const slot = layer.parentElement.querySelector('image-slot[id="smp-bg-' + vi + '"]');
  const inner = layer.firstElementChild;
  const img = slot.shadowRoot.querySelector('.frame img');
  inner.style.left = img.style.left; inner.style.top = img.style.top;
  inner.style.width = img.style.width; inner.style.height = img.style.height;
});
```

**AND THE VALUES IT COPIED COULD NOT WORK.** `image-slot` positions its internal `<img>` with
`left:50%; top:50%` **plus a `transform: translate(-50%,-50%)`** in its own shadow CSS.
Copying the two insets without the transform puts the layer's top-left on the canvas CENTRE
instead of centring it — a box running from the middle to the bottom-right corner, sized at
the BACKGROUND's own percentages (`100%` x `133.333%` for a 1080x1920 photo in a 3:4 box, so
1080 x 1920 at 540,720). That is exactly the hard-edged rectangle in the report.

It predates `photoPlace`. When `fgStyle` was moved onto that one function the tick was left
behind, and **a second, cruder placement running every frame** is the "two geometry paths
drift" failure this file records over and over. Deleted; there is one placement now.

**THE DIAGNOSTIC TELL IS THE PART WORTH KEEPING, because it cost most of the round.**
`renderVals` reported the correct value. The element carried the correct value for one frame
after a React render. A later read of the SAME element showed the old one. Three probes in a
row measured `fgStyle` against `drawFg` and reported **0.0000** — because both were computing
from the render values, and the render values were right; the DOM was not.

**When a render value and the element's own inline style disagree, something is writing to
that element outside React. Grep for `.style.` before diagnosing the render** — and measure
the PAINTED element (`getAttribute('style')`, `offsetLeft`, a screenshot after a forced
repaint), never only the value the renderer produced.

A second-order trap inside the same hunt: the browser pane can hold a **stale composite**. The
DOM read correctly while the screenshot still showed the old paint; a viewport resize forced
the repaint. So a screenshot alone is not proof either — read the box AND look, and make the
two agree before believing a diagnosis.

#### THE CUT-OUT IS COVER-FITTED BY ITS OWN DIMENSIONS NOW, which is Campaign's construction

Ported by request, and it fixes a second, independent defect in the same layer.

`drawFg` took the BACKGROUND's scale (`p.k`) and multiplied the cut-out's own pixel size by
it. That is only ever right when the two files share an intrinsic size — the "cut-out of the
picture's own foreground" case it was written for. Give it a **smaller** file than the
background and the drawn box does not reach the canvas edges. Measured, across six plausible
pairings:

| background | cut-out | before | covers? | now | covers? |
|---|---|---|---|---|---|
| 1080x1920 | 900x1200 | 90,-120 900x1200 | **NO** | 0,0 1080x1440 | yes |
| 1920x1080 | 900x1200 | -60,-80 1200x1600 | yes | 0,0 1080x1440 | yes |
| **1080x1440** | **1080x1440** | **0,0 1080x1440** | yes | **0,0 1080x1440** | yes |
| 1600x1200 | 800x1000 | 60,120 960x1200 | **NO** | -36,0 1152x1440 | yes |
| 1080x1920 | 1080x1440 | 0,-240 1080x1440 | **NO** | 0,0 1080x1440 | yes |
| 2400x1000 | 600x900 | 108,72 864x1296 | **NO** | 0,-180 1080x1620 | yes |

**Four of six left the canvas uncovered.** Passing the CUT-OUT to `photoPlace` instead makes
its own cover fit the base, so it always reaches the edges; the drawn aspect equals the file's
aspect in all six (nothing is stretched — the defect the *previous* fix was written for); and
it still follows every gesture, because the reframe zoom, the corner scale, the pan and the
bottom anchor are all applied by that one function.

**THE SAME-SIZE ROW IS THE POINT.** When the two files share a size the cover fit is the same
base, so the result is bit-identical and the case the feature was built for does not move.

**What "replicate Campaign's feature" does NOT mean:** copying Campaign's arithmetic. Its
*op* stretches the cut-out into the background's rect (`dw/dh` from the background's
dimensions) while its *preview* cover-fits by the cut-out's own — so Campaign's two surfaces
disagree whenever the files differ in size. That is a live Campaign bug, recorded here rather
than propagated. What was worth porting is the **construction**: cover-fit the cut-out by its
own dimensions, then apply the photograph's crop chain.

**Verification**

- Preview against op, read off the PAINTED element after six rAF ticks: `0,0 1080x1440`
  against the op's `0,0 1080x1440` — **delta 0.00 on all four terms**, covering the canvas,
  with the cut-out's yellow test border running along all four canvas edges in the render.
- Coverage and aspect measured across the six pairings above.
- **Ops: 34 groups, 481 ops, 0 threw** — the baseline, unchanged. The fg op's rect only moves
  when a cut-out is present, and the demo states carry none.
- `renderVals` returns 287 keys; the file boots clean.

#### 3 — THE GUIDED CARD'S BITMAP WAS SMALLER THAN THE CARD

`gdScale()` was `0.4` with the comment "1080 -> 432px, **~2x the largest on-screen card**".
That was wrong by a factor of 2.25 and it is why the guided preview read blurry:
`.gd-card-1` is `min(66vh,660px)` tall on a 3:4 aspect, so it is up to **495 CSS px wide** —
measured live at **485.1 showing a 432px bitmap**, i.e. already upscaled **1.12x at dpr 1**
and **2.25x on a retina display**.

It is derived from that card's own CSS now, times the device pixel ratio, and bounded at both
ends by measurement rather than by taste:

| | |
|---|---|
| floor **.4** | today's value, so a 1x screen is never worse than it was |
| ceiling **.9** | 972px covers the largest card at dpr 2, and there is a real COST CLIFF just above it |
| dpr capped at **2** | past that it is 4x the pixels for a difference nobody can see |

The cliff is worth recording because it is not obvious. A 6-slide weekly, timed:

| scale | px | total | per slide |
|---|---|---|---|
| 0.40 | 432 | 71ms | 12ms |
| 0.60 | 648 | 124ms | 21ms |
| 0.78 | 842 | 184ms | 31ms |
| **0.90** | **972** | **231ms** | **38ms** |
| 1.00 | 1080 | **479ms** | 80ms |

So the last 11% of resolution costs more than doubles the render, for pixels no card can
show. Data URIs at .90 come to 0.19MB for six slides.

**AND THE SCALE HAD TO GO INTO `gdKeyOf`.** It is derived from the viewport now, so without it
a window resize — or moving the window to a display with a different pixel ratio — would leave
the old bitmap in place at the wrong resolution, which is exactly the softness this removed.
Rounded to 3dp so a one-pixel resize does not re-render the whole run.

Measured after: the card is 485.1 CSS px showing a **485px** bitmap — **upscale 1.000x** — and
the same arithmetic gives a 970px bitmap for a 970-device-px card at dpr 2, also 1.000x.

**`innerHeight` is 0 while the browser pane is not laid out**, which would make the derivation
collapse to the floor; it falls back to 900. That is the same trap the rail-label measurement
records, one function further on.

#### Verification

- **Ops untouched: 34 groups, 481 ops, 0 threw** — identical to the figures recorded before
  this round, and no line containing `ops.push` was edited. Every change is markup, the
  preview, `_refreshAV` or the render scale.
- The review's plate/scrim order verified off the DOM's own child list, not off the source.
- `bgIndexFor` vs `si` enumerated across all five templates.
- The `pct` / `s/x/y` split measured at 240 canvas units on the aspect where the anchor is live.
- Preview-vs-op for the parallax measured at **0.0000** over 6 gesture combinations x 6 upload
  aspects.
- The guided upscale measured at **1.000x**, and the render cost measured at five scales.
- `renderVals` returns 287 keys with no throw; the file boots clean.
- This origin's `localStorage` was snapshotted and restored, and the upload test ran against
  `providentRuntime.mode === 'indexeddb'` with the probe refusing outright on `omelette`.

### Left as a decision rather than applied

- **With a short quote the card is small and a wide band of ground sits between it and the
  identity block** — 633px at two lines. On a real post the agent stands in that band and the
  navy ramp covers its lower half, so it reads correctly; on the template card, which invents
  no portrait, it is visible. The fix would be a minimum card height or a vertical centring,
  and both fight the "grows downward from a fixed top" behaviour the drawing states.
- **The story carries the same 768-tall card in a 1920 canvas**, so its void is 480px larger
  than the feed's — the same price the ranking numerals pay for one art size, and the same
  lever (`cardGap`) moves both canvases.

## A FIFTH TEMPLATE: the Congratulations award

Built from `congrats-award.svg` plus a reference render, seven supplied PNGs and four explicit
notes. Slide kind **`award`**, one slide, used by no other template — so the whole thing is
scoped by construction, and that is what the op diff shows: **22 slide-by-canvas groups over
the four existing templates, all 22 byte-identical**, 464 ops, with `groundFor` returning the
old expression for every one of the seven pre-existing kinds.

### THE LAYER ORDER IS THE SPEC, and layer 5 is the whole trick

```
1 the bronze ground #8A6E45      2 bg-lum, LUMINOSITY     3 the rank numeral
4 all the text + the mark        5 fg-lum, plain
```

Layer 5 is what makes the card read as one photograph rather than as type on a picture: the
glitter passes **in front of** the numeral's base, which is exactly what the reference shows
and what a single background layer cannot do.

**NO `blend: 'normal'` ANYWHERE, deliberately.** Canvas spells the default `source-over` and
CSS spells it `normal`, so emitting it would put an invalid value on
`globalCompositeOperation` for no gain. Only the luminosity layer names a blend.

**`ART.bronze` is a THIRD ground, and `isPaper` was NOT extended to carry it.** That test also
governs the photo's deferral into `bgOps` and the wordmark's ink, and on this card both want
the ordinary dark-kind answer — no user photo at all, and a white wordmark. Only the fill
differs, so only the fill asks: `groundFor(kind)` is a new one-line test read by exactly two
call sites, the base rect and the preview's `canvasStyle`. `base` and `paper` are untouched.

### EVERY NUMBER CAME OFF THE SVG AND THEN LANDED ON A TOKEN THAT WAS ALREADY THERE

Which is the same result the weekly and the ranking cover got, and it is the finding worth
recording rather than the individual values:

| | drawn | what ships | expression |
|---|---|---|---|
| wordmark | 41 | 41 | **`tk.logo`, exact** |
| headline | 117 | 117.8 | **`tk.hero * 1.28`** — the ranking cover's own expression |
| the award line | 46 | 46 | **`tk.ptitle`, exact** |
| the occasion | 24 | 24 | **`tk.eyebrow`, exact** |
| logo box height | 95.5 | 96 | `tk.eyebrow * 4` |
| numeral | 482.67 x 543.89 at 299,711 | 483.1 x 543.9 at 298.5,711 | `W * .5036`, bottom-anchored |

Nothing here is a literal fitted to a hand reading. The vertical rhythm is stated as **gaps
from the wordmark's baseline, each in units of its own type size**, so the 9:16 story follows
with no second set of numbers — verified: 1080x1920 lands the text column at x 130 with
baselines 240 / 449 / 550 / 618 and the numeral at 298,1181 at the SAME 483x544 art size.

**The wordmark takes the standard `pT + tk.logo * .8` (122.8) rather than the drawn 130**, so
the whole text block sits a uniform **7.2px** higher than the file. One consistent shift, the
same call the listed card's uniform −32 records. Measured after: every op baseline is exactly
the drawing minus 7.2.

**THE TEXT COLUMN IS `pL + 30` = 110, NOT the grid's 80, and the drawing was NOT overruled
here.** Three prior rebuilds in this file moved a drawn element onto the margin on the
"nothing drifts off the grid" rule — but that rule is about content ESCAPING the margin, and
110 is *inside* it. Both the SVG and the finished render agree on 110, which is two
independent sources, i.e. intent rather than slop. Parameterised as an offset **from** the
margin (`padIn`), not as an absolute, so the story gets 130 for free. One constant to revert.

**`drawLogo` gained an optional x** for this, because the text column was the one placement
it could not express. Every other call site passes nothing and falls back to `pL`, so no
other kind's wordmark can move.

### THE HEADLINE IS FITTED, NOT WRAPPED, and that is because it is ONE WORD

A column "Congratulations" does not fit gives a **hard break mid-word**, not a line break —
`wrapPlain` breaks a single over-wide word by design. At the story's 135.7px it measures ~885
against an 850 column, so the fit fires on the 9:16 and never on the feed. **Stepped, never
solved**: this font's width per em is not constant with px, so a linear guess lands over the
column every time (the listed card's role fit records the same lesson).

The award and occasion lines DO wrap, capped at 2 and 3 lines, and **every gap chains off the
previous block's last baseline** — so a wrapped line pushes what follows down instead of
colliding with it. `subLead` 1.24 and `capLead` 1.30 exist only for that degrade path; both
drawn lines are single, and both values are the weekly card's own leads rather than new ones.

### THE FIVE RANKS ARE 1100 TALL WITH DIFFERENT WIDTHS, and that is the placement

977 / 1375 / 1258 / 1256 / 1204 — the same shape as `ORD_ART`, and **the fact the whole
placement turns on. The first encode forced all five into one 977x1100 box and would have
shipped four distorted numerals**; it was caught by measuring the sources rather than by
looking at the result. They are fitted to one **HEIGHT**, each keeping its own aspect, centred.

**AND THE ART BOX IS THE INK BOX** — measured off the rasterisation, not parsed off the file:
ink `l0.0000 r1.0000 t0.0000 b1.0000` on all five. So centring the box centres the ink and
there is no side-bearing arithmetic. Verified per rank: drawn aspect equals file aspect to
five decimals, all five share height 543.9, all five centre on **540.00**, all five bottoms on
**1254.9**.

**One art size for BOTH canvases**, so `rankH` and `rankLift` are fractions of the canvas
WIDTH (1080 on the feed and the story alike) rather than of its height — the `TA_ORD`
decision, for the same reason. The bottom is anchored to the bottom margin: the numeral
*stands* on the glitter, so its floor is the meaningful constraint.

### The assets: 16MB of source became 1.2MB, and the sizes are derived

Bundled as base64 — offline-and-off-the-disk, the contract the fonts, the ground texture and
the ranking numerals already hold. **A template's own ground is not a question to ask the
user.** `awReady()` joined `bundledReady()`, which is the one gate both asset consumers read.

| | source | shipped | why |
|---|---|---|---|
| bg-lum | 2160x2880 PNG, 8.3MB | 900x1200 webp .72, **55KB** | alpha measured **100% opaque**, soft bokeh, under a luminosity blend — the TEXBG case |
| fg-lum | 2160x2880 PNG, 2.5MB | 760x1013 webp .70, **188KB** | **85% CLEAR, 14% partial alpha** — alpha is the whole layer, which is what makes webp worth its size |
| 1st–5th | 977..1375 x 1100 PNG, 7.5MB | native, webp .80, **~190KB each** | native IS the 2x export size: the numeral draws 483..680 canvas units wide |

**Neither `sips` nor PIL can write alpha-preserving WebP on this machine**, so the encoding was
done in the browser — the same `toDataURL('image/webp')` the studio's own exporter uses —
with a tiny POST-capable Python server to get the results to disk. That harness is also what
measured the alpha census and the ink boxes, in one pass, which is how the width bug surfaced.

### The uploaded partner mark

`smp-alogo`, project level — `award` has exactly one slide, so per-slide and per-project are
the same thing there, the rule the listed card's listing number already follows. It sits in
**All slides** beside the QR group for that reason.

**Fitted by its INK, not its file box** (`awLogoBox`, the arithmetic `coBox` holds): brand
sheets are routinely padded, and scaling by the file box sets the mark at a fraction of the
height asked for with a wide transparent gap nobody can see or crop. Verified on a
deliberately padded 2000x340 file with its ink in the right third: the op draws the WHOLE file
at (−369, 511, 798.4, 135.7) — mostly off-canvas, as it should be — and the **ink lands at
exactly (110, 530.86) at height 96**, aspect preserved to four decimals.

**TINTED BY DEFAULT**, with a Match canvas / Original pair — Campaign's graphic-tint control,
for the same measured reason: a brand-kit SVG is routinely navy, and navy on this bronze is
very nearly invisible. The preview paints it as a **mask** with a `background-color`, never a
background-image, because `mask-image` takes the art's own alpha and the colour supplies the
ink — which is exactly what `tintFlat` does on canvas. Untinted it is a background-image at
the op's own rect with `100% 100%`, because the op draws the whole file into that box.

### The brass line contradicts a binding rule, and it is here on purpose

`ART.brass` #B0905C on the award line, against "**no gold in canvas output at all**". It is
here because the drawing specifies that exact hex on that exact run and the reference render
confirms it — a decision rather than an export artefact. This is the *second* such exemption
(the ranking card's place badge is the first), and it goes the opposite way from the weekly
CTA button, where the instruction was explicit that the guide wins and the fill became
`ART.warm`. Changing the one token reverts it and nothing else moves.

### THE TEMPLATE CARD IS A SKELETON — the one card that is not its render

By request, and it is a real exception to *Organic's template miniatures are real renders*:
every image is dropped (both glitter plates, the numeral, the mark), the text is kept, and the
ground follows the theme — **black in dark mode, paper in light**. The reason it earns the
exception where the other four do not: this card's ground IS a photograph, and at 238px a
bokeh field reads as noise rather than as a layout, which is the one thing a template card
exists to show.

**ON PAPER THE WHITE RUNS WOULD VANISH, so the ink moves with the ground** — `ink` → `deep` in
light mode, the same rule `drawLogo` records. The brass line reads on both and is left alone.

**EVERY card drops its background image now**, not just this one — see *The template cards
carry no background image at all*. The award's filter stays broader (`op !== 'image'`, so the
numeral and both glitter plates go); the general one is by named flag, because the QR and the
numeral are content on the other four.

It shares `tplGroundSwap` with the paper kinds' dark-mode override, which is why that function
is now called on **every** render rather than only the dark ones: the paper swap needs dark,
the award skeleton applies in both themes.

### Two real bugs caught in verification, both mine

- **`loadAssets` read `imgs['smp-alogo']` where that scope's variable is `sidecar`** — a
  `ReferenceError` on every export, thumbnail and session write, and invisible in the editor
  because the DOM preview never calls `loadAssets`. Found by running the real path rather than
  the probe's own `{}` assets map. **Exercise the function the export uses, not a stand-in.**
- **`KLAB` and `baseName` had no `award` case**, so the plate badge rendered blank and the
  export filename fell through to the weekly convention. Both named now:
  `1st_Highest Lead Generation`.

### Verification

- **Ops: 22 groups over the four existing templates, 22 byte-identical, 0 changed** (464 ops),
  and `groundFor` proven equal to the old expression for all seven pre-existing kinds.
- **The award's own stack**, feed: `rect #8A6E45` / `image` luminosity 0,0,1080,1440 / `image`
  298,711,483,544 / four text runs at x 110 on baselines 123, 304, 394, 452 / `image`
  0,0,1080,1440. Every baseline is the drawing minus the uniform 7.2.
- **Story**: bronze 1080x1920, both plates cover-cropped to −180,0,1440,1920, the numeral at
  298,1181 at the same art size, text column x 130.
- **Preview against ops in ONE coordinate space**: wordmark 0.24 canvas px, award line 0.15,
  headline 1.81 (which is 0.74 device px at the editor's 2.4545x zoom — the measurement
  floor), and the mark's rect within 0.08 on every term.
- **SVG export**: 3 images, 4 texts, valid header. A base64 data URI carries no `<` or `&`, so
  `renderOpsToSvg` writing `o.url` unescaped is safe here.
- **Interpolation sweep against the baseline**: 240 → 244 refs, **18 unresolved before and
  after, none newly unresolved**.
- The user's project AND photo store were snapshotted and restored byte-for-byte around the
  upload test.

**A probe trap re-confirmed:** the award branch hides the shared flowed wordmark
(`logoStyle: display:none`) and draws its own, so a `textContent === 'provident.'` search finds
**two** nodes and the hidden one reports `offsetLeft 0` with a null `offsetParent` — the
documented trap. Filter on computed `display` before measuring.

## Organic's template miniatures are real renders

Both of Organic's miniature surfaces — the splash's "Pre loaded templates" cards and the
richer **Pick a template** screen behind *+ New post* — were hand-drawn skeletons, and both
had drifted exactly as this file's own note predicts. The note is from the guided run:
*"a hand-drawn skeleton was a second layout to maintain and drifted immediately"*. It was
written when the guided cards became real `buildOps` renders and then not applied here.

What the drift actually cost, per surface:

| | what it showed | what the template draws |
|---|---|---|
| splash card | four `<i>` bars plus a mocked `i.scrim` band | a full post |
| pick screen, listed | `Just **listed**` with the second word in **#4E7A9E** | one white run, no accent word |
| pick screen, listed | two agents as **circular avatars** | one cut-out framed on its face, never circle-cropped |
| pick screen, weekly | a "WEEKLY LISTINGS" eyebrow between two flanking rules | the rebuilt cover draws neither |
| pick screen, review | **★★★★★ in #4E7A9E** | `ART.soft` |

So three of the four pick-screen miniatures were painting the **retired chrome blue into
artwork**, the one thing `OrganicStudio.ART` exists to prevent — in markup, where the CSS
fix for the same bug had already landed twice.

**Both surfaces now read ONE function, `tplCardView(id)`.** Two hand-written copies is
precisely how they came to depict different things, so `ready` / `master` / `hasMore` /
`frames` / `reelStyle` / `carouselOn` / `carouselLabel` are supplied once and the two
markup blocks are the same five tags. The pick screen's `isListed` / `isWeekly` /
`isReview` / `isAgents` flags and ~85 lines of markup are **deleted**, not left dead.

`tplRenderAll()` runs the same `buildOps` the export runs at `TPL_SCALE` (.22 → 238px) and
caches a data URL per slide. It is key-guarded on `window.providentFontFam`, awaits eight
`document.fonts.load` pairs, `document.fonts.ready` and `bundledReady()` — a render taken
before any of those lands would cache a card drawn in the fallback face and never retry.
The shell calls it from `componentDidMount` **and** `componentDidUpdate` (`_tplTick`), for
both `screen === 'splash'` and `screen === 'pick'`: the splash is the opening screen and may
never see an update, and the pick screen is reachable from the top bar without the splash
having been on screen at all.

**`TPLDEMO` is demo copy and never reaches a project.** `tplSlides` deliberately seeds
nothing (see *Nothing the user is asked for is pre-filled*), so a render of a fresh template
would be a blank layout. `tplDemoState(tpl)` builds a **throwaway** state — `defaults()`,
`tplSlides`, the per-kind demo strings, a project-level `agent` and `qr`, through
`normState` — and `pickTpl` still starts from `tplSlides` with everything empty.

### The demo QR, and why turning the QR off could not have worked

A card with `qr.show` on and no code in hand renders the **quiet zone alone**: a 220px blank
white square, on three of the four cards. That is literally the *"showing squares"* this pass
exists to remove, so it is a defect the change introduced, not a truthful empty state.

**`d.qr.show = false` would not have covered it.** The listed and cover QRs are gated on the
project-level flag; the **property page draws its code unconditionally** (`drawQr(qx, qy, qs,
assets['qr' + si], …)` with no `show` test). Measured on weekly's property slide: an `rrect`
`#fff` at 780,1070,220,220 with or without the flag.

So `qrDemoReady()` builds one: a 25×25 module grid on an offscreen canvas, the three finder
squares skipped in the noise pass and drawn after so it reads as a QR rather than as static.
Three things it has to get right:

- **The grid is DETERMINISTIC** — an LCG off a fixed seed, never `Math.random` — so a card is
  byte-stable between renders and an op or thumbnail diff over these surfaces stays meaningful.
- **It settles on `onerror` too**, and returns `null` when `naturalWidth` is 0. A decode that
  FAILED is also settled; waiting on an event that will never fire would hang the whole
  preview pass. Same rule `texReady` follows.
- **Every QR key `buildOps` can read is filled** — `assets.qr`, `assets.qrCover` and
  `assets['qr' + i]` for every slide. Three keys, three call sites, and missing one leaves a
  blank square on exactly one card.

**Nothing else is invented.** There is no demo photo, portrait or cut-out: those are the
user's own files, and a template card must not depict one it made up. The consequence is
honest and visible — the five black-canvas kinds render on black, and the agents cover shows
its white ground with the five group figures absent.

### The cards follow the theme; the ARTWORK does not, and cannot

`.p-c-p` and `.p-tpl-c` were pinned canvas-dark in **both** modes (`#10151B`, plus a
`#161C24` hover), because their white skeleton bars vanished on a light tile. That pin is
gone from Organic: the tile now holds an opaque render carrying its own ground, so the tile
is chrome again (`--ps-card` / `--ps-fill`) and only shows while a render is in flight. The
hover ring went with it, so `.p-c:hover .p-c-p` fell back to a bare `rgba(32,83,208,.55)`
literal — a **mark**, therefore `--ps-link`, which is the standing rule.

**But `ART.base` is black on five of the seven slide kinds, so those cards are dark tiles in
light mode and there is no version of this that is not.** A faithful render of a black post
is black. What follows the theme is the tile's frame, its hover, its loading ground and the
page around it; the artwork is the artwork. The *two-tone* complaint that opened this — a
mocked `i.scrim` gradient washing half of every card — is gone outright, because nothing
mocks the scrim any more.

#### THE PAPER KINDS ARE THE EXCEPTION, by request, and only in the preview

`ART.paper` is white, so a faithful render of Top agents is a WHITE tile — one bright card in
a grid of black ones, which is the same two-tone jolt from the other direction. Overridden on
the splash and the pick screen: **black ground in dark mode, the paper ground in light.**

**This is a real departure from "the card is the render", and it is the only one.** State it
rather than hide it: on the splash the agents template is drawn on the theme's ground, not on
its own. The instruction was explicit that it is for the preview.

**LIGHT MODE IS BYTE-IDENTICAL TO THE EXPORT.** The card is already `#FFFFFF` on a light
page, which is what "light background on light mode" asks for, so nothing is swapped —
measured, the light render's ramp is still the documented neutral 208-250 (corner 210,
headline band 212, bar 98,106,124).

**IT IS A FILL REMAP OVER THE FINISHED OPS, never a branch in `buildOps`** — and that is the
whole reason it is safe. The paint path for all seven kinds is untouched, `isPaper` still
selects the ground everywhere that matters, the swap has exactly one call site, and no
project, export or recents thumbnail can reach it.

**THREE FILLS MOVE, and the ink HAS to move with the ground.** `paper -> base` alone gives a
navy wordmark, a navy headline and a navy hairline on black, i.e. an illegible card — so
`deep -> ink` and `deepQ -> ruleQ` go with it. The numeral's `tintFlat` is not even a
recolour: `ink` reverts the art to its own white, which is what `ART.paper` forced it away
from in the first place (see *THE NUMERAL IS WHITE ART ON A WHITE GROUND*).

**The texture is what keeps it from being a flat black rectangle.** A 30% luminosity blend
over a zero-saturation ground is a neutral grey, so over black it lands a soft ramp rather
than a wash — measured on the cover at **31 in the corner, 50 at the top, 54 lower down**,
with the navy footer bar at 34,42,62 and its white and brass labels intact. All six frames
swap, not just the master: ranks 1 and 5 read corner 31, top row 26, numeral 63 and 77.

**The remap is keyed by VALUE, so `ART.deep` and `ART.cardInk` being the same #1A2942 under
two names is worth knowing** — it cannot bite because the swap only ever runs on a paper kind
and `cardInk` belongs to the listed card.

**THE THEME IS IN THE RENDER KEY** (`v2|<face>|d`/`l`), or the toggle would leave the card on
whichever ground it was first drawn on. `Component.applyTheme` always stamps `data-theme`, so
that attribute is the answer; `prefers-color-scheme` is the fallback for a document that has
not been themed yet. Verified with the real top-bar toggle rather than by reload: the corner
went **210 -> 31 -> 210** across two clicks, live, because `shThemeToggle` calls
`forceUpdate` and `_tplTick` re-reads the key.

### The carousel chip states the NATURE, and the count was tried and dropped

`.p-c-car` sits at the tile's top-left, on a template that is a carousel.

**IT IS THE RECENTS BADGE, NOT A SECOND ONE.** `.p-c-b` — the recents card's slide count —
and `.p-c-car` sit on the same tile at the same size doing the same job, so they share ONE
rule and differ only in which corner they take. The chip first shipped with its own
pill-radius, 500 weight, .02em tracking and a `--ps-link` hairline: four ways for two badges
to drift, on a screen where they read as one control. **No stroke, deliberately** — the fill
is opaque and carries its own boundary against the render behind it, and an outline on a 60px
chip over artwork reads as a second edge rather than as a boundary. Verified by measuring both
in one document: identical fill, ink, weight, size, tracking, padding and corner, `border-width
0px`, and only the horizontal inset different (left 9 against right 9).

**Which templates those are is DERIVED, not listed.** `tplIsCarousel(t)` is
`tplSlides(t).length > 1 || !!TPLGROW[t]`, and `TPLGROW` (`weekly: 6`, `review: 10`) is the
page cap the rail's own `canAddSlide` reads — so the chip on the splash and the button in
the rail are two readings of one fact and cannot come to disagree. Google reviews is the
case that makes this worth doing: it opens on **one** slide and grows to ten, so a
count-based test would call the flagship carousel a single post.

**The label is the single word "Carousel".** `Carousel · 6 slides` was built first and
measured **95px on a 190px card** — every template centres the wordmark at the top, so the
chip ran straight into `provident.`, chrome over the one mark the brand cares most about. At
one word it is **60.7px, ending 69.7px into a 271.7px tile** against a wordmark that starts
at ~111. The count is not lost: each card's meta line already describes its slides and the
pick screen states it outright (`Cover + 5 agents`). A single post gets **no** chip rather
than one reading "1 slide", which is a control stating the absence of a fact.

### REEL_DWELL is 3s, and that is what makes a six-frame reel reachable

`StudioBase.REEL_DWELL` 6 → 3, by request. It is the whole reason the reel can be shown on a
six-slide carousel at all: at 6s a six-frame card took **30s** to reach its last slide, which
is longer than anyone hovers, so every frame past the second was unreachable in practice. One
value, shared, so the recents cards and the template cards step at the same pace — and
Campaign's recents inherit it (a 3-variant card now finishes in 4.25s instead of 10.25s).

Verified by **scrubbing the animation's own `currentTime`** — the clock is frozen whenever
the pane is not compositing, so wall-clock sampling reads as "stuck". A 3-frame card,
duration **4.25s** (`LEAD .35 + SLIDE .45 + DWELL 3 + SLIDE .45`): master until 300ms, on
frame 1 by 900ms at `translateX(-269.7)` of a 271.7 frame, still there at 3.8s, on frame 2 at
4.4s at `-539.3`, and parked there at 8s.

**`animation-name` stays in the `:hover` rule and the rule is now ONE selector list** —
`.p-c:hover .p-c-reel, .p-tpl:hover .p-c-reel` — because the pick screen's card is `.p-tpl`,
not `.p-c`. A second copy of that rule is a second place for the reel's timing to drift; the
`prefers-reduced-motion` twin and the `.p-c-vars` fade got the same treatment.

### The recents thumb cap was 3, which pre-dated the reel

`OrganicStudio.RECENT_THUMBS` is **6**, applied at both writers — the save path and
`backfillRecentThumbs` — so a six-slide ranking carousel's hover reel shows the whole
carousel instead of half of it. **Campaign's cap stays 3**: that is its variant ceiling
("Max 3 variants"), a different fact that happens to share a number.

### Verification

- **CSS `added === 0` in spirit, itemised in fact.** 875 → 871 rules against the pre-change
  file served alongside: **8 added, 12 removed**, and every one accounted for — three
  runtime-generated `@keyframes pcSlide2/3/6`, the new `.p-c-car`, three rules whose
  single-selector originals appear in the removed list, and `.p-tpl-c`'s ground. Removed:
  the six dead `.p-c-p i` mark rules, those three originals, the old `.p-tpl-c` ground and
  the two dark pins. No rule silently altered.
- **The op path did not move.** Diffing every line containing `ops.push` /
  `renderOpsToCanvas(` / `renderOpsToSvg(` against the pre-change file: **one added line**,
  and it is the new preview's own call site. No existing emitter changed, so no op diff was
  needed.
- **Interpolation sweep against the baseline**, not against zero: 240 → 239 refs, **24
  unresolved before and after, none newly unresolved**.
- **No duplicate key in `renderVals`** — 140 top-level keys, and the one repeat the scan
  flagged (`qrWrapErr`) is a `const` matched after a ternary's `?`, identical in the baseline.
- Live in both themes, reloaded into each: 4 cards and 4 shots on the splash, 4 tiles and 4
  shots on the pick screen, chips on weekly / agents / review and none on listed,
  `renderVals()` clean, the editor opening on 3 plates with `+ Add property slide` present.
- **The user's `localStorage` was snapshotted and restored byte-for-byte** before touching
  `Continue last` — the loader and `upd()` both write the saved project.

### Drive-by, same class of bug

`filePreview` — the computed session filename in the Share panel — was `color:#4E7A9E`, the
retired chrome blue, so it followed neither theme. It is `--ps-link`.

**Left alone deliberately:** Campaign's template cards. Converting them means real renders of
four free-form module sets, and its skeleton is not carrying a wrong depiction the way
Organic's was — its `#4E7A9E` bar was already fixed. Its `.p-c-p i` rules and the canvas-dark
`.p-c-p` pin are still load-bearing there and were not touched.

### The studio switcher, redesigned — and the theme toggle reaches the splash

Two chrome changes on the project browser, so both are **three-mirror** work by the
propagation contract: `Provident Campaign Studio.dc.html` and
`Provident Organic Studio.dc.html` both carry the splash markup, and neither `.p-ws*` nor the
toggle exists in `ui-design-system/` — these are app markup, not kit components, so the
library needed nothing.

**The switcher was a letter chip, a name and a grey dot, and the DOT was carrying the whole
"you are here" job at `opacity:.5`** — the quietest mark in the system on the most important
control on the screen. Three changes, each replacing a decoration with a fact:

- **THE MARK IS THE STUDIO'S OWN CANVAS SHAPE.** `C` and `O` said nothing the label beside
  them did not already say. What actually separates the two studios is what they *make* —
  Campaign is square, Organic is 3:4 portrait — so the chip draws that: 26px tall at the
  studio's own aspect, so 26x26 against 19.5x26. Both sit inside one fixed 30px box, which is
  what keeps two different widths from misaligning the labels. The width comes from
  `Component.STUDIOS`' own `ratio`, so the shape cannot drift from the canvases it depicts —
  the same reason every other number in this file is derived rather than typed.
- **A one-line descriptor** — `Paid Meta ads` / `Feed and story posts` — from the same
  `STUDIOS` table, plus a `title` that says whether the row navigates or is where you are.
- **The active row is a FILL, not a dot** — `--ps-accent` with the `--ps-link` hairline the
  deep navy needs to have a boundary at all on the dark theme. That is this system's own
  ON-state rule rather than a new treatment.

**IT HAD TO OUT-WEIGH THE LIBRARY ROWS BELOW IT, and that is a real constraint rather than a
preference.** All / Templates / Recent already carry a `[data-on]` state (`--ps-fill-on`, a
quiet wash). Those pick a **filter**; the studio row says **which app you are in**. Giving
both the same treatment would flatten the hierarchy on the one screen where it matters most,
so the switcher takes the solid accent and the filter keeps the wash.

**THE ACTIVE ROW HAS TO OUTRANK ITS OWN HOVER**, and this is the documented later-block trap
biting again: `.p-ws:hover{background:var(--ps-fill)}` is declared in the theming block ~900
rules below `.p-ws[data-on]`, at equal specificity — so pointing at the studio you are already
in dropped the fill back to `--ps-fill` and the selection vanished under the cursor. The ON
state is restated in that later block as `.p-ws[data-on],.p-ws[data-on]:hover`. **Declaring a
rule is not enough; check what wins where the selector is declared LAST.**

`.p-ws-c` (the dot) is deleted from the markup and its own rule is gone, but it survives
inside one **shared** selector list (`.p-nav2 s,.p-nav2 i,.p-ws-c`). Left exactly as it is,
by the standing rule: a selector that matches nothing costs nothing, and rewriting a shared
selector list does.

**The theme toggle is on the splash now, and the reason it was missing is structural:** the
top bar is editor-only, so the screen the studio *opens on* had no way to switch mode — you
had to enter a project to find it. Same button, same class list (`.p-ghost .p-ico-t
.p-ico-o`), same two Material glyphs, same four render keys off the shell. It is duplicated
markup because DC has no partials, and that is the same trade the mirrored top bar already
makes; the alternative — a second, smaller icon pair for this one screen — is exactly the
inconsistency the icon pass warns about.

Measured in light mode, reloaded into it rather than toggled (the stale-`getComputedStyle`
trap fired here too, reporting the dark palette's ink on a light sidebar while the screenshot
showed it correct): inactive name **15.65:1**, its descriptor **5.66:1**, active name
**16.58:1** — all clear of AA.

### The template cards carry no background image at all

By request, and it finishes the thought the award skeleton started. `tplGroundSwap` now
filters **every** card, not just the award's:

```js
built.ops = ops.filter(o => !(o.isBg || o.isTex || o.layerId));
```

**A template card is a picture of the LAYOUT, and the background is the one layer that
carries none of it.** The ground texture made the agents cover read as a grey wash beside
four clean tiles — it was the only card that looked like a different kind of thing — and a
photograph nobody has uploaded is not a fact about the template either.

**FILTERED BY NAMED FLAG, never by `op === 'image'`**, and that distinction is the whole
reason this is safe: the QR and the ranking numeral are *content*, and dropping the QR's image
would leave its white quiet-zone `rrect` behind — which is precisely the blank white square
`qrDemoReady` was built to remove. `isBg` is the photo, `isTex` the ground texture, `layerId`
the ranking cover's five group figures. The award branch keeps its own broader
`op !== 'image'` filter, because there the numeral and the glitter plates all go.

Verified: the agents cover reads a flat ground at both sample points in both themes (255 on
paper in light, 31/50 → now flat in dark) with its navy glass bar and headline intact; all
five cards read as one set; and Campaign's own skeleton cards are untouched (23 `<i>` marks,
4 tiles).

**Sheet integrity checked rather than assumed** — the documented tell for a scripted CSS edit
swallowing a block is the parsed rule count against the authored one. Campaign parses **754**
rules with the tail `:focus-visible` list intact, and the `.p-ws` set is exactly the eleven
rules authored plus the three pre-existing shared lists. Interpolation sweep on both
documents: **18 unresolved in Organic and 22 in Campaign, both at their documented baselines,
none newly unresolved**, and `tb.initial` / `tb.mark` / `initial:` appear zero times — the
keys were deleted, not left dead.

## Recents live in IndexedDB

`StudioBase.loadRecents/writeRecents/readRecents` back the recents list with
IndexedDB under `recents:<studio>`, migrating whatever localStorage still holds on
first run. They were in localStorage, whose ~5MB cap one project's embedded images
(~1.5MB) blows immediately — and the old `catch` re-saved the list *without* `thumb`
or `images`, which is exactly why previews were blank and opening a recent produced an
empty canvas. `readRecents()` is synchronous for `renderVals`, so the list is cached
in memory and refreshed by `loadRecents()` on mount. Campaign stores one 1:1
thumbnail **per variant**; the splash renders them as a card grid where the card
itself is the button. `StudioBase.RECENT_MAX` is **10**, applied on the save path in both
studios — the entries carry embedded thumbnails, which is why there is a cap at all.

**Hovering a recent card steps through its designs and STOPS on the last one.** Every
frame is full-bleed, so each variant or slide is seen at the card's own size rather than
squeezed into a shared row. `--n` carries the frame count and the keyframes are expressed
against it (`translateX(calc(-100% + 100% / var(--n)))`), so one rule covers any count.
A single-variant project has nothing to step through — `hasMore` keeps it static — and the
whole thing stops under `prefers-reduced-motion`.

It **holds, then slides**: a short `REEL_LEAD` (0.35s) so the first variant arrives as soon
as you hover, a `REEL_SLIDE` (0.45s) glide between designs, and a `REEL_DWELL` (**3s**, down
from 6 — see *REEL_DWELL is 3s*) hold on each one. One iteration plus `forwards` is what
leaves it parked on the last design rather than returning to the master.

**`steps()` cannot express this** — it only jumps, and the user wants the slide kept. Nor
can a single generic `from`/`to` pair, because where a hold ends and a slide begins falls at
a different percentage for every frame count. So `StudioBase.reelKeyframes(n)` **generates
one `@keyframes` per count**, caches it, and injects it into a `<style id="pc-reel-kf">`;
`reelTiming(n)` hands the card its name through `--kf` plus the duration.

`animation-name` must stay in the **:hover** rule (`animation-name: var(--kf)`), not inline
— inline would run the reel at rest and it would never restart on a fresh hover. The rule
carries only longhands; the `animation` shorthand there would reset the inline duration.

Verified by scrubbing the animation's own `currentTime` — the clock is frozen whenever the
browser pane is not compositing, so wall-clock sampling reads as "stuck". A three-frame card
(7.25s): master until 350ms, a smooth eased slide (0.10 → 0.50 → 0.90 of a frame) landing on
variant 1 at 800ms, parked there until 3800ms, sliding to variant 2 by 4250ms and holding
there after the animation finishes — **re-measured at DWELL 3**; at the old 6 the same card
ran 7.25s. Five frames is 14.6s; two is 0.8s.

Two earlier paces were rejected: 1.6s per frame (nearly 13s round trip) and 0.45s per frame
with `alternate`, which flicked back to the master.

## Project folder (save + export)

`runtime.js` exposes `window.providentFolder`, a thin wrapper over the File System
Access API. The user picks a root folder once on first **Save session**; the handle
lives in IndexedDB so later saves overwrite in place. `folder.restore()` runs at load
but only adopts the handle when permission is already `granted` — otherwise it parks
it on `pending`, and `folder.ensure()` re-requests from a click (the API demands a
gesture). **Chrome/Edge only**: Safari has no directory picker, so `folder.supported`
is false there and both studios fall back to the old download path.

Layout written into the folder:

```
<source>/  <name>.adstudio.json          session + embedded images
           <name>_Master_1x1.jpg …       renders at the root
           Assets/background-master.webp source uploads, role-named
                  cutout-master.png
                  qr.png
                  logo-partner.svg      the co-brand mark, when one is set
                  graphic-<slug>.svg
```

Organic writes **flat** — no `Feed 3x4/` and `Story 9x16/` subfolders. Both sizes sit beside
each other and are told apart by a suffix, `<slide>_3x4.png` / `<slide>_9x16.png`, so one
folder holds the whole post. The user-facing name is the **Source folder** throughout —
the top-bar button is labelled `Source folder`, and `Source folder: <name>` once one is set.

**The picker opens where the user expects, and `id` is what breaks that.** `folder.pick()`
starts in the folder already in use when there is one and in **Documents** when there is
not. The trap: a remembered path for a `startIn`-plus-`id` call **wins over `startIn`**, so
passing `id` on the Documents branch meant that once any folder had ever been picked the
picker reopened there forever and never honoured Documents. `id: 'provident-studio'` is
therefore sent **only** alongside a real handle; the no-folder branch is
`{mode:'readwrite', startIn:'documents'}` with no id, and the bare retry drops the id too.
An `AbortError` is rethrown so a dismissed picker is not mistaken for an unsupported one.

`StudioBase.writeProject()` is the single write path — it diffs against what is
already there and raises one `window.confirm()` listing every file it will replace.
Each engine supplies `assetFiles()` (role-based names, stable so a re-upload
overwrites its own file) and `projectFiles()` (the .json plus those assets, refreshed
on every export so the folder can't drift from the design).

**SVG uploads**: `image-slot.js`'s `ACCEPT` list must include `image/svg+xml` — it
didn't, so the picker filtered SVGs out while the slot's placeholder promised "Drop
SVG / PNG". `providentSizeSvg()` also injects width/height from the viewBox when they
are missing, because otherwise `naturalWidth` is 0 and the graphic scales from a 1px
fallback. It runs inside `providentEncodeFile`, so the STORED bytes carry the dimensions
and every consumer — preview and export alike — reads the same intrinsic size.

**A write that fails names the file and the folder.** `writeProject` had no `try` around
its write loop, so a `NotFoundError` reached the status line as its raw DOMException text —
"A requested file or directory could not be found at the time an operation was processed" —
which reads as though the export itself is broken. It is almost always a **stale folder
handle**: the handle survives in IndexedDB but the folder does not, so renaming, moving or
deleting it makes every write throw. The message now names the folder, says how many of the
files were written before it stopped (they are really there), and says to pick the folder
again.

## Renderer parity — read this before touching either engine

`renderOpsToCanvas` / `renderOpsToSvg` are **duplicated per studio — and now in two
separate files**, so a grep in the file you are editing will not show you the other copy.
That is where preview-vs-export bugs come from: Campaign's glass exported flat for a while
because it never emitted the `blur` op Organic's renderer uses. Anything that changes how a
canvas op paints has to land in both copies. Current parity:

| | Campaign | Organic |
|---|---|---|
| `blur` op (backdrop-filter) | emits 2, handles both renderers | emits 4, same |
| the canvas blur's 3-sigma sample, edge-clamped tile and `q` downsample | handles, emits only radius 14 | handles, emits 10 / 16 / 30 — `q` is 1 at every radius in use |
| the SVG blur's `userSpaceOnUse` filter region derived from `amount` | handles | handles |
| `imageSmoothingQuality: high` | yes | yes |
| the SVG blur's backdrop list (`bdIds`, named layers in paint order) | handles | handles |
| `id="bgphoto"` — the photo layer | emits | emits |
| `id="bgtex"` — the ground texture | handles, emits none | emits 1 |
| `id="bgord"` — the ranking numeral | handles, emits none | emits 1 |
| `layerId` — a GENERIC named backdrop layer on an `image` op | handles, emits none | emits 5 (the cover's group) |
| `blend` on an `image` op (canvas `globalCompositeOperation` / SVG `mix-blend-mode`) | handles, emits none | emits 1 |
| `alpha` on a `tintFlat` op (SVG `opacity`) | handles | emits 1 (the numeral) |
| a `tintFlat` op as a NAMED backdrop layer | handles | emits 1 (`#bgord`) |
| `stroke` / `sw` on a `text` op | not handled | handles, **emits none** since the ordinal became art |
| `grad` on a `text` op | handles, emits (the hero fade) | handles, **emits none** since the ordinal became art |
| `providentFillText` (tracked caps) | yes | yes |

**Two of those rows say "handles, emits none" for Organic, and that is deliberate.** Deleting
either would edit `renderOpsToCanvas` / `renderOpsToSvg` — the paint path for all seven slide
kinds on both canvases — to remove a guarded branch that costs nothing, and Campaign's hero is
still a live `grad` emitter so the capability is not dead system-wide. Both are annotated at
the renderers themselves so the next reader does not have to rediscover why they are there.
Note also that `stroke` / `sw` is **not handled in Campaign at all** — that is a pre-existing
asymmetry, recorded here rather than fixed, because nothing emits it anywhere now.

**`backdrop-filter` has no canvas equivalent** — a `blur` op must be pushed *before*
the translucent `rrect`, with the same x/y/w/h/r, and `amount` matching the preview's
`blur(Npx)`. The canvas renderer blurs everything painted underneath (photo + scrim),
which is what the browser does. The **SVG** path can only reference the photo via
`<use href="#bgphoto">`, so SVG glass ignores the scrim and is an approximation —
PNG/JPEG are the faithful outputs.

### Type metrics: the preview box is laid out at CANVAS UNITS, not screen pixels

Google Sans Flex is a variable font with an **optical-size axis**, so the same nominal
size is not the same width: measured per em on one string it runs 10.32 at 24px, 9.50 at
37px, 8.94 at 92px, 8.54 at 200px — a 21% swing. Plain `sans-serif` is flat, which is why
this never shows up in a test that falls back.

`canvasStyle` therefore sets `width: tk.W` / `height: tk.H` and shrinks the box with
**`zoom`**, in both engines. Every `cqw` inside then resolves against `tk.W`, so a preview
font-size lands at the *canvas* pixel value — exactly what `buildOps` measures and what
`renderOpsToCanvas` draws with. It used to size the box to the on-screen width (440px),
which shaped every run ~6% wide and **wrapped headlines at different points than the
export**: a cover headline that fit on one line at 1080 was broken into two in the
preview. It also meant the design silently re-flowed when the window was resized, so
"what the canvas shows" was never a stable target to match.

Why `zoom` and not `transform: scale`: both keep the used font-size at canvas units
(verified — a scaled 37px run measures the 37px optical width, not the 92px one), but
`zoom` also collapses the **layout** box to the on-screen size, so the plates still flow
in `.p-plate` with no wrapper div. Consequences to respect:

- Chrome/Safari/Firefox 126+. Same browser floor the project already has for the folder API.
- Chrome that must stay visually constant has to be divided by the zoom — `uz(n)` does
  this for the outline, its offset, the box shadow and the dashed layout guide. A plain
  `2px` outline would render at 0.8px.
- `offsetWidth`/`offsetHeight` inside the box now report **canvas units**. The graphic
  corner-drag reads `node.offsetWidth / iW` (both canvas units) for its starting scale;
  its drag delta still divides `clientX` by `innerPx` (both CSS px). Mixing the two was
  the one real breakage this change caused.
- `getBoundingClientRect()` is unaffected (always real CSS px), so the floating control,
  which lives in `.p-body` outside the box, needed nothing.
- **The top layer escapes `transform`, but NOT `zoom`.** `image-slot`'s reframe overlay is a
  `popover`, and it positions itself in viewport px on the stated assumption that the top
  layer is free of ancestor scaling. That holds for a `transform: scale` ancestor and is
  false for a zoomed one: `zoom` is a used-value multiplier carried down the box tree, so
  the popover was rendered at `zoom x` its intended size AND position — a 440px ghost drew
  at 179px, well away from the image it was supposed to sit on, so double-click-to-reframe
  looked broken. `image-slot._zoomFactor()` walks the ancestor chain (shadow hosts
  included) multiplying computed `zoom` — computed `zoom` reports each element's OWN value,
  so the product is the real factor — and each promoted element gets `zoom: 1/factor`. Its
  used zoom becomes 1, which puts its box back in viewport px (what all the popover maths
  already assumed) AND renders its own chrome at the size it was authored at. Dividing the
  coordinates instead was the first attempt and only half a fix: it placed the overlay
  correctly but left every button inside it at `zoom x` size — an 11px control drew at 9px.
  With no zoom anywhere the factor is 1, the declaration is cleared, and nothing changes.
  The pan maths never needed touching — it works in `getBoundingClientRect` px on both
  ends and was always correct.

**The floating component control follows the canvas you clicked.** The click already
recorded which one (`sel.size`), but `seld` matched on `id` and `vi` only, so all three
size canvases marked their copy selected and the control — which pins to
`document.querySelector('.modwrap[data-selmod="1"]')` — always found the 1:1 master
first. On a detached 9:16 that put the control on the wrong canvas entirely. `seld` now
includes `(s.sel.size || 'sq') === sizeKey`, so exactly one wrap is ever marked; the
fallback keeps sessions saved before `size` existed pointing at the master.

**Never inline the font family in a measure or render path.** `window.providentFont`
(a stack) and `window.providentFontFam` are set in `runtime.js` and used by `meas()`,
both `renderOpsToCanvas`, both `renderOpsToSvg`, both `canvasStyle`s and the recents
thumbnail helper. One string, so the two paths cannot name different fonts.

**`meas()` reserves one letter-spacing unit per character, including the last.** CSS and
`ctx.letterSpacing` both add a trailing unit — measured 25 units for a 25-character
eyebrow on both paths — so the old `ls * (len - 1)` left every tracked run one unit short,
pushing centred eyebrows half a unit off and letting a run be judged to fit when the drawn
glyphs would not. `providentFillText`'s per-character advance is unaffected: nothing
follows the last character, so only the reserved width changed.

A caution on measuring this: comparing a DOM run against a canvas run is only meaningful
when both are handed the **same font string** and the DOM node is measured with
`Range.getClientRects()` (one rect per rendered line — an element rect is not a line box).
Probes that inline `'Google Sans Flex'` on one side and a stack on the other produce
erratic 0–11% differences that look like an optical-size bug and are not.

## Code layout

- **`studio-base.js`** (its own file, loaded by both documents) — `StudioBase`: the DCLogic
  surface (`state`, `setState`, `props`, `forceUpdate`) backed by one slice of the shell's
  state, plus everything the two studios share: text metrics (`meas`, `wrapRuns`), `zip`,
  `buildPdf`, `download`, `saveAs`, session load/save, the project folder, `inkBox` /
  `headBox` / `coBox`, `expPickVals`, `reelKeyframes` and the placement-preview plumbing.

Then, inside each `.dc.html`'s `<script type="text/x-dc">`:

- `CampaignStudio extends StudioBase` — module engine, 1:1 / 9:16 / 16:9 render + export
  (in `Provident Campaign Studio.dc.html`).
- `OrganicStudio extends StudioBase` — template engine, 3:4 / 9:16 render + export
  (in `Provident Organic Studio.dc.html`).
- `Component extends DCLogic` — the shell: top bar, tooltip layer, the link across to the
  other document. **One engine, `this.eng`, mounted for the life of the document** and
  returning the shell's keys merged over its `renderVals()`. `syncEngine()` is gone with the
  chooser — there is no second studio to unmount. The old note about overlapping key names
  being safe behind a never-rendering `<sc-if>` no longer applies, because the other
  studio's markup is not in the file at all.

**A shell key that only one studio needs now lives only in that studio's shell.** Campaign's
holds the placement-preview and design-system-sheet keys (`mk*`, `spec*`) plus
`allVarsOn`/`toggleAllVars`; Organic's holds none of those, drops `shPanelComponent` (it has
no `.p-rail-c`) and keeps the document-level **Enter** handler for the guided run. Adding a
key to the wrong one is invisible until the markup that reads it renders empty — the
markup-vs-`renderVals` sweep below is how to catch it.

**Verify a markup change by resolving every interpolation against a BASELINE, not against
zero.** Collect every top-level `{{ ident }}` in the markup, subtract the `sc-for` `as="…"`
aliases, and diff against the keys declared in the JS *including `studio-base.js`* — then
compare the unresolved set to the same measurement on the pre-split file. Both documents come
back with **no newly unresolved key**. Measuring absolutely instead is useless: ~30 refs are
unresolved in the original too, and the three that look alarming (`runExport`,
`exportMainLabel`, `exportMainBtnStyle`) are simply provided by `expPickVals` in the shared
file. That sweep is what found `bgSlotStyle`.

**Never write an interpolated URL into `src`.** `<img src="{{ x }}">` costs a 404 on every
single load — the literal text is requested as a path (`GET /%7B%7B%20x%20%7D%7D`). It
reaches the network twice over: the browser's preload scanner reads it straight out of the
file before any script runs, and DC mounts the markup once more before interpolating. An
`<sc-if>` around it does **not** help — at parse time `sc-if` is an unknown element and its
children are ordinary DOM nodes, and `hint-placeholder-val="{{ true }}"` deliberately
renders them anyway. Four of these were quietly filling the console and burying real errors.

Use `data-src="{{ x }}"`, which is never fetched, and let `StudioBase.promoteImgs()` copy it
to `src`. It runs from the shell's `componentDidMount`/`componentDidUpdate` — after the DOM
is updated but before paint, so there is no blank frame — and again from each engine's rAF
tick, to catch renders that don't route through the shell (the icon picker re-renders on
`forceUpdate` from instance state). React only manages the `data-src` attribute, so it never
clobbers the `src` set imperatively.

`promoteImgs` **must skip any value still containing `{{`**. Copying an un-interpolated
placeholder into `src` is exactly the fetch this exists to prevent, and from the rAF tick it
fires every frame instead of once — the first version of this fix multiplied the four 404s
into a continuous stream. No `_pSrc` is recorded when skipping, so the real value is picked
up on a later pass.

These stay `<img>` rather than becoming background-image divs because the reel/story
placement depends on intrinsic sizing: `.mk-cw .mk-shot` is `width:100%;height:auto`, and
the letterbox geometry (402 × 714.7 pt, 43 above / 116 below) falls out of the image's own
aspect. Verified still exact after the change.

**UI accent is blue, not gold.** Gold is gone from the chrome entirely — `--ps-gold`
*resolves* to the accent, which is why one token change recoloured every button, badge,
avatar, focus ring and active state at once. Canvas output is unaffected: it reads
`CampaignStudio.PAL`, never CSS variables. **The values in this paragraph are superseded
twice over** (#4E7A9E, then #2968D6) — see *Three registers: a dominant navy, a bright
blue in reserve* for the ramp that ships, and for the one rule that governs propagating
it: `--ps-accent` is a FILL, and every mark takes `--ps-link`.

**A control group is a BAND, not a card.** Groups used to be enclosed — border, radius,
16px apart, "a stack of objects" — and that is exactly what made the rails read as clunky:
forty outlined boxes have no hierarchy, because nothing in the stack is quieter than
anything else. A group is now a quiet header, its controls, and a **hairline before the
next one**; a section caption (`.p-sec > .p-cap`, `.p-subcap`) is the one heading with a
rule under it, so a section reads as a region and its groups read as its rows. Same rhythm
in the dock and the Share panel, which are panels too. The one exception is a group that is
a **column inside a `.p-row-c`** — already contained, never a band.

It lives in a **Panel rhythm block at the very end of the stylesheet**, after the dwtc
block, which is the convention here: it overrides the card treatment without touching those
call sites, and reverting is deleting a block.

Two things that came with it: `.p-lab > s` (the quiet value beside a label — "never right",
"100% · over black") is pushed **right** with `margin-left:auto`, which is the reference's
label-left/value-right row; and the `.p-opt` miniatures tightened to 42px so the graphical
controls get the room and the chrome around them gives it up. Measured: the Layout rail went
from five groups visible to eight at 1000px tall.

Not yet done, and the obvious next step if the rails still feel long: a **collapse chevron**
per section, as the reference has. It needs a chevron in ~20 hand-written group headers plus
collapse state, so it was left out of the CSS-only pass.

**Surfaces, not strokes.** Every control also carried a 1px outline, so at this density the
rails read as a wireframe — the strokes added up to more visual weight than the controls
themselves. A control is now a quiet **fill** (`--ps-fill`) that lifts on hover
(`--ps-fill-h`) and takes the accent when it is on (`--ps-fill-on`); the ON state is
*filled*, not ringed. The focus ring stays — it is not decoration, it is the only thing
that says where the keyboard is. Dashed drop zones and placeholders keep their outline too:
there the dash IS the affordance.

**Dividers only where a region ends.** The between-group hairlines went (spacing carries it
at 15px band padding), as did the section-container bottoms and both rail-to-stage edges —
a rail already differs from the stage by colour. What survives: the rule under a section
caption, and the one seam between the two right-hand rails. Measured across the three rails:
**27 visible borders → 8**.

> **Superseded.** This pass, and the later "no divider lines in a rail at all", were both
> reversed by request — see *Edge-to-edge dividers are BACK*. A hairline now closes every
> group and control row, and it cancels the section's side padding so it spans the rail.
> What is still true here is the *surfaces, not strokes* rule above it: a control is a fill,
> not an outline. The dividers separate rows; they do not re-box the controls.

**CSS could only get to 17 of those.** The rest were `border` in JS **style objects**, which
inline-beat any rule — the documented trap. Fixed at the objects: `btn(on)`, `darkBtn`,
`inpBase`, the scrim swatch, the scaling reset, `agent2ToggleStyle`, `qrLinkBtnStyle` and
the four `infoStyle` copies (the info icon is now a filled disc, not a ring — ten rings per
rail was real noise). Deliberately NOT touched: `agentPhotoStyle`, which mirrors a canvas op
and is artwork, not chrome.

**`btn(on)` was inverted on the dark ground** — OFF rendered near-white `#FAF8F4`
with navy type and ON rendered navy, so unselected pills glowed and the selected one
vanished into the panel. Both engines now use blue fill + white type + an outer ring
for ON, and a dark card with muted type for OFF. Any `[data-on]` CSS state gets the
same treatment: a blue wash, a brighter border and an outer ring.

**Organic inherits Campaign's chrome.** Class-based styling carried over for free, but
Organic's *inline* styles were authored for a white panel — `inpBase`, `inpErr`,
`qrLinkBtnStyle`, the note blocks and `slideNav.nameStyle` all had to be moved to the
dark values by hand. Class rules theme themselves; style objects never do.

One accent, one value: `#4E7A9E`. The info icons were the tell — `infoStyleDark` had
picked up the blue while `infoStyle` kept brass `#B0905C`, so the same control read
differently depending on which panel it sat in. Both are blue now, and the only other
greys left in the style objects are deliberate disabled states.

**Inline styles beat the theme block.** The export rows set `color: '#1A2942'` in a JS
style object, so their label spans inherited navy on a navy card and were invisible —
a CSS rule could not win. Anything that must follow the theme has to be fixed at the
style object, not in the stylesheet.

Sliders needed explicit `::-webkit-slider-runnable-track` / `::-webkit-slider-thumb`
rules — `accent-color` alone left them nearly invisible against the dark rails.

The **editor uses the same ground as the project browser** — rails on `--ps-sb`,
stage on #06090F, fields and tiles on `--ps-card` lifting to `--ps-card-h`. It is
applied as one theme block at the END of the stylesheet that overrides the earlier
light rules, so re-skinning is a single place rather than forty. Grouping carries the
structure: `.p-rule{display:none}` and `.p-sec` gap does the work dividers used to.
Every pointer-responsive class shares one `transition` declaration, and popovers use
the `p-pop` / `p-rise` keyframes.

**Two traps worth remembering.** A `position:absolute` menu inside a scrolling panel
gets clipped — the Export dropdown opened upward inside the Share panel's
`overflow-y:auto` and the PNG row was simply unreachable. Inside Share and the dock it
is `position:static` and expands in flow. And a popover must be told to close: Share
survived a window switch and sat over the editor, so the shell closes it on `blur`,
`visibilitychange`, Escape and an outside `pointerdown`.

Shared chrome is CSS classes (`.p-*`, tokens under `--ps-*`) declared once in the
`<helmet>` block — rails, panel sections, captions, fields, buttons, overlays and the
export dropdown are literally the same styles in both studios. Canvas rendering stays
inline and per-studio: those numbers are brand output, not chrome.

## Chrome: two modes, taken from portal.prov.ae

The chrome follows the brand's internal portal — surfaces, ink, hover states and an
**orange accent**. `data-theme` on `<html>` selects the mode, the top-bar sun/moon writes
it and it is remembered in `provident-theme`. **Dark is the default**, because that is what
studio users have been working in.

**THE CANVAS IS NOT THEMED, and that is verified rather than assumed.** `CampaignStudio.PAL`
and `OrganicStudio.ART` keep literal brand values, because they paint finished artwork, not
the tool. Checked by signing every op — op / fill / stroke / x / y / weight / px — across
126 combinations of component, variant, size and canvas palette in both chrome modes: the
signatures are **byte-identical**, and no `var(--…)` leaks into an op fill.

**The binding rule "orange never on navy/dark" is now a CANVAS rule only.** The portal
accents its own dark mode with orange and the studio follows it in the chrome. Canvas output
is unaffected — `PAL.accent` is still cream on dark and slate on light.

**Two things made a 500-literal re-skin tractable, and both are worth knowing:**

- **`var()` is the only thing that works in a JS style object.** An inline style beats any
  stylesheet rule — the documented trap here — so a themed control must say
  `background: 'var(--ps-fill)'`, never a literal. `btn(on)`, `darkBtn`, `inpBase`,
  `inpErr` and the four `infoStyle` copies now do.
- **There was already ONE dark theme block at the end of the stylesheet**, the convention
  this project follows, with only **29** distinct (property, colour) pairs. Converting that
  block to tokens themed both modes without touching the ~400 literals in the earlier rules,
  because the block overrides them. It also redeclared `--ps-fill*`, which would have pinned
  the chrome to dark whatever the root said — that declaration is gone.

Legacy token names (`--ps-navy`, `--ps-blue`, `--ps-gold`, `--ps-cream`…) are kept as
**aliases** onto the new set, so the 346 rules already written against them flip for free.

### Three registers: a dominant navy, a bright blue in reserve

The ramp is three values, split by **job**, and this is the third derivation — the first two
are recorded because each was rejected for a reason worth keeping. #487194 read as a
*disabled state*: it sat at hsl(208,34%,43%) against Provident Navy's hsl(218,44%,18%), so it
was **less** saturated than the brand colour with its hue 10 degrees warmer, and desaturating
away from Provident is the one direction that makes a colour look switched off. It was then
re-derived as a single vivid mid blue, #2968D6, correctly and at no contrast cost — and
rejected too: **a mid blue used as the resting fill of every selected control is loud
everywhere and therefore emphatic nowhere.** There was no register left for the action you
should actually take.

| token | value | job |
|---|---|---|
| `--ps-accent` | **#101E39** hsl(220,56%,14%) | the DOMINANT resting fill — every selected pill, ON tile, active tab, nav row and wash. White label **16.58**, the highest in the system |
| `--ps-accent-h` | **#2053D0** hsl(223,73%,47%) | HOVER, and the resting fill of an important action — the primary, Export, the guided run's OK/Next, the palette count badge. One loud thing per screen |
| `--ps-accent-h2` | #2B5EDE | that action's own hover, so it still lifts |
| `--ps-accent-q` | rgba(32,83,208,.22 / .13) | the quiet wash — mixed from the BRIGHT blue, because a wash of #101E39 on a dark ground is not a wash at all |
| `--ps-link` / `--ps-focus` | unchanged | every MARK, and the ring |

`--ps-brand` is the brand orange and is still used by exactly two things, both in the top bar
and both genuinely primary: the studio switcher and Preview. The rule block that does it is
**declared last in the stylesheet**, the convention here, because those two elements
otherwise inherit the accent.

**THE DEEP FILL HAS NO BOUNDARY OF ITS OWN ON THE DARK THEME.** That is the single structural
consequence and the thing to hold on to: #101E39 measures **1.00–1.15:1** against every dark
surface, so as a block it is invisible and only its white label reads. Every dark-theme ON
state therefore carries a `--ps-link` hairline, which clears 3:1 against **both** the fill
(7.27) and every dark ground (6.70–8.18). On light it needs none — the same fill measures
14.97 on the app — so the light hairline is deliberately invisible, and harmless. Do not
"fix" that asymmetry by lightening the fill; **the hairline is the fix.** Where the ON state
is written in a JS style object the hairline has to be written there too: `btn(on)` in both
studios, `agent2ToggleStyle`, and `row(on)` in `studio-base.js` — one edit each, ~14
segmented rows in Campaign alone.

**AND THE COROLLARY, which is what a careless propagation breaks: A DEEP NAVY CANNOT BE A
MARK.** Anything that must read on the ground rather than carry ink of its own — a border, an
inset ring, a slider thumb or progress bar, a caret, a diagram bar, an outline, the accent
used as text — resolves to `--ps-link`, never to `--ps-accent`, and never to `--ps-accent-h`
either (#2053D0 is 2.85 on the dark app and **2.24 on the stage**, so as ink it fails in the
theme it is meant to read in). **THE PROPERTY IS THE TEST: `background` is a fill, everything
else is a mark.** That rule reclassified ~90 declarations across the three mirrors plus
`studio-base.js`, and it is mechanical enough to script — walk back from each `var(--ps-…)`
to its property name, skipping comments and custom-property *declarations* (the `--ps-gold` /
`--ps-blue` / `--ps-orange` aliases must keep pointing at `--ps-accent`, because ~34 of their
call sites are fills).

Five exceptions the property test gets wrong, each found by measuring:

- **Three backgrounds that are really marks** — a slider thumb, `::-moz-range-progress`, and
  `.p-mini i.gold` / `.p-tmini i.gold` (a diagram bar). No label, so they read against the
  track or the tile on their own: `--ps-link`, hover `--ps-focus`.
- **Two chips that float over the CANVAS** — Campaign's `handleStyle` (the `⠿` grip) and
  `shStyle` (the spacer's `↕ drag`). Their ground is artwork, near-black *or* near-white, so
  they can take neither the dominant navy (1.35 on the dark canvas) nor `--ps-link` (1.9 on
  the light one). `--ps-accent-h` is the only step that reads on both: 3.20 on black, 6.54 on
  white, white label 6.54. The graphic corner handles need nothing — they already carry a 2px
  white ring.
- **`image-slot.js`'s reframe overlay takes NO theme token at all.** Its ground is a fixed
  dark scrim (its ink is `#fff`, its borders white alphas), so `--ps-link` would be #13459A at
  1.5:1 there in light mode. The zoom thumb is `#fff` — the ink already beside it — the ON
  anchor is the navy with a white edge, and Done is `--ps-accent-h`.
- **`.p-btn` gets no added stroke.** A labelled fill is announced by its label (6.54), not by
  its edge, and one primary per panel does not need a ring to be found. Its boundary measures
  2.54–2.85 on the dark grounds; 1.4.11 does not require a boundary where the label identifies
  the component, and the previous accent was already 2.78 on a card.
- **The winning rule is the one in the LATER block.** `.p-br-new` and `.p-cta` were promoted at
  their early declaration and silently overridden downstream; the probe said navy while the
  edit said bright. Read the colour back from the browser, never from the file.

Cost: **zero** new contrast failures in either theme, and four pre-existing ones fixed on the
way — `wideBtnStyle` / `storyBtnStyle` (the accent as ink at 2.98), the guided run's
`[data-ready]` Next (`--ps-blue-lt` under white ink, **2.1:1**), the stepper's five pending
labels (opacity .45, 3.94) and `.gd-help` (opacity .72, 3.52 in light). Measured after, with
ancestor opacity composited, reloading into each theme: **Campaign editor 2 / 2, Organic
guided run 1 / 1, Organic editor 1 / 1, web image studio 0 / 0 (dark / light)** — and every
survivor is brand orange under white ink, the one deferred decision.

### One box per option, and no all-caps in the chrome

**Stop boxing a box in a box.** The `.p-opt` button carried its own surface, border, radius
and ring while the `.p-mini` inside already had a frame — and three separate later rules
re-applied it. The button now carries nothing at all: the frame, the fill and the selected
outline live on the tile, and the **label sits outside and below it**.

**THE SELECTED TILE AND THE THREE-STOP SLIDER ARE ONE TREATMENT** — `--ps-accent` fill, a
**2px** `--ps-link` ring, white (`--ps-accent-i-q`) marks. They sit next to each other in the
Layout rail and used to disagree on every axis: the tile was a quiet `--ps-fill` with a 2px
ring and accent-coloured bars, the slider's fill was the accent itself with a 1px ring and
white marks. Same question, two answers. Measured after, in both themes: identical fill,
identical ring (7.27–7.90 against the ground), marks 14.15 and glyphs 16.58 inside the fill.
Only the radius differs — 13px tile, 999px capsule — and that is each control's own shape.

**This reverses the old "selected is an outline, never a wash" rule, and the reversal is the
accent change rather than a change of mind.** That rule was right when the accent was a
bright mid blue: a wash then was a loud blob beside a plain tile. `--ps-accent` is #101E39
now — *darker* than the rail — so a filled tile reads as a recessed navy chip, and filling
it is what this system's own rule (an ON state is a fill, not a ring) asked for all along.
The ring stays because the navy has no boundary of its own on the dark theme. **Marks inside
the accent fill are white; marks on a quiet surface are skeleton ink** — that was already
the slider's rule and the tile follows it now that the tile is filled.

**No all-caps anywhere in the chrome.** Captions, subcaps, option labels, the guided run's
group and tier headings, `.p-eye` and `.p-tpl-s` are all sentence case at normal tracking,
and sized up (a 9px tracked cap became 11.5px sentence case) so titles and body share one
scheme. Two survive on purpose: `.p-hexin`, because a hex code belongs in caps, and
`.mk-fbt s`, which imitates a platform's own UI inside the placement mock.

**The canvas keeps its tracked caps, and that is not an exception being smuggled in.** All
ten `textTransform: 'uppercase'` uses in the JS are canvas preview styles mirroring ops —
eyebrows, spec labels, the price label. "Tracked caps at 500" is a binding brand rule for
*artwork*; the instruction was about the tool.

**NO gradient fills in the chrome — none, including the scrim preview.** Measured live:
zero elements under any `.p-rail` compute a gradient background. The scrim strip used to
render the real wash through `scrimStops()`; it is now a **flat band at the wash's strongest
stop**, so its colour and strength still read true but it no longer depicts the falloff —
that is what the Fade slider states. **The export is unaffected**: `scrimStops()` still
returns its 6-stop ramp and the canvas still draws it, verified after the change. What
survives is not a fill: the select and stepper arrows, where two 45° stops *draw a chevron*,
and `.mk-phone` / `.mk-b`, the device body in the placement mock, which is illustration.

**A scripted CSS edit must never mutate the string while iterating `finditer` offsets.**
Doing exactly that merged two rules into
`.wz-f[data-bad] .wz-f-h s{color:#E4color:#E4756B;opacity:1{...` — one missing brace, which
swallowed **half the stylesheet as nested CSS**: the sheet parsed 372 rules instead of 769,
so every rule past ~51KB was silently dead while the page still looked broadly right. The
tell is `document.styleSheets[n].cssRules.length` against the number of rules in the file;
a brace-balance walk over the block finds the culprit in one pass.

### Responsive: the four-column workspace folds down

Two breakpoints. Below **1200px** the two right rails (`.p-rail-c`, `.p-rail-r`) become
fixed sheets over the canvas; below **760px** the palette (`.p-rail-l`) joins them. A
`.p-panelbar` at the foot — Components / Component / Layout, icon over label — is the only
way to reach a sheet, so it is rendered always and revealed by the breakpoint rather than by
state. `.p-veil` dismisses. One sheet at a time.

**The 380px floors were the load-bearing part.** `.p-stage` and `.p-stagecol` both carried
`min-width:380px` AND the engines clamped the canvas to a 380px floor, so a 375px viewport
overflowed no matter what the media queries said — the canvas width is written *inline* by
the renderer, which CSS cannot reach. Below 900px `dispW` now fits the viewport
(`max(200, min(vw - 64, 640))`) and both min-widths are released.

**The canvas width lives in JS, so a resize has to reach React.** `Component.band(w)` buckets
the viewport (s / m / l / xl) and the resize listener re-renders **only when the bucket
changes** — resizing inside a bucket is free. Leaving `xl` also closes any open sheet.

**NEVER put a transition on these sheets.** A rAF tick re-renders the shell every frame,
which restarts the transition before it can finish; it then sits permanently in
`playState: 'running'` and a running transition **holds its interpolated value, beating every
normal declaration** — including a rule injected at runtime with the identical selector. This
cost real time twice: first with `transform: translateX(101%)` and again with `right`. The
sheet moves instantly, and `el.getAnimations().filter(a => a.playState === 'running')` is the
one-line check that finds it.

**Open state is an attribute on the RAIL, not a descendant selector off the shell.**
`data-open="{{ shPanelOnLayout }}"` with the file's own `'1'` / `undefined` convention. A
`.p-shell[data-panel="layout"] .p-rail-r` selector *did* match (`el.matches()` confirmed it)
but was masked by the stuck transition above; a single-element attribute is simpler and left
nothing to doubt once the transition was gone.

**Nothing is dropped from the top bar on a phone** — it scrolls (`overflow-x:auto`), so every
control stays reachable rather than being hidden behind a breakpoint.

**Testing note:** viewport emulation does not reliably dispatch a `resize` event, so the
band-change re-render looks broken under emulation until you `dispatchEvent(new Event(
'resize'))`. A real window resize fires it.

### Edge-to-edge dividers are BACK, and they cancel the section's padding

This reverses the earlier "no divider lines in a rail at all" pass, by request. A divider
now closes every group, every control row and the section caption — and it is **edge to
edge**: a row carries `margin-inline: -16px` with a matching `padding-inline: 16px`, so its
border spans the whole rail and reads as a seam across it rather than as an underline under
one control. `--ps-secpad` is the single declaration of that padding (`.p-sec{padding:12px
var(--ps-secpad) 18px}`), so the negative margin cannot drift from it.

Four things this had to get right:

- **A `:last-child` carries no seam.** The last row closes its region; a trailing hairline
  above the section's own edge reads as a stray line.
- **ONE group is ONE seam.** The divider separates groups; it never appears *inside* one. A
  sub-heading within a group (Scrim's "Colour") is `.p-lab-2` — 6px of space, not a rule.
  Getting this wrong is what made Scrim read as four stacked sections instead of one control.
- **`width:100%` on a flex item defeats the negative margin.** A `<button>` used as a
  full-bleed row is the case: `width:100%` resolves against the *container* (277px) and then
  shifts left, leaving the seam 32px short at both ends while every `div` row beside it
  measures the full 309px. Omit `width:100%` and `align-self:stretch` (the default in a
  column) resolves the width as container-inner **minus the item's own margins**, which
  negative margins therefore widen.
- **A group inside a `.p-row-c` is already contained** — no band, no seam. The rule is
  restated in this block because the new selector is more specific than the old one.

Measured across all three rails in both studios: all nine group rows start at x 0 and span
the rail's full content width, in both themes, and no rail scrolls horizontally.

**Drive-by fix in the same pass:** a bare `<input>` inside a `.p-fld` label is `content-box`
with 10px of side padding and `width:100%`, so it overran its column by 8px and put a
horizontal scrollbar in Organic's rail. It is `border-box` now — pre-existing, but a stray
scrollbar reads as a divider that does not line up.

### Logo is four named tiles; Vertical spacing is one slider; Scrim is one group

All three were rebuilt to reference crops. They share one idea: **a control should state its
answer, not diagram it** — and none of them hides anything behind a click.

**Logo** was one `.p-lg` box split into four cells — the only control in the rail that was
not a `.p-opt`, so it had no label and you had to infer "bottom centre" from a bar's
position. It is four `.p-opt` tiles in a 2x2 (`.p-opts-2`) with the names written under
them, which is the one-box-per-option rule the rest of the rail already follows. The mark is
a bar **plus a dot** — the period in `provident.` — placed off the bar's own geometry
(`BAR + GAP`), so the skeleton reads as the wordmark rather than as an anonymous rule.
`.p-lg` / `.p-lg-c` are deleted, not left dead.

**Vertical spacing** was three tiles carrying miniatures of a stack, which is a diagram of
the one thing the control could say outright. It is now a **three-stop slider**: a real
`<input type=range min=0 max=2>` at `opacity:0` over the artwork, so click-to-position, drag
and the arrow keys all come for free.

**The preset's NAME sits beside the track, not inside the fill** (`.p-trirow` = a fixed 54px
`.p-tri-l` column plus the track). Inside the fill it moved with the value and crowded the
first marks at Tight; outside it is a steady label and the track is nothing but scale. The
column width is fixed so the track does not resize as the name changes length — "Tight" is
much shorter than "Medium".

**The middle preset is called Medium, not Normal.** `GAPNAMES` is the one place a preset is
named: the slider's label and the per-component *Space above* row both read it, so they
cannot drift. That row had its own inline ternary and said "Normal" for a while after the
slider said "Medium"; it calls `GAPNAMES[gapStepOf(v)]` now. The stored `gapScale` is
untouched — this is a label, not a value.

#### The two things that made it feel broken, and both were geometry

**An overlay input MUST out-specify `input[type=range]`.** The base rule sets `height:18px`,
and an attribute selector (0,1,1) beats a bare class (0,1,0) — so `.p-tri-in{height:100%}`
lost and the invisible input covered only the **top 18px of the 38px control**. Every press
below the mid-line missed it entirely, which is exactly what "it takes a lot of clicks just
to slide it" was. The selector is `input[type=range].p-tri-in` now, and the input's box is
verified identical to the container's (277 x 38, same x/y) with hit tests landing on it at
both the very top and the very bottom edge.

#### Two capsules with a 5px gutter — the reference is an SVG, so use its numbers

The reference is an outer 249x47 rect at `rx 23.5` and an inner 239x37 at `rx 18.5`: both
FULL capsules, the inner one inset **5px on every side**. That 5px gutter is the whole detail
— it is what makes the control read as two layers rather than as a filled bar.

`.p-tri-w` **is** that inset box, and it is the containing block every child resolves its
percentages against — so `GAPFILL` / `GAPMAJ` are inner-box numbers, not track numbers. Get
that wrong and the fill overshoots the gutter at 100%. Scaled to 44px tall to sit in the
rail's rhythm; the gutter stays literally 5px.

**Four marks, no minors.** They are short rounded strokes, all the same size (3 x 11 with a
pill cap), evenly spaced with a symmetric 6% margin at each end — 6 / 35 / 65 / 94. The
constant-interval minor dots that were here before read as noise at rail width and the
reference has none. Each fill stops **6% past** its last mark, which is both the gap the
reference shows and what keeps the mark clear of the fill's clip line: at Tight 2 of the 4
marks are inside the blue, at Medium 3, at Roomy all 4.

A 17px corner on the fill only cuts 0.9px in at a mark's extremes (the marks sit on the
vertical centre line, where a corner of `r = height/2` has no horizontal inset at all), so
nothing is clipped.

**The thumb is zeroed, and that is what makes a click land.** A range input maps a click
across the *thumb-centre travel*, not the track, so the default 18px thumb pulled the upper
boundary well inside the track and left a strip where pressing changed nothing visible.
`input[type=range].p-tri-in::-webkit-slider-thumb{width:0}` (and the `-moz-` twin) makes the
travel the full track, so the three stops are even thirds of what you can see and both ends
are reachable at the very edge. The **click zones are 0–25 / 25–75 / 75–100** — the native
`round()` mapping of three stops, which keeps the middle stop generous and gives the arrow
keys three clean positions. Verified with real clicks in the lower half of the control:
12% → Tight, 50% → Medium, 88% → Roomy, one click each.

**Do not switch the input to a 0–100 scale to make those boundaries meet the marks.** Snapping
in the handler strands the keyboard: the re-render writes the fill value back, so an arrow
press inside a zone resolves to the same stop and the value never advances.

- `GAPVALS` / `GAPNAMES` / `GAPFILL` / `GAPMAJ` are the four columns of that control, and
  the last two are percentages of the INNER capsule — see the geometry note above.
- **`gapScale` still stores the Latin number** (1 / 1.5 / 2.1). That is the preset's
  identity — see `gapOf` — and `gapStepOf` maps it back to an index by nearest value, so a
  hand-edited or legacy value lands on a stop instead of nowhere.
- **The marks are drawn TWICE.** One colour cannot read on both `#487194` and a light track,
  so there is an ink layer on the track and a white layer inside the fill. The inner layer's
  width is the whole inner box expressed relative to the fill (`10000 / fillPct` percent), so
  its percentages land on the same pixels and the fill's `overflow:hidden` does the clipping.
  Same mark list feeds both, so they cannot disagree.
- Marks are **elements**, not a `repeating-linear-gradient`: the chrome carries no gradient
  fills.

Verified end to end: the slider drives the layout, not just its own paint — per-component
margins came out 23.98 / 35.96 / 50.44 (exactly 1 : 1.5 : 2.1) and the copy-coverage chip
moved 43% → 47% → 52%.

**Scrim is ONE group and nothing in it is hidden.** Label and summary, the Opacity/Fade tab
pair, the slider, then Colour — one band, one closing seam, no dividers inside, no
disclosure control. Opacity and Fade are the same kind of answer about the same wash, so they
share a slider and the pair says which one is being set; each keeps its own value when you
switch back, and the label's quiet `70% · fade 40%` shows both at once.

**It was briefly an accordion and that was wrong twice over:** the chevron was a click before
any control in a section with nothing worth hiding, and wrapping the two halves in
`.p-acc-b > .p-grp` gave each its own seam, so one control read as a stack of sections. The
`.p-acc*` rules are deleted rather than left dead.

`this._scrimTab` lives on the **instance** with `forceUpdate()`, not in `state` — throwaway
UI has no business in the saved project or the undo stack. Same rule the icon picker follows.

`scrimFadeLabel` / `onScrimFade` / `scrimH` / `onScrimH` are still provided even though
Campaign's Layout rail no longer reads all of them — Organic's markup uses `scrimH`, and
deleting render keys that look unused is exactly how ~14KB of Campaign's `renderVals` was
once lost.

### The all-variants dock: Add Variant is its own button, and the panel opens upward

Rebuilt to a reference. The trigger used to be one pill labelled "All variants" carrying the
add-variant hint in a quiet `<s>`, sitting **above** the panel, and Add Variant was the first
control **inside** the panel — so adding a variant meant opening a panel of unrelated
settings first. Now `.p-dock-r` is a centred row of two peer pills, **Add Variant** and
**All Variants Option**, and `.p-dock-b` rises above that row. The add button's full state
("+ Add variant (copies Master)" / "Max 3 variants") moved to its `title`, so the label stays
short like the reference while the information survives.

**The dock is a panel, so it takes the same edge-to-edge seams as a rail** — cancelling
`--ps-dockpad` (14px), its own padding, not the rail's `--ps-secpad`. Two different insets,
two different tokens; using one for both puts the seam 2px off at one of them.

**Typeface is two tiles, not a toggle.** It was a button reading "Arabic — off" / "Arabic —
Readex Pro", which made the current state something you had to read rather than see. It is
now the same `.p-opt` pair as Background's dark/light: **English** and **Arabic**, each
showing a glyph rather than a skeleton bar, and the Arabic tile is set in Readex Pro — so the
tile is the specimen of the face it selects.

- The glyph is a **`<b>`, never an `<i>`**: `.p-mini i` is the absolutely-positioned
  skeleton bar, and a glyph in one inherits all of it.
- `setCanvasFont(key)` is **idempotent** — re-picking the active face returns early rather
  than pushing an identical entry onto the undo stack. It still calls `ensureFont()`, because
  a canvas draw never pulls a webfont: the weights are warmed through the DOM first, then the
  re-render measures in the real face.
- Verified: English → `providentFontFam` "Google Sans Flex", Arabic → "Readex Pro", state
  `font` follows, re-clicking the same tile changes nothing, and Add Variant from the outer
  row takes the project from 1 to 2 variants with badges "Master" / "Variant 2".

### The dock is right-aligned to the STAGE's edge

It was centred across `.p-body`, which includes the palette rail, so the pills floated over
the middle of the window. `.p-dock` is `position:absolute` inside `.p-body` and NOT inside the
stage, so there is no `right:0` that means "the canvas area" — the offset is the two right
rails plus the stage's own padding, each term spelled out (`--ps-railc`, `--ps-railr`, 28px)
so a change to any of them is findable. Below 1200px both right rails are fixed sheets and
leave the flow, so only the stage's padding is left to clear.

**"Right edge of the stage" and "right edge of the canvas" are two different places, ~70px
apart.** An intermediate pass anchored the dock to the master canvas by handing it `dispW`
inline — the stage is a flex row of plates and is far wider than any one canvas, so that put
the pills mid-stage. The target is the stage's padding edge, just inside the component rail.

Verified at 1440 / 1000 / 519px, both themes: the dock row and the panel above it both land
within 2px of the stage's content edge, with no overflow at any band.

### One visible seam between the two right rails

`border-left` on `.p-rail-r` itself, at `--ps-line`, so it spans the rail's **full height** and
cannot be cut short when its neighbour scrolls — a divider drawn inside scrolling content
rides up with the content. At `--ps-hair` (7%) it had all but vanished. `.p-rail-c` keeps no
right border or the two rules draw a double line, and below 1200px both borders are dropped:
the rails are fixed sheets over the canvas there, so the seam would float in mid-air.

### Every QR field in Organic is ONE object

There were four and no two matched: the property and cover slots were full-rail-width
squares with the link button underneath, the listing number was a separate field somewhere
below them, and the All-slides QR was a 54px thumbnail in a different row shape. They are all
the same thing now — a fixed square drop target with a details column beside it:

| | shape |
|---|---|
| no listing number (Cover QR) | just the square; the details column is empty |
| listing number required (Property QR, and the `listed` template's) | the square, with **Listing Number** + hint + *Visit QR Code Link* beside it |

`.p-qrrow` / `.p-qr` / `.p-qr-t`, one `--ps-qr` (120px), `placeholder="QR"` and `radius="14"`
everywhere.

**The square is a FIXED width, not `align-self:stretch` + `aspect-ratio`.** That is the trick
Campaign's dock slot uses to take its row's height, and it is wrong here: this row's height
varies with whether a listing number, an error and a link button are showing, so deriving the
width from it would make the same control a different size on three screens — the opposite of
unifying them. It is also `box-sizing:border-box`, or the error state's 2px ring plus 2px
padding grow it from 120 to 128 and the control resizes the moment a QR is missing.

**The `listed` template's listing number moved** out of *This slide* and into the All-slides
QR group, so it forms the same row. Safe because `qrGlobalOn` is `tpl === 'listed'` and that
template has exactly one slide, so per-slide and project-level are the same thing there.

Two bugs this surfaced, both worth keeping:

- **`inpBase` / `inpErr` had no `boxSizing`.** They are spread into inputs carrying
  `width:100%`, so content-box made every one overflow its container by the border plus
  padding — 24px in the new details column, which put a horizontal scrollbar in the rail. Set
  at the source now, which covers every call site instead of one CSS rule per container.
- **`.p-sec-c{color:#fff}`** — the base rule was written when that section was a navy panel.
  Its background was neutralised long ago; the literal ink was not, and in light mode it is
  INHERITED by anything that does not set its own colour. `<image-slot>` does exactly that by
  design (its placeholder is `currentColor` softened with opacity), so **every empty drop
  target in the All-slides section rendered white on white.** Measured 3.32:1 in dark and
  navy-on-white in light after the fix.

### The guided screen's scroll surfaces were in none of the scrollbar lists

`.gd-askwrap` — the question column, which scrolls whenever a chunk is taller than the
viewport — was not in any of the `scrollbar-*` selector lists, so it got the **browser
default**: a bright white bar down the middle of a near-black screen. Added along with
`.gd-bigta` and `.gd-body`.

The colours in those lists were cream literals (`rgba(236,231,223,.20)`) from the dark-only
era, which on a light rail are close to invisible. They are `--ps-line` now — a 13% white on
dark, which renders as a dark grey thumb, and a 16% navy on light — with `--ps-accent` on
hover. Both the standards property (`scrollbar-color`) and the four WebKit pseudos, or one of
the two engines keeps the old value.

The guided text boxes went from the dwtc block's flat 6px to **16px**, which on a ~55px field
is clearly rounded without becoming a lozenge, and matches the generous-rect language the
drop targets already use. Not a pill — a text box is not a button.

### A missing `inputStyle` renders the browser's default white box

Organic's rail interpolates the control's look — `style="{{ f.inputStyle }}"` — so a row that
omits that property gets **no inline style at all** and falls back to the UA default: a white
input with a grey border, among dark ones. The Area and Price rows were written as raw object
literals rather than through the `inp` / `inpNum` factories, and they omitted it.

`inputStyle` is now **defaulted** in the same pass that splits label from hint, so a new row
cannot reintroduce this by forgetting one property. Verified in both themes: every control in
the rail computes one background (`--ps-fill`), the only exception being a field in its error
state.

**The general shape of this bug:** when the look of a control is supplied by an interpolated
style object rather than a class, a missing key is invisible in the source and looks like a
theming failure in the browser. Grep every literal that sets `isInput: true` (or the
equivalent flag) for the style key before assuming the CSS is at fault.

### A field's guidance is its own line, not part of its label

Organic's rail fields were labelled `Name — how it renders`: `Price — numbers only, shown as
AED 12,200,000`, `Area — numbers only, shown as 9,918 sq.ft.`. At the rail's 277px column
that is a sentence, so it wrapped and orphaned the example value on a second line — which
reads as a broken row rather than as help.

`slideFields` is now post-processed **once, over the assembled list**: split at the first
` — ` into a short `label` and a `hint`, and the five label-bearing branches (input, area,
select, stepper, segmented) render `{{ f.hint }}` as a `.p-hint` under the control. The ~20
factory call sites keep writing one string, so they cannot drift from each other. `isNote`
rows are skipped — their `label` **is** the prose and carries em-dashes of its own. The two
hand-written `Listing number — 11 digits, under the QR` rows were split in the markup.

This is the row shape Campaign's rail and the guided run already use, so it is not a third
pattern. Verified on both the `listed` card and weekly's property page: every label is one
line, the hints read at 4.44:1 in dark and clear in light, and no rail overflows.

**Campaign's own labels were deliberately left alone.** `Style variant — per design variant`
and `Text — linked across all variants` are *scope* qualifiers, not example values — they fit
the column and belong with the label.

**A caution about diagnosing this one.** The first measurement said the label wrapped to 9
lines in a 0-width column with a 22px input — because the browser pane was not laid out and
`.p-shell` itself measured 0×0. `getBoundingClientRect` up the ancestor chain is the check:
if `body` is 0 wide, throw the numbers away and set a viewport first. The apparent colour
difference between the label and its wrapped remainder was also an artefact — both measured
`--ps-dim`, and a single interpolated text node cannot carry two colours.

### Named icons: Material Symbols ROUNDED at wght 300

Nine icons were named explicitly and are now the **Rounded** family, not Outlined:

| where | icon |
|---|---|
| top bar | `deployed_code` (Projects), `folder_open` (Source folder), `save` (Save), `preview` (Preview), `file_export` (Share) |
| Campaign's Layout rail | `dark_mode` / `sunny` (Background), `align_horizontal_left` / `align_horizontal_center` (Alignment) |

Fetched from
`fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/<name>/wght300/24px.svg`
and baked in as path data, the same as the other 23 — no runtime network dependency, so it
still works offline and from disk. (The reference gave the Google Fonts `<link>`; the path
data is the form this file uses.) `wght300` is the chrome's weight; there is no `wght400`
build at that URL, only 100/200/300/500/600/700.

**Source folder, Save and Share had no icon at all** — they gained one plus `p-ico-t`, the
icon-over-label class the other top-bar buttons already use. Share keeps its `▾` dropdown
caret.

**The sun and moon are shared with the top-bar theme toggle**, which renders the same two
glyphs, so it was updated with the rail tiles — leaving one pair Outlined would have been a
new inconsistency.

**Replacing an icon by its path data needs a uniqueness check first.** The Preview button's
old play-in-a-box glyph is used **four** times: once on the button and three times as the
Instagram/Facebook video-tab icon inside the placement mock, which is deliberately the
*platform's* wireframe chrome and must not change. A blind swap took all four. The fix keys
on the surrounding markup — only the occurrence whose context carries `p-prev` becomes
`preview`. Verified after the fact: the button's path is the eye (838 chars) and the mock's
three tab icons are back to the play glyph.

### NEVER write `viewBox` inside a CSS string — DC camel-cases it

This one is worth more than the feature it broke. The dropdown chevron is a Material Symbols
`keyboard_arrow_down` baked in as a `background-image` data URI. Written the obvious way it
rendered **nothing at all**:

```
--ps-chev:url("data:image/svg+xml,%3Csvg … viewBox='0 -960 960 960' …");
```

Design Cursor camel-cases attribute names as it processes the document, **and it does that to
the text inside a CSS data URI too.** What reached the browser was
`sc-camel-view-box='0 -960 960 960'`. The SVG therefore has no viewBox, so it decodes
perfectly — `new Image()` even reports a size, which is what makes this so misleading — and
paints an empty box. `getComputedStyle` shows a valid `url("data:image/svg+xml…")` the whole
time.

**How to see it:** read the custom property back, `decodeURIComponent` it, and look at the
markup. A `DOMParser` parse reports no error, so only the attribute name gives it away.

The fix keeps the real Material path and drops the viewBox entirely: `width`/`height` of 960
supply the intrinsic square and `transform='translate(0 960)'` maps the icon's own -960..0 Y
range into 0..960 — identical glyph, no camelCase attribute anywhere. Same trap applies to
`preserveAspectRatio`, `clipPath`, `gradientUnits` and friends: in a CSS string, use only
lowercase SVG attributes.

### Two more things about that chevron

**The `background` SHORTHAND wipes an icon that IS a background-image.** Every hover and
focus rule on these fields set `background: var(--ps-card-h)`, which resets
`background-image` to `none` — so the arrow vanished the moment you hovered or focused.
`.gd-big:hover`, `.gd-big:focus`, `select.p-in:focus` and the two base `.p-in` rules are
`background-color` now, and the chevron block re-asserts the image on `:hover`, `:focus` and
`:active` so no later shorthand can wipe it again.

**A data URI cannot read a CSS variable**, so the whole `url()` is the variable instead —
`--ps-chev`, defined once per theme. That is how the arrow follows the ink in both modes.
Verified at rest, on a real pointer hover and on focus, in both themes, for `select.p-in` and
`.gd-bigsel`. The superseded gradient declarations are left in place and overridden; no
gradient computes anywhere in a rail, the dock or the guided run.

### Carrying the chrome over to Organic — three whole screens were never themed

Most of this session's work reached Organic for free, because it is CSS classes: the
edge-to-edge dividers, the pill buttons, the plate badges in Title case, the slider thumbs.
What did **not** carry over was every surface that predates the two-mode conversion and was
never touched by it. Three of them were effectively unusable in light mode:

| screen | measured | cause |
|---|---|---|
| Organic's **guided run** | 35 elements at 1.0–1.2:1 | `.gd{background:var(--ps-navy);color:#fff}` |
| **Pick a template** and the **studio chooser** | "Pick a template" and every template name at 1.05:1 | `.p-over{background:var(--ps-navy)}` + `.p-over-in{color:#fff}` |
| the **project browser** (the screen the studio opens on, both studios) | 31 elements at ~1.05:1 | `.p-br{color:#fff}` plus cream-alpha ink on the rows, labels and card meta |

The cause is the same in all three and it is the alias trap: **`--ps-navy` resolves to
`--ps-card-h`, which is `#FAF9F7` in light mode.** Every rule still written against it turned
its surface near-white while the literal `#fff` ink stayed put.

Themed the way the original dark→two-mode conversion was done: **one block at the end of the
stylesheet** that re-declares only the colour properties, leaving the ~90 earlier
declarations alone. Reverting is deleting the block.

**Quietness expressed as OPACITY does not survive the flip.** This is the second, subtler
half. White at 38% on near-black is legible; `#5A6675` at 38% on white is not — the guided
run's locked-layer chips measured **1.36:1** and the sidebar's count badges **1.88:1**. Where
the opacity only means "this is quiet" it becomes `opacity:1` and the quietness moves into
the token, which already carries it in both modes.

**THREE STATES NEED THREE VALUES — THEY DO NOT NEED THREE OPACITIES.** The process stepper was
the last hold-out and it was exempted on the wrong reasoning ("opacity encodes state here, so
leave it"): `.gd-step s` faded .45 / .72 / 1 for pending / done / current, and the five
**pending** labels measured **3.94:1** with the .45 composited in — under the body minimum, in
the flagship flow. Three tiers of *ink* read just as clearly and clear the bar in both themes:
pending `--ps-dim`, done `--ps-ink-2`, current `--ps-ink` at 500. The same sweep had also
missed `.gd-help` (opacity .72 over `--ps-ink-2`, **3.52** in light) and `.gd-dest-t b` (.45 —
its sibling `s` was in the remediation list, the `b` was not). What genuinely stays is
`.gd-skip`'s hover fade, and disabled states, which are exempt.

**Declare the remediation where the selector is declared LAST.** Putting the stepper's three
rules in the quietness block did nothing, because `.gd-step s{color:var(--ps-ink)}` sits
~35 rules below it and wins for `color` — pending went back to full ink and the fix looked
inert. They live in the stepper's own block now.

**A card miniature is a picture of the CANVAS, so it does not follow the chrome.** `.p-c-p`
and `.p-tpl-c` are pinned to a canvas-dark ground in both modes. On `--ps-card` (white in
light mode) the white skeleton bars vanished and only the scrim band showed, so every
template read as a grey blob. The frame and the hover ring are chrome and stay themed.
**SUPERSEDED IN ORGANIC, and the reason is the reason:** the pin existed for the *skeleton
bars*, and Organic's miniatures are opaque renders now, so the tile is chrome again there.
It is still exactly right in Campaign, whose cards are still skeletons — see *Organic's
template miniatures are real renders*.

**A PINNED SURFACE TAKES PINNED INK, and that is the same rule one layer deeper.** The image
tool's `.fr` preview frame is deliberately a fixed dark checkerboard in both modes (the checker
means "transparent", so it must not become the page's background) and its badge, grip, kill and
reframe-hint chips are correctly pinned literals. `.fr .ph` — the size label in an empty output
— was the one thing inside it still taking a themed token, so in light mode `--ps-dim` became
#5E6874 on that dark checker: **3.39:1 across all seven empty cards.** It is `#8A939F`, the
dark palette's own quiet value, in both modes. `image-slot.js`'s reframe overlay is the third
instance of this and is handled the same way.

**An audit that composites opacity is the only one that finds these.** Comparing a computed
`color` against the nearest opaque ancestor background misses everything above — the ink is
often correct and the *inherited alpha* is what kills it. Walk the ancestor chain
multiplying `opacity`, composite the ink onto the background, then measure.

Verified across both studios × both themes, on the browser, the chooser, the template
picker, the editor and all six steps of the guided run: **zero** elements below 2.4:1 (a
bar since raised to WCAG AA — see the section named above) and
zero non-pill buttons, other than Undo/Redo in their disabled state (0.4 alpha, by design)
and `.gd-skip`, whose opacity is its hover affordance.

Also tokenised in the same pass: Organic's two QR error rings and the slide-remove `✕`,
which used `#E4756B` / `#B3261E` — the latter is the *light*-mode error red and read as a
muddy smudge on the dark rail.

### The Arabic specimen tile: `line-height: 1` crops the glyph

An Arabic letter carries its tail below the baseline, and a line box exactly one em tall has
nowhere to put it — so the specimen rendered as a clipped mark rather than a letter. It also
has to be set **larger** than the Latin one: an Arabic letter body measures 46 per 100px
against a Latin cap's 72.8 (the same measurement `AR.eyebrow` is built on), so the same
nominal size looks about a third smaller. 27px/1.3 for the Latin "A", 34px/1.35 for the
Arabic — measured glyph boxes 35.1px and 45.9px, both centred in the 62px tile.

### An OBVIOUS button, not everything that is clickable

"Make every button a pill" was applied as a sweep, and the first version listed the card and
tile classes alongside the real buttons. `.p-c-p` is a 4:5 project miniature, so 999px turned
**every card on both project browsers into a circle**. The line that matters:

| pill | keeps its own radius |
|---|---|
| labelled action buttons, toggles, segmented pairs, the top bar, plate badges and Edit/Remove, the dock pills, `.p-ic` (one icon cell), nav rows | cards (`.p-c-p`, `.p-tpl-c`, `.p-pick`), specimen tiles (`.p-tile`), option tiles (`.p-opt`/`.p-mini`), the dashed drop zone (`.p-dash`), grid containers (`.p-icons`) |

A card, a tile, a specimen row and a grid container are all clickable and none of them
*looks* like a button.

**The revert is DELETING them from the sweep selector, never re-declaring a value.** Each
already has a radius from the earlier cascade (`.p-c-p` / `.p-tpl-c` from the dwtc block's
`var(--ps-r)` list, `.p-tile` 10px, `.p-pick` 16px); hand-copying those numbers into a later
rule is how they drift out of step.

Two shapes are deliberate exceptions to the pill: the **three-stop spacing slider** is a full
capsule (track and fill — its marks sit on the vertical centre line, where a corner of
`r = height/2` has no horizontal inset, so nothing is clipped), and the **export format rows**
are an 8px rounded rect, because they are two lines tall and a capsule there reads as a
lozenge rather than a button.

**Audit it, do not eyeball it.** Enumerate every `<button>` outside `.p-plate`, skip anything
whose radius is already ≥ half its height and anything with no surface at all (`.p-opt` has
neither background nor border — its frame is on the `.p-mini` inside, so its corner is
invisible either way), and print what is left. That found the survivors CSS could not reach:
`btn()` and `darkBtn` write `borderRadius` inline into ~16 style objects, so the sweep had to
land at those two helpers.

### Light mode: find invisible text by measuring, not by looking

The palette specimen was the reported symptom — `#fff` / `#ECE7DF` / `#D4CFC4` ink on a chip
whose background token had flipped light, so the whole left rail read as empty. The fix is
tokens (`--ps-ink`, `--ps-ink-2`, `--ps-line`): the chip is a **type specimen** showing
weight, size and tracking, the rows differ by those three things and never by colour, and it
is chrome, so it follows the theme.

It was not the only one. Walking every chrome element that renders text and comparing its ink
against the nearest opaque background behind it found six more, all the same two causes:

- **A literal `color:#fff`** on a surface whose background token flipped: `.p-dock-t` /
  `.p-dock-b`, Organic's slide-nav name, `qrLinkBtnStyle`, `agent2ToggleStyle`.
- **`--ps-navy` is an ALIAS onto `--ps-card-h`**, which is `#FAF9F7` in light mode — so a
  rule still written against it became near-white on near-white. Share's `[data-on]` was
  white text at **contrast 1.05**.
- Plus two obsolete overrides: `.p-alert` and `.p-sec-c .p-bad` lightened their error text to
  `#FCA5A5` for a navy panel that is transparent now, leaving salmon on white at 1.9.

A floating control needs an **opaque** surface in both modes: the dock's pills used a 12%
accent wash, which is legible on `#0A0D11` and all but invisible on `#E9E6E1`.

Verified: **zero** elements below 2.2:1 across both studios × both themes, with the dock, the
Share panel and a selected component all open.

**One trap while measuring this.** After a theme toggle, `getComputedStyle` can return a
mixed pre/post-flip picture — `.p-tile` reported `background: rgb(243,241,238)` (the *light*
fill) in dark mode while `--ps-fill` at the same element read correctly as
`rgba(255,255,255,.05)`, no rule in any sheet produced that colour, and a freshly-created
probe with the same class computed the right value. **Reload into the theme instead of
toggling into it**, and let a screenshot settle it.

### Very round corners, and the two things CSS could not reach

By request: every button in `.p-top` plus the studio switcher, the Scrim tab pair, the plate
badges, Edit/Editing, Remove, the two size-detach buttons, the copy-coverage chip and the
dock's own toggles are all `999px`. It is the one place the dwtc block's flat 6px is
overridden. The theme toggle is 35x35, so it becomes a true circle.

**Inline styles, as always.** `btn()` and `darkBtn` write `borderRadius` into JS style
objects, so no rule can reach them: Undo/Redo are set at `undoStyle` / `redoStyle`, and
`darkBtn` itself carries the pill (it backs the dock's toggles and the Share panel's Export
button). The plate badge, activate and remove styles are set at their own objects too.

**`.p-dock-t[data-on]` had to be named explicitly.** The dwtc block lists that selector
separately at 0,2,0 specificity, which outranks a bare `.p-dock-t` in a later block — so the
All Variants pill went square the moment the panel opened. Declaring a rule last is not
enough when an earlier rule is more specific.

### "MASTER" was all-caps in the JS, where the CSS sweep could not see it

The "no all-caps in the chrome" pass swept `text-transform`, which cannot reach a string that
is *literally* uppercase in a render value. The plate badges were the survivors:
`'MASTER'` / `'VARIANT n'` in Campaign and `sLabel(si).toUpperCase()` in Organic. They are
Title case now, and the `.14em` tracking went with them — tracking is a tracked-caps device
and reads as gappy on mixed case.

Verified by scanning the rendered text of `.p-plate-h`, `.p-plate-f`, `.p-dock-r` and `.p-top`
for any all-caps word of 4+ letters: **none left, in either studio.** The ~15 remaining
`toUpperCase()` calls are all canvas ops or canvas-preview values — tracked caps in the
artwork, which is a binding brand rule and explicitly not the chrome.

### Slider thumbs carry no stroke

The 2px white ring is gone from `::-webkit-slider-thumb` and `::-moz-range-thumb`. It was
also hiding a centring bug: the ring made the thumb's box 18px while `margin-top:-5px`
assumed 14px, so the thumb sat 2px below the track's centre line. Without it the arithmetic
is exact — `-(14 - 4) / 2 = -5`. What stays is the focus ring, which is not decoration: it
is the only thing that says where the keyboard is.

### The theme toggle is a top-bar button like any other

### The theme toggle is a top-bar button like any other

It shipped with `class="p-ico-t p-ico-o"` — **missing `p-ghost` entirely**, and `.p-ico-o`
was a class invented for it that had no rule at all. So it had no surface, no border and no
radius: a bare faint glyph sitting between four proper buttons.

It carries `p-ghost` now, and `.p-ico-o` makes it the one **label-less** button in the bar:
`35x35`, `justify-content:center`, zero padding and `box-sizing:border-box`, so it is square
and flush rather than 5px short. Verified against every other top-bar button in both modes —
same height, same top, same surface, same radius.

**A note on measuring this.** `getComputedStyle` read straight after a `forceUpdate()` can
return the pre-render values even from a re-queried selector, which showed the dark-mode
button carrying light tokens and looked like a theming bug. Walking `--ps-fill` up the
ancestor chain proved the token was correct at the element, and a screenshot confirmed it.
Re-read in a fresh call before believing a colour that contradicts the token.

### Tile geometry, from the reference

`.p-mini` is **62px tall with a 13px radius** and its bars are **pill-rounded** — including
the Logo tiles, which take the same `.p-mini` as everything else now rather than their own
84px grid. The height stays FIXED rather than an aspect-ratio — a square makes two-up tiles
taller than three-up ones and the rail loses its rhythm, which is a rule this file already
held. 62px is square-ish at three across and landscape at two, which is what the reference
shows.

**Selected fills the tile and turns its skeleton WHITE.** `.p-opt[data-on] .p-mini` takes
`--ps-accent` and its bars take `--ps-accent-i-q`, which is what makes the chosen layout
obvious at a glance instead of having to spot a border. (Superseded once: the bars were
`--ps-link` on an unfilled tile — see *One box per option* for why filling it is now
correct.) `.dim` and `.scrim` modifiers keep the neutral `--ps-skel-q` in both states, so
the diagram's secondary furniture never competes with the content mark.

**Layout preset was rebuilt to the reference**: thick pill bars and nothing else. It used to
carry five marks plus a scrim wash, which read as a tiny finished ad rather than a diagram
of where the copy sits. Bottom is two bars low, Split is two high and one low, Top is two
high.

One radius scale across a rail: 10px on fields and ghost buttons, 9px on row buttons, 13px
on tiles, 11px on the scrim band.

### Rail controls: skeletons, big icons, no dividers

**A miniature is a DIAGRAM, not a picture of a canvas.** `.p-mini` was a navy gradient with
white bars, which read as artwork and made every option look like a finished ad. It is a
**skeleton** now — a flat `--ps-fill` surface with `--ps-skel` bars — the device the portal
uses for its Content and Row-density pickers, and it follows the chrome so it is legible in
both modes. The wordmark-placement tiles are the same diagram and lost their gradient with
it — they were `.p-lg` at the time and are ordinary `.p-opt` tiles now.

**Two controls dropped bars for a BIG ICON**, because their subject is a mode rather than a
layout, which is exactly the portal's Mode picker:

- **Background** — a moon for Dark, a sun for Light. This also settles the old worry that
  those two tiles had to keep showing a real dark and a real light: an icon says it better
  than a swatch, so the tiles no longer carry a palette at all.
- **Alignment** — the `align_horizontal_left` / `align_horizontal_center` glyphs.

`.p-mini-i` centres the glyph and takes `--ps-accent` when the option is on.

**The Scrim strip keeps its gradient, and must.** It calls `scrimStops()` rather than mocking
one, so it cannot drift from the canvas — it is the real wash, not a diagram.

> **Superseded twice.** The strip was later flattened to a single band at the wash's
> strongest stop (no gradients in the chrome), and then removed altogether on request. The
> Scrim is a single group now — see *Logo is four named tiles…*. `scrimStops()` is
> unchanged and still returns its 6-stop ramp for the canvas.

**No divider lines in a rail at all.** The section-caption rule, `.p-sec-a` / `.p-sec-b`,
the `.p-subcap` rule and its `::after`, and the `.p-hid + .p-hid` hairline are all gone;
spacing carries the grouping. That takes the earlier "dividers only where a region ends"
pass to its conclusion — measured across the three rails there are now **none**.

> **Superseded.** Reversed by request — a hairline now closes every group and control row,
> edge to edge. See *Edge-to-edge dividers are BACK*.

Still authored for dark, and the next pass: the ~205 remaining literals in one-off inline
style objects (the dock, the palette sample previews, badges), and the `.p-mini` control
miniatures — those are diagrams, so layout/alignment/logo miniatures should follow the
chrome while the Background dark/light tiles must keep showing a real dark and a real light.

## Campaign Ad Studio panel

Four columns: component palette · canvas · **component** · Layout. The component
column (`.p-rail-c`) holds *This component* plus **Background image** and **Hidden
Design Components**, and always mounts — those last two aren't selection-scoped, so
gating the column on `hasSel` would hide the photo control. `.p-stage` carries
`min-width:380px` and `.p-body` scrolls horizontally — otherwise four fixed columns
starve the canvas to ~56px on a narrow window.

**Fields follow the reading order of the component they edit.** *Small label — linked*
comes **before** *Text — linked across all variants*, because on the canvas the label sits
above the figure ("PRICES FROM" over "AED 2.6M"). It was authored the other way round, so
the panel and the artwork disagreed. Both blocks are gated (`selIsPrice` / `selTextSingle`)
and there is exactly one of each — the move left a duplicate behind the first time.

**All-variants controls float over the canvas** as `.p-dock` — a row of two pills
(**Add Variant**, **All Variants Option**) with a panel that rises above them holding the QR
code, the Typeface pair and the co-brand logo. It is `position:absolute` inside `.p-body`
with `pointer-events:none` on the wrapper and `auto` on the pills, so it overlays without
stealing clicks or taking layout space. Open state is `state.allVarsOpen` on the shell. See
*The all-variants dock* for why Add Variant is outside the panel.

**Help prose lives in tooltips**, not inline: anything explanatory (scrim colour and
fade guidance, the stored-resolution note) is passed as `data-tip` on the label's `i`
icon rather than set as a `.p-hint` paragraph.

Delivery controls live in a **Share** dropdown in the top bar, next to ⌂ Studios:
project name, Export, layout guides, project folder, Save session. Open state is
`state.shareOpen` on the shell, and the menu's contents switch on `shIsCampaign` /
`shIsOrganic`. What stays in the rail is design-level (add variant, QR), retitled
"All variants" / "All slides".

**Export is PICK, then EXPORT — there is no dropdown.** The four formats are always on
screen inside Share, one is always selected, and the primary button runs that one and
names it (`Export PNG 2×`). Clicking a row only chooses it. This replaced a collapsed
menu whose caret was a second click before any format was even visible; `exportMenuOpen`,
`toggleExportMenu` and `exportCaretStyle` are gone, and so is the `shToggleShare` poke
that used to pre-open the menu.

`StudioBase.expPickVals(pdfOn)` builds the whole control for **both** engines — the rows,
the selected styling, the button label and `runExport` — because two copies of one
four-row list drift. Three things it has to keep doing:

- **The selected state is set on the style object, not in CSS.** Inline styles beat the
  theme block, so a `[data-on]` rule could never win here.
- **PDF is the one row that can disappear** (`exportPdfOn`), so a stored `exportKind` of
  `pdf` falls back rather than leaving the button pointing at a format with no row.
- `data-on` is `'1'` / `undefined`, never a boolean — and PDF's flag is `exportPdfSelOn`,
  because `exportPdfOn` already means "is the PDF row offered at all".

`exportKind` is chrome, so both `strip()`s delete it: choosing a format is not a change
to the design and must not churn the undo stack or the re-render key.

The right rail is one **Layout** group: Background → Logo → Layout preset → Scaling →
Alignment → Vertical spacing → *Scrim* (one group: an Opacity/Fade tab pair over one
slider, then Colour) → *Background image* (opacity, photo, overlap) → *Hidden Design
Components* (show / delete). Section notes live in the hover tooltip on each heading, not
inline; Scrim's tip sits on its label and names the tab you are on.

**Controls are diagrams, not words.** `.p-opt` tiles hold a `.p-mini` miniature of the
canvas with the thing the option changes drawn in place — content clustered low for
Bottom, bars stepped apart for Roomy, a square in the corner for the QR side. Rules:

- `.p-mini` is a **fixed 48px** high, never `aspect-ratio` — a square makes two-up
  tiles taller than three-up ones and the rail loses its rhythm.
- Marks are `<i>` children positioned in %; classes `dim`, `gold`, `scrim` cover the
  palette, and `.p-mini-lt` flips a miniature to the light-mode ground.
- Active state is `data-on` carrying **`'1'` or `undefined`** — never a boolean.
  React renders `data-on={false}` as the string `"false"`, which `[data-on]` matches,
  so every tile would light up at once.
- Logo placement is a 2×2 of named tiles: rows top/bottom, columns left/centre. There is
  no right column, so the widget cannot express a placement the brand rules forbid. (It
  was one shared `.p-lg` grid; it is four `.p-opt` tiles now, each with its name under it.)
- The Scrim strip is the **real** gradient — it calls `scrimStops()` rather than
  mocking a gradient, so it cannot drift from the canvas. *(Removed on request; Scrim is
  one group with a tab pair. `scrimStops()` still serves the canvas.)*
- **Two controls stopped being diagrams**, because a diagram of a thing the control can
  simply say is worse than saying it: Background and Alignment take a big icon (see *Rail
  controls*), and Vertical spacing is a three-stop slider with the preset's name in its
  fill. Reach for a miniature when the option changes *where something sits*.

### Blocks lifted from the dwtc.provident.ae landing page

That page runs the same type system as the studio — Google Sans Flex 300 body / 400
headings / 500 tracked caps — so only its *structures* were new.

**Spec data is the one label/value block.** A separate "Stat figures" component was
tried and then merged back in: it was the same `cols` data with a bigger figure, and two
components meant two places to drift. Layout is the style variant — `row` · `ladder` ·
`boxed` (ladder in a 14px hairline panel, the page's case-study treatment) · `boxrow`
(columns in that panel). The figure itself is controlled by two **module** fields, not
variants, because they describe the data rather than a design variant and so are linked
across all of them: `big` sets the figure at the `stat` step of the type scale, `figTop`
puts it above its label (the figure-first reading the market panels use). Default is
label-above-value, which is how every already-saved session looks.
`CampaignStudio.specBox()` is the single geometry source read by `modPx`, `buildOps` and
the preview; its non-`big` numbers reproduce the original formulas exactly, so
`spec/row` still reserves 79px and `spec/ladder` 211px at 1:1.

**Tag chips absorbed the benefit strip** for the same reason — one authored `chips` list,
six treatments: `mist` · `gold` pills, `icon` (pill with an uploaded SVG), and
`rule` · `dot` · `plain`, which are the divided label bar from the page's hero.
`CampaignStudio.isStrip(mv)` is the one test for "renders as a strip, not a pill".

**Process steps** is the only genuinely new component: a circle plate per step with an
uploadable SVG at its centre, an auto-numbered badge on the top-right corner, a dotted
connector to the next plate and the label beneath. Variants `icon` · `num` · `list`,
the last being the compact stacked form a 9:16 has room for. **Numbering is derived from
position, never authored**, so reordering or deleting a step cannot leave the sequence
wrong. The connector is a run of small `rrect` dots in the export and a
`repeating-linear-gradient` in the preview — no dash support needed in either.

Icons live in the shared photo store as `adstudio-ic-<modId>-<i>`, are picked up by
`loadAssets` and travel into `Assets/` as `icon-<modId>-<n>.<ext>`. The slot is mounted
**on the canvas itself**, so an SVG is dropped straight onto the plate.

Hero gained `fade`, which ramps the headline out downward to 10% ink, and **Jumbo is now
Light 300** — at 1.55× the hero step, Regular reads as a slab. `fade` needed a real
capability: the `text` op now takes an optional `grad`, a vertical gradient in **canvas**
coordinates so one ramp spans all the lines instead of restarting per line. Per the
parity contract that landed in **all four renderers** (canvas + SVG × both engines) even
though only Campaign's hero emits it. The preview does the same with
`background-clip:text`.

`cta` gained `rect`: an 8px radius rather than a pill, label at 500 — the page's actual
button. New palette tokens `warm` #F4F1EC and `boxBd`, its data-panel hairline. Its
eyebrow needed nothing: 500 tracked caps in `inkMute` #D4CFC4 is already `plain`.

**Two things were deliberately not copied.** The hero sets its emphasis word in
**Literata 500**, a serif — the binding rules removed the second typeface and the
single-word serif emphasis, so it was left out. And the Google/Trustpilot rating badge
was built and then removed as not relevant; `poly` is stroke-only in both renderers
(`fill="none"` in the SVG path) so it could never have had real stars anyway.

`CampaignStudio.MERGED` folds the retired `stats` / `strip` / `rating` types — and their
`mvar` values, including any detached `story` / `wideOv` overrides — into `spec` / `tags`
on load, so a session written while they were separate still opens.

**Watch the copy budget.** `steps/icon` reserves ~320px of a 1080 canvas and a `big`
`spec` ladder ~390px, against a ~40% ceiling for *all* copy. Two rows or three steps is
the practical maximum beside a headline.

Still available from the study, not built: the page's **angled** scrim
(`linear-gradient(100deg, …)`). The studio does vertical and horizontal only, and a
diagonal needs an angle on the `grad` op — which means touching both renderers.

### Per-component spacing, and the copy-coverage readout

**Space above is a MULTIPLIER, not a pixel value.** `v.gapB[modId]` scales the variant's
own Tight / Medium / Roomy step, so the presets stay meaningful (switching to Roomy still
opens everything up proportionally), one value is right on 1:1, 9:16 and 16:9 alike, and it
follows the Scaling control for free. Range 0–3, absent means 1.

It lives on the **variant**, beside `gapScale` — not on a detached size's record. The global
gap already works that way, and a detached size gets its own Scaling, which moves `tk.gapS`,
so spacing already adapts per size.

**Space is taken BEFORE each component**, so an override reads as "push this one down" and
the first in a cluster stays pinned to its margin. Every caller skips index 0 rather than
`gapBefore` returning 0 for it — that way the value the user set survives a reorder.

Three places had to change together, and missing any one puts the wash or the bottom cluster
in the wrong place:

- `buildOps`' top/bottom layout loops
- `scrimStops`' `clusterH` — the wash is sized from the stack, so it needs the same gaps
- the preview, where the flex container's uniform `gap` became **0** and each item carries
  its own `marginTop`. The cluster lists are built from the MODULES first so each item knows
  its index; `mk()` alone cannot know whether it is first.

Verified: with 2.5x / 0 / 1.75x on four identical components, the DOM box top and the op
baseline stay a constant 27.7 units apart — 0.37 of spread — so the preview and the export
place the stack identically. A project with **no `gapB` lays out bit-identically** to before
at every preset, size and alignment.

**The copy-coverage chip** under each canvas reports `(top cluster + bottom cluster) / H` as
a percentage, measured from the same `modPx` and per-component gaps the export lays out
with, so the number cannot disagree with the artwork. `COVER_MAX` is 40 — the brand rule's
ceiling — and past it the chip turns amber and gains a wash. **It reports, it never blocks**:
the rules call for the image to outweigh the copy, but real campaigns run near 50% and the
studio's job is to show the number, not refuse the export.

### Two variants added: price `line`, eyebrow `fill`

**Price · One line** collapses the two-row block into a single run: `Starting from AED
6.7M` instead of a tracked-caps `STARTING FROM` over `AED 6.7M`. One size, one weight,
one op.

- It sits at **`tk.stat`** — the 4.6cqw step, exactly one minor third below the headline
  (49.7px against 59.4 at 1080). Reading the token rather than a literal is what keeps it
  on the scale at every canvas size and every Scaling setting. `priceLinePx(tk)` is the
  one place that choice lives.
- **Nothing is re-cased. The canvas shows exactly what was pasted.** `priceLine()` joins
  `m.sub` and `m.text` verbatim. It used to run `toTitle` over the label, which quietly
  rewrote `STARTING FROM` as `Starting from` and fought anyone typing their own case —
  this is the one price treatment that is a sentence the user writes, so it is theirs.
  (The figure was never put through `toTitle`, because it lowercases the tail of every
  word and would give `Aed 6.7m`.) The **other** price variants are unaffected: `plain`
  and `glass` still upper-case the small label, because there it is the tracked-caps
  eyebrow role, which is a binding brand rule.
- **One function serves both surfaces, so they cannot disagree.** The canvas op and the
  DOM preview both call `priceLine(m)`; the preview additionally emits `sub: ''` for this
  variant, so the `toUpperCase` on the other variants' label never reaches it.
- **The preview has to build the same single string.** The markup is two spans with no
  whitespace between them, so a flex gap would not be a space and the run would not
  match the op. `line` therefore puts the whole string through the shared `text` key and
  hides the label span.
- `toTitle` and `SMALLWORDS` moved to **`StudioBase`** — a brand copy rule, not an
  Organic one. Organic's instance method is now a delegate, so every existing
  `this.toTitle(...)` call site is untouched. **`from` was added to `SMALLWORDS`**: it
  belongs there for the same reason `for`, `by` and `of` already do, and without it the
  variant read "Starting From AED 6.7M".

**Eyebrow · Filled** is the `frame` box with a solid ground instead of a stroke — same
geometry, so `modPx` reserves the same height for both and one branch draws both.
`PAL.eyeFill` / `PAL.eyeInk` invert with the palette: a cream chip with navy caps on the
dark canvas, a navy chip with warm caps on the light one. It keeps `r: 0`, which is what
separates it from the CTA's pill and 8px rect.

**Note this contradicts a binding rule.** "Kicker bars: hairline-framed or rule-flanked,
never solid fills (solid reads as a CTA)" is in the campaign rules above. The variant was
asked for explicitly and is built; the square corner and the neutral (never accent) fill
are what keep it from reading as a button. If the rule still stands, this is the variant
to drop.

### The price is the text you typed — there is no currency control

Two passes were built here and **both were removed on request**: a live-rate converter
(USD peg, fetched euro rate, editable rate row) and then a plain symbol picker
(AED / $ / €). The price block is once again `m.text`, verbatim. `normState` deletes any
`m.cur` / `v.cur` those passes left behind. If a currency control looks attractive again,
it has been tried twice — type the marker into the price field instead.

**The price figure is Regular 400, and the op was drawing 300.** The binding rules put the
price figure with the headers at Regular, and the preview had always drawn 400 — so the
export was the odd one out, and the glass panel was additionally *measured* at 300 while
rendering at 400. Both `meas` and both `text` ops are 400 now (Light in Arabic — see
`headW`). This is unrelated to the currency work and stands.

### The Arabic typeface — Readex Pro

A **Typeface** pair in the all-variants dock — English / Arabic, two `.p-opt` glyph tiles —
puts the **whole canvas** (every variant, all three sizes) in **Readex Pro**, which carries
Arabic as well as Latin. It is a typeface switch: it does not translate the copy and does not
flip the page layout to right-to-left (the runs themselves do resolve their own direction —
see `dirOf` below). It began as a single "Arabic — off / on" button with a translate icon;
see *The all-variants dock* for why that became two tiles.

**Only Light / Regular / Medium exist, and the FILE is what enforces that.** The bundled
subsets are Google's own variable woff2 cut to `font-weight: 300 500`, so the browser
clamps to that range in the DOM preview and on canvas alike — no call site can ask for a
weight outside it and get one in only one of the two paths.

Bundled **locally** in `fonts/`, like Google Sans Flex, so the studio still works offline
and from disk — three files, ~82KB. The arabic subset is a separate file selected by
`unicode-range`, which is why `ensureFont()` probes with Arabic text as well as Latin:
**a canvas draw never pulls a webfont**, only DOM use does, so every weight has to be
asked for explicitly or the first render measures and paints in the fallback. The shell
warms it at mount, so a project saved with Arabic on is correct on its opening frame.

`StudioBase.applyFont(state)` is **the one place the active face is published**, and it is
called at the top of both `buildOps`s and both `renderVals`s — before anything measures or
draws. Everything downstream reads `window.providentFont`, per the existing rule, so
`meas()`, all four renderers, both `canvasStyle`s and the thumbnail helper cannot name
different fonts. Two things had to follow:

- **`fontAsc()` is now keyed by the face.** It cached one ascent globally; the two faces
  genuinely differ (Google Sans Flex .97/.29, Readex Pro 1.00/.25), so a single cache would
  hand Readex's baselines the wrong ascent and put every preview run off its op.
- **The design-system sheet is pinned to the Latin stack**, not the published one — it
  documents Google Sans Flex and must stay in it even while the canvas is Arabic.

**Campaign only.** The mechanism is on `StudioBase`, so Organic can take it, but the control
was asked for on the all-variants dock and Organic's placement is template-owned.

#### Arabic is not Latin at the same numbers — `CampaignStudio.AR`

Four adjustments, all keyed off `isArabic()`, which reads the **published face**
(`window.providentFontFam`) rather than state — `applyFont()` runs before anything here is
asked, so it cannot disagree with what is being drawn.

**Latin is an exact identity on every one of these paths** — verified at all three sizes
and five scale settings: the eyebrow size, the tracking, the header weight and every gap
value come back untouched, and `tkFor` still returns the base token object itself at
scale 1. No saved campaign moves.

- **Eyebrow x1.3.** Measured at 100px: a Latin cap stands **72.8** tall, an Arabic letter
  body **46.1** — and an all-caps eyebrow shows Latin at its tallest, which is exactly why
  Arabic read as so much smaller in that one role. Matching cap height would be **1.58**
  and would send Arabic's tall stems (74.3) to 117, towering over the headline. 1.3 lifts
  the body to 60 and the stems to 96. Applied to `tk.eyebrow` in `tkFor`, so the whole
  tracked-caps ROLE follows — the eyebrow, the price's small label and the spec labels —
  and it still scales with the Scaling control (40.6px at 130%).
- **Tracking is dropped to zero, not reduced.** Tracking is a Latin device. Arabic is a
  joined script, so letter-spacing pulls the glyphs apart at the very points where they
  connect and a tracked run reads as a word broken into pieces. `trackOf(px)` is the one
  rule, replacing five `* .16` call sites and three `letterSpacing: '.16em'` preview
  styles — both halves, or the editor spaces a run the export joins.
- **Headers are Light.** The brand rules put the hero and the price figure at Regular, but
  Readex carries more weight than Google Sans Flex at the same value, so Regular reads as
  a slab. `headW(400)` covers the hero and the price figure in the ops AND in the preview.
  The process-step numeral stays at 400 — it is a badge digit, not a header.
- **Tight / Medium / Roomy open up.** An Arabic line's ink measured **1.37x** Latin's at
  the same size, so `GAPS` carries a second column: 1 / 1.5 / 2.1 becomes **1.3 / 1.95 /
  2.7**. Measured stack spans in Arabic: 349 / 396 / 450px.

**`gapScale` still stores the LATIN number, and that is deliberate.** It is the preset's
identity, so the buttons' `data-on` still matches, switching the font does not orphan the
selection, and Latin uses the stored value verbatim. `gapOf(v)` maps it to the Arabic
column by nearest preset.

#### Base direction: `StudioBase.dirOf()`

A canvas and a DOM box both default to an **LTR base direction**, and that is wrong for
Arabic. Proven by rendering the same string twice and comparing the images: an LTR base
and an RTL base give **different pixels** for `4.85 مليون درهم` (leads with a number) and
for `فلل من AED 2.6M في دبي` (embeds a Latin run). A string that both starts and ends in
Arabic is identical either way — which is exactly why this only shows up on some copy and
reads as intermittent.

`dirOf(text)` picks the base direction from the **first strong character**, the same rule
`dir="auto"` uses. Digits are not strong, so `4.85 مليون درهم` is RTL and `AED 2.6M` is
LTR. Applied in all four renderers per the parity contract, and mirrored in the preview:

- **Canvas**: `ctx.direction = dirOf(text)` with `ctx.textAlign` pinned to `'left'` — the
  default `'start'` means the RIGHT edge once direction is rtl, which would fling every
  Arabic run to the far side of its own x.
- **`providentFillText` must never run on an RTL run.** It advances glyph by glyph left to
  right, which would undo the bidi reordering completely. Arabic carries no tracking
  (`AR.track` is 0), so there is nothing for it to fall back *for*.
- **SVG** has no direction-independent `text-anchor: left` — start/middle/end are relative
  to the base direction, so under rtl `start` is the RIGHT edge. An RTL run is anchored at
  `end` and placed at `x + meas(run)`, which puts its left edge back exactly where the
  canvas draws it. Verified across 111 ops: every left edge within 0.6px, and
  `direction="rtl"` present on exactly the RTL runs and no others.
- **Preview**: `.p-plate *{unicode-bidi:plaintext}` — the CSS spelling of the same
  first-strong-character rule, so the editor orders a run identically without a direction
  on every style object. Safe because the content stack sets `text-align:left` / `center`,
  both physical; the direction-relative `start` would have flipped alignment.

#### Lists read RIGHT TO LEFT in Arabic — `listRtl()` and `seqAt()`

**This is a narrow, deliberate exception to "Arabic is a typeface switch, not a layout
flip."** Margins, alignment, the cluster stack and the canvas grid are still untouched. What
changed, by request: anything laid out as an **ordered sequence** reverses, because a list
running left to right in Arabic is not a style choice — it is the wrong order.

`CampaignStudio.listRtl()` is the switch (it just reads `isArabic()`, but naming the *scope*
is the point — do not reach for `isArabic()` in a list path). `seqAt(k, n)` maps content
index to display column and **is its own inverse**, which is what lets one helper serve both
halves: `buildOps` walks content and draws at `seqAt(i)`, the preview walks display columns
and pulls `seqAt(di)`. Get those out of step and the numbering disagrees with the order.

Six components, twelve edits — every one needed **both** the op and the preview:

| component | what reverses |
|---|---|
| bullet list | bullet moves to the right edge, copy right-aligns to meet it |
| process steps `icon`/`num` | column order — step 1 on the **right** |
| process steps `list` | circle to the right edge, label right-aligned beside it |
| tag chips (`mist`/`gold`/`icon`) | order within each wrapped row |
| tag strip (`rule`/`dot`/`plain`) | same, and the separator moves to the other edge |
| spec `row`/`boxrow` | column order, with each cell's own width travelling with it |

Spec `ladder`/`boxed` stack **vertically**, so they have no order to reverse and are
deliberately untouched.

**Five traps, each of which produces a wrong render rather than an error:**

- **The step connector cannot assume the next step is to the right.** It spans
  `Math.min/max(cx, cxN)` between the two columns now. In LTR that is arithmetically the
  old expression, so nothing moves.
- **In the preview, reorder the ARRAY; do not use `row-reverse`.** The connector positions
  itself from its own column's *left* edge, so reversing the flex direction points every one
  of them the wrong way. Reordering leaves all that geometry alone.
- **`row-reverse` makes `justify-content: flex-start` pack to the RIGHT**, which silently
  moves a left-aligned cluster to the other margin. Every reversed wrapping row needs
  `flex-end` instead. On a *wrapping* flex, `row-reverse` reverses within each line, which is
  exactly what the ops do — the lines keep the same membership.
- **A separator belongs BETWEEN two items, and reversing changes which edge that is.** Under
  `row-reverse` DOM item *i* sits immediately left of *i-1*, so the boundary it owns is its
  **right** edge; keeping `borderLeft` draws one stray rule at the far edge of the block and
  misses the innermost boundary entirely. The spec column's rule and indent go the other way
  — they belong to display columns > 0, so the condition becomes `i < n - 1`, not a flipped
  side, because the indent has to stay on the same side as the rule.
- **A chip's icon is keyed by its position in the WHOLE list**, so capture the global index
  *before* reversing. A plain running counter hands every chip its neighbour's icon.

**Numbering and within-run bidi need nothing.** The badge stays `i + 1` and the label stays
`(i+1) + '. ' + t`; `dirOf` already resolves the run's own base direction from its first
strong character, so `1. اختر` renders with the numeral on the right on both surfaces. Latin
digits are kept deliberately — Gulf Arabic uses them.

**Verified preview against export, not just preview.** The step labels are three different
lengths, so matching ink *widths* per column is what proves the content order agrees rather
than merely the geometry: export blocks `0.0746–0.2793 / 0.3591–0.5135 / 0.6435–0.8185`
against a preview of `0.0741–0.2803 / 0.3581–0.5136 / 0.642–0.819` — ≤0.0015 of canvas
width, with step 1's longer label rightmost in both. The bullet lands at `0.9048–0.9266`
exported against `0.9047–0.9259` in the preview, on the right margin. Read the export by
opening the placement Preview and measuring the ink columns of its `.mk-screen img`: that
bitmap comes from `buildOps` → `renderOpsToCanvas`, so it *is* the export.

**And prove Latin did not move.** Every branch is `rtl ? … : <the original expression>` and
`seqAt` is the identity when off, so Latin is unchanged by construction — but it was measured
anyway, the same way the CSS token pass was: capture a per-node signature (canvas-fraction
box, flex-direction, text-align, justify-content, text) in DOM order from the pre-change file
and the new one on identical Latin input, and diff. **98 nodes, 0 differences.**

#### The hero drew one op PER WORD, which reversed every Arabic headline

Exposed by this feature and worth remembering as a class of bug. `buildOps` walked
`ln.parts` and pushed a text op per word at an advancing `x`. For Latin that is the same
pixels as the joined line; in Arabic the run has to lay out right-to-left, so the sentence
came out backwards — while the DOM preview, which always drew the joined line, was correct.
The export was the half that disagreed.

A line is now **one op** with its parts joined, which is what every other component here
already did (`l.parts.map(p => p.t).join(' ')` appears in the list and spec paths). Verified
the joined width matches the old sum-of-parts width on every line, size and alignment, so
**no existing Latin design moves**.

`heroLines` also stopped splitting a segment on `m.serif`. The brand rules removed the
second typeface, so all three runs already carried the same style — the split had no visual
effect and could only do harm: a legacy `serif` value landing mid-word made `wrapRuns` treat
the halves as two words, which inserts a space inside the word when the line is rejoined.

### The co-brand lockup — `provident.` | partner

A campaign run with a developer prints both marks: the wordmark, a hairline divider, then
the partner's logo. `state.colog = { on, scale, tint }` is **project level**, beside the QR
in the all-variants dock, because co-branding is a fact about the campaign rather than
about one variant — one upload (`adstudio-colog`) serves every variant and all three
canvases.

**Proportional means "a multiple of `tk.logo`", nothing else.** `StudioBase.CO` holds the
whole geometry as ratios — gap `.52`, divider `.055` × `1.02`, partner ink height `.78`,
lockup centre `.30` above the wordmark baseline — so the partner tracks the wordmark across
1:1 / 9:16 / 16:9 *and* across the Scaling control with no second set of numbers. Verified:
the ink-height-to-`tk.logo` ratio is 0.78 on all three canvases and still 0.78 at 130%
Scaling. The Size slider (60–160%) multiplies that one number.

**The lockup is laid out from the art's INK box, not the file box.** This is what makes an
arbitrary upload line up: brand sheets are routinely padded — the supplied SOBHA artwork is
a 2000×340 canvas with the mark in the right third — and scaling by the file box would put
the mark far from the divider at a fraction of the height asked for, with a wide
transparent gap nobody can see or crop. `StudioBase.inkBox()` alpha-scans a 240px copy,
caches per URL, and returns the bounds normalised plus the ink's true aspect.

No renderer has a source-rect op, so `coBox()` returns `dw/dh` (the box the **whole** file
is drawn at) and `ox/oy` (where its ink starts inside that box). The art is drawn entire and
its transparent surround simply hangs outside the ink box. Measured on the padded SOBHA
file: ink `x .596, w .325`, so a 92.8×32 ink box is produced by drawing the file at
285.7×48.6 offset −170.2, −10.7.

**Two things the preview has to do differently, and why:**

- The divider and the mark are **absolutely positioned**, not flex items. The ops centre
  them on the wordmark's *baseline*; a flex row can only centre on the line box, whose
  half-leading is a font metric the code cannot know. The logo div's top edge IS the
  frame's padding edge, so the baseline sits a known `.8` of `tk.logo` below it (or
  `1.3 - .35` when the wordmark is at the bottom). Verified sub-pixel (≤0.1px) against the
  ops for top/bottom × left/centre.
- The div takes an **explicit `width`** equal to the lockup when co-branding is on —
  otherwise `alignSelf:center` would centre the wordmark alone rather than the whole
  lockup, and the ops' `(W - total) / 2` would not agree.

**`coOn` must NOT be gated on the measured ink.** The tick measures the ink off the canvas
slot, and the canvas slot only mounts when `coOn` — gating on it deadlocked the lockup into
never appearing unless the dock happened to be open with its own copy of the slot.
`coBox()` falls back to a square until the measurement lands one frame later. The export
never sees this: `loadAssets` measures directly.

The partner honours the same tint control as a graphic (default **Match canvas**), so one
white SVG reads on both palettes.

**Campaign only.** Organic prints the same wordmark through a single `drawLogo(align, pos)`
helper and could take this, but its placement is template-owned and differs per slide kind,
so it needs a per-kind collision check before it can be trusted.

### Uploaded SVGs and icon tinting

**An uploaded SVG that "doesn't appear" is almost always the right bytes in the wrong
colour.** The encode, the store and the export were all verified correct: a brand-kit
icon is `stroke="#1A2942"`, and navy on a navy canvas is invisible. The fix is a flat
tint, not a change to the upload path.

The `image` op takes `tintFlat: '<colour>'` — the art is drawn, then `source-in` fills it
with one ink, keeping its own alpha so a stroked icon stays stroked. Canvas does that on
an offscreen buffer; SVG uses a `mask-type:alpha` mask over a filled rect. Added to **all
four renderers** per the parity contract. Step icons and icon chips always tint to the
palette. `graphic` tints **by default** (`m.tintIcon !== false`), with a *Colour* control
in the component column — **Match canvas** / **Original** — because a multi-colour logo is
sometimes meant to keep its own colours. Default on, since a brand-kit SVG is navy and
navy on a navy canvas is invisible; explicit `false` is the opt-out.

**The canvas tint buffer is the VISIBLE region, never the whole drawn box.** It used to be
`o.w × o.h × scale`, and for the co-brand partner `o.w` is the whole **FILE** box (`tw /
ink.w`) — a mark in the corner of a big brand sheet asks for a buffer a hundred times the
canvas wide. Chrome does not throw on an over-large canvas, it hands back a blank one, so
the art exported **blank** while the preview — a CSS mask sized to the on-screen box — looked
right. Both `renderOpsToCanvas`es now clip the box to the canvas and draw through a **source
rect**, which bounds the buffer by the canvas by construction. Verified identical output at
every padding the old path could handle (ink 35% / 10% / 3% / 1% of the file) and 9× less
memory at 3%; the old buffer at 0.4% came to 97000 × 16490 and painted nothing.

Worth knowing before chasing this one: by the padding that overflows the buffer, `inkBox`'s
240px sampling can no longer resolve the mark either — it measured w 0.0083 for a true 0.006 —
so the mark is mis-sized in the **canvas too** at that point. The buffer fix is hardening; a
mark that small is a measurement problem, not a renderer one, and it shows in both paths.

The **preview** tints without a second copy of the bytes: the wrapper carries
`data-icon-tint="<ink>"` and holds a sibling `<i data-icon-paint>`. The existing rAF tick
reads the URL straight off the slot's shadow `img`, sets it as a `mask-image` on the paint
layer, fills that with the ink and drops the slot to `opacity:0` — so the slot stays the
drop target while the painted layer is what you see, and it re-inks itself when light/dark
flips.

**An EMPTY `data-icon-tint` still matches `[data-icon-tint]`.** That one selector fact was
a guaranteed preview/export mismatch for every uploaded graphic: `gTint` was `''` whenever
tinting was off, the tick's `getAttribute(...) || '#fff'` fell through to the fallback, and
the preview painted the art **white** while the export drew the file's own colours. There
was also no control for `tintIcon`, so it was *always* undefined and the two paths *always*
disagreed. Now no ink means no paint — and the tick must put `slot.style.opacity` back to
`1`, or a previously tinted graphic stays at 0 and vanishes when tinting is turned off.

Verified across both states and both palettes: on → op `tintFlat` set, exported pixels the
canvas ink (`#fff` on dark, `#1A2942` on light), SVG export carries the masked tint rect,
preview paint layer on; off → no `tintFlat`, exported pixels the file's own colour, paint
layer off and the slot visible.

**Check with a screenshot before diagnosing this.** The paint layer is applied from the rAF
tick, which does not fire while the browser pane is not compositing — the tint reads as
"not working" and the cached `paint._ink` sits at its last value. That trap cost real time
here twice.

**`file.type` alone is not enough to accept an SVG.** An `.svg` dragged out of Finder,
Figma or another tab often arrives with an **empty** type, and matching only the MIME list
rejected it while the placeholder promised "Drop SVG". `image-slot.js` now falls back to
the extension, and the error message names SVG.

**A graphic can FLOAT**, and floating is **per variant** — `v.gfloat[id]` and
`v.gpos[id] = {x, y}`, on the variant beside `clusters`, and read through `eff` so a
**detached size keeps its own placement too**. "Where this sits" is exactly what a variant
is for; the module still owns only the art and its scale.

It began on the module (`m.float` / `m.fx` / `m.fy`), which linked every variant to the
master's placement. `normState` lifts any of those onto every variant and deletes them, so
a project saved by that build opens where it was.

**Scale follows Edit separately.** An unlinked size (`v.story` / `v.wideOv`) keeps its own
`gscale` / `gaspect`, keyed by component id beside its clusters; everything still linked
reads the module's scalar `m.gscale`. `CampaignStudio.gScaleOf(ov, m)` is the one reader,
where `ov` is `sizeOv(variant, sizeKey)` — the override, or **null** while linked — and
`graphicW` / `graphicH` / `floatBox` / `modPx` / `scrimStops` all take it. The corner drag
writes to whichever of the two that canvas reads.

This is deliberately **not** per variant, unlike placement. A variant exists to move things,
so `gfloat`/`gpos` live on `eff`; the art's *size* is a property of the art, and making it
per variant would silently stop a Master resize from reaching the variants still linked to
it. Absent a per-size record the module value is used, so **a project saved before this
renders identically** until a corner is dragged on an unlinked size — verified.

**`scrimStops` needed the record too.** It sizes the wash from the cluster heights, so it
calls `modPx`; without the extra argument a detached story's scrim ignored its own graphic
scale — and because its `clusterH` sits in a *different method* from `buildOps`, referencing
the local `gov` there threw `gov is not defined` and white-screened the editor. Anything
that measures the stack has to be handed the same record.

The position is a **fraction of the canvas**, so one value is right on 1:1, 9:16 and 16:9
alike rather than needing three. Drag the art on the canvas to move it; the corner handles
still scale it. The panel's controls read `selEff` and write through `setSelTarget`, which
resolves the SELECTED canvas's record — so dragging on Variant 2 cannot move the Master.

`CampaignStudio.isFloatG(eff, m)` is the one test, and a floater has to be **filtered out of
the clusters everywhere** — `buildOps`' top/bot, the preview's top/bot, and the list
`scrimStops` sizes the wash from. Giving it a height of 0 instead is not enough: a
zero-height member still takes the gap after it and leaves a hole in the stack.

Floaters are drawn **last**, so they sit over the clusters — that is what makes them free.
In the preview the wrap becomes `position:absolute` with plain canvas coordinates, which
works because an abspos child resolves against the FRAME's padding box and the frame is
`inset:0` — its padding box IS the canvas.

**The drag needs no zoom maths.** The fraction delta is the CSS-pixel delta over the
canvas's on-screen size (`data-cwpx`, and that × H/W for the vertical), so moving the
pointer across half the canvas moves `fx` by exactly .5 at any preview size. Verified: a
drag of ¼ canvas right and ⅛ down took .5/.5 to exactly .75/.625, and the op and preview
centres agree to the pixel. Verified per variant too: Master at .20/.20 and Variant 2 at
.80/.80 at once; one variant floating while another keeps the same graphic in its stack;
a detached 9:16 at .85/.12 while its 1:1 stays at .20/.20; and a drag on Variant 2 leaving
the Master untouched.

**Graphic scaling is proportional by construction.** `m.gscale` is the fraction of the
content column the art spans and height comes from the art's own aspect, so a corner drag
cannot distort it. Handles appear only on the selected graphic. `m.gaspect` is written by
the same drag that writes `gscale`, which is what lets `modPx` (no asset in hand) and
`buildOps` (asset in hand) agree on the reserved height. Absent both, it falls back to the
s/m/l height presets — exactly how sessions saved before this already look.

### Material Symbols icon picker

Step icons are chosen from Google's Material Symbols at the brand's settings —
**weight 200, grade 0, optical size 24**. Grade 0 and opsz 24 are the *defaults*, so only
the weight is named in the URL:

```
https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/<name>/wght200/24px.svg
```

Those SVGs come back with `access-control-allow-origin: *` and carry **no `fill`
attribute**, which is why `tintFlat` recolours them cleanly to the canvas ink — one icon
reads on both light and dark.

**Google's icon-name catalogue cannot be read from a browser.**
`fonts.google.com/metadata/icons` answers 200 to curl but sends no CORS header, so a
`fetch` fails outright. Search therefore runs against `CampaignStudio.ICONS`, a bundled
index of 276 names (every one verified to resolve at wght200 — `apartment_outlined`,
`bolt_outlined` and `threed_rotation` do **not** exist and were dropped), and a free-text
field covers anything else on fonts.google.com/icons. A wrong name reports its HTTP
status rather than failing silently.

The chosen SVG is applied through the slot's own `_ingest(File)`, never by writing the
sidecar directly: `image-slot.js` holds an in-memory copy of the whole store and its next
save would clobber anything written behind its back. For the same reason clearing goes
through a new **public `clearSlot()`** on the element — it previously exposed only Replace
and Edit, with no supported way to empty a slot.

The picker serves **every component with icon slots** — process steps, and Tag chips in
its `icon` treatment — keyed off `selIconsOn`. One field does both jobs: it filters the
bundled index as you type, and Enter applies whatever is in it as an exact name, so no
second field is needed.

Picker state (`_iconStep`, `_iconQuery`) lives on the **instance** with `forceUpdate()`,
not in `state`: it is throwaway UI and has no business in the saved project or the undo
stack.

**Order matters in the preview's else-if chain.** A generic `} else if (m.type === 'tags')`
branch sat ahead of the strip/icon branch and swallowed both, so their `prows` were never
built, no icon slots mounted, and the picker reported "Chip N is not on screen." Any
variant that needs its own preview branch must be excluded from the generic one —
`!isStrip(mv) && mv !== 'icon'`.

### Process-step plates

Plates are **glass, not solid**: a `blur` op then a translucent fill and a hairline ring,
which is the mirror read and works on both palettes because `glassFill`/`glassStroke` are
per-mode. The blur op MUST precede the `rrect` and share its geometry — that is the only
way an export reproduces `backdrop-filter`. `icon` puts an uploadable SVG at the centre
with the numeral on a corner badge; `num` centres the numeral instead and shows no badge.

The column grid is **the same width in every alignment** — the spread is what makes the run
read as a process, so shrinking it for a left-aligned canvas was wrong. Alignment only
moves the plate and its label *within* each column: centred in it, or flush to its left
edge, with the label's `text-align` following. `stepBox()` takes `center` and returns
`centre`; the connector starts at `colW/2` when centred and `d/2` when left.
The empty plate's slot placeholder is a single space: "SVG" word-wrapped to "or" on its own
line inside a 150px circle and read as a glitch.

### The eyebrow WRAPS

A long eyebrow was drawn as one unbroken run and ran off both canvas edges in the export
— "MODERN TOWNHOUSES WITH WORLD-CLASS SPORTS FACILITIES" was clipped at both sides on a
9:16 — while the preview wrapped it perfectly. **CSS wraps a span; a text op does not.**
That is the general trap: any run the preview lets flow has to be wrapped explicitly in
`buildOps`, or the editor and the export disagree the moment the copy gets long.

`eyebrowLines()` is the single wrapper. It cannot borrow `wrapText()`, which measures at
weight 300 with no tracking — the eyebrow is **500 at .16em**, so `wrapText` would break at
the wrong word. `eyebrowWidth()` gives it the right column per variant: `innerW`, minus the
frame's padding, or minus the rule flanks (both flanks only when centred).

`eyebrowH()` is what `modPx` returns, so the reserved height, the cluster stack and the
scrim all follow the real line count. **The first line keeps the 1.2 it always had** and
only later lines advance by `EYE_LEAD` (1.3, the preview's own inherited line-height) —
that way no existing single-line design moves by a pixel. Verified: a short eyebrow is
still one line at 29px.

All three variants place every line, centred per line on a centred canvas; `frame` sizes
its box to the widest line and `rule` flanks the block at its vertical middle.

Verified against the preview with `Range.getClientRects()` (one rect per rendered line):
same line count, same break words, each line's x and width within **1.3px of 1080**. All
three variants × both alignments × all three canvases stay inside the canvas.

### Eyebrow rule

Flanked on **both** sides only when the eyebrow is centred. Left-aligned, the trailing
rule dangles into the image window, so it is dropped.

**Both halves have to be changed.** The first attempt fixed only `buildOps` and computed a
`ruleEndStyle` for the preview that was never wired into the markup — the two `<span>`s
both still read `{{ m.ruleStyle }}`, so the canvas kept showing two rules and the fix
looked like it had not happened. The trailing span reads `ruleEndStyle` now. Any
per-side change to a component drawn from a repeated pair of nodes needs the markup
touched too, in **all three size canvases**.

### Panel photo previews

Organic's QR slots followed Campaign's lesson late: they were a fixed `height:96px` box for a
code that is **square** on the canvas, so the panel framed it as a letterbox. Both are
`aspect-ratio:1/1` now. The background slot was already `3/4`, matching the feed frame.

The sidebar photo slots take the **aspect ratio of the canvas they feed** — `1/1`, `9/16`,
`16/9` via `bgSlotStyle` / `bgSlotStStyle` / `bgSlotLsStyle`. They were a fixed
`height:88px` box, which framed a 9:16 photo as a letterbox and so lied about the crop the
canvas would take.

**Campaign's QR slot is a SQUARE sized by its neighbour, not by a height.** In the
all-variants dock the group is one row: the drop zone on the left, and a column on the
right holding the Visible/Hidden toggle above the Left/Right corner tiles. The slot carries
no size of its own — `align-self:stretch` takes the row's height (toggle + gap + tiles) and
`aspect-ratio:1/1` derives the width from it, so it spans the whole column at any rail
width. A fixed height could only ever match one of the two things beside it.

`maxWidth:40%` is the escape hatch, and it is load-bearing: on a cramped rail the toggle
label wraps to two lines, which makes the column taller, which makes the square wider,
which narrows the column further. The cap breaks that loop — the height still matches, the
square just stops eating the row. Measured at 1680px: slot 112×112, toggle 225×31 above
tiles 225×75, slot top = toggle top and slot bottom = tiles bottom, slot 32% of the row.

### Rail rows that hold a name plus buttons

`.p-hid` stacks the component name over its Show/Delete pair. As one `.p-row-c` with
`flex:1` on the label, a name like "Bullet list · Fully furnished ap" wrapped to three
lines beside the buttons and read as three cramped columns. At rail width, name-over-
buttons is the only layout that survives a long name.

### Data-panel padding and the label/value gap

`BOX_PAD` is 30, giving a 60px inset from the box edge to the copy at 1080, `padV` 18 in a
panel, and the gap between a tracked-caps label and its value scales off the label
(`labPx * .62`, or `* .85` under a large figure) rather than a flat 5px. A fixed 5px was
about one pixel at editor zoom, so the pair read as a single word. The preview reads the
gap back out of `specBox()` instead of hardcoding `0.5cqw`, so it cannot drift from the
export.

Worth knowing when panel padding looks unapplied: it is in **canvas** units, so at the
editor's preview zoom (~0.24 of 1080) 30px renders as ~7px on screen. Measure the ops or
the export before concluding it is missing — 22px was already being applied when it was
first reported as absent.

### A centred design centres the copy INSIDE its panel, too

The spec fix below was only half the family. The **glass price block** had exactly the same
bug and shipped in real ads: the panel was centred (`bx = (W - bw) / 2`) but both runs were
drawn at `bx + 30`, so a centred campaign exported a left-aligned label and figure inside a
centred box. The preview looked right the whole time, because the content stack sets
`text-align:center` and the runs inherit it — which is precisely why it went unnoticed.

Whenever a component draws a box and then places copy in it, the copy needs its own
`center` branch. The box being centred is not enough.

### Spec panels: edge to edge, or hugging their content

Two columns of data in a full-width panel reads as a mistake. `m.hug` is a **module** field
like `big` and `figTop` — it describes the data, not a design variant, so it is linked
across variants — and `specBox()` now returns the panel's width `w`:

- **off** — `innerW`, the full content column, as before
- **on** — sized so every column fits the WIDEST cell, then aligned with the design
  (centred or flush left), clamped to `innerW`

**The columns are EQUAL** — `colW` is `inner / n` — so the width has to come from the
widest cell times `n`, not from the sum of the individual widths. Summing let the narrow
columns steal room from the wide one: the panel came out just short, and the preview wrapped
a label onto a second line that the export drew on one. A column after the first also gives
`colGap` away to its indent, so that sits inside the column width too, and `slack`
(1.1 × the label size) keeps the copy off the panel edge and the hairlines.

If the content genuinely needs more than the column, the width clamps to `innerW` and the
panel is edge to edge again — which is the right answer, not an overflow.

### A HUGGING row sizes each column to its own cell

Equal columns are right **edge to edge** — the panel spans the text column and regular
divisions read as deliberate. They are wrong when hugging: forcing every column to the
WIDEST cell padded the narrow ones out, and a two-column `boxrow` measured **148px of dead
air at the panel's right against 60 at its left**. Hugging means "as wide as the data".

`specBox` now returns **`colWs`**, the per-cell widths, for a hugging row — and `null`
everywhere else, which is the signal to keep the equal-column path. The row branch reads
it: each column takes its own width and the hairline sits **midway in the gap**, so there
is `colGap` of air on both sides of every rule and `2 * pad` at both ends of the panel.
Measured on two and three columns: left inset 60, right inset 60, 28 before each rule and
28 after.

If the content genuinely needs more than the column the natural width is over `innerW`, so
it clamps and **falls back to equal columns** — still the right answer for an overflowing
panel rather than a spill. Verified at 1:1 and 9:16.

### A preview border cannot mirror a canvas op — use `box-shadow`

Chrome floors a visible border at **one device pixel**, and inside the zoomed preview box
that is ~2.45 CANVAS units however thin it is declared (`cq(.5)` computes back to 2.45).
On a `box-sizing: border-box` column that thickness comes out of the padding and shifts the
copy, and the error compounds across columns — the third column's runs sat **5 units** off
their ops.

`box-shadow` never participates in layout, so the panel ring is
`inset 0 0 0 cq(1.5)` and the column rule `inset cq(.5) 0 0 0` — both still visible, and
the copy lands where the op draws it. Drift fell from 5 units to **0.1** with hug on and
from 2.9 to 0.4 with it off. Any preview edge that mirrors an op's stroke should be a
shadow, not a border, for the same reason.

**A spec run is a single text op and cannot wrap, so the preview is `white-space:nowrap`.**
Left to flow, CSS broke labels where the ops never would.

`specBox` takes `meas` and `innerW` as extra arguments to do this. Both `buildOps` and the
preview pass the SAME expression for `innerW` — `(tk.col && !center) ? tk.col : W - pL - pR`
— or a hugging panel measures one width in the editor and another in the export.

**The preview needs AUTO MARGINS, not `alignSelf`.** The spec wrap is `alignSelf:stretch`
(it has to be, so an edge-to-edge panel fills the column), which makes the panel a
block-level child — `alignSelf` on it does nothing and the panel stayed hard left while the
export centred it. `margin-left/right:auto` is what centres a block of known width.

Verified: ops and preview agree to the pixel on panel x and width for hug/wide x
left/centre, and all four spec variants render at all three canvases in both modes.

### A centred spec centres PER COLUMN, and the columns are equal on the outside

`row` / `boxrow` exported flush left under a centred design while the preview showed the
copy centred — off by most of a half-column (measured 70–85px at 1080). Two separate
causes, and both halves had to be fixed:

- **The ops had no `center` branch at all.** Every run was drawn from its column's left
  edge. The preview centres because the content stack sets `text-align:center` and each
  column is its own box, so `pair()` now takes the column's left edge *and* its width and
  centres each run inside it — for the stacked `ladder`/`boxed` layouts too, which centre
  across the panel's inner width.
- **`flex: 1 1 0` does not give equal columns when they carry a border and padding.** The
  indent and hairline come out of the SHARED free space, so every *content* box ends up
  the same width and the hairlines land unevenly — 247.7 / 276.2 / 276.2 against the
  export's even 266.7 each. The preview columns are `flex:none; width:calc(100%/n);
  box-sizing:border-box`, which is equal **outer** columns with the indent inside, exactly
  what the ops lay out.

`specBox().colGap` (28) is the inter-column indent, read by both sides — the preview had
it as a separate `3.4cqw`, ~9px wider, so even the left-aligned case was slightly out.
Verified: ops and preview agree within 1–3px of 1080 in both alignments, all four spec
variants, all three canvases.

### The studio's own reloads are not "unsaved work"

Swapping projects — opening a recent, picking a template, starting a new campaign, loading
a session file — is implemented as a `location.reload()` after writing localStorage. Every
one of those raised Chrome's *"Reload site? Changes you made may not be saved"* over an
action the user had just chosen.

All of them route through `StudioBase.reloadNow()`, which sets the static
`StudioBase.reloading` flag and calls `markSaved()` before navigating; the shell's
`beforeunload` handler returns early while that flag is set. **Add no new
`location.reload()` call sites** — use `reloadNow()`, or the prompt comes back.

### Floating component control

Order, cluster, hide and delete are a pill pinned over the selected component, not rail
buttons. It lives in **`.p-body`, not in the canvas**: the canvas is `overflow:hidden`, so
a control anchored above a top-cluster component would be clipped away entirely. The rAF
tick pins it in stage coordinates to whichever `.modwrap` carries `data-selmod="1"`, and
flips it below the component when there is no room above.

Two traps: an element that is `display:none` has a **null `offsetParent`**, so the control
could never place itself while hidden — read `parentElement` instead. And `requestAnimation
Frame` does not fire in a hidden pane, so anything driven by that tick looks dead when the
browser view is not rendering; check with a screenshot before diagnosing the code.

### The canvas drag grips are CHROME, not artwork

The `.modhandle` (`⠿`, per component) and the spacer's `↕ drag` (`shStyle`) both read
`pal.ruleGold` with a hardcoded `color:'#1A2942'`. So the chip flipped with the **canvas**
palette while its ink did not, and the resting fade was applied to a cream chip. Measured
across both chrome themes × both canvas palettes, compositing ancestor opacity:

| | old | new |
|---|---|---|
| grip on the dark canvas | chip 17.06:1, glyph 11.85 | chip 4.07, glyph 5.17 |
| grip on the **light** canvas | chip 9.36, glyph **1.56** | chip 5.17, glyph 5.17 |
| spacer at rest, dark canvas | chip 3.78, glyph **1.56** | chip 2.92, glyph 5.31 |
| spacer at rest, **light** canvas | chip **1.10**, glyph 2.62 | chip 3.47, glyph 2.81 |

**The chrome theme is irrelevant to all sixteen numbers** — only the canvas palette moves
them, which is the proof the grips were canvas-driven. `--ps-accent` is `#487194` in *both*
themes, so one value covers everything, and it reads on both grounds (4.07:1 on black,
5.17:1 on white) with white ink at 5.17.

**They are chrome, and the neighbours already said so.** The report guessed canvas-adjacent
artwork, and three things say otherwise: the dashed selection outline on `wrapStyle` is
`rgba(78,122,158,.95)`, the chrome blue; `.p-selctl` is `var(--ps-cream)` / `var(--ps-blue)`
throughout; and the palette's own spacer tile already paints `↕ draggable gap` in
`var(--ps-accent)`. Inside the spacer branch itself, `tStyle`'s selected wash was
`rgba(78,122,158,.08)` on the line above — only the grip disagreed. The grip, the marquee
and the toolbar are one selection affordance and now read as one thing.

**Nothing here is mirrored by an op, which is what made it safe.** `⠿` and `↕ drag` appear
only in the three preview markup blocks; no `ops.push` draws either, so neither reaches an
export. Verified after the change: all **7** `pal.ruleGold` op call sites byte-identical.

**The resting fade moved .45 → .8, and that is the half the audit actually caught.**
Quietness expressed as element opacity does not survive a *ground* flip any more than a
theme flip: cream at 45% over the light canvas composites to near-white — **1.10:1**, the
invisible grip in the report. It is the only thing saying the gap is draggable, so it has
to read at rest. The one number that drops is the chip on the dark canvas (3.78 → 2.92),
because the accent is a mid-tone where cream was near-white — but that bright old blob
carried a 1.56:1 label, so the affordance is ahead on every ground.

**Measure this class of bug, never look at it.** The `.modhandle`'s `opacity` transition is
stuck at 0 whenever the browser pane is not compositing (the documented running-transition
trap), so the grip reads as absent and `getComputedStyle` contradicts the inline
`opacity:1`. Force it visible for a screenshot and composite the alpha arithmetically.

### The design-system sheet

**Design system** in the top bar (Campaign only, beside Preview) opens a scrolling
document and offers it as a PDF. Five pages: cover, Typography, Colour, Canvas/margins/
rhythm, Layout guard rails.

**It is laid out on the brand guideline's own page and in its own grammar.** The guideline
is **841.92 x 474pt, 16:9 landscape** — the spec sheet matches it exactly, because an A4
portrait version cropped its own content and read as a different document. The grammar is
the guideline's too: a tracked-caps eyebrow over a Light title, orange tracked-caps
sub-heads, columns of label/value rows each closed by a hairline, and a navy divider page
for the cover. Orange (#F3793C) is correct here and only here — these pages are a light
ground, which is the one place the brand rules allow it.

**Every number on it is read from the engine's own constants** — `PXT` for the canvases,
margins, QR box, base gap and wordmark size; `PAL` for both palettes, swatch by swatch;
`SCALE_MIN`/`SCALE_MAX` for the scaling range; and the type scale is *computed* from the
ratio and the floor (`specScale()` walks 2.2cqw × 1.2⁹) rather than a copied list. A
hand-typed spec is wrong the first time anyone changes a constant, so nothing here is
hand-typed except the prose.

It is drawn with plain canvas 2D in the studio's own font (`window.providentFont`) and
`providentFillText` for the tracked caps, on the brand's warm ground with navy ink — the
light-palette relationship, so it prints. Pages go through the SAME `StudioBase.buildPdf`
the exports use, so there is one PDF writer.

**Nothing may be positioned by a hand-counted y.** The first pass was, and three things
cropped: a fixed-height canvas row (three canvases are 3.34 aspect-widths together and ran
past the margin), captions under a 76px-wide 9:16 column, and `fillText`, which does not
wrap — it just overruns the sheet. The page api now carries a **column cursor** (`col(x,w)`
with `.sub` / `.row` / `.note`) so rows stack themselves, a `wrap()` that returns the height
it used, and a canvas row fitted to the band from the summed aspect.

Verified: `%PDF-1.4`, 5 page objects, `/MediaBox [0 0 841.92 474]`, five image XObjects at
1684×948 each starting `FFD8` and ending `FFD9` with `/Length` matching the stream exactly,
`startxref` resolving and every offset landing on a real `N 0 obj` — and then parsed and
rendered back with **pdf.js**, which is the check that actually proves a PDF engine can
read it. The browser's own plugin renders blank in an embedded frame; that is not evidence
of a bad file.

### Placement preview

A **Preview** button in the top bar opens a full-screen mockup: an iPhone 17 Pro frame
(402 × 874 pt, Dynamic Island) with Instagram / Facebook × Feed / Reels / Story, plus
toggles for the platform UI and the brand's safe margins. **Both engines still implement
their half of it** — Campaign maps feed→`sq`, reel/story→`st`; Organic maps feed→`ft`,
reel/story→`st` — but only Campaign's document carries the button and the overlay, so it is
reachable there alone. Via
`mockPlan()`.

**The creative inside is the real export.** Each placement is `buildOps` →
`renderOpsToCanvas` at `mockScale()` (0.72, so 1080 → ~780px, 2× the on-screen width) →
data URL. Anything else — re-deriving the design in DOM for the mockup — would have been a
**third renderer to keep in parity**, and the whole value of the preview is that it shows
what actually ships.

**Re-render is keyed, not continuous.** The shell's `componentDidUpdate` calls
`mockSync()` whenever the overlay is open; `mockSync` compares `mockKey()` (the stripped
state plus the active variant/slide) and returns early when nothing changed, so it cannot
loop through `forceUpdate`. Measured: **0 renders while idle, exactly 1 per edit.** Reel
and story share one 9:16 render — `mockRenderAll` dedupes by size key.

**Everything inside the screen is sized in `cqw`**, with `container-type:inline-size` on
`.mk-screen`. In fixed px the overlay collided with itself the moment the frame scaled
down (the reel's right rail ran into its own caption), and the frame has to be free to
scale with the viewport.

The chrome is **deliberately a wireframe** — grey blocks and plain labels, no Meta
branding or logos — so it reads as a mockup rather than an imitation.

**The frame is derived, not eyeballed.** iPhone 17 Pro is 402 × 874 pt of display
(2622 × 1206 @3x) in a 71.9 × 149.6 mm body. Working the display's physical size back from
the 6.3" diagonal gives a ~14 pt bezel, so the body is 429.8 × 901.8 pt (aspect 0.4766),
the display corner is 62 pt (15.42% / 7.09%) and the body corner 79.7 pt (17.66% / 8.42%).
The Dynamic Island is 125 × 36.7 pt, 11 pt down — measured back out of the DOM as exactly
that. The body is one aspect box with the screen inset `1.54% 3.24%`; an earlier version
used `box-shadow` rings, which cannot express a bezel that differs horizontally from
vertically.

Platform chrome is **per platform, not one shared layout** — Instagram puts its primary
text *below* the media with a full-width CTA strip above the action row; Facebook puts it
*above* the media with a link card and labelled Like/Comment/Share beneath. Icons are
generic stroke glyphs drawn as inline SVG paths (heart, bubble, plane, bookmark, house,
reels, cart…), never Meta's logo art.

**Truly actual FB/IG chrome is only available from Meta.** The Marketing API's
`/act_<id>/generatepreviews` returns an iframe of the genuine placement preview, which is
the one accurate route — it needs an ad account, an `ads_management` token and the creative
uploaded via `/act_<id>/adimages` first. Bundling screenshots of the apps instead would
mean shipping Meta's copyrighted UI and trademarks, and would go stale every release.

**A STORY is fit to width and letterboxed, not cropped.** This was wrong in the first pass
(`object-fit:cover`, which fills the height and crops the sides). Measured off a real ad
screenshot: the media is 920 × 1635 in a 920-wide screen — **0.5627 against 9:16's 0.5625**.
So on a 402 × 874 pt display the creative is 402 × 714.7 pt with **43 pt of black above and
116 pt below**, and that bottom band holds the caption row, the tab bar and the home
indicator. The vertical budget sums to 873.9 of 874. Verified back out of the DOM at
43.3 / 714.7 / 116.2.

That also means the platform UI overlays the media's own lower third rather than sitting
beside it — so copy on the bottom margin can still be covered even though nothing is
cropped. Turn on Safe margins to see it.

> **A REEL is not letterboxed** — that model was retraced against live ads and found wrong
> for this placement. See *The 9:16 margins ARE the Reels safe area* below. `.mk-media-f`
> gives the reel `flex:1` instead of `aspect-ratio:9/16`, `.mk-screen[data-full]` floats the
> status bar over it, and the caption row moved INSIDE `.mk-vbot` so the whole
> account/caption/CTA stack grows upward from the tab bar. The story is untouched.

A trap that cost 9 pt here: `.mk-stat` had a fixed `height` *and* top padding without
`box-sizing:border-box`, so the padding was added to the height and pushed the media down.
Anything in the mock with both a fixed cqw height and padding needs border-box.

**Chrome icons are Google Material Symbols** (outlined, wght 300), with their path data
**baked into the file** — fetched once at build time from
`fonts.gstatic.com/.../materialsymbolsoutlined/<name>/wght300/24px.svg`, all 23 verified to
resolve, single path each, all sharing the `0 -960 960 960` viewBox. No runtime network
dependency in the chrome, and none of Meta's own logo art. `.mk-g` sizes them from the
parent's `font-size` and fills with `currentColor`.

Instagram floats its tab bar as a rounded pill with the active item in a lighter rounded
rect; Facebook keeps a full-width bar. (Reels used to put the caption and the `Ad` label
**below** the media on black, which is why `.mk-vcapx` was a sibling of `.mk-media`; that
was wrong — see below — and it is now a row inside `.mk-vbot`.)

> **Superseded for FACEBOOK.** The whole Facebook column of the table below, and the two
> notes after it, were replaced by a trace off a supplied UI-mockup SVG — see *Facebook
> Reels is traced off a UI-mockup SVG*. `.mk-vbot-fb`, `.mk-fbwho`, `.mk-fbcta`,
> `.mk-fbrev`, `.mk-fbad`, `.mk-fbg`, `.mk-fbcar`, `.mk-rail-fb`, `.mk-rail-dots` and
> `.mk-tab-lab` are **deleted**, not left dead. What survives is the Instagram column,
> which is untouched, and `.mk-vburg` — Facebook still leads its header with the
> hamburger. Of the five Material Symbols baked in for that pass, `thumb_up` and
> `bookmark` are still drawn by the FEED mock and `public` / `notifications` /
> `campaign` are now drawn nowhere — verified by grepping their path data. There is
> nothing to clean up: the icons were inline `<path d>` in the markup, so deleting the
> markup deleted them; no constant survives.

**The REEL is per platform too, retraced off the live ads.** It used to be one shared layout
wearing Instagram's chrome, which is why Facebook's own ads did not look like the preview:

| | Instagram | Facebook |
|---|---|---|
| top bar | `Reels` + camera | **☰ + `Reels`**, nothing right |
| rail | heart · comment · share · send · menu, all with counts | **thumbs-up (3) · comment · share · save (65.7M) · ⋯**, only two counts |
| bottom stack | caption · Followed by · pill CTA · account + Follow | **account + globe · caption · FULL-WIDTH button · "92% recommend (233 Reviews)" · Ad chip** |
| tab bar | icons only | icons **with labels** — Home / Reels / Marketplace / Notifications / Profile |

Facebook's stack is a different order *and* a different button shape, so it is its own markup
(`.mk-vbot-fb`, `.mk-fbwho`, `.mk-fbcta`, `.mk-fbrev`, `.mk-fbad`, `.mk-rail-fb`,
`.mk-tab-lab`) rather than a restyle of Instagram's. Five new Material Symbols were baked in
at `wght300` for it — `thumb_up`, `bookmark`, `public`, `notifications`, `campaign` — the same
provenance as the other 23.

**Its row heights and gaps are the ads' own numbers**, in canvas units: account 78, caption
37, button 89, reviews 28, Ad chip 45, gaps ~30, and 44 from the chip to the tab bar — 443 in
total. This is not cosmetic: a stack drawn taller than the platform's makes the preview
overlap its OWN safe box and the margin look wrong, and one drawn shorter hides the risk. The
first pass ran 42 over and then 67 under before landing within 9 of the real stack top.

**Two specificity traps in that block.** `.mk-vbot`'s own `gap` and `.mk-rail`'s own `right`
are declared LATER in the sheet, so `.mk-vbot-fb` / `.mk-rail-fb` lost to them at equal
specificity — the gap silently stayed at Instagram's value. Both overrides need the two-class
form (`.mk-vbot.mk-vbot-fb`). And the rail sat `3cqw` off the edge, ~50px right of where it
really is, which understated how close it comes; it is `8.05cqw` now, landing its box on the
ads' 910–993.

### Facebook Reels is traced off a UI-mockup SVG

Supplied as a vector (`Ui Mockup - insta reel.svg`), which is a far better source than the ad
screenshots it replaces: **1080 × 2348 is the SAME 0.4600 display aspect as `.mk-screen`**
(402 × 874 pt), so one mock pixel is exactly **0.09259cqw** and every number in the
`.mk-*-fbr` block is that conversion. A screenshot edge is worth ±10px at this scale; a
vector has no reading error, so nothing here carries slack.

The mock's own chrome is *Instagram's* — heart / comment / repost arrows / paper plane, a
floating capsule tab bar — and it was applied to **Facebook** by explicit request. That is
worth knowing before "correcting" it back.

| | mock | rendered | Δ |
|---|---|---|---|
| tab capsule | (62, 2123) 956 × 165, r = h/2 | (62, 2123.5) 956 × 165 | **0** |
| CTA button | (39, 1608) 862 × 129, r 30 | (39, 1608.9) 862.1 × 128.9 | ≤0.9 |
| avatar | (39, 1785) d 101 | (39, 1785.8) d 100.9 | ≤0.8 |
| caption | y 1909, h 44 | y 1909.7, h 43.9 | ≤0.7 |
| meta row | y 1994, h 32 | y 1994.7, h 31.9 | ≤0.7 |
| scrub bar | (39, 2081) 998 × 7 | (39, 2081.7) 998.1 × 7 | ≤0.7 |
| two-bar mark | (970.1, 1890.8) 58.5 × 5.9 | (970.2, 1890.8) 58.5 × 5.9 | **0.1** |
| rail ink centres | x 999.5; y 1402 / 1531 / 1661 / 1794 | x 999.5; +0.2 / +2.1 / +3.6 / +1.1 | ≤3.6 |
| tab glyph centres | x 176.7 / 359.4 / 543.7 / 727 | −0.1 / −1.1 / −3.3 / −5.4 | ≤5.4 |

Six things this had to get right:

- **`right` on the rail is set from the glyph INK, not its em box.** A Material Symbol draws
  at ~0.71 of its em, so an 8.4cqw em centres ~0.72cqw of padding around the ink — the inset
  is 3.26cqw, not the 3.98 the ink's own x implies. Getting this wrong put the rail 8px left
  AND the two-bar mark 8px left; fixing the one number fixed both, because the mark is
  centred in the same column.
- **A tab glyph's SIZE is em, not ink, for the same reason.** 5.5cqw of em rendered 37–42.6px
  of ink against the mock's 59.4. It is 7.7cqw (= 59.4 / 0.71), measured back at 52–59.6.
- **The mock's row gaps are NOT uniform** — 4.45 / 2.13 / 3.80 / 5.10cqw — because every row
  in it carries an absolute y. So the column carries `gap:0` and each row its own
  `margin-top`. One `gap` cannot express four values, and averaging them drifts 12px.
- **The two-bar mark is DRAWN, not mapped onto a glyph.** 58.5 × 5.85 over 40.7 × 6.1 with
  17.3 between, left-aligned. It is not any Material Symbol; picking the nearest would be
  inventing a fact. Its own `margin-top` is what makes its step 9.4cqw where the four glyphs
  above it step 12.07 — and `bottom` is reduced by exactly that margin so they do not move.
- **The block is declared AFTER `.mk-vbot` / `.mk-rail` / `.mk-tab`,** and still uses the
  two-class form. That is the trap the previous pass hit twice.
- **The header and the 260 top margin stay, against the mock.** The mock draws no top chrome
  at all — and an omission is not evidence of absence. The live ads that started this had a
  ☰ Reels header striking through the wordmark, so removing it would delete the very defect
  the preview exists to show. This is the ONE deliberate departure; everything else is the
  mock verbatim.

**The mock also CONFIRMS the margins rather than loosening them.** Mapped back through the
reel's cover-crop (media box 1080 × 2123, so k = 1.10573 and the creative renders 1194 wide
offset −57), the mock's button top lands on creative y 1454 — a **466** bottom margin against
the 460 already in `PXT`, i.e. inside the measurement noise. `pad` therefore did not move.
`railR` did: the mock's rail ink starts at creative x 921.6 against the 924 measured off the
screenshots — two independent sources agreeing to 3px. See the next section.

**The safe-margin overlay was wrong on the reel, and this is what exposed it.**
`mockSafeBox` returns the margins as percentages **of the creative**, and the div was a child
of the media box — fine for the feed and the story, which are aspect-preserved, but the reel
is cover-cropped, so the creative renders LARGER than its box and centred. The overlay drew
the side margins **47px too far in**, understating exactly the width the crop eats.
`StudioBase.mockSafeWrap()` is now a wrapper that IS the creative's rendered box — full
height, its own aspect from `PXT`, centred, free to overflow (the media clips). Verified
against the crop arithmetic: 53.4 / 287.5 / 973.2 / 1327.2 against a predicted 53.4 / 287.6 /
973.3 / 1327.2. The aspect comes from `PXT` and the height from CSS, so no constant is
duplicated in JS.

### Instagram Reels takes the SAME mock, and places it by the mock's own vectors

The mock's chrome is Instagram's — the file is literally named `insta reel` — so it now
drives that placement too, on request. **Facebook's `.mk-*-fbr` block is untouched and
Instagram has its own copy (`.mk-*-igr`), by explicit choice**: the two are free to
diverge, at the cost of two sets of numbers.

What is worth copying is *how* Instagram places them. Every mark is the mock's **own
vector**, kept verbatim — path data and `transform` straight out of the file — inside an
`<svg>` whose `viewBox` is that path's absolute bbox in mock space. `.mk-igr` spans the
media box, so a child's `left`/`top` **is** the mock's own x/y ÷ 10.8. That removes both
sources of error the `-fbr` block has to carry:

- no **em-to-ink ratio** to estimate, because the element's box *is* the ink box — a
  Material Symbol draws at ~0.71 of its em and `-fbr` has to divide by that;
- no **chain of margins** to accumulate, because every row carries its own absolute y.

Measured back, converting each rect to mock px: every mark on the creative is within
**0.07px** of the SVG and every drawn path's ink coincides with its element box to
**0.06 CSS px**. The six tab-bar items sit a uniform **+0.5px** low — the phone frame's
own height rounding (the screen measures 217.47cqw against the mock's 217.407), which
`-fbr` shares and which is 0.05% of the canvas.

Get the bboxes by **rendering the SVG and calling `getBBox()`**, mapped to root space via
`getScreenCTM()`. Do not parse the path data: half these marks are curves, and two of them
(`Union_5`, the repost arrows) carry a transparent 1px stroke and transforms in the
−9000s, so the numbers are not readable off the file by eye.

Three traps, each of which cost a round:

- **A `svg` type selector out-specifies the size classes.** `.mk-igr svg{width:100%}` is
  (0,1,1) and `.mk-igr-heart{width:6.944cqw}` is (0,1,0) — so *every mark rendered at the
  full size of the media box*. The `<svg>` here IS the positioned element, not a child of
  one: that rule may set `display` and `fill` and nothing geometric.
- **The mock draws a status bar** (y 70..107: clock, signal, wifi, a battery with its own
  percentage digits) — easy to miss, because it is four `Union_*`/`Group_*` nodes above
  1370 and the eye skips to the rects. It is what `.mk-stat` already occupies, so it was
  left alone. The mock draws no **header**, and as with `-fbr` that is the one deliberate
  departure: `.mk-vtop` stays, because the live ads put a Reels title over the wordmark.
- **The mock's grey rect is 1080 × 1922** — the creative fit to width, not cover-cropped.
  That does NOT reopen the crop model: chrome is positioned in *screen* coordinates, so
  the trace is unaffected either way, and cover was established from live ads three
  independent ways (see the next section). Read the mock for chrome, never for the crop.

Deleted rather than left dead: `.mk-vcap-in` (+3 descendants), `.mk-vfol`, `.mk-vcta`,
`.mk-vwho`, `.mk-follow`, `.mk-tab-p`, `.mk-av-s` and `.mk-rail s` — the whole of the old
hand-built Instagram reel. `.mk-av-r` and `.mk-vf` survive because the feed and the story
use them. Net CSS: 952 → 965 top-level rules, and the browser parses 960 of those because
Chrome drops the file's 5 `-moz-`-only blocks — which is the check that proves no rule was
swallowed.

**A pre-existing bug this uncovered, and it is the reason the Instagram reel looked
broken.** The `-fbr` pass left the Facebook tab bar with **no `<sc-if mkIsFb>` wrapper**,
so it rendered on Instagram as well — two stacked tab bars — and the `</sc-if>` that should
have closed that gate was closing `mkChromeOn` instead, which put `.mk-homebar` *outside*
the Platform UI toggle and left one stray `</sc-if>` at the end of the branch. Inserting
the single missing open tag fixed all three at once. The check: a running `<sc-if>` depth
walk over the markup. Note it never goes negative overall — the file carries three
`<sc-if>` mentions inside *code comments*, so the raw open/close counts are 3 apart even
when the markup is balanced. Walk with a stack and print what is left unclosed.

### The 9:16 margins ARE the Reels safe area, retraced off live ads

Real Facebook Reels ads made in this studio came back with the wordmark struck through by
the **☰ Reels** header and the glass price block cut by the **account row**. The margins
were 174 / 360 with 100 at the sides. They are now **top 260, right 175, bottom 460, left
100**, and the mock was wrong in a way that hid the problem.

**A Reel is FULL-BLEED and cover-cropped; the mock letterboxed it.** That is the finding
everything else follows from, and it is confirmed three independent ways off the same
screenshots:

| | cover predicts | fit-to-width predicts | measured |
|---|---|---|---|
| the eyebrow's ink width | 843 of 920 | 750 | **830** |
| the left margin, as % of the screen | 3.7% | 9.3% | **4.9%** |
| media visible behind status bar / tab bar | yes | no | **yes** |

So the creative runs from the very top of the display to the tab bar and loses ~5.5% of its
width at **each** side. The old model gave the media `aspect-ratio:9/16` and put the caption
row *below* it, which showed clearance the platform does not give you: it had the top chrome
ending at **8.3%** of the creative where it really ends at **12.6%**, and the bottom chrome
starting at 79.8% where it really starts at **76.7%**.

**How the numbers were derived.** The display transform was solved from a landmark whose
canvas position is known — the wordmark's baseline (`pT + tk.logo * .8`) — and cross-checked
against a second, the bottom cluster's floor (`H - pB`); both put the media at 920 × 1840
top-anchored in a 920 × 1994 screen. Converting the chrome back through it:

| chrome | canvas y/x at 1080×1920 | what it forces |
|---|---|---|
| ☰ Reels header ends | y 242 | margin, top **260** |
| account row starts | y 1477 | margin, bottom **460** |
| action rail | labels x 910–993, icons 924–983 | **`railR: 170`, bottom cluster only** |

Each carries ~18px over the measurement, because reading an edge off a screenshot is worth
about ±10px at this scale. The top and bottom also land close to Meta's own published Reels
safe zone, which is the corroboration that mattered most.

**`railR` was re-derived at 170 from the UI-mockup SVG, and that is TWO sources, not one.**
The mock's rail ink starts at screen x 962, which maps back through the cover-crop to creative
x **921.6** against the **924** read off the screenshots — 3px apart, which is as close as two
independent traces get. On the mock alone the answer is 158, because it draws no count labels;
the live ads do show labels reaching x 910, so keeping their band is what puts it at 170
rather than 158. The bottom margin came out of the same exercise at 466 against the 460 already
here, so `pad` did not move — the mock CONFIRMS it. Verified end to end after the change: a
left-aligned bottom cluster takes 810 (was 795), a centred one 740 (was 710) spanning
170–910 with every run's ink midpoint on **540**, the top cluster still takes the full 880, and
the right-corner QR moved with it — read back off the rendered pixels, its right edge lands on
910 = `1080 - railR`.

**The rail is NOT a right margin. That was tried and rejected.** An asymmetric `pR: 185`
clears the rail, but it narrows the *top* cluster — which the rail never reaches, since it
starts around y 1200 — and it shifts the whole design off the canvas centre. So the reserve
is an L, applied where the rail actually is:

- `CampaignStudio.railBox(tk, center, innerW, pL)` is the single source. Centred content
  keeps the **canvas** centre and gives up the same width on both sides (740 of 880);
  left-aligned content keeps its margin and simply stops sooner (810). No `railR` — 1:1 and
  16:9, which have no reel placement — returns the full column, so it is a no-op there.
- `drawMod(m, y, g)` and `modH(m, g)` take the cluster's box and measure and draw from
  `iw`/`px0`, never `innerW`/`pL`. **A height measured at one width and drawn at another puts
  the whole stack off its own baseline**, so both have to be handed the same `g`.
- `scrimStops`' `clusterH` and the preview's `clusterPx` take it too, or the wash and the
  copy-coverage chip report a stack that is not the one on screen.
- The preview reaches it through `mk(m, g)` — a bottom-cluster spec panel, step grid or
  graphic is *built* at the guard width — plus `maxWidth` on the item, with **auto margins**
  when centred. Without those margins an `alignSelf:stretch` item fills the frame and sits
  left.
- **A right-corner QR is pulled in past the rail too** (`W - max(pR, railR) - qs`). It sits
  on the bottom margin, which is inside the rail's own band, so it is the one piece of
  furniture the cluster guard does not cover.

Verified: with the hero in the TOP cluster it reaches x 925 — the full column, inside the
rail's x band but far above its y band — while every bottom-cluster run stops at 836 and the
QR at 895 — the creative's ink clears the header by 21px, the account row by 16 and the rail
by 15, measured off the render. Centred runs sit on **540** in both the preview and the
render. The canvas render agrees with the preview to 2px on both clusters.

**A SCRIPTED RENAME INTO A SCOPE WITH SHADOWED LOCALS BROKE TWO THINGS. Do not do this
again without auditing every declaration in the target scope first.** The `innerW → iw`
rename inside `drawMod` landed on two branches that already declared their own `iw`:

- **The chip icon's box** (`const iw = tk.eyebrow * 1.9`) shadowed the cluster width, so the
  line above it read `iw` before its own declaration and threw `Cannot access 'iw' before
  initialization`. The whole placement preview went blank **with no console error**, because
  `mockSync` catches and `console.warn`s — and it caches `{}` on failure so it never
  retries. To see it, hook `console.warn` **before** opening the overlay; the only failure is
  on first open. That local is `icoW` now.
- **The graphic component's own image dimensions** (`const iw = a.img.naturalWidth`) shadowed
  it silently, and `graphicW(gov, m, innerW)` — which wants the COLUMN — became
  `graphicW(gov, m, iw)`, the file's pixel width. An uploaded SVG then came out **1.5x too
  small in the export while the editor was right**, because the preview's copy of that line
  (`iW`, line ~7491) was never touched. Renamed to `aw`/`ah`. Verified after: preview 312.8 /
  299.1 against a render of 309.3 / 295.9 — inside 1.1%, where the bug gave 204 on both.

The check that catches this: walk every `const|let|var` declaration in the renamed scope for
the new name, and diff the scope against the pre-rename file with the rename **undone**, so
only real changes show. Both times the shadowing was invisible in the diff itself.

The cost is real and worth knowing: usable height goes 1386 → 1200, and a centred bottom
cluster's column 880 → 710 (left-aligned 795), so a dense 9:16 needs the Scaling control more
than it used to. The copy-coverage chip reflects it automatically.

**The story placement was deliberately left alone.** Instagram Stories are also full-bleed,
but the observed failures were all Reels, and `mockSafeBox` already reads `PXT.st.pad` — so
the story's overlay follows the same new margins for free. Organic's own story
(`OrganicStudio.PXT.st`) still carries a **100px bottom margin**, which is well inside this
chrome; that is a live risk for organic stories and has not been changed.

### Editor chrome

**Style variant is a `<select>`, not a pill row.** Tag chips carries six treatments and
the pills wrapped past what the rail can hold. `select.p-in` needs its own arrow drawn
with background gradients and `option{background:var(--ps-card)}` — a native select
otherwise renders a white popup list on the dark rail.

**The project name, its meta and the running status live in a BAR under the stage**
(`.p-cvbar`) — name left, status right — not in the top bar. The bar is for actions; a
status belongs beside the thing it describes.

**The bar cannot be a child of the stage.** A stage is a horizontal flex row of plates, so
anything appended to it becomes another column beside the canvases, not a strip beneath
them — which is exactly what happened on the first attempt (a 204px column in Organic).
`.p-stagecol` wraps the stage and the bar in a column and carries the `flex:1` and
`min-width:380px` the stage used to own; the stage inside it is `flex:1; min-width:0`.

Putting the line inside the first plate instead was the second attempt, and it is wrong for
a different reason: the plate repeats (per variant in Campaign, per slide in Organic), so
it needed an `isFirst` gate and still only spanned one canvas rather than the stage.

**The all-variants dock had to move up.** It is `position:absolute` inside `.p-body` at
`bottom:16px`, which the bar now occupies, so it sits at `bottom:62px` and clears it.

**The Design system button is parked, not removed.** `specPages`, `specDownload` and the
viewer overlay all still work; bringing it back is uncommenting one line in the top bar.

Delivery lives at the **left** of the top bar: the Projects folder icon, Source folder and
Save, next to the studio switcher. The folder icon is **inline SVG** — U+1F5C0 🗀 has no
glyph in most system fonts and rendered as tofu. Download layout guides is behind
**`guidesBtnOn: false`**; the export path still works, only the button is out of the way.
That gate used to be `guidesOn` — the same key that drives the dashed margin overlay,
declared twice in one object literal, so parking the button silently killed the overlay.
See *The app-wide dead-feature audit*, #4.

**Unsaved work is guarded three ways.** `StudioBase.markDirty/markSaved/isDirty` — every
`upd()` dirties, a landed save cleans — feeds a `beforeunload` handler on the shell plus
`confirmDiscard()` on the two in-app exits that unmount the engine (Projects, and the
studio switcher). The native prompt is only a backstop: Chrome shows its own wording and
only after the user has interacted with the page, so the in-app confirms are what
usually fires. `Save` shows a `•` and lights up while dirty.

- **"Modules" are called Design Components** in all UI copy. Internal state still
  uses `modules` / `mvar` / `m.type` — renaming the state would break saved sessions.
- **Scaling** is per size (`v.scaleBy = {sq, st, ls}`, each with its own slider and icon
  reset), and **the range is per size too** — `CampaignStudio.SCALE_RANGE`: 1:1 and 16:9
  are **80–130%**, 9:16 is **50–100%**. A story carries the same copy down a much narrower
  column between a 174px top margin and a 360px bottom one, so it needs to come down a long
  way and never needs to go up. `scaleRange(sizeKey)` is the one reader — `scaleOf` clamps
  through it, each slider takes its own `min`/`max` from it (a single shared `scaleMin`/
  `scaleMax` on the panel cannot express a per-size range), and the design-system sheet
  prints it rather than quoting a constant. A saved story above 100% clamps down on load. **Content only**: type, component boxes, spacing, the
  wordmark and the QR box. `tkFor`'s `FIXED` set holds the canvas plus its frame
  geometry — `pad` (margins) and `col` (the 16:9 text column) — so the brand grid
  and the 9:16 platform-safe margins survive every scale. `CampaignStudio.tkFor()`
  is the only place scale applies, and it falls back to the old single `v.scale` so
  saved sessions keep their setting.
- **The cutout is tinted by the BOTTOM band only.** `scrimStops` returns two
  gradients: `stops` (the wash over the photo) and `botStops` (the same thing with the
  top band stripped). The cutout tint uses `botStops`, so the subject reads clean where
  it rises out of the image window and only sinks into the scrim at its base — a band
  behind the wordmark or a top cluster no longer darkens its upper half. With no bottom
  band at all, `botStops` is flat zero and the cutout is left untouched.
- **The cutout is tinted by the scrim, not laid over it.** Painting the cutout above
  the scrim punched a bright hole through it and stranded the copy on an unscrimmed
  patch. The fg image op now carries `tint` = the same scrim stops, so the subject
  sits at the scrim's own brightness and the wash reads continuously. Canvas: composite
  on a full-canvas buffer (keeps the gradient in canvas coordinates) then
  `globalCompositeOperation = 'source-atop'` clips it to the cutout's alpha. SVG: a
  `mask-type:alpha` mask of the same image. Preview: a masked child of the cutout
  layer whose stops are **remapped from canvas space into the cutout's box**, since a
  cover-fit cutout is larger than the canvas and a canvas-space gradient would stretch.
- **The overlap cutout sits over the hero headline only** — the wordmark, eyebrow,
  hook, body, tags, spec, price, CTA and QR all stay above it, matching Organic.
  Export: ops carry absolute coordinates, so `buildOps` records which ops each hero
  produced (`heroAt`), then splices content at `zContent` and re-pushes it as
  hero → cutout → everything else. Preview: same order via z-index in the canvas
  stacking context — hero `auto`, cutout layer `1`, all other content `2`. This works
  because the frame is `position:absolute` with `z-index:auto`, so it is *not* a
  stacking context and its positioned descendants compare against the canvas
  directly. Giving the frame a z-index would break it by trapping the hero.
- **Session files carry only their own studio's slots** and load by **merge**, not
  overwrite: `loadSessionFile` clears just the `adstudio-*` / `smp-*` prefix, then
  merges the file's images in. It also sets the `*-resume` flag (Campaign was missing
  it, so a load landed on the splash — and pressing "+ New campaign" there wiped the
  images that had just been restored), and it refuses to load rather than silently
  drop photos when no writable store exists.
- **Bullet list** (`type: 'list'`) — one bullet per authored line, capped at
  `LIST_MAX` = 8, variants Check / Dot / Ring. Bullets are **drawn, not fonted**: the
  check is a stroked `poly` op, dot and ring are circular `rrect`s. No icon webfont, so
  an export can never render blank boxes because a font hadn't loaded. The preview
  builds the same shapes in CSS (rotated two-border box for the check). `poly` was
  added to *both* engines' renderers per the parity contract, though only Campaign
  emits it. Long items wrap and continuation lines indent under the bullet.
- **Glass panels are clamped to the content column.** `bw = min(innerW, text + pad)`
  and the text wraps to `innerW - px * GLASS_PAD`, because the pill used to size to
  its text and ran straight past the canvas margin on a two-line hook. `wrapText()`
  is the single wrapper — manual breaks first, then wrap each segment — and `modPx`
  calls it too, so the reserved height always matches what gets drawn.
- **Hero, hook and body take manual line breaks** (a textarea in the panel, Enter for a
  new line, capped at `LINE_MAX` = 4). The hero splits on breaks *and* still
  auto-wraps each segment to the column, so a manual break can never overflow.
  `CampaignStudio.lines()` is the single parser
  — it trims blank leading/trailing lines and caps the run, and `modPx`, the scrim
  box and the export all read line count from it, so nothing can disagree.
  `LEAD.hook` / `LEAD.body` is the baseline step, used both as the export's line
  advance and as the preview's CSS `line-height`, with `white-space: pre-line` on
  the preview node. Neither auto-wraps: breaks are deliberate, author-placed.
- **Scrim is the background of the copy**, not a wash over the canvas. One box per
  cluster, full width, height set by what sits inside it — the components plus the
  wordmark when the wordmark shares that end — with `PAD = tk.gapS * 2.4` of
  breathing room. The box runs to the canvas edge behind the copy, since the copy
  already sits on the margin. Logo at one end and copy at the other gives two boxes;
  if tall copy makes them meet they butt at the midpoint instead of overlapping.
  `v.scrimFade` is measured **inside the box**: 0 = hard edge at the boundary,
  100 = ramp spans the whole box. Colour is any hex via `v.scrimHex`; swatch sets are
  per mode in `CampaignStudio.SCRIMS` (`.dark` / `.light`).
- **Every stroke on the canvas is neutral, in BOTH palettes.** Two survived the earlier
  gold sweep because they were not named `gold`: `PAL.light.boxBd` was `#D4CFC4`, the
  brand's sand, which on a white canvas reads as a gold hairline around every data panel;
  and `PAL.dark.chipGold` was `rgba(78,122,158,.6)` — the UI's blue — putting a chrome
  accent on the canvas, the one thing the palette exists to prevent. Light is now a navy
  hairline and dark a cream one. **The two chip treatments differ by WEIGHT, not colour**:
  `chip` is the quiet stroke and `chipGold` the stronger one, so `mist` and `gold` still
  read as different without either being coloured. Checked by sweeping every `fill`,
  `stroke` and `tintFlat` an op emits, across all 9 component types and their 27 variants
  in both palettes, for any colour with a red cast — none left.
- **Light mode** (`v.bg = 'dark' | 'light'`) is a real brand variant, not an inverted
  filter. All canvas colour comes from `CampaignStudio.PAL` via `palOf(v)` — never
  hardcode a colour in `buildOps`, `heroLines` or `mkCanvas` again, or the two modes
  drift. Serif emphasis stays Gold in both (binding rule); the accent for rules,
  bullets and gold chips becomes Orange #F3793C on light, because orange is a
  light-background colour and gold is its navy counterpart. The QR quiet zone stays
  white in both. Panel chrome is deliberately untouched by the palette.
- **What is per variant vs shared.** Per variant (and per detached size): cluster
  (`clusters`), style variant (`mvar`), visibility (`hidden`), **order (`ord`)**,
  and every `Layout` panel setting. Shared across all variants: the component list
  itself, its text, and spacer height — the panel labels those "linked across all
  variants". Order used to be shared too, because it was stored implicitly as the
  index in `modules`, so ↑/↓ in one variant reordered them all;
  `CampaignStudio.orderedFor(target, modules)` now resolves it from the variant's own
  `ord` list, falling back to `modules` order when `ord` is absent so sessions saved
  before this open unchanged. Never reorder `x.modules` to move a component.
- **Layout presets** write the base variant *and* any detached `story` / `wideOv`
  override — otherwise Bottom silently moved only the 1:1 once a size was unlinked.
  The three buttons show which preset is active.
- The local-folder feature (File System Access API) was removed — it was
  Chrome-only, and images now travel embedded instead of by reference.

# The contrast bar was 2.4:1, and that is why the failures passed

**Superseded: the bar is 4.5:1 for text, 3:1 for large text and non-text indicators —
WCAG AA.** Disabled controls are exempt (1.4.3). Recorded in
`ui-design-system/provident-ui.tokens.json` under `a11y`.

2.4 was never a decision. It is the number that made an audit pass, and it was then
inherited by every later audit including one run in this session that reported "zero
elements below 2.4:1" — which was *true*. `--ps-dim` measured **2.73:1** on `--ps-fill` in
light mode and cleared 2.4 comfortably while failing AA by a wide margin, as the declared
ink for `.p-cap`, `.p-subcap`, `.p-lab > s`, `.p-hint`, `.p-choice s`, `.p-fld` and
`.p-in::placeholder` — every hint, caption, placeholder and label-value in both studios.
**A bar below AA converts a real failure into a passing measurement, which is worse than
having no bar at all.**

Found by `/impeccable critique` on `ui-design-system/index.html`. What it cost to fix:

| token | theme | was | now | worst ground |
|---|---|---|---|---|
| `--ps-dim` / `--ps-mute` | light | #8A94A1 | **#646E7C** | 2.73 → **4.58** |
| `--ps-ink-2` | light | #5A6675 | **#454F5C** | 5.19 → **7.37** |
| `--ps-dim` / `--ps-mute` | dark | #767F8B | **#8A939F** | 3.77 → **4.91** |
| `--ps-ink-2` | dark | #A8B0BA | unchanged | 6.97 |

**Both light tiers had to move, not just the failing one.** Raising `--ps-dim` alone to AA
would have landed it on top of `--ps-ink-2`, collapsing the two quiet tiers the whole
system leans on. Moving both keeps a visible step — 1.61× in light, 1.42× in dark.

**The focus ring is its own token, and `--ps-accent` could never have carried it.**
`#487194` measures **2.96:1** against the dark grounds, under 1.4.11's 3:1 for a non-text
indicator — so the rule stating that the accent carries every focus ring was unmeetable as
written, quite apart from never having been implemented. `--ps-focus` is #6E9DBF dark /
#3A5D7C light (5.26 / 5.56). `outline-offset` is load-bearing: it puts the ring on the page
ground, which is the adjacent colour the standard measures against, not on the control's own
fill.

**`:focus-visible`, never `:focus`.** The system had exactly two `:focus` rules, both on
fields, and zero `:focus-visible` — so 20 control classes fell back to the UA's amber
`outline auto 1px rgb(229,151,0)`, a colour in neither palette. And `.p-in:focus` set
`outline:none` and substituted a `--ps-accent-q` shadow measuring **1.04:1** against the
field's own fill, discarding a UA ring worth 7.77:1. A plain `:focus` fires on mouse click
too, which is exactly why authors reach for `outline:none` in the first place.

**Results, measured with ancestor opacity composited, reloaded into each theme:**

| | before | after |
|---|---|---|
| dark failures | 41 | **3** |
| light failures | 222 | **9** |

The survivors are one family and a deliberate P1: white on brand orange (`.p-prev`, 2.76 in
both themes), the light status colours (`.p-danger` / `.p-tag[data-tone=bad]` 3.77,
`.p-info` 4.02, `.p-bad` 4.36, `.p-tag[data-tone=good]` 4.47) and the wordmark's accent
period at 3.49 dark. Left alone deliberately — darkening brand orange or the status hues is
a brand decision, not a polish one.

## `NEVER write a star-slash inside a CSS comment`, including inside a path

`provident-ui.css` line 11 read `_ds/provident-estate-design-system-*/` and **that closed
the file's header comment 14 lines early.** Chrome then consumed the `@font-face` block
below it as an invalid rule's body and discarded it: the sheet parsed with **zero
`CSSFontFaceRule`** while the woff2 returned 200, so the guide fell back to system-ui — a
measured **5.0% width shift** — invalidating every number it publishes. Its whole authority
is "every number here was measured off the running studio."

It looked correct for one reason only: Google Sans Flex is installed as a system font on
this machine, so the family resolved anyway. **On a clean machine the guide has been
rendering in the wrong typeface.**

**I then reintroduced it while documenting it** — my replacement comment quoted the
offending sequence inside backticks, which closed the comment at the same spot. `document.
fonts.size` stayed 0 and the fix looked applied. Describe the sequence in words; never type
it. Verified after: **1 `CSSFontFaceRule`**, family resolved, and the woff2 actually
requested — 120,204 bytes transferred, where before there were zero font requests.

**How to check it, since nothing else will:** `[...sheet.cssRules].filter(r => r.constructor
.name === 'CSSFontFaceRule').length` and a fallback-forced width measurement.
`document.fonts.check()` is worthless here — it returns `true` for a family that does not
exist.

## Two more from the same pass

**`color` is not optional on a button.** Six rules touched `.p-ic` and none set it, so it
inherited the UA's `buttontext`: a **black glyph on a dark fill, 1.27:1**.

**Browser surfaces are themed now.** `::selection`, `caret-color`, `text-underline-offset`
and `font-variant-numeric: tabular-nums` were browser defaults. Scrollbars were already
done, so the habit existed — it just stopped at scrollbars. Tabular figures matter here
specifically: the guide and both rails are full of value tables, and proportional digits
make a column of 4px / 6px / 999px ragged.

**The guide now prints each ink token's live contrast ratio** against `--ps-app` in the
current theme, computed in `paintSwatches()`. A number the page prints is a number it
cannot quietly ship below — one badge currently self-reports `2.49:1 FAILS AA` on brand
orange. Two bugs I introduced there and had to fix: the parser scraped digits out of `#8A939F`
and printed `NaN` for all eight hex-declared tokens (a custom property returns its **raw
declared value**, so hex is the common case, not `rgb()`), and I faded the `--ps-` prefix
with `opacity:.55`, which composited to 3.51:1 — the same quietness-as-opacity error this
very pass had just removed from `.gd-skip`.

# The templates are being PORTED to Prov Toys, a separate live repo

`https://github.com/UIUX-Haseeb/marketing-tools` (username `kelvin-inigo`) is a **different,
live project** — Next.js 16 App Router / React 19 / TypeScript / Tailwind v4, semantic tokens
in `src/app/globals.css`, a canvas post engine in `src/tools/_shared/`. It is **public**, so
nothing may ever be force-pushed to `main`. A read-only clone sits at
`/Users/rizi/Documents/marketing-tools`.

The instruction was to build the studio's templates as tools there: `src/tools/` holds one
self-contained folder per tool and `src/lib/tools.ts` is the registry. **This studio is not a
dependency of that one** — a template is re-derived from its own SVG in that repo's idiom,
never imported.

## Its conventions, which are NOT this project's

| | Prov Toys |
|---|---|
| a tool | `src/tools/<slug>/` — `<slug>.ts` (geometry + renderer), `<slug>-editor.tsx`, a 5-line `index.tsx` default export, `README.md` |
| assets | `public/tools/<slug>/` |
| registry | one entry in `src/lib/tools.ts`: `{slug, name, description, teams, category, icon, component: () => import("@/tools/<slug>")}` |
| layout | `grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr]`, form left, preview right, and **no page header inside the tool** |
| a folder is COPYABLE ON ITS OWN with `_shared/` | so tools never import each other — `coverRect` is duplicated in `listing/` and `google-review/` on purpose. A third reader is the moment to lift it into `_shared/render.ts`. |

**THE LOCKED FONT IS A SUBSET AND THAT IS THE TRAP.** `_shared/font.ts` bundles Google Sans
Flex at 300 / 400 / 500 under a namespaced family, and its coverage is **ASCII 32-126 plus
U+25CC and a few private-use codepoints**. So:

- **`U+2605 ★` is not in it** — five stars set as type export as five boxes. The Google review
  card draws them as a `Path2D` instead, byte-identical to the drawing's own path with its
  translate folded in.
- **`U+2026 …` is not in it either**, so a wrap that truncates must append three dots.
- **`ensurePostFont`'s fingerprint check cannot catch either of these.** It compares sixteen
  advance widths to prove the FAMILY is the bundled one; it says nothing about whether a
  particular glyph exists. `unsupportedCharacters(text)` is the test for that.

## The first port: `google-review`

Built to `Instagram Story - 39.svg` on branch **`add-google-review-tool`** (commit `ed1a9f6`,
6 files, +737). Every number verified against the drawing — worst delta **0.037 canvas px**
over 25 values, and the parts sum to the drawn card height exactly
(`174.5 + 11 x 38.4 + 101.6 + 70 = 768.5`). The folder's `README.md` carries the decisions;
three are worth repeating because they are general:

- **A column derived from the panel is wrong wherever something stands IN the panel.** The
  card is 891 wide, so the obvious quote column is 771 — at which the drawing's twelve lines
  wrap to five. The agent stands over its right half from x 513.
- **Pasted text is normalised, not refused.** `tidyReview` maps curly quotes, en dashes,
  NBSPs and ellipses to the same mark in ASCII; only what has no honest substitute blocks.
  This deliberately departs from `_shared/post-editor.tsx`, where any undrawable character
  blocks — a name can be retyped, a review cannot.
- **The card's material is that repo's, not the drawing's.** The SVG states an opaque
  `#1a2942`, which would leave nothing to blur — the same reading that silently dropped the
  ranking card's blur here. It takes `listing/`'s glass (.5 / .33 / blur 6.55) so the two
  post tools read as one material, NOT this studio's house glass (.65 / .165 / 30).

**THERE IS NO JS TOOLCHAIN ON THIS MACHINE** — no node, npm, npx, bun, pnpm, yarn, tsc or
deno — so nothing ported there can be typechecked or built here. Say so rather than implying
a build passed. What IS verifiable without one, and what was done: every import resolved to a
real named export by script, the geometry chain reproduced from the SVG's own transforms in
Python, the star path parsed and compared, and the bundled plate's WebP header read for its
dimensions.

**AND IT CANNOT BE PUSHED FROM HERE YET.** No `gh`, no `~/.ssh`, and
`git credential-osxkeychain get` returns no stored github.com credential — so the branch is
committed locally and waiting. Identity is set **repo-locally** (`kelvin-inigo` /
`exec4.graphics@providentestate.com`), never globally.

**Still to port**, the three Organic templates with no Prov Toys equivalent: **weekly
listings** (cover / CTA / property page), **Top agents** (cover + five ranks) and the
**Congratulations award**.

# Impeccable is installed, and the brand rules outrank it

`.claude/skills/impeccable/` holds [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
v4.1.3 — a design-fluency skill with 23 `/impeccable <mode>` modes, four subagents, 40
reference documents and 61 deterministic detector rules. Installed **by hand**: this machine
has no Node, npm, bun or Homebrew and no `claude` CLI, so neither `npx impeccable install`
nor `/plugin marketplace add` could run. See `.claude/skills/impeccable/INSTALLED.md` for the
commit, the manual update command, and exactly which parts are dormant.

**It needs Node 22+ and there is none, so only the PROSE half is live.** 114 of its 165 files
are `.mjs`: the detector rules, live browser iteration, `palette`, `font-match`, `comp-diff`,
`doctor` and both hooks all wait on a Node install. The two hooks in `.claude/settings.json`
(PostToolUse on Edit|Write, Stop deep pass) detect this themselves and no-op with one
message. Removing them is deleting that file — `settings.local.json` is separate and was
never touched.

**WHERE IT CONFLICTS, THE RULES BELOW WIN.** Impeccable is a generic frontend-design
authority and this project is not generic. Three collisions to expect:

- **Tracked caps.** This project's chrome carries none, by explicit instruction — but
  *tracked caps at 500 is a binding CANVAS rule* for eyebrows and small labels. A generic
  audit will flag the artwork and be wrong.
- **"Bolder / more delightful."** The eyebrow `fill` variant and the removal of gold both
  came from deliberate restraint, and the serif emphasis and highlight feature were removed
  on request. A skill whose stated aim is out-of-distribution boldness will want them back.
- **Tokens everywhere.** Correct for the tool's chrome, wrong inside `buildOps` or a canvas
  preview style: `CampaignStudio.PAL` / `OrganicStudio.ART` keep literal brand values, and
  merging the two systems is what leaked the UI's blue into eight places in finished posts.

Use it for what it is good at — critique, hierarchy, spacing, accessibility, UX copy on the
tool's own interface. Do not let it re-litigate a decision this file records as settled.

# THE TOOL WAS RE-SKINNED TO PROV TOYS, and it is not a kit mirror any more

> **SUPERSEDED AGAIN, BY EXPLICIT DECISION: this file is on `nexu-io/open-design`'s
> COINBASE system now** — see *THE IMAGE TOOL IS ON COINBASE NOW* at the end of this file.
> Three things below are still live and are why this section is kept: the record of HOW a
> re-skin is done in this file (one appended block, a token swap, old names redefined), the
> two surfaces that are deliberately never re-skinned, and the lesson about what "the new
> style guide" turned out to mean. Two of its specific rules were **reversed** by Coinbase —
> the pill came back onto every labelled action, and the tracked-caps kicker went away. The
> values below are no longer what ships. The one claim that still holds unchanged: this file
> is **not** a `ui-design-system/` mirror, so the mirror count is still one.

`web-image-studio.html` is on **`marketing-tools/STYLEGUIDE.md`** now, not
`ui-design-system/`. That was chosen explicitly, with the cost stated up front and accepted:
**a kit change no longer reaches this file.** It is the reason the propagation contract above
says two mirrors again.

**How it came up is worth keeping.** Asked to "use the new style guide", the first reading was
the kit — and the kit turned out to be what the file was already on, so the pass produced a
caption baseline, half a pixel on a label, 2.3px of field height and a 2% alpha. The user's
answer was "i didnt see much change", which was correct and was the whole signal. "New" meant
the NEW project's guide. **When a delivered change is imperceptible, that is evidence about
the premise, not a result to defend.**

## The two systems are genuinely different, which is why this is a re-skin and not a tweak

| | the kit | Prov Toys |
|---|---|---|
| ground | dark-first, `#0F1318` | **light-first, paper `#FAF8F4`** |
| a card | `--ps-card` + a hairline, bands not cards | **white + 1px stone, and NO DROP SHADOWS** |
| a field | **a FILL** (`--ps-fill`, transparent border) | **a BORDER** (transparent box, 1px input) |
| a control's corner | the 999px pill sweep | **`rounded-lg` 10px**; full round is badges only |
| a small label | 12.5px sentence case, **no all-caps anywhere** | **`.kicker` 11px/500 uppercase at .14em** |
| the accent | a dominant deep navy fill | **navy dominates, ONE orange dot punctuates** |
| dark primary | a deep navy fill | **paper with navy ink — the system inverts** |

**Two of those reverse binding rules this file records**, and both were the point rather than
an oversight: "no all-caps in the chrome" and "a field is a FILL". Prov Toys asks for tracked
caps on a kicker and a bordered field, and Prov Toys is what this tool follows now.

## How it was applied

Token source is **`marketing-tools/src/app/globals.css`, value for value** — never the guide's
prose, which names semantic tokens without giving all of them. One appended block, the
convention this file already used for the kit conversion: it redefines the token layer rather
than rewriting ~700 rules, and reverting the whole re-skin is deleting from that block to the
end of the sheet. **266 -> 294 authored rules, nothing removed.**

**Light-first cost one line, not a rewrite.** The toggle already wrote `'light'`/`'dark'` and
removed the attribute for dark, so inverting the head script's test (`!== 'dark'` instead of
`=== 'light'`) is the whole mechanism: bare `:root` carries the Prov Toys DARK values,
`:root[data-theme="light"]` the light ones, and the tool now opens on paper. The key is still
`provident-theme`, shared with the studios — so an explicit choice there still carries, and an
unset key now means light here and dark in the studios. That divergence is the honest
consequence of light-first.

### THE RAIL IS NOT THE SIDEBAR, and reading it that way would have been wrong

Prov Toys puts its **sidebar on navy in light mode**, and the obvious move is to make this
tool's left rail navy. It is wrong: that sidebar is the app shell's tool NAV, and in Prov Toys
a tool's own form column is ordinary page content — paper, with white cards. This rail is the
form column. It is paper, and the navy `--sidebar-*` tokens are deliberately unused.

Reading it the other way would also have cascaded badly: the rail and the stage share
`.p-in`, `.p-cap`, `.p-hint` and the buttons, so a navy rail needs every one of them re-inked
under a `.p-rail` scope.

### A SECTION HEADER'S CAPTION IS DATA, NOT A KICKER

The one real defect the re-skin introduced, and it is the general trap with a text-transform:
six `.sec-h .p-cap` carry pixel sizes directly, so uppercasing them **rewrote the data** —
`402 x 769` came out `402 X 769`. Split by container rather than guessed: those six are
helper text at 12px sentence case with tabular figures, and the other **twenty** `.p-cap` (in
`.rail-sec`, `.col-in`, `.col-h`, `.p-menu`) are genuine labels and stay kickers.

**Tracked caps did NOT overflow the 172px column**, which was the recorded reason the kit
moved this file to sentence case in the first place. Checked on the render: `Destination`,
`Output rules`, `This tab` and `Export` all still set on one line, because the sizes they used
to carry sit in the quiet half or in a spec line.

### What is deliberately NOT re-skinned

Both for the same reason — they are statements about the IMAGE, not chrome:

- **The preview frame's dark checkerboard** (`.fr`) and its own pinned ink. The checker means
  "transparent"; making it the page ground would say the opposite. It stays fixed in both
  themes, which is the rule this file already records as *a pinned surface takes pinned ink*.
- **The JPEG white flatten.** A fact about the format.

**No drop shadows is measured, not asserted: 0 elements** compute a non-inset, non-ring
box-shadow in either theme. The elevation token is `none` and the dropdown is anchored by its
border instead; the ring-shaped shadows that remain are focus and hot-state affordances, which
the guide keeps.

### Verification

- **Light and dark both reloaded into, never toggled into** — the documented mixed
  pre/post-flip trap fired here once, reporting a white card in dark mode that a reload showed
  as the correct navy.
- **Contrast, both themes, ancestor opacity composited: zero real failures.** Light flags
  three and dark two; the two disabled Export buttons are exempt under 1.4.3, and the third is
  **the wordmark's orange period at 2.60:1** — exempt as part of a logotype, and the guide is
  explicit that orange is punctuation. It carries no information: `provident` reads without it.
- Measured on the render, light: card `#FFFFFF` / 1px `#D4CFC4` / 14px / no shadow; field
  transparent + `#D4CFC4` + 10px + 36px; kicker 11px/500/uppercase/1.54px tracking in
  `#5B6472`; spec line 12px/300/none with tabular figures; the dot `#F3793C`.
  **Dark is superseded — see _DARK IS THE PORTAL'S GREY_ below.**
- The dropdown, the disabled export block, the warning list (`#B8412E`) and the teal progress
  bar all checked on the render rather than in the source.

**`ui-design-system/` and both `.dc.html` files are untouched by this pass.** The `--ps-*`
names survive inside this file as the local variable layer — the same alias trick the kit
conversion used — so nothing here implies the kit is still upstream of it. It is not.

# CAMPAIGN'S CHROME IS ON PROV TOYS, AND THE CANVAS PROVED IT DID NOT MOVE

`Provident Campaign Studio.dc.html` follows **`marketing-tools/STYLEGUIDE.md`** now. Same
decision as the image tool, same cost: a `ui-design-system/` change no longer reaches it. Token
source is `marketing-tools/src/app/globals.css`, value for value.

**THE WHOLE SAFETY ARGUMENT IS THE CANVAS/CHROME SEPARATION, AND IT WAS PROVED FOUR WAYS.**
This file carries ~500 colour literals in JS style objects and an artwork palette in the same
document, so "re-skin the UI" is one bad grep away from leaking a chrome token into a finished
ad — the failure this project already had once.

| check | result |
|---|---|
| artwork-path lines diffed against the pre-change file (`ops.push`, both renderers, `buildOps(`, `palOf(`, `scrimStops(`, `meas(`, `drawMod(`, `modPx(`, `heroLines(`, `specBox(`) | **123 / 123, 0 differing** |
| `static PAL` and `static SCRIMS` blocks | **byte-identical** |
| op signatures, 2 palettes x 3 canvases, PRE served alongside under a `_PRE ` name | **6 groups, 6 identical, 0 changed** |
| chrome tokens leaked into an op `fill` / `stroke` / `tint` / `tintFlat` | **0** — every op colour is a brand literal |

The op-signature diff is the project's standard and it ran through the React fiber
(`.p-shell` -> `__reactFiber$…` -> walk `.return` to `stateNode.logic` -> `.active()`).
**`buildOps` returns `{W, H, ops}`, not an array** — the first probe called `.forEach` on the
wrapper and threw. Check the return shape before signing it.

## THE HTML PARSER ENDS A STYLE ELEMENT INSIDE A CSS COMMENT

The most useful bug in this pass, and it is the HTML-level twin of the star-slash rule this
file already records. The appended block's own comment said "reverting is deleting from here
to" and then wrote the literal closing `style` tag. **The HTML tokenizer terminates the element
at that byte whatever the CSS says**, so ~140 lines of token declarations became body text and
the whole re-skin was inert — while `data-theme` still flipped and the pinned miniatures still
looked right, so it read as "the tokens do not win" rather than "the sheet ended early".

**The tell:** `--ps-app` computing the kit's `#F5F3F0` while the block sat visibly at the end
of the file. The check is the same one the star-slash rule uses — count closing tags inside the
element, which should be 0 and the file's total should be 1. Both re-skinned files now measure
that. **Describe the sequence in words; never type it.**

## What the token swap reached, and what it could not

**One appended block flips ~690 CSS rules AND the ~80 `var(--ps-…)` sites in the JS style
objects**, because a custom property resolves per document — which is also why this could be
done for Campaign without touching `studio-base.js`, whose `row(on)` is shared with Organic and
would have dragged Organic along with it.

**Four JS chrome literals had to be edited at the object**, since an inline style beats any
rule: the selection marquee (`wrapStyle`), the active-canvas ring and the plate's drop shadow
(`canvasStyle`), and the dashed margin guide (`guideStyle`) — all three rings were the retired
`rgba(78,122,158,*)` and now read `--ps-focus`.

**Six occurrences of that retired blue were LEFT, deliberately.** They are inside the
layout-guides **export** — a PNG the user downloads with the margins marked on it. That is a
deliverable, not the tool's interface. The design-system PDF sheet was left for the same reason
and is provably independent: it reads **zero** `--ps-*` tokens.

## ORANGE STOPPED BEING A FILL, WHICH RETIRED THIS FILE'S LAST AA EXEMPTION

The switcher and Preview were the two brand-orange buttons in the top bar, recorded here as
"the one deferred decision" at **2.76:1** white-on-orange in both themes. Prov Toys is explicit
that orange is punctuation and never a large fill, so both take the navy primary and the orange
moves to **the wordmark's period** — which needed a markup edit, because `provident.` was one
text node with nothing to colour.

**That period is now the only orange mark on the screen, and it measures 2.60:1 — exempt as
part of a logotype**, which is a real WCAG exemption rather than a deferral. It carries no
information: `provident` reads without it.

## FOUR BUGS THE SWAP INTRODUCED, ALL THE SAME BUG

Every one was a fill that inverts against an ink that does not. **Prov Toys dark primary is
PAPER with NAVY ink** — the system inverts rather than dimming — so anything filling with
`--ps-accent` and hardcoding `#fff` goes white-on-white the moment dark lands:

- `.p-br-new` / `.p-cta` — the project browser's primary, measured **1.00:1** in dark
- `.p-ghost[data-on]` — the dirty `Save` button, **1.06:1**
- `.p-load`, the same literal
- and in light, the info disc's `--ps-ink-2` on an 18% navy tint at **4.10:1**, nine instances,
  fixed by taking `--ps-ink` (navy dominates)

**Found by the audit, not by looking**, and the fix was scoped by **enumerating the parsed
sheet** for rules whose background is `var(--ps-accent)` — because forcing `--ps-accent-i` onto
the ON states that fill with `--ps-fill-on` instead (`.p-nav2[data-on]` is mist) would have
made *those* invisible. Every other accent-filled ON state already read `--ps-primary-i` and
inverted correctly.

**`.p-dock-t`'s shadow needed the two-class form.** `.p-dock-r .p-dock-t` (0,2,0) beat a bare
`.p-dock-t` in a later block — declaring a rule last is not enough when an earlier rule is more
specific, which this file already records and which caught me anyway.

## NOT re-skinned, and this one is load-bearing

**`.p-c-p` and `.p-tpl-c` stay pinned canvas-dark in both themes.** Campaign's template cards
are still hand-drawn skeletons whose marks are white bars, so a white tile hides them
completely — the documented reason for the pin. It is a literal declared later than the token
layer, so the swap could not reach it anyway; the block restates it so the next reader does not
"fix" it. (Organic's miniatures are real renders and needed no such pin.)

## Verification

- **Light and dark, splash and editor, all four surfaces reloaded into rather than toggled
  into.** Contrast with ancestor opacity composited: **zero real failures** in any of them.
  What is flagged is the logotype dot and the disabled Undo/Redo pair, both exempt.
- **Zero drop shadows** document-wide in both themes, including the canvas plate, which used to
  carry `0 8px 30px rgba(0,0,0,.5)`.
- Measured on the render, light: card white / 1px `#D4CFC4` / 14px; field transparent with a
  stone border at 10px and 36px tall; kicker 11px/500/uppercase at .14em in `#5B6472`; Preview
  navy with paper ink. **Dark is superseded — see _DARK IS THE PORTAL'S GREY_ below.**
- **Light-first cost one line** — `Component.theme()` returns `'light'` instead of `'dark'`. The
  key is still `provident-theme`, shared with Organic, so an explicit choice still carries.

**`ui-design-system/`, `studio-base.js` and Organic are untouched by this pass.** Organic is
now the only kit consumer left.

# DARK IS THE PORTAL'S GREY, NOT PROV TOYS' DARK

> **The BLUE in this section was superseded the same day.** The greys, the ground, the card
> ramp and the ink are exactly what ships. But this pass set `--ps-accent` **and**
> `--ps-primary` to one `#2F6FE0`, which made every selected control in the app fill with the
> brightest blue in it — 24 of them on one editor screen. `#2F6FE0` is still the bright
> register and its 4.70:1 still holds; it is now reserved for the top bar, and the resting
> state is a muted `#2F4C7F`. See *ONE BLUE WAS DOING TWO JOBS* at the end of this file.

Both re-skinned files take **`portal.prov.ae`'s neutral grey** in dark mode. Light is still
Prov Toys paper. This corrects the dark half of both re-skins above.

> **NEITHER FILE ANY MORE: both are on Coinbase.** `web-image-studio.html` went first and
> `Provident Campaign Studio.dc.html` followed one pass later, so nothing in this section
> describes what ships. It is kept for the REASONING, which is what carried forward: Prov
> Toys' navy dark ground and its paper active state were both rejected on sight, and the
> two-register split that came out of it survived into Coinbase intact. See
> *CAMPAIGN IS ON COINBASE TOO*.

**PROV TOYS' OWN DARK WAS REJECTED ON SIGHT, AND BOTH HALVES OF IT DESERVED TO BE.** Its dark
ground is `#111A2B` — a navy — and its dark primary is **paper**, so every active state became
a white slab. The words were "the dark mode blue looks horrendous, and the mix of white as
active color looks eye straining", with a screenshot of the portal as the target. Both
complaints are structural rather than matters of taste:

- a navy GROUND puts a blue cast on every surface in the app, and this studio's whole job is
  judging colour on a canvas — the room should be neutral;
- **paper as the resting fill of every ON state is the brightest thing on a dark screen**, and
  there are ~14 segmented rows in Campaign alone. It is the same mistake in the opposite
  direction from a mid blue being "loud everywhere and therefore emphatic nowhere".

| | Prov Toys dark | what ships |
|---|---|---|
| ground | `#111A2B` navy | **`#1D1D1F`** neutral, stage `#151517` |
| card | `#1A2942` navy | **`#26262A`**, hover `#2E2E33` |
| ink | paper `#FAF8F4` | **`#EDEDEF`**, quiet `#9B9BA1` |
| the active state | **paper** with navy ink | **`#2F6FE0` mid blue with white ink** |
| ring / link | `#A7B0BF` / `#4FB3D2` | **`#6BA5F5`** |

Light is untouched: paper `#FAF8F4`, white cards, stone borders, navy primary.

**THE ACCENT IS A BLUE IN DARK AND NAVY IN LIGHT, and that asymmetry is the point.** Prov Toys'
navy primary is nearly invisible on a dark ground, which is exactly why the guide inverts to
paper there. The portal answers the same question with a mid blue, and a mid blue on neutral
grey reads as a STATE rather than as a light being switched on in the room. Measured: white on
`#2F6FE0` is **4.70:1**, quiet ink on a card **5.45**, ink on a card **12.89**, the focus ring
on the ground **6.67**.

**THESE GREYS WERE READ OFF A SCREENSHOT, NOT SAMPLED FROM THE PAGE.** `portal.prov.ae` needs
authentication and could not be opened, and nothing in this file had ever recorded the portal's
hex values — only that the chrome "follows" it. So the ramp is accurate to the eye and not to
the byte. **The relationships are the durable part; any single value is a nudge.** If the portal
is ever reachable, sample it and correct these five.

## What the change exposed

**`.p-tile-c`, the palette count badge, rested on `--ps-accent-h` — a HOVER step.** White on it
measured **3.96:1** at 10px. It reads the resting accent now: 4.70. That was latent before the
re-skin; the swap only made it measurable.

**The four inversion bugs recorded above are now unreachable, and the fixes stay.** They existed
because a fill inverted to paper while its ink stayed `#fff`. With the accent a blue in both
themes nothing inverts any more — but `.p-br-new` / `.p-cta` / `.p-ghost[data-on]` / `.p-load`
keep reading `--ps-accent-i` rather than a literal, which is correct regardless and is what
stops the next palette change reintroducing them.

## Verification

Reloaded into each theme, never toggled into, and audited with ancestor opacity composited:

| | dark | light |
|---|---|---|
| Campaign editor | **2, both disabled Undo/Redo** | 3 — the logotype dot and the same pair |
| web image studio | **2, both disabled Export** | 2, the same pair |

Zero real failures anywhere; every flag is a 1.4.3-exempt disabled control or the logotype's
orange period. Zero drop shadows in either file in either theme. The image tool's preview
checkerboard is still pinned (`rgb(20,26,34)`), and Campaign's canvas is untouched — the op
work above still holds, since this pass changed only token VALUES in the chrome layer.

# ONE BLUE WAS DOING TWO JOBS: the resting state and the deliberate action

> **The VALUES here no longer ship anywhere — both files are on Coinbase.** `#2F4C7F` and
> `#2F6FE0` were the portal-grey answer. **The SPLIT survived both moves and is the durable
> part**, along with the `.p-top` scoping, the "a mark is never a fill" rule, and the
> frozen-timeline probe note at the end, which is still how any `[data-on]` fill has to be
> measured in this pane. See *CAMPAIGN IS ON COINBASE TOO* for what ships.

The portal-grey pass above set `--ps-accent` and `--ps-primary` to the SAME `#2F6FE0`, so
every selected control in the app filled with the brightest blue in it. **Measured on one
editor screen: 24 bright-blue fills** — four option tiles, the spacing slider, the Scrim
tab, five palette count badges, the Master plate badge, ten canvas grips, and the top bar's
two actions. The report was that it is "really eye straining", with the fix named exactly:
a muted blue for those, and the strong blue reserved for the top bar.

**THIS IS THE THIRD TIME THIS PROJECT HAS REACHED THE SAME CONCLUSION, and the second time
it has been written down.** *Three registers* records it verbatim for the kit — "a mid blue
used as the resting fill of every selected control is loud everywhere and therefore
emphatic nowhere. There was no register left for the action you should actually take." The
kit answered it with a dominant fill plus a bright blue in reserve. **The Prov Toys re-skin
flattened that into one primary and the portal-grey pass inherited the flattening.** So the
split below is a restoration, not an invention.

| token | dark | job |
|---|---|---|
| `--ps-accent` | **#2F4C7F** | the RESTING state — every selected tile, tab, badge and ON pill |
| `--ps-accent-h` | **#2F6FE0** | the BRIGHT step — hover on those, **plus** the resting fill of a primary button and of the two chips that float over the CANVAS |
| `--ps-accent-h2` | #3D7CEC | the primary's own hover, so it still lifts |
| `--ps-accent-q` | unchanged | still mixed from the BRIGHT blue — a 22% wash of the resting navy on a dark ground is not a wash at all |
| `--ps-primary` | #2F6FE0 | the same bright blue, reserved **by name** for the top bar |

**THE MUTED VALUE IS DERIVED, NOT PICKED, and it landed on a value already in the file.**
`hsl(219,45%,34%)` — the portal blue's own hue, dropped to a resting lightness and
chroma — is `#304B7E`, which reproduces **`#2F4C7F`, the value the kit already carried for
exactly this job**, to within 1/255 on every channel. Two independent derivations agreeing
is the reason to trust it. White on it is **8.53:1**, up from 4.70: the labels got *more*
legible, not less.

## `--ps-accent-h` CARRIES THE BRIGHT STEP BECAUSE THREE THINGS ALREADY READ IT

This is the whole reason the change is four rules instead of twenty, and it was found by
grepping the call sites rather than by deciding the semantics first:

- **`handleStyle` (the `⠿` grip) and `shStyle` (the spacer's `↕ drag`)** read
  `var(--ps-accent-h)`. *The canvas drag grips are CHROME* records why they must have the
  bright step and nothing else: their ground is artwork, near-black **or** near-white, so a
  deep fill reads 1.35:1 on a dark canvas and `--ps-link` reads 1.9 on a light one.
- **`.p-btn` and `.p-gold`** — the primary button — read it as their BASE fill.
- **`exportMainBtnStyle` in `studio-base.js`** reads it, and that file is **shared with
  Organic**. Re-pointing it at `--ps-primary` would have changed Organic's Export button,
  which is out of scope by the standing rule that Organic is a separate consumer now.

So pointing `--ps-accent-h` at the portal blue keeps all five strong with **zero edits**,
including the one in the shared file. Only `--ps-accent` changed value.

## What moved to `--ps-primary`, and the one thing that was scoped

Four rules, all in the appended block:

```
.p-top .p-seg button[data-on]   the studio switcher
.p-prev, .p-prev[data-on]       Preview
.p-top .p-ghost[data-on]        Save while dirty, and Share while open
.p-br-new, .p-cta               the splash's primary — it has no .p-top, and that
                                header row IS its nav bar
```

**The switcher is scoped to `.p-top` deliberately.** `.p-seg` is also the placement
mockup's platform/view toggles (`.p-seg.mk-seg`), which are ordinary selection state and
keep the resting register. Setting it on the base rule would have made them bright.

`.p-top .p-ghost[data-on]` is (0,3,0) and beats `.p-ghost[data-on]` (0,2,0), which is
declared **later** in the sheet — the trap this file already records twice: being last is
not enough against a more specific selector.

## LIGHT IS UNCHANGED BY CONSTRUCTION, and that is provable rather than tested

In light, `--ps-accent` and `--ps-primary` are **both** `#1A2942`, and `--ps-accent-h`,
`--ps-accent-h2` and `--ps-primary-h` are **all** `#2F4960`. So every rule re-pointed above
resolves to the identical value there and not one light pixel moves. Verified: **0 elements
compute the muted register in light.** Light had no loudness problem to fix — Prov Toys says
navy dominates on paper — and the complaint was explicitly about dark.

## THE DEEP FILL STILL HAS NO BOUNDARY OF ITS OWN, AND THE HAIRLINE IS STILL THE FIX

Measured: the muted fill against the rail ground is **2.04:1**, under 1.4.11's 3:1 for a
non-text indicator. The `--ps-link` hairline every dark ON state already carries is what
answers it — **3.38:1 against the fill and 6.89:1 against the ground**, both clear — and the
selected tile's ring was verified present (`rgb(107,165,245) 0 0 0 2px inset`). This is the
identical structural conclusion *Three registers* reached for its deep navy. **Do not "fix"
the 2.04 by lightening the fill; the hairline is the fix.**

## A PROBE TRAP THAT COST A ROUND: THIS PANE'S TIMELINE IS FROZEN, SO EVERY TRANSITION READS ITS START VALUE

Worth more than the check it broke, and it is the counterpart of the existing "reload into a
theme, never toggle into it" rule.

`Save` while dirty computed `--ps-fill` — not the accent, not the primary — while
`el.matches('.p-top .p-ghost[data-on]')` was **true**, that rule was the LAST matching
background rule, it was the MOST specific, `--ps-primary` resolved correctly at the element,
and there was **no inline style**. Every explanation for that is wrong except the real one:

```
document.timeline.currentTime advanced 0ms over 600ms of wall clock
el.getAnimations()  ->  7 CSSTransitions, all playState 'running', all currentTime 0
```

`.p-ghost` transitions `background-color` over .16s. The pane was not compositing, so the
document timeline never advanced, so the transition sat on **frame 0 — its start value —
forever**. The keyframes proved the rule was right all along:
`['rgb(42,42,46)', 'rgb(47,111,224)']`, i.e. `--ps-fill` to `--ps-primary`.

**So finish the transitions before auditing any `[data-on]` fill in this pane:**

```js
document.querySelectorAll('*').forEach(el =>
  el.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish() }));
```

`el.style.transition = 'none'` gives the same answer. Before that, the census reported 12
bright fills and missed Save, Share and the Share panel's Export outright.

**AND THIS IS NOT THE DOCUMENTED rAF-RESTART BUG — checking which one it was is the point.**
*NEVER put a transition on these sheets* records a genuinely stuck transition holding its
interpolated value against every declaration. That is a real defect and this is not it: the
tell is `document.timeline.currentTime` not advancing at all. **Read the timeline before
concluding a transition is stuck**, or you will "fix" a working control by stripping its
transition.

## Verification

| | before | after |
|---|---|---|
| bright fills, editor at rest | 24 | **2** — the switcher and Preview, both in the top bar |
| bright fills with Save dirty, Share open, a component selected | — | 6 — the four top-bar actions, the Share panel's Export, and the selected component's grip |
| muted fills | 0 | 13 — every one a rail selection state or a badge |

The ten canvas grips are `opacity: 0` at rest (`.modwrap:hover` reveals them, and
`handleStyle` sets 1 only on the selected component), so they were never part of the
loudness and they keep the bright step they need to read on artwork.

- **The canvas did not move**: 124/124 artwork-path lines identical to the pre-change file,
  `static PAL` and `static SCRIMS` byte-identical, and **0** chrome tokens in any op
  `fill`/`stroke`/`tint`/`tintFlat`. This pass changed token VALUES in the chrome layer plus
  four chrome rules, so that is expected — it is proved rather than assumed because the
  canvas/chrome separation is what makes a re-skin safe here at all.
- **The sheet parses**: 764 rules, all four new rules present, and `.p-c-p, .p-tpl-c` is
  still the tail rule — the canvas-dark pin the miniatures depend on.
- **Contrast, reloaded into each theme, ancestor opacity composited, transitions finished:
  dark 2, light 4.** Dark is the disabled Undo/Redo pair. Light adds the logotype's orange
  dot at 2.60 and the copy-coverage chip's amber at **3.02:1** — see below. Every dark and
  every recorded light flag is 1.4.3-exempt or the logotype.
- **`web-image-studio.html` carried the identical split**, keyed the same way: its three
  site tabs are in `.p-top` and take the bright blue, `.p-btn` (Export, and Export this tab)
  keeps it via `--ps-accent-h`, and its `.p-ghost[data-on]` toggles drop to the resting
  register. It never had the loudness problem — it has few ON states — so this was for
  consistency between the two re-skinned files. **That file is on Coinbase now and the split
  survived the move intact**, in Coinbase's own values and with its own justification for it;
  the structure below is unchanged. See *THE IMAGE TOOL IS ON COINBASE NOW*.

**FLAGGED, NOT FIXED: the copy-coverage chip fails AA in its amber state.** `--ps-warn`
`#B9781B` at 11px/500 on the paper ground is **3.02:1**, and it only appears once coverage
crosses `COVER_MAX` (40), which is why the earlier light audit recorded three flags and not
four. It is untouched by this pass — `--ps-warn` is not in the accent family — and it is the
same class as the light status colours *The contrast bar was 2.4:1* deliberately left alone,
on the grounds that darkening a status hue is a brand decision. One token if it should move.

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

# CAMPAIGN IS ON COINBASE TOO, AND THE TWO FILES ARE BACK IN STEP

> **The ACCENT is Provident Navy now.** The structure below is what ships and the two files
> are still in step; the blue and the surface tints were replaced one pass later. See
> *THE ACCENT IS PROVIDENT NAVY* at the end of this file.

`Provident Campaign Studio.dc.html` follows **`nexu-io/open-design`,
`design-systems/coinbase`**, with Google Sans Flex kept — the same request, one pass later.
**The token block is byte-for-byte the one in `web-image-studio.html`**, on purpose: the two
were re-skinned together, drifted when this one took the portal grey, and this closes the
gap. One block, one source, and any future nudge lands in both.

`ui-design-system/` still governs **exactly one document — Organic.** This file left the kit
at the Prov Toys pass, so the mirror count does not move.

## THE CANVAS WAS PROVED UNMOVED FOUR WAYS, WHICH IS WHY A RE-SKIN OF THIS FILE IS SAFE

This document holds ~500 colour literals in JS style objects **and** the artwork palette, so
"re-skin the chrome" is one bad grep away from leaking a UI token into a finished ad — the
failure this project has already had once.

| check | result |
|---|---|
| artwork-path lines diffed against the pre-change file (`ops.push`, both renderers, `buildOps(`, `palOf(`, `scrimStops(`, `meas(`, `drawMod(`, `modPx(`, `heroLines(`, `specBox(`, `drawQr`, `inkBox`, `coBox`) | **131 / 131, 0 differing** |
| `static PAL` and `static SCRIMS` | **byte-identical** |
| op signatures over 2 palettes x 3 canvases, PRE served alongside under a `_PRE ` name | **6 groups, 6 identical, 96 ops, 0 threw** |
| chrome tokens in any op `fill` / `stroke` / `tint` / `tintFlat` | **0** |

The op diff went through the React fiber, the documented route: `.p-shell` ->
`__reactFiber$…` -> walk `.return` to `stateNode.logic` -> `.active()`, then
`buildOps(state, vi, sizeKey, assets)` — **which returns `{W, H, ops}`, not an array.**
`localStorage` is the channel between the two loads, and the `_PRE ` copy was **deleted from
the project folder** afterwards rather than left lying in it.

## FOUR JS STYLE OBJECTS HAD TO BE EDITED AT THE OBJECT

An inline style beats every rule, so a token swap cannot reach these — the documented trap.
All four are chrome; none is read by an op, verified by checking each sits in `renderVals`
scope and not in `buildOps`:

- **`handleStyle` and `shStyle`** — the `⠿` grip and the spacer's `↕ drag`. They float over
  ARTWORK, near-black or near-white, so they need the SOLID blue rather than the resting
  tint; and their ink was `--ps-accent-i`, which is **itself blue in light**, so they would
  have been blue on blue. Both halves come from the `--ps-primary` pair now.
- **`badgeStyle`** — the Master plate badge, white ink on what is now a pale tint.
- **`gHandles`** — the graphic's corner handles, also over artwork: a translucent tint
  inside a 2px white ring is not a handle.

`qrStyle`'s `#FFFFFF` was deliberately **not** touched. It mirrors an op — the QR quiet zone
stays white in both palettes — and it is artwork, not chrome.

## EIGHT RULES PUT WHITE INK ON A FILL THAT STOPPED BEING SOLID

The resting state went from a solid accent to a pale tint, so every white ink on it had to
move with it: `.p-tabs button[data-on]`, `.p-dock-t[data-on]`, `.p-share .p-ghost[data-on]`,
`.p-opt[data-on] .p-mini i` (the skeleton bars), `.p-tri-f .p-tri-k` (the slider's marks),
`.p-ws[data-on] .p-ws-s`, plus `badgeStyle` above. **This is the fourth re-skin in a row to
produce this same inversion**, and the answer is the same each time: enumerate every
`--ps-accent-i` / `--ps-primary-i` / `--ps-accent-i-q` reader against its NEW fill, off the
parsed sheet and off the JS objects, rather than guessing which ones matter.

**The three-stop slider follows the selected tile, because this file already holds the rule
that they are ONE treatment** — so its fill went to the tint and its marks to the blue, in
the same edit as the tile's bars.

**A COUNT LEFT THE BLUE FAMILY ENTIRELY.** `.p-tile-c` is information, not a state and not an
action, so it is a quiet neutral chip (`--ps-card` on the `--ps-fill` tile) that reads in
both themes instead of a fifth blue thing in the palette rail.

## THE ON FILL IS OPAQUE, AND THAT IS THE FINDING WORTH KEEPING

It shipped as `rgba(0,82,255,.08)` / `.20` and the audit caught the Scrim tab pair at
**4.48:1** against a 4.5 bar. The cause is general: **a translucent fill measures differently
depending on what is BEHIND it.** Everywhere the tint sat on the page it measured 5.08; inside
the `.p-tabs` track — which is `--ps-fill`, not the page — the same wash composited darker and
took its blue ink under AA with it.

So the tint is now **`#EBF1FF` light / `#0F2147` dark**: the wash flattened over each theme's
own ground. Identical where it already passed, and **backdrop-independent**, which fixes every
nesting including the ones nobody has looked at. **Applied to both files.** A wash is still
right for `--ps-accent-q`, which is a glow and has no ink on it.

## `--ps-link` WAS LIFTED OFF COINBASE'S OWN VALUE, AND A MARK IS WHY

Dark `--ps-link` was `#578BFA`, Coinbase's `--accent-hover` — a derivation from the start,
since the token file gives no dark link. On `--ps-fill` `#282B31` it measures **4.38:1**, and
that is exactly where the spacer tile paints `↕ draggable gap` at 10px. Lifted in the same
hue to **`#6B98FB`**: 5.07 on the control fill, 5.85 on a card, 6.26 as ink on the tint.

**A mark has to clear every surface it can land on, not just the page.** The sweep that looked
for the bug first — every non-`background` property reading `var(--ps-accent)`, in CSS and in
the JS objects — came back **empty in both files**, which is what said this was a value that
was too dark rather than a token used in the wrong role. Worth doing in that order.

## THE CANVAS KEEPS ITS TRACKED CAPS

Coinbase retires the uppercase kicker from the chrome, and this file's own rule is that
**"tracked caps at 500" is a binding ARTWORK rule**. All ten `textTransform: 'uppercase'`
uses in the JS are canvas PREVIEW styles mirroring ops — eyebrows, spec labels, the price
label — and none was touched. The retirement is `.p-cap` / `.p-subcap` / `.p-eye` /
`.p-tpl-s`, i.e. chrome only.

## NOT RE-SKINNED, AND THE REASON IS STILL THE REASON

`.p-c-p` and `.p-tpl-c` stay pinned canvas-dark in **both** themes. Campaign's template cards
are still hand-drawn SKELETONS whose marks are white bars, so a white tile hides them
completely. Organic's miniatures are real renders and needed no pin; these still do. Verified
still `rgb(16,21,27)` in light mode, which is the theme that would break them.

## A DETECTOR FALSE POSITIVE WORTH KNOWING: A RING IS NOT AN ELEVATION SHADOW

The no-drop-shadow check reported 1 survivor — `.p-sw` with an inline
`box-shadow: rgb(0,82,255) 0 0 0 2px`. That is a **state ring at zero blur and zero offset**,
which Coinbase keeps (`--elev-flat` is `none`; rings are affordances). Distinguish them by
offset and blur, not by the absence of `inset`: with that test both files report **0
elevation shadows** in both themes.

## Verification

| | light | dark |
|---|---|---|
| Campaign, editor | **3** — the logotype dot and the disabled Undo/Redo pair | **2** — that pair |
| web image studio | **3** — the dot and the two disabled Export buttons | **2** — those two |

Zero real failures in either file in either theme; every flag is 1.4.3-exempt or the
logotype. **814 rules parse** in Campaign (764 before) and 331 in the image tool, the tail
rule in Campaign is still the canvas-dark pin, and `ui-design-system/`, `studio-base.js` and
`Provident Organic Studio.dc.html` are untouched. `localStorage` on the test origin was left
cleared.

# THE ACCENT IS PROVIDENT NAVY, AND THE SUPPLIED TINT RAMP IS THE NAVY'S OWN

Coinbase Blue `#0052FF` is gone from both files. `--ps-accent-h` / `--ps-primary` are
**`#1A2942`**, Provident Navy, and the surfaces come from a six-swatch ramp the user
supplied — four tints and two shades, each with a role written on it.

## THE RAMP IS DERIVED FROM THE NAVY, AND THAT WAS CHECKED RATHER THAN ASSUMED

This is the finding that made the whole pass coherent instead of a palette swap plus an
unrelated grey ramp:

| swatch | role given | value | is it the navy? |
|---|---|---|---|
| Tint 04 | Field disabled | `#F6F6F7` | navy at **4%** over white — **exact** |
| Tint 08 | Quiet hover | `#EDEEF0` | navy at **8%** — **exact** |
| Tint 12 | Sunken | `#E4E5E8` | navy at **12%** — **exact** |
| Tint 20 | Disabled fill | `#D1D4DA` | navy at **20%** — one channel off by 1 |
| Shade 20 | Fill hover | `#152135` | navy **darkened 20%** — **exact** |
| Shade 36 | Fill pressed | `#101A29` | navy **darkened 36%** — one channel off by 1 |

Four exact matches and two single-channel rounding differences. **So the swatch names are
opacity percentages and the ramp is generative** — which is what let the app take a step
the six swatches do not contain, rather than forcing a role onto the wrong swatch.

## TINT 16 WAS GENERATED, AND THE REASON IS THE ROLE COLLISION

The four named tints already answer four things this app needs — Tint 04 a card's lift,
Tint 08 a quiet control, Tint 12 the sunken stage, Tint 20 the disabled fill. That leaves
**nothing for the SELECTED state**, and reusing one would have made selected and disabled
the same tone, or selected and the stage the same tone. `#DADDE1` is the ramp's own rule at
**16%**: one step stronger than the stage it sits against, with navy ink on it at **10.70:1**.

| light token | value | from |
|---|---|---|
| app / card / sb / deep | `#FFFFFF` | Coinbase `--bg`, unchanged |
| card-h | `#F6F6F7` | Tint 04 |
| fill | `#EDEEF0` | Tint 08 (its own "Quiet hover") |
| fill-h, **stage** | `#E4E5E8` | Tint 12 (its own "Sunken") |
| **accent** — the selected state | `#DADDE1` | Tint 16, generated |
| **fill-dis** | `#D1D4DA` | Tint 20 (its own "Disabled fill") |
| primary / link / focus | `#1A2942` | the navy |
| primary-h / primary-a | `#152135` / `#101A29` | Shade 20 / Shade 36 |

`--ps-fill-h` and `--ps-stage` share Tint 12. That is an accepted reuse, not an oversight:
a hovered control and the stage never touch, and the selected state is told apart from a
hovered one by its **navy hairline and navy ink**, not by its fill.

## "PLAY WITH FILL OPACITY IF THEY LOOK TOO STRONG" — WHAT THAT CAME TO

The navy is a very strong fill: **14.59:1 against white as a block.** That is right for the
ACTION and wrong for a resting state, and it would have put the rails back where the
portal-grey pass found them. So the two registers hold, now expressed on the ramp:

- **the action** is the navy solid, reserved to the top bar (and the splash's own header)
- **the resting selected state** is the navy at 16%, i.e. the same colour at a sixth of its
  presence

That is the "fill opacity" answer, and the ramp is literally an opacity scale, so it is the
supplied system's own mechanism rather than something invented on top of it.

## DARK IS DERIVED, AND SHADE 20 / 36 GO THE WRONG WAY THERE

The attachment is a LIGHT ramp: its tints are the navy laid over **white**, which on a
near-black ground is invisible, and its hover/press shades **darken** a fill that on a dark
ground is already almost invisible. So dark tints toward the INK instead — `#243352` for the
selected state, one step lifted so it still reads as navy against neutral greys rather than
muddying into them — and dark's hover **lifts** to `#22355A`. The neutral shell greys
(`#0A0B0D` stage through `#282B31` control) are unchanged from the Coinbase pass.

`--ps-link` / `--ps-focus` in dark is **`#879CC5`**, the navy lifted into a mark: a navy
hairline on a dark ground would be invisible.

## THE NAVY HAS NO BOUNDARY OF ITS OWN ON A DARK GROUND — FOR THE FOURTH TIME

Measured: `#1A2942` against the dark app surface is **1.25:1**, so as a block it is
invisible and only its white label reads. This project has now recorded the identical
finding for the kit's `#101E39`, for `#2F4C7F`, for Coinbase's tints, and for this — and the
answer has been the same every time. **Every navy fill carries a `--ps-link` hairline**, and
it measures **6.61:1 against the ground and 5.27:1 against the navy**, clear of 1.4.11 on
both sides.

**In LIGHT that same hairline is navy on navy and therefore invisible, which is correct.**
Do not "fix" the asymmetry by lightening the fill; a navy light enough to carry a 3:1
boundary on near-black stops being navy — it lands where `#0052FF` was, which is what this
pass moved away from.

## A CONSEQUENCE WORTH STATING: THE REGISTER GAP COLLAPSES IN DARK

The action (`#1A2942`) and the resting state (`#243352`) are **1.16:1** apart in dark. In
light they are unmistakable — a navy solid at 14.59 against a 16% tint at 1.17 — but in dark
both are navies a step apart and the tonal distinction is nearly gone. The split still does
its job, because the rails are calm and the two registers live in different regions of the
screen and are never compared side by side. If it ever needs to read as a hierarchy in dark,
the one-line change is to give the dark selected state a neutral step (`--ps-fill-h`) and
leave the navy to the action.

## DISABLED IS A FLAT FILL NOW, AND THE ATTACHMENT NAMED THE VALUE

Tint 20's own label is "Disabled fill". A navy primary at `opacity: .4` was a washed-out
navy ghost measuring **2.04:1**; a flat neutral with quiet ink is both unmistakably disabled
and legible — **6.70:1 in light, 9.02 in dark**. That retired the two disabled-Export flags
the image tool had carried since it was built.

**`.p-btn-q` deliberately keeps its opacity.** Undo/Redo are QUIET buttons, and giving them a
flat slab would make them louder disabled than enabled. They stay at 2.02 / 2.60 and stay
1.4.3-exempt.

## Verification

| | light | dark |
|---|---|---|
| Campaign, editor | **3** — the logotype dot and the disabled Undo/Redo pair | **2** — that pair |
| web image studio | **1** — the logotype dot alone | **0** |

Both files improved on their own baseline, and every remaining flag is 1.4.3-exempt or the
logotype. **0 elevation shadows** in both files in both themes (a 0-blur 0-offset ring is a
state affordance, not elevation — distinguish by offset and blur, never by the absence of
`inset`). The preview checkerboard is still pinned at `rgb(11,15,20)`, Campaign's
canvas-dark template pin still holds in light, and **`#0052FF` appears nowhere in either
file** — including in the comments, which were rewritten rather than left describing a colour
that no longer ships.

`ui-design-system/`, `studio-base.js` and `Provident Organic Studio.dc.html` are untouched.
The artwork was not re-checked this pass because it did not need to be: **only chrome token
VALUES changed**, and the four-way proof from the pass before it — 131/131 emitters
byte-identical, `PAL` and `SCRIMS` byte-identical, 6/6 op-signature groups, 0 chrome tokens
in any op colour — still holds by construction.

# Provident campaign rules (user-set, binding)

- Google Sans Flex is the ONLY font. **Headers are Regular 400** (hero, price figure, property title, agent/reviewer names). **Everything else is Light 300**, including the wordmark, hook, body, spec values and CTA labels. The single exception is **tracked caps at 500** — eyebrows and the small labels that share that role.
- **No second typeface and no highlight feature.** Source Serif 4 and the single-word serif emphasis are removed: `heroLines` emits one run, and the emphasis span renders as plain 400 copy so old sessions carrying a `serif` word still lay out correctly.
- **Gold and brass are minimised.** No gold in canvas output at all — `PAL.accent` and `PAL.ruleGold` resolve to cream on dark and slate on light, so rules, bullets and chips are neutral. Gold survives only as UI chrome: the primary action button and active states. Brass #B0905C is retired as the panel caption colour (now a neutral grey).
- Orange #F3793C never appears on navy/dark backgrounds — light backgrounds only.
- 9:16 reels/stories: campaign canvas margins in px at 1080×1920 — **left 100, top 260, right 100, bottom 460** — so platform UI never covers copy. Retraced off live Facebook Reels ads that WERE being overlapped, then confirmed by a supplied UI-mockup SVG (which puts the bottom at 466 against this 460). The like/comment/share rail is reserved separately, as **`railR: 170` on the BOTTOM CLUSTER only** — not as a margin, because the rail covers only the lower two-thirds and a margin would narrow the top cluster and shift the whole design off centre. See *The 9:16 margins ARE the Reels safe area*. 1:1 ads: 80px margin all sides.
- All ads run a full-bleed background image; modules cluster top/bottom leaving a clear image window (centre, top, or bottom).
- Logo: main "provident." wordmark only (no sub-brand lockups); placed left or centre, never right.
- QR code: small rounded-rectangle placeholder in a bottom corner — visible, never dominant.
- Kicker bars: hairline-framed or rule-flanked, never solid fills (solid reads as a CTA).
- Image-first ratio: the image always outweighs text — modules/copy cover at most ~40% of the canvas; keep only essential elements (headline, one hook/spec, CTA, logo, QR), cut the rest.
- Meta-ads type scale: minor third ×1.200 from the 2.2cqw floor — steps 2.2 · 2.6 · 3.2 · 3.8 · 4.6 · 5.5 · 6.6 · 7.9 · 9.5 cqw (≈24px floor at 1080). No off-scale sizes, nothing under the floor. Eyebrows/tags 2.2–2.6, body 2.6–3.2, hooks 3.2–3.8, headlines 5.5+.

# Organic post rules

- Feed 3:4 is 1080×1440 with 80/90px margins; story 9:16 is 1080×1920 with a 200px top margin so platform UI stays clear of the copy.
- Layouts are fixed per template — the studio exposes fields, not free positioning. Nothing should drift off the grid. **The award card insets its text column 30px INSIDE the margin (110 on the feed), and that is not a grid violation** — the rule is about content escaping the margin, and both the SVG and the finished render agree on 110. See *A FIFTH TEMPLATE*.
- Scrims cover only the text areas (plus ~20px breathing room), fading out ~60px beyond — never the whole photo. **Three kinds carry no ADJUSTABLE wash and the rail's control disappears with them** (`scrimUsed`): the paper kinds `tacover` and `tagent`, which take none at all, and `review`, whose wash is now the supplied drawing's own FIXED navy ramp — one full-canvas gradient, transparent to y 720 and solid by 1283, emitted from `REV.scrimTop` / `REV.scrimFull` so the story follows. A slider over a fixed ramp is a control with nothing to set. The `listed` card keeps one band behind its wordmark and status — it was briefly removed on the reasoning that they sat on black, but that black was a photograph a bad 4:3 crop had cut away.
- Property and weekly-listing slides require their own QR code and a listing number; export is blocked until both are present. **There is NO eleven-digit rule anywhere any more** — first the weekly property page and then the `listed` card went to numbers only, as many as the listing has, and every gate asks whether a number is there rather than how long it is. See *THE WEEKLY LISTING NUMBER HAS NO LENGTH RULE* and *SIX FIXES ON THE LISTED CARD*. On the **weekly** template the QR is 220x220 with a 6px white quiet-zone ring and 4px corners (centred above the bottom margin on the cover and closing slide, bottom right on the property page) — the `listed` card keeps `tk.qr`'s 250 at r8. The "small rounded rectangle in a bottom CORNER" line in the campaign rules is a campaign rule; organic layouts are template-owned, and these three are drawn.
- Top-agent slides need a full-bleed studio portrait each, and the blurb is capped at 40 words. **The cap's stated reason is obsolete twice over** — there is no gold ranking numeral (the brass is the place badge) and the numeral now sits BEHIND the glass panel rather than beside the blurb, so it clears nothing. Keep the number, which is a sensible panel-height rule; the justification is what has expired.
- Photos are stored at export-grade resolution (up to 2560px on the long side) so a 2160px export stays sharp; feed and story share one photo per slide.
- Exports write **flat** — one file per slide per size, told apart by a `_3x4` / `_9x16` suffix, not by folders. **The story is only included while its canvas is shown** (the Show story 9:16 toggle in the canvas bar); hidden, only `_3x4` ships. The PDF is **feed pages only**, and always has been.

## Files in this folder

| file | what it is |
|---|---|
| `Provident Campaign Studio.dc.html` | the Campaign Ad Studio |
| `Provident Organic Studio.dc.html` | the Organic Post Studio |
| `studio-base.js` | `StudioBase`, shared by both — ONE copy |
| `runtime.js` | storage stand-in, Safari fallbacks, the one image encoder |
| `image-slot.js` · `support.js` · `_ds/` · `fonts/` | shared, unchanged by the split |
| `web-image-studio.html` | the standalone website photo tool (its own app) |
| `ui-design-system/` | the chrome design system — the one place to change it |
| `.image-slots.state.json` | the photo store, shared by both studios |

Both `.dc.html` files must sit in **this folder**: every path they use is relative, and the
cross-studio hand-over navigates to the other by bare filename.

## Reference files

- `reference/Provident Ad Design System.dc.html` — the ad design system
- `reference/Variables Explorer.dc.html` — brand variables
- `reference/Template Overview.dc.html` — organic template overview
- `figma-kit/` — SVG module + template kit and `provident-variables.tokens.json`

# THE KIT IS THE SOURCE OF TRUTH AGAIN, AND IT HAS THREE CONSUMERS

`ui-design-system/` was rewritten to what `Provident Campaign Studio.dc.html` ships, and the
propagation contract is restored: **a change here reaches Campaign, Organic AND
`web-image-studio.html` in the same pass.** The mirror count is back to three. All three had
left the kit at some point — the image tool and Campaign for Prov Toys and then Coinbase,
Organic never having moved — so this is the kit catching up to its own best consumer and then
becoming upstream of it.

## What the library now is

| | |
|---|---|
| structure | `nexu-io/open-design`, `design-systems/coinbase` — radius scale, ring-not-shadow elevation, foreground focus ring, weight hierarchy, 150ms motion |
| colour | **Provident Navy `#1A2942`** and a tint ramp that is the navy's own |
| type | Google Sans Flex — the one thing that never moved |

**THE RAMP IS GENERATIVE, and that is the most useful fact in the file.** The supplied tints
are the navy laid over white at exactly 4 / 8 / 12 / 20 percent and the shades are it darkened
by 20 / 36 — verified, four exact matches and two channels off by one to rounding. So any step
the app needs comes from the same rule, which is where **Tint 16 `#DADDE1`** came from: the
five named steps were all spoken for, and reusing one for the SELECTED state would have made
selected and disabled, or selected and the stage, the same tone. **Do not add a grey that is
not on this ramp** — a neutral grey beside a navy tint reads as a different system.

## THE PROPAGATION REPORT, measured rather than asserted

Computed `--ps-*` sets dumped from all four documents in dark and diffed against the kit:

| | tokens | match the kit | differ | missing |
|---|---|---|---|---|
| Campaign | 73 | **73** | **0** | 0 |
| web image studio | 66 | 63 | **0** after this pass | 9 |
| **Organic** | 69 | 13 | **56** | 4 |

The image tool's 9 are legitimately app-specific — `--ps-dockpad`, `--ps-qr`, `--ps-railc`,
`--ps-railr` are studio geometry it has no equivalent of, and five are legacy aliases it never
needed. Its one real drift was `--ps-blue`, which the kit re-points at `--ps-accent-h` (the
solid) while it still pointed at `--ps-accent` (the tint): ~34 of that alias's call sites are
fills on an action, and the resting tint leaves those near-invisible. Closed.

> **DONE — see *ORGANIC IS ON THE KIT* at the end of this file.** Organic now measures
> **0 differ / 0 missing** against the kit across all 73 tokens in both themes, with one
> deliberate exception (`--ps-railr`). The paragraph below is the record of what was owed.

**ORGANIC WAS 56 TOKENS BEHIND.** It is still wholly on the pre-Prov-Toys kit,
so this is a re-skin rather than a propagation, and it carries three things the other two did
not: its five locked templates' canvas previews, the `.gd-*` guided run (which no other
document has), and the guided setup being a **projection of the advanced rail**, which must
change in the same pass. `OrganicStudio.ART` must be proved unmoved the way Campaign's was.

## FOUR DEFECTS THE LIBRARY'S OWN SELF-TEST CAUGHT

`index.html` prints a live contrast ratio per ink-bearing token per theme, so a number it
prints is a number it cannot quietly ship below. It earned its keep here — all four of these
were invisible to the per-app audits, because the apps do not currently render those chips:

- **The navy solids printed `1.00:1 FAILS`.** The `fill` role's ink fallback was
  `--ps-accent-i`, which is now the ink for the resting TINT and is therefore the navy itself
  in light — so the page measured navy on navy and cried wolf about its own primary. Every
  solid fill in this system carries `--ps-primary-i`; only `--ps-accent` has its own ink.
- **`--ps-brand` was declared as a fill.** It has exactly one reader now — the wordmark's
  period — and a logotype carries no contrast requirement. It has a `logo` role, bar 0.
- **Light `--ps-bad` failed on its OWN wash**: `#DC2626` is 4.83:1 on white and **4.14 on
  `--ps-bad-q`**. I had measured it against the ground. `#C81E1E` gives 4.91.
- **Both DARK status tiers failed the same way** — good 4.36, bad 4.25 on their own washes.
  Lifted at their own hues, and each wash recomputed FROM its new ink so the pair stays
  internally consistent.

**A status ink is read on its own wash, not on the page.** That is the third time this exact
nesting error has appeared in three passes (the `.p-tabs` ON state, then light `--ps-bad`, then
both dark tiers). Measure an ink against the ground it actually sits on.

Result: **zero fails and zero large-only in BOTH themes**, with three exempt (two skeleton
modifiers and the logotype).

## `--ps-EASE` CHANGED MEANING AND KILLED TEN TRANSITIONS

The single worst thing this pass found, and it was mine. The kit declared
`--ps-ease: .16s ease` — duration AND easing — and ten rules named it alone as a transition's
whole timing. The Coinbase pass redeclared it as a bare `cubic-bezier(0.2,0,0,1)`, which
**silently removes the duration**: the shorthand's first `<time>` is the duration, and with
none the transition runs at 0s and never animates.

Proven rather than reasoned — `.p-tile-a` in Campaign computed
`transition: opacity cubic-bezier(0.2, 0, 0, 1)`, i.e. no duration, so the palette tile's
hover fade had been dead since that pass. Organic still worked only because it had not been
propagated to yet, and would have broken the moment it was.

The names are honest now — **`--ps-motion` is the time, `--ps-ease` is the curve — and every
call site passes BOTH.** A token whose value is a compound shorthand is a token whose meaning
can be changed by a substitution that looks purely cosmetic.

## Other structural changes, all mirroring Campaign

- **The pill is back** on every labelled action (`--ps-r-ctl` is `9999px`). Checked first that
  every `--ps-r-ctl` reader is a labelled control — **`.p-in` read it and would have become a
  capsule**; a field is not a CTA and takes `--ps-r-field` 8px.
- **Body is 16/400/1.5**, reversing the Light 300 body of two earlier systems. 600 is a button
  or a caption, 400 is everything else, 300 is gone.
- **The tracked-caps kicker stays retired** — this was the kit's own no-all-caps rule, which
  one system reversed and Coinbase restores. **The CANVAS keeps its tracked caps**: that is a
  binding artwork rule and every `textTransform:'uppercase'` in the studios is a canvas preview
  mirroring an op.
- **Two more inversions in the library itself**: `.p-btn` inked with `--ps-accent-i` (navy on
  navy in light), and the selected tile's diagram bars and the slider's stop marks were white
  at 92% — invisible the moment the fill became a pale tint. All three take the fill's own ink.
- **The focus ring is the FOREGROUND colour**, 2px at a 2px offset, so it inverts with the
  theme and cannot fail on any ground.
- **Disabled is a flat `--ps-fill-dis`**; `.p-btn-q` keeps its opacity, because it is the quiet
  button and a flat slab would make it louder disabled than enabled.
- **`index.html` is light-first**, matching all three consumers, and its prose says so.

## A COUNT THAT LOOKS LIKE A TRUNCATION AND IS NOT

`provident-ui.css` parses **148 top-level CSSRules** for 1088 lines, which is exactly the
signature this file warns about for a scripted CSS edit swallowing a sheet. It is the baseline:
a brace walk gives **158 top-level blocks, final depth 0** in both the pre- and post-change
files, delta 0. Check the brace balance against the baseline before believing a rule count.

# CAMPAIGN'S PALETTE RAIL WAS REDESIGNED TO A FIGMA FRAME

`Provident Campaign Studio.dc.html`'s left rail follows **UI-Kelvz / the `Aside` frame**
(`figma.com/design/y50w2SoYG86FPAMC0tpfzR`, node 1-2). Read in Dev Mode through the user's
own Chrome session rather than eyeballed from an image — the Figma connector needs an
interactive OAuth this session cannot run, and Claude-in-Chrome already carried the login.

## EVERY COLOUR IN THE FRAME WAS ALREADY A TOKEN, and that is the headline

Measured off the frame, not inferred: ground `#131519` is **`--ps-app`**, the group stroke
`#949AA6` at 16% is **`--ps-hair` exactly**, the card fill `#282B31` is **`--ps-fill`**, the
group label `#949AA6` is `--ps-dim`, the card name `#FFFFFF` is `--ps-ink`, the eyebrow
sample `#C3C8D0` is `--ps-ink-2`, and the spacer's dashed pill `#879CC5` is `--ps-link`.

**So this is a STRUCTURAL change expressed entirely in the existing palette** — no new
colour, and both themes come for free. That is also the check that the design and the token
system are the same system.

| | frame | shipped |
|---|---|---|
| group container | 229 wide, **no fill**, 1px inside hairline, r16, pad 10, gap 7 | same |
| component card | `--ps-fill`, r10, pad 8×10, gap 6 | same |
| group label | 11/500 at 150%, `--ps-dim`, sentence case | same (`.p-grp-w > .p-cap` already said this) |
| count pill | 10/500 white | 10/500 on `--ps-fill-h` — see below |
| rail | 261 total / **229 content** | **272 total / 229 content** — see below |

## THREE CHANGES IN SUBSTANCE, not in styling

- **The group heading lost its ORDINAL and its descriptor.** It was `1 · LEAD-IN` +
  "reads first"; it is `Lead-in`. The number implied a required order the palette does not
  own — the clusters decide order — and the descriptor repeated what the cards under it
  already show.
- **The COUNT moved from the card to the group row.** `.p-tile-c` was absolutely positioned
  on each card and reported per TYPE; `.p-grp-c` sits in flow at the end of the heading and
  aggregates its members, so it answers the question the heading raises. `cat()` sums the
  members' own `count`.
- **A group became a contained, outlined box** rather than a band with a seam. This partly
  reverses the panel-rhythm pass, at the frame's own radius and padding rather than the card
  treatment that pass removed. **No fill: the hairline is the whole boundary.**

## THE RAIL IS 272, NOT THE FRAME'S 261, AND THAT IS THE ONE DEPARTURE

A static frame has no scrollbar. What the frame actually specifies is a **229 content
column**; this rail scrolls, Chrome takes 11px, and 261 delivered only 218 — at which one
descriptor clipped by 5px. 272 = 229 + 32 padding + 11 scrollbar, so the column the design
specifies is the column that ships. Verified: group width **229**, exactly the frame's.

**Take the content width from a design, never the frame width, whenever the real element
scrolls.**

**Two values here are inferred rather than measured, and are the ones to correct first if
they look wrong:** the descriptor's size (11 → **10px**; I could not select that text node in
Dev Mode, and the frame plainly fits every descriptor on one line, which 11px does not), and
the count pill's fill. The frame's pill carries WHITE text, so its fill is dark — but
`--ps-card` is white on a white rail in light and the pill vanished. `--ps-fill-h` is the one
token meaning "a step up from the surface": `#31353C` + white in dark (12.31:1, matching the
frame) and `#E4E5E8` + near-black in light (15.63:1).

## THE PILL RADIUS HAD BROKEN THREE THINGS, AND MY OWN AUDIT MISSED THEM

`.p-tile` read `var(--ps-r-ctl)`, which the Coinbase pass made `9999px` — **so every palette
card in Campaign had been a capsule**, and the same rule in the kit made `.p-tile` and
`.p-icons` capsules there. Both are named in this file's own rules as things that must never
be pills (`.p-icons` is a grid container; a card is not a button).

**I claimed to have "checked that every `--ps-r-ctl` reader is a labelled control" and that
claim was false**: the grep was single-line and all three rules span lines. `.p-in` was
caught only because it happened to be on one line. **Grep across line breaks whenever a
token's VALUE changes shape** — a radius going from `10px` to `9999px` is not a cosmetic
substitution, it is a change of kind.

Fixed: Campaign's and the kit's `.p-tile` take the frame's **10px**; `.p-icons` takes
`--ps-r-sm`. Organic reads the same rule but is still on the old kit where `--ps-r-ctl` is
10px, so it is correct there today **and will break the moment it is propagated to** — the
fix has to travel with the token set.

**10px is off the 8/16 scale**, and that is a real loose end: the frame specifies it for a
component card and two rules now carry it as a literal. Either it becomes a named step or it
should snap to `--ps-r-sm`. Flagged, not decided.

## A MEASUREMENT TRAP: height / line-height OVER-COUNTS LINES

My overflow probe reported three previews wrapping to two lines. They were not: the elements
carry their own padding, so `boundingRect.height / lineHeight` reads ~2 for a single padded
line. **`scrollWidth > clientWidth` is the real overflow test** — it reported zero, and the
render agreed.

## Verification

- Group width **229**, rail 272, card 207, all radii and paddings as the frame states.
- **Zero clipped rows and zero overflowing previews**, measured by scrollWidth.
- Contrast, reloaded into each theme, ancestor opacity composited: **dark 2, light 3 — and
  NONE of them in the rail.** The flags are the disabled Undo/Redo pair and the logotype dot.
- `cat.hint` and `p.countOn` are gone from the markup. `.p-tile-c`'s five CSS mentions now
  match nothing and are left alone by the standing rule that a selector matching nothing
  costs nothing; the per-item `countOn` render key is likewise unread now.
- `ui-design-system/index.html`, `provident-ui.tokens.json`, `studio-base.js` and Organic are
  untouched by this pass; `provident-ui.css` changed only for the two radius defects above.

# THE TOP BAR AND THE LAYOUT RAIL WERE REDESIGNED TO TWO MORE FIGMA FRAMES

Two supplied frames from the same file the palette rail came from — **UI-Kelvz**
(`figma.com/design/y50w2SoYG86FPAMC0tpfzR`): the **`Header`** at node `1-1338`, 1990 x 55,
and the **Layout rail's `Container`** at node `1-935`, 320 x 1170. Read in Dev Mode through
the user's own Chrome session, the same route the `Aside` frame needed — the Figma connector
still cannot OAuth non-interactively.

## THE HEADLINE IS HOW LITTLE MOVED, AND THAT IS THE RESULT

Measured live against both frames, the following were already **exactly** what ships: the
group's 15/16 padding and 9px gap, the tile row's gap 8 and the tile column's gap 4, the
tile at 62px on a 16px radius, `--ps-accent` `#243352` as the selected fill, the 11.5px
tile label, a 13/600 `--ps-ink-2` section header over a 13/400 `--ps-ink` group label at
19.5px leading, buttons at 14/600 with +0.16px, the `--ps-hair` edge-to-edge seam, the 4px
`--ps-line` slider track with its `--ps-link` thumb, the 15px bar icon, the
`--ps-link`-at-16% info disc, and the wordmark at 79px with its orange period. **Every
colour in both frames is a token this system already declares.** Two frames of a
four-column workspace and the whole delta is the list below.

**READ THE FRAME'S DIMENSION BOX AS THE CONTENT BOX.** Figma's Dev Mode diagram shows the
CONTENT box in the dashed rectangle with the paddings around it, so the rail's `288 x 1140`
plus `12/16/18/16` is a **320-wide** frame, not a 288-wide one. Getting this backwards for
twenty minutes made a 140px tile look impossible in a 256 column. The check that settles it
is any child with margins: the wordmark reads `75 x 15` with `padding: 0 2px` and 16 left /
1895 right, and 16 + 75 + 4 + 1895 = 1990 exactly.

## WHAT ACTUALLY CHANGED

| | was | frame |
|---|---|---|
| `.p-top` | 54 tall | **55** |
| every top-bar control | 29 (`.p-btn-q`) · 31 (`.p-prev`) · 35 (`.p-seg`) · 36 (the rest) | **36, all of them** |
| the switcher track | pad 2, 1px `--ps-hair` | **pad 3, no edge** (dark only — see below) |
| Projects · Source folder · Save | three separate pills | **one outlined capsule with 1px rules** |
| `.p-sec > .p-cap > s` | not pushed right | **`margin-left:auto`** |
| `.p-grp` bottom padding | 15 | **16** |
| the selected tile's ring | 2px | **1px, then none at all** — see the last section |
| the selected tile's label | 400 | **500** |
| the Layout rail's content column | 277 | **288** |

**ONE HEIGHT FOR THE WHOLE BAR IS THE change with the most effect for the least edit.** Four
heights in one row is what made that bar read as assembled rather than designed, and nothing
in it needs `.p-sm` — that modifier means 29 and belongs inside a rail group, which is a
different context with a different reason.

**THE BAR ICON WAS ALREADY RIGHT and is worth recording because it looks wrong written
down.** The frame's icons draw **10.6px of ink**, which is a 15px em at Material's ~0.71 ink
ratio and is exactly a 14px label's cap height. Both studios ship 15px. An icon matched to
the cap height rather than to the em is why a 36px bar does not read as crowded.

## THE DELIVERY TRIO IS ONE OUTLINED GROUP — `.p-tgrp`

Three separate pills with three separate fills, for one job, and the widest run of chrome in
the bar. The frame makes them one hairline capsule with 1px vertical rules between the
cells: the group says "this is where the project lives" and the rules say where one control
ends. The cells give up their own fill, so the group's outline is the only boundary and the
hover is the only fill — **which is the surfaces-not-strokes rule arriving at the same
answer from the other side**, and it removes two fills while adding one outline.

`overflow:hidden` is what clips a cell's hover to the capsule at the two ends. A cell keeps
`.p-ghost`'s type, ink, icon gap and 36px row; only the surface and the corner come off.

**`sc-if` IS REMOVED AT RENDER AND ITS CHILDREN ARE HOISTED**, which is what makes the child
and adjacent-sibling selectors safe here — the Source-folder cell sits inside
`<sc-if folderOn>`, so a surviving wrapper element would have broken both `>` and `+`.
Verified rather than assumed: **0 `sc-if` elements in the rendered bar, and that button's
parent is `header.p-top`.**

## THE RAIL DELIVERS THE FRAME'S 288 COLUMN, AND THE SCROLLBAR IS WHY 320 IS NOT ENOUGH

A static frame has no scrollbar. What the frame specifies is a **288 content column**, and
measured live, `width:320px` plus the 1px seam gave **277** — Chrome takes 11px for the bar
this rail always shows. So `.p-rail-r` is **331 + 1** and `--ps-railr` moved to **332**:
288 + 32 padding + 11 scrollbar + 1 seam, exactly as the palette rail's 272 = 229 + 32 + 11.
The tile row lands on the frame's **140** each.

**`--ps-railr` HAD TO MOVE WITH IT.** The dock's right offset is
`calc(var(--ps-railc) + var(--ps-railr) + 28px)`, so leaving the token at 321 would have put
the dock 11px off the stage's edge.

**AND THE COST IS REAL, so it is the one thing here to overrule if it is not wanted:** the
stage gives up 11px. Nothing was clipping at 277 — checked, and the only overflow anywhere
in that rail is `.p-tri-f`, which is the three-stop slider's own clipped mark layer. This is
the design's column being delivered, not a defect being fixed. The palette rail's case was
forced (a descriptor was losing 5px); this one is consistency.

## FOUR THINGS THE FRAMES DO NOT GET

- ~~**THE SELECTED TILE'S RING KEEPS `--ps-link`, and takes only the frame's WEIGHT.**~~
  **WRONG, AND SUPERSEDED THE SAME DAY — the frame draws NO border on that tile and the ring
  is gone entirely.** See *A SOLID NAVY FILL CARRIES NO STROKE* at the end of this file.
  What this bullet reported as a 1px `#FFFFFF`-at-20% edge is the skeleton BAR inside the
  tile: I read it off Dev Mode's "Selection colors" list, which summarises every colour in
  the node's SUBTREE rather than the node's own properties. The tile's own Style block is
  `border-radius` and `background`, nothing else.
- **THE SWITCHER TRACK KEEPS ITS EDGE IN LIGHT, and I shipped that wrong for one round.**
  The frame's argument for dropping the hairline is that `--ps-card` on `--ps-app` is a full
  step of surface — true in dark, and **false in light, where `--ps-card` IS `--ps-app`**.
  Dropping it left the track at **1.00:1 against its own bar**, an invisible trough. Light
  therefore takes `--ps-fill` and keeps the hairline (1.16 and 1.22 against the bar); dark
  takes the frame verbatim. **A DARK FRAME'S REASONING ABOUT A SURFACE STEP HAS TO BE
  RE-MEASURED IN LIGHT BEFORE IT IS APPLIED THERE** — this system's tints are near-white on
  a white ground, so "the fill carries the boundary" is a claim about one theme only.
- **The 16:9 Scaling row stays.** The frame draws only `1:1` and `9:16`. Campaign has three
  canvases, and an omission is not evidence of absence — the rule this file already records
  for the frames that drew no top chrome.
- **`#616161` at 20% is read as `--ps-hair`.** The Header's group outline is drawn in that
  grey where the `Aside` frame's group stroke was `#949AA6` at 16% — `--ps-hair` exactly.
  Two hairline greys for one job in one file is drawing slop, not a second token; the
  composited difference is 35 against 40 of 255.

## TWO DEFECTS THE PASS TURNED UP, NEITHER FROM THE FRAMES

- **The guide's `.p-tile-c` was 1.00:1 in light — navy on navy — and its own self-test is
  what caught it.** The badge filled with `--ps-accent-h` (a SOLID) and inked with
  `--ps-accent-i`, which is the ink for the resting TINT and is therefore the navy itself in
  light. **Fifth time this system has produced exactly this inversion.** The rule is written
  down — every solid fill carries `--ps-primary-i`; only `--ps-accent` has its own ink — and
  it still has to be applied by hand at every reader. Campaign's copy of the class is dead
  markup, which is why only the guide flagged it.
- **`.p-prev` was the last place in the library still painting Preview ORANGE.** Both
  re-skinned documents moved it when orange stopped being a fill; the kit kept the old
  `.p-prev,.p-sw-studio` pair. `.p-sw-studio` is now the only orange fill in the library, it
  appears in neither frame, and it is **flagged rather than changed**.

## THE LIBRARY GAINED `.p-seg` AND A REAL TOP-BAR SPECIMEN

`provident-ui.tokens.json`'s rule 31 records four classes the library only ever RINGS —
`.p-tile`, `.p-seg`, `.p-nav`, `.p-nav2` — with real rules and real markup in both studios,
nothing in the library, and therefore no specimen. Adding an override for `.p-top .p-seg`
while leaving `.p-seg` undeclared would have made the file describe a control it does not
define, so **`.p-seg` now has a base rule, measured off the running studio** (track
`flex:0 0 auto`, button 30px at 7px 14px, `nowrap`, and the ON state's own 1px `--ps-link`
ring). Two of the four are still open.

**AN INLINE OVERRIDE ON A SPECIMEN IS THE TELL THAT THE CLASS DOES NOT WORK AS DECLARED, and
the first attempt at this one was exactly that.** `.p-top` was declared in the library with
no specimen at all, so the segmented pair was mounted in a `.p-top` wrapper carrying inline
`height:auto;padding:0;background:none;border:0` — and the guide-versus-studio diff
immediately reported **six differences on a class that was fine**. It is a real top bar now:
wordmark, switcher, group, toggle, Undo, Redo, Preview, no overrides.

## VERIFICATION

- **Contrast, reloaded into each theme, transitions finished, ancestor opacity composited,
  and diffed against a `_PRE` copy served alongside:**

| | dark | light |
|---|---|---|
| Campaign | **3, identical to PRE** | **4, identical to PRE** |
| web image studio | **0** | **1** |
| Organic | **3, identical to PRE** | **3, identical to PRE** |
| the guide | **0 self-test fails, 0 large-only** | **0 / 0** |

  Campaign's dark three are the disabled Undo/Redo pair plus the splash's `▦` nav glyph at
  4.45 — **present in the PRE build at the same value**, so it is this project's baseline and
  not this pass. Light adds the logotype's orange period at 2.76 and the copy-coverage chip
  at 3.75 in its amber state, which this file already flags as one token if it should move.
  **Zero new failures anywhere.** Elevation shadows: 0 in Campaign, the image tool and the
  guide's own components; Organic's 3 are its canvas plates on the old kit, identical to PRE.

- **Guide against Campaign, 13 component roles, computed values:** 15 differences down to
  **7, and all seven are provably inert.** Three are `justify-content` where the measured
  free space is **between −0.48px and +0.38px** — there is nothing to distribute, because
  Campaign's `.p-ghost` never declares it and the boxes are content-sized. One is
  `flex:0 0 auto` against `0 1 auto` in a row that never shrinks. Three are `.p-mini`
  centring on the base in Campaign and on the `.p-mini-i` modifier in the library — the
  documented equivalent-implementation case. `.p-prev`'s 14px line box WAS closed to
  `normal`: this file's base rule uses the `font` shorthand, which sets leading as a side
  effect.

- **Sheets parse and nothing was swallowed**: Campaign 848 rules (830 before), the image
  tool 348, Organic 868, the library 175 of 178 authored blocks — the three missing are
  `-moz-`-only blocks Chrome drops, which is the documented baseline. All four brace-walk to
  depth 0 with matched comment delimiters, **one closing style element each**, and the
  library still parses **1 `CSSFontFaceRule`**, so the star-slash trap is not reintroduced.

- **The canvas was not re-checked and did not need to be.** This pass changed chrome
  component rules and one width; no line containing `ops.push`, `buildOps(`, `palOf(` or
  either renderer was touched in any file, and `--ps-*` reaches no op. The four-way proof
  from the Provident-Navy pass still holds by construction.

## PROPAGATION

Section 18 of `ui-design-system/provident-ui.css` is upstream; the three consumers carry it
as one appended block each.

| | took |
|---|---|
| Campaign | all of it, plus the `.p-tgrp` markup wrap and the 332 rail |
| web image studio | the bar (55, 36, the track, `.p-ico-o`), the band's 16px bottom, `.p-tgrp` as a base rule it does not use |
| Organic | the bar, the band's 16px bottom, and the `.p-tgrp` markup wrap — **the top bar is the same markup in both documents, so the wrapper had to land here too** |

**NOT propagated, and why:** the option-tile rules (the 1px ring, the 500-weight label).
There is **no `.p-opt` in Organic's markup at all** and none in the image tool's, so they
would match nothing. They travel with the token set when Organic's re-skin lands.

**A CORRECTION I MADE MID-PASS, and it is this file's own rule biting me.** I first wrote
that Organic's band padding could not be propagated because its rails were on the pre-band
rhythm — `.p-grp` at `gap:5px` with no padding and no seam. That was read off the FIRST
`.p-grp` declaration instead of the winner: `.p-sec > .p-grp` carries `padding: 15px 0` 350
rules later and the full-bleed pair 70 after that, so Organic's group computes **15px 16px
with a `--ps-hair` seam and a 9px gap — the kit's band exactly.** Check the winner, not the
rule. These sheets all end in override blocks and that is why this file says so twice
already.

**AND THE SAME TRAP, IN ITS SPECIFICITY FORM, ate the first attempt at the band padding.** A
bare `.p-grp{padding-block:15px 16px}` declared last still loses to `.p-sec > .p-grp`
(0,2,0) declared 340 rules earlier — measured after the first edit, the computed padding was
still 15px top AND bottom. The shipped selector lists both forms. It stays weaker than
`.p-dock-b > .p-grp`, so a panel's group keeps its own 13px rhythm — verified at 13px 14px
with the dock open.

# A SOLID NAVY FILL CARRIES NO STROKE

By explicit design decision, made in the UI-Kelvz frames themselves: *"i simply remove the
strokes on the blue buttons."* Re-read on the current file — both frames had been edited
since the pass above — and confirmed at the node level:

| | the node's own Style block |
|---|---|
| the selected option tile | `border-radius: 16px; background: #243352` — nothing else |
| the switcher's ON half | `border-radius: 9999px; background: #1A2942` — nothing else |
| Preview | `border: 1px solid rgba(0,0,0,0)`, i.e. **explicitly transparent** |

## THE MISREADING THAT PUT A RING THERE FOR ONE ROUND

**Dev Mode's "Selection colors" is a summary of every colour in the node's SUBTREE, not a
list of the node's own properties.** The tile's entry included `#FFFFFF · 20%`, I read that
as a 1px white border on the tile, and built a whole measured argument on it — that the
frame's white-at-20% composites to `#4C5465` and fails 1.4.11, so the *weight* was the
frame's and the ink should stay `--ps-link`. That 20% white is the **skeleton bar inside the
tile**: clicking it directly returns `53.19 x 6px`, radius 9999, `background: #FFFFFF 20%`.

**Read the node's Style block. "Selection colors" tells you what is in the subtree.**

## THIS REVERSES A RULE RE-DERIVED ON FOUR SUCCESSIVE ACCENTS

So the measurement stays on the record rather than being quietly dropped. Measured live in
dark, after the change:

| | |
|---|---|
| selected fill against the rail | **1.45:1** |
| selected fill against the UNSELECTED fill | **1.13:1** |
| selected label against the rail | 18.28:1 at weight 500 |
| unselected label against the rail | 10.87:1 at weight 400 |
| selected label against unselected label | **1.68:1** |

Every previous pass answered the first row with a `--ps-link` hairline and wrote *"do not
lighten the fill; the hairline is the fix."* The hairline is gone; the fill is the whole
treatment.

**WHAT MAKES IT DEFENSIBLE RATHER THAN MERELY INSTRUCTED:** the state is carried by the
LABEL — `--ps-ink` at 500 against `--ps-ink-2` at 400 — and text is governed by 1.4.3, which
both sides pass at 18.28 and 10.87. So the information is conveyed by something that
measures, and the fill is decorative. **The corollary is the thing to hold on to: a control
that fills with navy and carries NO label needs its boundary back.**

**AND THE HONEST COST, which is the 1.13:1 row.** With the ring gone, the two tiles differ
mostly in HUE at nearly equal lightness — a navy against a neutral grey — plus the label. A
viewer who loses hue loses most of it. If it ever needs more presence without a stroke, the
lever is the FILL's lightness, not a ring; and going lighter than `#243352` departs from the
frame.

## THE LINE IS THE FILL, NOT THE CONTROL

- **A SOLID loses its stroke** — `--ps-accent`, `--ps-primary`, `--ps-accent-h`. That is the
  option tile, the segmented halves (`.p-seg`, `.p-tabs`), `.p-btn`, `.p-prev`,
  `.p-ghost[data-on]`, `.p-tgrp`'s Save cell, `.p-ws[data-on]`, `.p-nav2[data-on]`,
  `.p-br-new` / `.p-cta`, `.p-tile[data-on]`, `btn(on)` in both studios,
  `agent2ToggleStyle`, and the guided run's own blue buttons in Organic.
- **A WASH keeps its ring** — `--ps-accent-q` at 13–22%. `.p-choice[data-on]`,
  `.p-nav[data-on]`, the palette tile's add-flash keyframe, `.gd-expok`, `.gd-link`, and
  `row(on)` in `studio-base.js`. A wash has nothing else to show it.
- **The FOCUS ring is untouched** and is not a stroke on a fill: it is the only thing that
  says where the keyboard is, it sits on the page ground at a 2px offset, and it takes
  `--ps-ink` so it inverts with the theme.
- **The COLOUR SWATCH keeps its ring**, and it is the one survivor the sweep still reports.
  `.p-sw`'s fill IS the value being chosen, so the fill cannot also be the state — this
  file's own rule is "one ring says which colour is chosen". It happens to read as a navy
  fill whenever the navy swatch is the active one, which is why it shows up in the sweep.

**ONE PLACE THIS REACHES A CONTROL THAT IS NOT A BUTTON, deliberately:** `.p-tri-f`, the
three-stop slider's fill. This system has an explicit rule that the selected tile and that
slider are ONE treatment, so leaving its 2px ring would put the pair back in the
disagreement that rule exists to close. Its extent is still readable — the white marks
inside the fill are 14.15:1 and are placed to be counted (2 of 4 inside the blue at Tight,
3 at Medium, 4 at Roomy) — and the preset is named in the column beside the track.

## TWO PROBE LESSONS, BOTH OF WHICH HID A REAL SURVIVOR

- **A CUSTOM PROPERTY RETURNS ITS RAW DECLARED VALUE, so a sweep that compares computed
  backgrounds against tokens has to parse HEX as well as `rgb()`.** The first sweep reported
  **zero** navy-filled elements in the whole document, which reads as "already clean" and is
  the opposite. Same trap the guide's own swatch parser hit when it printed `NaN` for eight
  tokens.
- **SWEEP COMPUTED BACKGROUNDS, NOT SELECTORS — AND COVER BOTH SCREENS.** Reading selectors
  missed `.p-nav2[data-on]`, the splash's Library rows: they fill with `--ps-fill-on`, which
  **RESOLVES to `--ps-accent`**, so an older note in this file calling them "a quiet wash"
  is wrong. It also only surfaced on the run where the SPLASH was on screen — the dark run
  had been taken in the editor, so it reported 22 navy elements against light's 33.

## VERIFICATION

Sweep: every element whose computed background equals `--ps-accent`, `--ps-primary`,
`--ps-accent-h`, `--ps-accent-h2` or `--ps-primary-h`, checked for a visible border or any
box-shadow, transitions finished first, both screens present, reloaded into each theme.

| | solid-navy elements | with a stroke |
|---|---|---|
| Campaign, dark | 24 | **1** — the colour swatch |
| Campaign, light | 33 | **1** — the same swatch |
| Organic, dark / light | 9 / 7 | **0 / 0** |
| web image studio | 2 | **0** |
| the guide, dark / light | 22 / 30 | **0 / 0** |

**Campaign before the change: 12 of 24 carried a stroke.** Contrast is unchanged everywhere
— Campaign dark 3 / light 4, Organic 3 / 3, the image tool 0 / 1, the guide **0 self-test
fails and 0 large-only in both themes** — and elevation shadows are still 0 in Campaign, the
image tool and the guide (Organic's 3 are its canvas plates on the old kit). All four sheets
brace-walk to depth 0 with matched comment delimiters and one closing style element each.

`border-color: transparent` rather than `border: 0` throughout, so the 1px width stays and
nothing reflows.

# THE PROPAGATION REPORT, MEASURED — AND WHAT IS RAMP-INDEPENDENT

Asked for as "push the ui changes to `ui-design-system` and reflect it to Organic and the
image tool". The kit already carried this session's work (sections 18 and 19); what this
pass did was **measure** the two mirrors against it rather than assume, close everything
that could close, and name what cannot.

**Method:** collect every `--ps-*` custom property DECLARED in each document's own sheets,
read each one's computed value off `:root`, and diff against the same dump from the guide.
Computed, not parsed — these sheets all end in override blocks, so what a declaration says
and what a token resolves to are routinely different.

| | tokens | differ | missing | verdict |
|---|---|---|---|---|
| the guide | 73 | — | — | upstream |
| web image studio | 66 | **0** | 9 | **fully in step** |
| Organic | 69 | **57** | 4 | the ramp |

**THE IMAGE TOOL IS DONE.** Zero value differences on every token it shares. Its 9 absences
are the documented app-specific set — `--ps-dockpad`, `--ps-qr`, `--ps-railc`, `--ps-railr`
are studio geometry it has no equivalent of, and `--ps-gold` / `--ps-gold-d` / `--ps-line-2`
/ `--ps-orange` / `--ps-sand` are legacy aliases it never needed.

## TWO LIVE DEFECTS THIS FOUND, AND THE FIRST IS THE ONE THIS FILE ALREADY CLAIMED FIXED

**`.p-tile-a`'S TRANSITION WAS DEAD IN CAMPAIGN, ON 13 ELEMENTS.** Measured:
`transition: opacity cubic-bezier(0.2, 0, 0, 1)` with `transitionDuration: 0s` — the palette
card's hover-revealed add button had no fade at all. This is *exactly* the bug the
`--ps-EASE CHANGED MEANING` section documents, and that section ends "the names are honest
now — `--ps-motion` is the time, `--ps-ease` is the curve — and every call site passes
BOTH." **The kit's 11 call sites do. Neither studio's did.** The claim was made about the
library and not checked against its consumers. Both are `var(--ps-motion) var(--ps-ease)`
now, and Campaign measures `opacity 0.15s cubic-bezier(0.2, 0, 0, 1)`.

**ORGANIC USED `var(--ps-ease)` AND DECLARED IT NOWHERE**, so that declaration was an
invalid substitution and was dropped entirely — the same control dead for a second,
different reason. It declares both tokens now.

## THE LINE THAT MADE THIS PASS POSSIBLE: RAMP-INDEPENDENT vs RAMP-DEPENDENT

Organic is 57 values behind, and every one of those 57 is a **colour, a radius or an
elevation** — the ramp. So they cannot land one at a time: `--ps-fill` going from
`rgba(255,255,255,.05)` to `#282B31` is translucent-to-opaque and changes every nested
control, and `--ps-r-ctl` going from `10px` to `9999px` is the documented breakage that
turns its `.p-tile` into a capsule.

**What IS ramp-independent carries no colour and no geometry that another rule depends on,
and can therefore land ahead of the re-skin.** Three things qualified and all three shipped:

| | landed in |
|---|---|
| `--ps-motion` / `--ps-ease` — a duration and a curve | Organic |
| `.p-tile-a`'s transition reading both | Campaign + Organic |
| `.p-top .p-seg button` at 14/600/+0.16px — the BUTTON type role, which the frame states and which Campaign and the image tool already computed; Organic was on the pre-Coinbase 12/500 | Organic |
| `.p-top .p-seg`'s track on `--ps-card` — a later rule in the image tool had it one step louder on `--ps-fill` | web image studio |

**`--ps-fill-dis` and `--ps-primary-a` were deliberately NOT added to Organic**, even though
they complete the "missing" list. They are Coinbase-ramp colours, and giving a document on
the old ramp two tokens from the new one is half a re-skin — worse than the gap.

**AND `--ps-railr` STAYS AT 321 IN ORGANIC.** The kit's 332 was derived from the Layout
rail's 288 content column in a CAMPAIGN frame. Organic's `.p-rail-r` is its Slide rail, a
different rail with different content that no frame specifies. Propagating a width because
the token happens to be shared would be the frame-width mistake in another form.

## WHAT ORGANIC'S RE-SKIN STILL OWES, now with the list in hand

The 57 break down as: the whole colour ramp (grounds, fills, inks, the navy family, the
status trio and their washes), the whole radius scale (`--ps-r` 6→16, `--ps-r-sm` 4→8,
`--ps-r-lg` 8→16, `--ps-r-ctl` 10→9999, `--ps-r-tile` 13→16, `--ps-r-drop` 14→16,
`--ps-r-field` 16→8, `--ps-pill` 999→9999), and elevation (`--ps-shadow`
`0 10px 30px rgba(0,0,0,.5)` → `none`, `--ps-shade` → `transparent`).

Four fixes have to travel WITH them or the token swap breaks something:

1. **`.p-tile` needs an explicit radius.** It reads `--ps-r-ctl`, which is 10px in Organic
   today and 9999px in the kit. Campaign hit this and answered it with a literal 10px.
2. **`--ps-r-field` 16→8 changes the guided run's text boxes**, which this file records as
   deliberately 16px — "clearly rounded without becoming a lozenge… not a pill, a text box
   is not a button". That is a decision to re-make, not a value to swap.
3. **The `.gd-*` guided run carries its own old-blue literals and `--ps-blue-lt` strokes.**
   The no-stroke pass already took the solid-filled ones; the fills themselves are still on
   the old ramp.
4. **`--ps-shadow` → `none` removes Organic's two RAIL shadows** (measured: `.p-rail-l` and
   `.p-rail-r` each carry `0 10px 30px rgba(0,0,0,.5)`). That is what the Coinbase
   ring-not-shadow rule wants, and it is a visible change to both rails.

And `OrganicStudio.ART` must be proved unmoved the way Campaign's was — op signatures over
five templates x every slide x both canvases, `ART` byte-identical, zero chrome tokens in
any op colour.

## VERIFICATION

Reloaded into each theme, transitions finished, and every measurement diffed against a
`_PRE3` copy served alongside:

| | contrast | elevation shadows | strokes on a solid navy |
|---|---|---|---|
| Campaign | 2 dark / 4 light | 0 | 1 — the colour swatch, by design |
| Organic | 3 / 3, **identical to PRE3** | 5, **identical to PRE3** | 0 |
| web image studio | **0** / 1 | 0 | 0 |

Organic's five are its own and pre-date this pass: two rail shadows on the old
`--ps-shadow`, three canvas plates. Sheets: the kit 179 top-level blocks, Campaign 864,
Organic 890, the image tool 365 — all at brace depth 0 with matched comment delimiters and
one closing style element each.


# ORGANIC IS ON THE KIT — the last consumer, and the artwork was proved unmoved three ways

`Provident Organic Studio.dc.html` measures **73 tokens, 0 differ, 0 missing** against
`ui-design-system/` in **both** themes. It was 57 differ / 4 missing. The propagation
contract is now discharged for all three consumers.

**ONE TOKEN IS DELIBERATELY NOT TAKEN: `--ps-railr` stays at 321 here, against the kit's
332.** The kit's 332 is 288 + 32 padding + 11 scrollbar + 1 seam, derived from the Layout
rail's content column in a *Campaign* frame. This document's `.p-rail-r` is its **Slide**
rail — a different rail, different content, specified by no frame — and the token drives the
dock's right offset, so it has to describe the rail that is actually there. Measured after:
offset **321**, client 309. Do not "reconcile" it.

## THE CANVAS CANNOT BE REACHED FROM THE CHROME LAYER, and that is structural

Three independent proofs, in increasing cost. The first is the one worth reaching for first
next time, because it is free and it is the strongest:

| proof | result |
|---|---|
| **whole-file diff against the pre-re-skin copy** | **7 hunks, 5 replaced lines, 165 added — and ZERO artwork lines among them.** The only two diff lines matching `ops.push` / `buildOps(` / a renderer / an `ART`-family block are inside a comment I wrote quoting those names. |
| `buildOps`'s own text | **46,053 bytes, 0 occurrences of `--ps-`** — a token swap has nothing to reach |
| op signatures, 5 templates x every slide x both canvases x each template card in both themes | **34 groups, 451 ops, 34 identical** |

**PREFER THE WHOLE-FILE DIFF OVER A HASH OF A HEURISTIC LINE SET.** The baseline for this
pass was a sha256 of every line matching ~24 artwork patterns, and reproducing that pattern
list exactly a turn later was guesswork. Diffing the entire file against the `_PRE` copy and
then grepping the DIFF for artwork markers answers the same question with no pattern list to
get wrong, and it also catches anything the pattern list would have missed.

### A GROUP THAT HASHES DIFFERENTLY IS NOT NECESSARILY A GROUP THAT CHANGED

The op-signature diff first reported **33 of 34** identical, with `weekly/prop/1/ft` differing
at an unchanged op count of 23. Then the two hashes **swapped** when the files were re-probed
in the other order — which is the tell.

Compared op-for-op instead of by hash: **0 differences.** And running the same probe twice
against the *same* file back to back: identical. The variation is across a page LOAD, and
diffing PRE against PRE from two different loads isolated it to 12 ops carrying two stable
states:

```
the hugging spec panel:  w 761.680  (cold)   vs   w 753.805  (warm)
its four column edges:   209.2 / 331.2 / 467.6 / 706.1   vs   213.1 / 335.2 / 471.5 / 705.7
```

**753.8 and those four warm edges are the numbers this file already records as CORRECT** —
see *The weekly template was rebuilt to three supplied SVGs*: "with every weight actually
loaded it is 753.8, and its four column edges land at 213.1 / 335.2 / 471.5 / 705.7 against a
drawn 212 / 334 / 470 / 706 — every number within 1.5px. **The 8px error was one unwarmed
weight.**" So this is that documented condition, live and pre-existing, and it is identical in
both files.

**It is a real latent defect, flagged rather than fixed:** whichever surface measures that
panel FIRST after a load — a recents thumbnail, a template card, the guided run's card — can
land on the cold 761.7 while the editor and the export land on 753.8. `wkSpecBox` should warm
the weights it measures with, the way `tplRenderAll` already awaits eight `document.fonts.load`
pairs. It is outside a re-skin's scope.

**And a cold-vs-warm test INSIDE one load proves nothing here** — it returned 0 differences,
because the page's own `tplRenderAll` has already warmed the face by the time a probe runs.
Only the first measurement after a load is cold.

## THE RAMP IS ONE APPENDED BLOCK, PLUS THE FIXES IT FORCES

The convention this file already used for three re-skins: redefine the token layer rather
than rewriting ~900 rules, and reverting is deleting from the block to the end of the element.
Sheet integrity after: **910 top-level blocks, depth 0, 272/272 comments, 1 closing style tag,
903 rules parse.**

**Two things had to be DERIVED, because the supplied ramp is light-only.** The tints are
Provident Navy over **white** and the shades **darken** — both meaningless on a near-black
ground. So dark tints toward the INK (`--ps-fill-on` `#243352`, the navy lifted one step so it
still reads as navy beside neutral greys) and dark's hover **lifts** (`#22355A`) where light's
darkens. The four-level neutral shell (`#0A0B0D` stage through `#282B31` control) is the kit's.

**THE LEGACY ALIASES BECAME `var()` POINTERS, and that is what made the swap reach ~34 call
sites for free.** They were literals here, so they would otherwise have kept the old ramp
while everything around them moved.

### The four things the token swap forces

1. **`--ps-r-field` 16 -> 8 would take the guided run's big fields with it**, and their 16px is
   a recorded decision ("on a ~55px field it is clearly rounded without becoming a lozenge…
   not a pill — a text box is not a button"). Exactly one reader, so the decision is held
   explicitly: `.gd-big,.gd-bigta,.gd-bigsel{border-radius:16px}`.
2. **`--ps-r-ctl` 10 -> 9999px is the documented capsule hazard.** This document has **zero
   `.p-tile` in its markup** (checked — the palette rail is Campaign's), so nothing actually
   breaks; the literal is carried anyway so the three texts stay diffable.
3. **`--ps-shadow` -> `none` removes THIS DOCUMENT'S TWO RAIL SHADOWS** as well as the
   popover's. Measured before: `.p-rail-l` and `.p-rail-r` each carried
   `0 10px 30px rgba(0,0,0,.5)`. Intended.
4. **`--ps-shade` -> `transparent`** neutralises the slider thumb and the floating panels'
   drops.

### AND THE FIELD RADIUS HAD TO BE RESTATED, which the token alone did not deliver

`--ps-r-field` computes 8px and the kit's `.p-in` computes 8px — but a later literal here sets
`.p-in,select.p-in,textarea.p-in,.p-ghost,.p-icon,.p-tile,.p-dash,.p-hexin{border-radius:10px}`
and wins, so **every field in this document measured 10px against the kit's 8.**

**The probe that found it, and the trap inside it.** Build the same synthetic element for ~19
classes in the kit and in this file and diff the computed radius: **5 classes differed, and
FOUR of those were `.p-icon` / `.p-hexin` / `.p-nav2` / `.p-ws` reading `0px` in the kit — i.e.
classes the library does not declare at all.** A bare-class probe cannot tell an undeclared
class from a drift; `0px` from a synthetic element is a UA default. `.p-in` was the only real
one. The other classes in that literal already compute correctly (ghost 9999 from the pill
sweep, dash 16, tile 10 by the hold above), so only the field is restated.

## SIX INVERSIONS, AND THE FIFTH ONE IS THE LESSON

**This is the fifth re-skin in this project to produce exactly one bug: a fill that inverts
against an ink that does not.** `--ps-accent-i` is the ink for the resting TINT and is
therefore the NAVY in light; on a SOLID navy fill it is navy on navy. Every solid carries
`--ps-primary-i`, which is white in both themes.

Five were pre-empted by **enumerating every `--ps-accent-i` / `--ps-accent-i-q` reader off the
parsed sheet and checking each against its NEW fill** — 11 readers, 5 wrong:

| | was | now |
|---|---|---|
| `.p-tile-c` | `--ps-accent-i` on `--ps-accent-h` | `--ps-primary-i` |
| `.gs-btn` | same | `--ps-primary-i` |
| `.p-opt[data-on] .p-mini i` | `--ps-accent-i-q`, white 92%, on what became a pale tint | `--ps-accent-i` |
| `.p-tri-f .p-tri-k` | same | `--ps-accent-i` |
| `.gd-expb-p` / `.gd-btn-p` | no ink of their own, inheriting navy | `--ps-primary-i` |

**THE SIXTH WAS MISSED BY THAT ENUMERATION AND CAUGHT BY THE AUDIT, and the reason it was
missed is worth more than the fix.** `.p-ws[data-on] .p-ws-s` — the active studio row's
descriptor — measured **1.24:1** in light. It is on the **SPLASH**, and the enumeration was run
while reading the editor's rules; it is in the parsed sheet either way, so the miss was mine
for reading the list rather than intersecting it with what actually renders. Campaign had
already answered it, and the answer is this project's own rule: **quietness expressed as
OPACITY does not survive a flip**, so it moves into the token — `--ps-ink-2` at `opacity:1`.

**Enumerate the readers off the sheet AND walk the rendered screens. Neither alone is
enough** — the sheet misses nothing but tells you nothing about which fill wins; the walk
only sees what is mounted.

## A QUIET INK INSIDE AN ON FILL IS READ AGAINST THAT FILL, NOT AGAINST THE PAGE

The one genuinely new finding, and it is the **fourth** instance of this nesting error in this
project (the `.p-tabs` ON state, light `--ps-bad`, both dark status tiers, now this).

Measured after the ramp landed: the splash Library row's `▦` chip and the palette nav button's
hint both compute `--ps-dim` `#949AA6` over `--ps-fill-on` `#243352` at **4.45:1** against a
4.5 bar — 1% short, on two elements, in dark only.

**It is invisible to the kit's own self-test, which measures every ink token against
`--ps-app` alone.** On `--ps-app` that same ink is 6.51:1. That blind spot is the finding: a
page that prints a live contrast ratio per token is only as good as the grounds it measures
against, and an ON fill is a ground.

Both step up a tier — `--ps-ink-2`, which measures 10.55 / 10.59 on that fill and is still
visibly the quiet tier beside `--ps-ink`.

**NOT pushed to the kit, deliberately: the kit declares neither `.p-nav2` nor its children at
all** — that is the recorded open item about ringed-but-undeclared library classes — so there
is nothing there to keep in step, and opening that job is a decision rather than part of a
re-skin. **Campaign computes the identical 4.45 on the identical two selectors today.**

## ORANGE STOPPED BEING A FILL HERE TOO, AND THIS WAS THE LAST DOCUMENT CARRYING IT

Measured on the render before touching it: the switcher's active button and Preview both
computed `rgb(243,121,60)` with white ink at **2.76:1** — the exact deferred AA exemption both
re-skinned documents retired and the kit's own section 18 then closed. Organic is the one
consumer that never got that pass, so it kept the whole "orange-in-the-top-bar" override block.

**Specificity, not order, again.** `.p-top .p-seg button[data-on]` is (0,3,0) and beats the
bare (0,2,0) rule above it; **`.p-prev:hover` has to be restated** because the orange
`.p-prev:hover` is (0,2,0) and would otherwise beat a bare `.p-prev` in the appended block
however far below it that block sits. Measured after: **0 orange fills** anywhere in the
document, in either theme.

**AND THAT LEAVES `--ps-brand` WITH NO WINNING READER IN THIS FILE AT ALL.** Campaign and the
image tool both keep exactly one — the wordmark's period, which is a logotype and carries no
contrast requirement. Organic's wordmark is `<span class="p-wm">provident.</span>`, one text
node with nothing to colour, which is precisely the state Campaign was in before its markup
edit. **Flagged, not changed:** giving Organic its orange period is a two-token markup edit on
the brand's most sensitive mark, and nothing asked for it.

## THE GUIDED RUN'S CARDS: RING, NOT SHADOW

The last three elevation shadows in the document, and a token swap could not reach them —
`.gd-card`, `.gd-card-s` and `.gd-card-s[data-on]` all spell their own `rgba(0,0,0,.3-.46)`
drops as literals, and the active card's ring was a literal **white**.

**The guided run is a projection of the advanced workspace, so it takes the answer the
advanced plate just took**: `canvasStyle` went `boxShadow:'none'` with a `--ps-focus` ring for
the active canvas, and these cards are the same object one screen over. A white card on
`--ps-stage` needs no drop to sit forward of it; what it needs is a boundary in **light**,
where that step is 1.16, and Coinbase spells that `--elev-ring`. So: a 1px `--ps-hair` ring,
and 2px `--ps-focus` on the active one.

## FOUR JS CHROME LITERALS, because an inline style beats every rule

All four are in `renderVals`, none is read by an op — checked, not assumed:

- `canvasStyle`'s plate drop shadow `0 ${uz(8)} ${uz(30)} rgba(0,0,0,.5)` -> **`'none'`**,
  making it byte-for-byte Campaign's
- the active-canvas outline, `guideStyle`'s dashed margin guide, and the group-photo layer's
  selection outline — all three the retired chrome blue `rgba(78,122,158,*)` -> **`--ps-focus`**

Measured after: **`rgba(78,122,158` appears 0 times in the file.**

## A SHADOW AUDIT MUST JUDGE THE COLOUR, NOT ONLY THE GEOMETRY

My own probe reported `.p-share-m` as a surviving elevation shadow. It computes
`rgba(0,0,0,0) 0px 18px 44px` — the offsets are still declared and `--ps-shade` is
`transparent` now, so it paints nothing. **The audit was reporting its own token fix as a
survivor.** Judge the alpha as well as the offset and blur — and this is the counterpart of
the existing rule that a 0-offset 0-blur ring is a state affordance rather than elevation.

## Verification

Reloaded into each theme, never toggled into, with every `CSSTransition` finished first (this
pane's document timeline is frozen, so a transition otherwise reports its start value forever),
across **all three screens**: the splash, the guided run and the editor.

| | contrast fails | elevation shadows | solid-navy fills / with a stroke |
|---|---|---|---|
| splash, dark / light | **2 / 2** | 0 / 0 | 11 / 9 — **0 strokes** |
| guided run, dark / light | **2 / 2** | 0 / 0 | 8 / 8 — **0 strokes** |
| editor, dark / light | **2 / 2** | 0 / 0 | 5 / 4 — **0 strokes** |

**Every flag in all six runs is the same pair — the disabled Undo/Redo buttons, exempt under
1.4.3.** Zero real failures. The PRE measured **3 dark / 3 light** (including the orange at
2.76) and **5 elevation shadows**, so both themes improved on their own baseline.

Also measured: rail offset **321** / client 309, matching the deliberate token; top bar **56**
(55 + its border) with a **36** segmented track; `.p-sec > .p-grp` padding **`15px 16px 16px`**,
the kit's band exactly; `.p-in` **8px**, `.p-tile` 10px, `.p-dash` 16px, `.p-ghost` 9999px;
`--ps-motion` 150ms and `--ps-ease` `cubic-bezier(0.2,0,0,1)` both resolving.

`ui-design-system/`, `studio-base.js`, `Provident Campaign Studio.dc.html` and
`web-image-studio.html` are **untouched by this pass** — it was kit-to-mirror, not
mirror-to-kit, so nothing is owed to the other two. The test origin's `localStorage` was
cleared afterwards.

## Left as decisions, not applied

- **`.p-modal-in` still carries `box-shadow:0 20px 60px rgba(0,0,0,.4)` and `background:#fff`,
  and it is byte-identical in Campaign.** A shared pre-existing literal, in neither the kit nor
  this pass's scope; changing Organic alone would put the two out of step, which is worse than
  the shadow.
- **The `▦` / hint pair at 4.45 in Campaign**, above — two lines there if it should match.
- **Organic's orange period**, above.
- **`wkSpecBox` should warm the weights it measures with**, above.

# ORGANIC HAS A CAROUSEL TEMPLATE: FIVE PAGE LAYOUTS, INTERCHANGEABLE PER PAGE

A sixth Organic template, `carousel`, built from five UI-Kelvz Figma frames (nodes 32-30,
32-118, 32-146, 32-186 and 32-204 of `Joicww9NlGGHW96kAm4f47`) and the designer's own PDF
of the same set. Its pages are DISCONNECTED: every slide carries one of five kinds and can
be switched to any other; nothing on one page reads another. Up to 10 pages.

**Existing templates: 24 op groups, 499 ops, 0 differing** against the pre-change copy
served alongside. The interpolation sweep gained exactly two root refs (`csOn`, `csTiles`),
both declared; 24 unresolved on both sides, none new; 215 render keys, no duplicate.

## A PAGE IS A SLIDE AND ITS PRESET IS ITS KIND

`cfront` · `cstats` · `cbul` · `ctext` · `ccta`. Using the slide's KIND is what makes
everything else free — `FIELDS`, `TIERNAMES`, `PAGE`, `SKEL`, `FIXEDTEXT`, the guided plan,
the export names and the rail all key on it already. `OrganicStudio.csConvert(sl, kind)`
switches a page and CARRIES THE COPY: whatever was typed stays on the slide, and the new
layout's primary and secondary lines fill from the old one's when empty (Text → Bullets
keeps the title as the headline and the body as the points). Measured: a round trip
Text → Bullets → Text keeps title, body and position.

**Where the presets live:** the LEFT RAIL gets a `Layout preset` group of five skeleton tiles
for the active page (`csOn` / `csTiles`), and the guided form gets a `layout` section — new,
inserted after `pages` in `GDSECORDER` — with the same five as pills. Both call `setPreset`.

**The template opens on all five layouts, one page each**, so the set is visible and an
unwanted page is deleted rather than discovered. `Add page` opens as Text and lands before a
closing CTA; any page can be removed while one remains; `TPLGROW.carousel` is 10.

## THE MEASUREMENTS, AND WHERE EACH CAME FROM

The Figma frames are SVG imports — outlined type, no typography panel on most — but the PDF
carries the same set as LIVE text in Google Sans Flex Light / Regular / Medium, and a glyph's
id there is its ASCII code minus 27, so every string decoded with its size and position.
The frames are a LATER revision (the text moved up and `SWIPE ›` was added), so positions come
from Figma and sizes from the PDF, cross-checked where Figma had live text (stats, bullets,
CTA). `OrganicStudio.CS` holds all of it; the ones worth knowing:

| | value | source |
|---|---|---|
| columns | 105 left, 94 right inset | both inside the 80 grid margin — kept as drawn |
| front headline | Regular 66.5 in a one-em box, 31 to the support block | PDF + Figma group H 196.05 |
| support lines | Regular 32 at a 49.8 pitch | PDF Td advance |
| section titles | Regular 68 in an 85 box, stacked at 70 | Figma live text, 4 frames agree |
| stats | Light 66.5; label Light 28 at .14em caps; icon ink 80; rows 331, columns 402 | Figma live text + icon vector boxes |
| bullets | 472 column, 89.5 pitch, `check_circle` 33.77 in brass, text Regular 32 | Figma live text + repeat-grid cell |
| text page | 704 column, title + 29 + body Regular 32 at 40.7 | Figma group 704 × 236 |
| SWIPE › | Light 28 at .14em, 26 to a 13.44 chevron, right edge 94 in, box top 106.6 up | Figma group 133.44 × 35, gap 26 |
| CTA card | 70 padding; rule 78 × 4 brass; +50.5; Light 32; +20; Regular 68; +39; pill 108 with 42.5 side pads, Regular 32; +139; wordmark | Figma; sums to the drawn 660.43 exactly |

**THE STATS GRID IS CENTRED ON THE CANVAS, not on the frame's own columns.** The frame's two
column centres are 323 and 725, whose midpoint is 524 — 16 off centre, drawing slop. The
pitch (402) is kept and the pair is centred on 540 (339 / 741), which is also what "always
centre horizontally" asked for. An odd count puts the last item alone at 540; the grid
grows UPWARD from a floor 208.4 above the canvas edge. Measured: 5 items → 339 / 741 / 540.

**THE SCRIM RULE, resolved against three frames that disagree.** The frames' scrim rects start
at 720, 582 and 540 respectively — each sized by eye — and every one is `#1A2942` at 0% →
100% across its height. The instruction was "a padding of 250 that depends on where the
layout starts, and the gradient starts at the centre". So: transparent at the canvas's
vertical centre, solid at the edge the copy sits on — and when the copy climbs past the
centre, the ramp starts 250 above it instead (`min(H/2, near - 250)`; mirrored for a top
layout). On the front page that reproduces the drawn 720; on stats it starts at 407 where
the frame drew 582, i.e. the rule is slightly more generous than the frame. The CTA has
none: the card is its own surface. Emitted as ONE `grad` op and mirrored by the preview's
`scrimStyle`; `scrimBands` has no branch for these kinds, so the Wash slider disappears.

## ONE GEOMETRY SOURCE, `csBox`, AND THE PREVIEW IS ONE ELEMENT PER OP

`csBox(state, si, tk)` returns texts (each with its own baseline), rects, icons and the card;
`buildOps` emits them and the preview places them absolutely — `top: baseline - px` with a
`baseLH` line-height, the single-line idiom every recent card here uses. Baselines come off
`fontAsc()`, so an Arabic face lands its lines where CSS would too. **Measured, all five
pages × both canvases: every text run matched its op, worst delta 2.07 canvas px** — under one
device pixel at the editor's zoom.

**The story follows for free.** Top-anchored blocks add `(pT - 90)`, bottom-anchored ones hang
off `H`; nothing else knows the size.

## THE ICONS ARE `image` OPS WITH `tintFlat`, INCLUDING THE TWO BUNDLED GLYPHS

The stats icons are user uploads (or Material Symbols through the ported picker — `ICONS`,
`iconUrl`, `iconSearch`, `applyIcon`, `clearIcon`, fed through the slot's own `_ingest`, never
the sidecar), contain-fitted by the file's own aspect and tinted `ART.ink`. The brass
`check_circle` (Material Rounded, fill 1, weight 300) and the **SWIPE chevron** are bundled
base64 SVGs drawn through the same path.

**THE CHEVRON WAS A `<polyline points="{{ … }}">` FIRST, AND THAT IS THE `<img src>` TRAP IN
SVG CLOTHING.** The browser parses the attribute before DC interpolates it and logs
"Expected number" four times per load — parse-time noise that buries real errors. It is a
15.44 × 24 glyph (13.44 × 22 of ink, padded for its 2px stroke) tinted white, so the preview
mirrors it as a mask like every other icon and there is no SVG in the markup at all.

The preview reads the icons' bytes from `_slotUrls`, built in `_refreshAV` off the same
sidecar read, and re-renders when one lands. Verified end to end on the IndexedDB shim:
`flight_takeoff` applied through the picker → stored → `_slotUrls` → an image op at
(971.8, 1338.9) → a mask div at (971.5, 1338.8).

## AN INSERTION BUG WORTH RECORDING, because the test that caught it looked like a real drift

The story canvas's markup block landed INSIDE the feed canvas: the second anchor search began
`len(anchor) + 200` after the first hit, which was inside the ~1000-char block just inserted,
so it found the feed's anchor again. Every text node rendered twice — once at feed positions,
once 110 lower — and the preview-vs-op probe reported a constant 479 px "drift" that was the
story's SWIPE. **When a probe matches twice as many nodes as ops, the markup is duplicated;
read the node list before believing the number.** Fixed by cutting the `sl.st.` block out and
inserting it after the SECOND anchor computed on the post-insertion text.

## Verification

- Ops for the existing five templates: 24 groups, 499 ops, 0 differing.
- Preview vs ops, five pages × feed and story: 60 runs matched, worst 2.07 canvas px.
- SWIPE on pages 1–4, not on 5; after adding pages it moves to the new second-last.
- Add to 10, `canAddSlide` false at the cap, new pages before the CTA; remove any page.
- Stats 2–6 with the stepper clamped at both ends; the gate names an empty stat or label.
- Export with the story hidden: `<headline>_Carousel_page1_3x4.jpg` …; the derived base drops
  trailing punctuation.
- Sheet: 1 closing style tag, 298/298 comments, `sc-if` +9/+9 and `sc-for` +11/+11 on the
  documented baselines, 1090 CSS rules parse (the small `.p-opts-cs` block appended).
- The test icon slot was cleared, the test origin's `localStorage` cleared, the `_PRE` removed.

## Left as decisions, not applied

- **The landing page's Organic card does not yet show the carousel.** Its strip is a static
  snapshot per template (`preview/organic-*.webp`) plus markup; a sixth thumb is the
  documented recapture route plus one row.
- **A Material icon's family is Outlined at weight 200**, Campaign's own setting. The
  designer's frame used Outlined glyphs at what reads as a light weight, so it matches; the
  check is Rounded because the design draws the rounded filled disc.
- **The CTA card's default fill is the house white glass** via Panel colour; the drawing is a
  flat navy. The user asked for the option, so it is not fixed to navy.

# THE CAROUSEL TAKES AN OVERLINE AND A RICH BODY: FIVE BLOCK TYPES, ONE LINE TO A BLOCK

Two requests on the carousel template, with three reference screenshots: a brass overline on
each page with a show/hide, and a Notion-like body field carrying **Quote, Divider, Callout
and Bulleted list**, applied by highlighting and pressing a button, "only when it's on its own
line break".

**Op census over all six templates x every slide x both canvases: 34 groups, 28 byte-identical,
and the only 6 that differ are the three INSIDE carousel pages** — the ones whose demo copy
gained an overline and blocks. And the stronger proof, because it isolates the code from the
demo: **the new engine driven with the PRE build's own field values reproduces the carousel
exactly — 10 groups, 10 byte-identical.** So neither the overline nor the block layout moves a
page that does not use them, and a plain body through the new layout is the old plain layout.

## THE OVERLINE IS THE THREE INSIDE PAGES ONLY

By instruction — "just the inside, no need for CTA and front". The front page already carries
the wordmark above its headline and the CTA card opens on its own brass rule, so a second
brass mark in the same band would be noise. Verified: the eyebrow op exists on `cstats`,
`cbul` and `ctext` and is **null on `cfront` and `ccta`**.

**One look, dynamic content** — the user's own words. `CS.eyePx/eyeTrack/eyeBox/eyeGap` are one
set for all three; the text is per page. Brass **#B0905C** (`ART.brass`) in tracked caps at
28/500/.14em — the page's own small-caps size, the same as its stat labels and its SWIPE line.
Measured on the render: the brightest pixel in the run is **exactly rgb(176,144,92)**.

**IT TAKES THE TOP OF THE BLOCK, so a blank one is worth no height at all.** That is what
leaves every page written before this exactly where it was: the title moves down by
`eyeBox + eyeGap` (55) only once copy is typed, and hiding it puts the title back —
measured 222 -> 167 on the stats page.

**`eyeOn` opens on Show and the text is OPTIONAL.** The rule here is that anything asked for is
required, so an always-asked overline would block export on every page; the toggle is what
makes it a decision instead. `fieldShown` drops the text row when it is hidden, and the copy
survives being hidden — verified, "Rent, Reworked" still stored with the row gone.

**This is the fourth exemption to "no gold in canvas output at all"**, after the ranking
badge, the award line and the agent designation. The user named the hex; brass was already in
this template for the Bullets check.

## A STRING WITH LINE MARKERS, NOT AN ARRAY OF BLOCKS

The blast radius is the whole argument. Every reader of these fields already takes a string —
`csConvert` carries copy between layouts as one, the guided form writes one, a session file
holds one, and **an old plain body is already valid** (all paragraphs, no migration). An array
of block objects would have meant touching all of them.

```
> quote    ! callout    * bullet    ---  rule    (no prefix) paragraph
```

`csBlocks` / `csLine` / `csPlain` are the parser, the writer and the marker-stripper. The
editor writes the markers itself, so nobody has to type them.

**`csConvert` STRIPS THEM INTO A FIELD THAT CANNOT DRAW THEM.** Text -> Bullets would otherwise
put a literal `> ` in the Bullets list. `csRich(kind)` is the test — `cfront` and `ctext` are
rich; the Bullets list and the CTA's lead line take `csPlain`. Verified both ways.

## ONE LINE IS ONE BLOCK, AND CONSECUTIVE LINES OF ONE KIND ARE ONE BLOCK ON THE CANVAS

Which is also exactly what "it should apply only when it's on its own line break" means: a
block IS a line, so half a line cannot be one. Three callout lines are one panel; three
bullets one list. Verified: retyping two adjacent rows as quotes produced **one** 121.7-tall
brass rule over all three wrapped lines, not two rules.

`rtLay` lays the blocks out at y = 0 and the caller translates them once the block's top is
known — which is what lets a bottom-anchored page anchor a body whose height it cannot know
until it has been measured. It takes the px and lead as arguments, because the front page's
supporting lines are 32/49.8 and the text page's body 32/40.7; the list's own lead is a RATIO
(`rtBulK` 1.08) so it follows.

**Paragraphs follow the page's alignment; a quote, a callout, a list and a rule are STRUCTURAL
and always read from the left**, whatever Center/Left is set to. A centred list with its ticks
pushed off the copy is not a list.

### What each block is

| | |
|---|---|
| quote | a 3px brass rule at the column's left, copy indented 34 at **Light 300** — the weight is what separates it from body Regular |
| callout | the **house glass**: `glassOf(state)` over a `blur` op at `TA.panelBlur` with the `hairEdge` stroke, and the reference's brass rule standing INSIDE its 28 padding |
| bullets | a **plain brass check**, no disc — `check_circle` is reserved to the Bullets preset by request, so a list inside a body and a whole page of bullets never read as one control |
| divider | a 1px `ruleQ` hairline across the column, with its own wider gap |

**THE CALLOUT'S BAR IS INSET, NOT FLUSH.** The reference draws it flush at a square panel's
edge; every panel in this studio is rounded, and a 4px bar against a 20px radius pokes out of
the curve. It stands inside the padding instead, which reads as the same mark and needs no clip.

**A RECT CAN BE GLASS NOW**, in both surfaces: `blur` on a `B.rects` entry pushes a `blur` op
before the `rrect` in the ops and sets `backdropFilter` in the preview. The rects are emitted
in order, so the panel's own brass rule follows it. Verified in the export —
`feGaussianBlur stdDeviation="14"` inside a `userSpaceOnUse` region grown by 3 sigma.

## THE HEIGHT BUDGET REPLACED THE LINE CAP, and it truncates where the user typed a break

A callout plus a rule plus a list cannot live inside four lines. The cap is the room between
the page's own two anchors, less what the overline and the title have taken.

**A paragraph run and a list lay out per SOURCE LINE; a quote, a callout and a rule are
all-or-nothing.** That is what makes the reported count exact rather than an estimate — 30
long lines into a 704 column drew 20 wrapped lines and reported **20 blocks do not fit**, and
a 22-line callout that could not fit was dropped whole with **24** reported (22 + 2 bullets).
`B.over` is read by the field's own counter, which turns amber.

`CS.subMax` and `CS.bodyMax` are declared and unread now, annotated rather than deleted.

## THE FIELD DRAWS THE BLOCKS THE WAY THE CANVAS DOES

"Show both on the canvas and body the rendered final look." So the field is a small block
editor, not a textarea with visible markers: the quote behind its brass rule, the callout on a
panel, the list against its check, the rule across the column.

**IT IS AN UNCONTROLLED `contenteditable`, and that is the whole reason it is safe in DC.** The
vdom gives the host NO children, so React never reconciles the rows we put there and the caret
survives every state write. `data-rtv` (the value the render wants) against `_rtv` (what the
editor last read or wrote) is the only sync, and they differ exactly when the project moved
underneath it — a new page, an undo, a session load. Verified in both directions: typing does
not rebuild, and an external `upd` does.

- **`contenteditable` is set imperatively**, not in the markup, so nothing depends on how the
  renderer treats a compound attribute name.
- **`data-on` on the toolbar is set imperatively and is NOT interpolated**, so React has no
  prop there to overwrite it with.
- **The selection is STASHED (`_rtSel`), never read live**, because pressing a toolbar button
  moves focus out of the editor first and a live read would find nothing to retype.
- **Enter continues the block and leaves an empty one** (an empty bullet becomes a paragraph);
  **Backspace at the head of a block clears its TYPE before it deletes any copy**; paste is
  plain text split into paragraphs. All verified with real key events.
- **Only top-level strays are normalised.** Rewriting a well-formed row's contents would take
  the caret with it, and a nested span serialises through `textContent` perfectly well.

**NO INLINE FORMATTING, by instruction and by the font.** Bold would be expressible (the face
carries 500) and **italic would not** — the bundled Google Sans Flex is upright-only and the
one italic in the folder is the Source Serif the brand retired. A half-set is worse than none.

## TWO DEFECTS THIS PASS PRODUCED, BOTH MINE, BOTH FOUND BY MEASURING

- **The editor's callout panel was `rgba(255,255,255,.06)` — 1.01:1 in light mode.** The
  fill-inverts-ink-does-not family, for the seventh time in this project. It is `--ps-fill-h`
  over `--ps-line` now, a token step that goes the right way in both themes.
- **THE EDITOR FILLED FROM THE rAF TICK ALONE, so it rendered EMPTY whenever the pane was not
  compositing.** Found because a probe hung awaiting a frame — the documented hidden-pane trap
  catching a real dependency rather than only the probe. `rtSync` is driven from the shell's
  `componentDidMount`/`componentDidUpdate` as well now, which is the belt-and-braces
  `promoteImgs` has had all along and for exactly this reason. Verified filling with rAF dead.

**A PROBE TRAP THAT COST TWO ROUNDS AND WAS NOT THE CODE:** the automation's `key` action sends
`Return` with an **empty `e.key`**, and `BackSpace` is not the DOM's name either. Both read as
"the handler never fires". With `Enter` and `Backspace` spelled the DOM's way, both work
first time. Check what the event actually carries before concluding a handler is broken.

## Verification

- **34 op groups, 28 identical; 10/10 identical when the new engine is driven with the old
  build's own values.** Interpolation sweep 173 refs and 18 unresolved on both sides, none
  newly unresolved. 215 render keys, no duplicates.
- **Preview against ops, one coordinate space: all 9 runs matched, worst 0.42 canvas px** —
  the integer rounding of `offsetTop`. The divider, the glass panel (`blur(14px)`,
  `rgba(255,255,255,.22)`, r 20), its brass bar and both ticks match their ops box for box.
- **The render**: the overline's and the ticks' brightest pixel is exactly `#B0905C`; the
  callout's bar exactly `#B0905C`. SVG export valid — 1 filter, 9 rects, 9 texts, 3 images.
- **Sheet**: one closing style tag, comments 300/300, brace depth 0, **authored CSS blocks
  1071 -> 1087 and PARSED 1063 -> 1079 — +16 both sides**, so nothing was swallowed. (Check
  the authored count against the parsed one; the 8-rule gap is Chrome dropping `-moz-` blocks
  and it is the baseline.) `sc-if` +2/+2, `sc-for` +1/+1.
- Contrast, reloaded into each theme, transitions finished: editor copy **14.2-18.1:1**,
  toolbar 8.4-8.6, the brass marks 2.4-4.7 against the field. Export names unchanged.
- **One artwork-emitter line in the whole 40-hunk diff**, the new `blur` push.

## THE INSIDE PAGES CAN CARRY THE WORDMARK — Hide / Top / Bottom

They carried none: only the front page and the CTA card drew one. `logoPos` is one segmented
control on the three inside kinds, **off by default**, so it is something you add and no page
written before it moves — **34 op groups, 34 byte-identical, 649 ops.**

**Two positions, and each is an EXISTING line rather than a new one.**

| | where | why |
|---|---|---|
| **Top** | x `pad`, baseline `pT + tk.logo * .8` | byte-for-byte the front page's own, so a carousel carrying it on every page reads as one set. Measured 122.8 on the feed and 240 on the story, from the same expression. |
| **Bottom** | x `pad`, baseline `H - swipeBotIn + asc(swipePx)` | SWIPE's OWN baseline, so the mark and the cue make one line rather than two. Measured 1360.6 / 1840.6 — identical to SWIPE's on both canvases. |

Left-aligned in both, which is the brand's rule for the wordmark and needs no second control.

**A TOP-ANCHORED BLOCK MOVES DOWN FOR IT, to `frontTopGap`.** The inside pages start their
top-anchored copy at `topY` (158), and the wordmark's descender reaches ~135 — 23px is not a
gap. `frontTopGap` (100) is already the name for "below the mark" on the front page, so a
top-anchored inside page with a top wordmark starts where the front page's top-aligned
headline does. Measured on the text page: its title baseline goes **279 -> 379** with the
wordmark at Top, and stays at 279 at Bottom or Hidden. The stats title (259) and any
bottom-anchored block already clear it and do not move.

**A mislabel from the pass before this went with it.** `TIERNAMES.cstats` was `['Title']`, so
the blurb's tier fell through to the generic table and the group read **"Supporting line"**.
It is `['Title', 'Blurb', 'Layout']` now — verified against the pre-change build, which shows
the wrong label.

No CSS and no markup changed, so contrast and the sheet are untouched by construction (sc-if
and sc-for counts identical, 9 hunks, 26 added).

## A WIDER HEADING, AN OPTIONAL STATS BLURB, AND A FLOATING GRAPHIC

Three requests in one pass, all on the carousel. **34 op groups across all six templates,
34 byte-identical, 649 ops** — nothing existing moves: a short title does not notice a wider
column, the blurb opens Hidden, and the graphic draws nothing without a file.

### THE HEADING TAKES THE PAGE'S COLUMN, NOT THE BODY'S

`CS.headColW` (881 = W - pad - padR on both canvases) is the one name for it, and the Text
page's title was the single heading with unused room: it took the BODY's 704, which is a
measure for 32px copy and far too tight at 68. Measured on one real title, 3 lines at 704
becomes **2 at 881**. The body keeps 704.

**The other four are left, and each for a reason rather than an oversight.** The front page
and the stats page already fill that column. The Bullets headline's 379 is what the bullet
column beside it leaves — widening it means narrowing the list. The CTA headline's 730 is the
hugging card's own cap, which is the grid (`W - 2 x pad`). Taking width off the bullet list is
one constant if that is the page that felt cramped.

### THE STATS PAGE TAKES AN OPTIONAL BLURB, the same rich body

`bodyOn` opens **Hidden**, because the rich editor is a heavy control and this is an addition
you opt into; turning it on reveals the field. Set in the body's own **704** measure rather
than the heading's column, between the title and the grid, and **budgeted by the room the grid
leaves** — the grid is bottom-anchored and climbs as stats are added, so the blurb reports what
will not fit instead of drawing into it. Verified: 11 text ops with it off, 14 with it on, the
last line at 409 clearing a grid top of 648, paragraphs centred and the list's ticks left.

`cstats` joined `csRich` and `csConvert`'s `sec` map, so the blurb carries to and from the
other pages' prose fields with its markers intact.

### THE FLOATING GRAPHIC IS CAMPAIGN'S, PER PAGE

An uploaded SVG/PNG placed by hand. `f.gfx = {x, y, s, a, tint}`: **x/y are the centre and s
the width, both as fractions of the CANVAS**, so one value serves the feed and the story — the
reason the ranking cover's group figures store fractions. It is **drawn LAST**, over the page's
own copy, which is what placing something by hand is for (verified: the op is index 18 of 19).

- **Upload in the form, place on the canvas.** The slot is mounted in both under one id, so a
  file can also be dropped straight onto the canvas.
- **Tinted by default** to `ART.ink`, for Campaign's own measured reason — a brand-kit SVG is
  routinely navy and navy on these pages is nearly invisible. The canvas draws `tintFlat`; the
  preview paints a **mask** with the slot at `opacity: 0` behind it, so the slot stays the drop
  target. Untinted, the op carries **no `tintFlat` key at all** and the slot's opacity is put
  back — the documented trap where an empty tint still matches `[data-icon-tint]`.
- **`pointerEvents: 'auto'` is set EXPLICITLY.** It lives inside `frameStyle`, which is
  `pointer-events: none` and INHERITS — the reason the ranking cover's five figures once
  shipped un-draggable while their arithmetic checked out. z 11 clears the image-slot's own 10,
  the listed pan layer's lesson; the handles are 12.
- **The corner drag doubles the pointer delta.** The box is centre-anchored, so the width has
  to change by twice the delta for the dragged edge to track the pointer — the group figures'
  lesson, and the one place this departs from Campaign's own `gDrag`.
- **The aspect is measured in `_refreshAV`, not only written by a drag.** Campaign's `gaspect`
  is written by the scale gesture alone, so a freshly dropped 3:1 mark would sit in a SQUARE
  box until it was touched. The measurement only ever corrects the box the handles and the hit
  area sit on — both surfaces contain-fit, so the drawn art is identical either way.
- One undo entry per gesture, committed on release; `_undoStack` is 5 deep.

**Verified with REAL pointer drags**, not synthetic events: a move took x/y from .5/.5 to
**0.7727 / 0.6023 against a predicted 0.7727 / 0.6023**, and a corner took s **0.34 -> 0.6127
against a predicted 0.6127** with the centre held, the true aspect written and the art then
filling its box exactly. Two gestures, two undo entries. Preview against op: **0.4 canvas px**.
The file exports as `graphic-NN`.

**Contrast is unchanged**: the same 3 flags in dark as the pre-change build, element for
element and ratio for ratio — the disabled Redo (1.4.3-exempt) plus a pre-existing `✕` at 4.40
and a numeral at 2.72, neither of them this pass's.

## EVERY CAROUSEL HEADLINE TAKES AN AUTHORED BREAK

Asked for after the fact. Three of the five were single-line `<input>`s — `cstats`'s title,
`ctext`'s title and the CTA card's headline — while the front page's and the Bullets page's
were already textareas. All five are textareas now, each hinted "Enter for a new line".

**ONLY THE STATS TITLE NEEDED THE CANVAS CHANGING.** `lines()` splits on breaks BEFORE it
wraps, so the text page's title and the CTA's headline honoured a break the moment the field
could carry one. The stats title was the odd one out: a single unwrapped `TC`, so it could
neither break NOR wrap and a long one ran off both edges. It stacks at `h2Pitch` now and
wraps to the page's own column.

**ITS LINE COUNT IS CLAMPED BY THE ROOM ABOVE THE GRID, not by a flat cap**, because the grid
is bottom-anchored and climbs as stats are added — at six, a ONE-line title already sits on
its top edge, which is pre-existing. Measured with a four-line title: 3 lines at two stats
(grid 979), 3 at four (grid 648), **1 at six (grid 317)**, every case clearing.
`Math.max(1, ...)` always draws one line: dropping the title outright is worse than letting it
touch. `CS.titleGridGap` (30) is the air it must leave.

**The CTA card grows by exactly one `h2Pitch` per extra line and re-centres** — verified
660.4 -> 730.4 with its y moving half that, which is the card hugging its copy as designed.

**Op census: 34 groups, 34 byte-identical, 649 ops.** Nothing existing moves — the demo
titles are short single lines and `lines()` reproduces the old single-op output for them
exactly. Preview against ops on a two-line stats title: worst **0.47 canvas px**.

**Left alone:** the CTA card's *Lead line* stays one line. It is the supporting line rather
than the headline, and its height enters the card's sum as a single `ctaSmallBox`, so making
it stack is a change to that sum rather than a field flag.

## Left as decisions, not applied

- **The callout holds ordinary body lines.** The reference shows a big figure inside one
  ("AED 2.5 million"); that would be a sixth block type and nothing asked for it.
- **The Stats page has no body line to enrich**, and the Bullets page's list is the preset's
  own — so "all page except CTA" reaches the front page's supporting lines and the text page's
  body, which are the two prose fields the carousel has.
- **The stats page's title and its overline sit above the wash's start**, as that title
  already did: the scrim is anchored to the grid, and moving `near` to the title would cover
  the whole page. Pre-existing, inherited by the overline.
- **The brass marks in the FIELD are quiet on a light ground** (2.4-2.6:1). Raising them would
  make the field disagree with the canvas, which is the one thing this editor exists not to do.

# ARABIC NEEDS HALF AN EM MORE PER LINE, AND A CENTRED PILL HAD FLUSH-LEFT COPY

Two reports on `Provident Campaign Studio.dc.html`, with screenshots: an Arabic headline
whose two lines collided, and a glass hook whose panel was centred while the copy inside it
was not. They are unrelated defects and both are fixed.

**Latin is byte-identical: 16 groups (4 templates x left/centre x 1:1 and 9:16), 225 ops,
0 differing** against the pre-change build served alongside.

## THE MEASUREMENT THAT SETTLES THE LEADING

Taken at 100px on the running faces, worst case over a set of real strings:

| | ink ascent | ink descent | INK HEIGHT |
|---|---|---|---|
| Google Sans Flex, Latin | 72.7 | 21.0 | **93.7** |
| Readex Pro, Latin | 77.1 | 23.0 | 100.1 |
| **Readex Pro, ARABIC** | **100.0** | **47.3** | **147.3** |

**So every Latin lead in this file is below the height of a single Arabic line.** The hero
advances `1.08` where the ink needs `1.473`; the hook 1.25, the eyebrow 1.3, the body 1.4,
the step label 1.32. The ascent is a tall stem carrying a hamza (أ, لج) and the descent a
deep bowl (ج, ي) — a line with both is ordinary, not a corner case.

Measured on the reported headline before the fix, the ink GAP between its two lines:
**-31.3 canvas px on the 1:1 and -37.9 on the 9:16.** Negative is overlap. The hook was at
+1.0, one pixel from touching. After: the worst gap anywhere in that project is **+14.6**.

**`AR.leadAdd` is .54 — 147.3 - 93.7, rounded up — and it is ADDED to each role's Latin
lead rather than replacing every lead with one Arabic number.** That keeps the design's own
rhythm (a display headline stays tighter than body copy) and gives every role exactly the
air it has in Latin, the same gap in em, which is what the eye reads as the space between
lines. `CampaignStudio.leadOf(latin)` is the one reader: hero 1.08 -> 1.62, eyebrow 1.3 ->
1.84, hook 1.25 -> 1.79, body 1.4 -> 1.94, list 1.75 -> 2.29, step label 1.32 -> 1.86.

**The cost is real and is the honest consequence of a taller script**: an Arabic body block
is ~38% taller than the same lines in Latin, so a dense Arabic ad reaches the 40% copy
ceiling sooner. The copy-coverage chip reports it automatically.

## A FIXED FIRST-BASELINE FACTOR CANNOT SURVIVE THE LEAD CHANGING

The hero placed its first line at `.82 * lead` and the hook, body, eyebrow and list at
`1.0 * px`. Those are Latin-tuned approximations of what a CSS line box actually does, which
is where the PREVIEW puts its first line: half-leading plus the ascent, **`(lead + a - d) / 2`**.

Verified against Chrome with a zero-height inline-block probe, both faces, six leads: the
formula lands within **0.5px per 100px**, which is the browser rounding the half-leading. The
old factor is right only where it was tuned — at lead 1.08 it is 88.56 against 88.0, and at
1.94 it is **159 against 131, 28% out**. Raising the leads without this would have opened an
8.6 canvas px gap between the editor and the export on the hero alone.

`CampaignStudio.baseAt(lead, fallback)` returns the **fallback verbatim in Latin**, so no
saved Latin ad moves by a fraction of a pixel, and the formula in Arabic. Keeping a value
that is 0.6% off in Latin is deliberate: correcting it would churn every saved ad for a
third of a pixel.

## THREE HEIGHT MODELS ASSUMED A LATIN LEAD, and raising the lead exposed all three

Each reserves space in `modPx` or its own geometry helper, and each was silently within a
few pixels of the preview in Latin and 13-20 canvas px out in Arabic:

- **`eyebrowH` gives the FIRST line 1.2** where a flowed text node is `n * lead` tall. In
  Latin that under-reserves by .1em (3 canvas px, and it is what keeps saved ads still); in
  Arabic the same shortcut is .64em, **20 canvas px** of drift down the whole stack.
  `eyeFirst()` returns 1.2 in Latin and the lead in Arabic, and the ops' own `textH` reads it.
- **The glass pill's preview padding was `1.6cqw 2.8cqw`**, hand-tuned against a Latin lead
  and about 6 and 9 canvas px out even there. It is derived from the op's own constants now —
  `GLASS_H` (2.3) and `GLASS_PAD` — so the two surfaces draw the same pill at any lead.
- **The bullet list's preview pitch was 2.15em against the export's 1.75.** The op advances
  EVERY line by `LEAD.list`, a row's own wrapped lines included; the preview had the row at
  `LEAD.body` with a `LEAD.list - 1` gap between rows. Pre-existing, visible the moment a
  list had two items, and it had to be settled because the gap expression reads `LEAD.list`.
  One advance now: `gap: 0`, row line-height `leadOf(LEAD.list)`. Measured after — op step 49
  against a preview 48.9 in Latin, 64.1 against 64.0 in Arabic.

`modPx` reserving `tk.hook * 2.4` for a glass pill the panel draws at `2.3` is left alone: a
hair of slack under the panel, pre-existing, and unifying them would move Latin.

## THE CENTRED PILL — the fifth instance of one defect, and it hit LATIN too

The glass hook drew every line at `bx + px * 1.1`, the pill's own left inset. So the widest
line filled the pill and every shorter one sat flush left inside it, while the preview
centred them — a flowed text node inherits the content stack's `text-align: center`.

**Measured on the pre-change build, the second line's left edge against its op: 296.8 canvas
px out in Latin and 333.8 in Arabic. Both are 0 now.** The report framed it as an Arabic
problem; it was not, and the screenshots happened to be Arabic.

This is the same defect the glass PRICE block carried, and that one's fix comment already
names the class. The sweep that should have caught the hook then was never run, so it was run
now: **every component type x every style variant x both faces, centred — 66 combinations,
0 mismatches.** Every line the preview centres, the ops centre. The list and the tag strip
correctly centre neither (a bullet list has one left edge; chips sit side by side) and both
surfaces agree on that, including the RTL reversal.

## Verification

- **Latin op census: 16 groups, 225 ops, 0 differing.** The Latin fallbacks make this true by
  construction and it was measured anyway.
- **Preview against ops, one coordinate space, both faces, left and centred**: worst baseline
  delta **3.11 canvas px** in Arabic (the hero, down from 7.14) and 6.24 in Latin (unchanged,
  pre-existing). The wordmark's own 7-8 px is the documented `logoBase` gap and is untouched.
  Step labels match to 0.06 (58.6 op against 58.657 preview).
- **A Range's client rects are INLINE boxes, not line boxes.** A probe that added the
  half-leading to a rect top double-counted it and reported a 9-19 px drift that did not
  exist. The baseline of an inline rect is `rect.top + ascent * px`. That artefact cost a
  round and read exactly like a real regression.
- Sheet integrity unchanged against the backup: one closing style tag, comments 321/321,
  `sc-if` 148/147, `sc-for` 47, 977 CSS rules (this pass authored none). Interpolation sweep
  318 refs and 62 unresolved on both sides, **none newly unresolved**; 304 render keys, no
  duplicates.
- The test origin's `localStorage` was cleared and the `_PRE` copy removed from the folder.

# THE WORDMARK IS THE SUPPLIED LOCKUP, AND ONE ASSET SERVES BOTH THEMES

`provident.` plus a `DESIGN STUDIO` badge, from two supplied files —
`prov-DS-dark.svg` and `prov-DS-light.svg`. It replaced the text wordmark
(`<span class="p-wm">provident<b>.</b></span>`) in **all four documents in one pass**, and
the library now *declares* `.p-wm` for the first time: it had used the class in
`index.html` with **no rule in `provident-ui.css` at all**, which is the reverse of the
recorded "classes the library defines and neither studio implements" gap.

## THE TWO FILES ARE BYTE-IDENTICAL GEOMETRY, and that is the finding

Not similar — **identical**. 24 drawable elements each, and every `d` / `points` string
the same. The only difference between them is fill:

| | ink | the period |
|---|---|---|
| `prov-DS-dark.svg` | `#1a2942` Provident Navy | `#f3793c` brand orange |
| `prov-DS-light.svg` | `#fff` | `#fff` — **no orange at all** |

So this is **one asset plus two token values**, not two assets. 9KB of path data is
mirrored once per document and the theme picks the ink — there is no second copy to keep
in step, which halves what the propagation contract has to carry. Check this before
mirroring any supplied pair; two files named for two themes are very often one drawing.

**A LOGO FILE NAMED FOR ITS OWN COLOUR INVERTS AGAINST A THEME NAMED FOR ITS GROUND.**
The source calls the navy one "dark"; this system calls a theme dark when its *ground* is
dark. So `prov-DS-dark` is the **light** theme's and `prov-DS-light` is **dark**'s. Mapped
by what reads on the ground, never by the filename.

## `--ps-wm-h` IS DERIVED, NOT CHOSEN

The lockup is **8.8017:1** (802.41 x 91.17) and its `provident.` portion is 361.13 of that
width — 45%. At **19px** tall that portion renders at **75px**, which is exactly what the
text wordmark measured off the supplied Header frame. So the badge is **added beside a
wordmark that has not changed size**, rather than the wordmark being shrunk to make room
for it. Measured box: **167.22 x 19**, identical in all four documents and both themes.
It steps to 16px below 760px, where the lockup is 140.8 wide and the bar still does not
scroll.

## THE INK IS `currentColor`, SO ONE DECLARATION THEMES THE WHOLE LOCKUP

`.p-wm{color:var(--ps-wm)}` and `.p-wm-a{fill:currentColor}`; the period carries
`.p-wm-d{fill:var(--ps-wm-dot)}` and is the single child that opts out. `fill` is an
inherited SVG property, so a directly-applied declaration on the dot beats the inherited
value and no `!important` or extra specificity is needed.

**Neither existing ink token could have carried it.** In light the supplied ink is
`#1A2942`, which is `--ps-primary` — `--ps-ink` is `#0A0B0D`, a near-black that is off
brand for the mark. In dark the supplied ink is `#FFFFFF`, which *is* `--ps-ink` — but
`--ps-primary` is navy in both themes and would be invisible on `#131519`. A logotype is
its own role, so it gets its own token.

## `viewBox` IS SAFE IN INLINE MARKUP AND UNSAFE ONLY IN A CSS STRING

Worth settling, because the recorded trap reads like it applies everywhere: Design Cursor
camel-cases attribute names and that is what turned `viewBox` into `sc-camel-view-box`,
silently painting an empty box. **That is a CSS-data-URI hazard, not a markup one** —
Campaign carries 40+ inline `<svg viewBox="0 -960 960 960">` icons that render correctly,
and `.p-wm-a`'s `viewBox` was read back from the live DOM intact in all four documents. So
an inline `<svg>` is the right form here, and a base64 `mask-image` — which would have
been the safe answer if the trap were general — is not needed. It also could not have
given the period its own colour without a second layer.

## THE ORANGE PERIOD IS GONE FROM THE DARK THEME, and that is the supplied art

`--ps-wm-dot` follows the files: `#F3793C` in light, `#FFFFFF` in dark. Measured, the dot
is 18.28:1 in dark (i.e. the same white as the ink) and **2.76:1 in light — unchanged from
the text period it replaced**, and exempt as part of a logotype.

That retires the one orange mark on the dark screen, which is the theme studio users work
in, and it is a real departure from the recorded thread that "PROVIDENT'S LOGOTYPE STAYS
ORANGE". It ships as supplied because two files were given and named per theme. **It is
one value to reverse** — set `--ps-wm-dot` to `var(--ps-brand)` in the bare `:root` and
the brand period is back in both themes with nothing else moving.

Note this also gives Organic a `--ps-brand` reader again. It had **none** after the orange
top bar was retired, which was flagged and open; the lockup closes it in light mode.

## THE CANVAS WAS NOT TOUCHED, AND A BINDING RULE SAYS IT MUST NOT BE

`drawLogo` still draws the plain `provident.` text op on exported artwork. That is not
caution, it is the campaign rules: *"Logo: main provident. wordmark only (no sub-brand
lockups)"* — and `DESIGN STUDIO` is a sub-brand lockup. So the lockup is **chrome only**,
and putting it on a canvas would break an explicit brand rule rather than merely change a
render.

Proved by the whole-file diff, which is the free and strongest check:

| | hunks | added | removed | artwork-path lines in the diff |
|---|---|---|---|---|
| Campaign | 2 | 67 | 1 | **0** |
| Organic | 2 | 67 | 1 | **0** |
| web image studio | 2 | 67 | 1 | **0** |
| `provident-ui.css` | 1 | 39 | 0 | **0** |
| `index.html` | 1 | 28 | 1 | **0** |

The one removed line per consumer is the old text wordmark. No line containing `ops.push`,
`buildOps(`, either renderer, `palOf(`, `drawLogo`, `static PAL` or `static SCRIMS` differs
in any file, so no op diff was needed — the canvas cannot have moved.

## VERIFICATION

Reloaded into each theme rather than toggled into, with every `CSSTransition` finished
first (this pane's document timeline is frozen, so a transition otherwise reports its start
value forever). The lockup was rasterised from the live DOM **with its computed fills baked
in** — a data-URI SVG is an isolated document and cannot read the page's custom properties,
the same reason the webfont does not survive that path.

| | dark | light |
|---|---|---|
| box | 167.22 x 19 | 167.22 x 19 |
| elements present | 24 | 24 |
| `viewBox` | intact | intact |
| ink pixel | `#FFFFFF` at **18.28:1** | `#1A2942` at **14.59:1** |
| period pixel | `#FFFFFF` at 18.28:1 | `#F3793C` at 2.76:1, logotype-exempt |
| badge ring / interior | paints / **transparent** | paints / **transparent** |

**Identical in all four documents in both themes.** The transparent interior is what says
the badge's two-subpath nonzero winding survived — it is a ring, not a filled slab, and
merging the 23 ink elements into one `<path>` to save ~500 bytes is what would have risked
it. They are kept separate deliberately.

Kit after: **181 rules parsed** (175 before, plus this block's 6), **1 `CSSFontFaceRule`**
so the star-slash trap is not reintroduced, `.p-wm` / `.p-wm-a` / `.p-wm-d` all declared,
and the guide's own live self-test reports **0 fails and 0 large-only** in both themes.
All three HTML documents keep exactly **one closing style tag**, comment delimiters matched,
brace depth 0.

# A LANDING PAGE AT THE REPO ROOT, AND IT LINKS THE LIBRARY RATHER THAN MIRRORING IT

`index.html` at the project root — a home-page select menu for the three tools, ready to
serve as a GitHub Pages root.

**IT IS THE FOURTH CONSUMER AND THE FIRST THAT IS NOT A MIRROR.** The studios have to
mirror `provident-ui.css` for two recorded reasons — ~500 colour literals in JS style
objects that no stylesheet can reach, and being opened straight off the disk. A landing
page has neither problem, so it **`<link>`s** the kit: it cannot drift, it is a fourth live
test of the library rather than a fourth copy of it, and it needed no token block of its
own. The mirror count is unchanged at three.

**Linking it also supplies the real typeface for free**, and that is a property of where
the stylesheet lives rather than luck: `@font-face` resolves its `url()` against the
**stylesheet**, so the kit's `../_ds/…/GoogleSansFlex-Variable.woff2` resolves to the repo
root from `ui-design-system/`. Verified the way the kit's own font bug taught — measure one
string against the fallback: **1553.2px against 1656.8**, a 6.3% delta, so the real face is
rendering rather than silently falling back to system sans.

**The theme key is shared on purpose.** The page writes `provident-theme`, the same key all
three studios read, so a choice made on the front door carries straight into whichever
studio you open and back again. Set before first paint by a blocking head script, per the
recorded rule; light-first, matching all three consumers.

**Each card's mark is the studio's own canvas shape**, sized from an `--a` aspect on one
fixed 44px box height — the recorded rule that a miniature must be the canvas shape and
cannot drift from what it depicts, because it *is* the ratio. Measured: **1, 0.75**. The
image tool gets three rects instead of one, because it is not one canvas — it is many
placements out of one photo, and a single rect would claim otherwise. Its copy, name and
descriptor come from `Component.STUDIOS` verbatim so the page cannot disagree with the
switcher.

Measured: **0 elevation shadows** in either theme (a card is a ring — the elevation rule
this system runs on), **0 contrast failures** in either theme with ancestor opacity
composited, no horizontal overflow at 1400 or at 375, cards stacking at 339px wide, and the
36px `h1` finally giving Coinbase's display step an element to land on — the kit records it
as available with "no element here to land on".

**IT IS COMMITTED NOWHERE AND CANNOT BE PUSHED FROM HERE.** No `gh`, no `~/.ssh`, and
`git credential-osxkeychain get` returns no stored github.com credential — the same blocker
the Google Reviews branch is parked behind. The file is ready; publishing it is a decision
about whether these internal brand tools go on a public Pages site, which is not a call to
make silently. Its links are **relative**, so it works as a local home page opened off the
disk and as a Pages root without editing anything.

# CAMPAIGN'S TEMPLATE CARDS ARE REAL RENDERS NOW, and the skeleton had drifted exactly as predicted

This reverses the recorded decision to leave them alone. That note said converting them
"means real renders of four free-form module sets, and its skeleton is not carrying a wrong
depiction the way Organic's was" — and the request that changed it was a screenshot of that
depiction going wrong. Measured on the pre-change build, `tplMarks` was:

- printing `provident.` at the card's own 7% instead of where `drawLogo` puts it, so the
  Payment plan card wrote the wordmark **across its own price bars**
- washing a mocked `i.scrim` two-tone band over every card
- sizing bars from a hand table (`H`/`W`) that no longer matched what `modPx` reserves

So a card runs the SAME `buildOps` the export runs, at `TPL_SCALE` .22, on the 1:1 canvas.
`tplMarks` is **deleted**, not left dead.

## CAMPAIGN NEEDS NO `TPLDEMO` TABLE, and that is the one place it is simpler than Organic

Organic needs demo copy because `tplSlides` deliberately seeds nothing. Campaign's
`TPL.mods` already carry the kit's own copy — 'Waterfront living, measured returns', the
Time/Venue spec row, 'AED 2.6M' — so the render has real words with **nothing invented**.

## ONE STATE BUILDER, AND THAT IS THE WHOLE POINT OF THE REFACTOR

`CampaignStudio.tplState(id)` is extracted out of `pickTpl` and read by both, so the card
cannot depict a template that picking it would not build. A second copy for the preview is
precisely how the skeleton came to disagree with the artwork in the first place.

**Proved behaviour-preserving through the REAL path in both documents**, not by reading the
diff: stub `snapshotCurrent` and `applyProject` to capture instead of apply, call the actual
`pickTpl` for all four templates in the pre-change file and in the new one, pass the result
between them through `localStorage`, and compare `modules` / `clusters` / `logoPos` /
`screen` / `campaign`. **All four IDENTICAL.**

## A DEMO QR, PORTED FROM ORGANIC VERBATIM

`buildOps` draws the quiet zone as a plain `#FFFFFF` rect the moment `state.qr.show` is true
and only fills it when an asset exists — and `defaults()` has `show: true`. So every card
would have carried **a blank white square**, which is the exact "showing squares" defect
Organic's own cards were fixed for. Turning `qr.show` off would have hidden a thing every
real campaign ships, so the deterministic LCG grid is ported instead — same seed, same
function, so the two documents cannot drift.

**No other asset is supplied.** There is no photo, cut-out or partner mark: those are the
user's own files and a template card must not depict one it invented. `buildOps` gates the
background on `bg && bg.img`, so with none it simply draws the canvas ground — verified, no
placeholder.

## NO HOVER REEL, AND THAT IS A DIFFERENCE RATHER THAN AN OMISSION

Organic's slides are all 3:4, so reeling through them inside a 3:4 tile never crops. A
Campaign template is ONE design across three canvases — 1:1, 9:16, 16:9 — and a 9:16 render
in a square tile under `background-size:cover` loses most of its height. The card shows the
1:1 master, which is the shape `cardMini` already is.

**No theme in the render key either**, where Organic's carries one. `newVariant` sets
`bg:'dark'`, so all four templates render on the dark canvas palette and the cards are a
uniform set in both chrome themes — there is no paper kind for a ground swap to fix.

## THE TILE IS CHROME AGAIN

`.p-c-p` / `.p-tpl-c` were pinned canvas-dark in both themes, three times over, because the
marks were white bars that a white tile hid. The cards are opaque renders now, so the pin's
reason is gone and the tile is only visible for the frame before a render lands. Un-pinned in
one appended block.

**The dead `.p-c-p i` mark rules are LEFT WHERE THEY ARE**, deliberately: nothing emits an
`<i>` into that tile any more, a selector matching nothing costs nothing, and deleting six
rules out of the middle of an 870-block sheet is the operation that once swallowed half a
stylesheet as nested CSS. Organic deleted its equivalents behind a full `added === 0` audit;
this pass did not need to.

## Verification

| | |
|---|---|
| artwork-path lines | 124 -> 126, and **both differences are ADDITIONS** — the two new `tplRenderAll` call sites. No existing emitter changed. |
| `pickTpl` state, all four templates | **IDENTICAL** to the pre-change build, captured through the real function |
| renders | 4 of 4, op counts 13-14, W/H 1080x1080, clusters and `logoPos` matching each template's own spec (`d` splits hero/hook top, `g` puts the wordmark bottom) |
| the tiles in the DOM | 4 of 4 carry `.p-c-shot` with a webp background, and **0 stray `<i>` marks** |
| self-start | `_tplTick` had already completed before the probe ran — 0ms of polling |
| authored CSS blocks | 870 -> **872**, depth 0, the two new rules the sheet's tail |
| `renderVals` keys | 288 -> 288, and the 14 the naive scan flags are **identical in the pre-change file** — nested object literals at the same indentation, not top-level repeats |
| interpolation sweep | 274 top-level refs before and after, none added, none gone |

# THE LANDING PAGE SHOWS THE STUDIOS' OWN RENDERS, AND THE IMAGE TOOL CARD IS OUT

Two changes on `index.html`, both by request.

**The Web Image Studio card is removed** — "for now", so it is a deletion of the card and
its two dead mark rules (`.lp-m`, `.lp-mm`), not of the tool. The copy followed rather than
being left stale: the h1 is "Two studios, one brand system.", the lede drops "and the
websites", and the meta description drops the tool. A landing page whose headline miscounts
its own cards is the same class of defect as a control that outlives its render.

**Each card now carries a strip of the real template renders above its title** — the same
`buildOps` output the splash cards show and the export writes, captured at each studio's own
`TPL_SCALE` and saved into `preview/`. Nine files, 52KB: four Campaign at 237x237 and five
Organic at 237x316. That replaces an abstract canvas-shape mark that could only state the
RATIO with one that states the whole layout.

**THEY ARE A STATIC SNAPSHOT, and that is the honest cost.** This page cannot run either
engine — that is the whole reason it links the library rather than importing a studio — so a
template redesign leaves them stale until recaptured. **The regeneration route:** serve the
project, open each studio, reach the engine through the documented fiber walk
(`.p-shell` -> `__reactFiber$…` -> walk `.return` to `stateNode.logic` -> `.active()`), poll
`_tplKey` until `tplRenderAll` has settled, then read `_tplShots` and write `shots[id][0]`
per template to `preview/<studio>-<id>.webp`. A POST-capable local server is the way to get
the data URLs to disk, the same harness the award assets were encoded with.

**ORGANIC'S SET IS THE LIGHT-THEME RENDER, and that is a decision.** `tplGroundSwap` makes
the paper kinds follow the theme, and light is the branch recorded as **byte-identical to the
export**. Its dark swap exists to stop one white tile jarring inside the studio's own dark
splash of five cards; a strip of five thumbs inside one landing-page card is a different
context, where the variety IS the information — two of the five genuinely produce paper. So
the page shows what the templates really make in both themes. Campaign's four need no such
call: they are theme-independent.

## `height:auto` IS LOAD-BEARING ON A FLEX-SIZED `<img>`, and this cost a round

The thumbs first rendered tall and cropped — 108x237 and 85x316 — with `aspect-ratio` having
no effect at all. **An `<img>`'s `width`/`height` ATTRIBUTES are presentational hints, so the
height was DEFINITE at the file's own 237/316px** while `flex:1 1 0` set the width; and
`aspect-ratio` only ever supplies a MISSING dimension, so it could not win.

`height:auto` fixes it — and the better fix than adding an `aspect-ratio` at all, because the
box then takes the attributes' own intrinsic ratio, which is the render's real aspect and
therefore **cannot disagree with the file** the way a hand-written ratio could. The `--a`
variable those thumbs carried is deleted. Measured after: 108x108 at ratio 1.000 and 85x112
at 0.754.

`flex:1 1 0` with an auto height also means the row always fits its card and never needs a
scrollbar — the widths shrink and the height follows. Verified at 1240 and at 375: no page
overflow, no strip overflow, thumbs down to 68x68 and 53x70, and the two cards' titles within
5px of each other.

Contrast, both themes, ancestor opacity composited, transitions finished: **0 failures**.
Elevation shadows: **0**.


# THE GUIDED RUN IS ONE PAGE AT A TIME, TOP TO BOTTOM

`Provident Organic Studio.dc.html`'s guided setup was rebuilt by explicit instruction: it
felt "disoriented", it was "jumping from page to page", and the ask was to think like a
non-designer — data top to bottom, text before images, page per page, simpler than the rail.

## THE DISORIENTATION WAS MEASURED, NOT FELT

The six category steps (Content · Photo · Agent · Listing · Look · Save) visited every page
once per content TYPE. On weekly with a single property the walk was

```
Content/Cover → Content/Property → Photo/Cover → Photo/Property → Listing/Cover →
Listing/Property → Look → Save            8 screens, the same two pages three times each
```

and with three properties it was twelve hops between pages before Look. On top of that the
screen carried **three navigations** — a numbered stepper of content types over the card,
Previous/Next ask chevrons under the column, and a Previous Slide / Next Slide bar along the
foot — none of which said where in the POST you were, plus a masked filmstrip that cut the
neighbour card off at the edge so it read as broken.

## A STEP IS A PAGE

`gdPlan()` is one builder for both the steps and the asks, because they define each other: a
slide is a step only if it produced an ask, and an ask's step is its slide's position in that
list. Every page's questions are ONE scrolling form in a fixed section order —

**Pages in this post · Words · Agent · Pictures · QR code & listing number**

— so the words always come before the pictures and every page reads the same way. When the
last page is done there is one **Finish** step: the two look judgements, then where the files
go, then the files. Measured plans:

| template | steps |
|---|---|
| weekly (1 property) | Cover · Property 01 · Finish — **3 screens, was 8** |
| listed | Listing · Finish |
| review | Google review · Finish |
| agents | Cover · Rank 01 … Rank 05 · Finish |
| award | Award · Finish |

**The recorded objection to per-slide stepping does not apply.** That note was about a
version that interleaved a headline with a photo on every card AND dropped refinement and
export from the run. Here the sections keep words before pictures on every page, and Finish
still carries Look and Save.

**The pages ask is on the FIRST page**, whatever kind it is (the cover on weekly, Review 01
on reviews). Adding a page appends a step after the current one, so nothing already walked
renumbers — the same reason it used to go first in the flat list.

**Agent details sit where the card puts them.** A listed card's agent is project-level and is
asked on that card's one page; a review's name, role and headshot form its Agent section; a
ranking card is ABOUT its agent, so there the name and role ARE the words and stay in Words.

## THE SCREEN IS A FORM, AND FIELDS ARE FORM-SIZED

Left: the page's name and purpose, the sections, then Back / Next pinned at the foot. Right:
the page's card large, and under it **every page as a labelled thumb with Finish as the last
tile** — the one navigation besides Back/Next. Top bar: template · `Page 2 of 2` · Skip.

The old question was 19-26px over a 17-22px answer, built for one ask filling a screen;
eight of them at that size is a wall. Now: **13.5px/500 labels over 44px fields at 15px**,
section headers 12px/600 with a numbered disc, tier names (Headline, Property details) as
their own 11.5px line. **Two short answers share a row** — Bed | Bath, Area | Price, Month |
Year, Agent name | Agent role — and only a PAIR is halved: a lone half field reads as
unfinished. The 16px field radius is the recorded decision and stays.

**The background-picture drop is a 144x188 thumb with its label beside it**, the shape the QR
and portrait rows already had. Full-width at 3:4 it was 600px tall and made every page scroll
before the user had read it.

**A tier label earns its line only over two fields, or a field called something else.**
`Award / Award`, `Occasion / Occasion`, `Place / Place` was the tier name printed above its
only field. And `TIERNAMES.tacover` named the month/quarter/year tier "Team": it is
`['Period', 'When', 'Team']` now.

## WHAT NEXT, ENTER AND THE GATE DO

- **Next leaves a page only when everything it asked for is there**; otherwise the blocked
  list rises above the buttons naming each gap (capped at 5, "+ N more"), and a row scrolls to
  the field, puts the cursor in it, and **flashes the row** — a drop zone has nothing to put a
  cursor in, so the flash is what the eye lands on. Verified: an empty property page named
  five and "+ 2 more"; the cover named its picture and its QR.
- **Enter is "next field" on a page of fields**, the way a form works; only from the LAST
  field does it turn the page. Verified through the real document-level handler: USP → Property
  type, and Enter from Listing number raised the gate. `image-slot` inputs live in a shadow
  root and are correctly not in that list.
- **A new page opens at its top.** The form is one scroller across pages and kept the last
  page's offset — the listed page opened scrolled to its Agent section. Reset after the render
  lands with `setTimeout`, not rAF, which never fires while the pane is hidden.
- **Every unfilled dropdown on the page is seeded**, not just "the ask you are on" — with a
  whole page on screen every `<select>` is displaying an answer, and the card must agree with
  all of them. One state write.
- **Done on Finish hands over to the full editor**; downloading is the buttons on that page.

## A DEFECT THIS FIXED THAT NOBODY HAD REPORTED

`strip()` did not delete `gdStep` / `gdAsk`, so **every Next pushed an undo entry** (the stack
is 5 deep) and re-keyed the guided card cache, re-rendering every slide on each move. Where you
are standing is not a change to the post. Both are stripped now; measured `_undoStack` depth
after walking three pages: **0**.

## Verification

- **Artwork: 0 artwork-path lines in the whole-file diff** (55 hunks, 461 added / 564 removed,
  all guided chrome). No `ops.push`, renderer, `drawLogo`, `ART` or geometry-source line moved.
- **Sheet**: one closing style tag, comments balanced, brace depth 0, 973 authored blocks.
  Guided markup `sc-if` 30/30, `sc-for` 10/10. Zero references left to the removed API
  (`gdAgentAsks`, `gdPhaseGaps`, `gdPhaseIssues`, `GDPHASE`, `gdRows`, `gdDots`, `.phase`).
- **Interpolation sweep against the pre-change file**: refs 220 → 207, unresolved 30 → 24,
  **none newly unresolved**; the 7 added keys all resolve; 32 view keys, no duplicates.
- **Contrast on the guide screen, both themes, ancestor opacity composited, transitions
  finished: one flag each, and it is the DISABLED Back button on page 1** (opacity .32,
  1.4.3-exempt). **0 elevation shadows.**
- Card 374x499 at 1400x860, tiles 54x72, form column 519px; the cover page's form is 761px of
  content in a 639px viewport at that height, i.e. one short scroll.

**Left as it was, deliberately:** the rail's own copy of every control (the run reuses them
through `activeSi`), `FIELDS`/`FIXEDTEXT`/`PAGE`, the export gate, and the recents/thumb
plumbing. The old `.gd-steps` / `.gd-foot` / `.gd-asknav` / `.gd-locks` rules are left in the
sheet matching nothing, per the standing rule.

# THE GUIDED RUN IS THE MAIN WINDOW, AND IT CARRIES EVERY CONTROL THE RAIL HAS

By explicit instruction, one pass after the page-by-page rebuild: the guided screen is the
workspace Organic opens on, it sits under the real top bar, and every control the advanced
rail offers has a place on a page. The full editor is still there as **All controls**, one
click away in the top bar — a **Guided | All controls** segmented pair beside the delivery
group, rendered while either workspace is on screen. The rail's own "Guided setup" promo
block is deleted from the markup; the switch is that button in the place it belongs.

**Resume opens on the guided screen** unless the project was explicitly left in the editor
(`p.screen === 'editor'`), which reverses the old `'guide' ? 'guide' : 'editor'` default.
Finish's Done goes back to Projects rather than handing over to the editor: there is no
other workspace to hand over to any more.

**Mechanically it is still the fixed overlay** — `.gd{top:56px}` under a 55px bar plus its
border, and `.p-top{position:relative;z-index:160}` so the Share menu stacks above it.
Verified with `elementFromPoint` inside the open menu.

## What the pages gained, so the rail has nothing the run does not

| page | section | added |
|---|---|---|
| listed | Pictures | the **parallax toggle** (Off/On) and its drop, shown only when on; the photo's *Reset scale & position*, offered once a gesture has moved it |
| ranking cover | Pictures | the **Group photo layer** — the rail's own `grpPills` / size slider / Stand on bottom / Stand all, plus Reset positions. The keys are the rail's, valid because the page IS the active slide |
| award | Pictures | the **partner mark** drop and its Match canvas / Original tint |
| review, ranks | Words | the rail's read-outs under the long field: `13 words · 3 of 14 lines` on the review, words against the 40-word cap on the blurb, red when over |
| Finish | Look | **Story 9:16**, Feed only / Feed + story — the canvas-bar toggle, in the run |
| Finish | Save | **File name**: the custom name, and month / week on weekly, with the resulting filename in the hint |

None of the new asks is gated (`gdAskIssue` returns '' for `px` / `grp` / `alogo` / `story` /
`name`); they are the rail's judgements, not requirements.

## THE PARALLAX LAYER IS OFF BY DEFAULT AND BEHIND A TOGGLE — a reversal

It was always on for a listed card: `normState` forced `sl.fg = true` and both paint paths
read `(sl.fg || sl.kind === 'listed')`. Now `sl.fg` alone gates the op and the preview, a new
slide starts `false`, and only a slide with **no answer at all** (`fg == null`) is defaulted —
so a project written by the older build keeps its `true` and its cut-out keeps drawing. The
toggle is in both surfaces: `pxOpts` in the rail, the `px` ask in the run.

**This is the one artwork-path change in the pass, and it is the requested one.** The
whole-file diff against the pre-change copy carries exactly two artwork lines — the `drawFg`
gate and the `normState` default. No `ops.push`, renderer, geometry source or `ART` line moved.

## EVERY PICTURE DROP IS 4:3 AND EVERY QR IS 1:1, in both surfaces

Backgrounds, the parallax cut-out, every agent and the partner mark are `aspect-ratio:4/3`;
the QR stays square. In the run that is one 188px-wide thumb class for every picture and
110px for the QR; in the rail the background slot went 3:4 → 4:3, `pxCutStyle` with it, and
the three agent slots (`agentCutStyle`, the second agent, `revAgentSlotStyle`) went to
112 × 84. Measured after: run 188 × 141 / 110 × 110, rail 277 × 208 / 112 × 84 / 112 × 112.

**This overrides a recorded decision.** The review's agent slot used to carry the window's
own aspect (84 × 213) so the target depicted the crop; the user chose one shape for every
upload, and the hint still says what the crop is. The headshots also stopped being circles —
the cards never crop to a circle, so a circular target was the same class of lie.

## A SECTION IS A NUMBERED STEP WITH A STATE

Each section is a step in a vertical rail: a 26px numbered disc on the left with a hairline
running down to the next, a 14/600 title, and a state pill at the right. Three states, read
off the same per-ask gate as Next:

- **done** — nothing in it is missing: at once for a section holding requirements, once it
  has been passed for one holding only judgements (`gdAskGated` is the "can this ever block"
  test). Green disc with a tick, pill reads *Done*.
- **warn** — something is missing AND the user has moved on past it (a click or focus in a
  later section) or Next was refused. Amber disc with a mark, amber title, pill *N missing*.
- **cur** — the section under the cursor. Ink disc.

"Moved past" is `_gdReach`, set by a capture-phase `pointerdown` / `focusin` listener on the
document matching `.gd-sec[data-sec]` — a shadow-root target (an image-slot's own input) is
retargeted to its host, so `closest` still works. It resets on every page change. **The page
strip carries the same warning**: a page you have been on and left with gaps (`_gdVisited`)
gets an amber ring and a `!` badge on its thumb.

Verified live: a pointerdown in the QR section turned Pages *Done* and Pictures *1 missing*;
Next refused turned QR *1 missing* too; leaving the cover for Property 01 put the badge on
the cover's tile.

## A SURVIVOR THE AUDIT CAUGHT

`.gd-qrow-t s` — the two caption lines beside every drop — had been re-tokened to
`--ps-ink-2` / `--ps-dim` while the dark-only era's `opacity:.5` was still winning: **3.62:1
and 2.56:1** composited. Quietness expressed as opacity does not survive a re-token any more
than a theme flip. `opacity:1`.

## Verification

- Sheet: 1 closing style tag, comments 289/289, brace depth 0, 1022 top-level blocks;
  guided markup `sc-if` 42/42, `sc-for` 16/16; header `sc-if` 8/8.
- Interpolation sweep: 213 refs, 20 unresolved and every one the documented baseline
  (`expPickVals` keys, the `const`-then-shorthand keys, `true`/`false`); `weekVal` is
  declared on a shared line and is a false positive. All new keys resolve.
- Plans: weekly Cover · Property 01 · Finish; listed Words (5) · Agent (4) · Pictures
  (Background, Parallax) · QR & listing (2); agents cover Words + Group photo layer; award
  Words + Partner mark; Finish Look (wash, photo, story) · Save (name, folder, export).
- Contrast, both themes reloaded into, transitions finished, ancestor opacity composited,
  guided screen plus the top bar: **2 flags each, the disabled Back and the disabled Redo**,
  both 1.4.3-exempt. **0 elevation shadows.**
- The test origin's `localStorage` was cleared afterwards; the viewport reset.

# WEEKLY TAKES 15 PROPERTIES, AND THE CAP WAS DECLARED IN FOUR PLACES

`OrganicStudio.TPLGROW.weekly` is **15**, up from 6, by request. `review` is unchanged at 10.
A 15-property weekly is **17 slides** — cover, fifteen properties, closing slide — and 16
guided pages plus Finish.

**RAISING THE CONSTANT ALONE WOULD HAVE SHIPPED A BUTTON THAT DID NOTHING.** `TPLGROW` was
documented as the one place a page cap lives and it was not: `gdPageMax()` returned
`review ? 10 : 6`, `gdAddPage` guarded on that, and the rail's `addSlide` carried its own
`>= 10` and `>= 6` literals. Only `canAddSlide` read the constant — so at 6 properties the
rail would have offered *+ Add property slide* while `addSlide` silently refused. All four
read `OrganicStudio.growMax(tpl)` now.

`GROWKIND` (`weekly: 'prop'`, `review: 'review'`) is the kind a template's repeated page is,
and `gdPageKind()` reads it rather than carrying the same mapping a second time. **It was
declared unread for one edit** — the dead-control defect this file's own audit went looking
for — and given its reader in the same pass rather than left as a table nothing consults.

Verified live: the rail's Add button pressed until it disappeared lands on **exactly 15
properties / 17 slides** and then retires itself (`canAddSlide` false, button gone); the
guided run's Pages ask adds to 15 and stops; page 1 stays undeletable; the order holds
(cover first, CTA last); `sLabel` pads, so the rail reads *Property 15*. The strip's 17 tiles
wrap to **2 rows, 198px**, with no overflow in the preview column and no horizontal scroll.

## THE CAP EXPOSED A FULL RE-RENDER PER KEYSTROKE, and that is now per slide

`gdKeyOf` is the whole project, so **one character re-rendered every card**. Measured at 15
properties: one keystroke rebuilt all 17 bitmaps and **exactly one differed** — 1213ms on a
retina display, ~1130 of it thrown away. At 6 properties that waste was tolerable; at 15 it
is a second of stale preview per keypress, so the cap is what made it worth fixing.

**THE COST IS THE WEBP ENCODE, not the ops or the assets** — measured separately:
`loadAssets` 8–16ms and `renderOpsToCanvas` **16ms for all 17**, against ~71ms per slide for
`toDataURL('image/webp')`. So the fix is to skip the encode for cards that cannot have
changed, not to make the render cheaper.

`gdSlideKey(si)` is that key, and **every term is there because something reads it**:

| term | why |
|---|---|
| the scale, the photo stamp | the two inputs outside the project state |
| the PROJECT-level values (`strip(state)` minus `slides`) | every card reads `scrimH`, `imgO`, the agent, the QR flags |
| the kind SEQUENCE | `bgIndexFor` and `taRank` are position-dependent |
| its own fields | the obvious one |
| **the ranking COVER's fields** | the one cross-slide FIELD read in this engine — every rank card draws `Top agent - taDate(cover)` and `<cover.team> Team` |

That last term is the one a naive per-slide cache gets wrong. Found by walking `buildOps`
for cross-slide reads rather than assuming: `bgIndexFor`, `grpLayers`, `taDate(...)` and
`slides.find(z => z.kind === 'tacover')`. **Miss one and a card goes stale, which is far
worse than a slow one.**

**PROVED THE CACHE CANNOT SERVE A STALE CARD.** A 17-slide weekly with distinct copy per
page, cached set against a full uncached rebuild at the same scale: **17 slides, 0
mismatches, 17 distinct bitmaps.** Then each invalidation path, counted by instrumenting
`toDataURL` rather than by wall clock (the shell's own `componentDidUpdate` sync fires first,
so a manual `gdSync` afterwards reports 0ms and tells you nothing):

| change | encodes |
|---|---|
| cold | 17 |
| one field on one page | **1** (was 17) |
| `scrimH` 40 → 85, project level | 16 of 16 |
| `imgO` | 16 of 16 |
| the ranking cover's team, on the agents template | **6 of 6** — the cross-slide term proving itself |
| a page deleted | 16 — every index shifts, so every key does |

**A MEASUREMENT THAT LOOKED LIKE A BUG AND WAS MY OWN TEST.** A project-level `scrimH` write
reported **0 encodes**, which reads exactly like the cache going stale on a value every card
draws. The previous probe had already set that value, so the second write was a no-op and the
key correctly did not move. **Write a genuinely different value before believing an
invalidation test.**

## THE EXPORT GATE BECAME A WALL, and this file already had the rule

At 15 properties `gdExportBlockers()` returns **32** items — the cover QR, then a QR and an
11-digit number per property, then the folder. The Finish step rendered all 32 rows and the
Share panel's `.p-alert` ran to **987 characters**. That is the wall of rows *What is left is
shown only when it BLOCKS you* caps at `GD_BLOCK_MAX` for the per-page list, and the cap had
simply never been applied to these two. Both capped now: **5 rows + "+ 27 more, on the pages
marked above"**, and the alert measures **180 characters**. The page strip's own warning
badges are what say which pages they are on.

## AN INVERSION IN THE WARN TREATMENT, from the pass before this one

`--ps-warn` is a **light** amber in dark and a **dark** brown in light, and both the section
disc and the page tile's `!` badge inked it with a literal `#1D1D1F` — invisible in light
mode. **Sixth instance of the fill-inverts-ink-does-not defect in this project.**
`var(--ps-app)` is near-black in dark and white in light, i.e. exactly the opposite of
`--ps-warn`, so one token reads on both and the `[data-theme="light"]` override it needed is
deleted. Measured after: white on `rgb(138,98,6)` in light, `rgb(19,21,25)` on
`rgb(234,179,8)` in dark.

The warned tile's **label** was `--ps-warn` on the stage at 11px: **4.35:1**, just under AA.
The ring and the badge are non-text indicators and carry the state at 3:1, so the label takes
`--ps-ink` instead of the status hue — which also makes it the loudest label in the row.

## Verification

- **Zero artwork-path lines in the whole-file diff** (15 hunks, 68 added / 18 removed). The
  `buildOps` and `renderOpsToCanvas` call sites inside `gdRenderAll` are byte-identical and
  simply moved inside a guard, so no op can have moved; the removed-line list is the cap
  literals, the four warn declarations and the two uncapped lists.
- Sheet: one closing style tag, comments 290/290, brace depth 0, 1023 top-level blocks;
  guided markup `sc-if` 43/43, `sc-for` 16/16.
- **Contrast at 15 properties, both themes reloaded into, transitions finished, ancestor
  opacity composited, guided screen plus the top bar: 1 flag each — the disabled Redo**,
  1.4.3-exempt. **0 elevation shadows.** No console errors through the whole exercise.
- `studio-base.js` is byte-identical to its backup; Campaign, the image tool and
  `ui-design-system/` are untouched. The test origin's `localStorage` was cleared and the
  viewport reset.

## Left as a decision, not applied

- **`RECENT_THUMBS` is 6**, so a 17-slide weekly's recents card reels through the first six
  of seventeen. That is the reel's own cap and it predates this change; raising it embeds
  seventeen thumbnails in every recents entry, which is what the cap exists to bound.
- **`loadAssets` has no decode cache** and refetches `.image-slots.state.json` with
  `cache: 'no-store'` on every sync. Cheap here (8–16ms, no photos in the test project), but
  with 15 real photos and 15 QRs it is 30 decodes plus a multi-megabyte parse per keystroke,
  and it is now the largest remaining cost in the guided run. A URL-keyed memo would be safe
  — a re-upload produces a new URL — but it also sits on the EXPORT path, so it wants its own
  pass and its own proof.

# THE GUIDED FORM IS THE RIGHT RAIL IN ALL CONTROLS — one markup, two homes

By request: "keep that design flowing in all template windows in All Controls." The old
`.p-rail-r` aside — This slide / Canvas / All slides, ~240 lines of hand-written groups — is
**deleted**, and the guided run's form renders in its place. Not a restyle and not a copy:
the SAME `<div class="gd">` block, the SAME `gdSecs` builder, in two homes.

**HOW THE TWO HOMES WORK.** The block moved out of its old place before the header and into
`.p-body`, where the aside was, so it is the last flex child after the stage. Its gate is
`gdFormOn` (guide OR editor) and it carries `data-mode`. In guide mode nothing changed — it is
still the fixed overlay at `top:56px`, z 150, and fixed positioning does not care where in
the DOM it sits (verified: rect top 56, height 804, preview column shown, 3 tiles). In editor
mode `.gd` and `.gd-body` are **`display:contents`**, so `.gd-in-zone` becomes a flex child of
`.p-body` directly — a 322px rail on the stage's right edge — while the preview column, the
Back/Next bar, the blocked list and the progress bar are hidden. Measured: zone width 322 at
left 1078, which is the stage's right edge exactly.

**WHAT THE RAIL SHOWS.** The active slide's page — Words · Agent · Pictures · QR & listing —
plus **Look on every page** (wash, photo strength, the story toggle: project-wide values the
rail always had), and neither Pages (the slides list is the left rail) nor Save (the Share
panel). No gate, no Finish. A slide that asks nothing — the weekly closing slide — gets a
note instead of an empty column: *Nothing to fill in on this page. The template writes
headline, button label. It shares the cover's photo and QR code.*

`gdFormStep()` is the one answer to "which page is the form showing": the run's step on the
guided screen, the active slide's page step in the editor, or -1 when that slide produced no
asks. The view builder, `gdSeedSelect` and the reach listener all read it, so a dropdown on
the rail is seeded exactly as on the run (verified: Property type → Villa, City → Dubai on
arrival) and a section's done/warn state works in both homes.

**A -1 STEP BROKE THE HIDDEN CARD.** `gdCard` read `step.si` and threw on the closing slide,
because `sl` (the active slide) was truthy while `step` was null. Keyed on the active slide in
editor mode. The whole form failed to render for one slide kind, with no console error on the
first render — found by the probe reading `.gd-head b` as null.

**ENTER IS "NEXT FIELD" IN BOTH HOMES; only on the guided screen does the last field turn the
page.** Verified by dispatching the key ON the focused input — a keydown dispatched on
`document` has no field as its target and the handler correctly ignores it, which the first
probe misread as a defect.

**THE 4:3 / 1:1 RULE REACHES THE RAIL BY CONSTRUCTION NOW**, since the rail's drops ARE the
run's: 150 × 113 for every picture (backgrounds, the parallax cut-out, every agent, the
partner mark) and 100 × 100 for the QR, at the rail's width. The old rail's own slot sizes
(`agentCutStyle`, `revAgentSlotStyle`, `pxCutStyle`) are still declared and now unread.

## Adapted to the rail's width, in one appended CSS block

The vertical step rail (the disc's connecting line) is dropped and the disc sits inline in the
header at 22px; headers 13px, the state pill 11px; fields 14px at 10px 12px; drops 150 / 100.
Everything else — pairs, hints, section states, the empty-page note — is the run's CSS
unchanged. Below 1200px the rail is a sheet exactly as the aside was: `position:fixed`,
`right:calc(-1 * min(340px,88vw) - 12px)`, `[data-open]{right:0}`, driven by the same
`shPanelOnLayout` and the panel bar's Slide button. Verified at 1100px: off-screen closed,
`right:0` at `top:56` open, closed again by the veil.

## What went with the aside, deliberately

- **Inline errors at rest** (`Required — upload this property's QR code`, the listing number's
  red text). The run's rule is that a gap is named when it blocks: the section pill reads
  *2 to fill in*, and export surfaces the whole list in the Share alert and on Finish.
- **The `i` tooltips.** Their prose is in the rows' hints now; the photo row's hint is the old
  `bgStatus` line via `bgStatusFor(si)`, so the stored-size warning and the "linked to the
  cover" note survive.
- **The rail's render keys are NOT deleted** — `grpCtlOn`, `propQrOn`, `coverQrOn`,
  `reviewAgentOn`, `agentOn`, `qrGlobalOn`, `awLogoGrpOn`, `bgAllowed`, `pxAllowed`,
  `scrimAllowed`, `imgOAllowed`, `allSlidesOn`, `activeBgId`, `listnoVal` and the whole
  `slideFields` builder are computed and read by nothing. Deleting render keys that look unused
  is how ~14KB of Campaign's `renderVals` was once lost; they cost a few microseconds.
- **The left rail is untouched** — Template, the Slides list, the Add button.

## A PRE-EXISTING FAILURE THE WIDER AUDIT CAUGHT

The group photo layer's five rank pills quieted an unplaced rank with **`opacity:.38`**, which
composited to **1.94:1 in light** on all five labels. It was the rail's own control and it had
never been audited in light on the agents template. Quietness expressed as opacity does not
survive a theme flip — the fourth time this exact rule has caught a live element — so the
quiet tier moves into the token: `--ps-dim` at opacity 1, 4.9–5.0:1 on that fill in both
themes. The pills are shared by both homes, so the run is fixed by the same edit.

## Verification

- **Zero artwork-path lines in the whole-file diff** (30 hunks, 421 added / 568 removed —
  the aside). `buildOps`, both renderers, every geometry source and `ART` are untouched.
- Sheet: one closing style tag, comments 292/292, brace depth 0, 1046 top-level blocks. The
  markup's `<sc-if>` count is 116/115 and **the backup is 154/153 — the same one-off**, the
  documented bare `<sc-if>` inside a CSS comment; a stack walk never goes negative.
- Interpolation sweep: 143 refs, 18 unresolved, every one the documented baseline;
  `slideFields` left the ref list because its markup did.
- Per template in the editor: listed → Words (4) · Agent (2) · Pictures (1) · QR & listing
  (2) · Look; weekly property → Words · Pictures · QR · Look, 14 rows; weekly closing slide →
  the note + Look; agents cover → Words · Pictures (5 pills, size, Stand, Reset) · Look; rank
  → the cut-out requirement in the photo hint; award → Partner mark + tint; review → Agent
  with a 4:3 drop and the `0 words · 0 of 14 lines` counter.
- **Contrast, both themes reloaded into, transitions finished, ancestor opacity composited,
  over the form rail, the left rail, the canvas bar and the top bar: 1 flag each, the
  disabled Redo**, 1.4.3-exempt (the guided screen adds the disabled Back on page 1). **0
  elevation shadows.** No console errors across every template and both modes.
- `studio-base.js`, Campaign, the image tool and `ui-design-system/` are untouched. The test
  origin's `localStorage` was cleared and the viewport reset.

# CAMPAIGN'S RAILS TAKE THE GUIDED FORM'S LANGUAGE

By request, one pass after Organic's guided form became its All-controls rail: "do the same
refinements on the UI" in `Provident Campaign Studio.dc.html`. Campaign has no guided run and
no gate, so what carries over is the form's VOCABULARY, applied to the rails it already has —
the component rail, the Layout rail and the all-variants dock. Three things, all chrome, one
appended CSS block (section 24) plus the markup wraps and one set of render keys.

**A SECTION HEAD IS A NUMBERED DISC, A 13/600 TITLE AND A STATE PILL.** `.p-shd` — not
`.p-step`, which is already the kit's stepper component in this file. The pill says what the
section wants: *This component* reads **Pick a component** with nothing selected, **N to fill
in** when the selected component has an empty text, small label, chip list, column list or
graphic file, and **Done** with a green tick otherwise; *Background image* reads Done or 1 to
fill in off the active variant's photo; *All variants* reads off the QR — 1 to fill in only
while the QR is set to visible and missing; *Hidden components* counts; *Layout* is Optional.
None of it gates anything; a component with no text renders nothing, and the head says so
before the export does. Verified live: blank the hero's text and the head flips to *1 to fill
in*, restore it and it flips back to *Done*.

**A DROP IS A DASHED 4:3 THUMB WITH ITS CAPTION BESIDE IT AND A GREEN EDGE ONCE A FILE IS
IN.** Every picture — the background, the two per-size own photos, the overlap cut-out, the
graphic file, the partner mark — is `aspect-ratio 4/3`; the QR stays 1:1. That **reverses the
recorded rule that a background slot carries its canvas's own aspect** (1:1 / 9:16 / 16:9, so
the target depicted the crop) and the graphic's full-width 88px strip; one shape for every
upload was the user's decision, applied to Organic first, and the crop is what the reframe
overlay is for. Measured at rail width: 128 x 96 for every picture, 102 x 102 for the QR.

**CAMPAIGN HAD NO FILL MAP.** Organic's tick has always built `_filled` from the sidecar; this
engine's `_refreshAV` reads the same file and never kept the answer. It does now, and
re-renders only when the map changes, so a quiet frame costs nothing. The drop rows' done
state and the section heads read it.

**FIELDS ARE FORM-SIZED, SCOPED TO THE RAILS AND THE DOCK**: 13/500 ink labels over 42px
fields at 14px on a 16px radius, 11.5/400 dim hints. The Share panel and the hex input keep
the kit's 36px field — `:not(.p-in-s)` and the `.p-rail` / `.p-dock-b` scope are what keep
them out.

## Two things measured wrong on the first cut, and why

- **The partner mark's drop came out 1.08:1, then 1.04:1.** The dock's row is
  `align-items:stretch` so the QR square can take its row's height (the recorded trick), and
  the wrapper — then the slot — took the row's height instead of the 4:3. `maxWidth` clamping
  produced the first number; removing the stretch trick from the mark but not from the wrapper
  produced the second. **A drop sizes itself from its picture's aspect and never from its
  row**: `.p-drop{align-self:flex-start}`, and only `.p-drop-fill` — the QR — opts back into
  the stretch. Measured after: 127 x 95.
- **The multi-line text hint composited to 2.89:1 in BOTH themes.** `<span style="opacity:.65">`
  on the "Enter for a new line, up to 4" qualifier — quietness as an inline opacity, the trap
  this file records repeatedly, and one the rail audits had never seen because they never had
  a text component selected. The span reads `--ps-dim` at opacity 1 now.

## What the frames still own

The Layout rail's option tiles (62px, the frame's), the palette rail's cards and group boxes,
the 15/16 group padding and the all-variants dock's own geometry are untouched — the Figma
frames specify them and the guided form has no counterpart. **The one measured departure**: the
Layout rail's group label goes 13/400 → 13/500 so one label weight runs across all three rails;
the `Container` frame states 400. One rule (`.p-rail .p-lab`) if it should go back.

## A STALE COPY SITS IN A SUBFOLDER

`Provident Campaign Studio/Provident Campaign Studio.dc.html` (514KB, 7 September) is an older
copy of the root file (599KB, live), and the desktop app's `@` path completion offers it. The
root file is the one every pass edits and the one CLAUDE.md's "both `.dc.html` files must sit
in THIS folder" rule refers to. It was left in place — deleting a file is the user's call — and
nothing here reads it.

## Verification

- **Zero artwork-path lines in the whole-file diff** (17 hunks, 139 added / 16 removed): no
  `ops.push`, renderer, `palOf`, `scrimStops`, `drawMod`, `modPx`, `heroLines`, `specBox`,
  `PAL` or `SCRIMS` line moved. This pass is CSS, markup wraps and render keys.
- Sheet: one closing style tag, comments 310/310, brace depth 0, 902 top-level blocks. The
  markup's `<sc-if>` count is 144/143 in the backup and after — the documented one-off.
- Interpolation sweep: 295 refs, 22 unresolved, every one the documented Campaign baseline;
  two new keys (`secHiddenState`, `secLayoutState`) were referenced before they were declared
  and are declared `undefined` now, so a `data-state` attribute resolves to nothing rather than
  to its own placeholder text.
- **Contrast, both themes reloaded into, transitions finished, ancestor opacity composited,
  over all three rails, the open dock, the canvas bar and the top bar, with a component
  selected and the collaboration logo on: 1 flag each, the disabled Redo**, 1.4.3-exempt.
  **0 elevation shadows.** No console errors.
- `studio-base.js`, Organic, the image tool and `ui-design-system/` are untouched. The test
  origin's `localStorage` was cleared and the viewport reset.

# THE SECTION HEADS LOST THEIR NUMBERS, AND FOUR CAMPAIGN SURFACES WERE TIDIED

Feedback on the pass above, with six screenshots: "number is not necessary" on the section
heads, the Background head "doesn't need to have status", and fix/improve on the Hidden
components block, the all-variants dock, the canvas bar and the top bar's right cluster. All
chrome — section 25 of `Provident Campaign Studio.dc.html`'s sheet plus markup and render
keys. **Zero artwork-path lines in the whole-file diff** (22 hunks, 158 added / 44 removed).

**A SECTION HEAD IS A TITLE, AN OPTIONAL QUIET DESCRIPTOR UNDER IT, AND A PILL ONLY WHERE
THE PILL CAN CHANGE.** The numbered disc is `display:none` and out of the markup. Of the five
heads, three keep a pill — *This component* (Pick a component / N to fill in / Done),
*Hidden components* (N hidden / None) and *All variants* (1 to fill in / Done) — and the tick
moved from the disc into the pill (`.p-shd-tk`, shown on `[data-state="done"]`). *Background
image* lost its pill by instruction, and *Layout*'s "Optional" went with it: **a pill whose
text can never change is decoration, not state.** `secBgState` / `secBgNote` /
`secLayoutNote` are still computed and now unread, by the standing rule about render keys.

**THE DESCRIPTOR WENT UNDER THE TITLE BECAUSE THE HEAD WAS GENUINELY FULL.** "This component"
(106px) + "Master · 1:1" (61) + the Done pill (62) measured 173 in a 165px title column, so
the descriptor ellipsised with nothing to spare. It is a second 11.5px line now
(`.p-shd-t` wraps, `> s` takes `flex:1 0 100%`), which is the guided form's own section-head
shape; the info tip stays on the title line, and the head is `align-items:flex-start` so the
pill sits on the title row rather than centred over two lines.

**THE HIDDEN LIST IS ONE FILLED BOX, A ROW PER COMPONENT** — kind in ink over its copy in
dim, both ellipsised, Show as a small ghost and Delete as a text-only red at the right, the
full string in the row's `title`. **Beside each other the copy got 33px** of a 237px rail next
to two text buttons, which is why kind and copy stack. This partly reverses the recorded
"name-over-buttons is the only layout that survives a long name": the buttons sit beside the
name now, and the name survives by truncating rather than by wrapping. The empty state is the
`.p-empty` note, gated on a new `hasHidden` flag — a filled box around nothing is the
`:empty`-never-matches trap, since DC leaves whitespace text nodes.

**THE DOCK'S TWO TOGGLES ARE PAIRS, AND EACH GROUP RUNS FULL WIDTH.** *Visible | Hidden* and
*Off | On* as `.p-tabs` over a one-line hint, then the drop row, then the group's own controls
under it — instead of a toggle and tiles crammed beside a drop that stretched to their height.
The QR is a fixed 100px square (`.p-drop-sq`) exactly as every other drop is a fixed 4:3, and
its corner tiles are labelled *Bottom left / Bottom right* and **render only while the code is
visible** (`qrShowFlag`) — a corner for a code that is not printed is the dead-control defect
the audit went looking for. Each half has its own setter and flag (`qrSetShow` / `qrSetHide` /
`qrHiddenOn`, `coSetOn` / `coSetOff` / `coOffOn`); the old `qrToggle` / `coToggle` keys stay.
**The body is taller for it**, so its cap went `52vh` → `calc(100vh - 196px)` (it clears the
bar and the pill row) and its scrollbar joined the styled set — it had been the browser
default, the only scroller in the document that was.

**THE CANVAS BAR IS A 44px TOOLBAR**: name 13/500 ink, the variant count a quiet pill, the
status a dot-and-word chip at the right — green dot and `Ready` at rest, a dim dot and the
message otherwise (`cvOkOn` / `cvStatus`; the Share panel keeps the sentence verbatim). The
`<1200px` rule that pads the bar's bottom for the panel bar is restated in the block, because
the block's own `padding` shorthand would otherwise have beaten it.

**UNDO AND REDO JOINED THE DELIVERY TRIO'S CAPSULE** (`.p-tgrp.p-tgrp-h`) with the Material
Rounded `undo` / `redo` glyphs — the bar's icons are all that family at wght300 and the two
font arrows were the last that were not. Disabled is `opacity:.45` on the cell, 1.4.3-exempt,
which is what `.p-btn-q` did. The theme toggle is a true 36 × 36 circle (it was 35 × 36 — two
rules, two values). Share's `▾` is the Material `keyboard_arrow_down`, and it turns 180° while
the panel is open (`.p-ghost[data-on] .p-chev`).

## Verification

- Sheet: one closing style tag, comments 318/318, brace depth 0, 947 top-level blocks; markup
  `sc-if` 145/145 and `sc-for` 46/46. Interpolation sweep: 299 refs, 13 unresolved — the
  documented baseline — and **none newly unresolved**; all 14 new keys resolve.
- Measured at 1440 × 900: every top-bar control 36 tall (was 29 / 31 / 35 / 36); QR drop
  100 × 100 with an 88 × 88 slot; the partner-mark and photo drops 140 × 108 with 128 × 96
  slots; the bar 45 with its border; the hidden row 46; the descriptor line 165 / 288 wide
  with no truncation.
- **Contrast, both themes reloaded into, transitions finished, ancestor opacity composited,
  with a component selected, one hidden, the dock open and the collaboration logo on: dark 0,
  light 2** — the disabled Redo and the copy-coverage chip's amber at 3.75, both already
  recorded. **One elevation shadow in both themes: `.p-selctl`, the floating component
  control** (`0 8px 22px rgba(0,0,0,.45)`), pre-existing and untouched — earlier audits did
  not catch it because that control is `display:none` until the tick pins it. Flagged, not
  changed: it floats over artwork, which is the one place a ring cannot be relied on.
- The test origin's `localStorage` was cleared; `studio-base.js`, Organic, the image tool and
  `ui-design-system/` are untouched. **Organic's top bar and canvas bar still carry the old
  Undo/Redo arrows and the baseline-aligned bar** — the top bar is the same markup in both
  documents, so this is a visible divergence until the same two edits land there.

# THE PROJECT BROWSER'S SIDEBAR, AND THE TOP BAR OFF ORGANIC'S SPLASH

Asked for with both studios' welcome screens screenshotted: "improve the UI of this welcome
window for both studio specially on the left side bar", "fix also the overlapping happening
on organic post studio, the top navigation doesn't need to appear on organic post studio",
and "use W3.org icons". Three things, all chrome, mirrored into both documents because the
splash is the same markup in both. **Zero artwork-path lines in either whole-file diff**
(Campaign 4 hunks, 40 added / 5 removed; Organic 7 hunks, 46 / 5).

**THE OVERLAP WAS A Z-INDEX I HAD ADDED.** The guided-window pass gave Organic
`.p-top{position:relative;z-index:160}` so the Share menu would stack over the guided overlay
(z 150). The splash and the template picker are `.p-over` overlays at **z 60**, so the bar —
never gated in either document, and simply covered by Campaign's overlay — painted over
Organic's splash and hid its own header row (the `All` title, the theme toggle, Open Session
and + New post sat under it). It is gated now: `<sc-if value="{{ shTopOn }}">` around the
header, with `shTopOn: s.screen !== 'splash' && s.screen !== 'pick'`. Verified by driving
`screen` through the engine: **present at 56px on the guided screen, absent on the splash and
on the picker.** Campaign's bar is left as it was — in the DOM, under its overlay
(`elementFromPoint` at its centre returns the splash's title).

**THE FIVE NAV GLYPHS ARE INLINE SVG NOW.** `▦ ◫ ◷ ◰ ↻` were Unicode characters rendered
from whatever font the OS chose — the one place in the chrome that still was. They are
Material Symbols Rounded at wght300, the family every other icon in the bar already is:
`grid_view` (All), `space_dashboard` (Templates), `schedule` (Recent), `folder_open` (Open
folder — the top bar's own path, reused) and `history` (Continue last). **"W3.org icons" is
read as SVG icons** — the SVG namespace is `w3.org/2000/svg`, and the W3C publishes no icon
set — and it is worth checking that reading if a specific set was meant.

**A NAV ROW IS QUIET AT REST.** `.p-nav2` filled every row with `--ps-fill`, so the Library and
Session lists were a stack of five filled pills with the active one navy — nothing in the
list quieter than anything else. A row is transparent now, `--ps-fill` on hover, the resting
accent when it is the view: 38px, 13.5/500, the icon in an 18px box, the count as a small
`--ps-fill` pill at the right. **The ON row's icon and count inherit the row's ink**, which
closes the recorded 4.45:1 pair for Campaign — the `▦` chip used to keep `--ps-dim` over the
navy fill. The studio rows keep their canvas-shape chip (the mark IS the ratio), on a 16px
card with the name at 13/600 and the descriptor at 11.5/400; section labels are 11.5/500 with
room above them. The 13.5/500 row departs from the Coinbase button role (14/600) that a later
rule had put on `.p-nav2`: a sidebar nav list is not a row of buttons.

**AND ONE DEFECT THE AUDIT FOUND BEHIND THE OVERLAY.** Organic's active slide badge
(`badgeStyle`) filled with `--ps-accent` and inked `--ps-primary-i` — white in both themes on
a fill that is a pale tint in light: **1.36:1**, the recorded fill-inverts-ink-does-not class,
and the exact object Campaign's own pass fixed. It reads `--ps-accent-i` now. It was caught
because the contrast walk cannot see that the splash covers the editor; that is a false
positive for the splash and a real finding for the editor, which is why it was fixed rather
than dismissed.

## Verification

- Sheets: one closing style tag each, comments balanced (Campaign 319/319, Organic 293/293),
  brace depth 0, 964 / 1068 top-level blocks; markup `sc-if` 145/145 and 116/116 (Organic +1
  for the gate), stack walk never negative. Interpolation sweep: no newly unresolved key in
  either file; `shTopOn` resolves.
- Measured at 1440 × 900 in both studios: sidebar rows 38 tall, icons 17 × 17, studio rows
  51 on a 16px radius, the header row at y 26 with the title `All`, no top bar in Organic's
  DOM on the splash.
- **Contrast on the splash, both themes reloaded into, transitions finished, ancestor opacity
  composited: Organic dark 0 / light 0 after the badge fix; Campaign dark 0 / light 3, all
  three in the editor behind the overlay** — the disabled Undo/Redo pair and the amber
  coverage chip, both already recorded. **0 elevation shadows** in all four runs.
- The test origin's `localStorage` was cleared and the viewport reset; `studio-base.js`,
  the image tool and `ui-design-system/` are untouched. `.p-ws*` and `.p-nav2` are app
  markup with no kit rule, so nothing is owed to the library.


# THE WEEKLY PROPERTY TITLE IS ONE FLOWING SENTENCE, AND ITS SPEC PANEL IS THE LISTED GLASS

Two requests on `Provident Organic Studio.dc.html`'s weekly property page, both with
screenshots. "I don't want the text having a line break like this — it should be 1 flowing
sentence, keep the functionality as it is", and "add the blur container we have on just sold,
copy also the stroke width and opacity of the dividers and the container stroke".

**THIS PASS CHANGES ARTWORK, by request, and it is scoped to one slide kind.** The whole-file
diff against the pre-change copy is 8 hunks, and every artwork-marker line in it is inside
`propTitleWrapped`, the `prop` branch of `buildOps`, the `prop` branch of the preview, or
`scrimBands`' `prop` case. Op census over five templates x every slide x both canvases:
**24 groups, 22 byte-identical, and the only two that differ are `weekly/prop` on the feed and
on the story.**

**THE TITLE WAS TWO LINES WRAPPED SEPARATELY, so the break after "in" was forced.**
`propLines` returns `[head + ' in', building + ', ' + city]` and `propTitleWrapped` ran each
through `wrapRuns` on its own — so "Apartment in" ended a line however much room the column
had. `propTitle(f)` composes the one sentence and `propTitleWrapped` wraps it once; the
fields, the rail and the guided form are untouched (verified: the rail's inputs still carry
USP, type, building, city, area and price). `propLines` stays for the two dead `titleL1` /
`titleL2` render keys, by the standing rule.

**The connector is added whenever a LOCATION follows the head, not only ahead of a building.**
On two lines a lone city stood as its own line and needed none; in one sentence "Apartment
Dubai" is wrong and "Apartment in Dubai" is right. That is the one semantic change beyond the
join, and it only bites on a page with a city and no building.

Measured with the screenshot's copy: the feed wraps to three lines — "Marina-view, Vacant and
Open to Offers" / "Apartment in Blakely Tower, Park Island, Dubai" / "Marina, Dubai" — the
story to three different ones, and the preview's six baselines land within **0.4 canvas px**
of the ops (integer `offsetTop` rounding). Both surfaces read `wkSpecBox`, so they cannot
disagree.

**THE PANEL IS THE LISTED CARD'S MATERIAL, copied value for value:** a `blur` op at
`TA.panelBlur` (30) under `ART.deepGlass` (`rgba(26,41,66,.65)`), the container stroke 1px in
`ART.hairEdge` (.165), the dividers 1px in `ART.hair` (.25) — the same four tokens the listed
panel and the review card read, so there is still one glass in this file. It was a 1px
full-white frame with .55 dividers, which is what `Property.svg` draws; the request overrules
the drawing here. The preview mirrors it with `backdrop-filter: blur(30px)` — a plain px
length, not `cq()`, per the listed panel's convention — and measured box-for-box: feed
`174 / 443 / 732 x 172` against the op's `174.2 / 443.3 / 731.6 x 171.8`, dividers at
306 / 443 / 671 against 306.3 / 442.6 / 671.1; the story likewise. The preview's border
computes to 2.45 canvas units, the documented device-pixel floor the other two glass panels
share.

**THE TOP WASH NOW ENDS AT THE TITLE, NOT AT THE PANEL.** The band used to run to the panel's
bottom plus 20; it runs to the title's last baseline plus 20 now. That is the listed card's
own rule — a glass surface needs no band of its own, and a wash under it darkens the backdrop
the blur exists to show, which is exactly what once made the ranking panel read as opaque.
Note the band's 240px fade-out still reaches under the panel's top (feed: band ends 401, panel
443–615), so the glass emerges from the wash rather than sitting on clean photograph; the fade
length is `bandStops`' shared constant and was not touched. One line to revert.

**Measured and flagged, not changed: the spec LABEL on the glass.** `A.mute` at 19px/500 on
the glass over a pure-white photograph composites to **3.04:1**; the value in `A.ink` is
4.73 and `A.warm` would be 4.45. Over black they are 11.1 and 17.3. The listed panel's runs
are all `A.ink`; switching the label would match it and clear AA, but the request named the
container and the strokes only.

Sheet integrity unchanged (1 closing style tag, 293/293 comments, depth 0, raw `sc-if` /
`sc-for` counts identical to the backup); no CSS and no markup changed. The `_PRE` copy was
removed from the project folder, the server stopped and the test origin's storage cleared.
Backup at `scratchpad/pre/O8.html`.


# THE WEEKLY PROPERTY PAGE, REBUILT TO A SECOND DRAWING: USP CHIPS, A 760 COLUMN, A LIGHT GLASS

Supplied as `property.svg` (1080 x 1440) plus a snippet for the panel's material, one pass
after the title became a flowing sentence. Three things, all on the `prop` slide kind and
therefore scoped to weekly by construction. Op census, five templates x every slide x both
canvases against the pre-pass backup (`scratchpad/pre/O9.html`): **24 groups, 22
byte-identical, and the only two that differ are `weekly/prop` on the feed and the story.**
The whole-file diff is 18 hunks and every artwork line in it is inside `WK`, `ART`,
`propTitle` / `propUsps`, `wkSpecBox`, the `prop` ops branch or the `prop` preview branch.

**THE MARKETING USP IS A ROW OF CHIPS, and the bar is the separator.** The field is typed as
points separated by `|` — `Marina view | Vacant | Open to offers` — and `propUsps` splits,
trims, drops empties and upper-cases each; a USP with no bar is one chip. Each chip is the
weekly cover's own hairline-framed kicker at the drawing's numbers: 48 tall, rx 12, 1px
`ART.ink` stroke, no fill, 16/500 caps at .1em in `ART.warm`, ~14 of side padding and 20
between chips, the row centred on the canvas axis. **The label is `tk.eyebrow x (16/24)`,
not a literal 16**, so the story's 28px eyebrow gives it 18.7 there for free; the chip's box
is absolute, as the cover chip's 86 is.

**IT IS AN AUTO LAYOUT, which is what the request asked for in those words.** `wkSpecBox`
lays the chips out left to right and wraps to a new row when the next would cross the
column, each row centred; the title's first baseline hangs off the LAST row
(`uspGapBot`), the panel hangs off the title's last line (`panelGap`), and the QR stays
bottom-anchored. So more points, or a longer title, push everything beneath them down. With
no USP at all the row collapses and the title takes its old anchor off the wordmark
(`titleGap`) — an empty item in an auto layout takes no space.

**THE TITLE IS TYPE + LOCATION NOW, and it wraps at 760.** The drawing's title starts
"Apartment in …" because the USP moved up into the chips, so `propTitle` dropped the USP from
the sentence. Its text frame is 760 wide at x 160 (`titleMaxW`), where the column had been the
whole 920 inner width; the request stated the number outright. Measured with the
screenshot's copy: the feed breaks after "Park", exactly where the drawing breaks.

**EVERY NUMBER LANDED ON THE DRAWING MINUS THE WORDMARK'S OWN 5.2**, which is the one
consistent shift this file records for every template (`pT + tk.logo * .8` = 122.8 against a
drawn 128):

| | drawn | ours |
|---|---|---|
| chip row top | 221 | **215.8** |
| chip x / w | 308 / 148 · 476 / 98 · 594 / 178 | 303.7 / 150.9 · 474.7 / 99.6 · 594.3 / 181.9 |
| chip label baseline below the chip top | 29 | 29.8 |
| title first baseline | 343.2 | **338.0** |
| title lead | 57 | 57.1 |
| panel top | 451.4 | **446.2** |
| panel h / r | 172 / 28 | 171.8 / 28 |

The chip widths are 2-4 wider than drawn — the tracked-caps width discrepancy this file has
measured on every export from that tool, in the same direction — so the row is 8 wider and
its centre is still 540. `panelGap` went 1.348 -> **1.113**: the second drawing puts the
panel 51.2 below the title's last baseline where the first put it at 62.

**THE PANEL IS A LIGHT GLASS NOW — `ART.lightGlass`, white at .22, over a 50px blur.** The
snippet: a 757 x 172 rx 28 rect at `fill-opacity="0.22"` with an `feGaussianBlur
stdDeviation="50"`, which is what a CSS `blur(50px)` means too. It is the one light glass in
the file — the ranking, listed and review panels are `deepGlass` — and it lives in
`WK.panelBlur`, not `TA.panelBlur`, because it is a different material. **The hairlines are
the listed card's, kept from the request before this one:** 1px `hairEdge` outside and 1px
`hair` between the columns; the drawing's own .33 stroke and .5 dividers are the same values
the listed card's drawing carried and the user then asked to halve.

**50 IS THE FIRST RADIUS IN USE ABOVE THE CANVAS BLUR'S DOWNSAMPLE THRESHOLD.**
`q = max(1, round(amount / 24))` is **2** here, so the padded-tile path built for the
rejected 235 does live work for the first time. Proved rather than assumed: a black/white
comb painted under the panel and rendered at export scales 1 and 2 reads **sd 0.5 inside
the panel against sd 63.5 outside**, mean 146, alpha 255 at every sample, canvas 2160 x
2880 at 2x — the blur paints, blurs, and hands back no blank canvas.

**A LIGHT GLASS PUTS WHITE COPY ON WHATEVER THE PHOTOGRAPH IS, and that is the one thing to
know before shipping a real page on it.** Measured, white at .22 composited: over black the
value ink reads **11.7:1** and the `mute` label 7.6; over a mid grey **2.75 / 1.77**; over
white **1.00 / 1.55**. The material only reads over dark photography — the drawing's designer
set white text on it, so that is the design's assumption, not a defect introduced here — and
the top wash stops at the title, so nothing darkens the backdrop behind the panel. If a bright
listing photo makes the panel unreadable, the levers are the fill's alpha, the ink, or letting
the wash run under the panel again; none is applied.

**A SCOPE COLLISION TOOK THE ENGINE DOWN AT BOOT, and the console named it.** The chip block
declared `const colX` for the title column inside `wkSpecBox`, which already declares `colX`
for the panel's column edges further down — a `SyntaxError: Identifier 'colX' has already
been declared` that failed the whole logic-class eval, so the shell mounted with no engine
and the splash never rendered. This is the documented "audit every declaration in the target
scope" trap in its plainest form; the block's locals are `tcW` / `tcX` / `ccx` now, and the
function's declared names were listed and checked for repeats before reloading. **Read the
console first when the engine is missing** — the fiber walk finding `.p-shell` with no
`logic.eng` is exactly what a failed class eval looks like.

**`upd(fn)` REQUIRES `fn` TO RETURN THE STATE.** A probe wrote `E.upd(x => { x.screen =
'editor'; })` and nothing happened, silently — `setState(prev => fn(clone))` returned
`undefined`. Every call site in the file ends `return x;`. Worth knowing before concluding
a state write is broken.

The guided form's and the rail's USP hint reads *Separate points with | — e.g. Marina view |
Vacant | Open to offers. Each becomes a chip above the title*; `TPLDEMO.weekly.prop.usp` is
`Ready to move | Vacant | Sea view` so the template card depicts the row. Preview against
ops, one coordinate space: chips within 0.4 canvas px on every box, the panel 174 / 446 /
732 x 172 against 174.2 / 446.2 / 731.6 x 171.8, the title's baselines within 0.6, the
preview computing `blur(50px)` and `rgba(255,255,255,.22)`. Sheet integrity unchanged
(1 closing style tag, 293/293 comments, depth 0; `sc-for` +2 for the two chip loops, `sc-if`
unchanged). The `_PRE` copy was removed, the server stopped, the test origin's storage cleared.


# THE WEEKLY LISTING NUMBER HAS NO LENGTH RULE, AND TYPED CAPITALS SURVIVE TITLE CASE

Two small requests on the weekly listings template. Both are input-and-copy rules; **neither
moves a pixel of existing artwork** — op census over five templates x every slide x both
canvases, against the pre-change copy served alongside: **24 groups, 24 byte-identical.**

## The eleven-digit rule is gone from the weekly property page

`FIELDS.prop`'s listno went `'req len11 img'` -> **`'req digits img'`**, hint "Exactly 11
digits" -> "Numbers only". Everything follows from that one flag except the export gate,
which tested the length **directly** rather than through the flag and needed editing in both
of its copies (`exportBlockers` and the duplicate inside `renderVals`): it asks whether a
number is there now, and its message is `<slide> listing number` rather than
`… (11 digits)`.

**`digits` IS A NEW FLAG RATHER THAN A REUSE OF `num`, and that is not fussiness.** `num`
permits a decimal point (`/[^\d.]/`), which a listing number must not carry, and — the part
that would have been invisible — `wantHalf` reads `num` to make a field HALF width, so
reusing it would silently have paired the listing number with whatever row sat beside it.
`digits` filters to digits with **no `slice`**, which is the whole difference from `len11`.

**THE `listed` CARD STILL CARRIES `len11`, deliberately.** The request named the weekly
template, so the Just Sold card keeps "Exactly 11 digits" and its own gate. The two fields
look identical in the form and now behave differently; that is one flag and two gate lines
if it should match.

Verified by typing into the real field: `abc 321-852-963-411-234 xyz` stores
**`321852963411234`** (15 digits, letters and dashes stripped, nothing truncated), twenty
nines stores twenty, five digits raises no blocker and no red row, an empty field still
reports *This one is required.* and still blocks export, and the canvas prints the 15-digit
number under the QR.

## An ALL-CAPS word survives Title Case

The Community / building field is `toTitle`d, so a user who typed capitals got them
lower-cased. `StudioBase.toTitle` now returns an all-caps word verbatim — see *Title Case
follows the brand's own copy* for the test and why it is Unicode-safe.

**IT IS IN `StudioBase`, SO IT REACHES EVERY ORGANIC CALL SITE — and exactly zero Campaign
ones.** Measured rather than assumed: Campaign's document contains **0 occurrences of
`toTitle(`**, so the shared file changed and that studio cannot have moved; it was booted
afterwards regardless (286 render keys, 14 ops on the first template). The Organic call sites
it does reach are the listed card's status and `listedLine`, the property title, the review's
reviewer and agent name, the ranking card's name and the award's title — every one of them a
short field the user types, where keeping their capitals is the same right answer.

**AND IT MOVES NOTHING THAT EXISTS TODAY.** Proved by censusing the demo states twice in one
load, once with the old implementation monkey-patched back: **0 of 24 groups differ.** No
`TPLDEMO` value is all caps, so the new branch only ever fires on copy somebody types.

| typed | was | now |
|---|---|---|
| `PALM JUMEIRAH` | Palm Jumeirah | **PALM JUMEIRAH** |
| `Blakely Tower, JLT` | Blakely Tower, Jlt | **Blakely Tower, JLT** |
| `Tower A` | Tower a | **Tower A** |
| `MBR City` | Mbr City | **MBR City** |
| `3BR duplex` | 3br Duplex | **3BR Duplex** |
| `palm jumeirah` · `ready to move villa` · `1361` | unchanged | unchanged |

## A CACHED `studio-base.js` MADE THE EDIT LOOK INERT, and this is the third shape of that trap

The file on disk was correct from the first write, and the page reported the OLD behaviour —
"PALM JUMEIRAH" still coming back "Palm Jumeirah" — because `studio-base.js` is a
`<script src>` and the browser served it from cache across reloads. Same class as the
recorded "the guide `<link>`s its stylesheet, so the iframe serves a CACHED copy", and it
reads exactly like "the fix did not land".

**The check that settles it in one call:** compare `StudioBase.toTitle.toString()` against the
bytes on the server (`fetch('/studio-base.js', {cache:'reload'})`). That both diagnoses it and
refreshes the HTTP cache entry, so the next plain reload runs the new file. **Any pass that
edits `studio-base.js` has to do this** — the `.dc.html` documents are re-fetched because
their URL is what you navigate to; the shared script is not.

A probe artefact worth keeping too: a search for "the input whose ancestor mentions *Listing
number*" walked five parents up and matched the **first** input on the page, because by that
depth the ancestor holds the whole section's text. It silently drove the Marketing USP field
and reported the listing number as never changing. **Identify a field by its own row, not by
an ancestor's text.**


# ONE GLASS FOR EVERY TEMPLATE, A PANEL-COLOUR CONTROL, AND THE REVIEW'S PORTRAIT MOVES

Three requests, with a container SVG supplied for the material. All three are Organic-only;
`studio-base.js`, Campaign and the image tool are untouched.

## The glass is one material now, from the supplied SVG

`fill="#FFFFFF" fill-opacity="0.22"` inside a 1px `rgba(255,255,255,0.33)` stroke at r28 over
`feGaussianBlur stdDeviation="14"`. That is now what all five glass panels draw — the listed
card's footer, the weekly spec box, the ranking card's blurb panel, the ranking cover's bar
and the review card — where they previously ran **two fills and three blurs** (30 on four of
them, 50 on the weekly panel after the pass before this).

| | was | now |
|---|---|---|
| blur | `TA.panelBlur` 30 · `WK.panelBlur` 50 | **`TA.panelBlur` 14**, and `WK.panelBlur` is DELETED rather than left as a second number that can drift |
| edge | `hairEdge` .165 | **.33** |
| fill | `deepGlass` navy .65 (four panels) · `lightGlass` white .22 (weekly) | **the post's choice**, `glassOf(state)` |

**THE .33 EDGE REVERSES THE HALVING THIS FILE RECORDS**, and it is the supplied SVG that
overrules it: the earlier "halve the hairlines" request took the edge .33 -> .165 and the
divider .5 -> .25. Only the EDGE moved back; the divider is still .25, so half that
instruction stands. One token to restore.

## The fill is a project-level choice, and the two do NOT share an alpha

`state.glassFill` is `'white'` (the supplied value, and the default) or `'navy'`, offered as a
segmented pair in the Look section — so it reaches the guided run's Finish step and the
All-controls rail from one markup, as every ask does. **Ungated, and that was checked rather
than assumed:** all five templates draw a panel, so a predicate here would be one that is
always true, which is the noise the dead-feature audit's own rule warns against.

**NAVY KEEPS ITS OWN .65 AND THAT IS THE ONE DEPARTURE FROM THE SNIPPET.** Measured, white
copy on each fill:

| backdrop | white .22 | navy .65 | navy at the supplied .22 |
|---|---|---|---|
| black | 11.73 | 17.28 | 19.93 |
| mid grey | 2.75 | 9.35 | 5.19 |
| **white** | **1.00** | **4.73** | **1.55** |

Giving navy the white's alpha would put four existing templates below the floor this file
already derived for navy glass (about .515 for large text). One value in `ART` if the literal
.22 is wanted for both.

**AND THE WHITE GLASS IS A DARK-PHOTOGRAPH MATERIAL, which is worth stating plainly rather
than burying.** At 1.00:1 over a white backdrop its copy is invisible, and 2.75 over mid grey
is under AA. That is the supplied design's own assumption, not a defect introduced here — the
drawing sets white text on it — but a bright listing photo will break a white panel and the
navy option is the answer.

**THE DEFAULT REACHES EXISTING WORK.** A project saved before this carries no `glassFill` and
`glassOf` reads that as white, so every saved post moves to the new material rather than only
new ones — which is what "all templates" asked for. `strip()` does not delete it: it changes
the artwork, so it belongs in the undo stack, the render key and the saved file.

**`taVariant` AND `taCard` TAKE THE FILL AS AN ARGUMENT, never read `this.state`.** `buildOps`
works on the state it is handed, and a helper that reaches for the live one silently returns
the wrong answer for every render driven by another — a recents thumbnail, a template card, a
session being loaded. `taRank` already records that exact coupling as a bug; this is the same
shape, avoided rather than repeated.

### The review's template card would have vanished on paper

The review card's skeleton draws on the theme's ground, and in light that ground is paper.
White at .22 over white paper **is** white, and its .33 white stroke is invisible on it too —
the card would have disappeared outright and taken its own copy with it. So `tplGroundSwap`
swaps a white glass to the navy one when the ground is paper; in dark it draws the project's
own. Preview only, and the same shape as the paper-kinds ground swap beside it. Verified:
dark ground `#000` with the white glass, light ground `#FFFFFF` with the navy.

## The review's portrait can be dragged

`revAgentPlace(Bx, m, f, tk)` is `agentPlace` plus a stored offset — so the drop, the
face-framing and the window clip are all unchanged and only the drawn box moves inside the
window. ONE function, read by `buildOps` and by the preview, so the two cannot place her
differently. The offset is a fraction of the CANVAS, so one value serves the feed and the
story, and it is clamped at **±`REV.dragMax` (.5)** AT STORE TIME.

**THE CLAMP IS A HARD SYMMETRIC BOUND, NOT A COVERAGE TEST, and that is deliberate.**
`agentPlace` covers the window exactly on one axis, so a "keep it covering" clamp would pin
that axis dead and read as a broken drag. Clamping at store time is what stops an overshoot
creating a zone where dragging back moves nothing until it has been retraced — the trap
`clampCentre` records in the image tool and the listed card's pan repeats.

**THE HIT LAYER IS THE AGENT'S WINDOW, not the whole canvas**, so the rest of the card still
takes a click and still activates the slide — which is where it differs from the listed
card's full-canvas pan layer. `pointerEvents: 'auto'` is set EXPLICITLY because it sits inside
`frameStyle`, which is `pointer-events: none` and inherits: that is exactly why the ranking
cover's five figures once shipped un-draggable while their arithmetic checked out. z 11 clears
the card, the copy and the portrait, and this kind mounts no image-slot on the canvas, so
there is no z-index 10 host to beat.

**Reachability proved separately from the handler**, per this file's own rule:
`document.elementFromPoint` over a 9-point grid inside the layer returns the layer **9 of 9**.

## A PROBE TRAP THAT LOOKED EXACTLY LIKE AN UN-HITTABLE LAYER

Two real `left_click_drag` calls did nothing — no undo entry, no stored value — which is the
precise signature of the bug the rule above exists to catch, and I was one step from
recording it as one. It was the probe. Logging every pointer and mouse event at the document
during a drag showed the events arriving **trusted** and at the wrong place:

```
asked for (625, 400)   ->   pointerdown@800,512 T  -> target .p-stage
```

**The Browser pane's screenshot coordinate frame is not the page's CSS pixel space.** Here it
was a uniform **1.28x** (800/625, 512/400), so a coordinate read out of
`getBoundingClientRect()` has to be DIVIDED by that factor before it is passed to a click or a
drag. At (488, 325) the same drag landed on the layer and worked first time.

**Log the events before concluding a layer is unreachable.** `isTrusted` plus the reported
`clientX/clientY` plus the `target` tells you in one call whether the input arrived at all,
whether it arrived where you meant, and what it actually hit.

## Verification

- **Op census, five templates x every slide x both canvases: 24 groups, and the 18 that
  changed are exactly the 18 that carry a glass panel** — listed, weekly's property page, the
  agents cover and all five ranks, and the review, on both canvases. The 6 identical are
  weekly's cover and closing slide and the award, which have no panel.
- Every glass op in both fills: blur **14**, stroke `rgba(255,255,255,.33)` at 1px, r 28, fill
  following the control. The preview mirrors it — `blur(14px)`, `rgba(26,41,66,0.65)`,
  border `rgba(255,255,255,0.33)`.
- **The drag, with a REAL pointer**: `rax` 0.1364 and `ray` 0.075 against a predicted 0.1367 /
  0.0742 (the residual is the 1.28 coordinate conversion), **exactly one undo entry** for the
  gesture, and the preview's box at `584 / 108 / 720 x 1440` against the op's
  `583.8 / 108 / 720 x 1440` — 0.2 canvas px.
- Interpolation sweep against the backup: 144 refs before and after, 52 unresolved before and
  after, **none newly unresolved**. Sheet: one closing style tag, 293/293 comments, depth 0.
- The test origin's `localStorage` was cleared and the `_PRE` copy removed from the project
  folder.

## Left as a decision, not applied

- **The portrait moves but does not SCALE.** The request was "move/drag"; the listed card's
  photo and the ranking cover's figures both carry a corner-scale gesture as well, and this
  one is four corner grips and a `ras` multiplier away from matching them.
- **The `listed` card's own agent still cannot be moved.** She is framed by the same
  `agentPlace` and would take the same treatment; nothing asked for it.

# THE LANDING PAGE IS A STAGE, NOT A LIST — the studios' own renders reel through it

`index.html` at the repo root was redesigned to carry the same language the studios now
carry (the 55px bar, the 36px pill controls, the ring-not-shadow cards, the 16px radius,
150ms motion on the kit's curve) and to be interesting rather than a two-card menu. It is
still the **fourth consumer and the first that is not a mirror** — it `<link>`s
`ui-design-system/provident-ui.css`, so every colour, radius, motion value and type role on
it is a token and there is no local palette to keep in step.

## What a card is now

Each studio card is an `<article>` with, top to bottom: a **4:3 stage** on `--ps-stage`
holding the template render at contain-fit (never cover — a crop hides the layout, which is
the one thing the preview exists to show); a **filmstrip** of one thumb per template with
the current one ringed in `--ps-link` and a caption naming it; the title row with the
studio's own canvas-shape chip (the mark IS the ratio — 1 and .75 from one `--a` variable),
the name and an arrow pill; then the descriptor, body and the format facts as `.p-tag`s.

**THE STAGE REELS ON HOVER, on the splash's own three numbers.** LEAD .35s before the first
step, a .45s glide on `var(--ps-ease)`, DWELL 3s on each frame, and it **stops on the last
frame** exactly as the studios' recents and template cards do — a card you are about to
click should not keep moving. A thumb click jumps straight to its template and restarts the
hold. Nothing runs at rest, and `prefers-reduced-motion` stops the reel, the entrance and the
hover lift. Verified with a REAL pointer hover, not a synthetic event: frame 1 by 700ms,
frame 2 by 3.9s, parked there 3.6s after the pointer left.

**A STRETCHED LINK, NOT AN `<a>` AROUND THE CARD.** The filmstrip is a row of real
`<button>`s, and a button inside a link is invalid and would navigate on every click. The
title's own `<a>` carries an `::after` at `inset:0`, so the whole card is the link; the thumb
row sits at `z-index:1` above it. Everything else — including the tags — falls UNDER the
link, deliberately, so the card has exactly one region that does not navigate and it is the
one with its own job. Verified: `elementFromPoint` at the stage centre and on a tag returns
the link; on a thumb it returns the button; a real click on a thumb changed the caption and
`aria-current` and `location.href` did not move.

**THE FOCUS RING GOES ON THE CARD, through `:has()`.** `.lp-link{outline:none}` and
`.lp-c:has(.lp-link:focus-visible)` takes the 2px `--ps-ink` ring at a 2px offset — a ring
on a zero-size link whose pseudo does the work would be invisible. Verified with five real
Tab presses: the title link is focused, `:focus-visible` matches, the card computes
`solid 2px` ink.

## THE PREVIEWS WERE RECAPTURED AT 2x, AND THE ROUTE IS THE DOCUMENTED ONE

The big stage draws the render at ~302px tall, which is a **1.27x upscale of the 237px
snapshots** the strip used to carry — visibly soft on a hero surface. All nine were
recaptured at `.44` (2x each studio's `TPL_SCALE`) through the fiber walk: `.p-shell` ->
`__reactFiber$…` -> walk `.return` to `stateNode.logic.eng`, wait for `_tplKey`, then
`E.constructor.qrDemoReady()`, `E.buildOps(state, 0, 'ft'|'sq', assets)`,
`E.constructor.tplGroundSwap(built, kind, false)` (Organic, light — the branch recorded as
byte-identical to the export), `E.renderOpsToCanvas(built, .44).toDataURL('image/webp', .86)`,
POSTed to a 20-line local server that writes `preview/<studio>-<id>.webp`. **Reach the
class through `E.constructor`, never by name** — `OrganicStudio` is declared inside the
`text/x-dc` block and is not a global, which cost one round here. Nine files, 475x475 and
475x633, **97.6KB** total (was 52KB). The `<img>` width/height attributes carry the new
dimensions so the box keeps taking the file's own intrinsic ratio.

**Bust the cache before believing a recapture.** The page's `<img>`s served the old 237px
files from the browser cache after the write; `fetch(url, {cache:'reload'})` per file, then
reload, is what made `naturalWidth` report 475.

## Two things that were wrong in the first cut, both caught by the checks

- **`animation-fill-mode: both` on the card's entrance would have killed the hover lift.**
  A forward fill keeps the `to` keyframe's `transform:none` applied after the animation
  ends, and an animation beats every normal declaration, so `.lp-c:hover{transform}` could
  never win. It is `backwards` — the `from` state during the stagger delay, nothing after.
- **The tags sat above the stretched link** at `z-index:1`, so clicking a format fact did
  nothing while clicking the air beside it navigated. Removed; only the filmstrip opts out.

## Verification

Reloaded into each theme, every animation and transition finished first (this pane's
document timeline is frozen — the card read `translateY(3px)` at `opacity` 1 with
`document.timeline.currentTime` at 0 until they were), ancestor opacity composited:

| | light | dark |
|---|---|---|
| text elements checked / contrast fails | 21 / **0** | 21 / **0** |
| elevation shadows (offset or blur > 0) | **0** | **0** |
| horizontal overflow at 1400 / 375 | none / none | — |

At 1400: cards 527 wide, stage 497x340, renders 302 tall, thumbs 34x34 and 26x34,
`h1` 52px. At 375: `h1` 32px, stage 309x232, thumbs and caption on one 305px row with no
strip overflow, tags on two rows, the top bar 55 tall and not scrolling. The image `ring`
(`0 0 0 1px var(--ps-hair)`) is a 0-offset 0-blur state edge, not elevation. The test
origin's `localStorage` was cleared afterwards and both local servers stopped.

**Not changed:** the studios, `studio-base.js` and `ui-design-system/` — this page consumes
the kit and touched nothing upstream. The reel's `LEAD` / `DWELL` are restated in this
page's own script rather than read from `StudioBase.REEL_*`, because the page deliberately
loads no studio code; if those constants move, this file has two numbers to follow them.

# THE LISTED CARD TAKES THE WEEKLY PAGE'S CHIPS, A SALE/RENT LINE AND A BLACK SCRIM

Three requests on `Provident Organic Studio.dc.html`'s Just listed / Just sold card, with a
mock attached: the Marketing USP typed as `Fully Fitted | Full-Floor | Canal Views` and
shown as chips at the top of the panel; the line under them reading
`{type} for {Sale|Rent} in {location}` with the price keeping its formatting and taking
`/year` or `/month` on a rental; and a black scrim between the photograph and the glass
panel with a control for its strength. **This pass changes artwork, by request, and it is
scoped to one slide kind**: op census over five templates x every slide x both canvases
against the pre-change copy served alongside — **24 groups, 22 byte-identical, and the only
two that differ are `listed` on the feed and the story** (15 -> 21 ops).

**THE DEAL IS ASKED ONLY WHILE THE STATUS SAYS JUST LISTED.** "If it's selected, these new
fields should appear" is read as the Status control: a sold property is neither for sale nor
for rent, so `fieldShown` drops `deal` on a sold card and `per` unless the deal is Rent. The
canvas reads the same derivation — `OrganicStudio.listedDeal(f)` returns `{listed, deal,
per}` with the defaults the card already used for its status (`Just listed`, so `Sale`, and
`Year`) — and `listedLine` / `listedPrice` / `fieldShown` all call it, so the form and the
canvas cannot disagree. Measured on the demo copy:

| status / deal / period | title | price | fields asked |
|---|---|---|---|
| listed · Sale | Villa for Sale in Palm Jumeirah | AED 12 Million | + deal |
| listed · Rent · Year | Villa for Rent in Palm Jumeirah | AED 12 Million/year | + deal, per |
| listed · Rent · Month | Villa for Rent in Palm Jumeirah | AED 12 Million/month | + deal, per |
| sold | Villa in Palm Jumeirah | AED 12 Million | neither |

The USP is out of the title sentence and into the chips — the exact move the weekly property
page made one pass earlier, so the two templates now read the field the same way. The
`building` field is labelled **Location** now (the mock's "Building 12, Bay Square"); its key
is unchanged, so saved projects keep their value.

**THE CHIPS ARE THE WEEKLY PAGE'S, FLUSH LEFT IN THE PANEL'S COLUMN.** Same 48 x r12 box, 14
of side padding, 20 between chips and rows, `ART.ink` stroke, 16/500 caps at .1em in
`ART.warm` — the label `pk`-scaled like every run in this panel (15.3 on the story), the box
not, like every baseline step. They wrap at the agent's own column (`colW`), which on the demo
copy puts three points on two rows, and they hang ABOVE the title: `chipTop` 50 from the
panel's top to the first row and `chipToTitle` 56 from the last row's bottom to the title's
first baseline, both read off the mock (its panel-to-chip is ~48, chip-bottom-to-title-baseline
~56, title-to-price 65 against the existing 68.6). The panel grows upward to hold them — with
no USP the row collapses and the title takes its old `padTop`, measured: panel 524 tall with
two chip rows, 378 with none.

**THE SCRIM IS A FLAT BLACK RECT OVER THE WHOLE CANVAS, drawn AFTER the photo and its parallax
cut-out and BEFORE the panel's blur.** Above the cut-out on purpose: the cut-out is the
picture's own foreground, and a foreground left bright over a darkened picture reads as a
second exposure. `state.shade` is 0-100, **35 when a project carries no value** (`shadeAlpha`,
the `glassOf` call: the request was to add it, so it reaches saved cards), and it is a **Look**
ask gated on `shadeUsed` — the one kind that draws it — so it appears on the listed template's
Finish step and its All-controls rail and on no other template (verified: weekly's Look is
`scrim, imgo, glass, story`; listed's is `scrim, shade, imgo, glass, story`). It is not
`scrimH`: that drives the fading top band behind the wordmark and the status, which stays.
Both paint paths read the local black helper `N(a)`, so no colour literal entered the artwork.

**THE PREVIEW'S LAYER ORDER MOVED, and the status is above the cut-out now as the op has it.**
Document order is the paint order for z-auto siblings, so the shade got its own div — declared
`display:none` for every kind, set in the listed branch — placed after the parallax layer and
before the status and the frame. The status div had sat BEFORE the parallax layer, i.e. under
the cut-out in the editor while the op draws it after the panel; it sits after the shade now,
which is the op's order. Verified off the DOM's own child list: band 3, shade 4, status 5,
frame 6, the shade computing `rgba(0,0,0,.35)`.

**Preview against ops, one coordinate space:** card `80 / 826 / 920 x 524` against
`80 / 826.4 / 920 x 523.6`; all three chips within **0.4 canvas px** on x/y/w and exact on h;
four row baselines within 0.4; the chip border `#fff`, radius 12, label 16px `#FAF8F4`.

`TPLDEMO.listed` shows the design now (`Just listed`, Sale, `Marina view | Vacant | Open to
offers`), so the template card and the landing page's `organic-listed.webp` were recaptured
(475 x 633, the documented 2x route). Interpolation sweep against the pre-change copy: 144 refs
and 52 unresolved before and after, none new. Sheet integrity unchanged — one closing style tag,
297/297 comments; raw `sc-if` +1/+1 and `sc-for` +2/+2, the new slider block and the two chip
loops. The `_PRE` copy was removed, the servers stopped, the test origin's storage cleared.
`studio-base.js`, Campaign, the image tool and `ui-design-system/` are untouched.

**Left as it is, deliberately:** a segmented control with no answer yet lights neither half
while the canvas draws its default — the deal reads "Sale" and the status "Just listed" before
either is touched. That is how the status has always behaved; making a default read as selected
is one change in the form's row builder and would apply to every `seg` field at once.

# SIX FIXES ON THE LISTED CARD, AND THE GUIDED CANVAS FOLLOWS A REPLACED PHOTO

Six requests on `Provident Organic Studio.dc.html`, with two screenshots attached. Four are
on the Just listed / Just sold card, one is app-wide, one is the guided run's refresh. Op
census over five templates x every slide x both canvases against the pre-change copy served
alongside: **24 groups, 22 byte-identical, and the only two that differ are `listed` on the
feed and the story** (21 -> 22 ops — the flat scrim became two gradient bands).

**THE SECOND AGENT IS GONE.** The "How many agents are on this card?" ask, the One agent /
Two agents pair, the second name, role and portrait asks, the two-column `agentColsGeom`
layout in the ops and its preview row are all deleted; the rail's toggle had already gone
with the aside. `agent2` / `agent2On` stay in state (and `normState` still fills them) so a
saved project loads, and the `smp-agent-2` asset plumbing stays because a slot that is never
filled costs nothing. Nothing reads any of it. The agent section of the listed page is name,
role, portrait.

**NO ELEVEN-DIGIT RULE ANYWHERE.** `FIELDS.listed`'s listing number is `req digits img` with
the hint "Numbers only", the same flag the weekly page took one pass earlier, and the export
gate — in both of its copies — asks `!trim()` rather than `length !== 11`. Verified live:
`12345` raises no blocker, an empty field still blocks with "Listing number". The `len11`
parser and its readers survive with no field carrying the flag.

**THE AGENT SHRINKS PROPORTIONALLY UNTIL THE CHIPS FIT ON ONE LINE.** `listedBox` measures the
chip row's one-line width FIRST and, when it does not fit beside the drawn box, scales the box
— width AND height by one factor `ak` — until it does, no further than `LISTED.agentMin`
(.6). On the demo copy (three chips, 472 wide) that is **ak .7633: the box goes 454 x 694 ->
347 x 530** on the feed and the row sits on one line; a short USP leaves ak at 1; a four-chip
USP meets the floor and wraps to two rows, which is the honest answer when the two cannot
both have the width. The chips' own widths are clamped to the widest column the floor allows,
so a single chip can never exceed the column. **Solved with half a pixel of slack**: `ak`
makes the column exactly the row's width, and an exact tie wrapped the last chip on a
floating-point hair (the feed wrapped where the story, rounding the other way, did not).
`agentPlace` reads the box from `listedBox`, so both surfaces frame her identically — the
crown lands on the mark to 0.00 on a synthetic cut-out.

**THE BLACK SCRIM IS TWO BANDS, TOP AND BOTTOM.** `shadeBands(B, H)` returns `[0, top]` and
`[cardY, H]` — the top band ending where the listed card's wash does (the status's descent
plus 20), the bottom starting at the panel's top — and both go through `bandStops`, so each
carries the same 240px eased fade every wash in this file has. The ops emit two `grad` ops
where there was one `rect`; the preview's shade div carries two `linear-gradient`s at the
op's own stops (verified: solid to 24.8%, out by 41.5%; in from 45.4%, solid from 62.1%).
A card with no panel yet has the top band alone; a panel reaching the status collapses the
two into one. The middle of the photograph is clear now, which is the whole request.

**Flagged, not changed: the wash and the shade both darken the TOP.** `scrimBands`' listed
band and the shade's top band have the same extent, so two sliders — Wash strength and Photo
darkening — now reach one region. That overlap existed before this pass (the flat shade
covered the top too); the bands only make it legible. If one control should own the top, the
listed entry in `scrimBands` is the one to drop (which also retires the Wash ask on this
template through `scrimUsed`).

**THE CORNER GRIPS ARE GONE** — the blue-and-white squares at the canvas corners in the second
screenshot. The `lPhGrips` markup in both canvases, the grip builder and the corner branch of
the pointer gesture are deleted; `phStart` is the move alone. `phs` is still applied by
`photoPlace` and still cleared by Reset, so a saved scale survives, and zooming is the reframe
overlay's (double-click the photo). The photo hint says so instead of naming a grip.
`LISTED.handle` / `handleIn` went with their only reader. The ranking cover's figure handles
(`gh`, also `data-gdir`) are a different feature and are untouched.

**THE GUIDED CANVAS FOLLOWS A REPLACED PHOTO AT ONCE.** Two causes, two fixes:

- **`_filledStamp` moved only when a slot flipped between empty and filled.** A REPLACED
  picture is filled before and after, so `gdKeyOf` / `gdSlideKey` never changed and the card
  kept the old photo until an unrelated field edit re-keyed it — the reported bug. The same
  held for a reframed crop. `_refreshAV` now fingerprints the sidecar it reads (per slot: the
  data URL's length plus a 48-char tail, never the whole string, and its `s/x/y/f`) and bumps
  the stamp when the signature moves — taken on the very read `gdRenderAll` repeats.
- **The picker path fired no trigger at all.** `_refreshAV` ran off `drop`,
  `image-slot:reframe` and the fill-flip scan; a Replace through the picker on a filled slot
  is none of those. The 500ms fill scan now fingerprints each slot's own shadow `<img>` src
  (the QR scan already reads that element) and schedules `_refreshAV` when it moves; the first
  sighting only records it, so boot does not trigger a refresh storm.

Verified through the slot's own `_ingest` on the test origin (`providentRuntime.mode ===
'indexeddb'`, the probe refusing outright on `omelette`): first fill reached the card in
600ms; **the REPLACE — the failing case — reached it in 200ms**, the stamp moved both times,
the state was untouched, and the card's centre pixel read the second image's colour.

**Preview against ops, one coordinate space:** panel `80 / 894 / 920 x 456` against
`80 / 894.4 / 920 x 455.6`; three chips within 0.6 canvas px on every term; 0 `[data-gdir]`
in the canvas. `TPLDEMO.listed` renders a one-line chip row now, so
`preview/organic-listed.webp` was recaptured (475 x 633, the documented 2x route). Sheet
integrity: one closing style tag, 297/297 comments, depth 0; raw `sc-if` -5/-5 and `sc-for`
-3/-3 against the backup — exactly the blocks removed. The test origin's slots were cleared,
its IndexedDB deleted and its `localStorage` cleared; the `_PRE` copy removed; both servers
stopped.

# THE AGENT'S ROLE WRAPS, AND A WIDOW RULE PICKS THE BREAK

By request, on the listed card: *"CONSULTANT - PRIMARY SALES / CONSULTANT - SECONDARY SALES /
CONSULTANT - PRIMARY & SECONDARY SALES — these are the common text that user will input. If
the text is too long, example is the 3rd one, have it so it breaks into a new line and
autolayouts upwards."* This reverses *A single identity line fits; it does not wrap*.

**THE THIRD STRING IS 605 WIDE AGAINST A COLUMN OF 365 TO 547**, so the old fit-to-one-line
treatment rendered it at its `roleMin` floor of 19.7px and STILL overflowed — by 131px at the
narrow column, which runs past the 50px gap and 81px into the agent. That is what the
screenshot shows.

## THE ORDER OF THE TWO TREATMENTS IS THE WHOLE FIX

A fit left in front of a wrap renders a long role **both shrunken and broken**, which is worse
than either. So the fit runs first, is **conditional on achieving one line**, and the wrap
happens at FULL size:

```js
while (!fits(rpx) && rpx > fl) rpx = Math.max(fl, rpx - .25);
if (fits(rpx)) rolePx = rpx;                                   // a near-miss shrinks
else roleLines = this.roleWrap(role, rolePx, colW, L.roleMax);  // a long one wraps at 24
```

**`roleMin` WENT .82 -> .94, and that is a consequence rather than a preference.** Its old job
was to hold a long role on one line at any cost; the role wraps now, so all it has left to do
is absorb a near-miss — 6% is what that needs. The knock-on is real and intended: a role that
used to shrink to 19.7px and sit on one line now wraps at 24px.

## THE WIDOW RULE, and it is what makes three roles in one format read as one treatment

A greedy wrap fills line one, and at two of the three column widths that widows the last word:
`CONSULTANT - PRIMARY / SALES` at 365 and `CONSULTANT - PRIMARY & SECONDARY / SALES` at 547.
That orphan is exactly the objection the superseded section raises, and it is right.

These roles are written `<title> - <department>`, so **when the greedy wrap leaves ONE word on
the last line and the string carries a spaced dash whose two halves both fit, break at the
dash instead.** A greedy wrap that already ends on two or more words is balanced and is left
alone — `CONSULTANT - PRIMARY & / SECONDARY SALES` is that case, and the dash break would be
worse there. Measured across every column width:

| | 365 (no USP) | 473 (the real case) | 547 (4+ chips) |
|---|---|---|---|
| `CONSULTANT - PRIMARY SALES` | `CONSULTANT -` / `PRIMARY SALES` | **one line** | one line |
| `CONSULTANT - SECONDARY SALES` | `CONSULTANT -` / `SECONDARY SALES` | **one line** | one line |
| `CONSULTANT - PRIMARY & SECONDARY SALES` | greedy, 2 words | **greedy, 2 words** | `CONSULTANT -` / `PRIMARY & …` |
| `SENIOR CONSULTANT - PALM JUMEIRAH` | dash | dash | one line |

**THE MIDDLE COLUMN IS THE ONE THAT MATTERS, and it is the requested behaviour exactly**: the
first two on one line at full 24px, the third broken. 473 is the real column because the
Marketing USP is `req` — every real listed card has chips, and the chips are what shrink the
agent and widen the column (`ak`). 365 is the empty state while the form is still being
filled. And the last row is the `SENIOR CONSULTANT · PALM JUMEIRAH` the old section complains
about: it is a clean two-line block now instead of an orphan.

## THE PANEL GROWS UPWARD — the USP's own pattern, not a new one

`base -= (roleLines.length - 1) * rolePx * L.roleLead` **before** the row is placed, so the
LAST line stays on its fixed step off the floor and `base` becomes the FIRST line's baseline.
The name then sits `stepRole` above the TOP of the role rather than above a line buried in the
middle of it, and every row above follows. Verified: **every last baseline lands 57.0 off the
floor** in all 24 role x column x canvas combinations, and the panel is exactly one lead (31)
taller whenever the role takes a second line — 456 -> 487, 378 -> 409, 524 -> 555. The agent's
box grows with it, because her height is `cardH x agentH x ak`.

**Capped at `roleMax` (2) lines**, ellipsised past it — a three-line role is a sentence pasted
into the wrong field. A 70-character role sets on two lines and ends in an ellipsis.

## Verification

- **Op census, five templates x every slide x both canvases PLUS the listed card driven with
  each of the three real roles: 30 groups, 28 byte-identical.** The only two that changed are
  the long role's own, at **22 -> 23 ops** — one extra text op, which is the second line. The
  two short roles are byte-identical, so nothing that renders on one line today moves, and
  `preview/organic-listed.webp` needed no recapture (the demo role does not wrap).
- **No overflow anywhere**: the widest line of every case measures inside its own column.
- **Preview against ops, one coordinate space**: both lines at `dX 0.00`, `dY 0.20 / 0.00`,
  `23.976px / 500 / 2.376px letter-spacing / rgb(255,255,255)`; the panel `80 / 863 / 920 x
  487` against the op's `80 / 863.2 / 920 x 486.8`.
- Sheet and markup integrity **identical to the backup** — one closing style tag, 297/297
  comments, depth 0, `sc-if` 116/114 and `sc-for` 55/54 (this pass authored no CSS and no
  markup).

**A TRAP THAT COST A ROUND AND IS ALREADY IN THIS FILE FOR `studio-base.js`: THE `.dc.html`
ITSELF CAN BE SERVED FROM CACHE.** Navigating to the same URL after an edit re-ran the OLD
document — every measurement came back at the old `roleMin` of .82 and the fix read as inert.
`fetch(location.pathname, {cache:'reload'})` and then navigate. The tell was
`C.LISTED.roleMin` reading .82 while the bytes on disk and the bytes `curl` fetched both read
.94: **when the file and the server agree and the page does not, it is the cache.**

**`pickTpl` RELOADS THE DOCUMENT**, so a probe that calls it loses everything after that line.
Set `state.tpl` and `screen` through `upd()` instead when the point is to measure, not to
start a project.

## Left as it is

- **The hint now reads "e.g. Consultant - Primary Sales — a long one breaks onto a second
  line"**, with a hyphen rather than the middot it carried, because the dash is what the widow
  rule keys on and what the three supplied strings use.
- **The review card's own agent role is untouched** — it has its own fit in `revBox`, and the
  request named the listed card.

# AGENT PHOTOS ARE CUT OUT ON UPLOAD, BY A LOCAL rembg SERVICE

Every agent photo in Organic is drawn as a **cut-out** — the ranking card stands the
portrait above its own white ground, the ground texture and the giant numeral, so a
rectangular photo covers all three, and the listed and review agents are clipped to a
window and framed on the face. The studio asked for a transparent PNG and had no way to
make one. [danielgatis/rembg](https://github.com/danielgatis/rembg) now makes it, from
`tools/rembg/`.

**Proved inert at the op level the free way: the whole-file diff against the pre-change
copy is 39 changed lines and ZERO of them are artwork lines** — no `ops.push`, no
renderer, no `buildOps(`, no `ART`, no geometry source. This pass is the runtime, the
slot, markup and render keys, so no op can have moved and no op census was needed.

## THE SERVICE IS A CAPABILITY, NEVER A REQUIREMENT, and that is the load-bearing rule

The studio is one `.dc.html` that opens straight off the disk with no build step — the
reason its fonts and template art are base64'd into it. A 1.1GB model plus an ONNX
runtime cannot go in there, and there is no JS toolchain on this machine to bundle a
WASM build with even if it could.

So the model runs as a loopback service and **the studio must keep working with nothing
installed**. Measured, with the service stopped: an upload to a cut-out slot still lands
in **5ms**, the original is stored unchanged, no error is shown (the service being off
is not a failure), and the drop zone's own line says how to turn it on. Do not let a
later pass make this a hard dependency; it would cost the single-file property.

## WHICH SLOTS IS THE DOCUMENT'S DECISION, NOT THE RUNTIME'S

`runtime.js` provides `window.providentCutout` and knows nothing about templates; the
document marks the slots with **`data-cutout`** and `image-slot.js` reads it. That is
what keeps Campaign — which mounts no such slot — untouched by construction, verified:
**0 `data-cutout` in Campaign**, and it boots at 286 render keys and 977 CSS rules.

| slot | where |
|---|---|
| `smp-agent` | the listed card's agent, project level |
| `smp-agent-r<id>` | the review card's agent, per slide |
| `smp-bg-<id>` where `sl.kind === 'tagent'` | a ranking portrait — the form row AND the canvas slot |

`bgCut` and `photoCut` are `'1'`/`undefined` per the standing flag rule. **The ranking
COVER correctly gets none** — it composites the five rank portraits and has no photo of
its own — verified in the DOM: the cover's canvas slot reads `null` while all five
`tagent` slots read `'1'`.

**`runtime.js` HAS TWO EARLY RETURNS AND THE BLOCK HAD TO GO ABOVE THEM.** Section 5
returns early for `omelette` (Design Cursor, the environment the user actually works in)
and again for a browser with no IndexedDB. A capability declared after those exists in a
test browser and nowhere else — which is the worst possible place for the bug to hide.
Anything new in `runtime.js` that is not storage goes **before** the Storage stand-in.

## THE EDGE IS THE WHOLE REQUEST, AND THE MODES WERE MEASURED

"Fuzzy edges" is not vagueness — it is a specific defect: a semi-transparent edge pixel
keeps the **backdrop's colour** mixed into it, so the subject carries a halo of whatever
it was shot against. Measured on Provident's own studio portraits (dark suit on a dark
wall; a ponytail against it) — the drift of an edge pixel's colour from the opaque
subject beside it, and the share of edge pixels notably darker than that subject:

| mode | soft edge px | colour drift | dark halo |
|---|---|---|---|
| `naive` | 7 815 | 16.16 | **16.3%** |
| `decontaminate` | 7 815 | 7.90 | 0.7% |
| `alpha_matting` | 13 274 | 7.60 | 1.3% |
| **`vitmatte` — SHIPPED** | 12 977 | 10.72 | **1.7%** |

`naive` is the halo: one edge pixel in six.

**`alpha_matting` MEASURES WELL AND LOOKS WORST, which is why the table is not the
decision.** It widens the soft band by 70% and the extra is invented — a visible grey
frizz around shoulders and hair in the side-by-side renders, i.e. exactly the thing the
request was about. `vitmatte` widens the band too, but there the extra pixels are real
hair. **Render the comparison and look at it; a fringe metric cannot see a wide soft
halo.**

## THE 977MB MODEL IS THE DECISION, AND IT IS ABOUT *WHO*, NOT ABOUT EDGES

ViTMatte does the edge work whatever produced the coarse mask, so on a single figure all
three segmenters look alike and the cheap one looks like a free win. They part company on
**who to keep**. On a portrait cropped out of a group shot:

| model | size | per photo | result |
|---|---|---|---|
| **`bria-rmbg` — SHIPPED** | 977MB | 12-19s | the subject alone |
| `isnet-general-use` | 170MB | 2.6-3.4s | **kept a whole second person from the background**, semi-transparent |
| `u2net_human_seg` | 168MB | 2.0s | the same failure |

Agent photos are routinely shot in an office or at an event with colleagues behind them,
so that is the common case rather than an edge case. The default is correct rather than
fast; `--model isnet-general-use` is a documented flag for a clean backdrop.

**CoreML was measured and REJECTED**: `--provider coreml` stalls indefinitely compiling
a 977MB BiRefNet — 0% CPU, 1.6GB resident, no progress after ten minutes. The flag is
kept only so the next reader does not re-derive why a Mac tool is not using the Neural
Engine. It was not tried with a smaller model.

## TWO GUARDS THAT MATTER MORE THAN THE MODEL

- **An upload that is ALREADY a cut-out passes straight through, byte for byte.**
  Verified: 425 896 bytes in, 425 896 out, in 11ms. Users have been supplying hand-made
  transparent PNGs for months, and re-running a matting model on one could only damage
  it. The test is >2% fully-transparent pixels.
- **A failure never costs the upload.** `_cutout` returns the ORIGINAL on every path that
  is not a clean success; the service being off is silent, anything else sets the slot's
  error line. The photo is what the user has; the cut-out is a convenience on top of it.

**The empty-result guard catches TOTAL erasure and nothing subtler, deliberately.** A
salient-object model hands back an arbitrary blob for an image with no subject —
measured at **44.6% opaque on a flat grey field** — and a real portrait is often 20-60%
opaque too, so no coverage threshold can separate them. Detecting "that isn't a person"
is not that guard's job.

## THE SLOT NEEDED A SPINNER ON AN *EMPTY* SLOT, which it deliberately never had

`data-swapping` is set only when the slot is already filled, because a first fill is
supposed to keep its placeholder rather than flash a spinner. A 12-second wait makes that
wrong. `data-working` shows the ring and a message whatever the fill state, and dims the
placeholder behind it. Verified end to end: `data-working` set with "Removing the
background…", cleared on completion, **10.4s**, stored as `data:image/png` at 378KB —
the encoder picks PNG on its own because `file.type` is `image/png`, so alpha survives
with no change to `providentEncodeFile`.

`column-reverse` on `.loading` is what puts the ring above the message: a pseudo-element
is always the last child in layout, so the ring would otherwise sit under the text.

## A HINT MUST NOT CONTRADICT THE CONTROL BESIDE IT

`bgStatusFor` opened with "drop this agent's studio portrait as a CUT-OUT PNG on a
transparent background", and the new line under it says the background is removed for
you. Two sentences, one screen, opposite instructions. The hint states the REQUIREMENT
("it is drawn as a cut-out") and `cutoutNote()` states how it is met — one fact in one
place, read by the picture row and the portrait row alike so they cannot drift.

`cutoutNote` returns **empty while the first probe is still out**. Saying nothing beats
claiming the feature is missing before anyone has looked.

## THE PROBE IS TTL'D AND POLLED FROM THE TICK, so starting the service needs no reload

15s cache, polled from Organic's existing rAF tick (a `Date.now()` compare per frame) and
re-rendered off a `provident-cutout` event that fires only on a CHANGE. Verified: stop the
service and the drop zone's line flips to "start tools/rembg/serve.sh"; start it and the
line flips back with **no reload**.

## Verification

- **0 artwork lines** in the whole-file diff; sheet 1 closing style tag, comments 297/297,
  `sc-if` 116/114 -> **118/116** (exactly the two gated note lines, on the documented
  2-off baseline), `sc-for` unchanged, 1080 CSS rules parse, 213 render keys, no duplicate.
- Interpolation sweep against the pre-change copy: 140 refs both sides, **none added,
  none removed**.
- Scope, measured: a weekly property photo on a non-cut-out slot made **0 service calls**,
  took 14ms and stored as JPEG. All three agent templates opted in and read coherently.
- The card renders as a true cut-out: the textured ground reads **(231,231,231)** beside
  the figure where the office wall would have been. SVG export clean — 3 images, PNG data
  URI present, nothing unescaped.
- The test ran against `providentRuntime.mode === 'indexeddb'`; `.image-slots.state.json`
  is untouched (mtime unchanged), and the test origin's localStorage and IndexedDB were
  cleared afterwards.

## Left as decisions, not applied

- **The parallax cut-out (`smp-fg-<id>`) is not opted in.** It is a cut-out of the
  *picture's own foreground* rather than an agent, and the request named agent photos. One
  attribute if it is wanted.
- **12-19s per photo, on CPU.** The levers are `--model isnet-general-use` (5x, at the
  cost above) and `--refine decontaminate` (worth only ~2s — the segmenter is the cost,
  not the refiner).
- **The original is not kept.** A bad cut-out is fixed by re-dropping the photo. Keeping
  both would double the sidecar for every agent.

# THE AGENT'S NAME IS LIGHT AND THE DESIGNATION IS BRASS, on all three cards

By request: the agent's **name** drops to **Light 300** (size and colour unchanged), and the
**designation** keeps its weight and size and takes **`#B0905C`** — which is `ART.brass`, a
token that already existed, so no colour was spelled out at a call site.

**Applied to all three cards that print an agent**, because an identity block is a type
treatment and two of them were already identical by design:

| card | name | role |
|---|---|---|
| `listed` | 35 / **300** / `ink` | 24 / 500 / .1em / **`brass`** (was `ink`) |
| `review` | 35 / **300** / `ink` | 24 / 500 / .1em / **`brass`** (was `ink`) |
| `tagent` | 35 / **300** / `ink` | 24 / 500 / .1em / **`brass`** (was `warm`) |

**The listed card needed ONE edit per run and the preview followed for free**, because
`K.lRows` reads `r.w` and `r.fill` straight off the row objects `listedBox` builds — the
single-geometry-source design paying out. The review and ranking cards carry separate
preview styles and needed both halves, per the parity contract.

**THE PLACE BADGE'S LABEL STAYS `A.warm`, and that is the trap in this edit.** The ranking
card's role op and its badge-label op are both `weight: 500, fill: A.warm` and sit twelve
lines apart; swapping both would have put brass on the brass badge. Verified after: the
role is `#B0905C` and `1ST PLACE` is still `#FAF8F4`.

## A FIT MEASURED AT THE OLD WEIGHT IS THE "MATCH THE CONSUMER" TRAP

`revBox` fits the agent's name to the column with `fit(..., R.namePx, 400, 0, idW)` — and
the op now draws it at 300. Light is narrower than Regular, so the stale predicate shrinks a
name that would have fitted. It measures at 300 now. The listed card needed no such change:
its name is a single unfitted line, and its ROLE fit is still weight 500, which is unchanged.

## THE CONTRAST TRADE IS REAL, AND IT GOES BOTH WAYS

Brass is not uniformly better or worse than the white it replaced — it swaps one failure mode
for another. Measured, the role composited over each glass fill and both photo extremes:

| panel | photo | brass now | white before |
|---|---|---|---|
| white glass .22 (**the default**) | bright | **3.00** | **1.00** |
| white glass .22 | dark | 3.06 | 9.19 |
| navy glass .65 | bright | **1.57** | 4.73 |
| navy glass .65 | dark | 5.34 | 16.04 |

The run is 24px tracked caps, so the bar is WCAG **large text at 3:1**.

- **On the default white glass this is an IMPROVEMENT.** White ink on a white panel over a
  bright listing photo measured **1.00:1** — literally invisible — and brass is a steady 3.0
  whatever is behind it. That defect was live and nobody had measured it.
- **On navy glass over a bright photo brass measures 1.57:1 and fails.** A sunny exterior or
  a white interior behind the panel will lose the designation. That is the one case to watch;
  the levers are the panel's own fill (Panel colour → navy is where it bites) or darkening the
  wash behind it.

**This is the THIRD exemption to "no gold in canvas output at all"**, after the ranking card's
place badge and the award line. All three were explicit requests. Reverting is one token per
card.

**Verification:** 28 changed lines, and the only two that do not name a `name`/`role`
identifier are comments. Preview against ops on the listed card: name **300 / rgb(255,255,255)
/ 34.992px**, role **500 / rgb(176,144,92) / 23.976px** — both surfaces identical. Sheet
unchanged against the pre-change copy (1 closing style tag, comments 297/297, `sc-if` and
`sc-for` identical), 1080 CSS rules, 213 render keys. No geometry moved: only weight and fill
changed, and neither is a term in any panel height.

# CAMPAIGN HAS A CAROUSEL MODE, AND ITS PAGES ARE DISCONNECTED FROM EACH OTHER

By request: a choice between the single ad Campaign has always been and a **carousel of up
to 10 pages**, with export names carrying `_page1`, `_page2`, … and, on a carousel, the option
to drop the 9:16. Then, one pass later, the rule that decides its shape: **"carousels don't
need to be connected to the first page — elements placed on certain pages are disconnected
from each other; treat them as separate from the single-page logic of Master to variant."**

**Proved inert for today's ad at the op level: 8 groups (4 templates × 1:1 and 9:16), 112
ops, 0 differing** against the pre-change build served alongside — twice, once for each pass.
In `single` mode nothing about the render moved.

## THE ARCHITECTURE: A PAGE IS A VARIANT THAT OWNS ITS OWN COMPONENT LIST

Campaign's variants were built as A/B alternatives of ONE ad — each has its own layout,
clusters, style variants, visibility, order, photo and detached sizes, and all of them share
`state.modules`, the component list AND its text. That master-to-variant link is exactly what
a carousel must not have. So `state.adMode` (`'single'` | `'carousel'`) flips the cap
(3 → 10), the labels, and WHICH LIST a page reads and writes: on a carousel every variant
carries **`v.mods`**, a complete component list of its own. Every rail control, drag, dock
button, photo slot and export loop is the one that already existed; only the list under them
changes.

**The first cut was `pageOv` — page 1 sharing the list, pages 2+ carrying per-component
content overrides with freeze-on-write — and it was replaced the same day**, because a shared
list still links the pages by *structure*: adding a component on page 3 put it on every page,
deleting it on page 2 took it off every page, and a graphic uploaded on one page was the same
file on all of them. The user's instruction names that link as the thing to remove.

```js
static modulesFor(s, vi)      // THE read boundary: v.mods on a carousel, state.modules on a single ad
static modList(x, vi)         // THE write boundary, on a draft inside upd(); forks a page on demand
static allMods(s)             // every component that renders anywhere — the asset loader and Assets/ writer
static forkPage(x, vi, src, {keepOld})
static dropMod(x, vi, id)     // the one delete, both for the rail's Hidden list and the floating control
```

Ten reads and writes route through those. `writeMod` is `modList(...).find(...)` then the
edit — no freeze, nothing to snapshot, because there is nothing shared to protect.

## THE TWO WORLDS TOUCH AT EXACTLY ONE MOMENT

**Switching to carousel forks every variant that has no list yet off the single ad**, so the
pages START where the ad was and are linked to nothing from then on. `forkPage` clones the
source list under **fresh ids** (`freshId()`), moves every per-id map the variant carries —
clusters, style variant, hidden, order, spacing, float and position, on the base and on a
detached size — onto the new ids, and **copies any graphic or icon file** to the new id
through a new `ImageSlot.copySlot`, so the art travels with the component instead of being
shared by it.

**`keepOld` is the one subtlety.** A variant forked FROM the single ad keeps its old keys
beside the new ones (`{keepOld: true}`), because switching back to single has to find them —
measured: after a round trip, variant 2's clusters for `m1`–`m5` are all still there. A page
forked from another PAGE (`Add Page`) drops everything that is not its own (`keepOld: false`):
Page 3 forked from a six-component Page 2 carries exactly its own ids and no others.

**Switching back to single leaves `state.modules` byte-for-byte as it was** and keeps every
page's list, so the round trip loses nothing in either direction. Measured: `modules`
unchanged through carousel → edits on three pages → single; forward again, every page's text
and order intact. Undo reverses the switch.

**Measured, all on one build:** two variants forked into pages with disjoint fresh ids while
the ad kept `m1`–`m5`; a Hook added on page 2 → page 1 stays 5, page 2 goes 6, the ad stays
5; hero edited on page 2 then page 1 → three different texts, each page's ops carrying only
its own; Page 3 added from page 2 → copy included, fresh ids, own bookkeeping only; a
component deleted on page 2 → page 3 keeps its copy, page 2's key gone; a reorder on page 3 →
pages 1 and 2 untouched. A PNG dropped on page 1's graphic, Page 3 forked → its own record
under its own id with the same bytes; Page 3 removed → its copy cleared, page 1's kept.

## THE STORY TOGGLE IS PROJECT-LEVEL AND CAROUSEL-ONLY

`state.storyOn` (default true, stripped like Organic's — which sizes are on screen is not a
change to the artwork) gates the 9:16 plate (`v.stOn`), the rail's own-photo row, the raster
and PDF export loops (`sizesFor`), and the four export descriptions. `storyShown(s)` is the one
predicate. It composes with the existing per-variant `wide`: carousel + hidden gives `sq, ls`.
Hiding the story also drops a selection that lived on it, or the floating control would pin to
a plate that is no longer there.

## EXPORT NAMES

`fileLabel(vi)` is `page1` on a carousel — a filename wants no space — and `Master` /
`Variant 2` on a single ad, so nothing existing renames. Verified with delivery stubbed: story
hidden, **10 files** `Waterfront_page1_1x1.jpg` … `page10`, none at 9x16; story shown, **20**,
ten of them `_9x16`. Asset files follow (`background-page-3`).

## THE PRE-EXISTING BUG: PHOTOS ARE KEYED BY INDEX, AND REMOVE NEVER MOVED THEM

Every Campaign photo slot is `adstudio-bg-<vi>` (plus `-st`, `-ls`, and `adstudio-fg-<vi>`).
`remove` spliced the variant array and left the slots where they were — so deleting a middle
variant put every later variant on its neighbour's photo and orphaned the last one. Rare with
three variants; routine with ten pages.

`ImageSlot.moveSlot(fromId, toId)` is a new static beside `cloneSlot`, going through the
store's own `setSlot` so the in-memory copy, the sidecar write and every bound element stay in
step — writing the sidecar directly would be undone by the next save. `remove` shifts every
later variant's four slots down one and clears the last. **Measured: RED / GREEN / BLUE on
pages 1-3, remove page 2 → RED / BLUE / ∅.** `activeVi` also stays where you were
(`min(vi, n-2)`) rather than jumping to the master. `save()` coalesces in-flight writes, so
the remap costs at most two sidecar writes.

## Smaller things

- `RECENT_THUMBS` is **6** for Campaign now (was a literal 3, "its variant ceiling") — the
  same cap and the same trade Organic records: a 10-page carousel's recents card reels the
  first six.
- `normState` defaults `adMode` / `storyOn` on an old project, and a carousel written by the
  FIRST carousel build (one shared list plus per-page `pageOv` overrides) is resolved into
  per-page lists once, `pageOv` deleted. Verified on a hand-built legacy state: page 2's own
  hero text survives, a dangling override is dropped.
- Labels follow the mode everywhere they were hard-coded: plate badge, `projMeta`, the dock's
  two buttons, the All-variants head and its tooltip, the rail footer, and the three
  "linked across all variants" field labels, which read "this page only" on a carousel.
- 303 render keys (286 + exactly the 17 new), no duplicates; 977 CSS rules, unchanged (this
  pass authored no CSS); `sc-if` +2/+2 for the two gates; 17 new root refs, all declared once,
  none newly unresolved.

## Left as decisions, not applied

- **A new page does not copy the source page's PHOTO**, only its design, copy and art — the
  behaviour "Add variant" always had. A carousel page usually wants its own picture; one
  `copySlot` per photo slot if it should inherit.
- **The placement Preview still offers Story and Reels tabs with the story hidden.** It is a
  mock of a placement rather than an export list; hiding the tabs is a shell-side gate on
  `storyShown`.
- **Switching to `single` with more than three pages keeps them all.** The cap governs adding,
  not existing; the button simply reads `Max 3 variants`.
- **A legacy first-build carousel migrates with its ids kept**, so two of its pages that
  carried the same graphic still share that file until one of them re-uploads. `normState`
  runs without the store, so it cannot copy slots; a one-off `forkPage` on load would.
