<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# OPS templates and the guided run

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

> **SUPERSEDED IN PART: the card is sized off the height AND capped by its column now** —
> `min(58vh,600px,100cqw * 4/3)`, with the preview column as the query container, because a
> height-only card on a 768 tablet was 445px wide in a 368px column and sat on the form. The
> phone card is smaller again. See *ORGANIC WORKS ON A PHONE AND A TABLET* at the end of this file.

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

## THE CLOSING CARD CARRIES A PERMIT NUMBER

The advertisement's own compliance line, at the foot of the `ccta` page. Optional — a blank
draws nothing, so **34 op groups, 34 byte-identical, 649 ops** and no saved post changes.

**It sits on the page's EXISTING bottom line** — SWIPE's own baseline (1360.6 on the feed,
1840.6 on the story, from the same expression) — so the foot of the page carries one line
rather than two. Centred on the canvas, under the centred card. Eyebrow type role at the
page's own small-caps size: **28 / 500 / .14em, uppercased.**

**In `warm`, NOT brass, and that is a decision.** A legal notice should not read as a second
brand accent, and "gold is minimised in canvas output at all" has already taken four
exemptions. One token if it should match the overline.

### THE CTA HAD NO SCRIM AT ALL, so the line needed its own ground

`B.anchor` is `null` on this kind — the card is its own glass surface and the rest of the page
is bare photograph. A run down there measured **1.06:1 over a white photograph**. `B.scrimBot`
is the mirror of the blurb's band (solid at the bottom edge, fading upward), and it is
**sized to this one line rather than the template's 250 wash**: 20 of hold plus `permitFade`
160 keeps the whole band BELOW the card — measured, the band starts at 1153.4 against a card
bottom of 1050.2 on the feed, and 1633.4 against 1290.2 on the story. **13.75:1 after.**

### IT CLEARS SWIPE, AND THE FIRST ATTEMPT DID NOT

A CTA page is normally last, so SWIPE is hidden — but a page added after it brings SWIPE back,
and SWIPE holds the right end of that same line. The permit is centred, so SWIPE's left edge
bounds the HALF width. Stepped down to fit, never solved, per this font's optical-size axis.

**The floor stopped the step-down before it fit.** A 52-character permit (DLD plus RERA plus
ORN is a real one) shrank to the floor and still overlapped SWIPE by **9px**. So the floor is
the BRAND's own type floor (`permitMin` .85 → 23.8) and past it the line **wraps**, up to two
lines stacking upward off the bottom line — two small lines read, one 15px line does not. The
band's top follows the topmost line.

Measured, all four cases: short/last one line 342-738; short/not-last the same, clearing
SWIPE at 853.4; **long/not-last 23.5px on two lines, 787.9 and 674.5, both clearing**;
long/last one 26px line at 110.8-969.2, inside the margins. Preview against op: **dX 0.00,
dY 0.41 canvas px**, weight 500, `rgb(250,248,244)`, tracking 3.916px.

`TIERNAMES.ccta` gained a third name (`Reference`) so the field does not fall through to the
generic table, the same fix `cstats` needed.

## THE STATS BLURB GETS ITS OWN BAND, and the first shape of it was backwards

The stats page's scrim is anchored to its GRID, which is at the bottom — so everything above
that ramp sits on bare photograph. The title survived it; a 32px blurb does not. Measured over
a pure-white photograph, every run in that top block read **1.00:1** before this.

`B.scrimTop` is a SECOND `grad` op rather than extra stops on the first, so the two simply
overlap where a copy-dense page needs both — navy over navy is navy, and CSS multi-backgrounds
composite exactly as two stacked canvas grads do (the preview is one div with two layers, the
first listed painting on top, which is the order the ops are pushed in). Emitted only when the
blurb actually draws something, so the toggle alone never adds a wash.

**THE FIRST SHAPE FADED FROM THE TOP, which gives the LAST line of the blurb the least wash —
exactly backwards.** Measured over white: title 5.89, blurb line 1 3.73, line 2 2.87, **line 3
2.42**. It holds across the copy now and fades beyond it, which is the organic rule's own shape
(`scrimHold` 20 of breathing room, then `scrimPad` 250 of fade):

| run, over a PURE WHITE photograph | before | first shape | shipped |
|---|---|---|---|
| eyebrow (brass) | 1.00 | 2.84 | **4.85** |
| title | 1.00 | 5.89 | **14.59** |
| blurb lines 1-3 | 1.00 | 3.73 / 2.87 / 2.42 | **14.59** |

**And the page still breathes** — it is a band, not a wash. Down the right edge over that same
white photo the red channel reads 77 / 146 / **189** / 167 / 145 at y 500-900, so there is a
real clear window around y 700 between the two bands. "Scrims cover only the text areas, never
the whole photo" still holds.

**A PATCH TRAP WORTH THE LINE IT COSTS: I matched `scrimPad: 250` as a PREFIX of a line that
ends in a comma**, so the comma was carried to the end of my inserted comment and the next
property had no separator — `SyntaxError: Unexpected identifier 'eyePx'`, and the whole logic
class failed to evaluate, so the shell mounted with no engine. The console names it exactly;
**read the console first when the engine is missing.** Match the whole line, comma included.

**34 op groups, 34 byte-identical, 649 ops** — the demo has the blurb hidden, so nothing moves.

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

# THE CAROUSEL TOOK ITS FEEDBACK: SIX CANVAS ITEMS, SEVEN CHROME ITEMS, ONE PASS

Answers to a user-assessed feedback list on the carousel template, plus a set of All-controls
chrome changes. **Op census over all six templates x every slide x both canvases against the
pre-change copy served alongside: 34 groups, 32 byte-identical**, and the two that differ are
the demo TEXT page on both canvases — its body column and its wash, both requested (see
below). Backups: `scratchpad/pre/O17-pre.html`, `C-O17-pre.html`, `image-slot-O17-pre.js`.

## The canvas

**THE TOP-LAYOUT WASH WAS WASHING THE WHOLE PAGE, and the census is what said so.** `far()` in
`csBox` counts everything on the page — SWIPE, a bottom wordmark, the permit — so a top layout's
`far + 250` on any page with a next page was ~1618, clamped to 1: the PRE's text page emitted
`[[0,1],[1,0],[1,0]]`, a ramp from the top edge to the BOTTOM edge. That was the "overlayed
too much". `B.blkFar` is the copy block's own far end, set by each branch, and only that feeds
the scrim; the top wash now ends at the block + `scrimPad` (0.641 of H on the demo text page)
and is no longer forced to the centre either. The bottom rule ("starts at the centre") is the
frames' own and is unchanged.

**Campaign's three scrim controls, on the project (`state.csScrim = {op, fade, hex}`).**
`csScrimOf(state)` resolves a missing record to the pages' original wash — navy, 100, a ramp
over the whole box — byte for byte, which is why 32/34 holds. Fade is Campaign's rule, measured
INSIDE the box: 100 is the three-stop form the pages always emitted; less holds the wash solid
over the copy and ramps the far part (`csScrimStops`). Colour is the user's hex, as Campaign's
`scrimHex` is — a value typed into a control, not a literal at a call site; `CS_SCRIMS` are
the six dark swatches. The preview mirrors the same stops through `csScrimCss`, verified stop
for stop (60% · fade 40% → hold from 0.70 to 1). The band grads (`scrimTop`, `scrimBot`) take
the colour and opacity, not the fade — they carry their own hold.

**Body copy takes the heading's column (881).** `textColW` 704 is retired (declared, unread):
the text page's body and the stats blurb wrap to `headColW`, centred on the canvas axis or at
the 105 inset, so title and body share one right edge. The front page's support lines already
did. The Bullets list stays 472 and its headline keeps what the list leaves.

**Two position presets.** Stats: `Bottom | Top` — Top stacks the grid under the title block,
growing downward, and the blurb's budget is then what the grid leaves above the floor; the
title's line clamp only applies on Bottom. CTA: `Top | Centre | Bottom`, the card on the page's
own top line or its floor; on Bottom the permit band's fade shortens to start under the card
(measured 1241 against a card bottom of 1221). Both default to the drawing (Bottom / Centre),
so an undefined `pos` on a saved page renders as before.

**The permit is 23.8 / Light 300** — one minor-third step under the page's 28px caps, the
brand's own floor, where every other caps run here is 500. There is no step-down loop any more
because the size IS the floor; a long one wraps to two lines as before. `permitMin` is declared
and unread.

**Drag to reorder, on the two templates whose order is the user's.** A carousel's inside pages
(the front page and the closing card hold their ends) and Top agents' five ranks (the order IS
the ranking — `taRank` reads position, photos are keyed by slide id so they follow). Weekly and
the reviews keep their fixed order. `canMoveSlide` / `moveSlide`; one undo entry; `_gdVisited`
is reset because it is by index.

**POINTER EVENTS, NOT HTML5 DRAG-AND-DROP, and that is a verification decision.** The first
cut used native DnD and the pane's automation cannot start one — the rail rows measured
byte-correct with synthetic `DragEvent`s and did nothing under a real `left_click_drag`. This
project ships a gesture only once a real pointer has moved it, so it is `pointerdown / move /
up` delegated once at the document (`dragBind`, called from the shell's mount/update hooks
beside `_rtTick`): a press that does not travel 5px is a click and is left alone (verified —
a row still activates), one that does is a drag with `data-drop` ringing the row under the
pointer, and the release swallows its own click. **A thumb's `<img>` starts the browser's own
image drag and cancels the pointer stream** — measured: one `pointermove`, then nothing — so
`[data-dragsi] img{pointer-events:none}`. Verified with REAL drags: rail Page 03 → above Page
02; strip Page 04 → second; the fixed pages refuse; one undo entry each.

## The chrome (All controls only — the guided window is unchanged, by instruction)

- **The rail holds the PAGE.** In editor mode the builder drops Look (the dock's), Layout and
  the wordmark row (the left rail's), Pages and Save. Each control in one place.
- **Every helper line is a tooltip** — `.gd-tipi`, an `i` beside the label carrying the same
  words (`v.tip`, from the field's hint or a per-kind `TIPS` table); the run keeps them printed.
- **The left rail gained Wordmark `Hide | Top | Bottom`** for a carousel's inside pages, beside
  the layout tiles (`csLogoOn` / `csLogoOpts`).
- **THE DOCK is Campaign's** — one `Post look` pill (Material `tune`) at the stage's foot, a
  rising `.p-dock-b` with the post-wide controls: the carousel's Scrim group (Opacity | Fade
  tabs, one slider, swatches, hex), Wash strength, Photo darkening, Photo strength, Panel
  colour. `shDock` on the shell. Organic has ONE right rail, so the offset is
  `--ps-railr + 28px`, restated over the mirrored Campaign rule that counted two.
- **The canvas bar is Campaign's 44px toolbar** — name, count pill, `Show story`, a new
  `This page` (Material `edit_note`) that scrolls-and-flashes the rail above 1200px and opens
  the sheet below, and a dot-and-word status chip.
- **Campaign's button language on the form**: every `.gd-segs` pair is a `.p-tabs` track (8
  sites, `data-on` on the award tint and the group pills instead of inline styles), Back/Next,
  Save all, the destination and the PDF are `.p-ghost` / `.p-btn`, Add page is `.p-dash`. One
  markup, so the run inherits it — agreed.
- **THE ON STATE'S INK FOLLOWS THE FILL — eighth instance.** Organic's `.p-tabs button[data-on]`
  and `.p-dock-t[data-on]` had no reader in this document until today and still put
  `--ps-primary-i` on `--ps-accent`: **1.36:1 in light**. Campaign's later block had settled
  both; mirrored. A class the library defines and a document never renders is a defect waiting
  for its first consumer.

## Images can be removed, and Replace never worked

**`image-slot`'s Replace dispatched `image-slot:pick` and NOTHING IN THIS PROJECT LISTENS FOR
IT** — it was written for a host with an Unsplash modal. Verified by grep across all five
files. The event is cancelable now and, unclaimed, the slot opens its own picker (verified: the
stubbed input click fired). Edit was fine all along; the strip is opacity-0 until hover, which
is why it read as missing — it shows on `:focus-within` too now.

**Remove** is the third button on that strip (`clearSlot()`), and both studios offer it as a
visible control: Organic's form rows carry Replace / Reframe / Remove under a filled drop
(`slotActs(id)`, preferring the CANVAS copy of a slot for a reframe), Campaign's seven drop rows
carry a `Remove` link under the caption. **A static `ImageSlot.clearSlot(id)` reaches mounted
elements FIRST** — a store-only clear leaves a just-ingested `_local` on screen (measured:
Remove pressed, thumb still filled) — and falls back to the store write for an id nothing
shows (the hidden 9:16's). Campaign reaches it through `customElements.get`, as its other
static calls do; the class is not a global.

## Verification

- Ops: 34 / 32 identical, both diffs the requested text-page changes. Preview against ops in
  one coordinate space: text page 0.42, stats Top 0.42, CTA Bottom 0.48 canvas px, the card box
  exact.
- Contrast, both themes reloaded into, transitions AND animations finished (the dock's
  `p-rise` animation parked at frame 0 read every dock label as 1.00:1 until it was), ancestor
  opacity composited, editor with the dock open + the guide screen: **dark 1, light 1 — the
  pre-existing `✕` at 4.40 / 4.21**; guide 0 / 0; **0 elevation shadows**.
- Sheets: one closing style tag each, comments balanced, brace balance identical to the
  baselines, Organic `sc-if` +20/+20 and `sc-for` +3/+3, Campaign `sc-if` +7/+7.
- Campaign boots at 311 render keys; the seven Remove keys are functions.

**Left as decisions:** the dock closes only from its pill (no outside-click), the carousel's
other pages did not gain per-element positioning beyond the two presets, and the `✕` remove
glyph's 4.2–4.4 is untouched as before.

## A SHOW/HIDE FIELD IS A SWITCH ON THE ROW IT GATES, and a drop's actions stack beside it

Two follow-ups on the form, one markup for both homes (so the run takes them too — unavoidable
and stated). **No artwork line moved**: the whole-file diff against `scratchpad/pre/O18-pre.html`
is 31 hunks and the only marker hit is the removed `fieldShown` gate — a form line, not an op.

**`OrganicStudio.TOGGLES` is the table, keyed by the HOST field.** The Overline's `Show | Hide`
row and the stats blurb's `Hide | Show` row are gone from `FIELDS`; the `eyebrow` and `body`
rows carry a `.gd-switch` in their header instead (`v.togOn/togIsOn/togSet`), and the parallax
ask carries the same switch where its `Off | On` pair was. A switch OFF keeps the row's header
and hides the control under it (`v.fieldCtlOn`); the copy survives. `defOn` says what a missing
value means — the overline was always drawn when unset and the blurb never, which is exactly
how `csBox` already read `eyeOn` / `bodyOn`, so nothing on the canvas changed. `fieldShown` no
longer drops either row: the row IS where the switch lives. Verified: switching the Overline
off removes its op (1 → 0) and its input; switching the Blurb on reveals the rich editor and
writes `bodyOn: 'Show'`; the parallax switch writes `fg` and reveals its drop.

**The switch is `.gd-switch`, form-scoped, not a kit class** — 36 x 20, `--ps-fill-dis` track
off and `--ps-primary` on, a white knob with a 0-offset ring rather than a drop shadow, so the
no-elevation rule holds. Naming it `.p-*` without a library rule would have been the
"class the library defines and a studio lacks" gap in reverse.

**A drop row is the thumb with its actions STACKED beside it and the captions under the pair.**
All six drop kinds (`photo`, `px`, `gfx`, `alogo`, `portrait`, `qr`) were restructured by one
regex over the block shape; Replace / Reframe / Remove are 36px `.p-ghost` pills filling the
column beside a 150px thumb (104px wide in the 322px rail, wider in the run), the caption and
hint follow as `.gd-qrow-t.gd-qcap`. Empty, the row is the thumb alone with the captions under
it. Matches the supplied mock.

## THE CAROUSEL'S WASH IS ONE GRADIENT, ONE CONSTRUCTION, ONE FADE

Reported as "why is the scrim on top so different than the rest, and the universal controls
don't work the same way on it — fade is not affecting it", with a stats page (Bottom layout,
blurb shown) attached. Both halves were real and had the same cause.

**MEASURED BEFORE TOUCHING IT, which is what named the bug.** On that page the two washes were
built differently:

| | shape |
|---|---|
| the blurb's band | **solid 0-441**, then a **250** ramp to clear at 691 |
| the page's own wash | **no hold at all** — a **720** linear ramp from the centre to the floor |

So the top third was FULLY OPAQUE navy — the photograph did not show through it at all — while
the bottom was a graded wash that did. That is the visible difference, and the slab's leading
edge at 441 is the hard line in the screenshot. And the bands were **hand-written stop lists in
`buildOps`** that never called `csScrimStops`: they took the colour and the opacity (both come
through `SC.col`) and could not take the fade, which is exactly what was reported.

**A BAND IS A CLEAR POINT NOW, and that is the whole model.** `B.scrimTopY` / `B.scrimBotY`
replace `B.scrim` / `B.scrimTop` / `B.scrimBot`: a band is solid at its own canvas edge and
clear at that y, and `csScrimStops(B, H, SC)` builds **one** stop list from the two. The
hold-then-fade shape is gone — the blurb's band and the permit's are the same material as the
page's own wash because they are the same construction.

**ONE GRADIENT, not one per band, for a second reason.** Two grads of the same colour
COMPOSITE where they meet — navy at 60% over navy at 60% is 84% — so a copy-dense page could
double-darken a strip between them. Two bands that would meet butt at the midpoint instead,
which is Campaign's own rule for the same situation.

**Nothing existing moved: 34 groups, 34 byte-identical** against the pre-change copy served
alongside. The single-band forms are emitted byte-for-byte as before (the `s > 0` / `s < 1`
guards are there for exactly that), and neither the blurb nor the permit is in any demo state —
so the census proves the shared path and the new shape had to be measured on a built state.

**THE TRADE, STATED PLAINLY.** Letting the photograph through where it was opaque is a
legibility cost on the copy that was sitting on that opacity. White copy over a **pure white**
photograph, at the default fade 100:

| run | before | after | at fade 60 | at fade 40 |
|---|---|---|---|---|
| overline | 14.59 | **7.91** | 14.59 | 14.59 |
| blurb, last line | 14.59 | **2.20** | 4.33 | 11.87 |
| the permit, on the CTA page | 14.59 | **5.69** | — | — |

Over a mid-grey photograph the same blurb line reads **6.25**. The 2.20 is the honest floor and
it is the same alpha (0.37) the stats grid's own top row has always sat at under the page wash —
the template's own shape, now applied consistently at both ends rather than only at the bottom.
**The fade slider is the lever and it reaches every band now**, which is the other half of what
was asked: lower fade holds the wash solid over the copy on BOTH ends and still reads as one
material (measured stops at 60: `0@1 .186@1 .466@0 .5@0 .8@1 1@1`).

**Left as a decision:** the default fade stays 100. Changing `csScrimOf`'s fallback would move
every page of every saved carousel, and "a missing record IS the original wash" is what keeps
the census clean — so the default is a product call, not a defect.

**Verified:** one grad per page on all 5 layouts x both canvases, the ops' stops identical to
the builder's in all 10, and the preview's div carrying exactly ONE `linear-gradient` with the
same stops. Sheet integrity unchanged (one closing style tag, brace balance at baseline, no CSS
and no markup authored by this pass — 4 hunks, and the only `ops.push` line in the diff is the
three grad pushes collapsing into one).

## THE LAYOUT CHOICE IS AN OPTION TILE, and ONE resolver answers where a page sits

By request, with Campaign's Alignment control attached as the reference: the carousel's
**Layout** field is that control now — a big icon over its name — instead of a pill pair. All
five layouts (`seg-opt:` in `FIELDS`), plus the left rail's **Wordmark** row, which is the same
kind of question: a PLACE, not a word.

**`seg-opt:` is a new flag, not a new control.** It parses exactly as `seg:` does and produces
the same `segs`; only the markup branch differs (`isOpt` → `.p-opts` of `.p-opt` tiles).
`.p-opts` / `.p-opt` / `.p-mini` / `.p-mini-i` / `.p-opt-l` were **already declared in this
sheet** — it is mirrored from Campaign's — and were reaching only the left rail's layout
presets, so this needed the form's own sizing (a 46px tile in the 322px rail, the kit's 62px in
the run) and nothing else.

**MATERIAL SYMBOLS ROUNDED AT wght300, WHICH IS NOT THE CUT THE REQUEST LINKED.** The three
names are the request's — `align_vertical_top` / `align_vertical_center` /
`align_vertical_bottom` — and the links supplied were the **Outlined** family. The glyphs
genuinely differ (Outlined draws square bar ends; fetched and compared, 110 vs 566 bytes of
path), and Campaign's own Alignment tiles were checked to be **Rounded** — its
`align_horizontal_left` path is byte-identical to the Rounded cut. One Outlined tile in a rail
of Rounded ones is the inconsistency the icon pass warns about, so these are Rounded. Three
strings in `CS_POSICON` if that should be reversed.

**`OrganicStudio.csPos(kind, f)` IS THE FINDING, and it is why this was not just markup.** A
tile has to light for a page whose `pos` has never been set, and the default differed per kind
and lived in five separate `f.pos === 'Top'` tests inside `csBox` — including one where the
default is the MIDDLE option (`ccta` falls to Centre). A table read only by the form would be a
second place for that to drift. One resolver is read by the form AND by all five branches, so a
tile can never light a position the artwork does not draw.

**74 groups, 74 byte-identical.** Not just the six templates: the carousel was additionally
driven through every position on every page **and with `pos` deleted**, which is the case
`csPos`'s defaults exist to reproduce — 40 extra groups, all identical.

Verified: two tiles on the four two-way layouts and **three on the CTA with Centre lit**;
clicking Top moves the canvas anchor and makes one undo entry; undo restores; the guided run
carries the same tiles (one markup). Contrast both themes, transitions and animations finished:
**1 flag each, the pre-existing `✕` at 4.40 / 4.21**, and **0 elevation shadows**. Sheet
integrity at baseline; `sc-if` +1/+1 and `sc-for` +1/+1 for the one new branch.

# THE CAROUSEL'S FIVE REQUESTED FEATURES, AND THE PASS THAT MADE THEM INTUITIVE

Five things were asked for on the carousel template and then reported back as "included but
not intuitive". Both passes are recorded together, because the second is the useful one: the
first shipped the CAPABILITY and the second shipped the CONTROL, and in four of the five the
capability was never the hard part.

**Chrome only, and proved: op signatures over all six templates x every slide x both
canvases, against the committed build served alongside — 34 groups, 34 BYTE-IDENTICAL.** The
artwork the features draw was settled in the first pass; the refinement moved no pixel of it.

## 1 — BRASS WORD HIGHLIGHTS: the marker stayed, the typing went

`**word**` inside a headline sets that word in `ART.brass`. It is a WORD marker, not a line
one — Campaign's `m.lineHex` is per authored line and cannot pick a word out of a sentence.

**IT HAS TO SURVIVE WRAPPING, which is what makes it more than a find-and-replace.**
`csHiWords` strips the markers into a per-word `brass` flag, `csHiWrapSeg` greedy-wraps those
words (mirroring `wrapPlain`'s own algorithm) and `csHiRuns` merges consecutive words of one
colour into ONE run, each run after the first carrying a LEADING SPACE so its measured width
already includes the gap to its neighbour. **A line with no marker in it is therefore still
exactly one text op** — measured, and that is what makes the feature free for every page that
does not use it.

**THE REFINEMENT IS THAT NOBODY TYPES THE MARKER.** A `**` syntax is a convention a
non-designer will never discover, and the hint that explained it was the fourth sentence of a
field's help text. There is a **Brass highlight** button over the field now, the rich body's
own toolbar shape one row up:

- **No selection takes the word under the caret**, which is the whole point — selecting
  exactly a word with a mouse is the fiddly part of the gesture.
- **Pressing it inside a highlight takes the highlight OFF**, so it is a toggle rather than a
  one-way action, and the button LIGHTS while the caret is inside one. That lit state follows
  the caret through a delegated `selectionchange` listener which re-renders only when the
  answer CHANGES — `selectionchange` fires on every caret move and a forceUpdate per keystroke
  would re-render the form for nothing.
- Addressed by the same `si:key` string `rtApply` uses (`data-hi` on the field), so the
  handler needs no closure over an element and survives every re-render.

The field still STORES the marker — that is what `csHiWords` parses, what a session file
holds, what `csConvert` carries between layouts and what the export reads. Only the typing
went. `baseName()` strips it so a filename never carries a `**`.

## 2 — A PER-PAGE SCRIM, AND IT IS THE SHARED CONTROL'S OWN SHAPE

`csScrimOf(state, f)` takes the slide's fields now: `f.scrimMode === 'Custom for this page'`
puts a page on its own `scrimOp` / `scrimFadeF` / `scrimHex`, and everything else — a page
left on Follow, and the dock's own call, which passes no `f` at all — resolves to the project
value exactly as before.

**THE FIRST CUT WAS A SEGMENTED PAIR AND THREE TYPED NUMBER FIELDS, and typing `40` into a
box to set an opacity is precisely what "not intuitive" meant.** It is a SWITCH on the row
(the `TOGGLES` pattern the overline and the stats blurb already use) which opens into the
dock's own control: a Strength slider, a Fade slider, the six dark swatches and the hex field,
in the dock's own classes so the two read as one control in two places.

**Two labelled sliders rather than the dock's Opacity/Fade TAB PAIR.** The dock uses tabs
because a rail is narrow; a form has room to show both values at once, and a value behind a
tab is a value you have to go looking for.

## 3 — THE PERMIT IS ONE PROJECT VALUE, SHOWN PER PAGE

It was a per-slide text field, so the front page and the closing card each had their own and
the same compliance line had to be typed twice — two fields that can disagree about a legal
number. `state.permit` is the number; each page that can print one carries a **switch**.

**`normState` MIGRATES, so nothing typed is lost**: the first per-slide `f.permit` found
becomes the project's and every page that carried one has its switch turned on, which
reproduces exactly what a saved carousel printed before. The slide's own value is left in
place rather than deleted and `permitFor` still prefers it — which is what makes the
migration safe to run against a state it has already run against.

**On the FRONT PAGE it needed its own scrim band.** A Bottom-anchored page's wash already
reaches the floor; a Top-anchored one does not, so `B.botFar` composes with the generic scrim
assignment through `Math.min` — the mirror of how `B.topFar` composes through `Math.max` for
the stats blurb. A smaller `scrimBotY` covers MORE of the floor, so whichever requirement
needs coverage to start higher up wins.

## 4 — GUIDES FOR THE FLOATING GRAPHIC: draw them BEFORE they fire

Dragging the uploaded PNG/SVG snaps to the canvas centre and the four grid margins.

**TWO THINGS MADE THE FIRST CUT READ AS MISSING, and both are the general lesson.**

- **The snap window was 6 CANVAS px, which at the editor's ~2.45x shrink is 2.4 SCREEN px of
  travel.** A pointer cannot reliably land in that, so the snap almost never fired. It is
  `CS.gfxSnap` = **14**, about 6 screen px — a window you can actually hit, and still far too
  small to catch a drag aimed somewhere else.
- **Only the line that HIT was drawn**, so until the graphic happened to snap, nothing on
  screen said it snapped to anything at all. Every guide is drawn while the drag is live now —
  the six lines faint in `--ps-hair`, the hit one bright in `--ps-link` and half a pixel
  thicker. **The faint lines are the affordance; the bright one is the state.** Measured
  mid-drag: 6 drawn / 0 bright away from everything, 6 drawn / 2 bright at the centre, 0 drawn
  after release.

The guides are positioned in CANVAS coordinates as a SIBLING of the graphic, never a child of
it — a child would be relative to the box being dragged, so a "canvas centre" line would
follow the thing it is supposed to measure.

## 5 — THE BULLETS ARRANGEMENT IS A LAYOUT TILE

`f.bulLayout` — **Side by side** (the drawing's own: headline at the grid's left column, the
list in its own 472 column against the right inset) or **Stacked** (the headline above a
full-width list). One geometry path serves both: only `colX`, `colW`, the headline's measure
and the two anchors differ, and the non-stacked expressions reduce to the originals exactly,
which is what keeps every saved page still.

**It is drawn as OPTION TILES, not a pill pair** — the request's own words were "maybe have
it as a layout feature inside the bullet preset", and this system already draws a choice whose
subject is an ARRANGEMENT as a big icon over its name. `vertical_split` splits a page left and
right, which IS side-by-side; `horizontal_split` splits it top and bottom. Both Rounded at
wght300, the studio's family. `CS_POSICON` is keyed by option LABEL and is not the position
control's alone.

## A LIVE BUG THE TILES EXPOSED: every `seg-opt:` tile lit from `csPos`

`rowFor` computed a tile's ON state as `OrganicStudio.csPos(sl.kind, sl.f) === o` — hardcoded
to the POSITION resolver, and reading `sl`, the ACTIVE slide, rather than the row's own. So a
second `seg-opt:` field would have lit the wrong tile, and in the guided run (where the row's
page is not the active one) even the position control was reading the wrong slide.

`csSegVal(kind, f, key)` is the generic resolver now — `pos` keeps its own per-KIND default,
everything else takes one value from `CS_SEGDEF` — and it is read for `seg:` pills as well.
**That also closes a defect this file had recorded and deliberately left**: a segmented
control with no answer yet lit neither half while the canvas drew a default. Scoped to
carousel kinds, so no other template's control changes.

## A FLAG PARSER THAT MATCHED SUBSTRINGS

`f.flags.indexOf('hi')` would have matched the `Hi` in `seg:Hide|Top|Bottom` if either had
been the same case — the flag vocabulary and the flag VALUES live in one string, and
`indexOf` cannot tell them apart. Flags are matched as whole words now
(`(^|\s)name(\s|$)`), which is the same class of bug as the parser that once split `seg:` on
a space and offered a single option labelled "Just".

## AND THE `d="{{ … }}"` TRAP, AGAIN

The brass button's glyph shipped as an interpolated render key and added a third
`<path> attribute d: Expected moveto path command` to every page load. **The browser parses
the attribute before DC interpolates it** — the trap the SWIPE chevron already records, in
SVG clothing. The glyph never varies, so it is written straight into the markup and the
render key is gone. Back to the file's documented baseline of two (`{{ lo.icon }}`,
`{{ o.icon }}`), which are pre-existing.

## Verification

- **Ops: 34 groups, 34 byte-identical** against the committed build, all six templates, both
  canvases, through `tplSlides` + `TPLDEMO` + `normState`.
- **Every control driven for real, not synthetically**: a real click on the Brass button
  wrapped the selection (`An **Airport** Moves People.`), a second click unwrapped it, a caret
  with no selection wrapped the word under it; the permit typed once printed on the two pages
  whose switch was on and on neither other; the scrim slider and a swatch moved page 1 to 40%
  Slate while page 2 still read the shared 100% navy and the shared control itself was
  untouched; the Stacked tile re-laid the bullets page; a drag snapped to the centre from 9.8
  canvas px away.
- **The legacy permit migration** exercised on a hand-built pre-change state: lifted to the
  project, switch set to Show, and the card still prints it.
- **Contrast, light mode, transitions and animations finished**: the brass button's label
  8.57:1, the hex field 16.96, the scrim labels 19.69 — the new controls clear AA in both
  themes. The button carries the ink it SETS (`#B0905C`), which is the one control in the form
  whose colour is a statement about the canvas rather than about the chrome.
- The test origin's `localStorage` and IndexedDB were cleared, the `_PRE` copy removed from
  the project folder and the server stopped.

## THE HIGHLIGHT ATE ITS OWN SPACES, AND THE BODY TAKES IT NOW

Reported as "it removes the space on the text on the canvas, but on the text box there's
space". Two defects, one model error, plus the feature the same message asked for.

**A RUN CARRIED A LEADING SPACE, AND ONLY ONE OF THE THREE SURFACES KEPT IT.** `csHiRuns`
emitted `"An"`, `" Airport"`, `" Moves People."` and placed each at a cumulative x, so the
gap around a highlighted word WAS the run's own leading space. Canvas `fillText` draws one;
**HTML collapses a leading space in the preview's div, and SVG `<text>` collapses it too**
unless `xml:space` says otherwise. So the export was right and the editor was wrong — which
is exactly the half the user looks at.

Each run carries the plain **PREFIX** before it now, never whitespace of its own, and is
placed at `start + meas(prefix)` — an ABSOLUTE x that all three surfaces compute identically,
with no edge whitespace left for anything to collapse. Measured: every run lands at delta
**0** from where that substring sits in the plain line, and a highlighted line's total ink is
**byte-identical** to the same line unhighlighted — which is what makes centring, wrapping and
the CTA card's hug-width correct rather than nearly correct.

**AND THE WORD MODEL WAS WRONG ABOUT PUNCTUATION, which the fix surfaced.** `Stay
**informed**.` splits at the marker, so the full stop became a word of its own and the
re-join wrote `informed .`. A word now records whether a SPACE precedes it (`sp`), which is
the one fact word-splitting was throwing away:

- `csHiPlain` re-joins with the separator the source actually had;
- a token with `sp` false **can never start a line** — a stop after a highlighted word is part
  of that word as far as a reader is concerned;
- a run glued to the one before it gets no separator in its prefix.

Verified across five shapes — mid-sentence, word-then-stop, first word, last word, two words —
worst delta 0 and total ink equal to the plain line in every one.

## THE BODY TAKES THE HIGHLIGHT TOO, and it shows the brass rather than the marker

`rtLay` wraps by word with the flag carried on the word, exactly as a headline does, and
`hiPut` places the runs — so a highlight survives the wrap in a **paragraph, a quote, a
callout and a list item** alike. One placer serves both the page's own texts and a body block;
they differ only in which list they push into.

**THE EDITOR SHOWS A REAL `<b data-hi>`, NOT A `**`.** This editor's whole premise is that it
draws the body the way the canvas draws it — a quote behind its rule, a callout on its panel —
so a literal marker in a row would be the one place it showed its own storage format instead.
Three things had to move together, and the third is the one that is easy to miss:

- `rtRow` builds the row from `csHiSegs`, styled span for a brass segment;
- **`rtRead` serialises through `rtText`, not `textContent`** — `textContent` returns the words
  and drops the very thing the span was carrying, which would have eaten every highlight on
  the next keystroke;
- **`rtSplit` serialises the tail the same way**, or pressing Enter inside a highlighted phrase
  would hand the new row its words without their markers.

Verified with real clicks and real typing: the round trip is byte-identical to what is stored,
one click on **Brass** marks the selection, a second inside it unmarks, typing next to a
highlight leaves it intact, and Enter inside one keeps the brass on both halves.

**34 op groups, 34 byte-identical** against the committed build — no demo copy carries a
marker, so a body that does not use the feature is unchanged op for op.

## THE STATS ICONS CAN KEEP THEIR OWN COLOURS

Asked for as "show original png on the uploaded media on the stats". The stat icons were
always flattened to the page's ink, which is right for a Material glyph or a navy brand-kit
SVG and wrong for anything whose colour IS the content — a flag, a partner's mark, a photo.

`f.icoTint` is **Match canvas** (the default, and the old behaviour exactly) or **Original**,
and it is Campaign's own graphic-tint control in this studio's third instance of it, after
the floating graphic and the award's partner mark.

**IT IS A PAGE-LEVEL CHOICE, NOT PER ICON.** Two to six icons stand in one grid, and a row
mixing recoloured and original marks reads as an accident rather than as a decision.

**AND THE CONTROL SITS WITH THE ICONS**, inside the stats block at the head of the rows it
governs, rather than as a field in a tier further up the form — the placement lesson the whole
refinement pass turned on. It appears only once there is an icon to colour: a control for a
picture nobody has uploaded yet has nothing to do.

Three surfaces, and each needs the pairing this file already records twice:

| | canvas | preview | SVG |
|---|---|---|---|
| Match canvas | `tintFlat` on the image op | a **MASK** with a background-colour | image + mask + tinted rect |
| Original | **no `tintFlat` key at all** | a **background-image** | the image alone |

**NO KEY, NOT AN EMPTY ONE.** An empty or null tint is the documented trap from the graphic's
own control, where `[data-icon-tint]` still matched and the art was painted white. `mask-image`
takes the art's ALPHA and the background-colour supplies the ink — which is exactly what
`tintFlat` does on canvas — while a background-image paints the file's own colours. Both
contain-fit in the same box, so the icon's rect is **identical either way**: measured, the op's
box is the same to the pixel and only the tint key differs.

**34 op groups, 34 byte-identical** against the committed build — the default is the old
behaviour, so no saved post moves.

# A SEVENTH ORGANIC TEMPLATE: THE REEL THUMBNAIL, 9:16 ONLY

Built from nine supplied drawings, `iPhone 14 Pro – 1..9.svg` (1080 x 1920) and their PNGs.
Template id and slide kind are both **`rcover`**, one slide, shown as **Reel thumbnail** /
**Reel cover**. Every constant is in `OrganicStudio.RCV`; `rcvBox` is the one geometry source,
read by `buildOps`, the preview, the form's fit note and the layout tiles.

**Existing templates: 34 op groups, 647 ops, 34 byte-identical** against the pre-change copy
served alongside (six templates x every slide x both canvases). **Campaign: 24 groups, 336
ops, SVG output byte-identical and canvas pixels identical**, which is the proof its renderer
edit is inert.

## ONE CANVAS, AND `sl.ft` IS "THE PLATE'S FIRST CANVAS"

A Reel cover is 9:16, so the template has no feed, no story toggle and no `_3x4` file. The
plate's first slot renders `mkCanvas(si, 'st')` for this kind (`sl.ft` is the first canvas on
the plate, which on every other kind is the 3:4 feed), `storyVisible` is false for it, and
`OrganicStudio.mainSize(state)` answers 'st' wherever "the" render is taken — the guided card,
the recents thumbnail, the photo's DOM fallback. Export writes one file,
`<first four headline words>_Reel Thumbnail_9x16.png`; the PDF is that one page.

## SEVEN NAMED LAYOUTS, AND POP-OUT IS THE ONLY PARALLAX

| layout | from drawing | text | washes (drawn strength) | photo |
|---|---|---|---|---|
| Masthead | 7 | centred, top | top .5 | .9 |
| **Pop-out** | 5, 9 | centred, top, **cut-out in front of the headline** | top .5 | .9 |
| Editorial | 8 | left, top | top .5 | .9 |
| Caption | 3 | left, bottom | top .5 + bottom .5 | .9 |
| Punchline | 1 | centred, bottom | bottom .674 | 1 |
| Centre stage | 4 | wordmark + headline + tags as one centred block | none | .8 |
| Big number | 2 | headline top, giant figure at the foot | none | 1 |

**Editorial follows drawing 8 (top band only), not drawing 6 (both bands)** — the two
disagree and three of the four top layouts with chips draw no bottom band. `photo` is the
photograph's opacity over the navy ground (`groundFor('rcover')` is `ART.deep`), read through
`OrganicStudio.photoAlpha(state, sl)`, which returns `imgAlpha` unchanged for every other kind.

## THE TYPE SCALE IS THE MINOR THIRD, AND THE DRAWINGS ALREADY STAND ON IT

Small 116.67 · **Medium 140** · **Large 168** · Jumbo 201.6 — the drawings' 140 and 168 are one
step apart exactly. It scales the **whole text block** — headline, figure, tags and the gaps
between them — and never the **wordmark (41px Light on 370)** or the **ADM/CN chips**, by
instruction.

**ONE LEAD FOR EVERY SIZE, 158/168.** The drawings set 140 on a 128 pitch and 168 on a 158
one — looser at the larger size, which is backwards and is drawing slop. A scale has to scale
everything; the Large drawings' ratio also keeps a descender clear of the next line's caps.
Medium therefore sets 3.7px looser per line than drawings 1, 2, 3 and 6.

**THE FIRST BASELINE IS `370 + 1.143 x px`** — 192 at 168, exact on drawings 4, 5, 7 and 8.
Drawings 2, 6 and 9 were drawn 25–58px lower; one rule beats three.

**IT STEPS, IT NEVER SHRINKS.** The size asked for is tried, then each smaller step, until the
block sits inside the 4:5 box with every word on the 894 column; the tile stays lit on the
size ASKED for and the note says what it was set at. Six lines is the cap; past it the note
says it does not fit even at Small. Swept: 7 layouts x 4 sizes x chips on/off x 1–3 lines,
**168 cases, every run inside the box**; stress cases (one long word, eight lines, a 14-digit
figure, six tags) all stay inside it too.

## THE 4:5 BOX IS THE BRIEF

1080 x 1350 centred — y **285 to 1635** — is what the profile grid and the feed show of a Reel
cover. A toggle shows it (dimmed bands, dashed edges, a label in the band) on the canvas and
on the guided card; it is the canvas bar's button on this template (the story toggle's slot),
a switch in the guided Layout section and in the left rail. `state.rcvGuide`, default on,
**stripped** — a view setting, never an undo entry. The export is never marked.

## THE WASHES ARE THE DRAWINGS' OWN, AND THEY ARE TILTED

Each is an SVG `objectBoundingBox` gradient on its own rect, so its isolines are perpendicular
in the rect's unit square — not on the canvas. Solved exactly (`rcvBandVec`): `t = a·x + b·y
+ c` with `a = gx/(w|g|²)`, `b = gy/(h|g|²)`, and a canvas gradient with `D = (a,b)/(a²+b²)`,
`P0 = −c·D`. The left side is ~100px darker. A full-canvas op reproduces the clipped rects
exactly (each band is already clear before its rect's edge).

**`grad` gained an optional `vec: [x0,y0,x1,y1]` in all four renderers** — Organic emits it,
Campaign handles it and emits none, per the parity contract. The preview re-projects each stop
onto CSS's own centred gradient line (`rcvBandCss`). Canvas against SVG: **worst 1/255**.
Wash strength reaches them (`scrimH` 50 = as drawn); `scrimUsed` reads the layout's bands.

## POP-OUT'S REMOVE BACKGROUND IS ENGINE-DRIVEN, NOT A `data-cutout` SLOT

`rcvCut` reads the page's own stored photo, sends it to `window.providentCutout`, encodes the
PNG and stores it in `smp-fg-<id>` through **`ImageSlot.putUrl`** — a new additive static in
`image-slot.js`. A `data-cutout` slot keeps the ORIGINAL on failure, right for an agent photo
and wrong here: a whole opaque photo in the parallax layer covers the headline. On any
failure nothing is stored and the row says why. rembg keeps the photo's size, so the cut-out
and the photo share one crop through `photoPlace`. Real test: **10.4s**, the robot standing in
front of "Big Plans" exactly as drawing 5 has it.

**THE CUT-OUT GOES STALE WHEN THE PHOTO CHANGES UNDER IT.** `f.fgSrc` / `f.fgOut` fingerprint
the photo it cut and what it produced; if the cut-out is still the one it produced and the
photo is not the one it cut, it is not drawn (`rcvCutStale`, read by the op and by
`rcvFgShown`) and the row asks for it again. A cut-out dropped in by hand is the user's.
Layer order: photo → washes → headline → cut-out → chips and wordmark; **the wordmark goes over
the cut-out** where drawings 5 and 9 have it under, so a subject can never cover the logo.

**A replaced photo now re-reads the store twice (300ms and 1.5s)** — measured on a 1.7MB JPEG,
the preview kept the old photo's record while the export read the new one. Preview only.

## THE LAYOUT TILES ARE REAL RENDERS

`rcvSync` / `rcvRenderTiles`: the cover's own photo and words in each layout, through
`buildOps`, key-guarded and settled 220ms after the last change, shown as 4:5 tiles — a cover
fit over a 9:16 render is exactly the safe area. An empty headline shows each layout in its
own drawing's words (`RCV_DEMO`); a Big number or Centre stage tile borrows a figure or tags
so it still shows what it is for. The run asks **Layout (tiles, text size, guide) · Words ·
Pictures (photo; Parallax on Pop-out) · ADM & CN**, then Finish (wash, photo strength, name,
folder, export — no glass, no story). In the editor the Layout section lives in the left rail.

## FIELDS AND TWO NEW FLAGS

`head` (req, area) · `fig` (Big number only) · `tags` (Centre stage only, one field per tag) ·
`adm` / `cn` (digits). **`opt`** is the one exemption from "every asked field is required" —
a blank chip or tag draws nothing, so blank is an answer; only this template's three carry
it. **`chip`** sends a field to the new `permit` section, "ADM & CN". "CN: 6323926" takes the
space the ADM chip has; the drawing's "CN:6323926" is the one place its two chips disagree.

## MEASURED AGAINST THE DRAWINGS

All nine rebuilt with each drawing's own photo and crop and set beside its PNG: positions,
washes, chips, tags and figure match. Centre stage: every tag within 0.4px, the wordmark on
740.4 against 741. Preview against ops: every run within 0.31 canvas px.

**THE ONE VISIBLE DIFFERENCE IS HEADLINE WIDTH, AND IT IS THE RECORDED TOOL QUIRK.** The PNGs
render the headline **untracked**: "Tiny Visitor." at 168px is 744 wide in the PNG, our
untracked advance is 752.7, and at the SVG's own −0.046em it is 652. The weekly and listed
headlines record the same export behaviour and kept the authored tracking; so does this.
`RCV.headTrack` is the one constant if the PNGs' looser look is wanted.

## Also in this pass

- **`.p-ghost[data-on]` ink follows the fill in Organic** — the canvas bar's toggle measured
  1.36:1 in light (white on Tint 16), live on the story toggle whenever it was on.
- Contrast, both themes, editor and both guided pages, rails scrolled end to end: **0
  failures** apart from the documented disabled Back; **0 elevation shadows**.
- Sheet: one closing style tag, comments 317/317, depth 0, `sc-if` +13/+13 on the one-off
  baseline, `sc-for` +6/+6, 0 `d=`/`src=` interpolations; interpolation sweep 231 refs, **none
  unresolved** (211 before).

## Left as decisions

- ~~**The guided run overflows a phone**~~ — **FIXED**: on a phone it is one column and one
  scroller now. See *ORGANIC WORKS ON A PHONE AND A TABLET*.
- **The removal service was left running**: another open studio (the user's own Chrome) found
  it during the test and used it. Stop it with `lsof -ti tcp:7311 -sTCP:LISTEN | xargs kill`.
- A three-photo stack for Centre stage was not built — drawing 4 is one composited image.

# ORGANIC WORKS ON A PHONE AND A TABLET

By request: "refine the tablet and mobile viewport, prioritise the mobile — it needs to be
usable on mobile". Scoped to `Provident Organic Studio.dc.html`, plus the three shared
pieces a phone needs (below). Everything is in **section 28 at the end of Organic's sheet** —
breakpoint rules only — and a handful of JS hunks, each commented "phone", "tablet" or "touch".

## What was broken, measured before anything changed (375 x 812 and 768 x 1024)

- **The guided run did not stack.** A 400px form column beside a card sized off the viewport's
  HEIGHT alone: on a phone the form ran 25px off-screen with the card over it; on a 768 tablet
  the 445px-wide card sat on top of the form in a 368px column.
- **The top bar needs ~1095px.** It scrolled sideways, so Share was 700px off a phone and off
  every tablet.
- **The project browser kept its 248px sidebar** and left the card grid 127px.
- **The template picker centred its 1120px panel**, so its top-left edge was off the screen and
  unreachable. **That was a desktop bug too**: at 1440 x 900 the "Pick a template" heading sat
  140px above the window.
- **The panel bar (Template / Slide, z 70) painted over the browser and the picker** (z 60).
- **In the editor the canvas bar sat UNDER the panel bar** — the ≤1200 rule gave it 58px of
  bottom padding and a later block (Campaign's 44px toolbar mirror) set it back to 0.
- **Every canvas gesture let a finger's drag become a page scroll half way through**, and none
  of them ended on `pointercancel` — so a touch the browser took back left the move listener on
  the document, and the next touch anywhere kept moving the photo.
- **`100vh` on a phone is the viewport with the toolbar HIDDEN**, so the foot of the app sat
  under Safari's toolbar.

## The phone guided run is ONE column and ONE scroller

`.gd-in-zone` is `display:contents` on a phone, so the head, the post and the form fall into
one order inside `.gd-body`, which is the only scroller: **the page's name → its card and the
page strip → the questions → what is missing → Back / Next, sticky at the foot**. A new page
opens at ITS top, card first (`goStep` resets `.gd-body` as well as `.gd-askwrap`), and a
refused Next scrolls the "not finished" list into view (it is the foot of the scroller now, not
a panel beside the button; `scroll-margin-bottom` keeps it clear of the sticky nav).

- **The card is sized to be SEEN, not to fill:** `min(38vh,340px, 100cqw*4/3)` (9:16:
  `min(46vh,400px, 100cqw*16/9)`), so on arrival the first section's head still shows above
  Back / Next — the page reads as a form to fill in. `gdScale()` mirrors it (phone branch).
- **The preview column is the query container** (`container-type:inline-size`), which is what
  caps the card by width at every size — `100cqw` is the column's CONTENT box, measured.
- **The page strip scrolls sideways**, centred while it fits by AUTO MARGINS on the first and
  last tile (not `justify-content`, which would push an overflowing strip's first page off the
  left). The active tile is centred by hand (`scrollLeft`, from `getBoundingClientRect`) —
  never `scrollIntoView`, which would also move the page the strip sits on.
- **The step disc sits in its header** (the editor rail's treatment) — 38px back for fields.
- **The template's helper line is hidden** — the page's own purpose line is already under its
  name, and the note repeats on every page at the height of a field.
- **Every field is 16px on a phone** — iOS zooms into any field set smaller, and does not zoom
  back. **One-line fields carry `enterkeyhint="next"`**, which is what the document-level
  Enter handler does with them. A lowercase attribute passes through DC like `spellcheck`.

## The top bar

| width | what changes |
|---|---|
| ≤ 1100 | the studio switcher leaves — it is still the project browser's first two rows |
| ≤ 880 | Share keeps its icon (`title` / `aria-label` "Share and export" name it) |
| ≤ 760 | **two rows**: wordmark · Projects / folder / Save · Share, then Guided \| All controls across the width · theme · Undo / Redo |

**The two rows are CSS only**: `flex-wrap` + `order`, and the empty `.p-vr` rule element comes
back as a `flex:0 0 100%` line break. **The break forms its own zero-height flex line**, so it
adds a second `row-gap` — 8px gave rows 16px apart, measured; 4px gives 8. `--ps-toph` (56 /
92) is the bar's height, read by `.gd`, the page sheet, the Template sheet (which started at
`top:0`, under the bar) and Share, which is a full-width sheet under the bar on a phone.

## The editor

- **The canvas width fits the STAGE** (`renderVals`' `dispW`). A phone stacks the canvases one
  under the next (`.p-stage` is a column there), so its width is the only bound: `vw - 32`. A
  tablet keeps them in a row beside the Template rail, bounded by `vw - 328` — **the rail is
  272 on screen (240 + 16px padding each side), measured; assuming 240 clipped the canvas** —
  and by `(vh - 300) × .75`. The old rule was `vw - 64` below 900 (640px in a 528px stage) and
  a flat 440 above it (taller than a 1024 x 768 stage). Above 1200px it is untouched.
- **`OrganicStudio.stableVh(vw)`** is the tallest height seen at this width, so a keyboard or a
  collapsing toolbar cannot shrink the canvas under it; a rotation starts it again.
- The stage column makes the panel bar's 62px of room; the dock rises to `bottom:119px`
  (62 + 45 canvas bar + 12). **The canvas bar keeps what only it has**: below 1200px "This page"
  goes (it is the panel bar's Slide), below 900px the template-and-count pill goes (it repeats
  the plates' badges), and the status keeps its word and gives up length.
- **On a coarse pointer a canvas gesture layer takes the pointer only on the ACTIVE slide**
  (`OrganicStudio.coarse()`, `touchLive` in `mkCanvas`): a tap elsewhere activates that slide
  through the canvas's own onClick, and a swipe scrolls. All four layers (listed pan, carousel
  graphic, cover figures, review agent) carry `touch-action:none`, grips via `[data-gdir]`, and
  all four end on `pointercancel` exactly as on `pointerup`. A mouse keeps every slide live.

## Touch

- **REORDER IS A LONG PRESS on a finger** (`dragBind`, `LONG_PRESS` 380ms): a touch that
  travels 8px first is a scroll and is let go; one that holds lifts its row (`data-lift`) and
  its `touchmove`s are cancelled from then on, so the browser never takes the gesture back. The
  rows are `touch-action:manipulation` on a coarse pointer (they were `none`, which made the
  Template sheet's slide list and the page strip impossible to scroll with a finger). A mouse
  keeps the 5px rule. **Verified with synthetic touch pointer events dispatched at the
  hit-tested element** — a quick swipe no drag; hold → lift → drop moved Page 02 to third with
  one undo entry. **Not verified on a real finger**: the pane's clicks arrive as mouse events.
- **A touch screen has nothing to drop.** `image-slot.js` reads `(pointer: coarse)` once:
  the empty state says "Add a picture / Tap to choose" (a leading "Drop" becomes "Add"), and
  Organic's row captions and photo hint say "tap" (`OrganicStudio.tapWord` / `tapCap`, and the
  hint names Reframe rather than double-click). A mouse sees the old words exactly.
- **Open Session without a folder picker opens the SESSION FILE** (`StudioBase.pickSessionFile`,
  `.json`/`application/json` — a phone's picker maps `accept` to a type and the studios' double
  extensions are not one). It said "This browser cannot open folders", so a project saved on a
  computer could not be opened on a phone at all — nor in Safari or Firefox on a desktop. Both
  studios, since the loader is shared. On a phone the sidebar's "Open folder…" chip hides; the
  header's Open Session is the same button.

## The project browser and the picker on a phone

The sidebar becomes a header: the two studios side by side, then All / Templates / Recent /
Continue last as chips; the page scrolls as one and the cards go two up. The carousel chip and
the recents badge shrink with the 165px card so the chip clears the wordmark. The picker is
one template to a row, render beside description. **Campaign got the project-browser rules
only** (mirrored, same markup) — its editor and its top bar at phone width are not refined.

## Verification

- **Artwork: 41 op groups, 705 ops, 41 byte-identical** — seven templates × every slide × both
  canvases (the reel through its seven layouts), against the pre-change copy served alongside.
- **The desktop does not move.** At 1440 x 900, against the pre-change copy: `renderVals()`
  identical on both workspaces; computed geometry (box, font size, colour, background, display)
  **0 differences over 383 + 472 elements**; the splash 1 difference (the new class name). The
  picker moved down 180px, which is the fix. Campaign: **0 differences over 510 editor
  elements**, the splash the same one class name.
- **Contrast, both themes, reloaded into, animations finished, ancestor opacity composited**,
  splash, picker, guided pages, Finish, both sheets and the dock at 375: the only flag anywhere
  is the pre-existing slide-remove `✕` (4.40 dark / 4.21 light), already recorded.
- Sheets: one closing style tag each, comments balanced, brace depth 0; **parsed rules +21 in
  Organic and +3 in Campaign, exactly the authored counts**; `sc-if` / `sc-for` unchanged.
- Measured at 375 x 812, 768 x 1024, 1024 x 768 and 844 x 390: no horizontal overflow anywhere,
  the top bar exactly its viewport's width, the editor canvas inside its stage.

## Left as decisions, not applied

- **Campaign's editor and top bar on a phone.** Its four-column workspace has its own sheets
  and the same canvas-bar-under-panel-bar defect; nothing there was touched.
- **No `interactive-widget=resizes-content`.** With the default a phone's keyboard covers
  Back / Next while typing, as iOS always does; the Enter key moves field to field. Opting in
  would lift the bar above the keyboard on Android only, at ~64px of an already small window.
- **A landscape phone keeps the two-column tablet layout**, with the page's purpose line and
  the helper line hidden below 520px of height. Usable, cramped.
- **Stale template copy seen on the way**: the Just listed card reads "Serif status headline,
  glass price pill, agents and QR" — the serif and the second agent are both gone.

# THE OPS CAROUSEL TAKES A SECOND LOGO, A WHITE OVERLINE AND A PER-PAGE PHOTO STRENGTH

By request (2026-10-02). The mark is `Asset 1.svg` — the PVH monogram over "VACATION HOMES BY
PROVIDENT." — which replaced a first `PVH.svg` lockup the same day.

- **Logo** is post-wide, `state.csLogo` (`'provident'` default, `'pvh'`), in the Post look dock
  and the guided Finish (`cslogo` ask, carousel only). It reaches every wordmark the carousel
  draws — front page, closing card, inside pages' Top/Bottom — through ONE helper, `wm()` in
  `csBox`. The lockup is a bundled glyph (`CS_PVH`, every fill white, base64) drawn as a tinted
  `image` op like the SWIPE chevron, so it takes the page's ink: the orange period goes white,
  because orange never sits on a dark canvas. as wide as the text wordmark's ink (1.5x was tried and read as too big; at 1x its small line is ~7px), its top on the
  wordmark's ascender line (`wmCap`); on the bottom line its foot stands on the baseline; the
  closing card grows by the mark's height. A top mark pushes the centred stats title block
  down to clear it (the text wordmark never reached it).
- **The bundled SVG carries `width`/`height`.** With a viewBox alone it decoded at 300 x 150 and
  the EXPORT drew a cropped "PVI" (the preview's CSS mask hid it). Any bundled glyph needs both.
- **FOUR MARKS NOW, ON THE REEL COVER TOO, IN A DROPDOWN (2026-10-06).** `CS_MARKS` / `CS_LOGOS` /
  `csMark(state)` are the table: `pvh` (Vacation Homes), `pb` (Property Boutique, `Prov-PB-Secondary.svg`)
  `ps` (Property Solutions, `property solutions.svg`) and `prism` (`prism.svg`) beside the text wordmark. Each bundled SVG is cropped to its INK box
  (the source files carry wide empty margins), every fill white, width/height set. Every mark is as
  wide as the text wordmark's ink. `state.csLogo` reaches the `rcover` template as well: `rcvPlan`
  draws the mark in place of the wordmark and moves the headline block down by however much taller
  than the wordmark's box it is (`mkX`), so the gap under the logo is the wordmark's own; the
  carousel's top-anchored blocks take the same clearance (`wmClear`). The Logo control is a
  `<select>` in the Post look dock and the guided Finish (`csBrandVal` / `csBrandSet`).
- **Overline colour**, `f.eyeCol` (`Brass` default | `White`), a per-page field shown only while
  the overline is.
- **Page photo**, `f.photoMode` switch + `f.photoO` slider (10-100), the per-page scrim's shape.
  `photoAlpha` returns it for a carousel page on `Custom for this page`, so the op and the
  preview read one number.

Defaults reproduce the old pages by construction (the text path calls `T`/`TC` with the old
arguments). Verified in the editor: geometry on both canvases, the dock switch both ways, the
per-page slider dimming only its page (.4 against the shared .8), the Finish ask, no console
errors; `sc-if` +3/+3, `sc-for` +2/+2.

# OPS'S RAILS TAKE THE SAME TIDY (2026-10-15)

By request ("now do the same for OPS rails"), section 30 of `Provident Organic Studio.dc.html`'s
sheet. Chrome only — the whole-file diff carries no `ops.push` / `buildOps(` / renderer line.

- **Left rail**: the Template and Slides captions carry their prose as an `i` tip (`tplFoot`,
  new `slidesTip` = the old click-to-edit line plus the drag hint) instead of two paragraphs;
  `slideCount` sits beside Slides. A row's `✕` is `opacity:0` until the row is hovered, focused
  or active (always shown under `hover:none`). The carousel's **Layout** and **Wordmark** and the
  reel's **Layout** and **Text size** are `<details class="p-acc p-acc-ops" data-acc>` groups,
  open by default, their summaries naming the choice (`csTileName`, `csLogoName`, `rcvLayName`,
  `rcvSizeName` — the size reads `Large → Medium` when the fit stepped down). Layout tiles are
  three to a row at 44px; Wordmark is a compact `.p-opts-seg` track, names only in this rail.
  The reel's size hint shows only when it is a fit warning.
- **`accBind` is OPS's own copy of CAS's** (key `ops-acc`), called from the shell's mount and
  update hooks.
- **Right rail (the form, editor mode only)**: a section folds from its head or `.gd-sec-f`
  (`aria-expanded`), controlled — `sec.foldOn` → `data-fold`, `gdFoldSet()` read once from
  `ops-rail-fold`, by section KIND, so a fold follows you page to page. The guided run never
  folds (the button is `display:none` there and `flip` returns early). The seg-opt tiles
  (Layout, Bullets arrangement) are a compact segment in the rail. An empty drop's first
  caption is hidden and the how-to is clamped to two lines until hovered.
- **Colour rows (`.p-colr`)**: the scrim's swatches and hex share a row, in the dock and the
  page's own scrim.

Verified: contrast over both rails and the open dock, both themes, animations finished — the
only flag is the pre-existing `✕` at 4.40 / 4.21 (hidden ones read 1.00 by design); fold
persists across reloads; guided screen unchanged with a fold stored; reel rail folds work;
no horizontal overflow; `sc-if` counts unchanged, `<details>` balanced.

# THE OPS CAROUSEL HAS EIGHT PAGE LAYOUTS: QUOTE, BIG NUMBER AND STEPS (2026-10-16)

By request ("add more layout options on OPS carousel"). Three new slide kinds, all INSIDE pages
(`csEyeKind`: overline, inside-page wordmark, SWIPE, per-page scrim and photo), each one more
branch in `csBox`, so the preview and the export read one geometry by construction:

| kind | layout | fields | positions |
|---|---|---|---|
| `cquote` Quote | brass opening mark (Light 300px, placed by its measured INK via `csGlyphInk`), the words Light 50 / 1.24, name Regular 32, role in 28 Light caps | quote (req, hi), author, role | Top / Centre / Bottom, Center / Left |
| `cnum` Big number | the figure Light, STEPPED down `numSteps` (177 → 71) until it fits 881; its box is the cap height (`numCap` .72); a Regular 41 headline; the rich body | fig (req), label (hi), body (rich) | Bottom / Top, Center / Left |
| `csteps` Steps | headline, then numbered rows on the Bullets page's hairline rhythm — brass Light 41 numeral (`01`, derived from position), step Regular 32 warm, two lines each, five rows | title (req, hi), steps (req, one per line) | Bottom / Top |

- **`CS_OPEN` is what a new carousel opens on** — the original five — so `tplSlides`, the
  template card and every saved post are unchanged; `CS_KINDS` (eight, tile order) is what the
  left rail's Layout tiles and the guided Layout section offer. Every per-kind table gained the
  three: `CS_NAMES`, `CS_POSDEF`, `csSeed`, `csConvert` (`cnum`'s primary is its HEADLINE, not
  the figure; `cquote` has no secondary), `csRich` (`cnum`), `KLAB`, `TIERNAMES`, `FIELDS`,
  `SKEL`, `PAGE`, `FIXEDTEXT`, the rail tile skeletons, and the MCP's layout list.
- **Fixed on the way: `csNorm` seeds `eyeCol` (Brass) and `photoMode` (Follow all pages).**
  Neither was seeded, so EVERY inside page's Words section said "1 to fill in" while the canvas
  drew the default. Seeding the default moves no pixel.
- Verified: op census, seven templates × every slide × both canvases against the pre-change
  copy, **36 / 36 byte-identical** (warm — a cold-font load reported 8 spurious diffs on weekly
  and agents, the documented `wkSpecBox` / unwarmed-weight trap); preview against ops on all
  three new pages, both alignments, **worst 0.49 canvas px**; real clicks on the tiles carried
  the copy (Text → Quote put the title in the quote) and made one undo entry each; typed steps
  numbered themselves; the gate asks for the big number and the steps.

# OPS TAKES CAS'S CHROME: SIZE ROW, SWITCH ROWS, COLOUR DOTS, NUMBER-FREE RAIL HEADS (2026-10-16)

By request ("all the UX and UI applied from CAS, apply on OPS as well and refine them"). Section 31
of OPS's sheet, mirrored from CAS's 25 / 31 / 32 / 39. Chrome only — the whole-file diff carries
no `ops.push` / `buildOps(` / renderer / `ART` / `drawLogo` line.

- **Story size row** (`.p-szh`): "Story 9:16" above each plate's story canvas while it shows, with
  CAS's eye button (`toggleStory`; project-level, so it hides the story on every page). Shown only
  while the story is on — a hidden-story row under every page of a 17-slide weekly is clutter.
- **Post look dock**: a **Story 9:16 switch row** first (`.p-tgl`, `storyAria` / `storyHint`; the
  canvas bar's button stays), Panel colour pairs carry **colour dots** (`go.dot`, also in the
  guided Finish), and the pill has CAS's **turning caret** + `aria-expanded` (`shDockAria`).
- **The editor rail's section heads lose the numbered disc** (CAS's "number is not necessary");
  the state rides in the pill, with a tick when done (`.gd-sec-tk`). **The guided run keeps its
  numbered steps** — there they are the route.
- **An empty drop takes CAS's animated hairline on hover / focus only** (`--od-hl`, `odHairline`);
  a rail of drops all moving at rest would be noise. Off under reduced motion.
- Not ported, because OPS has nothing to attach them to: Ad sets (and its Hairline figure), the
  Copy / Publish workspaces, Turn into and the floating component control, the palette rail,
  the placement preview.

Verified: real click on the switch (storyOn false, rows gone, aria-checked false), the eye hides
the story, the dock caret turns; contrast 0 failures over the dock, form rail, story row and
canvas bar in both themes; console only Chrome's beforeunload notice; braces and comments balanced.

**The Ad sets drop zone reads across (section 42, 2026-10-16, by request):** the Hairline figure
sits LEFT of the title and subtitle (`.as-src-tx`, left-aligned) instead of stacked over centred
text, in both copies. Its frame's empty margins are cancelled with negative margins written off
`--hlw`, so the ink is vertically centred on the text (measured 0.05px) with a 28px gap; under
640px it stacks again. Shell CSS and one wrapper span — no artwork line.

# FOUR MORE CAROUSEL LAYOUTS, LIFTED FROM THE YAS RIVA RESERVE POST (2026-10-16)

By request ("grab content layouts from this post" — Provident's own instagram.com/p/DeUajDxFcE3,
six slides). The carousel has TWELVE layouts now. Four were new shapes:

| kind | page | what it draws |
|---|---|---|
| `cfig` Key figure | 2 | the figure (stepped down `numSteps` until the caption keeps ~38% of the column) beside a caps tag over a caption, a two-part split bar (`barA`/`barB`, warm then brass, proportional), a row of facts |
| `ctable` Price table | 3 | a title over hairline rows — type left, detail at 44%, price right-aligned — and a footnote. Cells take `**brass**` |
| `cicons` Icon grid | 4 | a title over three-across icons (the stats page's `smp-ic-<id>-<i>` slots and Material picker), caps labels, a short last row centred, a rich note |
| `cplan` Payment plan | 5 | a title over a bar split in proportion to the shares (last part brass), % over and stage under each part (a label never overlaps the one before it), caps notes |

Slides 1 and 6 were the Front page and Call to action with extra lines, so they took OPTIONAL
fields instead of new kinds: Front page `kicker` (caps above the headline) and `meta` (a short
hairline then one Light 28 line, `**brass**` allowed); Call to action `meta` (caps under the
button) and `url` (under the wordmark). Blank, each is worth no height — the census proves it.

**`CS_ROWS` is the one spec for the four list-shaped pages** — min / max / default count, the
noun, the form group, an `icon` flag and the columns (`[key, placeholder, required]`). Rows live
on `f.rows` with the count on `f.rn` (`csRowN`, `csRowItems`, normalised in `csNorm`). It is read
by `csBox`, the form's `rows` ask (`csRowsView`: a ‹ › count stepper, a "Payment 3" heading per
row, one field per column, an icon drop plus the picker on the icon grid), the gate (`gdAskIssue`
— every required column, and a share above 0 on a payment plan), the asset loader and Assets/.
A fifth list-shaped layout is one entry there plus a `csBox` branch.

**What the post does that these do not:** its price-table page fades the photo to a WHITE ground
with navy ink. These pages are all on the navy scrim with white ink; a light page would mean an
ink flip through every `csBox` branch and the scrim, so it was left out.

Verified: op census against the pre-change copy, both warm, **36 / 36 byte-identical** (a cold
first load again showed the 8 documented weekly/agents diffs); the post rebuilt page for page
and rendered; preview against ops on all six, **worst 0.50 canvas px** (match by position — the
table repeats "from AED " on every row); SVG export parses on all six; a real click on › added a
fifth payment, the gate named it, typing filled it and the bar re-split 39 / 195 / 156 / 390 / 78.

**Tested end to end and tweaked the same day (2026-10-16)**, from a fresh carousel through the
guided run and All controls, with real clicks and typing:

- **The guided "Which layout is this page?" was a pill track** that held five; twelve ran off
  the form's right edge with a sideways scrollbar. It is the left rail's skeleton tiles now,
  three to a row (`.gd-opts-cs`), and both read ONE `csTileMarks()`.
- **A page's list (stats, facts, rows, icons, payments) is asked straight after its copy** —
  before tier 3, the layout settings. It came after Page scrim and Page photo.
- **Switching layouts takes the NEW layout's `pos`, `align` and `bulLayout`** (`csConvert`).
  Carrying them made a Stats page's Bottom open a Key figure at the bottom, unlike its drawing.
  Everything typed still carries.
- The left rail's tile names wrap to two lines rather than ellipsising ("Payment plan").
- No artwork line changed; the icon picker on the Icon grid set an icon that reached both the
  preview mask and the export's tinted image op.

# A THIRTEENTH CAROUSEL LAYOUT: CARDS (2026-10-16)

From a supplied reference ("The Financial Hook" — two stat cards under a title, a yield badge).
`ccards`: a title over one to four stacked cards, each the house glass (`glassOf`, `hairEdge`,
`TA.panelBlur`, r 20) with the callout's brass rule standing inside its padding, a Regular 41
heading, an optional brass caps TAG on the heading's last line (dropped under it when the two
will not share one) and Light 32 text, three lines. An optional outlined BADGE pill sits top
right, centred on the wordmark's line. Its cards are a `CS_ROWS` entry (`h` heading, `t` tag,
`b` text), so the form's count stepper, the "Card N" rows and the gate came for free.

**Three departures from the reference, all brand rules:** its green and orange accents are brass
(orange never on a dark canvas, green is not in the palette); its headings are bold and these are
Regular; its cards are dark navy and these follow Panel colour (white glass by default — Navy
in Post look gives the reference's look).

Verified: 40 / 40 op groups byte-identical against the pre-change copy (with both sides warm — the
one diff on a cold load was `wkSpecBox`'s documented 761.7 / 753.8 first-measure); preview against
ops 0.45 canvas px; a real click on the tile converted a Bullets page, carried its headline and
opened at Top.

**Icon grid labels take two lines (2026-10-16, by request).** The label is a textarea now (a
`CS_ROWS` column's fourth entry `'area'` makes its cell one, so any list can opt in): Enter breaks
it where the user wants, a long one wraps to the column, and both are capped at `icoLabMax` (2).
Every row of the grid opens by one `capBox` only when some label actually uses the second line,
so a grid of one-line labels is unchanged. Verified with a real Enter in the field: "Clubhouse /
& Gym", both lines centred, rows 150 → 180 apart, preview against ops 0.44 canvas px.

**OPS'S ICON PICKER BROWSES EVERY SYMBOL (section 43, 2026-10-16, by request — "I need to see the
Google icons in OPS, all of them").** With nothing typed, `iconSearch` returns the curated `ICONS`
then the whole of `ICONS_ALL` (3,948 after de-duplication — the curated set carries ~19 names the
popularity list does not); it showed 12 curated before. `iconPick(q)` pages it 160 at a time
(`_iconCap`, instance state, reset when the query changes) and `iconPickVals` gives both pickers
(stats and the row lists) the grid, a count line (`.p-ic-n` — NOT `.gd-hint`, which the editor
rail hides as a tooltip), **Show more** and **Show all**. Grid images are `loading="lazy"`, so Show
all does not fetch 3,948 SVGs at once. **Also in this pass, both studios:** the picker's glyphs are
white (`filter:brightness(0) invert(1)`), invisible on the light theme's pale tiles — light mode
now paints them in ink (`:root[data-theme="light"] .p-ic img`; CAS section 43). Chrome only.

**THE PROJECT BROWSER WAS TIDIED (section 44, both studios, 2026-10-16, by request — "improve UX
and UI" on the splash sidebar and header).** The header title carries a line saying what the view
holds (`shViewSub`, in the shell, off the engine's `tplCount` / `recentCount`); Open session and
New carry their icons (`newLabel` lost its "+"); All has a count (`allCount`); Continue last names
the project it opens (`continueName` — the newest saved project on a fresh tab, "A new, blank
project" when there is none, else this tab's project). The sidebar's **Open folder…** row is
DELETED — it was the header's Open session under another name. In CAS, **Ad sets** sits in its own
**Review** group with `photo_library` (it shared All's grid icon) and an `arrow_outward` mark saying
it opens a window; the viewer panel takes the same icon. **CAS's Templates count said 8 while the
splash shows 4** — `TPL.length * 2` dated from the deleted YouTube row; it is `TPL.length`. On a
phone the title takes its own row. Chrome only; contrast over the sidebar and header 0 failures in
both themes in both studios.

**OPS's Support row takes Ad sets' treatment (2026-10-16, by request — "apply the same sidebar
refinements to OPS").** Everything else in section 44 already landed in OPS in the same pass;
Support was the one row still out of step — it opens a window, like CAS's Ad sets, but sat inside
Session. It has its own **Help** group, a title, and the `arrow_outward` mark (`.p-nav2-go`, after
the unread badge when there is one). Chrome only.

**THE STUDIO SWITCHER ROWS WERE REFINED (section 45, both studios, 2026-10-16 — "still looks
raw").** The chip was a flat block (white when active, grey when not). It is a miniature CANVAS
now — still the studio's own ratio, 36px tall (`shape` width `36 * ratio`), a quiet tile with a
hairline edge carrying a wordmark bar and two headline bars (three `<i>` in `.p-ws-sh`). The studio
you are in lights the chip in the row's own ink (`--ps-accent-i`, bars `--ps-accent`); the other
studio's row shows an `arrow_outward` (`.p-ws-go`) on hover, because choosing it opens another
page, and its chip edge goes `--ps-link`. A "Studio" label heads the pair (`.p-sec-l0`). On a phone
the label and arrow are hidden and the chip keeps its ratio. Chrome only.

**THE HOME PAGE'S HEADER BUTTONS HAVE THREE WEIGHTS (section 46, both studios, 2026-10-16, by
request).** The theme toggle is a UTILITY — no fill until hovered, set apart by a hairline
(`.p-br-sep`, hidden on a phone); **Open session** is SECONDARY — an outline (an inset
`--ps-line` ring, no fill); **New campaign / New post** is the one PRIMARY. All three are 36 tall on
the pill radius; the two labelled ones take the kit's button role (14/600, +.16px); a press sinks
1px (off under reduced motion); each has a title saying what it does. Chrome only.

# OPS'S PAGE FORM SAYS WHAT IS NEEDED (2026-10-21)

By request ("update the UI and UX" of the carousel's All-controls rail), section 33 of OPS's
sheet; one markup, so the guided run takes it too. No artwork line changed.

- **A live defect fixed: carousel fields marked "Optional" blocked the guided run's Next.**
  `gdAskIssue` applied "every asked field is required" (exempting only `opt`) while the
  section pill counted `req` fields — so the Kicker, Key facts line and supporting lines were
  gaps and the pill said "1 to fill in" over a filled headline. `OrganicStudio.fieldReq(kind,
  f)` is the one answer now, read by `gdAskIssue` and `gdAskGated`: on a carousel kind the
  `req` flag decides; older templates keep every field required unless `opt`.
- **Each text field carries a tag** (`.gd-tag`): Optional, or Required while it is empty. A
  leading "Optional —" moves out of the hint into the tag.
- **Placeholders are the hint's own example** (`OrganicStudio.fieldPh`: "e.g. …", markers
  stripped), else "Type here…".
- **The brass highlight is a button in the field's header** (`hiHeadOn`, `.gd-hih`), not a row.
- **The rich body's block types are one track of icons** (`RT_OPS` gained a fourth column, a
  Material Rounded glyph through `maskIcon`; short names Text / Quote / Divider / Callout /
  List). The names hide below 460px of container width (`.rt` is a size container). An empty
  body shows its placeholder (`data-empty`, `data-ph`) and is 84px tall; "0 blocks" is gone.
- **A tier label never sits over a field of its own name** ("Headline" over Kicker and
  Headline); in the rail it is a divider. `.p-opts` is border-box, so the Layout track no
  longer runs 8px past the column.

**The pass across all seven OPS templates (2026-10-21, "go over all template windows").**
Chrome only — no artwork line changed. Found by loading each template's demo state in the
editor (`tplDemoState`) and reading every page's rail:

- **Picking a slide now brings its card into view** (`_pageTick`, shell `componentDidUpdate`,
  keyed on tpl + activeSi): the stage scrolls the plate to centre only when it is off screen,
  and the form opens at its top. It kept the last page's scroll and left the card off to the
  right on a six-page weekly.
- **A tier label needs two or more fields** and none of its own name ("Name / Agent name",
  "Price / Price in AED" are gone); the first one in a section draws no divider. Tier names:
  `Page options` (was Scrim & permit / Permit), `Overline and number` (was The number).
- Labels: a ranking page's photo is **Agent portrait**; the carousel's `align` is **Text
  alignment**, the Bullets arrangement **Arrangement**.
- Placeholders: project fields "Type here…", numbers-only fields "Numbers only".
- **No developer instructions in a designer's caption**: `cutOffNote` and the Pop-out failure
  no longer say "start tools/rembg/serve.sh".
- The award's partner-mark colour pair only shows once a mark is dropped; the group layer's
  Reset positions is a ghost button; the empty page reads "The template writes the headline
  and the button label."
- A half-width field keeps its name on one line and drops its tag under it.

Verified: contrast 0 failures over the rail in all seven templates in both themes; no overflow;
real clicks on slides scroll the stage.

**The same pass on CAS (2026-10-21).** Chrome only, section 55 of CAS's sheet plus the
floating control's tick:

- **The component rail's text field says what the head counts**: an empty text or price small
  label carries a "To fill in" tag (`selTextNeedOn` / `selSubNeedOn`, `.p-ftag`), and the
  field's placeholder is the copy view's own example (`selTextPh` from `COPY_PH`). A price's
  text field is labelled **Figure**, a CTA's **Button label** (`selTextLab`).
- **The scope reads "every variant"** (was "linked across all variants"), so a tag and its
  scope share one line; carousels still read "this page only".
- **Picking a component opens the component rail at its top** (`_selTick`, keyed on the
  selection).
- **The floating component control stays inside the stage.** It was clamped to `.p-body`,
  which holds the rails, so with Turn into's name it was 585px wide in a 555px stage and hung
  Delete over the component rail. It clamps to `.p-stagecol` now, and when its full width does
  not fit it goes icons-only (`data-compact`, the phone rule's own; the full width is measured
  while the words show so it cannot flip back every frame). The phone rule's `button span`
  also hid the Turn into menu's rows — the new rule is scoped to the bar's own buttons.

Not carried over from OPS, because CAS has no counterpart: the slide-picking scroll (a
variant's plate is where you click), tier labels, and the rembg captions.

**The carousel's layout picker is grouped (2026-10-21).** Section 34 of OPS's sheet. The 13
tiles were one undifferentiated grid; `CS_TILEGROUPS` puts them in three — **Open and close**
(Front page, Call to action), **Words** (Text, Quote, Bullets, Steps, Cards, Icon grid),
**Numbers** (Big number, Key figure, Stats, Price table, Payment plan) — through ONE builder,
`csPresetGroups(si)`, read by the left rail (`csTileGroups`) and the guided run
(`presetGroups`). Each tile's tooltip is its `PAGE` description ("Stats — a title and two to
six icon-and-number facts"); tiles take a hover fill, the chosen name is 600, and focus rings
the skeleton. `csTiles` is still computed and now unread. A new carousel layout needs a place
in `CS_TILEGROUPS` or it shows in neither picker.
**And given air, by request ("two columns … breathing room … too cramped").** The left rail's
picker is TWO to a row (tiles 109 x 72, gaps 16 / 12, 22 between groups), and every skeleton
draws inside `.p-mini-in` — an inset box at 16% / 14% that the marks' percentages resolve
against, so no layout's bars touch its tile's edge. The guided run keeps three across in its
wider column, with the same inset and 18 / 14 gaps.

# TOP AGENTS: A WEEKLY PERIOD, AND A ONE-SLIDE "TOP AGENT — SOLO" TEMPLATE (2026-10-21)

By request: the Top agents carousel can be **Weekly** too, and a single rank card exists for an
agent to post on their own channel, weekly to yearly. No existing post moves: both are new
values or a new template, and the carousel's own reads are unchanged.

- **Weekly**: the cover's Period is `Weekly | Monthly | Quarterly | Yearly`; Weekly asks for
  `f.wk` from `OrganicStudio.WEEKS` (Week 1–53, the `weeks` list in both list tables).
  `periodWord` gives "Top Agents of the Week"; `taDate` gives "Week 42, 2026". A week select is
  seeded to THIS ISO week (`isoWeek()`), and any `years` select to this year, in `gdSeedSelect`.
- **`agentsolo`** is one `tagent` slide with `f.solo = true` and its own `period`, `wk`, `mon`,
  `qtr`, `yr`, `team`, `place` (1st–5th, seeded). It IS the rank card: paper ground, texture,
  numeral art, glass panel, cut-out portrait — nothing was duplicated. `OrganicStudio.taSrc(state, f)`
  is the one answer to "whose period and team does this card print" — the cover's on the
  carousel, the card's own on a solo post — read by `buildOps` and the preview's top row.
  `taRank` returns the chosen place for a solo card; `fieldShown` shows the seven solo fields
  only when `f.solo` (tier 4, "Ranking"). Export: `<Week 42 2026>_Top Agent_<name>`, one file.
- `TPLDEMO.tagent` gained `mon`/`yr`/`team` for the solo card; the carousel never reads them.
- **The solo card has no blurb (2026-10-21, by request)**: the panel opens on a cream caps line
  (`taDate · <team> Team`) over a heading, "Top Agent / of the Week|Month|Quarter|Year", at
  `TA.headPx` 66.5 Regular, and the rule, name, role and badge hang off its last baseline
  (`taCard` returns `hd`). The top row is the `provident.` wordmark, since there is no cover to
  carry the brand. Brass caps measured ~1.7:1 on the glass, so the period line is `ART.warm`.
  A new solo post opens on the navy glass (`pickTpl` / `tplDemoState` set `glassFill`), because
  white glass over the paper ground reads near 1:1 until a portrait stands behind it.
  `pagePurpose(sl)` words the page for a solo card.
- **One-line heading and dates, not week numbers (same day, by request)**: the solo heading is
  ONE line, `soloHead(f)` = "Weekly / Monthly / Quarterly / Yearly Top Agent", with the dates and
  team under it. A weekly period prints the DATES the ISO week covers (`weekRange(wk, yr)`:
  "19–25 Oct 2026", "28 Sep – 4 Oct 2026") everywhere `taDate` is read — the cover bar, the solo
  card, file names — and the rank card's top line reads "Weekly top agent - 19–25 Oct 2026"
  (`taTopLine`). The stored value is still "Week 43"; the dropdown labels it "Week 43 · 19–25 Oct"
  (form `opts` carry `l` now, read by the select's option text).
- **Then "Top Agent of the Week" (by request, 2026-10-22)**: `soloHead` reads "Top Agent of the
  Week / Month / Quarter / Year", still ONE line (measured 619–722 of an 810 column at 66.5), and
  the solo card draws NO hairline under its wordmark. The numeral still hangs off `ruleY`, so it
  does not move; the carousel's rank cards keep their rule.

# THE REEL THUMBNAIL TAKES A DLD QR CODE, HIDDEN BY DEFAULT (2026-10-23)

By request. The supplied drawings carry none, so it follows the weekly property page's
arrangement — the code stacked ABOVE its number — with the ADM / CN chips as the number:
`f.dldOn` (missing = hidden) on the `rcover` slide, slot `smp-qr-<id>` (the weekly page's own
scheme, so the asset loader, Assets/ writer and export guard needed one `|| 'rcover'` each).
`RCV.dldQr` 160 with the weekly's 6px quiet-zone ring and 4px corners (`drawQr`), 18 above the
chips, on their axis (centred or the 93 column); with no chips it stands on their line (1602).
**`rcvBox`'s `chipsTop` is the QR's top while it shows**, so every layout's anchor (bottom
baseline, figure, Centre stage's limit, the top layouts' floor) clears it with no other change —
a Caption headline climbs 178px. The preview draws it as an `rcvRects` entry through `qrBase`,
reading `_slotUrls` (which now includes `smp-qr-*`). The form's ADM, CN & DLD QR section ends in
a `qr` ask with `dld: true`: a header switch (`togOn`), the drop only while on (`qrBodyOn`);
gated and named in `exportBlockers` (both copies) only while on. Verified: op census 37 / 37
byte-identical against the pre-change copy; preview box equals the op's (93, 1376, 160);
the switch by a real click; the layout tiles carry the uploaded code.

# OPS'S TOP BAR TAKES THE SAME HIERARCHY (2026-10-23)

By request ("do the same for the OPS top bar"), one appended block at the end of OPS's sheet plus
two markup touches. **Share is the one solid navy button** (`--ps-primary`, open/hover
`--ps-primary-h`). A hairline (`.p-top-sep`, hidden on a phone) sets it off from the theme toggle
and the Undo/Redo capsule. A **dirty Save is the resting tint** (`--ps-accent` / `--ps-accent-i`)
with its dot, not a second solid. Nothing wraps (`white-space:nowrap`), and a long Source-folder
name truncates at 180px (`.p-tl`). The trio's labels show from **1360** (it was 1400): the bar
measures 1296 with the studio switcher showing and 1327 with a dirty Save. Below that the trio is
icons only. CAS's bar is unchanged.

Verified at 1440, 1360, 1320, 1024 and 390, in both themes. No overflow. Bar labels measure 8.57
to 19.69:1 in light. No console errors. Chrome only.

# OPS TAKES CAS'S REDESIGN (2026-10-30, /impeccable)

By request ("redesign OPS, consider all the design changes you did for CAS"). Section 47 at the
end of OPS's sheet, plus markup and render keys. Chrome only: the one new `buildOps(` call in the
diff is a read (thumbnails); no artwork line changed.

- **The left rail is the post's pages as layers** (the user chose real thumbnails over sketches):
  `.ol-h` heading (template name, "5 pages", the two old tips on them), then `.sn-list` — each
  `.p-nav` row keeps its class, `data-dragsi` and grip (drag to reorder is unchanged) and shows
  `.sn-th`, the page's own render, over name and hint; a bin (`.sn-x`, `removeOn`) replaced the ✕.
  `.sn-list > *{flex:none}` is load-bearing: a scrolling flex column shrinks its rows otherwise.
  The Layout / Wordmark / reel accordions sit in `.sn-foot`, pinned (hidden when empty via
  `:has`). `addSlideLabel` lost its "+" (the button draws one).
- **`navSync()`** renders the thumbnails: `buildOps` at .12, WebP .82, keyed per slide by
  `gdSlideKey` with the scale term swapped, settled 350ms after the last change, run from the
  shell's update hook in the editor. On failure it marks every page tried, never loops.
- **Plate head = CAS section 68**: `.pv-h` (name, Editing / Edit, bin), a size row
  (`ftHead` Feed / Reel cover, `ftRatio`), and `ftMeta` is the pixel size alone.
  `badgeStyle` / `activateStyle` / `removeStyle` are computed and unread.
- **Post look is an inspector** (`.p-dock-b.dk`, CAS section 67's rows): Story switch
  (`dkStorySub`), Scrim (Opacity | Fade, a range, the colour row), Wash, Photo darkening, Photo
  strength, Logo select, Panel colour. Needs the `.p-dock-b.dk input.dk-range` specificity: an old
  `.p-dock-b input[type=range]{width:100%}` stretched them.
- **Top bar**: the studio switcher and Guided | All controls are a quiet fill (CAS's nav rule);
  Share stays the one solid button.
- Verified: real clicks on a page row and Panel colour; contrast 0 failures over both rails' new
  parts, the plate heads, the dock, the top and canvas bars in light (88 runs) and dark; 0
  elevation shadows; the bar fits at 1440; phone rows 60px with the foot scrolling; guided screen
  unchanged; no console errors. OPS's home sidebar was not given CAS's section 62 redesign.

**The guided window took the same language (2026-10-30, /impeccable, section 48 of OPS's
sheet).** One markup serves every template. The form head drops its kicker: `.gd-ht` is the
page's name with `gdHeadMeta` beside it ("Page 2 of 6" / "Last step"; the template's name in the
All-controls rail), then the purpose. The preview card is wrapped in `.gd-plate`: `.gd-pvh` (the
template's name and a size chip, `gdPvSize`) over it, `.gd-pvm` (`gdPvDims`) under it; the card
keeps its own height-based size (`.gd-plate > .gd-card{align-self:center}` — stretched, it would
lose its aspect). Strip tiles take the left rail's thumbnail treatment (5px corner, hairline ring,
2px link ring on the current page, green done, amber warn). The numbered steps stay. Verified on
all eight templates in dark (0 contrast failures, head width equals card width, card inside the
column), three in light, and at 375 (one column, no overflow).

# TEMPLATE POLISH: EVERY CAROUSEL RUN SITS ON WASH (2026-10-30, /impeccable)

By request ("refine the template designs in OPS", polish only). Every template's demo state was
rendered at 1080 over a bright and a mid-grey stand-in photo, and every text run measured
against the pixels actually behind it (render with the text removed, sample its box, worst
point). Large text bar 3:1 (>=32px, or >=24px at 500), else 4.5. Two carousel defects, both
fixed in `csBox` / `csScrimStops`; no other template moved.

- **Runs outside every band.** The bands follow the copy BLOCK, so the stats title over a bottom
  grid, a top wordmark over a bottom block, SWIPE under a top block sat on bare photograph
  (1.2-1.3:1 over a bright sky). After the band assignment, any `B.texts` run not `scrimPad`
  inside a band extends the band on its own half, clear `scrimPad` past it. Runs inside
  `B.card` or a blurred rect (callout, glass cards) are skipped.
- **The ramp eases** (asked and approved): 1-(1-p)^3 between the same clear and solid points
  (stops at p .1/.2/.33/.5/.7), so copy near the clear end sits on wash. Fade keeps its meaning.
- Result over the bright photo, navy glass, all carousel pages and both canvases: 25 failing
  runs -> 2, both the bullets page's brass overline (brass is a mid tone; it cannot clear 3:1
  over a near-white photo through partial wash).
- Op census against HEAD served as `_PRE`: 37 groups, 29 identical; the 8 that differ are the
  carousel pages with a wash (front, stats, bullets, text x feed/story), and in each the ONLY
  changed op is the `grad`. The preview's `scrimStyle` reads the same stops (verified 8 and 14
  stops computed). Every saved carousel gets a little darker behind its words.
- **Found and left, by recorded decision:** the default WHITE glass (.22) over a bright photo
  puts listed / weekly-spec / review / CTA-card copy at 1.1-2.3:1; Panel colour -> Navy fixes
  it per post. The brass designation on navy glass over a bright photo is 2.8 (recorded). The
  weekly listing number reads 3.1:1 over a bright photo at the default wash strength.

**The Unbranded strip became a POPUP the same day, by request.** The look host (`[data-look-host]`)
moved from under the stage into `.p-lkdock` after the switch; `LookStrip` draws `.lk-pop` there —
a header with the readability status, a `.p-tabs` track (Colour / Type / Shape / Saved; the tab is
`adstudio-look-tab`, per computer) and one `.lk-sec` at a time (`.lk-strip[data-tab]`). There is no
separate pill: the **Unbranded** button (`data-lkbtn`, a caret `.p-lkcv`) is the toggle —
`lookToggle(true)` while the look is on flips `S.open`. Open is page state, never stored; it closes
on Escape or a pointerdown outside the host and the switch. `html.lk-open` turns the caret and
`aria-expanded` is set on the button. The dock no longer rides above a strip (`--lk-h` is gone).
Where the switch and the All variants row do not both fit (a ~630px stage at a 1512 window) the
switch sits one row up (`.p-body .p-lkdock` at 106 / 159px — the bare `.p-lkdock` base rule is
declared later and won at equal specificity). Contrast 0 failures over every tab in both themes.
