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
- **Roles**: social media sees Organic only; performance marketing sees CAS only (2026-11-04) and
  its "waiting on you" is the CAS packages that are ready, with **Launch** on Next up (see
  reviews-sharing-drive.md, PERFORMANCE MARKETING: CAMPAIGNS ONLY), and its studio rows open Status; the content team's CAS row opens
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

# THE HOME IS THE ONLY HOME: THE STUDIOS' HOME AND STATUS MOVED THERE (2026-11-02, by request)

The user's point: two studio homes plus a unified one is duplication. `index.html` now carries the
work itself; CAS and OPS are for designing. **The Content Hub bridge is untouched** (studio-base.js
hub block, OPS `epPost` / `X-Card-Id` / `X-Design-Key`, From the hub, the hub skill) — verified by
diff.

- **index.html loads the studios' own code**, in their order: `studio-base.js`, `share-link.js`,
  `access.js`, `post-flow.js`. It mounts, with a stand-in engine (`CAS_ENG` / `OPS_ENG`):
  - `[data-rv-arch]` — CAS's ArchView (Status): its ad set / ticket page is `#/item/cas/<id>`
    (`providentReviews.want` + `mount`). Its Back (`data-a="back"`) is caught and goes to `#/status`.
  - `[data-post-status]` — OPS's StatusView: the post page is `#/item/ops/<id>`
    (`providentPostStatus.want` + `mount`), step buttons and the hand-off picker included.
  - `[data-rs-plan]` — CAS's PlanView (the campaign setup) on `#/new/cas`.
  The hosts stay in the document once mounted (hidden off-route), so their own timers keep reading
  Drive (CAS 20 s, OPS 45 s). The page also calls `providentReviews.refreshSum(null)` and
  `providentPostFeed.load()` every 60 s; `StudioBase.inboxSave` is wrapped to re-draw.
- **Stand-ins**: CAS `newProject` (after `pickUp` leaves `provident-rspick`) opens
  `CAS?ws=<new>#pick=<b64{dd,cell}>` — a studio tab is its own workspace, so the request travels in
  the address like `startCell`; a plain `location.href = CAS` lost it (verified). `host.setState`
  maps `'all'` → `#/new/cas`, `'rev'` → `#/status`. OPS `shareOpenLink` → `OPS#share=<sid>`,
  `upd(screen:'pick')` → `OPS#view=tpl`, `setState('all'|'new')` → `OPS#view=new`.
- **post-flow.js** runs on `html[data-acc-home]` too and exports `window.providentPostFeed`; its
  `postStatusOpen` goes home; Start a post no longer draws the My turn | Start a post switch.
- **share-link.js**: `rsShowStatus` (a designer's `#share=<dd>` link) goes to `#/item/cas/<id>`;
  Status's **Add a project** opens CAS (it opened `location.pathname`, which is now index.html).
- **access.js**: on the home page CAS's limits apply (`lim()` includes HOME; the capture guard
  covers `[data-rv-arch],[data-rs-plan]` there), so pm/ct cannot Pick up or Start designing.
- **The studios** (`renderVals`): `'all'` and `'rev'` resolve to `'rec'` (Recent); the sidebar's
  Home and Status rows call `StudioBase.goHome('' | 'status')` (kept as the first two rows — access.js
  CSS counts nav positions). A role whose studio was only Home/Status (CAS: pm, ct; OPS: pm) is sent
  home once, except in a review link's tab (`provident-acc-link`). OPS keeps `'new'` (Start a post).
- **Verified on the dev server + Drive stand-in** (`tools/share-dev/serve.py`, with
  `provident-status-root` / `provident-posts-root` set to the stand-in folder): filed a ticket from
  the home with the designer picker; it reached the board and the queue; its page on the home; Pick
  up opened CAS on a new project joined to the ticket ("Picked up the ticket"); a post started in
  OPS appeared on the home; **Send to designer** from the home's post page with the picker, logged,
  queue moved to Design; the post page's Back → `#/status`; a designer `#share=` link → the home's
  ad set page; CAS sidebar Status → `#/status`; Preview as pm: CAS and OPS both go home, no Pick up
  or Start designing on the home. 0 contrast failures on 7 routes in both themes with the mounted
  pages; no sideways scroll at 375. **Not exercised against real Google Drive or real sign-in.**

## QA pass (2026-11-02, by request): sign-out, Preview as, New campaign

- **Signed out is a sign-in page.** `gated()` (access.js phase check / signin / busy / pending /
  declined / outside) renders `viewGate()` and `body[data-gate]` hides the nav, New, the account and
  the footer. A sign-out (phase `in` → `signin`) runs `signedOut()`: clears `provident-acc-me`, both
  inbox keys, `provident-status-sum|list`, `provident-posts-list`, and REPLACES the three mount hosts
  with empty clones — the studios' views stop their timers only when their own host is disconnected
  (emptying it is not enough; verified: nothing written for 26 s after sign-out). Before this the
  last person's queue stayed on screen after Sign out.
- **Preview as previews the home.** access.js `preview()` in HOME mode just re-applies (no jump into
  a studio); `providentAccess.preview(r)` is exported; the panel label says "Preview the home as".
  The home reads the role from `providentAccess.now()` (role, raw, admin, preview), shows the `#pv`
  bar with **End preview**, and re-reads both queues on a preview change (the studios' writers judge
  `mine` by the previewed role). Verified for smm, pm and cten.
- **New campaign** (`#/new/cas`) has a page: title, a lede by role, the setup form in one card (its
  name input brought down to 30px, the brief to 132px), and a side panel — How it moves (the four
  stages) and, for designers, the open tickets already waiting.
- **Access**: `.pg` no longer `flex:1` (it pushed the admin panel half a screen down); the footer
  takes `margin-top:auto`.
- Seen and left: CAS's ad set page counts "Translation 1/1" on an English-only campaign (CAS's own
  counter); its Google Drive status row repeats the account (kept: it is the Reconnect control).

## Pick up where you left off, as a grid (2026-11-02, /impeccable, by request)

The strip was a horizontal scroller of renders at their own widths, file-style names
("Carousel_Untitled") and a cut-off last card. Now `.dk2`: up to 8 tiles, 4 a row (3 under 860px,
2 on a phone), each a 4:5 `--ps-fill` stage with the render contained whole (never cropped); a
carousel (`thumbs.length > 1`) shows its second page fanned behind; `recName()` turns the saved
name's prefix (Carousel_ / Reel_ / Post_ …, Reel_Thumbnail_) into a tag ("Carousel · 3 pages") and
the rest into words; the meta is the studio mark and the age. More than 8 → "N more … See all in
<studio>" (each studio opens on Recent). Verified with seeded recents: 0 contrast failures both
themes, tag clear of the render (13px), no sideways scroll at 375.

## Projects moved to the home; the studios have no Recent screen (2026-11-02, by request)

The studios' Recent screen read as a second home. Now:
- **index.html `#/projects`**: every saved project on this computer (IndexedDB `recents:campaign|organic`,
  the desk's reader `loadDesk`), both studios by role, CAS grouped by campaign (`provident-rs-pid:<pid>`
  name, else the name before " - "), OPS by format (`recName`); single-project groups share one
  "Other campaigns / Other posts" row, as the studios did. Filter chips, search, and **Open a project
  file / Open a post file** (→ `<studio>#view=open`). Tiles are the desk's (`tileHtml`), each opening
  `<studio>#recent=<pid>`. The desk's "more" links here; **Your studios** rows open the newest saved
  project of that studio ("Continue …", `studioLinks()`), else start one.
- **The studios**: `'rec'` (and `'all'`/`'rev'`, which resolve to it) sends a splash with nothing open to
  `StudioBase.goHome('projects')` — not in a review link's tab, not while `#share|pick|recent|view|hubopen`
  is in the address. The sidebar's Recent row goes there too. New view **`'open'`**: a card with
  **Choose the folder** (the shell's `openSession`), so opening a session file from a folder still works
  (it needs the studio page for the folder picker's click). Templates, From the hub, Component usage
  and Access are untouched.
- Verified on the dev server: bare CAS → #/projects; OPS Templates stays; OPS sidebar Recent → #/projects;
  CAS `#view=open` shows the card; Projects page 0 contrast failures both themes, no sideways scroll at 375.


## ROLES: THE ADMIN SETS WHAT EACH ROLE OPENS (2026-11-03)
By request: Access › **Roles** (a tab in access.js's admin panel, beside Requests / People /
Activity) is a capability × role grid. The server keeps it as `acc:perms` (api/share.py,
`ACC_PERMS` defaults, `acc_perms()`, op `accperms`, admin only, logged as `perms`) and sends it
with `accme`, `acclist` and `accteam`; access.js caches it in `provident-acc-perms` and exports
`providentAccess.can(cap[, rawRole])`, `perms()`, `caps()`. The admin has everything; legacy `ct`
has a copy capability when cten or ctar has it.
Wired: `tickets` / `posts` → the home's New (`canStart`); `design-cas` / `design-ops` (+ `posts`
for OPS) → Your studios and Projects (`designs()`); `design-cas` → CAS's `blocked()` gate for
designer/smm (a role with neither OPS capability is sent to the home); the hand-off pickers'
lists (`TEAMS` getters: designer-cas / designer-ops / copy / copy-en / copy-ar).
NOT wired, so NOT in the grid: downloading packages and marking a post published (the old
read-only list showed them; they were never real switches) and the link roles inside an ad set
review (share.py STEP checks the link's role, not the account's). The CSS `lim` rules in
access.js still follow the role names.

## PICK UP / PROJECTS TILES ARE A MASONRY (2026-11-03)
By request: one thumbnail per tile again (the first page whole, in a quiet padded frame, as the
studios' Recent tiles were), no tilted second page, no chip; the format and page count moved to
the meta line. `.dk2` is CSS columns (4 on the desk, 5 on Projects, 2 on a phone), Pinterest
style. The desk now draws with `tileHtml` (it had its own copy).

## RECENT STILL SHOWED ON THE LIVE SITE (2026-11-03)
Reported with screenshots: CAS and OPS still opened on Recent projects. The guard exempted any tab
whose sessionStorage carried `provident-acc-link` (a tab that once opened a review link keeps it
for its whole life), and a `#recent=`-style hash exempted the screen for as long as it stayed in
the address. Now the only exemption is a link in the address that has not opened anything yet
(`this._opened` turns true once the active project leaves the splash); everything else on `rec`
goes to the home's #/projects. Shell renderVals only, both studios; zero artwork lines.


## HOUSEKEEPING: NO OLD SCREENS LEFT IN THE STUDIOS (2026-11-03)
By request ("no remnants of the old windows popping out"). The studios' own Recent, Status, Home
(campaign setup) and Access panels no longer draw at all (`shShowRec`/`shShowRev`/`shShowPlan`/
`shShowAcc` false); their views go home: rec → #/projects, acc → #/access (CAS). The brief frame
before the redirect says "Projects · Opening them on the home page…". Sidebar **Recent** is now
**Projects** (no count). CAS's header New campaign → #/new/cas. Calls that still asked a studio
for the old views now go home: OPS Start a post's Status / card (post-flow HomeView click),
the campaign setup's "See it on Status" (share-link PlanView), and an admin's Preview as started
or ended inside a studio (access.js preview → goHome('' | 'access')). `StudioBase.goHome` on the
home itself is a hash change, not a reload. OPS's Start a post follows Access › Roles (`posts`).
Speed: the home loads in ~50 ms locally, 16 requests, no duplicates; idle, it reads the queues
once a minute (visible tab only). The admin list (acclist) was re-read every 30 s even with
Access hidden; now 30 s on Access, 2 min elsewhere (the waiting badge).
Not changed: the Content Hub's Send bridge, OPS's Templates / From the hub / Start a post, CAS's
Component usage, the editors.

## STATUS DETAILS PAGES, CLICKED THROUGH (2026-11-03)
Asked "did you check the status details page?" — every control on a campaign page and a post
page, on the share dev server. Worked as is: Ticket settings (save deadline/audiences), Pick
up, Change audience, Add phase, Add a project, Already approved, Remove, Drive location Save,
open a project / Start the English (new-tab links), All campaigns, Send to copy check (picker
from Access › Roles), Approve copy. Fixed:
- A ticket filed on the home wasn't on Status until Refresh (refreshSum skips a summary under
  2 min old): coming back to Status/Home from New or an item page now runs refreshAll(true).
- Delete for everyone / Remove from this list redrew the studio's old campaign list inside the
  home: the home now watches for the page closing and goes to #/status. And when the last
  campaign goes, refreshSum returned early and the queue kept it: an empty list saves an empty
  queue (statusSave([])).
- Campaign tracker said "Translation 1/1" with no Arabic anywhere: Translation counts only the
  audiences with an Arabic version, and reads "Not needed" when none have one.
- THE BIG ONE — a studio reload (and a post's "Open in the studio", which re-opens a link the
  tab already followed) booted to the start screen, which now goes home: you lost your design
  on ⌘R. CampaignStudio.load / OrganicStudio.load now resume the tab's own project on the
  screen it was on (CAS: workScreen(); OPS: editor or guide) unless it was on the start screen.
- The Projects move waited only on the address. Now it polls while anything is opening: a
  link the page loaded with (StudioBase.linkAt, noted as studio-base.js loads, 15 s), a dialog
  on screen, a pending Pick up (provident-rspick) or Add a project (provident-rsjoin); once a
  project is open it stays, and closing it (the editor's Projects button) goes home.
Not verified: real Google Drive, real sign-in, the live site.

## NEW CHOOSER STAGES REDESIGNED (2026-11-03)
The old strips cropped one square preview into 4:5, 9:16 and 1.91:1 frames (sliced words), and a
feed post into the story frame. Now: CAS is a crop guide — one real 1:1 render (campaign-d) with
the 4:5, 9:16 and 1.91:1 canvases as hairline outlines round it, labelled at their corners
(.cg, .cg-f); hover brightens the outlines. OPS is a real three-page carousel fanned (weekly,
agents, review — all true 3:4 renders) with page dots, beside a 9:16 story frame that shows the
listed render whole on black (.og). Phone: both stages scale to .82 in a 200px band.

## SAFARI, TABLET AND PHONE PASS (2026-11-03)
Seen in real Safari (captured by window id) and measured in the Browser pane at 1440 / 1024 /
820 / 375.
- Safari crushed "Where everything is": .rd set only height + aspect-ratio, and Safari sizes an
  auto grid track by the photo's own width. .rd now carries width:calc(var(--h) * var(--a)).
- Pick up / Projects tiles were CSS columns: Safari spread a few tiles over every other column
  and dropped some lazy pictures. Now a grid (--n columns, auto-fill) packed by stack()/pack():
  each li spans ceil((height + gap) / 2) rows of 2px; repacked on each picture's load (a timer,
  not rAF) and on width change (ResizeObserver); a grid with no width waits. No loading=lazy.
  The Browser pane runs no animation frames, so neither rAF nor ResizeObserver fire there —
  reload after resizing the pane before judging the packing.
- The page settle (.pg[data-in]) starts at opacity .5: Safari pauses animations in a covered
  window and the page sat invisible.
- Status's board had its columns in an inline style, so no media rule ever applied. In CSS now:
  four columns; two by two at ≤1100; one 84vw stage per swipe on phones (scroll-snap).
- Home: side column kept (320px, heads on one line) down to 900, Next up picture 200px; below
  900 it stacks. rd() writes --h inline, so the media rules override it with !important.
- Phone: Next up is a compact card (112px picture beside the text); filter chips are one
  swipeable line; Access's tabs (access.js) fit at 13px and scroll if they must.
- The home's Access badge was missing until a route ran after the admin list loaded; access.js
  now fires provident-access on the home when the waiting count changes.
- Test server: /dev-signin?as=<email or role>&go=<route> and /dev-seed?auto, for a browser
  that cannot be clicked from a script.

## THE SKY OVER THE GREETING (2026-11-03)
By request: the home's greeting sits in a rounded panel (.sky, card colour, hairline ring) with a
quiet sky for the time of day behind it, faded out where the words are (a left-to-right mask on
.sky-l), and the date and time in a small pill at the top right (.sky-t). SKY_K holds keyframes by
minute of the day — night, dawn 6:30, a clear and cloudy 9:00, midday, a warmer 16:00, sunset
17:45, dusk 19:15, night 21:00 — interpolated each minute by skyPaint() into --s1..3 (gradient),
--sc / --sx / --sy / --sr (the sun crossing the right half 6:30–18:30, low at either end, a small
moon after), --co / --cc (four clouds, SKY_CLOUDS) and --st (stars). NO LOOP (by request): one entry when
the home loads or is opened again — the sky fades up, the sun settles, the clouds slide in one by
one ([data-in], ~2 s). The queues arriving re-render the page, so skyT0 marks the entry and a
redraw inside SKY_ENTRY resumes it with a negative delay (--ent); after it the sky is drawn still.
Reduced motion: no entry.
Dark theme: the sky at .58. Light theme: clouds get a blue-grey underside (drop-shadow) or white
vanishes on a pale sky. Chrome colours only — nothing on any canvas.

## Refresh after the Drive hour (2026-11-04)

Home's only CAS read is `providentReviews.refreshSum` (the CAS Status page is not mounted on
Home). It and `dsDiscover` used to check `providentDrive.valid()` and quietly return when the
token's hour was up, so for a CAS-only role (PM, CT) Refresh and the minute tick read nothing
for good, while the footer still read "Read from Google Drive …". OPS roles recovered only
because `Feed.load` calls `ensure()`. Both now `await D.ensure()` (silent renewal through
api/gauth, never a prompt). When renewal fails, `refreshSum` sets `sumSign` and the footer says
the sign-in ran out, with a Sign in again link (`data-drive` → `connectDrive`).

## THE TOP BAR SHOWS ONLY A ROLE'S PAGES (2026-11-04, by request)
Projects shows when `designs()` has a studio (designers, SMM, the admin); Access only for the
admin (the account menu already carries the role and Sign out; `#/access` still works). Set in
`route()` with `[hidden]` (`.uh-nav a[hidden]{display:none}` — `.uh-nav a` sets display). While
the admin previews a role the Access tab goes too; the banner's End preview is the way back. The
"Pick up where you left off" desk reads `designs()` instead of `studiosFor()`, so the content team
and PM no longer see this computer's saved projects. Verified on the stand-in: CT and PM Home ·
Status; SMM + Projects; admin all four.

## An item page reads first (2026-11-05)

Opened on `#/item/<cas|ops>/<id>` (a link, a reload), `startWork` names the CAS ad set
(`providentReviews.want`) before mounting, mounts only that page's studio, and mounts the other
plus `refreshAll(false)` 4 s later; `openItem` sets `want` before `mount` (mounting first started
the whole list). Detail in reviews-sharing-drive.md, "AN AD SET'S STATUS PAGE OPENS AT ONCE".

# FOUR FIXES ON THE HOME (2026-11-05, by request with marked-up screenshots)

- **The role preview is one quiet line** (`#pv` > `.pv-in`, /impeccable): an eye (`g-eye`, new
  symbol), "Viewing as" with the person's initials, name and a role chip, the warning "A step you
  press here is really taken" (the old sentence is its tooltip), and **End preview** (with an x)
  at the end. The page ground with a hairline under it replaces the navy slab; under 720px the
  warning and role chip drop. A role-only preview shows the role's name in place of a person.
- **Status board cards wrap a long name**: `.cd-n` is min-width 0, the title breaks at its
  underscores (`<wbr>` after each) and anywhere else, and stops at three lines; the full name is
  its tooltip. "Carousel_Prism_GoldenVisa_5in5" used to run past the card.
- **A ready post's files (`viewFiles`) are the desk's cards** (`.fz-*` restyled after `.rc`):
  the render whole at its own shape on top, its size and file name under it (the name clamped to
  two lines), the ring over both, a compact Download at the foot, five across like Projects.
  Checked with stand-in images (the stand-in's posts have no exported files).
- The OPS post page's back link is post-flow.js's (see ops-posts-and-hub.md).

## Status's Closed column (2026-11-06, by request)
"On status window, add a column where all the posted and launch task go. Call it Closed."
Supersedes "There is no Delivered column" above. `STAGES` gains `closed` (Closed, "Launched or
posted", `--ps-ink-2` dot; whoOf: CAS-only "Launched", OPS-only "Posted"); `MOVING` is the four
without it and drives Home's **Where everything is** (its "in motion" count is `data.rows`, which
holds no closed row). `build()` no longer drops a row with `live` (CAS `rsLive`, OPS `rs.posted`
— both rows already carried `live` and the step "Launched" / "Posted"): it is stamped
`stage:'closed'`, `mine:false`, kept in `data.closed`, newest `live` first; the content team's
is empty (it sees only what waits on it). `viewStatus` and `get()` read `rows.concat(closed)`, so
the filter counts and an item page include them. A Closed card shows `ago(live)` in the due slot,
never a due date or an overdue count. `.bd` is `repeat(5,minmax(200px,1fr))` (5 × 84vw on a
phone; two by two ≤1100 unchanged). Launch / Posted confirms say "moves it to Closed on Status".
Verified: a CAS and an OPS ready row marked `live` in the local queue (storage event) landed in
Closed, newest first ("1 h ago", "2 days ago"), Ready went 11 → 9, Home read 42 in motion with
four stages; five columns at 1440 with no sideways scroll; queue restored from Drive on reload.
**Closed is hidden by default (same day, by request).** A `.tg` toggle **Show closed <n>**
(`#sx-closed`, shown only when `data.closed` has rows) after Only what waits on me; `sxClosed`
is kept in `provident-sx-closed` ('1'/'0', a per-viewer convenience). Off: the board draws `MOVING`
and the filter counts leave closed rows out; on: `STAGES` and `rows.concat(closed)`, and the
Closed column scrolls into view. `.bd` columns are `repeat(var(--n,4), …)` (and `var(--n,4)` × 84vw
on a phone) with `--n` set inline to the stage count. Verified at 1440: 4 × 303px off (Everything
27), 5 × 240px on (29), choice saved, no sideways scroll; queue and toggle reset afterwards.

## Projects row aligned; Google photos (2026-11-11, by request)
- `.pj-tools .flt{margin:0}`: the filter chips' own 14px bottom margin lifted them above the Open
  buttons (Status already zeroed it in `.sx-tools`). Measured: chips, Open buttons and search all
  centre at 219px.
- **Google account photos where initials were.** api/share.py `acc_who` asks Drive `about` for
  `photoLink` too (`_acc_photo`); `acc_me` stores it on the user (`photo`), `acc_pub` and `acc_team`
  return it. access.js keeps a photo map by email and by name (`provident-photos`, so step logs that
  carry only names find one), `phNote` from accme / acclist / accteam, and `avIn(n, e, ini)` draws
  `<img class="acx-ph" referrerpolicy="no-referrer">` with an onerror fallback to the initials;
  exposed as `providentAccess.photo` / `.avIn`. Used by every `.acx-av` (access pages, picker), the
  home's account button and menu, Status cards (`x.from`, "You" = me), the Access identity card, the
  preview bar, and share-link's activity log and "Editing as" (`.shl-av`). The home calls
  `acc.team()` once after sign-in to learn everyone's photo and redraws on `provident-photos`.
  The stand-in gives every account Google's default picture. Verified: the account button and 14
  Status card avatars drew photos.


## Video Studio in Your studios (2026-11-13)
Your studios ends on a **Video Studio** row for whoever designs CAS (`cap('design-cas')`). CASV runs
on the designer's own computer, so the row is a plain link to `casvAt()` (`http://localhost:8794/`,
or `localStorage['provident-casv-local']`), in a new tab; it has no `data-k`, so the "continue the
newest project" rewrite leaves it alone. The page is not on the website. See
`docs/notes/reviews-sharing-drive.md`, "A video on the ad set".


## Status, organised: an Overdue lane, combining filters, list view, sort, group, density, folding columns (2026-11-18, by request)
"Make this more usable with additional filters, conditional filters, and view controls, also the
overdue task i need it hidden somehow, or at least a toggle to turn them off or maybe they go to
other kanban board." Nine of fifteen cards were overdue, so the board read as an alarm. All of it
is in `index.html` (`viewStatus`, the click handler, the "STATUS, ORGANISED" CSS block); no data
change, no kit change (page-local styles on `--ps-*` tokens), the writers `inboxCas` / `inboxOps`
untouched.

- **Two kinds of state.** `sxV` is the viewer's layout, kept in `provident-sx-view`
  (`{v: board|list, sort: due|name|updated|stage, grp: stage|from|kind, den: cozy|compact,
  late: lane|stage|hide, col: {<group key>: 'c'|'o'}}`, every value validated against `SXV`).
  `sxFl = {stage, due, from}` are the facet filters; like `sxF`, `sxMine` and `sxQ` they last for
  the visit. `sxClosed` keeps its own key.
- **Overdue** (`dueK(x) === 'late'`; a closed row has no due state). `mode` is `sxV.late` when the
  scope holds any overdue row. **lane** (default): overdue rows leave their groups for one
  **Overdue** group (`k: 'late'`, `#col-late`) at the end, folded until opened; their date is quiet
  (`.due[data-q]`, ink-2 with the red dot) because the lane already says it. **stage**: as before,
  with the "n overdue" badge on a column. **hide**: filtered out, and `.sx-n` says "n overdue
  hidden". The button (`data-mn="late"`) appears only when something is overdue and always carries
  the count. **Due: Overdue ticked beats the mode** (`wantLate`): hidden work shows, and the lane
  opens even if it was folded by hand.
- **Filters combine.** `pass(x, skip)`: kind chip AND waits on me AND the name AND every facet;
  inside a facet any ticked value. `opts(k)` counts each value under the *other* filters and lists
  only values that exist (plus any still ticked); a facet with one value is not drawn. The
  **Content Hub** chip (`sxF === 'hub'`, a subset of Organic posts, whose count is unchanged) is
  drawn only when the scope has hub rows. **From is the row's `from`** (who last handed it on; the
  hub's rows say Content Hub) — the rows carry no assignee, and none was invented. Active filters
  are `.fc` chips (`data-fx`), **Clear all** from two up.
- **Groups** (`gs`): stages (only the ticked ones when the Stage facet is in use), or `from`, or
  kind (cas / ops / hub, here a partition), each `{k, id, n, who, f, rows}`, then the lane. Stage
  groups keep `id="col-<stage>"`, so Home's `#/status?stage=` ring still lands, and that stage is
  never folded. `folded(g)`: the viewer's own `col[k]`, else the lane, else a stage with no rows
  that is empty in the scope or was emptied by a discrete filter — **never by the search**, so
  nothing moves under typing.
- **Board** is a flex row now (`.col{flex:1 1 0; min-width:200px; max-width:460px}`; a folded
  column is a 44px `.col-r` rail with vertical text; 641–1100px wraps two-up with the rail as a
  full-width bar; a phone keeps 84vw snap columns). `--n` is gone.
- **List** (`.lv`): the same groups as collapsible sections, rows are the same links; headings
  Name / Stage / Due / Updated sort (`data-ss`). ≤1100 drops From, a phone stacks the row.
- **Sort** `cmp`: due (mine first, soonest, as before), name, updated, stage (offered only when not
  grouped by stage; `so` falls back to due).
- **Menus** are drawn by `viewStatus` (`sxMenu`), not popovers, because every tick redraws the
  page: `.pm[data-in]` animates on opening only, a click outside `.pp` or Escape closes, `sxDraw(fk)`
  redraws and puts the focus back on `[data-fk]`, and `redraw()` skips while a menu is open. On a
  phone the menu is a fixed sheet at the foot.
- **Verified** on the stand-in (15 rows, 8 overdue), dark and light, reloaded into each: 0 contrast
  failures over 18–139 text nodes per state (board with filters, each menu, stage mode, compact,
  list, the empty state); no sideways scroll and a 55px top bar at 1440 and 1280; two-up at 900;
  phone 375. Every facet, three combined (Campaign ads + Stage: Design + Due this week → 3 of 15),
  chip removal, Clear all, the three overdue modes, Due: Overdue against Hidden and against a
  folded lane, group by From and Kind, each sort, compact (card 141 → 100px), list sort headings,
  `?stage=ready`, a card's click-through to its ad set page and back, an injected hub task (chip,
  kind group, `#hubopen=` link), Preview as content team (nothing, no waits-on-me switch) and as
  performance marketing (campaigns only). **Not run:** real Drive, Safari, a real phone, the
  keyboard through a screen reader.

# ENGINE: PDS'S OWN STATUS PAGE (2026-11-18)

By request ("an AI dashboard … a live engine status page where everything updates … a log of
timelines, dates and times when the commit was done, and constantly logs new commits and
deployments"; /impeccable). `#/engine`, for the admin and roles that open `arch` (AI Engineers by
default). All of it is **engine.js** (its own file, own `<style id="engine-css">`, chrome tokens
only); index.html adds the script, the `g-sync` symbol, the nav link (hidden unless `seesEngine()`),
the route, and lands an AI Engineer (or a named role) whose role opens nothing else on it.

- **Data**: `acc.call('engine', {have: newest sha})` → api/share.py `engine` (gated server-side the
  same way): GitHub's commits on main (walks back to the first commit when the server or the page
  holds nothing) and deployments with their latest status, cached per instance with ETags; final
  states are never re-asked. Re-read every 30 s with `GITHUB_TOKEN`, every 3 min without one —
  measured: GitHub counts an unauthenticated 304 against the 60/hour limit, which is why the
  browser does not call GitHub itself. The page keeps the list in `provident-engine-v1` and polls
  every 30 s while visible.
- **Layout** (Operate, the Quiet Desk): headline + live dot (good / Behind / Not connected) +
  Refresh; **In production** (the newest successful Production deployment, a build in progress or
  a failure under it); four services as one ruled strip (studio server and Google sign-in timed from
  the browser, the share store's health — "Retired" on a 410 — and GitHub's remaining reads); a day
  strip since the first commit (√-scaled bars, darker on deploy days, click jumps to the day); the
  timeline (24-hour times, the commit's own label kept in ink-2, area tag, deploy chip, sha → GitHub,
  sticky day heads, search, area chips, 60 at a time) beside **How PDS is built** (eight areas, their
  files, last change derived from commit labels; click filters the timeline). No hero metrics, no
  kicker labels, no monospace: the sha is Google Sans Flex with tabular figures.
- **Verified** on share-dev :8799 with the real GitHub (unauthenticated): 406 commits, 99 deployed,
  the live deployment c386e41; light, dark, 1440, 1280 (top bar fits, 1265 of 1280), 375 (no overflow);
  the AI engineer lands on Engine with Home, Status, Engine in the bar. Not run: on Vercel, with a token.

# ENGINE › HOW IT CONNECTS (2026-11-18, later)

By request ("a diagram view how all apps are connected, and what external apps are connected, show
also live status if connections are working"). A map between the services row and the day strip:
four lanes (this Mac and the office · the browser · PDS server · outside services), 18 boxes and 23
lines (`NODES`, `WIRES` in engine.js). Boxes are laid out by CSS (they wrap on a phone); the lines
are an SVG drawn over them from the boxes' real rectangles (`drawWires`, on a timer, not rAF — a
background pane never fires rAF — and again on resize), routed down, up or sideways by where the
boxes sit. Each line takes its colour from one check (`stateOf`): the browser's own probes (Drive
about with this computer's token, Google Translate, the Content Hub's `/api/imports` — 200 or 401
both mean up; a CORS failure with an opaque no-cors answer means the ngrok tunnel answers but the
hub did not, which is what an ngrok sign-in in front of it looks like), the server's `links` in the
engine answer (`eng_links()`: Upstash PING, Anthropic `/v1/models?limit=1`, Roam `user.list?limit=1`,
the key names set; every 5 min), and **Check this Mac** (127.0.0.1:7311 / 7312 / 7313 and
localhost:8794, CORS then no-cors; remembered in `provident-engine-mac`) — only on a click, because
Chrome asks for local-network permission. Hover or focus a box: its lines stay, the rest dim.
Verified on share-dev :8799 at 1440 (light, dark), 375 (no overflow after the heading wraps); this
Mac's four helpers really listening matched the four green boxes; the hub's tunnel now redirects
to idp.ngrok.com, shown amber.

# ENGINE: THE MAP IS DATA, ALERTS, SHARE, A SECURITY PASS, THE TIMELINE BAR (2026-11-18, later)

By request ("make sure this diagram updates every time a push and commit affects it, also have
notification if something is disconnected … make sure there's no security risk … the share feature
… /impeccable redesign this section").
- **engine-map.json** (site root) is the map: lanes, nodes {id, lane, name, about, check, own},
  wires {from, to, check, carries}. engine.js fetches it on mount and again when the live
  production deployment changes (poll sees a new `liveSha`; toast "PDS updated"). op engine reports
  `mapAt`, the commit that last touched the file (commits?path=engine-map.json, ETag). CLAUDE.md
  has the standing rule. Values are cut to 200 characters, ids to [\w-].
- **Alerts** (`alerts()`, `watch()`): engine.js starts a 60 s watch on any home page once
  providentAccess says admin or `arch`; each poll and each probe re-judges. Only red ('bad') alerts;
  'wait' (still checking) is never news — a recovery is announced only after a real answer (a test
  caught "answering again · Checking…"). State kept in `provident-engine-alerts`; desktop
  notifications only after a click (`provident-engine-notify`) and only when the tab is hidden or
  on another page. Badge `.eg-nb` on the Engine link, "(n) " in the title, `#eg-down` banner.
- **Stale states**: what the server reports (Upstash, Anthropic, Roam, keys) reads "Unknown while
  the studio server is not answering" while accstatus fails or the last engine read failed — a
  screenshot showed Upstash "Answering" beside a dead /api/share.
- **Share**: `#eg-share` popover (Escape and outside click close): the live link + Copy, the AI
  Engineers (acc.team), and for the admin `accset {add, role ai}` then a mailto with the link; no
  mail is sent by the page.
- **Security pass**: op engine and accrole gated server-side (verified: designer, outsider → 403;
  AI engineer can't accset/accrole); `links.keys` booleans only, no values; GITHUB_TOKEN server-only;
  every HTML write escaped; states whitelisted before attributes; commit/deploy ids must be 40-hex;
  a deployment's link must be https; external links `noopener noreferrer`; local probes are GETs to
  health routes only, on a click. Residual: the Engine shows public repo data; the role gate for the
  page shell is client-side (the data isn't).
- **Timeline bar** (/impeccable): one sticky bar (`.eg-tb`, under Home's real top-bar height `--hdh`)
  — title, "n of N · filters · Clear", search; then All | Deployed as a switch and the areas as one
  row that scrolls sideways (masked edge) instead of wrapping. Only + area combine (`E.only`,
  `E.area`). Day heads stick under it (`--tbh`). Verified 1440 and 375 (107 / 237 / 237 px stack).

# HELP: THE SUPPORT PAGE, BY ROLE (2026-11-18, by request)

"Create an entire tutorial and how-to articles and video walkthrough, support page of CAS + CASV,
then separate for OPS, separate for the unified home, how to navigate in each view (roles)" — and
"the access and views only filter to the roles". Asked first and answered: the videos are
**captured walkthroughs** (real screens, played step by step, silent), each with a slot for a
recorded video later (`video:` on a guide: an MP4 plays inline, any other URL in an iframe); it
lives on the home as **`#/help`**, not a separate page. Structure chosen on the impeccable
decision page: **"I need to…"** (a role's jobs as rows) over "view maps first" and a three-column
docs reader. Surface brief: `.impeccable/surfaces/help-js.md`.

**Files.** `help-content.js` is the words only (33 guides, 6 view maps, 14 troubleshooting
answers, one line and three "Start here" guides per role), written from `CAS-OPS-GUIDE.md` with
on-screen names in **bold**. `help.js` is the page and the player, mounted like `engine.js`
(`render(parts, q, ctx)` / `mount(pg)`). `help/frames/*.webp` (28, captured at 2× so the player's zoom stays sharp, ~3.3 MB) and `help/frames.json`
(the box of each part a step rings, in % of a 1440 × 900 viewport).

**Who sees what.** A guide's `who` is a list of capabilities from Access › Roles (`design-cas`,
`tickets`, `copy-en`…) or a role family (`smm`, `pm` = pm + dmt, `ct` = cten + ctar + ct,
`admin`), or `all` / `out`. So ticking a capability under Roles changes that role's Help with no
code change, and a named role (`x-…`) gets exactly the guides its ticks earn. The admin sees all;
**Preview the home as** a role or a person shows that role's Help (the ctx is built from
`acc.now()`, whose `raw` is the previewed role and whose `admin` is false while previewing).
Signed out, `#/help` is the only route the gate lets through, and it shows only "Sign in and get
access". **It is a view, not a lock**: `help-content.js` is a public file in a public repo, and
nothing in it is secret. A guide opened by URL that the role does not see says "This guide is for
another role".

**The capture route** (`tools/help-capture/capture.py`, standard library, drives Chrome through
`tools/studio-mcp/chrome.py`). A fresh `share-dev` server, `--seed` once (it runs `/dev-seed` in
the capture browser's OWN profile, because the demo's saved projects live in that browser's
IndexedDB; seeding twice doubles the server's demo data — it happened once here), `--photo` a
picture to drop into the CAS and OPS photo slots (the frames use a still of CASV's Palm Springs
test clip, taken through a canvas on the 8794 origin). Three things it had to learn:
- **A studio with nothing open goes to the home's Projects**, and a seeded saved project opened by
  `#recent=` lands on the splash and then goes there too. The tool opens the card's own
  `#recent=` link, waits for the engine (`__ps.eng()` from `page.js`), then sets
  `screen` to `workScreen()`; an injected script holds `html.rs-on` (the class that already stops
  the move for an ad set window) until it has. Never on a `#share=` page, which it blanks.
- **Opening a saved project reloads the page**, so the wait runs in a retry loop.
- **Image slots take a dropped file only on the `<image-slot>` element itself**
  (`handleEvent`), not on its `.p-drop` wrapper; a synthetic `DragEvent` with a `DataTransfer`
  works.
Campaigns, posts and review links are found by name each run (the seed's ids change).

**The player.** One ring (`box-shadow` 2.5px link + a 9999px dim spread, zero offset and blur — a
mask, not elevation) glides between the step's part on each frame (520 ms on the kit's ease); a
step with no screen of its own shows as a card over the last one. The four-capsule step
segments are the progress bar (each fills over 5.6 s). Space, ← → and the segments move it;
it pauses while the tab is hidden; reduced motion starts it paused with no transitions. The home
re-renders `#pg` on every queue refresh, so the route leaves a Help page alone when its path and
role have not changed (`pg._hk`) — otherwise the walkthrough restarted every minute.

**Traps hit.** `help.js` appends its stylesheet before `index.html`'s own `<style>` is parsed,
so an equal-specificity rule there wins: the phone rule hiding the Watch button needed `.hp .hp-go`.
`loading="lazy"` on the zoomed, absolutely placed thumbnails never fired in the phone emulation;
they load eagerly.

**The studios** link to it from a **?** in the sidebar's account chip (`access.js`, both studios
in one place), opening `#/help?a=cas` or `?a=ops`. The icon is Material Rounded `help` wght300.

## The content team's row names their check (2026-11-18, by request: "Fatema's tasks not showing properly")

Seen on the live site (Preview as Fatema, ctar): The Vault by Imtiaz had its 4 Arabic designs sent
to her (design done, `it.to` = exec2.content) while the 4 English designs were still in design.
`rsMine` counted it as hers, but `inboxCas` took the row's `step` from the campaign's first
unfinished audience step, so she saw **"Design · Local · Broad · In progress"**, the step bar at
Design, and the card in Status's **Design** column ("With design") — nothing said a translation
check was waiting.

- `inboxCas` (share-link.js): for role `ct`, the items waiting on this viewer (`it.design && !it.copy
  && ctLangOk && toMine`, the same test as `rsMine`) set `step` to `Translation` (all Arabic) or
  `ENG copy check`, `sub` to "N Arabic|English design(s) to check", and the verb to "Check the
  translation" for Arabic. `stageOf` then puts the row in Copy check. Other roles' rows unchanged.
- index.html: `viewerName()` — the greeting and the "from you" rewrite use the previewed person's
  name (`now().previewWho`), not the admin's, so a preview no longer says "Good afternoon, Kelvin"
  or "from you" on work the admin sent.
- Verified: the patched `inboxCas` run on a copy of the ad set as ctar → "Translation · 4 Arabic
  designs to check", mine; as cten → unchanged, not mine. Not yet live: needs a deploy.

**Finish review (impeccable-finish-reviewer, fresh context).** First pass: "recapture" — the
full-page shots were taken before the frames painted (now: scroll through, wait for every
`img.complete && naturalWidth`, `decode()`), and signed-out Help had been let out of the gate's
bare bar (`body[data-gate]` now applies to it; it carries its own **Sign in with Google**).
Second pass: "fix", eight items, all taken: the studio switch moved up beside the search, above
Start here (it had straddled the fold at 1440 × 900); frames at 120 px; **the camera** — the
player scales and moves `.wt-cam` (the frames and the ring together, transform only) onto the
step's part, up to 1.8× on a wide stage and 2.6× under 600 px, the ring's line divided by the
zoom so it stays 2.5 px; tabs never wrap (`nowrap`, the track scrolls on a phone); thumbnails
crop wider (1.22×) so words are not cut; rows say the real runtime ("22 s to watch", 5.6 s a
step) and the article says it apart from the time the job takes (`min`); a tab's count is the
rows it lists (Start here guides are not counted twice); the rows' step segments fill from what
this viewer has watched (`provident-help-seen`, this computer only); `text-wrap:pretty` on the
job line.
After that verdict (the second and last review round): the two bad thumbnails got their own
pick (`th: [frame, part]` on the guide: `home-ticket`, `cas-pickup`), the frames were
recaptured at device pixel ratio 2 (the 1.25× set went soft under the camera's zoom), and the
watched-segments fill was proven with `provident-help-seen` seeded in the review capture. Not
re-reviewed after these three.


## Tracker absorbs Status (2026-11-20)

Tracker (`#/tracker`, added the same morning as Status-as-rows) and Status looked too alike, so by
request Status became Tracker's **Kanban** view: a **Progress | Kanban** switch (`tkSwitch`, two
links, `.tk-vs`) at the head's right. **Progress** (Launch deliverables EN/AR, Organic posts' steps)
stays the default; **Kanban** is `viewStatus` unchanged, every control kept (its Board | List
included), under the Tracker title. Status left the top bar. `#/status` is rewritten in `route()`
to `#/tracker?v=kanban` with `history.replaceState` (its `?stage=` kept), so post-flow.js's
hand-back, `tools/help-capture/capture.py` and old bookmarks still land; `sxDraw` and `redraw()`
now key on the tracker route. The help frames named `status*` still show the old top bar and
title until they are recaptured.

## Tracker's controls cover both views (2026-11-21)

By request ("place [the Kanban's controls] outside the tracker, so it affects progress and
tracker"): the kind chips, search, Filter (Stage, Due, From), Only what waits on me and Show
closed now sit above the view, under the head, and narrow **Progress** as well as **Kanban**.
They were already page state (`sxF`, `sxQ`, `sxMine`, `sxFl`, `sxClosed`), so they carry across the
switch. Shared code: `tkScope()` (rows, `pass`, `opts`), `tkBar(S, pmIn, board)` (the two rows;
`board` is the Kanban's own Overdue placement, Board | List and View, appended to the second row),
`tkActs()` / `tkActRow()` (the removable chips and "n of N shown"); `po` moved to module scope.
Progress's Launch | Organic posts chips are gone: the kind chips replace them, `?v=posts` sets the
Organic posts chip and drops the query, and with both kinds showing the rows sit under
"Campaign ads" / "Organic posts" headings (`.tk-sec`). Progress keeps its own sort (due, then
newest). `sxDraw` now redraws on any `#/tracker` route. Verified on the share-dev stand-in
(15 rows): kind, search, waits-on-me and a Stage facet narrow Progress; the search and chips carry
into Kanban; desktop and phone width.

## Tracker counts designs and the ad set's video (2026-11-21)

By request, on The Vault by Imtiaz (one audience, Local · Broad, with Design 1–4 and a video in
its Video section): "count this as MVP video in the tracker" and "quantify [the designs] on the
tracker". `inboxCas` (share-link.js): a video in `rs.video.list` ticks MVP video in both languages
for every design of the audience it was added for (`lblRoot`: the label without " · Design n" /
" · Unbranded"), or every audience when its `aud` is empty (All audiences); a manual tick still
counts. `auds` is now distinct phase · market · `audRoot(aud)`; `dsg` is every `rsAuds` entry.
`tkCampaign` prints "n audiences · m designs" when they differ; cell titles say designs. The
counts refresh the next time a computer reads Status. Verified on the stand-in: Ellington with an
All audiences video read MVP video 2 of 2; Palm Springs with a "Launch · Local · Family" video read
3 of 7 EN (Family, its Unbranded and Design 2) and "5 audiences · 7 designs".
- Follow-up the same day, "count them": the Animated badges. `dsInfo1` already reads every
  project for Status; it now adds `anim[sid]` when the project's `review.sum.anim` is set (CAS's
  `rvSum`: variants with a video background), and `inboxCas` ticks Animated for a design in the
  language of that project. Verified on the stand-in: one English project marked → Ellington's
  Animated went 0 of 2 → 1 of 2.
- Same day, "MVP is english only as well as copy, arabic does from google translate rail, so in
  that case redesign this UI": `inboxCas` stops adding Arabic to `video` and `copy`; `TK_EN` in
  index.html draws each as one `.tk-c[data-en]` (grid-row: span 2, "English only" caption) in the EN
  row and nothing in the AR row; on a phone (`.tk-gm`) it spans both language columns. `tkCount`
  counts them once, so VAULT's ring reads n of 6. Checked by running `tkCampaign` headless (jsc)
  with VAULT's numbers (6 desktop cells, 2 spanning, ring 4 of 6); the Browser pane was blocked by a
  page-opened popup, so not yet looked at on screen.

## Tracker: signed off is not everything delivered (2026-11-21, Revision 1.35)

From the /impeccable critique (warn, don't block, by the user's choice): when `x.ready` and
`tkCount` is short, the row's step line reads "Signed off · N deliverables missing" with a warn
dot (`.tk-short`) instead of "Ready to run · Package ready". `tkWhen` drops the overdue marker on
ready work and shows "Deadline" under the date. The ring caption reads "deliverables in" / "all
delivered" (it said "done, EN + AR" under English-only cells). The grids are `role="group"`, and
each `tkCell` is `role="img"` with an aria-label (kind, language, state). The no-data line links
to the Kanban. Checked on screen at desktop and 375 px.

Polish (Revision 1.36): every `.sh` section label is `role="heading" aria-level="2"` (the outline
went h1 → h3); `.flt button` and `.tg` get the 2px ink focus ring; below 480px `.uh-nav` fades its
right 32px (mask) so the scrolled-off links read as more.

Second critique (Revision 1.37): `isLate` now skips a CAS row that is ready (`x.ready` or
`stageOf(x) === 'ready'`), so Home's board and the Kanban's Overdue lane agree with Progress; an
OPS post ready past its date still counts (publishing is late). Progress rows' links have an
aria-label with the campaign or post name.

## 2026-11-21 (evening) — the phone view (Revision 1.39)

/impeccable critique of the phone view scored 22/40: a desktop layout that reflowed. Fixed, by
request ("run all of them"), in one PHONE block at the end of index.html's styles plus a
`pointer:coarse` block (and their twins in share-link.js and access.js):

- **Tab bar.** At ≤640px `.uh-nav` is `position:fixed` at the foot (60px + safe area,
  `--tabbar-h`), every link `flex:1`, 12px, the Access count an absolute corner bubble (inline it
  ran "ProjectsAccess" together). The header is `position:static` there (was a 107px sticky band).
  Anything fixed at the bottom lifts by `--tabbar-h`: `.pm` (Filter sheet), `.tst`, the Engine's
  `.eg-toasts` (with `!important`, its CSS is injected by engine.js) and `.rvd-sent`.
- **Home order** without touching the render: `.hm` becomes a flex column and `.hm-main` /
  `.hm-side` `display:contents`; `order` puts the side's first `.pan` (Where everything is) after
  Also waiting on you, then With others, the fresh line, Pick up where you left off (4 tiles on a
  phone, `paintDesk`), then Access and Your studios. `.hm > .sky` needed its own margin: the old
  `-18px` leaned on the grid gap and the Next up heading slid under the greeting.
- **Tracker phone row.** `tkCampaign` adds `.tk-ms` (what is missing, in words: "Animated EN,
  MVP video") and `.tk-xp` (Show/Hide the deliverables, `aria-expanded`); the grid `.tk-gm` shows
  only with `[data-open]`; `tkOpen` keeps it open across redraws. The hide rule for wider screens
  is `@media (min-width:641px)`: a plain `display:none` after the phone block won and hid them.
  "· N deliverables missing" is wrapped in `.tk-shw` and hidden on a phone (the line below says it).
- **Touch.** 44px minimums by `min-height` (beats every fixed `height` without a specificity
  fight); text links (`.b-l`, Refresh, See all, row titles, the wordmark, "Use another account")
  keep their look and get an absolutely positioned `::after` hit area; inputs 16px.
- Measured after: no sideways scroll at 320/375/414; no control under 24px except the search
  input, whose 44px label takes the tap; every field 16px; cards ~190px (were ~485). Desktop
  unchanged (nav in the sticky header, full grid, no phone row).

## The live Tracker critique: one Overdue, one name, attention order (2026-11-25, Revision 1.69)

/impeccable critique of the live Tracker on the office server (real data: 23 rows): 24/40. By
request the three P1s, in the user's order and with their choice of name.

- **The Due filter reads the lane's test.** `FV.due` was `dueK`, so Filter › Due › Overdue (3 live)
  listed signed-off ad sets whose rows say "Deadline" while the Overdue lane (`isLate`) held other
  work. Now `dueF`: a signed-off campaign past its deadline is `'past'`, shown in `DUEK` as
  **Signed off, past deadline**. A post ready past its date stays Overdue, as in `isLate`.
- **One name: Signed off** (user's choice over "Ready to run" / "Ready"). `STAGES` ready's `n` is
  "Signed off" (Kanban column, Filter › Stage, Home's Where everything is). In `build()`, a
  campaign row with `y.ready` and `shortOf(y)` gets `step` "Signed off" and `sub` "n deliverables
  missing"; only a complete one keeps the studio's "Ready to run". The guard is `y.ready`, not the
  stage: `stageOf` also reads the step text, and a renamed step would fall to Design. The ad set
  page's per-audience "Ready to run" (share-link.js, "this audience is complete") is a different
  thing and stays.
- **Progress in attention order** (`viewTracker`, `att`): waits on you 0 · late (`isLate`) 1 · in
  progress 2 · signed off with something missing 3 · all in 4 · closed 5; then due date, then
  newest. Live, the only row waiting on the viewer was row 8 and the first three were signed-off
  October/November deadlines. Mine rows get `data-mine` (the Kanban card's `--ps-link` ring, kept
  with `data-hot`'s red edge) and `tkYou`: **Waits on you** (`.cd-you.tk-you`) under the name,
  campaigns and posts.
- **Verified** on :8790 (seed, admin, 1440): Progress opens on the three rows waiting on the
  admin, then in progress, then Ellington / Damac "Signed off · n deliverables missing"; Kanban
  column "Signed off", cards "Signed off" + missing line; Filter › Due: Overdue 1 (the lane's 1),
  Signed off, past deadline 2. "Waits on you" 14.6:1 light, 5.91:1 dark (ring 5.91:1). The seed's
  first Progress read showed 15 rows from the previous session's stored inbox; after the refresh,
  10 on both views (one late post in the folded lane).
- Left from the critique: Done cells loudest / Missing quietest (P2), the Kanban List has no
  missing line (P2), organic posts ~2,500px down (P3), the Engine nav badge at 2.86:1.

## 2026-11-26 — the home-screen app (Revision 1.79)

By request ("it needs to act as a native iOS app"). The shared half (the head tags, `web-app.js`,
the studios) is in `docs/notes/chrome-and-design-system.md`, *THE HOME-SCREEN APP*. On this page,
one block at the end of the sheet, phone (≤640) and `pointer:coarse` only:

- **Header.** Sticky again (the 21 Nov pass made it static), one 52px row (`--uh-h`), glass on
  `.p-top::before` (NOT on `.p-top`: the fixed tab bar is its child, see the trap in the chrome
  note). `#uh-ttl` (new span, filled by `route()`: "Home", else the title before the dash) takes
  the wordmark's place at `data-past`, like an iOS large title. Controls 36px at a 44px pitch.
- **Tab bar.** Glass, 54px + inset (`--tabbar-h`, was 60), an icon over each word (`.uh-ti`,
  hidden on the desktop; new symbols `g-home`, `g-help`, `g-eng`), 11px labels, the current tab
  in full ink at weight 600 with a heavier stroke, no pill. It slides away at `data-kb`.
- **Sticky filters.** `.pj-tools` / `.sx-tools` stick under the header as glass; at
  `data-sdir="down"` a `clip-path` leaves only the first row (the chips, 60px). A clip, not a
  height: Safari has no scroll anchoring, and a collapsing sticky row would jump the list.
- **Folding groups.** `.pj-s > h2` (sticky under the chips), `.pj-gh` and `.hm-side .pan > .sh`
  toggle `data-fold` on their box (`foldTap`, `foldApply`; `role=button`, `aria-expanded`, Enter
  and Space). State is `localStorage['provident-home-fold']`, keyed by the heading's words, and
  a MutationObserver on `#pg` puts it back after every redraw. Phone only.
- **Bug found and fixed: Projects was 23,497px tall for 12 projects on a phone** (Home's desk
  772px for 4). The phone rule `.pj-g .dk2{row-gap:18px}` out-ranked `.dk2[data-st]{row-gap:0}`,
  so each 2px packing row carried an 18px gap. Now `.dk2[data-st]{row-gap:0}` in the phone block:
  3,391px.
- Verified at 375×812, light and dark: Home, Tracker, Projects (fold, sticky, clip), New.
  Desktop 1440: nav static in the bar, no icons, no title, tools static, nothing folds.

## 2026-11-26 (later) — the phone, second pass (Revision 1.81)

After /impeccable critique of the phone view (20/40). In the phone block at the end of the sheet
and the script after `route()`:
- **Four tabs:** Access, Engine and Help hide on a phone; `#uh-more` (a button in `.uh-nav`,
  hidden on the desktop) opens More's sheet: the account card, Access (with the pending count,
  also on the tab as `#more-n`), Engine, Help, Appearance (presses `#themebtn`), Sign in/out,
  Design system reference. More is the current tab on Access / Engine / Help. The header's
  theme button and account pop-over are hidden on a phone; New is 44px.
- **The sheet** `#sht`: `sheetOpen(html)` / `sheetClose()`, scrim tap, Escape, drag the top 64px
  down (110px, or a quick flick) to close; `data-sheet` on the root stops the page scrolling.
- **New** (`a[href="#/new"]` on a phone with two studios to start) opens `newSheet()` instead
  of the page; `#/new` itself still renders for a link.
- **Back:** `#uh-back` replaces the wordmark on `item/*` (to Tracker), `new*` and `files/*` (to
  Home) and `help/<guide>` (to Help); `history.back()` when this tab has been somewhere, else the
  parent. `.bk` / `.mnt-bk` hide on a phone. No footer on a phone.
- **Home:** the greeting is one compact card (26px + a 17px line, ~120px, was 220); with nothing
  waiting (`.hm[data-clear]`) Pick up where you left off comes first; Where everything is with
  nothing in motion (`.pan[data-zero]`) is its heading only.
- **Tracker:** the title and Progress | Kanban share a row; the lede hides; on a phone `tkBar`
  puts Filter and the switches INSIDE `.sx-tools` (`phoneQ()` at draw time; a phone↔tablet change
  redraws); Filter's `.pm` is a sheet with a dim. **Trap:** the tools' glass moved to `::before`
  and their fold clip is set only while folded — a backdrop-filter or a clip-path on the tools
  would contain or clip the fixed sheet inside them; and `.sx-tools:has(.pm)` goes to z 95 to
  clear the tab bar (a sticky z-index is a stacking context).
- **Projects:** the sticky studio heading sits under the tools' live height (`--tools-h`, a
  ResizeObserver) and under 60px while folded; Open a project / post file is one compact row.
- **Access (access.js):** below 641px the preview picker fits its column (it was 559px; the page
  576px wide); each person is one ~61px row with the role picker on the right (168px); Remove
  access… is the picker's last choice on a phone (`phoneQ()` at render) and still confirms; a
  person with no name shows their address once; every field is 16px. `#pg` keeps 28px under the
  title when the admin panel follows it.
- Measured: no sideways scroll on any page at 375; Access 375/375.

## 2026-11-26 — phone polish (Revision 1.82)
- **Folding headings stay headings.** The second pass put `role=button` on Projects' `h2` (and
  `.pj-gh`, Home's `.pan > .sh` with `role=heading`), which dropped their heading role. Now
  `foldApply` lays a `.fold-b` button over the heading (`aria-label` = the heading's words,
  `aria-expanded`); links inside a heading sit above it (z 2). Phone only; the desktop has none.
- **Heading levels:** Tracker's empty states (Progress and Kanban) were an `h3` straight under the
  page's `h1`; they carry `aria-level="2"` (look unchanged).
- **More** names an admin "Admin" (the account card said "Designer", the role an admin designs as).
- **Floating tab bar** (by request, from an annotated screenshot: "icons only, then a floating
  rounded corner container"): at ≤640 `.uh-nav` is a 56px glass capsule, 16px from each side and
  max(10px, the home indicator's inset) from the foot, radius 28; the current tab is a `--ps-fill`
  pill; the words are `font-size:0` (still in the markup for VoiceOver); `--tabbar-h` is the
  capsule plus its gap, so toasts and the send receipt sit above it. The studios' panel bar keeps
  its words (Components / Component / Layout are not guessable from icons).
- **Compact controls, iOS style** (by request, from an annotated Tracker: "more compactness and
  more iOS style layout for these long menus … go and find menus like this and change"). One
  pattern at ≤640: a 38px search field with a 38px round button at its end (`.sx-row`, `.sx-fb`),
  then a 32px segmented control (`.sx-seg`, also `.pj-ph .flt`, Access's `.ac-tabs`, Help's
  `.hp-sw`, and Tracker's Progress | Kanban).
  - **Tracker:** `tkBar` returns `tkBarPhone()` on a phone (drawn by `phoneQ()`): four rows
    (~300px) became two (~94px). Everything else is in one **Filter and view** sheet (`.pm.pm-sh`):
    iOS switches (`.pm-sw`, `role=switch`; same ids `sx-mine` / `sx-closed`, so the old handlers
    work), the facets (`tkFacets`, shared with the desktop), and on Kanban a `phx` string built in
    `viewStatus`: Board | List, Overdue work, Sort, Group, Density (the same `data-sv` /
    `data-sl` / `data-ss` / `data-sg` / `data-sd` buttons). The button counts what is on (filters
    + the two switches) and goes ink-filled. **Trap:** the dim behind the sheet is a real button
    (`.pm-dim`, `data-mn="filter"`); a `::before` on `.pp` swallowed the tap, because a click
    inside `.pp` never closes a menu.
  - **Projects:** `viewProjects` draws `.pj-tools.pj-ph` on a phone: search + an Open button
    (`data-pjopen`, a sheet with A project file / A post file), then the kinds.
  - The folded tools keep the search row (56px), and Projects' sticky heading follows.
  - Help's counts lose their pill inside the switch (`body .hp-sw button s`, help.js injects its
    sheet later).

# HOME IS "MY WORK" (2026-11-27, branch home/streamline, NOT on main)

By request, after the sandbox review (sandbox/, same branch): the home had too much on it for its
one job. `viewHome` is now one list.

- **`card(x)`** per `data.mine` row: the render, studio and due, the name, step · sub · from, the
  hand-off note, and one filled button (the studio's own `verb` / `href`, or Open the files for
  social media); Launch, Posted and the hub's approve stay as a quiet second button.
- Headline: "N things need you, <first name>." / "You're clear, <first name>." Empty and
  not-connected states are `quiet('home')` as before.
- **With others**: `data.others`, five rows, **See everything** → `#/tracker`.
- **Gone from Home**: the sky panel, Next up's pager (`cur`, `data-nx`), the studio filter
  (`homeF`), Pick up where you left off (the desk; Projects still has every file), Where everything
  is, the Access card, Your studios (and with it the Video Studio row — CASV now has no link on the
  home). Their CSS and helpers (`skyPaint`, `desk`, `paintDesk`, `studioLinks`) are still in the
  file, unused on this route; remove them when this lands.
- **Top bar, desktop (≥641px)**: My work (with its count, `#mine-n`) and Tracker. Projects, Help,
  Your access (with the waiting count) and Engine are in the account menu (`#mn-proj`, `#mn-eng`,
  `#mn-acc-n`), shown by the same rules as their nav links. The links stay in the nav for the
  phone, whose tab bar and More sheet are unchanged.
- Verified on :8797 (seed): admin 4 cards; Preview as pm (Open the package + Launch, Download what
  is ready), smm (Open the files + Posted), cten (clear); 0 contrast failures on 59 nodes, light
  (reloaded) and dark; top bar 55px, no sideways scroll at 1440; phone 375 no overflow.
  **Not done:** Tracker is not yet renamed or simplified; the guide, help frames and Grok notes
  still describe the old Home; real Drive and sign-in not exercised.

# TRACKER IS "ALL WORK": ONE TABLE (2026-11-27, branch home/streamline, NOT on main)

By request, the next step after My work. `#/tracker` now draws `viewAll()`.

- One table (`.aw`): render, name (kind, "waits on you"), step (the studio's segments, the stage
  name for a campaign or the post's own step, then `sub`), Made (`tkCount(x.dlv)` for a campaign),
  due (`dueEl`). A row opens its item page. Rows waiting on the viewer are tinted.
- Order is Progress's attention order (`att`): waits on you, late, in progress, signed off with
  something missing, all in, finished; then due date, then newest.
- Controls: kind chips (only when the role sees both studios; `sxF`, `data-sf`), Find by name
  (`#sx-q`), **Show finished** (`#sx-closed`, drawn only when something is finished). They reuse
  the old state and handlers, so `sxDraw` and the focus-return still work. `sxMine`, the facets
  (`sxFl`) and `sxV` are ignored here.
- **Not drawn any more**: the Progress | Kanban switch, the deliverables grid per campaign,
  Board | List, the Filter menu (Stage, Due, From), Only what waits on me, sort, group, density,
  the Overdue lane and its three modes, the folding columns. `viewTracker`, `viewStatus` and their
  helpers and CSS are still in the file, unreached; remove them when this lands. `?v=kanban`,
  `?stage=` and `#/status` all land on the table.
- Labels: nav and title "All work"; the item pages' back link "All work"; strings that said
  Tracker (quiet states, New, the launch / posted confirms) follow.
- Verified on :8797 (seed): 15 rows for the admin in attention order; Posts chip 7; search "palm"
  2 with focus kept; Preview as pm 8 campaigns, smm 7 posts; 0 contrast failures dark (87 nodes) and
  light (103, reloaded); no sideways scroll at 1440 or 375. **Not exercised:** Show finished (the
  seed has no finished work), real Drive. The guide's Tracker section, the help frames and the Grok
  notes still describe Progress and Kanban.

## All work: the deliverables check is back for campaigns (2026-11-27, later, branch home/streamline)

The user: "what happened to the check that PM needs on his view in order to track what's ready?"
The first cut of All work reduced it to a count. Now, when the list is campaigns only (a role that
sees only campaigns, which is performance marketing's whole view, or the Campaigns chip for anyone
else), `viewAll` returns `rows.map(tkCampaign)`: Progress's cards, with the Static / Animated / MVP
video / Copy grid in English and Arabic, the ring and Open the ad set, in the same attention order.
Everything and Posts stay the compact table; its Made count has a tooltip pointing at the chip.
`tkCampaign`'s "Open the Kanban" line now links the campaign's own page.
Verified on :8797: Campaigns chip draws cards with grids and no table; Preview as pm draws 10 cards
(7 with grids, the rest tickets), no sideways scroll at 1440.

## All work: a campaign is Ready and Pending (2026-11-27, later still, branch home/streamline)

By request, with a screenshot of the grid cards: "this window looks confusing as it is ... actually
show what's ready and what's pending." `rpCampaign(x)` replaces `tkCampaign` in `viewAll`'s
campaign view (performance marketing's whole view; the Campaigns chip for others).

- One card (`.rp`): name, then due · step (the sub is dropped when it only repeats "n deliverables
  missing") · Waits on you; at the right "k of n ready" and one button (performance marketing gets
  the row's own verb, Open the package / Download what is ready; others Open).
- Two lines under it from `x.dlv` (same `TK_DL`, `TK_EN`): **Ready k** as ticked chips, **Pending
  m** as hollow-dot chips, named in words (Static EN, Static AR, Animated EN, Animated AR, MVP
  video, Copy). Part-way says how far ("Static EN, 5 of 7") and is pending. **Not needed is not
  drawn.** Everything ready: "Everything is ready." A ticket: one line, nothing to track yet.
- Gone from this view: the 4 x 2 cell grid, "English only" captions, hatched Missing cells, the
  ring, the brand / audiences / designs line. `tkCampaign` and its CSS stay in the file, unused.
- Verified on :8797, Preview as pm: 10 cards; 0 contrast failures on 125 nodes in dark and light
  (each reloaded); no sideways scroll at 1440 or 375.
