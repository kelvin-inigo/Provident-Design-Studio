<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Campaign Ads Studio (CAS) — panels, components, exports, Copy, Unbranded

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

> **The variant sets below were redrawn (2026-09-30)** — Jumbo is the headline's XL size, the spec
> panels are Glass row / Glass ladder, and the tag treatments are six named shapes. See *CAS'S
> DESIGN COMPONENTS WERE REDRAWN* at the end of this file.

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

> **SUPERSEDED (2026-10-15): `listRtl()` returns false.** Arabic mirrors the WHOLE layout now,
> and a list reads right to left because the page does. See *ARABIC MIRRORS THE WHOLE AD* at the
> end of this file. The six components' branches below are dormant, not deleted.

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

# CAMPAIGN TAKES FOUR SUPPLIED SHAPES: AN ICON ROW, PER-LINE HERO INK, BRASS CAPS, A JUMBO CHIP

> **SUPERSEDED IN PART (2026-09-30):** the brass eyebrow is no longer a variant — it is the
> eyebrow's **Ink**, a module field (`m.inkHex`) — and the jumbo chip is the tags' **XL** size.
> Saved projects migrate (`RETIRED`). The icon row, per-line hero ink and the brass token stand.
> See *CAS'S DESIGN COMPONENTS WERE REDRAWN* at the end of this file.

Four attachments, one pass, all on `Provident Campaign Studio.dc.html`. **Op census over 4
templates x 2 palettes x 3 canvases: 24 groups, 336 ops, 24 byte-identical, 0 threw** against
the pre-change copy served alongside — so every existing ad is unmoved, and the four
additions are things you opt into. The templates cover `eyebrow`, `hero`, `spec` and `tags`,
i.e. all four components this pass touches, so that census is the real test rather than a
census of components nobody changed.

## ONE BRASS TOKEN, AND IT IS THE FIFTH EXEMPTION

`PAL.brass` `#B0905C` in **both** palettes — one value, because it is a brand colour that has
to read on either ground rather than an ink that flips. Three of the four requests name it.
This is the fifth deliberate exemption to "no gold in canvas output at all", after Organic's
ranking badge, award line, agent designation and carousel overline.

**MEASURED, not asserted: 6.99:1 on the dark canvas, 4.85:1 on the brand-navy scrim, 3.00:1
on the light one.** So it is exactly at 1.4.3's large-text floor over white.

**THE ONE COMBINATION THAT DOES NOT CLEAR: the 16:9 eyebrow is 22px at weight 500**, which is
under the 24px large-text line, so brass caps on the LIGHT 16:9 canvas sit at 3.00 against a
4.5 bar. The 1:1 and 9:16 eyebrows (24 / 28px) and the hero (85px) are large text and clear
it. Flagged rather than silently refused: it was asked for by name, the light palette is a
per-variant choice, and the eyebrow in practice sits on a scrimmed photograph rather than on
the bare ground.

## 1 — SPEC DATA GAINS AN `icons` VARIANT, AND IT NEEDED NO MARKUP OF ITS OWN

`[icon][figure over label]` per cell, spread across the column — the supplied row of
`1-3BR / RESIDENCES`, `AED 2.95M / PRICE STARTING FROM`, `50/50% / PAYMENT PLAN`.

**THE PREVIEW ALREADY DREW THIS SHAPE.** The `isRows` block is `[connector][icon][fig][lab]`
per row and serves process steps and the icon chips, so the icon row joins it rather than
growing a fourth spec markup block. The one thing it needed was a wrapper so the pair can
STACK beside the icon — and that wrapper is **`display: contents` on every existing row**,
which removes it from layout entirely, so steps and icon chips are render-neutral by
construction rather than by inspection.

**`pairStyle` is defaulted AFTER the chain's terminating else**, not at the four separate
prow builders — a render key only some kinds set renders as the browser default, and a key
added between the last `else if` and its `else` re-binds that else to the new test.

**THE ICON ROW OVERRIDES BOTH OF `pair()`'S READINGS, and both overrides are the design.**
`pair` gained an explicit figure-first flag and an explicit centring flag, each defaulting to
what it always was:

- **Figure first, always** — `figTop` is not consulted. An icon beside a tracked-caps label
  with the figure under it reads as three unrelated things; the icon and the figure are the
  horizontal reading.
- **The pair never centres in its column** — the icon is the block's left edge and the BLOCK
  is what centres. Measured on the supplied copy: figure and label share one x, exactly as the
  attachment draws them.

`icoD` is `figPx * 1.15` and `icoGap` `figPx * .5`, so the mark tracks the figure at every
canvas size and every Scaling setting — **verified: `icoD / figPx` is identical on the feed
and the story**, one set of ratios and the 9:16 follows for free.

**No hairlines.** Every other spec layout rules between its columns; here the icon is what
separates one cell from the next, so a rule would be a second divider doing the same job.
`hug` still means what it means everywhere else — measured 413.9 of a 920 column on short
cells, and clamping to the full column when the data is wider, which is the documented right
answer for an overflowing panel.

**The icon slots are the ones that already existed** — `adstudio-ic-<modId>-<i>`, `ICON_MAX`
6 against `SPEC_MAX` 6, so they line up exactly. `loadAssets`, `assetFiles`, the picker's
gate, its step count and `applyIcon`'s message all gained `spec`; the picker calls a column a
column.

**A PREVIEW BOX HAS TO RESERVE WHAT THE OP RESERVES.** The pair first shipped with the figure
at `lineHeight: 1.12` and the label on the inherited lead, which made the preview's pair box
**9 canvas px shorter** than `B.pairH` — and since the row centres the pair against the icon
on its own height, the whole block sat ~14px high in the editor and correct in every export.
Both runs carry 1.3 explicitly now. After: **dX <= 0.5, dY a uniform -6.93** on all six runs,
where the spec `row` variant beside it measures **-16.1 and -26.2** in the same build. A
several-px block offset is this stack's pre-existing character; the icon row is the more
faithful of the two.

## 2 — THE HERO TAKES A COLOUR PER AUTHORED LINE

`m.lineHex`, indexed by the segment the user typed — **never by the drawn line**. Wrapping
depends on the column, so a colour keyed to the wrapped line would jump between the 1:1 and
the 9:16 and move again under Scaling. `heroLines` stamps the ink onto each segment before
`wrapRuns`, so it carries into every line that segment wraps to, and the ops branch needed no
change at all: it already read `r.fill` off the run.

**THE PREVIEW'S `pre` / `<em>serif</em>` / `post` IS RETIRED, and it was carrying a live
defect.** That split is a survivor of the removed serif emphasis, and `serifStyle` forces
weight 400 — so under **Jumbo**, whose base is Light 300, the marked word rendered bolder in
the editor than in any export, where `heroLines` emits one run at 300. It is one span per
authored line now, which is also what carries the colour. Measured after: hero lines at
**dX 0.00** with the ink matching the op exactly.

**A blank interior line is a non-breaking space**, because an empty block box collapses to
nothing while the op still advances a full line for it.

**`fade` still wins**, and the rail's tip says so: that variant paints one gradient across
the whole block in canvas coordinates, which is what the op does too.

## 3 — `brass` IS A PLAIN EYEBROW IN A DIFFERENT INK

The supplied design is tracked caps in brass with no rule and no box, so a fifth box
treatment would be inventing one. `modPx` therefore reserves exactly what `plain` does, and
the ops and the preview each took one ternary.

## 4 — JUMBO IS A MODULE FIELD AND ONE SCALAR, NOT A SEVENTH VARIANT

The supplied design is a jumbo **accent** pill, so a variant would have made the two mutually
exclusive. `m.jumbo` composes with mist / gold / icon / rule / dot / plain.

**`CampaignStudio.tagK(m, tk)` is `tk.hook / tk.eyebrow`, which is 1.458 / 1.464 / 1.455 on
the three canvases** — so the jumbo step is the same relative size everywhere rather than
three different sizes — and **k is exactly 1 when it is off, which is what makes every
derived expression byte-identical to the literal it replaced.** Text, row height, both
paddings, the icon box, the icon's trailing gap, the inter-chip gap and the row gap all read
it, in `chipRows`, `stripRows`, `modPx`, both op branches and all three preview branches. So
the chip grows as one object instead of a bigger label rattling in the old pill.

Measured: pill `228.0 x 46.0` -> `330.6 x 67.1`, text 24 -> 35, preview padding
`9.72px 28.08px` -> `14.18px 40.95px` — every ratio 1.458. The gold stroke is retained,
because the treatment is a different axis.

**AND THE CHIP'S RADIUS WAS WRONG, IN EVERY BUILD SINCE IT WAS WRITTEN.** `chipStyle` carried
`borderRadius: '6px'` against an op of `r: rh / 2` — a full capsule — so the editor drew a
soft rect where every export drew a pill. It is `999px`, which is this file's own rule: a
preview mirroring an op with `r = h/2` is 999px. The documented pill sweep missed it because
it swept *buttons*, and this is a canvas preview style.

**The chip text's residual drift is pre-existing and proportional.** Measured in one build on
distinct copy: regular `dX 3.0 / 13.5`, jumbo `dX 2.2 / 13.9` — jumbo is no worse, which is
what one scalar should do. It comes from the preview's cqw padding and flex gap against the
op's `28` and `16`, and it predates this pass.

## THE ICON TINT IS RESOLVED, NOT HARDCODED

`CampaignStudio.icoInk(m, dflt)` reads `m.icoHex` and falls back to the ink each call site
always had, so adding it is inert. It reaches all three icon sites — process steps, icon
chips and the new spec row — and the control is one swatch row plus a hex field, the shape
the scrim's colour control already has.

**`m.icoHex`, `m.jumbo` and `m.lineHex` are MODULE fields**, so they are linked across design
variants exactly as `big` / `hug` / `figTop` are. They describe how the content is presented,
not how one variant looks.

**`CampaignStudio.inkSwatches(pal)` is four palette ROLES rather than six fixed hexes** —
Canvas ink, Brass, Soft, Mute — so each reads on its own canvas and flips with light/dark,
and the hex field covers everything else. The first entry is the CLEAR entry: "follow the
canvas" is a state, not a colour, and **an empty hex field clears it** rather than being
ignored, or a colour once set could only be swapped and never undone.

**The hero's control is a LINE PICKER plus one swatch row**, not a swatch row per line — the
same shape the icon picker uses, and `_heroLine` lives on the instance with `forceUpdate`
because throwaway UI has no business in the saved project or the undo stack.

## A DUPLICATE RENDER KEY, CAUGHT BY THE MECHANICAL CHECK

I added `selIsHero` next to `selIsGraphic` without grepping for it first — it was already
declared 35 lines below, and **a later key in the same object literal silently wins**. Same
value either way, so nothing broke; it is the check that found it, not the render. Run the
top-level-key scan after any `renderVals` edit, and compare its output to the PRE build's
rather than to zero — this file's own false positives (`eyebrow`, `hero`, `hook`, … from the
`VOPT` table at the same indentation, plus `fgOn` and `campaign`) are identical in both.

## Verification

- **Ops: 24 groups, 336 ops, 24 byte-identical, 0 threw.** The new paths exercised
  separately: the icon row on both canvases, hugging and edge to edge, left and centred, with
  and without uploaded marks and with a brass tint; brass eyebrow against plain; jumbo against
  regular pills; per-line hero ink both ways.
- **Preview against ops, one coordinate space, scoped to ONE zoomed canvas box** — the probe
  first matched both canvases and reported 2700px of "drift" that was the 9:16 plate, which is
  the documented twice-as-many-nodes trap.
- **Every control driven end to end through the rail**: hero line 1 to Brass and back to
  canvas ink (line 2 untouched), the spec icon tint to `#B0905C`, the chip-size tiles setting
  `jumbo` and both chip rows going 46 -> 67.1 tall.
- **Contrast, both themes reloaded into, transitions AND animations finished, ancestor opacity
  composited: dark 0, light 2 — and identical to the PRE build element for element and ratio
  for ratio.** Both light flags are the DISABLED Undo/Redo pair at 3.14, 1.4.3-exempt.
  **0 elevation shadows** in either theme in either build.
- **Sheet and markup**: one closing style tag, comments 322/322, brace and paren depth 0,
  `sc-if` +1/+1 and `sc-for` +6/+6 — balanced, on the documented one-off baseline.
- **Interpolation sweep against the PRE copy: 13 unresolved before and after, none newly
  unresolved**; 17 new refs, all declared once.
- **SVG export valid** with the new ops — 13 texts, the brass runs present.
- The test origin's `localStorage` was cleared, the `_PRE` copy removed from the project
  folder and the server stopped. `studio-base.js`, `image-slot.js`, `runtime.js`,
  `ui-design-system/`, Organic and the image tool are **untouched**.

## Left as decisions, not applied

- **The icon row draws no dividers and is never boxed.** `boxed` / `boxrow` are the panel
  treatments and they carry hairlines; giving the icon row a panel is one flag if it is wanted.
- **The price block's small label is 19.2px in the preview and 24px in the op** — `view.labStyle`
  falls through to the base `tk.eyebrow * .8` while the op draws `tk.eyebrow`. Pre-existing,
  present in the PRE build, and outside this pass's scope.
- **`m.serif`, `view.serifStyle` and the `pre` / `post` keys survive** with no reader, by the
  standing rule about deleting render keys that look unused.

# CAMPAIGN HAS A COPY WORKSPACE, AND THE CHANGELOG IS ITS SNAPSHOTS

`Provident Campaign Studio.dc.html` gains a **Design | Copy** switch in the top bar. Copy is
for copywriters: the campaign's words alone, in reading order, beside the real export — no
layout, style variants, photos or spacing. It came out of a discussion rather than a spec,
and the decisions that shaped it are the useful part:

- **Not a separate studio, no comments, no accounts, no live Google Docs sync.** The
  copywriters' real practice is to hand over verbal changes during proofreading, so a comment
  system would go unused. What was actually missing was a **changelog and an archive**.
- **Google Docs is only the initial stage**, so the answer is a `.docx` a person downloads
  (it opens in Docs), not an integration.

**Op census over 4 templates x 2 palettes x 3 canvases: 24 groups, 336 ops, all 24
byte-identical** against the pre-change copy served alongside. No artwork line moved.

## IT IS A PROJECTION, NOT A SECOND EDITOR

The copy view reads `modulesFor` and writes `writeMod` — the same list the canvas renders — so
a word typed there is the word on the canvas, with no import and nothing to merge. It is an
overlay over the editor (`.cw`, fixed under the 55px bar, z 65), so switching back to Design
loses nothing and nothing in the editor had to learn about it.

- **Reading order is the canvas's**: top cluster, then bottom, each in the variant's own
  `ord` (`copyMods`). Divider, spacer and graphic carry no words and are skipped.
- **Fields are per type**: an input for the eyebrow and the button; a textarea with a line
  counter for headline / hook / body / list / steps (their own caps, `LINE_MAX` / `LIST_MAX` /
  `STEP_MAX`); two inputs for the price (small label + figure); **one input per chip and per
  spec row**, with add and remove — the rail's comma and `label | value` syntax is a
  convention a copywriter should not have to learn. A new point lands already SELECTED
  (`cwFocusLast`), so its placeholder is replaced by the first keystroke.
- **A single ad is ONE page of copy** however many design variants it has, because the words
  are shared by every variant. A carousel is one section per page; clicking into a page makes
  it the active one, so the preview follows (`onPointerDown` on the section).
- **Hidden components are shown, and say so** ("Hidden on the canvas by design" / "on some
  variants") — the copy still exists and may be turned back on.
- **The preview is the real export**: `buildOps` -> `renderOpsToCanvas` at .5 for 1:1 and
  (when shown) 9:16, keyed on `strip(state) + activeVi + storyOn + _filled` and settled 220ms
  after typing stops. `_cwTick` in the shell's mount and update hooks drives it, like the
  placement preview; `cwSync` re-runs if the key moved while a render was in flight.

## STATUS AND SNAPSHOTS

`state.copyStatus` is **Draft -> With design -> Final**. A FORWARD move (Send to design, Mark
as final) appends a snapshot to `state.copyLog` — plain data, `{at, status, by, name, mode,
pages: [{label, fields}]}`, capped at 50. Going back (Back to draft, Reopen for edits) records
nothing, because nothing was handed over. Verified: final -> design writes no snapshot and no
file; design -> final writes one of each.

**Both keys are stripped from `strip()`, and `restore()` carries them over from NOW.** A status
change is not a design change and must not push undo, and the history must never be UNDONE —
a snapshot is a record of what was sent, and an undo that took it back would erase the
changelog. Verified: undo and redo move the copy and leave status and log where they were.
`_syncLS` compares a copy signature beside `strip()`, so a status moved in another window
still arrives.

**THE DIFF IS KEYED BY PAGE POSITION AND FIELD NAME, NEVER BY COMPONENT ID, and the first cut
got this wrong.** Going to a carousel — or adding a page from another — gives every component
a fresh id (`forkPage`), so an id-keyed diff logged an untouched ad as 20 changes: all of it
removed and re-added. Keyed by name ("Headline", "Headline 2" when a page has two) the same
switch reads as exactly the 10 lines the two new pages brought.

**"N changes since <status> · <time>"** under the actions is read off that diff against the
last snapshot, so a designer opening a Final campaign can see the words moved after approval.

## THE ARCHIVE IS A .docx, AND THE SOURCE FOLDER GETS ONE PER HAND-OFF

`copyDocx(entry, prev)` builds a minimal WordprocessingML package with the same stored `zip()`
every export uses — content types, rels, `document.xml`, a `styles.xml` whose docDefaults set
Arial 11 — so it opens in Word, Pages and Google Docs. It carries every page and field and,
given a previous snapshot, a "Changes since" section with the old text struck through. Arabic
lines get `w:bidi` / `w:rtl` off `StudioBase.dirOf`. Verified by parsing every part, by
Apple's own OOXML reader (`textutil`), and by rendering it (Quick Look).

- **With a source folder set, every hand-off writes `Copy/<name>_Copy_<Status>_<stamp>.docx`
  into it** through `providentFolder.write` — no prompt, no download. That is the archive: the
  folder a project lives in also holds what its words were at each step.
- **Without one**, each snapshot in the History list offers its own `.docx`, and **Download
  .docx** gives the words as they are now at any status — the initial-draft handover.
- **"Your name"** in History is per computer (`adstudio-author`) and stamps the snapshots made
  there. There are no accounts; this is attribution, not authentication.

## WHICH WORKSPACE OPENS IS PER COMPUTER

`adstudio-workspace` in localStorage, written by the switch. Resume (`load()` and Continue
last) lands on `workScreen()`, so a copywriter's machine reopens on Copy and a designer's on
the canvas — while the project they pass between them is one file. The session `.json`
carries `copyStatus` and `copyLog` because it carries the whole state.

The canvas bar carries a **Copy · <status>** chip (grey dot draft, link-blue with design, green
final) that opens the copy view — the designer's view of where the words are.

## Verification

- Sheet: one closing style tag, comments balanced (321/321), brace depth 0; markup `sc-if`
  +20/+20 and `sc-for` +7/+7 on the documented one-off baseline.
- Interpolation sweep against the pre-change copy: 13 unresolved before and after, **none newly
  unresolved**; 38 new refs, all `cw*` and all declared.
- Real pointer and keyboard throughout: typing and Enter reach the export preview; Send to
  design / Mark as final / Reopen / Back to draft; add a point, type over it; carousel page
  switching with focus surviving the re-render; per-page writes leave the other pages and the
  single ad's list untouched.
- **Contrast, both themes reloaded into, animations finished, ancestor opacity composited,
  over the copy view, the top bar and the canvas bar: dark 0, light 2 — the disabled
  Undo/Redo pair**, 1.4.3-exempt. **0 elevation shadows.** One failure was caught and fixed on
  the way: the green "done" step numerals were `--ps-good` on its wash at 3.94:1 in dark; they
  are a solid `--ps-good` disc with `--ps-app` ink now.
- 390px: preview stacks above the form, no horizontal scroll.
- `studio-base.js`, `runtime.js`, `image-slot.js`, Organic, the image tool and
  `ui-design-system/` are untouched. The test origin's storage was cleared and the `_PRE`
  copy removed.

## Left as decisions, not applied

- **No per-line comments.** Deliberate, from the workflow discussion; the snapshot diff is the
  record, and verbal changes land as edits between two snapshots.
- **Past snapshots are listed, not browsable as a restorable state.** Restoring old copy is a
  copy-paste from the downloaded document; a "restore this snapshot" button is one `writeMod`
  per field if it is wanted.
- **The copy view is Campaign-only.** Organic's guided run already plays this role for its
  locked templates.
- **Status is advisory.** Nothing stops a designer editing words while the copy is Final; the
  "N changes since Final" line is what makes it visible.

# THE COPY VIEW TAKES COMPONENTS, AND THE TWO PREVIEWS WERE MADE TO AGREE

Feedback on the pass above, from the copywriter's side: templates leave a writer no room ("what
if they need a hook line but it's not available"), the copy view should show one big square
and no story, and — the one that was a defect — **"the preview on the design window should be
similar to the copy window, because I saw one project and they look different in each view."**

## THE MISMATCH WAS FOUR THINGS, AND ONE OF THEM WAS IN THE EXPORT

Measured with a probe that reads every DOM text node's line box in canvas units and compares
it with its op's baseline, across 4 variant sets x left/centre x 1:1 and 9:16.

- **THE OVERFLOW RAN IN OPPOSITE DIRECTIONS.** When the copy is taller than the canvas the DOM
  column overflows DOWN into the logo's clear space, while `buildOps` anchored the bottom
  cluster to the floor and let it climb UP into the headline — up to **95 canvas units** apart
  on the project that was reported. The bottom cluster's start is clamped to where the top one
  ends (`y2 = Math.max(y, …)`), so the export now overflows the way the editor does. **Only an
  overflowing design moves**: op census, 4 templates x 2 palettes x 3 canvases against the
  pre-pass build served alongside, **24 groups, 336 ops, 24 byte-identical, 0 threw.**
- **A centred bottom cluster on 9:16 un-stretched its lists.** The Reels guard centres the
  cluster with auto margins, and an item with auto margins SHRINKS to its content — so a
  bullet list, a spec panel, a step grid or a divider collapsed to its own text and sat
  **255 canvas px** right of the op, which keeps one left edge at the guard's. Those types take
  the guard's width back explicitly (`STRETCH`); everything else still shrinks and centres.
- **The hairline bullet list ran ~12 px tall per row** — padding plus a layout-taking 1px
  border, where the op draws the plain step with the rule ON the row's top edge and the text
  .3em lower. It is an inset `box-shadow` ring at one device pixel and a relative offset now.
- **Preview-only drifts** in chips, icon chips, the CTA, the price block and the list, all
  the same two causes this file already records: a border inside the zoom floors at one device
  pixel and takes layout space (every stroke is an inset ring now), and a CSS line box puts the
  baseline at `(lh - a - d)/2 + a` where the op puts it at `1.0 x px` (a relative `top` makes
  up the difference).

Worst delta across all 16 combinations after: **7.8 canvas units**, most of it the documented
wordmark gap. It was 255.

**AND THE COPY VIEW HAD ITS OWN CAUSE, which is the one the report most likely was.** A click
anywhere in its form ran `pg.pick`, which on a single ad set `activeVi = 0` — so looking at
Variant 2 in Design and switching to Copy showed the MASTER, a different design. The pick is
carousel-only now; a single ad's form is one page and never touches which variant is shown.

**The copy preview also awaits the face before it draws.** A canvas never pulls a webfont, so
a cold render landed in the fallback face and set wider than the design window beside it.
`cwSync` loads every weight the ad draws, `ensureFont` for Arabic, then `document.fonts.ready`,
and the font key is part of `cwKey`.

## ONE SQUARE, AS BIG AS THE COLUMN

No 9:16 in the copy view — a writer checks the words, and the square is where they fit
tightest. The column is 46% (`minmax(360px,46%)`) and the square is
`min(100%, calc(100vh - 250px))`, so the whole ad is on screen beside the form: **605 px at
1440 x 900**. It renders at the size it is SHOWN — the box's width times the pixel ratio, .05
steps, clamped .5–1 (`cwScale`, in `cwKey`) — where it was a flat .5, which on a retina
display was a 2x upscale.

**A picker above it chooses the design.** On a single ad it is the variants (Master /
Variant 2 / …) — the words are shared, but each variant lays them out differently, so a writer
can check them in every one. On a carousel it is the page numbers, and a pick scrolls the form
to that page (`data-cwpg`).

## A WRITER ADDS AND REMOVES COMPONENTS, IN PLAIN NAMES AND THE BASIC LOOK

`COPY_NAME` is the writer's vocabulary now: **Small label, Heading, Hook line, Body, Bullets,
Key facts, Tags, Steps, Button, Price** — "Eyebrow", "Spec data" and "Tag chips" are the
designer's words. Every page ends in an **Add to this page** palette grouped **Text / Lists /
Action** (`COPY_ADD`), each button carrying a one-line tooltip of what it is (`COPY_WHAT`).

- **No style variant is ever set**, so a new component takes its type's first one — the look
  stays the designer's call, and the palette says so.
- **It goes on the END of the page's list**, which is the end of the bottom cluster — so it is
  also the last field in the form, and the form's order stays the canvas's reading order. The
  notice says the designer places it.
- **It starts EMPTY** (`COPY_BLANK`), so a sample sentence can never ship as copy — except the
  four that draw a box with no words in it, measured: an empty CTA emits its pill, an empty step
  its plate and numeral, a chip and a fact row their boxes. Those start with an obvious
  placeholder (`Button label`, `First step`, `New point`, `Label / Value`) that lands SELECTED,
  the convention `chipAdd` already had. The field scrolls into view, takes the cursor and
  flashes.
- **Remove** is a trash icon on every field, through the one `dropMod`, and its notice carries
  **Undo** for 15 seconds — a 7-second notice cleared before the Undo could be reached, which is
  how the first real-click test "failed".
- **On a carousel the palette opens on the page being worked on**; every other page offers one
  `+ Add to this page` that makes it that page, so ten pages are not ten palettes.

**The rename is read through `COPY_NAME_WAS` in the diff.** The changelog is keyed by field
label, so a snapshot taken under the old names would otherwise log every renamed field as one
removed and one added. `copyRelabel` maps the old base name and keeps a trailing number.

## Verification

- **Real pointer and keyboard**: a click in the form leaves Variant 2 in the preview; `+ Hook
  line` adds an empty hook with no `mvar` and no cluster, focused, and typing reaches the ops;
  the trash removes it and Undo restores Tags with its chips in place; on a carousel, page 2's
  `+ Add to this page` makes it the page, `+ Bullets` lands on page 2 alone, and page 1 and the
  single ad's list are untouched.
- Sheet: one closing style tag, comments 323/323, brace depth 0; markup `sc-if` +3/+3 and
  `sc-for` +3/+3 on the documented one-off baseline. Interpolation sweep: 13 unresolved before
  and after, **none newly unresolved**; `cwShotStStyle` / `cwStOn` gone with the story shot.
- **Contrast, both themes reloaded into, animations finished, ancestor opacity composited, over
  the copy view with the palette and an Undo notice on screen: 0 failures in 102 text elements
  in either theme**; the top bar adds only the disabled Undo/Redo in light. **0 elevation
  shadows.** 390 px: no horizontal overflow, the square 231 px.
- The test origin's storage was cleared, the `_PRE` copy removed and the server stopped.
  `studio-base.js`, Organic, the image tool and `ui-design-system/` are untouched.

## Left as decisions, not applied

- **No overflow warning in the copy view.** A writer adding four components will overflow the
  canvas; the big preview shows it at once, and the design window's coverage chip counts it.
  A copy-view readout needs the coverage maths lifted out of `mkCanvas` rather than copied, or
  it is a second geometry path.
- **A writer cannot choose WHERE a new component goes.** Placement is the designer's; the form
  follows the canvas order, so moving a line up in the form would mean moving it on the canvas.
- **Templates that learn from recent use** were discussed and not built. See the reply that
  accompanies this pass: a frequency ranking over ten recents is weak and self-reinforcing;
  "save as a starting point" and "reuse a recent layout with the copy cleared" are the stronger
  shape, with frequency as a sort order on top.

# LIST FIELDS ARE ONE FIELD PER ITEM, RECENTS ARE WHAT WAS SAVED, AND THE COPY VIEW DRAGS

One request, five parts: drag to reorder in the copy view; every list typed with a separator
(`|` or `,`) becomes one field per item in Design; an overall Design-view refinement with an
inconsistency check; recents that show only saved projects and update the moment one is
saved; and a push. **Op census against the pre-pass build served alongside: Campaign 60
groups (4 templates x 2 palettes x 3 canvases, plus a list-heavy state through six chip and
spec treatments), 948 ops, 60 byte-identical; Organic 42 groups (six templates x every slide
x both canvases, plus weekly and listed with a messy `|` USP), 773 ops, 42 byte-identical.**

## RECENTS ARE WHAT WAS SAVED

They were written when you LEFT a project — picking a template, starting a new one, opening a
recent — so a project that was only ever opened sat on the splash beside the saved ones, and
one that WAS saved did not appear until something else was opened. People were opening a
"recent" that had never been saved and taking it for their saved work.

- **`StudioBase.recordSaved()` is the one writer**, called by Save session (both paths), by an
  export into the source folder (it rewrites the session file beside the renders, so it IS a
  save), and — one-shot, on the load that follows — by opening a session file, which is a
  save somebody already made. `loadSessionFile` cannot do it itself: it ends in a reload, and
  the thumbnail has to be drawn by the engine the file opens into. `recSavedKey()` is the flag.
- **It calls `forceUpdate()`**, so Projects straight after a save shows the card with no reload.
- **`state.pid` is the project's identity** across saves, renames and sessions — saving again
  replaces its card rather than adding a second, and two projects both called "Untitled" are
  two cards. Minted by `ensurePid()` on the first save, by `pickTpl` / `newProject`, and kept
  by `openRecent`. `strip()` deletes it (it is not a design change) and `restore()` carries it
  from NOW, or an undo would hand the project a stale identity.
- **Old entries carry no `saved` flag and are HIDDEN, not deleted.** Nothing can tell a saved
  one apart among them, and the session files are still in their folders. `savedRecents()` is
  the splash's reader; the list still writes unsaved entries back untouched.
- **`warmFaces()` before the thumbnail**, because a canvas never pulls a webfont and a card
  drawn before the face lands is cached in the fallback.
- **Leaving for Projects asks once, then marks the work saved**, so picking another project
  from the splash does not ask a second time. New / open / pick all go through `confirmDiscard`.

## ONE FIELD PER ITEM, AND THE CANVAS TRIMS

Campaign's tag chips were a comma list and its spec columns a `label | value` line each, both
**trimmed on every keystroke** — which ate the space before every second word, made Enter
unable to start a new column, and meant a chip could never contain a comma ("AED 1,200,000").
Organic's Marketing USP was one field with the points separated by a bar nobody could find.
All three are the copy view's own list control now: a field per chip, a label-and-figure pair
per column, a field per point, a quiet remove beside each and a dashed add under the list.

- **Stored verbatim, trimmed where it is READ.** `CampaignStudio.chipsOf(m)` / `colsOf(m)` are
  the canvas's one read of a list: trimmed, empties dropped, **each item keeping its position
  `gi`**, because uploaded icons are keyed by the row's place in the WHOLE list. `chipRows`,
  `stripRows`, `specBox`, both preview branches and the rail's fill-in count all read them.
  The census is identical because the old parser guaranteed there was nothing to trim.
- **Leaving a field tidies it** — `tidyChip` / `tidyCol` (and Organic's `pt.tidy`) trim on
  blur and return null when nothing moved, so a blur never costs an undo entry.
- **Deleting a row moves the icons after it up** (`shiftIcons`, `ImageSlot.moveSlot` down the
  list, the last slot cleared). Verified with three coloured icons: delete the middle chip and
  the third icon follows its chip into slot 2, the store holds two.
- **Focusing a row retargets the icon picker** (`onFocus` works in DC; so does `onBlur`), and
  the targeted row carries the link ring.
- **Organic stores the bar-joined string it always read**, so `propUsps`, the canvas, a saved
  project and a session file are unchanged. `ptsOf` reads a string containing ` | ` (space,
  bar, space) FULLY TRIMMED — `ptsJoin` never writes that shape, so it can only be text typed
  by hand before the field existed — and everything else keeps its trailing space, which is
  what is being typed. A single empty point is stored as `' '`, because `''` means no points.
- Newline-separated fields (bullets, steps, the hero's lines) were left as textareas: Enter
  is not a separator anybody has to discover, and the copy view writes them the same way.

## THE COPY VIEW DRAGS, AND THE DROP IS DECIDED BY THE LINE UNDER THE POINTER

A grip before each label (`drag_indicator`), pointer events never native DnD, a 4px travel
threshold so a press is still a click, a link-coloured line where the drop lands, the form
scrolling near its edges, Escape to cancel, one undo entry per move. **The keyboard is the
same move**: the grip takes focus and the arrow keys step it.

`CampaignStudio.copyMove(x, vi, id, tid, after)` rewrites every record that lays the page out
— each design variant of a single ad (the words are shared, so a writer's order holds in every
design) or the one carousel page, plus any detached size keeping its own clusters. **The moved
line takes its new neighbour's CLUSTER**, so a line dragged above the headline goes to the top
with it, and each variant keeps its own layout around it.

**THE FIRST CUT PICKED THE WRONG CLUSTER, and a real drag is what showed it.** The target was
"the first line whose middle is below the pointer", so in the lower half of the headline it
answered *before the tags* — same order, other cluster — and a Small label dropped under the
headline left the top of the ad for the bottom. The line UNDER the pointer decides now, by
which half the pointer is in; between two lines the nearer one answers. Each field carries
`data-cl`, so a drop beside a neighbour in its OWN part is a no-op while a drop beside one
across the boundary is a real move with the order held. **The keyboard crosses the boundary
in one press** rather than jumping past the first line on the other side. The notice says
when a line changed part ("Moved into the top part of the ad").

## DESIGN VIEW, TIDIED

- **Every rail field label is the `.p-lab` row** — name left, scope right. Six were written
  "Style variant — per design variant" inside a column-flex `.p-fld`, so the interpolated scope
  became its own flex item: a dangling em dash and the scope on a line under it. `.p-rail
  .p-fld > .p-lab` restates the row, since the quiet-span rule would otherwise take it.
- **The scope follows the mode**: "this page only" on a carousel for both text and style
  (`styleScope`), and the empty rail's note says each page keeps its own components.
- **Two booleans became two pairs**: the spec's *Reading order* (Label first | Figure first)
  and *Figure size* (Regular | Large) — the old `Figure on top ✓` button wrapped to two lines
  at rail width. The Overlap image is Off | On this variant.
- **Help prose moved into tooltips** where a tooltip already said it: the floating-control line
  under Space above, and the second caption under every drop — which had left the caption
  column 85px wide and wrapping a word to a line.
- **The multi-line hint is one line**: `2 of 4 lines · Enter for a new line.`
- **The hex field's placeholder is not uppercased** — it read CANVAS INK, the last all-caps run
  in the chrome.
- **The open dock sits over the floating component control** (`.p-dock:has(.p-dock-b)` z 45):
  the control's Top / Bottom / Hide / Delete pill was drawn straight across the dock's QR row.
- **Two stale descriptions**: the New launch template promised a "serif word", and the
  Background tooltip promised gold and orange accents and gold serif emphasis. The canvas
  carries none of the three.

## BUGS THE PASS FOUND

- **Campaign's top bar was 1524px wide in a 1440 viewport** — Share 84px off the right edge,
  reachable only by scrolling a bar nobody knows scrolls. It arrived with the Design | Copy
  switch. Undo / Redo are icon cells now (title + aria-label), the bar's gap is 10, and below
  1400 the delivery trio keeps its icons and drops its words (`font-size:0` — `.p-bic` is 15px
  fixed, so only the words go; each cell names itself in its `title`). Measured: 1440 fits
  exactly with Share at 1424, 1280 fits with the trio at 37-38px a cell. Mirrored to Organic.
- **Organic's top-bar buttons computed 12px/500** beside Campaign's 14px/600, on the same
  markup, and Share stood 37 tall. Scoped to `.p-top`; its Undo / Redo moved into Campaign's
  history capsule and its `▾` became the turning Material caret. The guided form's own button
  sizes were left alone.
- **Organic's option tiles logged two path-parse errors on every load** — `<path d="{{ … }}">`,
  the recorded trap, on the carousel's layout tiles and the Wordmark row. A tile's glyph varies,
  so it cannot be baked in; `OrganicStudio.maskIcon(d)` returns a base64 SVG as a mask in a
  style OBJECT with `currentColor` as the fill, so the ON ink still reaches it. The console is
  down to the rembg probe's refused connection and Chrome's no-gesture beforeunload notice.
- **Undo on Organic's guided screen jumped to All controls**: `restore()` forced `'editor'`.
- **`image-slot.js`'s `moveSlot` doc comment sat above `copySlot`**; moved to its function.

## Verification

- Op census as above: **60/60 and 42/42 byte-identical.**
- **Contrast, both themes reloaded into, animations and transitions finished, ancestor opacity
  composited**: Campaign editor with the dock open and the rail scrolled through four
  positions, the copy view scrolled through three, the splash; Organic's editor, guided run
  and splash — **0 failures and 0 elevation shadows in every one** (disabled controls excluded,
  1.4.3).
- Real pointer and keyboard for every new control: typing spaces and commas into a chip, a
  `|` in a spec figure, add (the new row focused and its placeholder replaced), delete with the
  icon shift, focus retargeting the picker, blur trimming; drag within a cluster, across it
  up, the keyboard crossing it down and stepping on; undo; Organic's points typed and tidied.
- A rail scan over all 13 component types selected in turn: no horizontal overflow, no
  element past the rail's edge, no wrapped button, no raw `{{`.
- Sheets: one closing style tag each, comments balanced, brace depth 0; `sc-if` / `sc-for`
  on their documented one-off baselines; 0 `d=` / `src=` interpolations; interpolation sweep
  **none newly unresolved** in either document.

# CAS HAS A 2:1 EVENTBRITE BANNER — TWO FILES, ONE DESIGN

By request (2026-09-28), with a supplied reference banner (`Nakheel Dubai Property Event`,
1880 × 940) and the event page it runs on. A per-variant **Banner 2:1** row sits under the
16:9 on every plate — **Show banner**, **Edit layout separately**, **Own photo**, the 16:9's
own three controls — and shows two canvases: **1880 × 940** and **758 × 380**.

**What Eventbrite does with the image, measured on the live page:** it serves the file at
`w=1880` into a **940 × 470** box on a desktop and **375 × 188** on a phone — 2:1, uncropped,
`object-fit: cover` onto the same aspect, and nothing overlaid on it (`elementFromPoint` at
seven points all returned the image). So there is no crop and no platform safe area to
reserve — only the brand margins. The phone figure is the one to know: the whole banner is
shown at a fifth of its size there, so only the headline really reads on a phone.

## THE 758 FILE IS THE 1880 DESIGN, LAID OUT AT 1880 AND EXPORTED AT 758 / 1880

`PXT.bn` is 1880 × 940. `PXT.bs` is **1880 × 942.48** — the 1880's own width at the 758's own
aspect — with `out: [758, 380]`, exported at `758 / 1880`. Checked in floating point: that
lands on **exactly** 758 × 380 (and `2 × (758 / 1880)` on exactly 1516 × 760 for the PDF).

**Laying the 758 out at 758 would NOT have been the same design**, which is the whole reason
for the virtual canvas. The margins, the wordmark's 80px clear space and every chip and panel
padding are canvas-pixel LITERALS in this engine, so at 40% of the width all of them come out
2.5x too large beside the type. At 1880 they are exactly the 1880's, every line wraps at the
same word, and the entire difference is 2.48 canvas px of extra height in the image window.

- **One token set, `BANNER_TK`**, read by both (a static field ahead of `PXT`, so the two
  cannot drift): the 1:1's type steps (hero 85 · headline 59 · hook 35 · body 28 · eyebrow 24 ·
  logo 41), margins `[80, 120, 80, 120]` like the 16:9, and a **`col` of 800** — a
  left-aligned banner puts its copy in a left column with a sideways wash, exactly as the 16:9
  does. The 1:1's steps because the 24px brand floor holds and Eventbrite shows the file at
  half size on a desktop, which is about where a 1:1 sits in a feed.
- **ONE layout record, `v.banOv`, for both sizes** (`sizeOv` returns it for `bn` and `bs`),
  and **ONE photo**, `adstudio-bg-<vi>-bn`, read by both through `photoSize()` — cover-fitted
  on each canvas, so the picture runs edge to edge on each file. Both canvases mount the same
  slot, so a reframe on either moves both.
- **Each banner scales on its own** (`scaleBy.bn` / `scaleBy.bs`), and the rail names the
  rows by file width — **1880** and **758** — because a ratio cannot tell two 2:1s apart. The
  758's range goes to **150%**: at 100% of the 1880 design its smallest caps are about 7px,
  so on an email shown at 1:1 it is the one whose type needs to come up. Verified with a real
  drag: `scaleBy.bs` 100 -> 132, the 758's hero 85 -> 112.2, the 1880 untouched, the margins
  and `W` held.
- **No QR on a banner (`noQr`)**. A banner is clicked, not scanned, and the reference carries
  none. It is per SIZE, not the project's Visible/Hidden, because hiding the project's QR
  would take it off the Meta sizes too. Both the op (`!tk.noQr`) and the markup (the banner
  canvases have no `qrbox`) honour it. One token if a banner ever needs one.
- **Exports are the file's own pixel size** — `exportScale()` is `out[0] / W` for a size that
  declares `out` and 2 for everything else, so the Meta sizes still ship at 2x. **The names
  and folders are SUPERSEDED** — see *CAS EXPORTS INTO A FOLDER PER VARIANT*. The SVG states the
  file size in `width`/`height` and keeps canvas units in the `viewBox` (`built.out`, which
  only a size with `out` carries, so every other build returns exactly its old shape). The PDF
  takes both banners after the 16:9, rasterised at twice the FILE's size. `Assets/` gains
  `background-<variant>-banner`, and removing a variant shifts the `-bn` slot with the rest.
- The layout-guides download has a banner sheet (the 1880 grid, which is the 758's too), and
  the parked design-system sheet lists both with their file sizes.

## `recsOf(v)` — ONE LIST OF A VARIANT'S LAYOUT RECORDS

`[v, v.story, v.wideOv]` was written out in **six** places (forkPage, dropMod, copyMove, the
layout presets, the MERGED fold, the load) — exactly how a new size gets missed by one of
them. `CampaignStudio.OVK` (`['story', 'wideOv', 'banOv']`) and `recsOf(v)` are the list now,
and all six read it.

## A PRE-EXISTING PREVIEW BUG THE BANNER'S CENTRED LAYOUT EXPOSED

**On a CENTRED design, the spec icon row's labels were centred under their figures in the
editor while every export drew them flush left** — 75-115 canvas px apart, on the 1:1 and the
9:16 as well as the banner. The icon-row pass measured a left-aligned design. The op draws
both runs at the pair's own x (`ctr` false: figure and label share one left edge, the design
intent); in the preview the pair was a column flex, which stretched each run to the pair's
width, and the stack's `text-align: center` then centred the shorter one inside it.
`pairStyle` carries `alignItems: flex-start; textAlign: left` now. Measured after, on all
three: every run within **1.64 canvas px** on x and 0.2 on y.

## Verification

- **Op census against the pre-change build served alongside: 48 groups — 4 templates × dark
  and light × left and centre × 1:1, 9:16 and 16:9 — 668 ops, 48 byte-identical, 0 threw.**
- **Exports through the real `doExport`**, delivery redirected to a local sink: 1880 × 940 and
  758 × 380 in PNG and JPEG, the 1:1 still 2160 × 2160, the SVG `width="758" height="380"
  viewBox="0 0 1880 942.48…"`. A reference-like banner (centred hero, the icon row with
  Material glyphs, the co-brand lockup bottom centre, a photo) renders on both with the
  picture edge to edge.
- **Preview against ops on both banner canvases**: the wordmark, the icon row's figures and
  labels within 1.6 canvas px. The hero reads ~1.07% wide in the preview — identical on the
  1:1, 9:16 and banner, i.e. the Campaign residual the transform section already records
  ("83 of 83 within 1.6%"), not a banner effect.
- Detach, own photo (both canvases switch to the `-bn` slot and the rail's row appears), the
  selection label (`Master · Banner 758`) and Hide (it drops a banner selection, and both
  sizes leave `sizesFor`) all driven through the plate's own handlers. Hidden, `v.bn` / `v.bs`
  are `null` and nothing reads them — the plate's `sc-if` never renders its children.
- Sheet unchanged (one closing style tag, comments 331/331, CSS depth 0 — no CSS authored);
  markup `sc-if` / `sc-for` on the documented one-off baseline; no interpolated `d=` / `src=`;
  every new render key declared.
- **A trap re-confirmed while measuring:** with the co-brand partner on, the wordmark read
  **98 px** off its op after a reload and 0.04 once the pane composited — the partner's ink is
  measured in the rAF tick, which does not run while the pane is hidden. Screenshot first.

## Left as decisions, not applied

- **The 758 file's type.** At 100% it is the 1880 design at 40%: headline ~34px, the icon
  row's labels ~7px. Its own Scaling (to 150%) is the lever; a default above 100% would make
  the two files different designs by default.
- **Eventbrite's phone view** shows the 1880 file at 375 px wide, where only the headline
  reads. Nothing in the studio can fix that; fewer, bigger words can.
- **The placement preview has no Eventbrite mock** — it is Meta's feed, reels and story.
- **The Campaign phone editor** puts the 1880 banner at 1.18 × the 1:1's width, which runs
  past a phone's stage exactly as the 16:9 already does (recorded as unrefined).
- **The shared-photo reframe** is one crop on `adstudio-bg-<vi>` for every size that shares
  it — pre-existing for the 9:16 and 16:9, and the banner inherits it. "Own photo" is the
  way to frame a banner differently.

# CAS EXPORTS INTO A FOLDER PER VARIANT, AND EVERY EXPORT OVERWRITES THE LAST

By request (2026-09-28). A file is named for its JOB rather than its ratio, and the export is
organised into folders:

```
<Source folder>/
  Variant A/                                        ← the Master; B and C for more variants
    <name>_Variant A_feed.jpg                       ← 1:1
    <name>_Variant A_Story.jpg                      ← 9:16
    <name>_Variant A_16x9.jpg                       ← only while that variant shows its 16:9
    Eventbrite Banners/
      <name>_Variant A_EventBrite_Banner_wide.jpg   ← 1880 × 940
      <name>_Variant A_EventBrite_Banner_Small.jpg  ← 758 × 380
  <name>.adstudio.json   Assets/                    ← unchanged, at the root
```

- **The four names are spelled exactly as asked** — `feed`, `Story`, `EventBrite_Banner_wide`,
  `EventBrite_Banner_Small` — in `CampaignStudio.EXPORT_NAME`, which replaced the `SUFFIX` ratio
  table. **The 16:9 was not named** and keeps `16x9`, loose beside the feed and the Story.
- **The Master exports as Variant A**, Variant 2 as B, Variant 3 as C (`exportDir`). The plates
  still say Master / Variant 2 — "Master" means something in the editor (the layout the others
  copy and the 1:1 the other sizes mirror), so the letters are an export-side name only.
- **The variant is in the FILE name as well as the folder**, so a file dragged out of its folder
  into Ads Manager still says which design it is.
- **A carousel exports into ONE `Carousel` folder** (`<name>_page1_feed.jpg` …, banners in
  `Carousel/Eventbrite Banners/`), not a folder per page — the request described variants, and
  a carousel's pages are uploaded together. `exportDir` is the one line to change.
- **Every export overwrites the last without asking** (`deliver(files, name, { overwrite: true })`).
  It never DELETES: a file the export no longer writes — a variant since removed, a banner since
  hidden, the flat `_Master_1x1` files from before this change — is left in the folder.
- **Without a source folder the zip carries the same paths**, so it unpacks into the same layout.
  In the iOS app's share sheet the files go by their own names (a share sheet takes files, not a
  tree), which already say which variant and size each one is.
- **The PDF is unchanged** — one file, saved where you choose.
- The Share panel carries one line under the format picker saying where the files go
  (`exportLayoutNote`), and the dock's tooltip says the same.

## The shared-code change, and why OPS cannot move

`studio-base.js` gained two OPTIONAL arguments and nothing else: `writeProject(files, opt)` skips
the "Replace N files?" confirm — and the `exists` probe per file that fed it — when
`opt.overwrite`, and `deliver(files, name, opt)` passes it through. OPS calls both without an
`opt`, so its prompt is exactly what it was. The status line now names the folders the renders
went into (`— Variant A, Variant B`), read off the paths; a flat export has none, so OPS's
message is also unchanged. The folder API already created every level of a nested path
(`dirFor` walks the whole path), so no change to `runtime.js` was needed.

## Verification

- The real `doExport`, with delivery redirected, for a two-variant project with the Master's
  banner on: **the zip** holds `Variant A/…_feed.jpg`, `_Story.jpg`,
  `Variant A/Eventbrite Banners/…_wide.jpg`, `…_Small.jpg`, `Variant B/…_feed.jpg`, `_Story.jpg`;
  **a stand-in folder in which every file already existed** received all six renders plus the
  session and Assets with **zero confirms**; and **`writeProject` called without `opt`** — OPS's
  call shape — **still asked**.
- The class evaluated in JavaScriptCore prints the paths for all five sizes and both modes.
- Both files parse; `SUFFIX` has no reader left.

**Found and flagged, not changed:** at a **1024px** window the CAS top bar is **1145px** wide, so
Share sits off the right edge and its panel opens past the window. Pre-existing — this change
touches nothing in the bar — and it is the same class of defect *Top bar must fit* records at
1440 and 1280.

# CAS'S DESIGN COMPONENTS WERE REDRAWN: A MINOR-THIRD LADDER, S / M / L / XL, AND STYLE TILES

By request (2026-09-30): "some of them appear clunky in design, while others have variants that
look too similar… give me actual variants I can use with distinctive design features… test the
controls… keep the minor third (1.200)… give every design component S/M/L/XL." All of it is in
`Provident Campaign Studio.dc.html`; **OPS has no size system** — the request named CAS.

## ONE TYPE LADDER, AND EVERYTHING STANDS ON IT

`CampaignStudio.TYPE = [24, 28, 35, 41, 50, 59, 71, 85, 103, 123, 148, 177, 212]` — the minor third
from the 24px floor, in canvas px — and `typeAt(px, d)` steps whole rungs. Every run of type a
component draws is a rung. Two consequences a saved project will SEE:

- **The 16:9 takes the 1:1's steps** (and a `col` of 800): its wordmark went 38 -> 41 and its eyebrow
  22 -> 24, which also retires the recorded brass-caps AA failure on the light 16:9.
- **No label under the floor.** Spec labels were `eyebrow * .8` (19.2 on the 1:1, 22.4 on the 9:16);
  they are the eyebrow rung (24 / 28) now, and a three-column row on the 9:16 WRAPS its labels
  ("STARTING / PRICE") with a row height that reserves the second line.
- **Scaling is stepped.** The slider walks whole rungs inside each size's SCALE_RANGE (83 / 100 /
  120% on the 1:1; 58 / 69 / 83 / 100 on the 9:16). A saved off-rung value reads as the NEAREST
  rung in log space, so a saved 110% opens at 120%.

## S / M / L / XL — per design variant, one scalar through the whole component

`v.msize[id]` (`SIZES`, `SIZE_D` s -1 / m 0 / l 1 / xl 2), stored on the record the SELECTED
canvas reads, exactly like `mvar` — so a detached 9:16 can run an L headline while its 1:1 keeps
M; `withOv` merges a detached record's `mvar` and `msize` over the variant's.

- **`tkMod(tk, v, m)` is applied at exactly three entry points — `modPx`, `drawMod`, the preview's
  `mk` — and never below them**, or a size applies twice. M hands back the canvas's own `tk`
  object untouched, which is what keeps every M component byte-identical.
- Type moves by `typeAt(tk[key], d)`; everything that is NOT type — paddings, radii, rules, gaps,
  plates — scales by `tk.k = 1.2^d` (`kOf(tk)`), so the component grows as one object.
- **`eyeG` / `bodyG` are the geometry bases WITHOUT the floor**: an S eyebrow keeps its 24px type on
  the 1:1 but its frame still tightens.
- XL headlines are Light 300 (Jumbo's reason: past two rungs Regular reads as a slab).
- **A size steps the component's OWN M value, by a rung RATIO** (`step` in `tkMod`:
  `px * typeAt(px, d) / typeAt(px, 0)`), never by snapping to the ladder (2026-10-23). With
  Scaling at 100% every token is on a rung and this is `typeAt` exactly — bit-identical,
  checked over 7 canvases x S/L/XL. Below 100% the tokens sit BETWEEN rungs and under the 24
  floor (83% gives a 20px eyebrow), and the snap pushed S UP to 24 while M stayed at 20 — S
  bigger than M on eyebrow, body, list, tags, spec labels, steps, price and CTA. Verified
  after: 1,484 component x style x canvas x scaling cases, S <= M <= L <= XL in every one.
  **Still allowed to run backwards, by design:** a spec figure too wide for its column steps
  DOWN to fit, so a 3-column spec on the 9:16 can draw its XL figure smaller than its L.
- The three exceptions: the **graphic**'s size is a MODULE field (`m.gsize`, `GH` s 90 / m 150 /
  l 240 / xl 360) beside its corner-drag scale, and picking a size clears the drag everywhere
  (`gscale` / `gaspect`, module and detached records); the **spacer** is `m.h x K`; the **divider**'s
  size is its weight (`DIVW`: S a hairline at 45%, M the hairline, L 2px, XL 4px).

## THE VARIANT SETS — a variant earns its place by a SHAPE its neighbours lack

`CampaignStudio.VOPT` (a static now, read by the rail, the tiles and the copy view) and
`VDESC` (each style's one line of purpose, the tile's tooltip):

| component | styles |
|---|---|
| eyebrow | Plain caps · Rule-led · Framed · Filled · Status dot · Underlined |
| hero | Regular · Two-tone · Fade out · Glass card · Underscored |
| hook | Plain · Glass card · Bars · Quote |
| body | Plain · Corner note · Ruled · Boxed |
| list | Checks · Dots · Dashes · Ruled rows · Two columns |
| tags | Outline pill · Filled pill · Glass pill · Icon pill · Divided strip · Dotted strip |
| spec | Row · Ladder · Icon row · Glass row · Glass ladder |
| steps | Icon plates · Numbered plates · Timeline · Compact list |
| price | Plain · One line · Glass bar |
| cta | Filled pill · Outline pill · Soft rect · Pill + arrow · Text link |
| divider | Full rule · Short bar · Dotted · Fading · Ornament |

**A variant that differed from its neighbour only in COLOUR, STROKE WEIGHT or SIZE was retired**,
and `RETIRED` / `migrateStyles` (run from `normModList`) maps each onto the variant that kept its
shape plus the size or ink that carried the difference — on every layout record, detached ones
included. Verified on a hand-built legacy state:

| was | opens as |
|---|---|
| eyebrow `brass` | `plain` + `m.inkHex` #B0905C (the eyebrow's Ink is a MODULE field now) |
| hero `jumbo` | `plain` at XL |
| tags `gold` / `plain` · `m.jumbo` | `mist` / `rule` · XL on every record that had not chosen a size |
| list `ring` | `dot` |
| divider `line2` / `line4` / `soft` / `soft2` | `line` at L / XL / S / S |
| graphic `s` / `m` / `l` (per-variant heights) | `plain` + `m.gsize` |

**The mixed case it cannot keep:** Ink is a module field, so brass on the Master and plain on
Variant 2 comes out brass on both.

Visual fixes found by rendering every variant on sheets:

- **The hook's quote mark is sized by its INK.** A curly quote's ink is ~.19em tall, so at four rungs
  up it drew smaller than a capital of the line under it. It is eight rungs up now (148 on a 35
  hook) and placed by `quoteInk()` — the glyph's measured ascent, bottom and left bearing, cached per
  face once the fonts have loaded — so its ink starts on the column edge and sits a quarter-em above
  the copy.
- **Bars** are 1.3em tall with .16em between them (both through `leadOf`, so an Arabic line's taller
  ink still sits inside its bar), the baseline centred the way a CSS line box centres it.
- **Two-tone** (`split`) takes the muted ink on every line after the first (`splitInk`) — weight alone
  (400 against 300) was too quiet to read as a choice beside Regular. A picked line colour wins.
- **Short bar** is three hairlines thick, **Fading** holds full strength across its middle third (a
  1px ramp peaking at one point averaged to half a hairline), and **Ornament**'s dot is 10px with 1.8
  dots of air either side.
- **Step labels carry no number** under Icon and Numbered plates — the plate already printed it.

## THE RAIL: style TILES, a SIZE row, an eyebrow INK

- **Style tiles are real renders** (`vtKey` / `vtSync` / `vtRender`, driven from the shell like the
  copy preview): the selected component, its own copy and size, in every one of its variants, by the
  export's `buildOps`, over the variant's own photo. ONE crop window — the union of the variants'
  ink, padded, widened to 2:1 — so the tiles compare at one scale. Dividers render at XL in their
  tiles (at M a hairline is a quarter of a tile pixel), and an EMPTY icon slot shows a generic mark
  in the tile only. The selected tile is a RING, for the colour swatch's reason. Hidden for the
  single-style spacer and graphic.
- **Size** is a four-up `.p-tabs` row; its tip is per type. **Ink** (eyebrow) is the icon colour's
  shape — swatches plus hex — and its clear swatch paints the label's OWN default ink.
- The tags' Regular / Jumbo pair is gone (the keys remain, unread).

## THE EDITOR NOW MATCHES THE EXPORT TO ~2 CANVAS PX — and the biggest cause was chrome typography

A probe over every component x style x S/M/L/XL x left/centre x 1:1 and 9:16 (text runs against
their ops, and each component's box against what `modPx` reserves):

| | before | after |
|---|---|---|
| eyebrow | 3.1-5.3 (the ".1em first line"), and a wrap mismatch at L/XL on the 9:16 | **1.3** |
| hero | 3.4-6 centred, **14** on an XL glass card | **1.0** |
| hook / body | 2.2-2.7, glass hook .1em short | **1.9 / 0.9** |
| tags | a whole ROW (267px) on a centred 9:16 | **1.7** |
| list · spec · steps · price · cta | — | 1.4 · 1.5 · 2.3 · 1.0 · 1.9 |

Every component's box within **0.3** of its reservation (the divider's larger box is its
layout-neutral hit padding).

- **THE CANVAS PREVIEW INHERITED `font-feature-settings: "ss01","cv01"` from the shell** — the
  Prov Toys re-skin's chrome typography. The editor drew the stylistic-alternate letterforms and
  set every line **0.9-1.1% wider** than the export, which a canvas cannot give those features at
  all. That WAS the "~1% DOM width" residual this file records for Campaign ("83 of 83 within
  1.6%") and not for Organic, which never set the features. `canvasStyle` resets
  `fontFeatureSettings`, `fontVariantNumeric` and `letterSpacing` at the canvas root. **The
  artwork takes no chrome typography.**
- **The eyebrow previews from the export's own lines** (pre-broken, `white-space: pre`) and gives the
  first line's surplus back as a negative margin, so the ".1em first line" residual is gone from
  the preview without moving a saved export.
- **The glass hook reserves `GLASS_RES` (2.4) where it draws 2.3** — kept, named, and the preview pill
  carries the same slack below it; both glass cards take the op's own width, and are column flexes
  so a single word too wide for the card overflows EVENLY as the op centres it.
- **Hook and body lines are lifted** by `base0 - (lead + a - d)/2` — the price block's fix.
- **Chip rows, icon chips and strips take the op's rows** (`FLEX_BREAK`: a full-width zero-height
  item between rows, the row gap moved onto later rows' top margin, a hair of slack). The demo copy
  filled a 9:16 row to within 0.1% — 740.7 against 740 in the op, 740.06 against 740.02 in CSS —
  and the two surfaces broke it differently. **A preview must be told where lines end; it must not
  re-wrap.**
- **Two hover survivors of the no-stroke pass**: `.p-tabs button[data-on]:hover` (0,3,1) and
  `.p-btn:hover:not(:disabled)` (0,3,0) outrank the plain `box-shadow:none` forms, so hovering a
  selected tab or a primary put the ring back. Fixed in CAS and in `web-image-studio.html`; the kit
  and OPS were already clean. Found by sweeping PARSED rules for a `[data-on]`/`:hover` state with
  a shadow, not by reading selectors.

**Probe notes:** a pre-broken text node returns a ZERO-WIDTH client rect for each newline (filter
`width > .5` or every later line pairs with the wrong rect); a component wrap is the one whose
`.modhandle` is not `display:none` (the flex spacer has one too); and a knife-edge wrap is a
content fact, so test with copy that fills its column.

## Verification

- **Template census against HEAD: 24 groups, all 24 differ, and every difference is one of the
  above** — the 16:9 on the ladder, spec labels to the floor (and the stacks below them), the spec
  row's column rules .5px at .55 -> 1px at .45 (`ruleSoft`, the ladder's own), and the Outline pill
  taking the stronger `chipGold` stroke (the retired `gold` pill's). 336 -> 340 ops: the wrapped
  9:16 labels.
- Real clicks on tiles, the size row and the ink swatches; a detached 9:16's tiles and size read
  and write ITS record; carousel labels read "this page only"; the graphic's drag shows no size and
  a pick clears it; an XL spacer is 1.44x.
- **Rail contrast, both themes reloaded into, animations finished, ancestor opacity composited: 0
  failures** with the tiles, size row and ink on screen. Console: only Chrome's own beforeunload
  notice.
- One closing style tag, comments 334/334, brace depth 0, `sc-if` / `sc-for` +2/+2 on the documented
  baseline, no interpolated `d=` / `src=`; every new render key resolves.

## Left as decisions

- An XL eyebrow on the 9:16 can widow its last word ("NOW SELLING · BUSINESS / BAY"); the listed
  card's widow rule is the model if it matters.
- On the LIGHT palette an Outline pill or Text link over a dark photograph is faint — that palette
  assumes a light photograph.
- A REPLACED icon keeps its old tile until something else re-keys it (the key reads fill flags).

# CAS RECREATES A COMPONENT FROM A SCREENSHOT — `type: 'cust'`, via the /cas-component skill

By request (2026-09-30, reshaped 2026-10-01): drop a screenshot and get back a new design
component built to the brand, with its own text fields, icons, layout controls and style
variants. It can be added to the canvas temporarily or saved to the library.

**THE READER IS CLAUDE CODE, NOT A SERVICE.** A first build had an in-studio window plus a
loopback service calling the Anthropic API with a key from the environment. The user chose
instead to use their existing Claude Code session, so the window, its button and
`tools/importer/` are DELETED. What is left:

| piece | where |
|---|---|
| the skill | `.claude/skills/cas-component/` — `SKILL.md` (the grammar, brand rules, a worked example), `scripts/catalog.py` (prints VOPT + VDESC read live off the CAS file, so the model builds from the existing components), `scripts/check.py` (the strict twin of `custSan`: REPORTS what the studio would silently drop, then saves `custom-components/<slug>.json` — git-ignored, it carries campaign copy — and `pbcopy`s it) |
| the intake | `custPasteBind()`, bound from the shell's `_vtTick`: a CAPTURE-phase document paste listener. Text that parses as `{"provident":"cas-component","spec":…}` while the editor is on screen becomes a component; anything else passes through untouched, and a focused field never receives the JSON |
| the gate | `CampaignStudio.custSan` — the ONE gate for any spec (paste, session file, library) |
| the layout | `custLayout(m, mv, tk, iw, pal, center)` → `{h, els}`, read by modPx, drawMod, the preview (`mk`) and the style tiles |
| the library | `localStorage['adstudio-custom-lib']`; `custPalette(state)` adds any spec a project carries. The palette's Custom group lists it, with a one-line pointer to the skill |

**⌘V adds TEMPORARILY** — this project only, not the library. The rail's **Save to library**
keeps it. `custKeep` replaces by spec `id`, so re-pasting an edited spec with the same id updates
the library entry rather than duplicating it.

**THE SPEC TRAVELS ON THE MODULE (`m.spec`)**, not by reference to the library — so a session
file carries it, a forked carousel page clones it, and `modPx` (never handed the state) has it.

**The spec is structure and ROLES, never pixels or colours.** A text node names a role (eyebrow /
body / cta / hook / stat / headline / hero) — its size is that role's token, so it sits on the
minor-third ladder and S / M / L / XL steps it through `tkMod`; its weight follows the brand rule
(caps 500, headline / hero / stat Regular, the rest Light). Colours are PAL roles. All space is
in units of `bodyG`. Grammar: `stack` (col/row, gap, pad, align, justify, hug, fill
glass/solid/label/brass/tint, stroke rule/chip/strong/brass, radius or pill), `text`, `icon`
(slot 0–5), `dot`, `rule`, `vrule`.

**Controls on a selected one:** style tiles (real renders), Size, **Align** (`m.align`), one field
per part with **Hide / Show** (`m.off[key]` — a hidden part takes no space), Icon colours
(`m.icoOrig`) and the icon picker per slot. Icon hints are Material Symbols names; `name:fill`
takes the FILL-1 cut (`custIconUrl`) — the weight-200 outline all but vanishes at badge size.
Hints land in the slots through `ImageSlot.putUrl`, mounted or not.

**Every per-type table had to learn the new type** — the trap for the next one. `labels[m.type][0]`
crashed renderVals; it is `labOf(m)` / `textOf(m)`. `VOPT` / `VDESC` readers go through
`voptOf(m)` / `vdescOf(m)`. The copy view's `COPY_TYPES` does NOT include it — a known gap.

## Verification

- `check.py` refuses a bad spec (bad field key, unknown node, a field no variant draws) and
  passes the worked example; `catalog.py` prints all eleven components' styles off the live file.
- The paste with the checker's exact output: added, selected, library untouched; a focused text
  field stays unchanged; a plain-text paste is not eaten. The Browser pane's automated ⌘V does
  NOT reach the system clipboard, so the paste was driven as a ClipboardEvent carrying the file.
- From the first build, still true: preview against ops within 0.15 canvas px across 3 styles ×
  S/M/L/XL × left/centre × 1:1 and 9:16 (four XL cases read 3.8–5.2 because the WHOLE overflowing
  bottom cluster moves together, headline included); SVG export valid; contrast 0 failures in
  both themes; existing templates unchanged by construction.

# THE META PLATE'S 16:9 IS THE YT DEMAND GEN 1.91:1, AND THE SIZE ROWS ARE ICON BUTTONS

By request (2026-10-12), four changes to `Provident Campaign Studio.dc.html`:

- **`PXT.ls` is a 1.91:1 now** — 1920 × 1004.8, `out: [1200, 628]` — labelled **YT Demand Gen**
  on the plate. The key stayed `ls`, so every Meta record (`wide`, `wideOv`, `bgSep.ls`,
  `scaleBy.ls`, slot `adstudio-bg-<vi>-ls`) carries over and nothing migrates. `exportPath`
  sends it to `YT Demand Gen/Variant X/<name>_Variant X_Landscape_1.91x1` — the YouTube name and
  folder, so Ad sets finds it under YouTube — and it is left out of the `_Meta upload.json`
  manifest. A saved 16:9 re-lays at the new height; nothing else moves (no buildOps line edited).
- **Neither 1.91:1 (`ls`, `yl`) has a `col` any more.** The 800 text column crammed the copy into
  the left of a 1920 canvas; it flows across the full width now, and the scrim is the 1:1's
  vertical bands rather than a sideways wash. The banners keep their column (`BANNER_TK`).
- **The splash's YouTube Demand Gen templates row is deleted**; the one row is "Pre loaded
  templates" again. A YouTube project is made by switching Platform in All Variants Option.
  `ytTplCards` / `cardMiniYt` are still computed and unread.
- **Every size row is `.p-szh`** (section 31 of the sheet): name, ratio chip, and icon buttons
  `.p-szb` — link (`link` / `link_off`), picture (`image`), eye (`visibility` /
  `visibility_off`), Material Rounded wght300 inline SVG. Two glyphs per toggle button, swapped
  by `[data-on]` in CSS, because a `d="{{ }}"` cannot be interpolated. The eye never fills when
  on; a hidden row carries `data-off` and dims. Every sentence that sat beside or under a canvas
  is the button's `title` now (`*LinkTip`, `*Tip`, built in one spread inside `variantViews`);
  captions are just the pixel size and the copy chip. The old `*Label` / `wideBtnStyle` keys
  are unread. Verified: export at 1200 × 628 into `YT Demand Gen/`, each button toggles its
  record, 0 contrast failures in both themes, top bar fits at 1440.

**THE EVENTBRITE BANNERS TOOK THE SAME LAYOUT (2026-10-12, by request):** `BANNER_TK` lost its
`col: 800`, so both banners (`bn`, `bs`) flow their copy across the full width with the 1:1's
vertical scrim bands, exactly as the YT Demand Gen 1.91:1 does. Their tokens are otherwise the
1.91:1's. A saved banner re-lays its copy; no ops line was edited.

# THE PLACEMENT PREVIEW SHOWS THE REAL APPS' LAYOUTS (2026-10-12)

By request ("use actual UI of Instagram/Facebook, feed/reel/story… make it accurate"). The
wireframe chrome in CAS's Preview overlay was rebuilt to the live iOS apps in dark mode —
Instagram's 2025 nav (+ / wordmark / heart; Home · Reels · Messages · Search · Profile), counts
beside the actions, the CTA row under the media; Facebook's wordmark and round actions, labelled
tab bar, link card, reactions, Like / Comment / Share; both apps' story headers, CTA and Send
message bar; Facebook Reels with its own header, counted rail and bottom-anchored CTA (Instagram
Reels keeps the supplied mock's vectors and adds counts and Follow).

- **The bug that read as "broken": `.mk-screen` inked its chrome with `--ps-accent-i`, which is
  the NAVY in light mode** — navy on black — and the overlay bar's title was `#fff` on a white
  bar. The screen is a pinned surface and now takes pinned ink only; the bar follows the theme.
- **Icons are drawn in the file (24-unit `.mk-i` SVGs), no Meta logo art**; app names are text in
  the system face (`-apple-system`), which is what the apps' UI uses. `.mk-g` stays: it is the
  icon primitive the rest of the app uses.
- **`mockCopy` prints the project's Meta ad text** (primary text, headline, description, CTA,
  link domain from `mtOf`) where it is written, the creative's words otherwise; handle
  `providentestate`, page "Provident Real Estate".
- New render keys `mkPlatKey` / `mkViewKey` / `mkStoryName`. The 1.91:1 label in
  `mkPlaceLabel`. Artwork untouched — no ops line edited; the export path is unchanged.

# THE ALL-VARIANTS DOCK HAS THREE NEW CONTROL TYPES (2026-10-14)

By request ("improve the UI and UX of this, introduce new type of buttons"), CAS only, section 32 of
its sheet. Each control takes the shape of its question instead of every decision being a pill pair:

- **Choice cards `.p-rc`** (in a `.p-rcs` grid, `role="radio"`) for Platform and Format — an icon of
  the canvases it produces, a name, one fact, a tick on the chosen one. Selected is the
  `--ps-accent` fill with NO stroke; unselected is a `--ps-line` inset ring.
- **Switch rows `.p-tgl`** (`role="switch"`, `aria-checked` a `'true'`/`'false'` string) for QR code,
  Story 9:16 and Collaboration logo. The whole row is the button and the line under the name is the
  live state. The collaboration logo is `.p-tgl-d` — a div with a standalone `button.p-tgl-s`,
  because its title carries the `i` tip and a tip inside a toggle button would toggle on click.
  New `storyToggle`; `qrToggle` / `coToggle` were already there.
- **Action rows `.p-arow`** for the two buttons that open the Publish tab.
- The YouTube logo's Ground tabs carry colour dots (`.p-dotc`); Add Variant carries a +, and the
  count `1/3` (`varCount`, dimmed at the cap via `data-max`); the options pill is "All variants" /
  "All pages" with a tune icon and a caret that turns while open (`allVarsAria` lives in the SHELL —
  `allVarsOpen` is shell state).
- **The tick, the switch's ON track and the action icon are MARKS, so they take `--ps-link`.** Navy
  on the dark card is 1.25:1; measured after: switch 5.91:1 and tick 4.54:1 in dark.
- The Platform and Format hints were trimmed to what the cards do not say, and the Format hint's
  stale export names (`Name_Master_1x1`) now name the Variant / Carousel folders.

Verified in the pane with real clicks and synthetic ones: every card and switch flips state and its
`aria-checked`; contrast over the open dock 0 failures in both themes. No artwork line changed.

**The Platform cards were REMOVED from the dock the same day, by request ("dont need anymore").**
The group's markup is gone; `platMeta` / `platYt` / `platHint` / `platMetaAria` / `platYtAria` are
still computed and unread. **With the splash's YouTube row already deleted, the app has no control
that makes a YouTube Demand Gen project** — only a saved YouTube session or the MCP's `set_platform`.
Everything a YouTube project shows is unchanged.

**The placement preview's phone has Light | Dark (2026-10-14).** A pair in the preview bar sets
`state.mockMode` on the SHELL (default `'dark'`) -> `data-mode` on `.mk-screen`. Section 33 of the
sheet re-inks only `[data-view="feed"]` for both apps' light themes; Reels and Stories stay dark,
because both apps keep them dark. Chrome only — the creative is the same render.

# THE RIGHT RAILS WERE TIDIED: FOLDING SECTIONS, COMPACT SEGMENTS, A STYLE STRIP (2026-10-14)

By request ("improve the UI and UX of this side bar, new types of buttons and interactions, hide
clutter"), CAS's component rail and Layout rail, section 34 of the sheet. Chrome only — the
whole-file diff carries no artwork line.

- **Folding sections are native `<details data-acc>`, UNCONTROLLED.** React never sets `open`, so a
  re-render cannot snap one shut. `Component.accBind()` (called first thing in `_vtTick`, i.e. on
  every shell mount and update) restores each one ONCE (`_accInit`) from `localStorage['adstudio-acc']`
  — per computer — and a capture-phase `toggle` listener (toggle does not bubble) writes it back.
  `data-def="1"` opens by default (Background image). Folding: Scaling (`scaleSummary` — "All 100%"
  / "Adjusted"), Vertical spacing (`gapName`), Scrim (a swatch + `scrimSummary`), Background image
  (`bgSummary`), Hidden components (`hiddenSummary`). A closed section shows its value; an open
  one hides it, since the controls say it.
- **Background and Alignment are `.p-opts-seg`** — the same `.p-opt` markup restyled to one 44px
  track with the icon beside the name. Logo and Layout preset are `.p-opts-sm` (42px tiles).
- **Style previews are back in the two-up `.p-vts` grid (2026-10-15, by request)** — every
  style in one view, no sideways scroll. The `.p-vts-strip` CSS and `accBind`'s scroll-into-view
  are left matching nothing.
- **Colour pickers are `.p-colr`**: swatches and the hex field in one row (eyebrow ink, hero line,
  icon colour, scrim); the duplicate chip beside the hex is hidden.
- **The hero's line picker only shows with 2+ lines** (`heroLineMany`), as `.p-tabs` "Line 1 / Line 2".
- **`.p-rst`** replaces the ↺ text resets (Scaling rows, Space above) and is `visibility:hidden` at the
  default (`sc.defOn`, `selGapDefOn`). `resetStyle` / `selGapResetStyle` are still computed, unread.
- The Space-above hint became the start of its tip; an empty drop's first caption ("Drop a picture,
  or click to choose") is hidden in the rails because the placeholder already says it.

Verified: contrast over both rails with every section open, transitions finished — 0 failures in
light (80 runs) and dark (84). Real clicks open and close sections.

# THE PALETTE RAIL FOLDS INTO FOUR GROUPS (2026-10-14)

By request ("refine this as well"), CAS's left Design Components rail, section 35 of the sheet.
Chrome only — no artwork line changed.

- **Four groups, not eight**: Text (eyebrow, hero, hook, body) · Data (price, spec, tags, list,
  steps) · Action & media (cta, graphic) · Structure (divider, spacer). Five of the eight held one
  card, so the rail was mostly outlines around single items.
- **Each group is a `<details class="p-grp-w p-pal-g" data-acc="pal-<name>" data-def="1">`**,
  so `accBind` folds and remembers it like the right rails. A closed group's summary lists its
  cards (`cat.names`); an open one hides that line.
- **The descriptor left the card** — it truncated beside the name ("checks / dots / ro…"). It is
  the start of the card's tooltip (`addTip`). The name row carries a **`.p-tile-k` "N in use"**
  chip when that component is on the active variant/page, and the **+** is visible at rest (a
  `--ps-line` ring) and fills navy on hover or focus.
- **`.p-tile-k` needs `.p-tile-n .p-tile-k`**: `.p-tile-n s` (0,1,1) out-ranked the bare class
  and inked the chip `--ps-dim`, 4.36:1 in dark. Do NOT put `data-on` on a palette tile: the
  no-stroke pass fills `.p-tile[data-on]` with the accent.

Verified: real clicks add (the Body card gained "1 in use"), a group folds and its key lands in
`adstudio-acc`; contrast over the rail 0 failures in both themes, no horizontal overflow.

# CAS EXPORTS FLAT INTO EACH VARIANT FOLDER (2026-10-15, by request)

"Remove the foldering, so have the image exported on the variant folder." `exportPath` is now
`<Variant X | Carousel>/<name>_<who>_<job>.<ext>` for every size — no `Eventbrite Banners/`
subfolder and no `YT Demand Gen/` prefix, for the Meta plate's 1.91:1 and for a YouTube project
alike. The YouTube logo and text file sit at the root (`<name>_Logo_1x1.png`,
`<name>_Demand Gen text.txt`) beside the session file. File names are unchanged, so each still
says which job it is. `YT_DIR` / `BANNER_DIR` stay declared: Ad sets still reads a `YT Demand Gen/`
folder an older export left behind. This supersedes the folder trees in *CAS EXPORTS INTO A
FOLDER PER VARIANT* and *YouTube exports go in `YT Demand Gen/`*. Verified through the real
`doExport` for Meta (feed, Story, 1.91:1, both banners, two variants) and YouTube.

# A DETACHED SIZE KEEPS ITS LAYOUT AND CHOOSES ITS OWN ALIGNMENT (2026-10-15)

By request. Pressing a size row's link button ("Edit separately") made the layout jump: the new
record copied the clusters alone, so a variant's own `ord` and any floating graphic (`gfloat` /
`gpos`) were lost. `CampaignStudio.detachRec(vv)` builds the record for all five toggles
(story / wideOv / banOv / ylOv / ypOv) and copies clusters, ord, gfloat and gpos. Verified: the
9:16's ops identical before and after detaching a project with a reversed `ord`.

- **`withOv` overlays `eff.align`** when a detached record sets one; unset, the size follows the
  variant. Every renderer path (buildOps, mkCanvas, scrimStops) reads the merged `v`.
- **The size row gains an align button** (`.p-szb-al`, section 36) only while detached
  (`<k>AlOn` / `<k>AlCtr` / `<k>AlTip` / `<k>AlFlip`); it shows the alignment and never fills.
- **The rail's Alignment writes the selected canvas's record** when that size is detached
  (`setSelTarget`) and says *this size only* (`alignScope`). The style tiles' key reads
  `eff.align`. Verified: flipping the 9:16 changes its ops and leaves the 1:1's identical.

# META HAS A PORTRAIT 3:4 (2026-10-15)

By request: a new Meta size, key **`pt`**, 1080 × 1440 with the 1:1's own tokens, exported at
2x (2160 × 2880) as `<name>_<Variant>_Portrait_3x4` into the variant's folder. **Shown by
default on every Meta plate** — `v.ptOn` (since 2026-10-26: missing = shown, see *PORTRAIT FIX WAS DELETED*) is what the row's eye toggles, so
existing Meta projects gain the file on their next export. It has the 16:9's three controls
(`ptOv` in `OVK` / `sizeOv`, `bgSep.pt` with slot `adstudio-bg-<vi>-pt`, its own Scaling row and
alignment button), sits under the 1:1 at `dispW * .75`, and is skipped on YouTube. Ad sets
reads `portrait_3x4` as a Meta main tile; `cas-to-meta.py` accepts 3:4. Verified: sizes
`sq, pt, st`, the export writes three files, detach / own photo / hide all work.

# ARABIC MIRRORS THE WHOLE AD (2026-10-15)

> **THE PHOTO IS NOT FLIPPED ANY MORE, by request the same day** — a reflected photo shows any
> sign or logo in it backwards. `mirrorOps` skips `isBg` / `isFg` ops entirely and `mkCanvas`
> keeps `bgWrapStyle` / `fgStyle` / `fgTintStyle` out of `mirView`, so the photo and its cut-out
> stay exactly where the Latin layout puts them. The renderers' `flipX` support is kept and
> emitted by nothing. Everything below about the photo flipping is history.

By request: in Arabic a left-aligned CAS design reads from the RIGHT, the photograph flips,
the QR moves to the other corner without its pixels flipping, and RTL order holds everywhere.
`CampaignStudio.mirrored()` is `isArabic()`; a centred design stays centred but still mirrors
(photo, QR, list order) — one rule for every Arabic ad. `v.align` is never changed, so
switching back to English restores the layout.

**The layout is computed in the Latin frame and then reflected, so editor and export cannot
disagree.** The export: `buildOps` ends in `mirrorOps(built)` — every op's box reflected about
the canvas centre (a text op by its `meas()` width, trailing tracking unit included, which is
the box a DOM run takes); horizontal grads and `vec` reversed; only the background photo
(`isBg`) and the overlap cut-out (`isFg`) take `flipX`, which both renderers draw (canvas:
a reflect about the op's own box inside the clip; SVG: `matrix(-1 0 0 1 2x+w 0)` on the image,
its clip moved to a wrapping `<g>`, because a clip-path on a transformed element is read in
the transformed space). The editor: `mkCanvas`'s output goes through `mirView` —
`direction: rtl` on the frame (mirrors flex order, flex-start/end and unset text-align by
inheritance) plus `mirStyle` on every `*Style` / `style` object, swapping each PHYSICAL
property (left/right, margin/padding/border sides, 4-value shorthands, text-align, an inset
shadow's x, `to left/right`, a translate's x). The canvas box itself is excluded; the photo
wrapper and cut-out get `scaleX(-1)`.

- **`listRtl()` is false** — reversing a list as well as mirroring the page would undo it.
- **An unset side must not overwrite the swapped one**: `mirStyle` drops null values, because
  `{marginLeft: x, marginRight: undefined}` swapped in key order lost x. That cost the 9:16
  its rail clearance until caught.
- **The Reels rail stays on the RIGHT of the screen**, so in the Latin pre-image `railBox`
  reserves it on the LEFT, the QR's corner is chosen in the pre-image with the rail clearance
  on the side that will be right, and the preview gives a left-aligned bottom item a
  `marginLeft` of `railG.x0 - pL`.
- **Canvas gestures run backwards in the mirrored frame**: the floating graphic's move and
  corner scale multiply the pointer delta by `mirS`.
- **The co-brand partner mark is reflected by its INK box, not its file box** (`inkX` / `inkW`
  on the op; `coImgStyle` / `coPaintStyle` are kept out of `mirView`). A padded brand sheet is
  drawn as its whole file, and reflecting that box unflipped put the ink on top of
  "provident." in both surfaces. The lockup's `textAlign: 'left'` is explicit for the same
  reason any mirrored run needs one: unset, `unicode-bidi: plaintext` resolves "start" from
  the text, so Latin "provident." stayed left in an Arabic lockup box.
- **The wordmark moves right with the copy** — "never right" is an LTR rule; leaving it left
  would put it under the mirrored QR. The co-brand lockup reads partner | provident.
- **`arGap(up, lo)`** (.26 of the upper run + .27 of the lower, zero in Latin) is the air two
  runs stacked by a fixed baseline step need in Arabic. The price block's label touched its
  figure; ops, modPx and the preview's flex gap all add it.
- **A spec figure wider than its column steps down the TYPE ladder** (all figures together,
  floor at the label's rung, first column without the indent). This one moves Latin: the
  Event template's 9:16 "Dubai World Trade Centre" spilled 86px into the Reels rail and now
  sets at 28px. Op census against the pre-change build: 96 groups (4 templates x dark/light x
  left/centre x six sizes), 92 byte-identical, the 4 that differ are exactly that.

Verified with a probe that matches every DOM text run to its op (left or right edge) and
checks ink overlaps: every component type x every style x left/centre x all six Meta sizes in
Arabic — preview against export worst **0.58 canvas px**, no overlaps, no copy off the canvas
except a three-row spec ladder plus headline on the 940-tall banners, which Arabic's taller
type pushes past the bottom (Latin fits); the coverage chip flags it. The SVG export carries
the flip. **Not exercised with a real pointer**: the mirrored graphic drag.

**The wordmark's corner goes the same way (2026-10-15, by request):** `withOv` also overlays
`eff.logoPos` / `eff.logoAlign`, and the rail's Logo tiles read and write the selected canvas's
record while that size is detached (`logoScope` reads *this size only · never right*). Verified:
Bottom Center on a detached 9:16 moved its wordmark only; the 1:1 stayed top left; re-linking
restores the variant's.

**A CLICK ON A CANVAS PICKS THE SIZE THE LAYOUT RAIL EDITS (2026-10-15, fix).** The logo control
above was reported as not working: it only reached a separated size while a COMPONENT on that
canvas was selected, and clicking the canvas cleared the selection. Each canvas now has its own
`select` (mkCanvas), which sets `state.focusSz`; `selSz` is `sel.size` when a component is
selected and `focusSz` otherwise, read by `selEff` and `setSelTarget`. `focusSz` is stripped
(not a design change). Only the focused canvas carries the ring, and the Layout head reads
*Master · 9:16 (own layout)*. Verified with real clicks: click the 9:16, Bottom Center -> its
wordmark moved (preview and ops), the 1:1 and the variant stayed top left.

**THE HOME PAGE'S AD SETS PANEL READS AS A VIEWER (2026-10-16, by request — people mistook it for
Open Session).** Section 38 of CAS's sheet: `.as-home` is a titled card (grid icon, **Ad sets viewer**,
a line saying it is for finished exports and that Open Session is for designing, an *Exported ads*
tag, an **Open viewer** button = `asOpen`). The drop zone (both copies) shows three skeleton ad
shapes (`.as-src-pv`) instead of an upload arrow and reads *Drop an exported campaign folder to view
its ads*; the Drive button is a ghost **View ads**, no longer a navy **Open**. Open Session carries a
title saying it opens a project to keep designing. Not called "view only": Edit text writes back.
Chrome only. Verified both themes (all panel text ≥ 8.4:1 dark), no overflow at 390.
**The drop zone's border is an animated hairline (section 39, 2026-10-16, by request):** a 1px
`--ps-line` ring plus a `::before` conic gradient (`--ps-link` into `--ps-ink`) masked to a 1px ring,
its angle a registered `@property --as-hl` animated round in 5s, 1.8s on hover / focus / drag.
Hidden under `prefers-reduced-motion`. Replaces the dashed outline in both copies of the panel.
To verify in the pane, set the animation's `currentTime` — the pane's timeline is frozen.

**THE FLOATING COMPONENT CONTROL WAS REFRESHED, AND IT HAS NOTION'S "TURN INTO" (section 40,
2026-10-16, by request).** `.p-selctl` is a card-surface pill with Material Rounded icons beside
their words (move up / down are icon-only), the resting tint for Top/Bottom, a red Delete, and a
first button naming the component (`turnName`) that opens `.sc-menu`: the `COPY_ADD` groups, each
row a short specimen (`TS` in renderVals) + name + descriptor, a tick on the current kind.
`CampaignStudio.turnInto(x, vi, id, type)` keeps the id (so clusters, order, hidden, gapB stay),
carries the words line by line (`turnLines`; price sub/figure, chips, spec rows), falls back to
`COPY_BLANK` when nothing carries, and deletes `mvar[id]` / `msize[id]` on every record. Word
types only (`COPY_TYPES`). `_turnOpen` is instance state; one document pointerdown/Escape pair
closes it; the rAF tick sets `data-flip` to open it upward when the stage lacks room below.
Verified with real clicks; every text run in the bar and menu ≥ 4.5:1 in both themes. A probe
note: after a conversion the control MOVES (the component's height changed) — re-measure before
a real click, or you click the canvas and select a different component.

**EVERY MATERIAL SYMBOL IS SEARCHABLE (2026-10-16, by request).** `ICONS_ALL` in both
`CampaignStudio` and `OrganicStudio` is all 3,929 Material Symbols Outlined names from
`fonts.google.com/metadata/icons` (curl reads it; a browser cannot — no CORS), popularity order,
one space-joined string (~52KB per document). `ICONS` stays the curated set shown before anything
is typed and leads each tier of `iconSearch` (exact, prefix, substring).

**KEYWORDS TOO: `icon-tags.js` (shared, loaded in both `<head>`s after `studio-base.js`).** Google's
own tags as an inverted index — 6,659 words, positions into `ICONS_ALL`, base36 delta-encoded,
**270KB** (a plain dump is 1.1MB). A word already in the icon's own name is left out. After the
three name tiers `iconSearch` appends `providentIconTags.find(q)`: every query word must match a
tag, an exact tag first, then tags it starts ("hous" finds house), popularity order kept. Decoded
on first search (~30ms), then under 1ms a keystroke. **The positions index ICONS_ALL, so the
three must be regenerated together** — same filter, same order. 40 random names checked to resolve at wght200. To refresh: re-fetch the metadata, filter
out icons whose `unsupported_families` holds "Material Symbols Outlined", sort by popularity.

**THE AD SETS DROP ZONE CARRIES HAIRLINE'S "EXPLODED" FIGURE (section 41, 2026-10-16, by request).**
`vendor/hairline/hairline.js` is `@lucasmarkes/hairline` 0.5.1's `dist/index.js` (MIT, no
dependencies, LICENSE beside it) wrapped as a CLASSIC script — an ES module is refused over
file:// — with its export list turned into `window.providentHairline`. CAS loads it in `<head>`
after `icon-tags.js`. The markup gives an EMPTY `<span class="as-src-hl" data-hl="exploded">` in
both drop-zone copies (it replaced the three skeleton shapes); `Component.hlBind()`, first in
`_vtTick`, mounts each new span with `{play:true, intensity:.6}` and destroys a figure whose span
left the page. Never put children in that span — React would reconcile what the figure drew. The
figure's six `--hairline-*` properties are mapped to chrome tokens; the plate is the drop zone's
own fill (`--ps-fill`, `--ps-fill-h` on hover, `--ps-accent` while dragging). 220px wide, 160 on a
phone. **The figure draws off-centre in its own 400x320 frame** (ink x 70..290, y 147..285), so it is
shifted `translateX(5%)` and its empty frame taken back with margins written off `--hlw` — a percent
margin would resolve against the drop zone's width. Measured: ink centre on the drop zone's to 0.00px,
18px above it against 16 below the text. To update: re-fetch `https://unpkg.com/@lucasmarkes/hairline@<ver>/dist/index.js` and wrap
it the same way.

# CAS'S BUILT-IN COMPONENTS ARE THE FIGMA "DESIGN COMPONENTS" PAGE, AND THE PREVIEW IS THE EXPORT'S OWN GEOMETRY

By request (2026-10-19): "replicate these down to exact pixel in CAS" — the **CAS Templates ›
Design Components** page (`figma.com/design/mKRZhwe2MvJDuMBjYas0D5`, node `71:2`), every tile at
M on the 1:1 canvas. That page was drawn by Claude on 11 Oct as an approximation of CAS; it was
checked against the original build scripts and had not been edited since, so it is now the spec
CAS follows, not a picture of it.

**One function, `modLayout(m, v, tk, iw, pal, center)` → `{h, els}`, lays out all eleven built-in
types** (`LAYOUT_T`: eyebrow, hero, hook, body, list, tags, spec, steps, price, cta, divider) as
elements in the component's own box. `modPx` returns its `h`; `drawMod` hands its elements to
`emitEls` (the export); the editor hands them to `elsView` and renders them through the
**custom-component markup that already existed** (`isCust` / `custEls`). So the preview cannot
draw a different component from the export — measured: **1,049 text runs** over every style ×
S / XL × left / centre × 1:1 and 9:16 on the light palette, worst **0.18 canvas px**; Arabic
(mirrored) 236 runs, worst **0.47**. The old per-type preview branches and drawMod branches are
still in the file and now unreachable; graphic, spacer and cust are unchanged.

**The numbers are Figma's**, carried in units that scale: `u = eyeG/24` (a Figma pixel at this
size), or em of the component's own type. A Figma auto-height text box is **1.25em** with the run
centred in it (`autoH`, `bl`, through `leadOf` for Arabic). **Strokes are INSIDE the box and in its
size**, as the Figma frames are; `emitEls` insets a stroked rrect by half its width.

Decisions taken with the user (2026-10-19):
- **Figma's sizes win over the type ladder in three places**: bullet text is 32 (`body × 8/7`),
  the Icon row and Glass row labels are **20** (under the 24 floor). Price figure is the hero rung
  (85), its glass bar 71; one-line price is the headline rung (59); chip and strip text is
  **Regular 400** (was Light); buttons are Medium 500.
- **The dark canvas takes Figma's colours**: ink `#FAF8F4` (the wordmark follows), chip / button
  ink `#0F1A2C`, eyebrow fill and CTA fill `#FAF8F4`, glass white **.14 / .33** with a 1px edge.
  Every eyebrow variant inks in the canvas ink now (`eyeInk`), not the muted ink.
- Shape changes that follow the drawing: Two columns lists **column by column**; plates are a
  fixed **140 with 36** between (shrinking together only to fit) with **no dotted connectors**;
  Row facts hug with **no column rules**; the Fade headline is **per-line ink** (1 / .5 / .12),
  not a gradient; the boxed body and framed/filled eyebrow are **square**; a corner note wraps at
  15em.

**Glyph widths still differ from Figma, and that is the font, not the layout.** Light and Medium
runs match Figma to ~1%; Regular is ~8% narrower in Figma at 24px and ~3% wider at 85px, and the
tracked caps run narrower there too — Figma draws Google Sans Flex at one fixed optical size where
the browser follows the type size. Where a Figma tile's line breaks differ (glass hero / hook,
bars) it is because the tile fixed its text box at a hand-picked width; CAS breaks at the column.

**Found, not changed:** a top-cluster component sits **4.2 canvas px** lower in the editor than in
the export (5.0 on the 9:16) — measured identical in the pre-change build, so it predates this; it
is the wordmark's documented line-box gap carried into the first component.

**The Quote hook was redrawn in Figma (node 71:88, 2026-10-19): the mark sits BESIDE the copy.**
The 148 Light mark keeps its 120 line box in a 50-wide column, 30 before the copy, both from the
top; the copy wraps at the column less that 80. The block is as tall as the copy, or the mark's
47 box for a one-line quote, and a centred design centres the whole block. Measured against the
tile: height 96 and copy x 80, both exact; the mark's ink top on the same pixel row; editor
against export within 0.1 canvas px, left and centred, 1:1 and 9:16.

# CAS'S SHARE PANEL READS TOP TO BOTTOM AS THE DECISION IS MADE (2026-10-19)

By request ("update UI and UX of this", with a screenshot). It was a primary **Export** button
above the format list it acted on, four rows each repeating "Into the folder ·" in a wrapping
description, and a paragraph about folders. Now (section 47 of the sheet, markup in the Share
block):

- **Campaign name**, then **Format** as the dock's own choice cards (`.p-rcs` / `.p-rc`, a
  Material Rounded glyph, a two-word fact, a tick on the chosen one, `role="radio"`). The long
  descriptions (`exportJpgDesc` …) are the cards' tooltips now.
- **Saves to**: one row naming the REAL destination — the source folder's name, or Downloads (one
  zip), or the share sheet in the app — with how it is organised ("Variant A–C folders · replaces
  the last export") and a Choose folder / Change action (`chooseFolder`). `exportLayoutNote` is
  that row's tooltip.
- **One primary at the bottom** that says what it will do, counted: `Export 6 JPEGs`, `Export PDF`
  (`shExportLabel`, from `sizesFor` over every variant). The result (`exportStatus`) shows under it.

New keys (`shFmt*`, `shDest*`, `shExportLabel`, `shStatus*`) are computed in CAS's renderVals beside
`expPickVals`, which is shared with OPS and was NOT touched — OPS's Share panel is unchanged.
`exportMainLabel` / `exportMainBtnStyle` / `exportLayoutNote`'s old paragraph slot are now unread.
Verified: each card updates the tick, the destination line and the button; the button exported
exactly the 3 files it named; contrast 0 failures in both themes.

**OPS's Share panel took the same design (2026-10-19)**: the File naming group and the
missing-items alert stay on top, then CAS's Format cards, Saves to row and one counted button —
the block is CAS's markup verbatim, with OPS's own keys beside `expPickVals(true)` (`slides ×
(feed, + story when shown; the reel cover is one)`, a flat folder, `exportLayoutNote` defined for
the first time). `.p-rc` had no rule in OPS and arrives with it. `exportSvgRowOn` is set true —
the CAS block gates the SVG card on it. Fixed on the way: the alert's red text on its own red wash
measured **4.03:1** in dark; its text is ink now, the red border and wash still carry the warning.
Verified: each card updates tick, destination and button; "Export 6 JPEGs" exported 6 files;
contrast 0 failures in both themes; `expPickVals` and `studio-base.js` untouched.

**The Share panel's corners were tightened the same day, by request ("why would you have them very
rounded?")**: the format cards and the Saves-to row take the palette card's **10px**, the icon box
6px, in both studios (scoped to `.sx-fmts` / `.sx-dest`, so the dock's own choice cards keep 16).
The Export button stays a pill like every labelled action in the top bar.

**The Saves-to row is REMOVED from both Share panels (2026-10-19, by request: "remove this as it
is repeated")** — the top bar's Source folder button already names and changes the folder. The
panel is now Campaign name (plus OPS's File naming and alert), Format cards, one counted Export
button and the result. `shDest*` and `exportLayoutNote` are still computed and unread.

# CAS HAS A COMPONENT USAGE VIEW (2026-10-19)

By request ("stats on how often the components, along with variants, were used, so I can audit
them and remove the ones not needed — based on the recent projects"). A home-page view,
`splashView: 'use'`, from a **Component usage** row in the sidebar's Review group (bar_chart, Rounded
wght300). `CampaignStudio.usageVals(labels, recents)` reads `savedRecents()` — each entry carries its
whole state — runs `normState` on a copy (so a retired style counts as what it opens as), and counts
per type and per style (`voptOf`, default = the first option): projects using it, placements (one
component on one variant / carousel page), hidden ones apart, and the S/M/L/XL spread. Custom
components group under their spec name. Memoised on the recents array (replaced, never mutated).
Only each variant's own `mvar` is read, not a detached size's. A filter (`_useUnused`, instance
state) shows only what is not used. Section 48 of the sheet (`.cu-*`). The sample is capped at
`RECENT_MAX` (10) — widening it means reading session files from folders, e.g. Ad sets' scan.
Verified with four seeded saved projects (counts, hidden, XL, the filter), contrast 0 failures in
both themes, no overflow at 375. Chrome only — no artwork line changed.

# PORTRAIT FIX WAS DELETED; THE 3:4 AND THE HORIZONTAL ARE ON BY DEFAULT (2026-10-26)

By request. The temporary `pf` size (the 9:16 with a 520 top margin, 2026-10-19) is gone: its
`PXT` entry, plate row, Scale slider, own-photo row, `pfOv` / `pfHide`, the `-pf` photo slot and
the `portrait_fix` name in Ad sets. `normVariant` deletes what it left on a saved variant
(`pfOv`, `pfHide`, `bgSep.pf`, `scaleBy.pf`); an old `-pf` photo stays in the store unread.
**The Portrait 3:4 (`v.ptOn`) and the Horizontal 1.91:1 (`v.wide`) are SHOWN by default**:
`newVariant` sets both true and `normVariant` turns a missing value on, so every saved project
gains them unless it had hidden them (an explicit false, or the pre-10-19 `ptHide`). A Meta
export is now feed, Portrait_3x4, Story and Landscape_1.91x1 per variant. Verified: New launch
opens with Portrait, Story, Horizontal rows and exports those four files.

# CAS'S CANVAS BAR: AN EDITABLE NAME AND A STATUS WITH A KIND (2026-10-20)

By request ("update the UI and UX of this"). Section 48 of the sheet.
- **The campaign name is edited in place** (`.p-cvname`, the same `onCampaign` the Share panel
  uses; `field-sizing: content`, a pencil on hover, the derived `projLabel` as its placeholder).
- **The status is a KIND** — `cvKind` ready / busy / done / bad / info, classified off the
  `exportStatus` text — with a green tick, a spinner, a red mark or a dot, on a tinted pill.
  The line is the first clause (`cvShortA` + `cvShortB`, split before " into / to / on "); the
  whole sentence is the tooltip; a finished or failed message has a **Dismiss** back to Ready.
- **The bar answers its own width** (`container-type: inline-size`, since it is the stage column,
  not the window): under 760 the "into …" tail goes, under 640 the variant pill. The status never
  shrinks; the name truncates first, because it can be opened and read in place.
- The classifier is a regex over message text — a new status message that starts with a new verb
  may need adding to it. `cvStatus` / `cvOkOn` are still computed and unread.
Verified: five messages classified right; rename by real typing; dismiss; fits at 555 and 1035;
contrast 6.2–19.7 light, 5.1–18.3 dark.

**Ad sets › Details was removed and then RESTORED the same day** — it stays, analysis and all.

**The CAS Publish tab and the Meta ad text were removed instead (2026-10-20, by request: "it
doesn't make sense").** Gone: `state.mt` (`normState` deletes it), `mtOf` / `mtCheck` / `mtUsed` /
`MT_LIM` / `MT_CTA` / `limField`, `cwMtVals`, the Publish button and screen (`'publish'` is no
longer a screen or a remembered workspace), the dock's Meta ad text group, the canvas-bar chip,
`pubOpen`, and the MCP op `meta_text`. The placement Preview's primary text, headline and button
come from the creative's own words (`mockCopy`). The Ad sets audience red dot has nothing left to
flag (`card.need` is always false). The workspace switch is **Copy | Design**. The `.yt-*` CSS is
now unused. The untracked `.agents/` (a 7 Oct uxaudit report) and `creative-content-poster/` were
deleted from the working folder.

# CAS'S PLACEMENT PREVIEW IS ONE SCREEN PER APP (2026-10-20)

By request: the Preview overlay's bar is **Placement preview · Facebook | Instagram · Close**
and nothing else. The view tabs (Feed / Reels / Story), Light | Dark, **Platform UI** and
**Safe margins** are gone. The stage is a row of three captioned phones (`mkPhones`, an
`sc-for` over the old single phone's markup, its per-view keys renamed to `ph.*`):
**Feed** — the 1:1 (`sq`) on Facebook, the **Portrait 3:4 (`pt`)** on Instagram — then
**Reels** and **Story**, both the 9:16. The chrome is always drawn (`mkChromeOn` is `'1'`; its
`sc-if` wrappers stay), the phone is always dark, the safe-margin overlays are deleted from the
markup (`mockSafeBox` / `mockSafeWrap` in `studio-base.js` are unread). CAS's `mockRenderAll`
renders `sq`, `pt` and `st` keyed by SIZE, so the toggle needs no re-render; the Portrait 3:4
renders even while a variant hides it. Default app Facebook. Section 50 of the sheet.

**Light | Dark came back the same day, and the advertiser has a profile photo (2026-10-20).**
`state.mockMode` (default dark) and the `mkLight` / `mkDark` pair sit after the size line in
the bar; the screens' `data-mode` follows it, so only the feed changes. Every ADVERTISER avatar
(`.mk-av-b` in the feed and Story headers, `.mk-igr-av` on the Instagram Reel) shows the
supplied provident. wordmark on white — a 160px JPEG embedded as base64 in section 51 of the
sheet, its `p.` text hidden. The viewer's own tab-bar avatar (`.mk-av2`) stays grey.

# CAS'S COPY VIEW HAS A "BRIEF TO COPY, WITH CLAUDE" CARD (2026-10-20)

By request: a GUI for the `meta-ad-design-copy` skill's Stage 1 inside CAS, invoking the user's
own Claude. A page cannot run Claude, so the card (a `<details data-acc="cw-brief">` at the top
of the Copy workspace, section 52 of the sheet) does three things:

- **Brief**: textarea, Families / Investors chips, optional notes. Stored per WORKSPACE in
  `localStorage['adstudio-brief']` (`brRead` / `brSet`), never in the project.
- **Ask**: `brPrompt()` = `/meta-ad-design-copy` + "Stage 1 only, do not build in CAS" + today's
  date + audiences + notes + a request to END with a ```` ```cas-copy ```` JSON block
  (`BRIEF_SAMPLE`) + the brief. **Open in Claude** is an `<a href="claude://claude.ai/new?q=…">`
  — the form the Claude app's own "Ask Claude" macOS service uses (found in its app.asar), which
  caps its text at 16 KB; past `BRIEF_Q_MAX` the link opens an empty chat. The click also copies
  the prompt and stands the beforeunload guard down for 1.5s. A secondary claude.ai link.
  **The claude:// link was not exercised from here** (it would have driven the app this session
  runs in); `brOpen` itself was.
- **Reply**: `brParse` reads the `cas-copy` block (or a balanced `{…"cas-copy"…}` object), else
  `brStacks` reads the skill's plain code-block stacks in its order (tag, project, headline,
  support, proof `·`, price, payment, CTA; audience from the nearest preceding Families/Investors
  heading; Flags from a "Flags" list). `brWant` maps: eyebrow=tag, hero=headline (main or an
  alternate), hook=project, body=support, tags=proof, price=label/figure, spec=payment rows,
  cta=CTA. `brFill` reuses the first component of each type on the page (single ad: the shared
  list; carousel: the active page), appends missing ones, and with the prune switch drops every
  other COPY_TYPES component through `dropMod`; one `upd`, so one Undo. Names an empty campaign
  `<project> - <audience>`.

If the skill's stack order changes, `brStacks` and `BRIEF_SAMPLE` are where to follow it.
Verified: both parse paths on a realistic reply, real clicks (flag, alternate heading, Fill,
Undo), prune on the Investors set, brief and reply surviving a reload, 0 contrast failures in
53 text runs in both themes, no overflow at 375. Markup +9/+9 `sc-if`, +4/+4 `sc-for`,
+1/+1 `details`. No artwork line changed.

**The card gained "Where it saves" and "Attach pictures" (2026-10-20, by request).** Steps are
now Brief · Where it saves · Attach pictures · Ask Claude · Paste reply. The folder row shows
`folderName()` with Choose/Change (`brChooseFolder` → the folder API's `pick()`), plus a Drive
link field (`b.drive`); both go into `brPrompt`, as does `brAttachLine()` saying what is attached.
Attachments are image-slots with the **`adbrief-` prefix** (`adbrief-logo`, `adbrief-ph-0..5`,
`adbrief-im-0..5`) — deliberately not `adstudio-`, so session files, `Assets/` and Open Session
never carry them; they live in the workspace's photo store beside the brief. `brFill` calls
`brPlacePics`: photos `copySlot` onto `adstudio-bg-<k>` for each variant/page in order, the logo
onto `adstudio-colog` with `colog.on = true`. Slot writes are NOT undone by Undo (they are store
writes, like every photo drop). Images stay until **As graphic** (`brUseImage`: a new graphic
component + `copySlot` to `adstudio-mod-<id>`). Remove closes the gap with `moveSlot`.
Two traps hit: **a `class` attribute on `<image-slot>` does not survive** (style it through a
wrapper selector), and **the fill map `_filled` goes stale between refreshes** — `brHas` reads the
mounted slot's `data-filled` and uses `_filled` only for an unmounted id; a MutationObserver on
`data-filled` (`brWatch`) re-renders when a picker fills a slot (that fires no drop).
Verified: upload through `_ingest`, Fill placing photo and logo, As graphic, remove-and-compact,
reload, 0 contrast failures over 66 text runs in both themes, no console errors.

# CAS'S COPY VIEW IS ONE FLOW (2026-10-21)

By request ("they look like two flows forced with each other"): the copy status stepper and the
brief card each had their own numbered steps. Now one track reads top to bottom — the head
(kicker, name, the **one** numbered stepper Draft / With design / Final, the note), the
**Start from a brief** card (`brOn`: Draft only; its steps carry no numbers; folder, Drive link
and pictures fold into a nested `<details class="cw-br-more">` summarised by `brMoreSumm`),
**The words** heading (`cwWordsSub`), the pages, History, and a sticky `.cw-bar` at the foot
holding the since-line or the notice (`cwMsgOn` / `cwMsgOff`) and the hand-off buttons.
`brFill` records `filled` in the brief store, closes the card and scrolls to the words; the
card's pill then reads "Filled · <audience>". Section 54 of the sheet. Chrome only.

# CAS COMPONENTS DRAG TO REORDER ON THE CANVAS (2026-10-23)

By request, beside the floating control's ↑ / ↓ arrows. A press on a component that travels
5px is a drag (shorter is still the selecting click); a link-coloured line (`.p-moddrop`, fixed,
pointer-events none) marks the drop. **The line under the pointer decides it** — its top or
bottom half says before or after — and the moved component takes that neighbour's cluster, so a
drag can carry it from the bottom of the ad to the top. An EMPTY cluster is reached through the
canvas's top or bottom third. Release commits ONE undo entry through
`CampaignStudio.canvasMove(x, vi, size, id, tid, after, cl)`, which writes the record THAT
canvas reads (the variant, or a detached size's own) — the record the arrows and Top / Bottom
write — and selects the moved component. Escape or pointercancel aborts; the release's click
is swallowed so it cannot clear the selection.

- `view.reorder` / `dragId` / `dragCl` are set in `mk` after the type chain, on every
  non-floating component; the modwrap carries `data-mid` / `data-cl` / `onPointerDown`. A
  floating graphic's own move and a spacer's resize grip stop the event first.
- Pointer events, mouse and pen only — a finger keeps scrolling the stage.
- **Testing trap:** under `resize_window` emulation the pane's screenshot coordinates do not map
  onto the page (the drag landed on `.p-plate`); with the desktop preset the frame is a clean
  1.28x of the 1024px viewport. Log the pointer events before trusting a drag test.

Verified with real drags: the CTA moved between eyebrow and headline; the headline into the
empty top cluster; a plain click still selects; Escape leaves the order untouched.

# CAS CAROUSEL PAGES CAN BE REORDERED — "Organize pages" (2026-10-28)

By request. A dock pill **Organize pages** (carousel, 2+ pages, `pgBtnOn`) opens `.pg-ov`
(section 57 of the sheet): every page as a 1:1 render (`pgSync`, buildOps at .2, keyed on
`pgKey`, thumbnails keyed by the page's `pgid`), dragged with pointer events (`pgBind`, bound
once from the shell's `_vtTick`; 5px threshold, a line on the target tile's half), arrow keys
move the focused page one place, Enter / double-click edits it, Escape or Done closes.
`movePage(from, to)` reorders `variants` and keeps `activeVi` on the same page.
**Photos are keyed by POSITION**, so `CampaignStudio.permutePageSlots(cur, next)` moves every
page's slots (`pageSlotIds(k)`: bg, -st, -ls, -bn, -pt, fg) when two variant lists hold the
same `pgid`s in another order. `pgIds` gives every variant a unique `pgid` FIRST, outside the
undo stack, and `restore()` calls the permute too, so Undo / Redo move the photos back.
Verified with a real drag on three coloured pages: copy and photo moved together, Undo, Redo
and the arrow keys kept them in step, no console errors. `_pgOpen` is instance state.

# CAS HAS AN UNBRANDED LOOK (2026-10-28)

By request: the same design components with other cosmetics, for ads that must not carry the
Provident brand. Spec agreed in conversation, mocked up first (an Artifact with the Palm
Jumeirah photo), then built. **Provident ads are unchanged: op census, 4 templates x dark/light x
left/centre x sq/pt/st/ls/bn/bs, 96 groups, 1,190 ops, byte-identical against the pre-change
build — apart from `serif: 'hd'` now riding on headline and price-figure text ops**, which in
Provident resolves to the same face.

- **`state.look`**, one per PROJECT: `{on, tone 'd'|'l', pal [text, accent, button, chip, scrim],
  lock[5], fH/wH, fB/wB, fA/wA, rad, blur, gop, trk, seeded}`. Saved with the project, not
  stripped (it is the design). `CampaignStudio.lookOf(s)` fills defaults (`LOOK_DEF`).
- **It is PUBLISHED with the face.** A static block in `CampaignStudio` wraps
  `StudioBase.applyFont` (CAS document only — OPS never loads this class) to set
  `CampaignStudio._look`, `window.providentFontHead`, `window.providentArabic` and, when the look
  is on, `providentFont` / `providentFontFam`. So every path that already publishes the face
  (buildOps, renderVals, previews, thumbnails, Ad sets renders) carries the look with no edit.
  `StudioBase.ensureFont` is wrapped too, so every export waits for the look's fonts
  (`lookReady`, capped at 6s so an offline machine still exports in the fallback).
- **`palOf(v)` returns `lookPal(L)`** while a look is on: the tone's PAL with every ink, rule,
  chip, glass, button and scrim key taken from the five roles. `v.bg` is ignored then.
  `eyeInk` returns the accent; the price figure takes the accent (`fig` in modLayout);
  `trackOf` uses `look.trk`; the scrim's colour is `pal[4]` (its strength and fade stay the
  variant's).
- **`lookEls(els, K)` applies corners, blur and glass AFTER layout**, at the end of `modLayout`
  and `custLayout`, so export and editor (both read the elements) agree. A circle stays a
  circle, a box thinner than 8K stays square. `bla` on a box is the blur amount, read by
  `emitEls` and `elsView`.
- **The HEADLINE FACE is `serif: 'hd'`**: `meas()` (studio-base.js) measures in
  `providentFontHead` when serif is `'hd'`; both renderers draw it; `heroLines` wraps with it;
  `mirrorOps` already passes `o.serif`. `elsView` gives an `hd` run its font-family and a
  line-height from `ascOf(stack)` so its baseline lands on the op. Measured: every run within
  0.1px horizontally and 0.5px vertically, Latin and Arabic.
- **Unbranded draws no wordmark, lockup or QR**, and the wordmark's band and clear space go
  (buildOps `unb`, scrimStops `unb`, the preview's `logoStyle` display none, `qrShow`, `qrNeed`).
- **Fonts**: `google-fonts.js` (1,950 families: name|category|weights|Arabic, built from
  fonts.google.com/metadata/fonts, which a browser cannot read) loads on the first search.
  Weights ride with the pick (`wH`/`wB`/`wA`) so loading never needs the catalog —
  `fontLoad` asks the CSS2 API only for weights the family has (it refuses others). A load
  clears `StudioBase._asc` and re-renders (`_rerender`).
- **The switch floats over the stage, bottom left** (2026-10-28, by request): `.p-lkdock` /
  `.p-lkseg`, a sibling of `.p-dock` in `.p-body`, styled as the dock's twin — 36px pill on
  `--ps-card` with a hairline, the chosen half the solid navy with no stroke — at
  `padding-left: 272px + 28px`, the same bottoms as the dock (62 / 115), z 29 so the dock's
  panel stays above it, rising with `html.lk-on`. On a phone it sits one row above the dock
  (`bottom:159px`). It left the canvas bar; the `.p-cvbrand` CSS matches nothing.
- **The strip** is `CampaignStudio.LookStrip`, plain DOM in an empty `[data-look-host]` under the
  stage (mounted from the shell's `_vtTick` via `eng.lookMount`), shown while the look is on.
  Palette from the photo: k-means on a 60x80 sample of `adstudio-bg-<vi>`, roles by `lookAssign`,
  accent stepped until 4.5:1 on the scrim as it sits over the photo. Saved looks:
  `localStorage['adstudio-looks']`. The dock rides above the strip (`html.lk-on`, `--lk-h`).
- **The strip folds to a head bar (2026-10-28, by request: "hide it when the design is set")**:
  `.lk-bar` (the five colours, the two fonts, a readability word) is always there while the look
  is on; `.lk-body` holds four cards (Colour, Type, Shape, Saved looks). Folded/open is per
  COMPUTER, `localStorage['adstudio-look-open']`, never in the project. `lookToggle(true)` while
  already on reopens a folded strip. A swatch's whole face is a transparent `input[type=color]`
  (a pick locks it); the lock is its own button. Each font pick shows a specimen in its face
  (`fontLoad` per pick). **Layout answers the strip's own width** (`container-type:inline-size`,
  1/2/4 cards at <620/620/1180px), because it lives in the stage column, not the window.
- The placement preview shows "Sponsored page" with a grey avatar (`mockCopyOf`, `data-unb`).
- **Not done:** the Layout rail's Background dark/light still shows (it does nothing while the
  look is on); the copy-coverage chip and Ad sets' Details analysis do not know about the look.

**Text selection is visible in dark mode (2026-10-28, by request).** The winning `::selection`
rule in every sheet was a navy tint at 18%, which vanished on a dark field. All three consumers
and the kit now add `:root:not([data-theme="light"]) ::selection{background:rgba(87,139,250,.55);
color:#fff}` right after it; light mode keeps the navy tint.

**PM's package bar is a widget in the pane now (2026-10-28, by request).** It is no longer fixed
across the top of the window: `RV.barRender` moves `.rvh` into an empty `[data-rvh-host]` div that
CAS's Ad sets pane carries right under its `.as-pane-h` (React gives that host no children; the
1s tick re-homes the widget if the pane is drawn again). It takes the setup widget's shape — a
header band (Ad set package · product, the name at 22/500, "n of N audiences ready to run", the
status pill), the four steps, and a footer with See details and Download. `.as-ov` no longer
leaves room above itself for PM (`top:0`). The details window is unchanged.

**Review links previews follow every change, photos included (2026-10-28, by request).** Three
paths left a card stale. (1) A photo change only marked the preview due through the save it
triggered; `S.onSlot` now marks it due for every photo, uploaded here or pulled from someone
else. (2) A change pulled into the designer's tab never redrew; `shPull` marks it due. (3) The
ad set link (the content team's Edit text) never drew one at all; `RV.thumbFor(sid)` renders
that project from its own state and Drive photos after each save and sends op `thumb` with
`p` (at most every 5s, retried). The first preview gets a `thumbAt`, and a card thumbnail is
square (95, 76 on a phone), since the preview is the 1:1 — the 4:5 box cropped its sides.
Verified on the Drive stand-in: a replaced photo and a typed heading from the content-team link
both reached the project's preview within ~3s.

**Review links draws missing previews itself (2026-10-28, after "previews are still blank").**
Reading the live Drive showed that NO project had ever saved a preview (`review.thumb` empty on
every one), so each card fell back to the ad set's first, photo-less picture — the designer-tab
path above never ran in real use, cause not found. `dsInfo` now marks a project `stale` when its
preview is missing or older than its last change, and names the ad set's `lead` (the project
changed last; the card shows its preview). `AV.heal` renders each stale project on the Review
links page itself — `shNorm(d.state)` plus the photos the first square can show
(`adstudio-bg-0|fg-0|qr|colog|ic-*|mod-*`, via `fetchRec`) through `rvThumb` — paints it, and
writes it back with op `thumb`, one at a time, kept per revision in `HEAL`. Verified on the
Drive stand-in with the preview stripped from a project: the card showed the photo within
seconds and Drive held the new preview.

**Each ad set says whether it is branded (2026-10-28, by request).** `rvSum` records `brand`
(`provident` / `unbranded`, from `state.look.on`); `dsInfo` counts it per project straight from
each project's state (so older saves need nothing) into `e.brands`; `brandHtml` prints a chip —
Provident (orange dot), Unbranded (grey), Mixed (hollow orange, counts in the tooltip) — at the
head of each card's meta line and as a **Brand** row in Details. Drive ad sets only; old
share-store ones show nothing. Also: after `AV.heal` finishes, the page re-reads from Drive,
because the first paint could keep the ad set's old picture (seen live: previews were saved to
Drive but the cards changed only after a refresh).

# CAS HOME IS A BRIEF SHEET BESIDE WHAT TO PICK UP (2026-10-29)

By request, from a screenshot of the old "Set up the campaign" card. `PlanView` (share-link.js)
draws `.rsp.rsp2`, styled by the "THE BRIEF SHEET" block at the end of the injected CSS:
- **No card.** The campaign name is an input set at display size (30–46px, a hairline under it)
  and is the page's headline; Product, Deadline and the Drive folder sit on one line as pills;
  the Brief is the one big surface (200px textarea) with "Attach files" on its foot; then
  "Who it's for" (the audience tiles) and the actions, Start designing first.
- **CAS markup wraps the setup and the recents in `.p-home`** (section 60 of CAS's sheet): two
  columns (`:has(.p-home-main)`), with the Riffle figure (`.p-home-hl`, empty span, drawn by
  `hlBind`) over "Pick up where you left off" in a 340px sticky column. One column below
  1180px, where the figure is hidden. The Recent view keeps its full-width grid.
- Every class and `data-f` the form's logic reads is unchanged.

# CAS'S RAILS AND BARS, REDESIGNED (2026-10-29, /impeccable)

> **THE TWO RAILS WERE REDESIGNED AGAIN THE SAME DAY, by request ("I don't want what you did").**
> The Layout inspector and the palette specimen grid below are gone; the top bar and canvas bar
> notes still hold. See *THE OUTLINE, THE LIBRARY AND THE LAYOUT MAP* at the end of this file.

By request, from screenshots of the Layout rail, the palette rail, the top bar and the canvas
bar. Chrome only — no artwork line changed. CSS is section 63 at the end of CAS's sheet.

- **The Layout rail is an inspector** (`.ly`): one row per property, name and value on the left
  (`.ly-l`, 88px), ONE 36px track on the right (`.ly-seg`, or the three-stop slider, or a folding
  field `.ly-f` / `.ly-v`). Two groups: **Composition** (Copy · Align · Logo · Spacing · Scaling)
  and **Canvas** (Background · Scrim). Glyph-only tracks (Copy, Logo) say their choice in words
  under the name (`layoutName`, `logoVal`, new keys beside `logoScope`); each glyph is a tiny
  canvas (`.ly-gl`) with the marks where that choice puts things. The five i discs are gone —
  the help is the row name's own `.tip`. Labels changed: Layout preset → **Copy**, Alignment →
  **Align**, Vertical spacing → **Spacing** (the guide is updated). Vertical spacing no longer
  folds. `data-acc` keys (`scaling`, `scrim`) are unchanged, so fold state carries over.
- **The palette is a two-up specimen grid** (`.pl-grid` / `.pl-t`): each tile is the component's
  look in a well of the stage's ground (`.pl-sp`) over its name; a count sits in the well's corner
  (`.pl-k`) and the + shows on hover. The group boxes are gone; a heading says "N in use". Tiles
  keep the `p-tile` class because the add-flash handler finds them by it. The specimen strings in
  `samples` were shortened to fit a 104px tile.
- **The top bar has one solid button**: the flow's next step, or Share when there is no flow
  (`.p-top:not(:has(.p-flow-go))`). The studio switcher and Ad set | Design are navigation, so their
  ON half is the quiet `--ps-fill-h` (a card with a hairline in light), not navy; Preview is a
  ghost and goes icon-only ≤1360px; Share is an outline. The flow keeps its width (`.p-flow-at`
  flex:none) so the step name never clips.
- **Section 61 (the flow's own CSS) was missing from the working tree** — an uncommitted edit by
  another session dropped it, and the flow's arrow drew at its intrinsic size. It is restored inside
  section 63 (the capsule is a fill now, not a ring).
- **The canvas bar's ad set chip is "Ad set overview"** (`.p-cvov`, a grid icon, same `cvAdGo`): its
  label repeated the top bar's step in different words ("Translation" against "Arabic layout").
  `cvAdLabel` / `cvAdState` are still computed and unread.
- Verified in dark and light at 1512 / 1280 / 1024: 0 contrast failures over the four surfaces,
  0 elevation shadows, no horizontal overflow, no clipped specimen; real clicks on Logo, Copy and a
  palette tile; the flow in its design state fits at 1280.

# THE OUTLINE, THE LIBRARY AND THE LAYOUT MAP (2026-10-29, /impeccable)

By request, replacing the inspector rows and specimen grid of the pass before (section 63's rail
rules are deleted; section 64 of CAS's sheet). The user chose both directions from three each.
Chrome only: no artwork line changed.

- **One mark vocabulary**, `MK` / `markOf(type, k)` in renderVals: a component drawn as the
  skeleton of its shape (rows of segments, `data-k` bar / pill / dot / box / line / dash, w in %,
  h in px × k). Read by the outline, the library and the map, so all three show the same objects.
  A new component type needs an `MK` entry (it falls back to `cust`).
- **Left rail = On this ad over Add.** `outline` (groups Top / Bottom / Floating) reads the record
  the focused canvas reads (`selEff`: a detached size's own clusters and order). A row click sets
  `sel` (size = current sel size, else `focusSz`); the eye toggles `hidden` on the active variant
  and drops a selection on it. A hidden row stays, struck through in `--ps-dim`. The library
  rows keep `p-tile` (the add-flash handler finds them by it); palette items now carry `type`.
- **Layout rail = a map** (`lmMap`): the focused canvas at its own ratio (`PXT[selSz]`, at most
  288 wide / 300 tall), its ground PINNED (a mid tone standing for the photo; light canvas a pale
  one), the scrim band in the real colour at `scrimH` strength, the components as marks in their
  real order and alignment (selected one in pinned blue). Clicking a band / the middle / a corner
  calls the existing `layoutTop` / `layoutSplit` / `layoutBottom`; a corner writes the logo the way
  the old tiles did (detached size aware). Spacing, Scaling, Background, Scrim are rows under it.
- Verified in Chrome with real clicks (copy to top, split, logo bottom centre, select, hide, add);
  contrast 0 failures over both rails in both themes (72 runs), 0 elevation shadows, the map
  following a 9:16 focus at 169×300, no overflow. `layoutName`, `logoVal`, `logoScope`,
  `logoSpots`' bar/dot styles and `paletteCats`' `names` / `acc` / `countTip` are now unread.

# CAS: PORTRAIT PADDING, GRAPHIC SCALE, ONE PHOTO PER SIZE, UNDO 10 (2026-10-29)

By request. CAS only; no OPS or studio-base.js change.
- **Portrait 3:4 margins are `[120, 100, 120, 100]`** (were the 1:1's 80 all round, which read
  as tighter on the taller canvas).
- **A graphic's scale is a fraction of the SQUARE's column.** `graphicW` reads
  `gRef(innerW) = min(innerW, GREF 920)`, and the corner drag measures against the same, so a
  graphic on the 1.91:1 or a banner (1680/1640 columns) is the size it is on the 1:1. 9:16 and
  3:4 (880) are unchanged.
- **One photo, reframed per size**: `ownPhotoFor(vi, psz, detach)`. Pressing a size's link
  button (story / wideOv / banOv / ptOv) copies `adstudio-bg-<vi>` into `-<psz>` (or refreshes
  it when it holds the same picture) and sets `bgSep[psz]`; re-linking clears `bgSep` only if
  that slot still holds the shared picture. The Own photo button also starts from the copy.
  The copy doubles that photo in the store; replacing the main photo later does not reach it.
- **Undo / Redo keep `UNDO_MAX` (10) steps, and a reframe is a step.** `_reframeEnd` records
  the crop on `image-slot:reframe` active true and, on active false, pushes a state copy
  carrying `__slots` ({id: crop before}) when the crop moved. `_histStep` puts crops back with
  `putRec` (picture kept, only `s/x/y/f` change) and hands the other stack the crops it replaced.
Verified in the pane: graphic widths 368 on sq/ls/bn, 352 on st/pt; detaching the 3:4 made its
own copy, a reframe there undid and redid without touching the 1:1's crop, 12 edits kept 10.

# CAS RECENTS ARE GROUPED BY CAMPAIGN (2026-10-29, /impeccable)

By request, from a screenshot of the Recent grid ("KORE by Imtiaz - …" on six cards, a cryptic
"2V" badge, "Saved 10/29/2026" on every card). `recentGroups` (CAS renderVals, beside the old
`recentsView`, now unread) groups `savedRecents()` by campaign: the ad set's name from
`provident-rs-pid:<pid>`, else the name before " - ". The heading carries the campaign once with
"N projects · last saved today, 5:02 PM"; a card says only the rest — audience (name after the
campaign), market (a trailing "(…)") and Arabic (`state.font`) — then a relative time and the
variant/page count. Several variants show as plates stacked behind the render (`data-stack`),
which replaced the badge. Campaigns with one project go into one **Other projects** row whose
cards name their campaign. `openRecent(i)` keeps the original index. Section 65 of the sheet
(`.rc-*`); the same markup serves Home's side column (2 up, scoped by `:has(.p-home-main)`) and
the Recent view, where the "Pick up where you left off" label is hidden. Verified with stubbed
recents: grouping, the click opening the right index, rows aligned, 0 contrast failures (min
6.47:1 dark), no overflow at 375. OPS's recents are unchanged.

# THE LEFT RAIL IS LAYERS OVER A PINNED TILE GRID (2026-10-29, /impeccable)

By request ("improve the left side bar"), the user choosing it from three options. It ran ~1,130px
tall, the library sat under the fold, its sketches looked alike and its counts repeated the outline.

- **The rail no longer scrolls as one** (`.p-rail-l{overflow:hidden}`): `.ol-list` (the layers)
  scrolls on its own and `.lt` (the grid) is pinned at the foot, `max-height:min(390px,46vh)`.
  `railFoot` is the grid heading's tooltip; the footer line is gone.
- **Layers drag to reorder**: `olDragStart` / `olDropAt` (pointer events, mouse and pen, 4px
  threshold, a `.ol-ins` line, edge auto-scroll, Escape cancels, the release's click swallowed)
  write through `canvasMove` on the focused size's record; Alt+arrows step (`olKey`). Top and
  Bottom always render; an empty one is an `.ol-zone` drop target. Floating rows don't drag.
- **The grid** is every palette item as a tile: its own look (`tileSp`, `tileText`/`tileStyle` on
  the palette item — DC cannot index an array in an interpolation) over a short name (`TL`). No
  counts and no group labels; the order is still the four groups'. Tiles keep `p-tile`.
- Verified with real drags (Body bottom → above the eyebrow, Eyebrow into an empty Bottom), a tile
  click adding a Price block, Alt+Up, no clipped specimen, contrast 0 failures in both themes.

**CAS Home is one column (2026-10-29, by request).** The recent projects sit BELOW the setup
at full width (section 66 of CAS's sheet overrides section 60's two-column grid and section 65's
side-column rules), under a hairline and the "Pick up where you left off" label. The Riffle
Hairline figure (`.p-home-fig`) is removed from the markup "for now"; its CSS is left unread.
`hlBind` still mounts Status's Stack figure and the Ad sets drop zone's.

# THE ALL-VARIANTS DOCK IS AN INSPECTOR (2026-10-30, /impeccable)

By request, from a screenshot of the old dock (cards, big tiles, paragraphs). CAS section 67 and
the `.p-dock-b.dk` markup: a 360px panel of rows in the Layout rail's language (`.lm-l` name +
state line on the left, one `.lm-seg` on the right). Head: title, "Applies to every variant",
an amber dot "1 to fill in" only while the QR is missing (`dkNeedOn`, beside `qrNeed`; the green
Done pill is gone), the tip. Rows: Format (Single | Carousel; `modeHint` is the track's title),
Story 9:16 (carousel; a whole-row switch `.dk-sw`), Typeface (Aa English | ع Arabic; `fontTip`
on the name), QR code (switch row, then a 76px drop with a QR glyph and the Upload/Remove list,
then Corner Left | Right), **Partner logo** (renamed from Collaboration logo; drop, Size slider,
Colour Match canvas | Original). Both drops carry `data-nohint` with `.dk-ph` glyphs behind.
Short state lines are `dkScope/dkFmtSub/dkStorySub/dkQrSub/dkCoSub`; `qrHint`, `coHint`,
`storyHint`, `qrOneCode` are now tooltips or unread. Chrome only. Verified: 0 contrast failures
in dark, no overflow, Single/Carousel and the switches by click. **The pane's window blur closes
the dock (`_closePops` on blur)**, so a real click from the automation can close it — test with
dispatched events.

# THE PLATE HEAD IS A TITLE; EVERY CANVAS HAS A SIZE ROW (2026-10-30, /impeccable)

By request ("continue redesigning this", with a screenshot of the plates). CAS section 68. The
head mixed three pill treatments (navy Master, white Editing, outlined Edit / Remove); now
`.pv-h`: the variant's name 15/600 in ink, "Editing" as a link-coloured word with a dot on the
active plate (`activeOn`), **Edit** as a text link on the others (`editOn`, `editTip`), Remove as
a bin icon `.pv-rm` (`removeOn`, `removeTip`), with a hairline under the head. The 1:1 gained the
size row every other canvas has (`sqHead` "Feed", 1:1, no buttons). The caption's copy figure is
`.p-cov`: "Copy 50%" beside a 44px bar (`coverBar`) with a tick at 40%; past `COVER_MAX`
(`coverOver`) the BAR is amber and the text stays ink — amber 11.5px text measured 4.35:1 in
light. `badgeStyle`, `activateStyle`, `activateLabel`, `removeStyle`, `coverStyle` are computed
and unread. Contrast 0 failures both themes; Edit and the bin verified by click. Chrome only.

# DEVELOPER LOGOS IN THE PARTNER LOGO GROUP (2026-10-30)

By request: Nakheel, Emaar, Meeras, Imtiaz and Beyond preloaded in CAS's Partner (collaboration)
logo, selectable, with a way to add more. `CampaignStudio.DEV_LOGOS` holds the five as base64
SVG (rebuilt from ~/Desktop/SVG: the class fill inlined as `<g fill>`, width/height from the
viewBox; Emaar keeps its dark #231f20, the rest are white). `DEV_KEY` `adstudio-dev-logos` holds
logos added per COMPUTER — added to runtime.js's PREF list so every workspace shares it.
`devLib()` = both. **Picking writes the file into the `adstudio-colog` slot through
`ImageSlot.putUrl`** and turns the partner logo on, so the canvas, export, ink-box measurement and
Assets/ treat it as a dropped file; the selected tile is read back off the slot (`devSlot()`),
not stored in state. `devAdd` (file picker, `providentEncodeFile`), `devSaveCur` (a mark dropped
into the slot that is not in the list), `devRemove` (own ones only; ads keep their copy).
Section 69 of the sheet: tiles draw each mark as a MASK in the chrome ink, so white and dark files
both read in either theme. Verified: pick → slot + op, add → listed and selected, remove → the
save link appears. Chrome only; no artwork line changed.

**Many logos (same day, simulated with 35).** The flat grid ran to 588px and pushed Size and
Colour off the dock. Past `DEV_FEW` (9) the picker shows `DEV_SHOW` (6) tiles — the one in the
slot, then `adstudio-dev-recent` (picked ids, newest first, per computer, PREF-listed), then the
list's order — and **Show all N** opens every logo in a box capped at four rows that scrolls,
with a search (`_devQ`, prefix matches first; Escape clears, then collapses, without closing the
dock). Instance state `_devOpen` / `_devQ`. Up to 9 logos nothing changes. Section 69b; the ×
and + are Material Rounded SVGs now. Verified with real typing; dark marks 8.4:1+.

# THE UNBRANDED STRIP, THE OPEN-LINK DIALOG AND COMPONENT USAGE, REDESIGNED (2026-10-30, /impeccable)

By request, from screenshots. Chrome only — no artwork line changed.
- **Unbranded look strip** (`CampaignStudio.LookStrip`, CSS section 59): one panel of four
  hairline-divided sections (`.lk-sec`), no cards. The palette is one joined strip (`.lk-pal`);
  under it `.lk-lbls` gives each role's name, hex and — for Text, Accent, Button — its
  readability score (`.lk-cr`, a green or red dot), which replaced the separate chip row
  (`.lk-ck` is gone). The whole head bar (`.lk-tog`) is the fold; the "Hide controls" button
  (`.lk-tog2`) is deleted. Font rows: name and a compact picker (`.lk-sel`) on one line, the
  specimen under them. Labels: "Search Google Fonts", "Glass fill", "Save". Columns follow the
  strip's own width (1 / 2 / 4 at <640 / 640 / 1180).
- **Open a shared project** (`nameDialog` `o.steps` / `o.kicker`, CSS `.sho*` in share-link.js):
  the project's name is the title, what it is in sits above it, and loading is three steps
  (`dlg.step(n, detail, p, idle)` — done / run with a count and bar / next / wait / bad). While
  busy only Cancel shows (`data-busy` hides Open). **Cancel now stops the open** (`dlg.gone()`
  is checked between pictures and before `loadSessionFile`); it used to keep loading and open
  the project anyway.
- **Component usage** (CSS section 48, `usageVals`): an audit TABLE. A summary line
  (`useSum` / `useSumSub`) beside one filter track with counts (`useSegs`, replacing the three
  verdict tiles — `useTiles` is still computed, unread); then `.cu-t`: header row, group labels,
  a `<details class="cu-r">` per component (render, name and reason, verdict dot, used-in bar,
  placements + hidden, an S/M/L/XL bar spread `r.sizes`) that opens to its styles in the same
  columns. A one-style row does not toggle (`r.sumClick` = preventDefault). The column template
  `--cu-cols` lives on `.cu-t` and changes by CONTAINER query on `.cu` (the window's width says
  nothing about the content column beside the sidebar); below 1120px the Sizes column is dropped
  with its own six-column template — a hidden cell in a seven-column grid shifts the next cell
  into the empty slot. The folder panel is one row (`.cu-src`; `data-lib` / `data-lib-in` kept,
  `libPickVals`' reader needs them). "How it is counted" folds under the table.
- Verified: contrast 0 failures over all three in light and dark; real clicks on fold, lock,
  Shuffle, a row's toggle; the open dialog through name → pictures → open, and Cancel mid-load.

# CAS'S COPY CARD TAKES PLAIN LINES; ARABIC IS THE LAYOUT THROUGH GOOGLE TRANSLATE (2026-11-05, /impeccable)

By request ("let me just paste a plain text like this"). The Ad set tab's **Copy from Claude**
card is now **Copy**, and reads plain lines first.
- **`CampaignStudio.brPlain(t)`**, tried after the `cas-copy` block and before `brStacks`: an
  audience is a line of 1–3 words ending in a colon (`Family:`); its lines are small label,
  heading, hook line, extras, button (button always last; 3 lines = label/heading/button, 2 =
  heading/button, 1 = heading). Extras split on ` · ` / ` | `; `brPair` with a label, or
  `brPrice` with label and figure, makes a key fact, anything else a tag chip. Skipped when the
  text has code fences, a block runs past 14 lines, or there is no audience line and more than 8
  lines (that is a full Claude reply). Stacks carry `plain: true`.
- **`brWant`** gained `tags` (plain only, so the skill's proof lines still do not become chips)
  and spec rows up to `SPEC_MAX` for plain (2 for the skill).
- **`brFill` inserts a missing component right after the one filled before it**, copying that
  one's cluster on every variant, so the ad reads in the copy's order (it used to append). The
  notice says "N added".
- **The card** (CSS block "THE COPY CARD"): a taller paste zone with the format as placeholder,
  a numbered key of the order while empty (`brKeyOn`), the status line, flags (skill replies
  only), audience tabs over **`.cw-lay`** — each line set the way its part reads (heading 19px,
  chips as pills, facts as label-over-value tiles, the button as an outline pill) — then Fill
  beside **Remove unused parts**. **`.cw-pv` was taken** (the Copy view's preview pane, dark
  stage fill), hence `cw-lay-*`.
- **Arabic projects (`brCtx().arb`) show "Arabic copy" instead**: one action, **Translate the
  layout to Arabic** (`brArabic` → `SP.arTranslateLayout`, share-link.js), progress and errors in
  `_arMsg`. `arTranslateLayout` is the old dialog code made a method (Chrome's built-in
  Translator API — Google Translate on the device, nothing sent). **`rsNextDlg` now runs it on
  open** for the Arabic version, so "Make the Arabic" lands translated; the row offers Try again
  on failure. One Undo.
- Status's Start placeholders and the next-audience prompts say "paste the copy".
Verified in the pane: the two-audience sample from the request plus an Investor block with a
fact line and a chip line parsed right; a real click on Fill laid the Investor ad out as label,
heading, hook, chips, facts (inserted before the button), button; the copy survived a reload;
0 contrast failures over 24 text runs in light and dark; no script errors. **Not exercised:** the
Arabic card and the auto-translate (the Arabic project's share link bounced the test tab to the
landing page), and real Drive.

# THE OVERLAP IMAGE IS CUT OUT ON UPLOAD (2026-11-05)

Reported as "the cut-out is not working": the Overlap image row read **"Cut-out added"** over a
whole rectangular photo of a tower, which then covered the hero headline outright.

**Cause: CAS never asked for a cut-out.** The rembg service (`tools/rembg`, login item
`ae.provident.cutout`) was up, its weights present, CORS fine — but `image-slot.js` runs it only
on a slot the DOCUMENT marks `data-cutout`, and Organic's agent slots were the only ones marked
(architecture.md's rembg section even records "0 `data-cutout` in Campaign" as the scope of that
pass). The overlap slot stored whatever was dropped, and its caption was the generic
`lab(k, 'Cut-out', …)` — "X added" for any filled slot — so it called an opaque photo a cut-out.

**Fix (rail and runtime only, no paint path touched):**
- `data-cutout="1"` on the overlap `<image-slot>` (`activeFgId`). The slot's own guards carry
  over: an already-transparent PNG passes through byte for byte; a failure keeps the original
  and shows the slot's error line; the service being off is silent at the slot and lands the
  original in ~30ms (measured 28ms).
- The row's caption tells the truth. `_refreshAV` already decodes each overlap picture for its
  size; it now also records `cut` = `CampaignStudio.hasClear(im)` — >2% fully clear pixels on a
  64px copy, tools/rembg's own pass-through test; unreadable answers true (no false warning).
  An opaque picture reads **"Picture added, background not removed"** plus a second line ("It
  covers the headline as a rectangle. Replace it and the background is removed for you." — or,
  with the service off, "…Automatic background removal is not running on this computer, so
  replace it with a PNG that has the background already removed."). An empty row says whether
  removal is on (OPS's `cutoutNote` wording). Nothing is said while the first probe is out.
- CAS now probes the service like OPS: once on mount, then from the 200ms scan (TTL-cached to
  one request per 15s), re-rendering off `provident-cutout`, so starting/stopping it needs no
  reload.
- The tooltip and `CAS-OPS-GUIDE.md` say a photo is cut out for you. The MCP server's
  `adstudio-fg-<vi>` slot now defaults to `remove_background: true` (`tools/studio-mcp/page.js`).

**Verified** (127.0.0.1:8790 test origin, `/dev-signin?as=designer`, a fresh project): a
generated JPEG tower on a sky gradient dropped on the overlap slot → "Removing the background…"
→ stored `data:image/png` (31s cold, model load included) → the preview, the Design canvas and
`buildOps`+`renderOpsToCanvas` export all show the tower with the sky gone and the headline
behind it (export pixel beside the tower (0,0,0), tower window (252,234,161)). The same JPEG put
in directly showed the opaque warning; with the probe stubbed off, the empty and filled rows
showed the off wording and a drop landed the original JPEG. Whole-file diff: 0 artwork-path
lines (the one `drawImage` is `hasClear`'s 64px probe canvas).

**Pictures already in a project are not re-cut.** An overlap stored before this fix keeps its
background; the row now flags it, and Replace cuts it out.

# THE COPY CHECK SHOWS EACH VARIANT'S FEED 1:1 (2026-11-05, by request)
The Ad sets window's text editor (the content team's copy check, and anyone's Edit text) lists
every exported size of every variant beside the words. It now shows each variant's **Feed 1:1**
alone (`sk === 'sq'`; a variant with no 1:1 shows its first size), with a line above the
previews: "Feed 1:1 of each variant · N more sizes" and **Show all sizes** / **Feed 1:1 only**
(`_aeAll`, instance state). The variant header reads "Feed · 1 of 4" while sizes are hidden. All
sizes still render and save as before; only the display is filtered. **Not exercised in the
browser** (it needs a real ad set's content-team link; the stand-in's demo projects have no
files); the script block parses.

## The QR's top-right corner, and what the code opens (2026-11-10, by request)
"On QR code, give option to place it top right, and have a small name of what QR code this is —
scan what's inside." The brand rule said bottom corner only; asked, the user chose to allow top
right (brand-rules.md and CLAUDE.md record the exception).
- **`state.qr.corner = 'top'`** (Left | Right | **Top** in All variants › QR code › Corner; the seg
  widens to the row when it holds three, `.dk-seg:has(> button:nth-child(3))`). The op sits at
  `(W - pR - qs, pT)`; the top band is above the Reels rail, so the plain margin, not `railR`.
  Mirrored it is computed as `W - pL - qs` in the Latin frame and reflected, as Right is. The
  preview's `qrStyle` takes `top: pT` and `right: mir ? pL : pR`.
- **The wordmark's row clears it**: the top cluster already starts at `pT + 1.2·logo + 80`, below
  the QR on every size (1:1 209 vs QR to 166; 9:16 400 vs 364). With the logo at the BOTTOM the row
  is empty, so **`CampaignStudio.qrTopRes(st, v, tk)`** = `tk.qr + 80` there (0 in every other
  case) starts the top cluster under it — buildOps' `y`, `scrimStops(…, qrR)`'s top band and the
  preview stack's `paddingTop` all read it.
- **What the code opens**: `_refreshAV` sees the `adstudio-qr` slot's url change and calls
  `qrRead(u)` (a CampaignStudio method — the Ad sets `Component` class is a different one), which
  runs the browser's `BarcodeDetector` (`qr_code`) on `StudioBase.img(u)`. A URL shows without
  scheme or www ("Opens nakheel.com/…"), text as "Reads …", no code as "Check it · No QR code found
  in this picture" (`--ps-warn`); the full value is the tooltip. No BarcodeDetector (Firefox):
  nothing is shown. `.dk-qrl` under the drop row.
Verified: **op census against `_PRE` (both warm, same workspace): 160 groups, 1,072 ops, 0
differing** — Left/Right × logo top/bottom × left/centre × dark/light × with/without a top
cluster × sq/pt/st/ls/bn. Top right: op and preview QR both at 914,80 (1:1) / 876,260 (9:16);
logo bottom: the top cluster's wrapper at 246 in both preview and op (1:1). A segno test code for
nakheel.com/en/projects/palm-springs read back as "Opens nakheel.com/en/projects/palm-springs".
The three corner buttons are 75px each at 1440, no clipping.
**Open link, not the project's name (same day).** Asked to show the project name off the link
("all QR codes are the same"): the codes are DLD advertisement permits, which open the Madmoun
card at `trakheesi.dubailand.gov.ae/rev/madmoun/…`. That page is a create-react-app shell that
loads Google reCAPTCHA v3 before it asks for the permit's data, so a server fetch reads no
"Project Name" — and getting past the check is not ours to do. A `qrname` op in api/share.py was
written and removed. Instead `.dk-qrl` carries **Open link** (`.dk-qrgo`, `qrLinkOn` / `qrLinkHref`
= the code's raw https value, `target=_blank rel=noopener`), which opens the card in a new tab.
Verified: the line reads "Opens nakheel.com/… · Open link", the link points at the raw URL,
elementFromPoint reaches it.

