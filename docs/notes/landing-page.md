<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Landing page (index.html)

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

# THE HOME PAGE LEADS WITH HAIRLINE FIGURES (2026-10-19)

`index.html` (deployed at provident-design-studio.vercel.app) was redesigned by request, with
Hairline's **Elevator for Campaign ads** and **Turntable for Organic posts** (`vendor/hairline`, the
classic-script build CAS already loads; `window.providentHairline.elevator / turntable`, mounted
with `{play:true, intensity:.7}`). The request's snippets were `@lucasmarkes/hairline/react`; this
page has no build step, so the same figures come from the vendored file.

- Each card: the figure on the studio's `--ps-stage` ground (its plate is `--ps-fill`, its lines the
  chrome inks, the highlight `--ps-link` on hover, a "Move across it" / "Flick to spin it" hint on
  hover), then name, descriptor, one sentence, **three facts as figures** (CAS 7 sizes · 3 variants ·
  2 typefaces; OPS 7 templates · 15 carousel pages · 2 sizes), the template renders small with their
  names as tooltips, and **one Open button pinned to the card's foot** so the two line up.
- **The card is no longer one stretched link**: a link over the figure would take the pointer the
  figure reacts to. The Open button is the way in.
- The hover reel and filmstrip are gone; `preview/*.webp` stay as the template strip.
- Verified: both figures mount; buttons level; contrast 0 failures in light and dark; no overflow at
  1280 or 375. Facts must be kept true when a studio gains a size, template or page cap.

**The home page's studio marks are the switcher's chips (2026-10-19, by request)**: the same
miniature canvas the studios' sidebar uses (section 45 there) — the studio's ratio at 36 tall
(36×36 CAS, 27×36 OPS), a wordmark bar and two headline bars, quiet at rest and lit navy with pale
bars on the card's hover, the switcher's "current studio" look. `.lp-sh` mirrors `.p-ws-sh`.

# THE LANDING PAGE SHOWS THE WORK (2026-10-29)

Rebuilt the same day from its own critique (19/32: "a template — two equal dark feature
cards, Open buttons below the fold, nothing Provident ships on the page"). `index.html`,
still a `<link>`ed consumer of `ui-design-system/`:
- **One line**: greeting from `provident-drive-who`, plus "N campaigns are waiting for you."
  from CAS's Status count (`provident-status-sum`, ignored after 14 days). No account and no
  count: "Make it on brand, in every size."
- **Two compact doors** (pinned Provident Navy, both themes; lighter navy in dark): the
  Hairline figure as each studio's mark beside a one-line description, the export ratios drawn
  to scale, Open, and on CAS a "2 waiting" chip (the one link to Status). Both Open buttons sit
  in the first screen at 1280x800 and on a phone.
- **The desk**: your saved projects from both studios (IndexedDB `recents:campaign` /
  `recents:organic`, never created from here) as their own renders at true shape, 240px tall,
  newest first, each linking `<studio>#recent=<pid>`. With none, the same strip shows the real
  template renders from `preview/` under "What the studios make".
- **`StudioBase.homeHash()`** reads `#recent=<pid>` → `openRecent`, `#view=<name>` → `splashView`.
- Verified: 0 contrast failures light/dark, no sideways scroll at 375, filled and empty states.

# THE LANDING PAGE IS "NEXT UP" — ONE PERSON'S QUEUE ACROSS BOTH STUDIOS (2026-11-02, /impeccable)

By request ("redesign the home page"; the user chose the site's `index.html`, to lead with
what is waiting on them, to vary by role, and to keep the template renders and the greeting).
Layout chosen from three wireframes: **Next up**. Surface brief and direction contract:
`.impeccable/surfaces/index-html.md`. This supersedes *THE LANDING PAGE SHOWS THE WORK*
(the two navy doors and the Hairline figures are gone; `vendor/hairline` is no longer loaded here).

- **The page runs no studio code, so each studio leaves its queue for it.**
  `StudioBase.inboxSave(app, rows, me)` writes `provident-inbox-cas` / `provident-inbox-ops`
  (shared by every workspace; previews dropped past ~1 MB). CAS writes from `statusSave`
  (`inboxCas`, share-link.js — every Status read and Home's background `refreshSum`); OPS from
  `Feed.load` (`inboxOps`, post-flow.js). A row: `{studio, id, name, mine, ready, open, step, sub,
  segs, steps, verb, due, from, at, thumb, ratio, href}`, `mine` judged by the studio's own
  `rsMine` / `waitingOnMe`. **A new field the page needs is added to those two writers.**
- **The account is `provident-acc-me`**, written by access.js `apply()`; on the website (or
  localhost) the page also POSTs `accme` with the Google token and, for the admin, `acclist`,
  kept as `provident-acc-list-lp`. A queue written for another account on the same computer is
  not treated as mine.
- **Roles**: social media sees Organic only; performance marketing's "waiting on you" is the
  CAS packages that are ready, and its studio rows open Status; the content team's CAS row opens
  Status. Designers and the admin see both.
- **Signature**: the Next up card flips through your queue in place (‹ ›, the arrow keys, or a
  row in "Waiting on you"); the button opens that item (`#share=` link, else `#view=rev`).
- Empty states: not signed in / never read Status ("Your work shows here", buttons to Status),
  nothing waiting ("You're clear"). The desk below is recent saved projects, else the
  `preview/` template renders.
- **The queue is only as fresh as the last Status read**; the page says when, and its
  Refresh links open Status. Verified with seeded data: 0 contrast failures in both themes, no
  overflow at 375, detector clean.

## THE ADMIN'S ACCESS PANEL IS ON THE LANDING PAGE TOO (2026-11-02)

By request. `index.html` loads `studio-base.js` (for `window.providentDrive`) and `access.js`, and
`<html data-acc-home>` puts access.js in **home mode**: no gate and no `acx-hold`, `boot` asks the
server who this is only when Google is already signed in (never a popup), a sign-in happens only
from the account card's **Sign in with Google** button (`providentAccess.signIn`), and
**Preview as** opens the role's studio in the same tab (sessionStorage carries the preview there).
The panel is access.js's own (Requests · People · Activity), drawn into a full-width
`div[data-acc-admin]` section that shows only while the signed-in person is the admin; access.js
tells the page through a `provident-access` window event. The compact Sign-ins side panel and the
page's own `accme`/`acclist` calls are gone. Verified on the dev server: a real request let in,
0 contrast failures on all three tabs in both themes, sign out hides the section.

**Fixed on the way, reaching CAS's Access view too:** on a phone the People rows showed no names —
the desktop truncation trick (`td:first-child{max-width:0}`) survived into the stacked layout.
The narrow rule now makes the table a block and resets that cell.

Testing note: the dev Drive stand-in needs `localStorage['provident-drive-base'] = location.origin`
as well as the `dev:<email>:<name>` token, or `providentDrive.watch()` asks real Google and drops it.

# ONE HOME FOR BOTH STUDIOS (2026-11-02, /impeccable, by request)

`index.html` was rebuilt from the reviewed prototype (`prototypes/unified-home.html`, sample data)
on the data the page already had. Supersedes the "Next up" layout above; its data rules stand.

- **Hash routes, one page**: `#/` Home, `#/status`, `#/item/<cas|ops>/<id>`, `#/new`, `#/access`.
  The studios' own deep links (`#share=`, `#view=`, `#recent=`) are untouched — they live on the
  studio pages.
- **Data is unchanged**: `provident-inbox-cas|ops` rows (StudioBase.inboxSave), `provident-acc-me`,
  `provident-drive-who`, recents in IndexedDB, access.js in home mode. `build()` is the previous
  page's, line for line (same-account check, "With you" rewrite, pm's mine = ready packages).
- **Stages** map each row onto one board: `ready` → Ready; CAS `open` or a Ticket/Draft step → New;
  a step naming copy or translation → Copy check; else Design (`stageOf`). There is no Delivered
  column: the queues do not carry finished work.
- **The item page is what the row holds** (picture, step, sub, from, due, the studio's own steps)
  and hands over to the studio for audiences, pages, activity and the brief. The prototype's richer
  page (audience tiles, word changes, team links) needs those fields in `inboxCas` / `inboxOps` first.
- **New** links out: CAS's home (the campaign setup) and OPS `#view=new` (Start a post). pm and smm
  skip the chooser; the content team has no New.
- **Access** for the admin is access.js's panel in `#acc-adm [data-acc-admin]`, a static section shown
  only on `#/access` (access.js draws into it once; it must not be re-rendered by the router).
  Everyone else sees their role and a fixed list of what it opens (`CAN`); asking for another role
  is "ask the admin" — access.js has no role-change request for someone already let in.
- **Not carried over from the prototype** (no data on this page yet): the Content Hub filter and
  tags, "New" marks for fresh hand-offs, hand-off notes, the size pickers (they belong in the
  studios' own start forms).
- Verified with seeded real-shaped queues: 0 contrast failures in both themes for designer/admin,
  pm, smm and cten across every route; no sideways scroll at 375; New routes per role.
