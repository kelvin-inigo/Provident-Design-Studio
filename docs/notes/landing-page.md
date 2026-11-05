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
