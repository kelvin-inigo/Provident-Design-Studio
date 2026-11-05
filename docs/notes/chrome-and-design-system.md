<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Chrome and ui-design-system — tokens, re-skin history, contrast

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
**REVERSED IN ORGANIC:** a bar that scrolls hides its controls as surely as dropping them —
Share sat 700px off a phone. Organic's bar is two rows on a phone and drops only the studio
switcher (still the project browser's first rows). See *ORGANIC WORKS ON A PHONE AND A
TABLET*. Campaign's editor bar still scrolls.

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
  **CLOSED** — Organic's Undo / Redo are in the history capsule, its Share takes the turning
  caret and its bar the button role; see *BUGS THE PASS FOUND* at the end of this file.

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

# THE KIT CARRIES THE CONTROLS THE STUDIOS SHIP — section 24 (2026-10-21)

By request ("are these refinements reflected on ui-design-system?" — they were not). Section 24 of
`provident-ui.css` brings back upstream the controls built straight into CAS and OPS after
section 23: switch row `.p-tgl`, choice cards `.p-rcs`/`.p-rc` (`.p-rcs-sm` the Share panel's
10px), action row `.p-arow`, size row `.p-szh`/`.p-szb` (with the `.i-on`/`.i-off` glyph swap),
reset `.p-rst`, folding section `.p-acc`, compact segment `.p-opts-seg`, colour row `.p-colr` and
the swatch `.p-sw` (the library had no base rule for it — swatches rendered as UA buttons),
section head `.p-shd`, studio switcher row `.p-ws`, canvas-bar `.p-cvname` / `.p-cvst`. Values
are CAS's WINNING rules, unscoped from the rail they shipped in. The guide's new **Shipped
controls** section (`#shipped`) shows each with CAS's real markup; the tokens JSON is 3.2.0.

**Nothing is owed to the consumers**: CAS and OPS already carry these rules (this was
mirror-to-kit), and the image tool uses none of them. App screens (`.hb-*`, `.as-*`, `.cw-*`)
and canvas fixes stay out of the kit by design.

**A guide fact row whose label is a geometry word (height, width, padding, type, radius, size,
tracking, weight, line-height) is OVERWRITTEN by the page's live-facts script**, measured off the
first control in the specimen — so a choice-card "radius" measured the grid (0px) and a reset's
"size" measured its font size. Name the control with a `class` row, or use a non-geometry label.

Verified: self-test 13 AA / 3 exempt / 0 fails in both themes, 0 contrast failures over the
specimens (an open fold's hidden value excepted), 0 UA buttons, 0 elevation shadows, solid
navy fills strokeless (the swatch's ring excepted, by rule), 1 `CSSFontFaceRule`, brace and
comment balance 0.

# THE UPLOAD ROW IS ONE CONTROL IN BOTH STUDIOS (2026-10-21)

By request, with a screenshot of OPS's four stacked pills ("Edit in Photoshop" broken over two
lines). The same CSS block is in both sheets (`.up-acts`, `.up-a`, `.up-rm`), and the markup
is the same shape: thumbnail, then a quiet ACTION LIST beside it, icon and short word each, left
aligned — **Upload** on an empty slot; **Replace, Reframe (photos only), Photoshop or
Illustrator, Remove** (danger ink) on a filled one. Captions sit UNDER the row.

- **Which actions show is read off the thumbnail's own `data-done`** with sibling selectors
  (`.gd-drop` / `.p-drop` `~ .up-acts`), so no render key gates them. OPS's `slotActsOn` sc-ifs
  are gone (7 rows); CAS's 10 drop rows were rebuilt by one regex.
- **The Photoshop label is the app's name alone** (`slotPsLabel` in OPS, `psLabel` in CAS); the
  full sentence is the tooltip.
- **CAS's Upload / Replace and Reframe are delegated** (`[data-up]`, one click listener in the
  shell's mount): the picker opens on the row's own slot, and Reframe prefers the CANVAS copy of
  the same id. CAS had no Replace or Reframe in its rails before.
- **CAS's fill map now follows a picked file**: a `MutationObserver` on `data-filled` refreshes
  `_refreshAV`. The dialog path fired no drop, so the rows' done state stayed stale.
- Widths measured: OPS rail thumb 136 (actions 119), CAS rail thumb 116 (actions 111) — the
  longest label, Photoshop, needs 107. An empty CAS slot hides its caption's first line, which
  repeated the placeholder.

**The Copy view took the same pass (2026-10-21)**, section 56 of CAS's sheet:
- **Brief pictures are the upload control**: each tile is framed like `.p-drop` (dashed empty,
  green when filled) with the `.up-acts` list under it — Upload / Replace (delegated: the
  handler now accepts `.cw-br-pic` as a row), As graphic, Remove. The old pill and × are gone.
- **An empty word field carries "To fill in"** (`needOn`, in the Copy view and in Ad sets ›
  Edit text, which shares the markup); `.p-ftag` is a global rule now, not rail-scoped.
- **"Optional" is a tag**, not a lowercase "optional —" in the hint: Notes for Claude, Google
  Drive folder, and the folder/pictures fold's summary.

## THE TOUCH LAYER — TABLETS, PHONES, SAFARI (2026-11-05, /impeccable adapt)
CAS section 69 and OPS section 29, the last block of each sheet, mirrored rule for rule.
- **Measured before:** the ad set / Drive flow (`.p-flow`) joined the bar after both bars were
  fitted. OPS ran 110px past the edge at 1024 and 241px at 820; at 375 its two rows became four
  inside the 92px bar (wordmark at y −24). CAS at 375 was one 1080px row clipped to the screen
  (Design unreachable), its plate stood 6px past the edge, and its two docks overlapped.
- **Three widths:** 961–1180 one row, the flow drops `.p-flow-t` and Share its word; 761–960 two
  rows (`--ps-toph` 92, `.p-vr` the line break, the flow inline on row 2); ≤760 the same two rows
  and the flow `position:fixed` at the foot over the panel bar (`--ps-pbh` + `--ps-flh` on
  `.p-shell`; stage column, docks and rails pad by both). CAS's Ad set screen
  (`data-screen="copy"`) hides the strip — its card has the same button. OPS's guided run drops
  the strip to the very foot, ends `.gd` above it, and makes its button an outline so Next is the
  one solid action.
- **Pinned at 56px, now `var(--ps-toph)` at ≤960:** `.cw` (CAS) and `.shl-panel` (share-link.js).
- **CAS dock on a phone:** `.p-dock-r` is one row, Add Variant and All variants at equal widths
  (nowrap); the Brand switch rides above it.
- **Safari:** `viewport-fit=cover` on both studios and the home page; safe-area insets on the bar,
  the panel bar and the flow strip (the home page pads `body`); `text-size-adjust:100%`; no tap
  highlight; `overscroll-behavior:none` under `pointer:coarse`; fields 16px on phones. Every
  canvas `backdrop-filter` / `mask-image` already carried its `-webkit-` twin — none touched.
- **Proved:** whole-file diff — the viewport meta and one CSS block per file, zero artwork lines.
  Desktop bar at 1440 unchanged (56px, fits). Seen in the Browser pane at 375 / 820 / 1024 / 1440;
  not yet seen on a real iPhone or iPad.
