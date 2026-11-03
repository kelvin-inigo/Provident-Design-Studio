<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Architecture, runtime, storage and shared code

> **Acronyms, by request (2026-09-28):** **CAS** is the Campaign Ads Studio
> (`Provident Campaign Studio.dc.html`) and **OPS** is the Organic Post Studio
> (`Provident Organic Studio.dc.html`). Older sections spell the names out.
>
> **`CAS-OPS-GUIDE.md` is the user-facing guide** (written for Claude Cowork to reference). When a
> change alters a label, a button, a flow or an export name a user sees, update the guide too.

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

`CampaignStudio.TPL` holds four starting points lifted from the original `figma-kit/templates` (deleted 2026-10-01) —
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

## Recents live in IndexedDB

> **RECENTS ARE SAVED PROJECTS NOW, and only those.** An entry is written by a save or by
> opening a session file, never by leaving a project, and a save shows on the splash at once.
> See *RECENTS ARE WHAT WAS SAVED* at the end of this file. The storage below is unchanged.

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

> **SUPERSEDED IN ONE PART: the box is shrunk with a `transform` now, in every engine, not with
> `zoom`** (`StudioBase.scaleBox`). Laying the box out at canvas units is unchanged and still the
> point. What changed is the shrink, because `zoom` turned out to set text at its ON-SCREEN size —
> in WebKit for every run and in Chrome for some — and "both keep the used font-size at canvas
> units" below was measured in a case Chrome happens to get right. See *THE PREVIEW IS SHRUNK WITH
> A TRANSFORM* at the end of this file. The bullets about `uz()`, `offsetWidth` in canvas units and
> `getBoundingClientRect` in CSS px all still hold under the transform.

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

# THE iOS APP SHELL WAS DELETED (2026-10-21)

By request. The local `ios/` folder is gone, and so are its hooks in the studios:
`StudioBase.nativeShell()` and its share-sheet branches in `deliver`, `download`, `saveAs`,
`saveSessionCopy` and `deliverWord`; `providentNativeCutout` in `runtime.js`; the Vision branch
of `OrganicStudio.cutOffNote`; and the "Share sheet" destination in both Share panels. Do not
rebuild it. What it FOUND stays: the transform preview and the touch fixes below.

# THE PREVIEW IS SHRUNK WITH A TRANSFORM, IN EVERY ENGINE — `zoom` set text at its on-screen size

Found by running the studio in the iPhone shell's WebKit, and it is the most important thing that
work changed in the studios. The editor's canvas preview is laid out at canvas units (1080 wide)
and shrunk to its plate; `canvasStyle` did the shrink with `zoom`.
**`StudioBase.scaleBox(z, W, H)` does it with a transform now, in BOTH studios and every engine**
— `transform: scale(z)` from `0 0`, plus negative right/bottom margins that collapse the layout
box to the on-screen size, which is what `zoom` did on its own.

**Zoom was wrong in all three engines, three different ways**, all measured run by run against
what the export draws (`measureText + len × ls`), at a plate's scale of .33–.41:

| engine | under `zoom` | under `transform` |
|---|---|---|
| WebKit ≤ 26 (Safari, the app before macOS / iOS 27) | a zoomed box's rect read UN-zoomed; a cqw font size zoomed twice (10cqw at zoom .5 painted 25px, not 50); text 3–25% wide | exact |
| WebKit 27 | the rect is fixed and the TEXT is not: 93 of 98 runs >2% wide — 98px headlines +6%, 16px tracked caps **+81%**, because text is set at its on-screen size (the optical-size axis widens it) and the 9px minimum font size inflates anything that lands under it | **98 of 98 within 0.21%** (Organic), 83 of 83 within 1.6% (Campaign) |
| Chrome 152 | exact, EXCEPT eight Light 27px runs — the listed card's title line and all seven review-quote lines — **10–12% wide** | **98 of 98 within 0.21%** |

**The Chrome case is worth its own paragraph, because it hid for months.** Those runs are set at
optical size **11** — their on-screen size, 27 × .407 — where the export sets them at 27: forcing
`font-variation-settings:'opsz' 27` gives 316.1, the export's width exactly, and `'opsz' 11`
reproduces the preview's 351.9. Every other run in the same canvas keeps its own optical size. A
copy of the canvas outside the plate measured right; the one plate-scoped rule
(`.p-plate *{unicode-bidi:plaintext}`) matched, and switching it off changed nothing. Best guess:
Chrome shares one font instance between a zoomed 27px Light run (computed size 11.0px) and the
chrome's own 11px Light text. **It was not chased further, because the transform removes the whole
class** — no text is ever set at a size other than its canvas size.

**Proved nothing moved in Chrome except that fix.** A/B, `zoom` against `transform`, in one viewport:

- **Organic**, seven templates with and without the story: every plate, canvas, bar and positioned
  layer within **0.6 screen px**, the stage's scroll extents identical — except the listed card and
  the review, by **16.7 and 14.8 px**, which is exactly those 27px runs losing their extra width.
- **Campaign**, four templates × both palettes: within **0.2px**, no text run more than 1px, stage
  extents identical.
- Phone (375) and tablet (768): no page overflow, canvases inside their stage. The photo Reframe
  overlay opens aligned to its frame (the spill centred on it to 0.5px; `_zoomFactor()` reads 1, so
  image-slot applies no correction — it only ever undid `zoom`). A REAL pointer drag on the listed
  card's photo moved `phx` 0 → −0.339, with the op and the painted preview identical
  (−1105.7, 0, 2560 × 1440), and the pan layer the element under the pointer at 5 of 5 points.

**What the transform changes, and it is all benign:** the canvas becomes a stacking context and a
containing block, so its own z-indexed layers are confined to it (they used to escape and were held
only by `overflow:hidden` — see *The card went WHITE*); `offsetWidth` inside stays in canvas units
and `getBoundingClientRect` reports the on-screen rect, exactly as under Chrome's zoom, so no
gesture changed. `cq()` in Organic writes px rather than cqw — it had to under WebKit's old zoom, and
px cannot depend on how the box is scaled; Campaign's cqw literals are exact under a transform.

**TWO DETECTORS WERE SHIPPED FIRST AND BOTH WERE WRONG, which is the lesson.** The first
(`legacyZoom()`) recognised WebKit by its rect behaviour; macOS 27 fixed the rect and kept the text
bug, so the detector said "fine" and the app's preview came back 81% wide. The second
(`zoomTextOk()`) measured one zoomed run's width; it was right about WebKit and passed Chrome while
two of Chrome's templates were 11% out. **A check that tests one property of a faulty mechanism
passes the day the fault moves to another property. Do not detect — do not use `zoom`.**

**The measurement is the width probe, and it needs no screenshot:** for each template × slide (or
size), put the demo state in the editor, then for every text op compare the DOM run's Range width
divided by the on-screen scale against `measureText(text) + len × ls`, and its left edge against the
op's x. It runs unchanged in Chrome (the pane, via `javascript_tool`) and in WebKit (the local shell's
`catalyst-check.sh`, see `ios/NOTES.md`). A run the DOM breaks into words (an op per word)
does not match and is skipped; about half the runs match, which is plenty.

**Two survivors the probe shows in BOTH engines, so they are preview offsets, not engine faults:**
the ranking card's place-badge label sits **4.4–5.4 canvas px** left of its op on all five ranks,
and Campaign's 16:9 labels measure **~1.5%** wide (22px and 32px runs) — identical under `zoom`, so
they predate this. Neither was touched.

# WHAT A TOUCH SCREEN FOUND, when the studio ran in the iOS Simulator

The shell was run in the iOS Simulator (iPhone 18 Pro, iOS 27, 402 x 874 pt) through every flow a
mouse never exercises. **It found one defect that had been live in both studios since the first
commit, and a run of smaller ones that only a touch screen shows.** Everything below is chrome,
storage or copy: no `ops.push`, renderer, geometry source or `ART` / `PAL` line was edited for any
of it.

## THE FILE PICKER NEVER OPENED FROM A SLOT, anywhere, since the first commit

`image-slot.js` found its file input with `root.querySelector('input')` — the FIRST input in the
shadow root, which is the reframe overlay's zoom slider (`.rfc-z`, declared above it). So every
click-to-browse, "Tap to choose" and Replace called `.click()` on a range slider, and the change
listener sat on the slider too, blanking its value on every release. It is
`querySelector('input[type=file]')` now. **Invisible on a desktop, where photos arrive by drag and
drop; fatal on a phone, where the picker is the only way in.** Found by an in-app probe that
wrapped `HTMLInputElement.prototype.click` and logged `click() on input type=range`.

## The rest of what a finger found, and what changed

| found | fix |
|---|---|
| the active slide's empty canvas photo ignored a tap (the shared rule makes an EMPTY canvas slot `pointer-events:none`) | on a coarse pointer the ACTIVE slide's slot takes the tap (`bgSlotStyle`); other slides stay tap-to-activate |
| numbers-only fields opened the letter keyboard | `inputmode` follows the filter: `decimal` for `num`, `numeric` for `digits` / `len11` |
| `.p-tabs` ran 8px past its column in the form | `box-sizing:border-box` — its own padding sat outside the 100% |
| the splash counted "Templates 6" with seven | `tplCount` is derived from `TPLNAMES` |
| every export row said "Zip · …" in the app, which hands separate files to the share sheet (and in a browser with a source folder, which writes flat) | `StudioBase.deliverWord()` reads `deliver`'s own three branches: **Into the folder / Separate files / Zip**, both studios |
| Save without a folder marked the project saved before the share sheet answered, then told a phone to "pick a source folder" | `StudioBase.saveSessionCopy()`: recorded in Recent first (on a phone that IS the save), the sheet awaited, and the status says whether a file was written; the folder advice only where there is a folder picker |
| "Photo added — tap to replace": a tap or click on a FILLED slot replaces nothing | Organic's captions are "Picture added" etc. (the visible Replace beside each drop is the control); Campaign's say "hover / tap it for Replace", the strip that exists |
| **Reframe on an agent photo saved a crop no render reads** — `agentPlace` frames her on her face and reads no slot crop — and the same for the QR, the parallax cut-out, the floating graphic, the partner mark and the stats icons | a new `data-noreframe` on those slots: `_reframes()` answers false, the strip hides Edit, double-click does nothing; Organic offers Reframe on PHOTOS only |
| the reframe bar pinned INSIDE a 150px form thumbnail and covered the picture being framed | a frame shorter than ~2.2x the bar gets it below (else above), clamped to the viewport; a canvas-sized photo keeps it inside as before |
| "scroll to zoom" on a phone, which has no wheel and no pinch here | the hint is "drag to move" on a coarse pointer; the Zoom slider is the zoom |
| Reframe from the guided run opened on the editor's canvas mounted UNDER the run | `slotActs` takes the canvas copy only in the editor; below 1200px the Slide sheet steps aside first |
| the listed agent's hint said "Drag her on the card" — only the review's portrait drags | per kind, and neutral: "Drag the portrait on the card to move it" on the review only |
| "Drop agent PNG" beside "the background is removed for you" | "Drop agent photo" (touch: "Add agent photo"); both cut-out notes say "add" on touch |
| the Template sheet said "fields on the right", "drop photos", "click to edit", "Drag a rank" | `tplFoot` / `slidesHint` / `dragHint` follow the pointer and the layout: "in the Slide panel", "tap an empty photo on the card", "tap to edit", "Hold a rank, then drag it" |
| stale copy: the Just listed card ("serif status headline… agents"), Pick a template's listed and agents entries, Campaign's carousel rail foot and dock tip ("share one set of design components") | rewritten to what the templates draw |

## A SMALL PHOTO KEPT ITS GPS, and the fix keeps the pass-through byte-exact

`providentEncodeFile` passes a small, lean original through untouched (long side <= 3840, <= 2.5MB)
— and with it its EXIF. The iOS picker says **"Location Included"** by default and its Large size
lands under the cap, so where a headshot was taken travelled into the photo store, every session
file, `Assets/` and the recents. Renders never carried it (they are drawn through a canvas); the
stored copy did. `providentStripMeta` (runtime.js) now cleans the pass-through:

- **JPEG** is WALKED, not searched (a segment payload may hold FF D9): APP1 (EXIF, XMP), APP13
  (IPTC) and COM go; APP0, the ICC profile in APP2 and APP14 stay; the entropy data is copied
  whole; and the file ends at the main image's EOI, which drops an iPhone's MPF secondary images
  (the HDR gain map) and any metadata of theirs — the canvas never reads them.
- **PNG** loses `tEXt` / `zTXt` / `iTXt`.
- **A rotation is the one thing that cannot just be dropped** — the browser applies EXIF
  orientation, so stripping it would turn the photo. An orientation other than 1 (or a PNG
  `eXIf`) returns null and the file is RE-ENCODED, which bakes the rotation in.
- **By magic bytes, never by MIME**: a Finder drag can arrive with an empty type, and a PNG
  misread would be re-encoded opaque. WebP and AVIF pass through as before unless they carry
  `EXIF` / `Exif` / `xmpmeta`, and are re-encoded when they do.

Measured in Chrome AND in the app's WebKit on generated files: GPS, XMP, IPTC and comments gone,
**the output byte-identical to the same JPEG saved without metadata** (3,167 bytes each), pixels
identical in every kept file, ICC kept, progressive fine, the trailing image dropped (6,506 ->
3,167), the rotated file out at 64 x 96 with no original metadata. **WebKit's own canvas JPEG writes
a 78-byte EXIF of its own** — colour space and pixel dimensions, nothing else — so an `Exif` marker
in a re-encoded file is not a leak; check for the original's fields.

## Verified with real touches

The picker into the QR and agent slots; Reframe (the zoom slider dragged 100 -> 286%, the photo
dragged, Done committing the crop to the card); **long-press reorder with a real touch path** (the
probe logged the lift, the drop target and Agent B moving second -> fourth — the check the
phone-and-tablet section could not make with the Browser pane's mouse events); the unsaved-work
`confirm()`; recents across relaunches; the keyboard's Next. The shell's own checks — the share
sheet, Save to Photos, the launch screen — are in `ios/NOTES.md`.

## Flagged, not changed

- **The default WHITE glass makes the Top agents cover's period invisible** — white copy on white
  .22 glass over the paper ground, about 1.0–1.3:1 ("SEPTEMBER 2026" in the cover bar, and the
  ranks' panel copy where no portrait stands behind it). The one-glass pass made white the
  default everywhere by request; Panel colour -> navy fixes it per post. A per-template default
  (navy on the paper kinds) moves every saved agents post, so it is a decision.
- **A small WebP or AVIF with no metadata still passes through**, and one WITH metadata is now
  re-encoded; an AVIF with transparency and metadata would lose its alpha there (the encoder's
  alpha test reads the MIME type). Rare enough to leave.

# BACKGROUND REMOVAL RUNS AS A LOGIN ITEM

`tools/rembg/install.sh` (run once per Mac) installs the service into
`~/Library/Application Support/Provident/cutout` — **not the repo: macOS refuses a login item read
access to ~/Documents** — and registers `~/Library/LaunchAgents/ae.provident.cutout.plist`
(RunAtLoad, KeepAlive, ProcessType Interactive). Under `--launchd` the server loads the model on
the first photo, **exits ten minutes after the last cut-out to hand its memory back** (KeepAlive
starts a fresh, empty process at once), and waits for the port if a hand-started `serve.sh` holds
it. `env.sh` is the one place the paths live; `uninstall.sh` removes all of it. Idle, it measured
~2MB resident. **Still open:** the studio's own "start tools/rembg/serve.sh" messages predate the
login item, and the ONNX memory-arena measurement was not finished.

# CAS AND OPS ARE AN MCP SERVER — `tools/studio-mcp/`

By request (2026-10-01): "an MCP or API of CAS and OPS, for me to use on Cowork". Seven tools —
`studio_catalog`, `studio_new_project`, `studio_read_project`, `studio_edit`, `studio_set_image`,
`studio_preview` (returns images), `studio_export`. Registered in
`~/Library/Application Support/Claude/claude_desktop_config.json` as `provident-studio` by
`install.sh` (backup beside it; `--remove` undoes it). Details in its README.

- **A project is a session file**, so the tools and the studio share one format both ways.
- **The studio does the work**: the server serves the repo on a loopback port and opens the real
  `.dc.html` in a private headless Chrome (throwaway profile — it can never touch the user's own
  photo store or recents), then drives the engine through `page.js`: `applyProject` (with
  `reloadNow` stubbed and the server reloading), `normState`, `buildOps`/`renderOpsToCanvas`,
  `doExport` with `deliver`/`saveAs` overridden to hand the files back. **No artwork is
  reimplemented**, so template changes reach it for free.
- **Edits go through `E.upd`** (OPS slides via `OrganicStudio.slide`/`csConvert`, CAS components
  via `modList`/`dropMod`, CAS Add Variant and the carousel switch via the rail's own
  `renderVals()` actions). Images go through `providentEncodeFile` and `ImageSlot.putUrl`, and the
  cut-out service where the slot is an agent's.
- **Stdlib only** (Python 3.9; no Node, no pip): `chrome.py` carries its own WebSocket client.
- **Coupling to watch:** `page.js` names `applyProject`, `exportBlockers`, `sLabel`, `bgSidFor`,
  `photoUsed`, `modList`, `dropMod`, `freshId`, `modulesFor`, `sizesFor`, `csConvert`, `tplState`,
  `tplSlides`, `COPY_BLANK`, and the slot-id scheme (`smp-bg-<id>`, `adstudio-bg-<vi>` …). Rename any
  of those and the same rename is owed there.

Verified through the real paths: OPS listed (fields, QR, background, agent cut out in 13s, JPG
export `Just Listed_Jane Doe-01_3x4.jpg`), weekly add-slide, carousel layout switch and remove;
CAS Event (edit, size, add component, add variant, banner on, PNG export into `Variant A/…`,
banners exactly 1880x940 and 758x380); and the stdio protocol (initialize, tools/list, a text
result, an image result, an error result).

# EDIT IN PHOTOSHOP — a round trip owned by image-slot, with an optional helper

By request (2026-10-01): extend or retouch a picture in Photoshop and have the save come back into
CAS / OPS by itself. A web page cannot launch Photoshop (no URL scheme opens a file), so there are
two transports, both in `image-slot.js`'s PS session block above the class:

| | needs | how the save comes back |
|---|---|---|
| **helper** | `tools/photoshop/` on 127.0.0.1:7312 (`install.sh`, a login item) | writes `Edits/<slot id>.<ext>`, runs `open -a` on the newest installed Photoshop, serves the newest save back. **A PSD/TIFF/HEIC is converted with `sips`**, so Photoshop's own ⌘S-as-PSD still works |
| **folder** | Chrome/Edge with a writable source folder | writes `<folder>/Photoshop/<slot id>.<ext>`; the user opens it; the folder handle is watched for a PNG/JPEG/WebP under that name |

- **Every save goes through the element's own `_ingest`**, so encode, the agent cut-out
  pass-through (an already-transparent PNG is left alone), the crop reset (an extended picture has
  a new size) and the store write are the drop's own. No second ingest path.
- **Pressing the button while linked REOPENS, never rewrites** (`/open`): a rewrite would replace
  an hour of PSD layers with the flat picture. Verified: a PSD in place, a second press, the PSD kept.
- A session is per slot id and per page, never saved. A manual Replace, a drop, Remove, or the
  badge's **Unlink** ends it; so does 6 hours.
- `window.providentPhotoshop` (runtime.js §4b) is transport only, like `providentCutout`, and is a
  CAPABILITY: with neither transport there is no button. `provident-photoshop` events re-render
  the slots and both studios' rails (helper up/down, a session starting, ending or landing a save).
- Buttons: the slot's own hover strip (`data-act="ps"`, `data-psok` gates it, SVGs excluded),
  OPS's form rows (`slotPs` / `slotPsOn`, not on a QR), CAS's photo, cut-out, graphic and
  partner-mark rows (`psOn`, `<x>Ps`, `CampaignStudio.slotPs`).

**Verified in Chrome against the real helper and the real Photoshop 2026** in both studios:
the button opened Photoshop; a 1400x600 PSD saved over an 800x600 JPEG came back as WebP in OPS;
a 1600x900 PNG came back in CAS; Unlink and the reopen path. **The folder transport was NOT
exercised end to end** — `showDirectoryPicker` needs a real user gesture the pane cannot give.
No artwork line moved. The helper was installed on this Mac as a login item on 2026-10-02 (`ae.provident.photoshop`).

**AN SVG GOES TO ILLUSTRATOR, and comes back as SVG.** `app_for(ext)` in the helper picks
Illustrator for `.svg`; the slot labels its button and badge by `psAppFor(url)` (`ImageSlot.psApp(id)`
for hosts — OPS's `slotPsLabel`, CAS's `coPsLabel` / `gPsLabel`). `psAvail(url)` asks the helper's
`/health` for THAT app. Illustrator's bundle is `Adobe Illustrator 2026/Adobe Illustrator.app` —
the year is on the folder, not the bundle, which is why the first search found nothing. Only an
SVG save is read back; `.ai` is not. Verified: an SVG ingested, linked, Illustrator opened, an
800-wide SVG saved under the stem came back into the slot as `image/svg+xml`.

# EVERY TAB IS ITS OWN WORKSPACE (`?ws=`), BECAUSE PARALLEL COWORK SESSIONS OVERWROTE EACH OTHER

By request (2026-10-08). Tabs of one studio shared one `localStorage` project and one photo
store, and `_syncLS` re-pulls the project on every `storage`/`focus` event — so the last tab to
write rewrote every other tab, and Cowork stopped with "something else is switching the studio
page". Section 0 of `runtime.js` gives every tab a workspace id: `?ws=<id>` if present, else this
tab's `sessionStorage['provident-ws']`, else minted, and written into the address bar. Reproduced
and verified on two tabs: without it tab A ended with B's copy and photo; with it each kept its own.

- **Per workspace:** the studio keys in localStorage (prefixed `ws:<id>:`; `OWN` minus the `PREF`
  list) and its own IndexedDB `provident-design-studio~<id>` — the photo sidecar lives there.
- **Shared:** `recents:*` (routed to the base DB; `recordSaved` re-reads the list before writing
  so two tabs saving at once keep both cards), the Design|Copy choice, the copywriter's name, the
  custom-component library, the theme. The source folder (`project-dir`) reads own-then-shared and
  is written to both.
- **`providentWorkspaceFresh`**: a tab with no project of its own; Continue last opens the newest
  saved project there, and `markDirty` clears the flag.
- `?ws=shared` is the opt-out to the old single shared project; `reloadNow(url)` carries the id
  across the CAS↔OPS hand-over. **Old projects that were unsaved before this landed sit under the
  un-prefixed key and are reachable with `?ws=shared`.**

# REMOVED 2026-10-20: YouTube Demand Gen, the Meta Ads kit bridge, the OPS support desk

By request, after an audit of the month's features. The sections above that describe these three
are history; nothing in the code reads them any more.

- **YouTube Demand Gen is gone from CAS.** `isYT`, `ytOf`, `ytCheck`, `YT_*`, the `yl` / `yp`
  sizes, `ylOv` / `ypOv` / `ytShow`, the logo and `_Demand Gen text.txt` exports, the Publish YouTube
  section, the dock group, the canvas-bar chip and the MCP ops `set_platform` / `youtube_text`.
  `normState` turns a saved `ytdg` project into a Meta ad and drops its YouTube records. **Kept:**
  the Meta plate's Horizontal 1.91:1 (`ls`, exported `_Landscape_1.91x1` in the Variant folder) —
  Ad sets now lists it under Meta. `mtCheck` uses `limField` (was `ytField`). `AS_SKIP` still names
  `yt demand gen`, so an old export folder is not mistaken for a project. The `.yt-*` CSS classes
  are kept: the Meta ad text reuses them.
- **The Meta Ads kit bridge is gone**: `tools/meta-ads/`, `.claude/skills/meta-ads/`, `mtManifest`
  and the `_Meta upload.json` export. **Kept:** the Meta ad text in the Publish tab (`state.mt`,
  `mtOf`, `mtCheck`) — saved with the project, sent by Send, shown in the placement Preview and Ad
  sets. Meta's own CLI (`~/.local/bin/meta`) was installed outside the repo and was not removed.
- **The OPS support desk is gone**: `support-desk.js`, `tools/support/`, CSS section 29, the overlay
  markup, the sidebar Help group and the shell hooks.
- **`icon-tags.js` is loaded on demand** by `StudioBase.iconTags(done)`, called from each studio's
  `iconPick` when a search is typed (never from the static `iconSearch`, which has no instance to
  re-render). The page no longer loads 270 KB at boot.
- **Ad sets › Details and the lightbox sit above the sticky audience heading** (z 5 / 6; it is z 3).

Verified: CAS op census, 4 templates x dark/light x left/centre x 7 sizes, **112 groups, 1,404
ops, 0 differing** against the pre-change build; no newly unresolved interpolation (57 against
65 before); both studios boot clean; a legacy YouTube project opens as Meta; export writes no
manifest; the first icon search triggers the index load and the second returns keyword matches.

# EVERY PROJECT AND EVERY TAB STARTS FRESH (2026-10-21)

By request: a new campaign in CAS or OPS was opening on another project's Source folder and an
old photo, and Ad sets opened on a folder nobody chose. Three leaks, three fixes:

- **The photo store starts EMPTY** (`runtime.js` fetch shim). It used to SEED a new workspace from
  the `.image-slots.state.json` shipped beside the studio — photos from the app's first version
  keyed `adstudio-bg-0` / `-st` / `-ls` … and three `smp-bg-*`. So every fresh tab (and every MCP
  headless project) showed a V1 picture as its background. A store seeded that way earlier is
  cleaned ONCE per workspace (`seed-purged-v1` in its DB): every slot whose bytes equal the
  shipped file's is dropped, everything uploaded since is kept. The file is still in the repo
  and still Design Cursor's real sidecar; the browser no longer reads it.
- **The Source folder is per workspace with NO shared fallback.** `project-dir` used to read
  own-then-shared and be written to both, so a new tab started on the last folder used anywhere —
  this supersedes that line in the workspace section. **`applyProject` in both studios forgets
  the folder** (new campaign, template, new post, a recent, the MCP's project load), and CAS's
  also drops the brief (`adstudio-brief`) and its `adbrief-*` pictures. Open Session still
  adopts the folder it opens from — that is the one way a project gets a folder back.
- **Ad sets never reads the Source folder.** `asScan` / `asRoot` read only `_asSrc` (dropped,
  chosen, or a Drive link); `asOpen` and `asClose` clear it, so each opening is an empty viewer.
  The bar button is **Choose a folder / Open another folder** (`asPick` → `asBrowse`), and the
  picker starts in Documents rather than a remembered location. `asUseSource` remains for the
  Drive sign-out path and now means "back to nothing".

Verified in the pane: a fresh workspace's sidecar is `{}`; a workspace seeded the old way keeps
only its own upload after load; a workspace does not see a folder set in the shared DB;
`pickTpl` in both studios clears the folder (handle and stored key); Ad sets with a folder set
opens on the drop panel. No artwork line changed.

# CHROME'S CANVAS MEASURES HINTED TEXT AT SOME SIZES — chips and eyebrows had a right-side gap (2026-10-21)

Reported as "unintended spacing going on the right side" of CAS's tag chips and eyebrow. Root cause:
a canvas 2D context left on `textRendering: 'auto'` measures and draws Google Sans Flex **hinted** at
some whole-number px sizes. At 23, 24 and 25px it comes out about 8% wider than the DOM. At 24.01
and at 28 it matches the DOM. Width per px for "Sea view":

| px | auto | explicit textRendering |
|---|---|---|
| 22 | 3.933 | 3.93 |
| 23 | 4.274 | 3.93 |
| 24 | 4.248 | 3.928 |
| 25 | 4.223 | 3.93 |
| 28 | 3.918 | 3.92 |

`meas()` sized every chip and eyebrow box from the wider canvas width. The editor draws the text in
the DOM, at the narrower width, so every box carried the excess on its right: about 28px on the left
against 33–37px on the right.

**Fix:** any explicit `textRendering` turns the hinting off. It is `'optimizeLegibility'` in three places:

- `StudioBase.mctx()`, the measuring context (shared, so OPS gets it too)
- CAS's `renderOpsToCanvas`
- OPS's `renderOpsToCanvas`

**Separately, the eyebrow box no longer carries the trailing tracking unit.** `wOf` in `modLayout`
subtracts the `ls` that `meas` reserves after the last letter.

**Measured after:**
- Editor: 28–29 canvas px on both sides of every chip and eyebrow.
- Export: within 1.5px left to right, at 1x and 2x.
- CAS: 4 templates × left/centre × 7 sizes. Only chip and centred-eyebrow positions moved, by
  12–15px, as the boxes tighten. No line break and no text changed (0 of 56 groups).
- OPS: 7 templates × every slide × feed/story. No line break or fitted size changed (0 of 36).

**If you ever create a measuring or drawing canvas outside these three, set `textRendering` on it**,
or it will disagree with both the editor and the export at those sizes.

# THE PHOTO STORE IS READ ONCE, AND PHOTOS DECODE ONCE (2026-10-23)

Profiled in headless Chrome with a CPU profiler and real-size photos (~3.5 MB each). Every
photo a project holds lives in ONE json string (`.image-slots.state.json`, 61 MB for a
17-photo weekly), and the studios read it with `fetch()` + `r.json()` wherever they needed a
picture — which rebuilt the whole string as a Response, parsed it, and decoded every photo
again. OPS's guided run did that on EVERY keystroke (its card refresh calls `loadAssets`):
~130 ms of main-thread work per key at 15 properties.

- **`StudioBase.sidecar()` is the one read** (all 17 sites in both studios and
  studio-base.js). It calls `window.providentSidecar()` (runtime.js §5), which keeps the
  parsed store and re-parses only when `omelette.writeFile` has bumped `storeRev`. It
  returns a SHALLOW copy: add or delete slots before a write, never edit a record in place.
  Design Cursor (omelette) mode falls back to the plain fetch. **Never add a new
  `fetch('.image-slots.state.json')`.**
- **`StudioBase.img(u)` decodes a photo once** (a Map, LRU at `IMG_MAX` 48 — never an object
  keyed by a data URL, which interns the string forever, as CAS's `_vtImgs` did). Every
  `loadAssets` `loadImg` and CAS's `_vtImg` read it. Never set anything on the Image it returns.
- **Both rAF ticks run their page-wide scans every 200 ms, not every frame** (promoteImgs,
  autoGrow — which forced a layout each frame — icon tints, the partner mark, rtSync, the
  cut-out probe). The shell's `componentDidUpdate` already runs promoteImgs/autoGrow and sets
  `eng._scanNow`, so the next frame catches up at once. Per frame still: CAS's floating
  component control, and the overlap layer while a reframe is active (`_reframing`).

Measured before → after, same scenarios: OPS guided typing at 15 properties 1,905 → 560 ms of
work for 14 keys (what is left is the one changed card's WebP encode, ~25 ms); OPS idle tick
~19 → ~2 ms a second; CAS 3 variants × 7 sizes, keystroke-to-frame 70 ms spikes → ≤19 ms;
replacing one photo with 17 in the store 703 → 464 ms; reopening that project 1,220 → 957 ms.
Verified: a replaced photo reaches the guided card and the export; the partner-mark tint paints.

**Still open:** the image-slot save re-stringifies the whole store and writes it to IndexedDB
on every photo change (one record per slot would fix it, but changes the storage format); the
guided card's WebP encode is synchronous (`toBlob` would move it off the main thread).

# COMPONENT USAGE COUNTS A FOLDER; THE PROJECTS FOLDER VIEW IS GONE (2026-10-26)

By request. Component usage was meant to be measured from a folder of saved projects the user
picks; the Projects folder view had grown instead — a second browser of the same files (Open
session, Recent and From the hub already open them) that cost a render pass on every keystroke.

- **The view, its sidebar row, `shViewLib`, `libThumbs`, `libOpen` and the card model are deleted
  from both studios.** A tab whose `splashView` is still `'lib'` lands on All. OPS has no use for
  the folder any more; the scan code stays in `studio-base.js`, read by CAS alone.
- **Component usage carries the source panel** at the top of its view (`libVals(view === 'use')`):
  Choose a folder / a Drive link, then a status bar with Refresh and **Use Recent instead**. With no
  folder it counts Recent, and its note and subtitle say which source is being counted.
- **The scan is read-only** (`mode:'read'` on the picker and permission checks), lists only THIS
  studio's extension, skips the same folders as before (`LIB_SKIP`), caps at `LIB_MAX` 2000, and
  runs when the view opens — reused for `LIB_FRESH` (2 min), Refresh forces it.
- **Each file is reduced to its PLACEMENTS** — `CampaignStudio.usePlacements(state)`: per component
  per variant/page, `{key, m, hid, sk, z}` (a custom component keeps its spec and words for its
  preview). `usageCount` reads `uses` or, for Recent, computes them from `state`. The engine hook is
  `libUses(state)`.
- **`lib:uses` in the SHARED IndexedDB keeps each file's placements with its modified time**, keyed
  by the folder (`libKeyOf`), so the next scan only reads files that changed. Measured on a 12-
  project fixture: first scan 12 reads, after a reload 0, after editing one project 1. A Drive file
  is read by a growing head (`libRead`: 256 KB, 4 MB, whole), so photos are never downloaded.
- `useSource()` is the one answer to what is counted: the folder's last listing (kept while a new
  scan runs, so the numbers do not flicker back to Recent), else Recent. The memo keys on that
  listing or on the recents list itself.

# RECENTS KEEP THEIR PHOTOS APART; A PROJECT REMEMBERS ITS SOURCE FOLDER (2026-10-26)

Reported as "recent projects keep resetting, and the Source folder is gone after a refresh".
Measured in the user's Chrome: the recents list was a **210 MB** string, with nothing added
since 23 Oct, and the origin held **98 workspaces**.

- **A recent card's photos live under `recents:<app>:img:<pid>`**, never in the list
  (`writeRecents` moves them out; `recentImages(r)` reads them; both `openRecent`s and OPS's
  thumbnail backfill go through it). Each card carried export-grade photos, the whole list
  is read on every load and rewritten on every save, and at ~200 MB the write failed
  silently, so new saves never reached the splash. An old list migrates on its first load.
  A legacy card (no `saved` flag, never shown) loses its photos and keeps its metadata. A card
  dropped from the list has its photo key deleted.
- **The Source folder is remembered per PROJECT** — `providentFolder.bind(pid)` (runtime.js),
  called by `StudioBase.bindFolder()` from `loadRecents` and `ensurePid`. A folder set while a
  project is bound is stored as `dir:<pid>` in the SHARED database; a bound project with no
  folder in its tab gets its own back (granted, or `pending` for `ensure()`). For a project
  saved before this, `recall(pid)` finds a workspace that held that pid and reads its folder.
  The fresh-session rule still holds: `applyProject` forgets the folder, and a new campaign has
  no pid, so it starts with none. Every new tab is still its own workspace; the folder now
  follows the project into it.

Verified locally: a 4 MB list became 8 KB with the photo intact; a new workspace opening the
project from Recent got its folder and photo back, by `dir:` and by `recall`; a new campaign
had no folder; OPS boots clean.

# ALT-TAB LOOKED LIKE UNDO IN CAS (2026-11-03)

Reported: switching away from Chrome and back undid the canvas, mostly on carousels. Cause:
`_syncLS` (window `focus` + `storage`) replaced the in-memory state with localStorage's copy
whenever the two differed — and `persist()` swallowed a failed write. With localStorage full
(every workspace keeps its own project copy, never cleared; one computer held 98), the newest
edits never reached storage, so the next focus put the previous copy back. Reproduced with a
throwing setItem: edit → focus → reverted. Carousels are the biggest projects, so they fail first.
- `_lsWrite(raw)` is the one write path (persist, restore). `_lsSeen` = the copy this window last
  wrote or read; `_syncLS` ignores storage equal to it, so it only takes another window's write.
  Verified: a failed save survives focus; a real write from "another window" still applies.
- On a failed write, `StudioBase.lsFree()` drops localStorage keys of workspaces made 30+ days
  ago (id = 'w' + base-36 ms; never this tab's; random 'p…' ids from the home are left alone),
  then retries; if it still fails, `StudioBase.warn()` says once that changes would be lost on a
  reload and to press Save.
OPS has no focus sync, so it never reverted this way.
