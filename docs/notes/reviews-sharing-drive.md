<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Ad sets, review links, sharing, Drive, sign-in and roles

# CAS HAS AN AD SETS WINDOW — MAIN FOLDER › AUDIENCE › VARIANT › PLATFORM › TYPE

By request (2026-10-08), reshaped three times the same day; this is what ships. **Ad sets** in the
HOME PAGE sidebar (Library, under Recent) opens `.as-ov` (z 200, over the splash's z 60). All
SHELL code — `Component.asOpen / asScan / asVals`, instance fields `_as` / `_asBig` / `_asUrls`,
one state flag `adSetsOpen` — so nothing touches project state, undo or the engine.

- **A project is a folder holding a `.adstudio.json`**, the source folder or up to three levels
  under it (`AS_SKIP` folders, `Variant X` and `YT Demand Gen` are not searched). It reads FILES,
  never re-renders.
- **The grouping is the user's stated order of importance:** Main folder = the first folder under
  the source folder (Local / International / International EUR — the meta-ad-design-copy Drive
  layout; `rank()` puts those three first in that order), Audience = the folder(s) under it
  (Family / Investor), or the campaign name when the project sits at depth 0 or 1. **Projects
  that land on the same Main/Audience MERGE**, so a Meta export and a YouTube export of the same
  audience share one Variant A card, each under its platform pill.
- **Only `_Variant X_feed|story|square_1x1|vertical_9x16|landscape_1.91x1|portrait_4x5`**, letter
  matching the folder, from `Variant X/` and `YT Demand Gen/Variant X/` (`CampaignStudio.YT_DIR`).
  Newest file per kind wins. **A size not exported is not shown** — no dashed placeholders — and
  an empty row, platform, variant, audience or main folder is dropped. If export names change,
  the regex and `KIND` table in `asScan` are the second place they live.
- Type sizes step down with importance: main 24/600, audience 17/600, variant 14.5/600, platform
  a 12/600 pill, type 12.5/500 in ink-2, then dimension · size at 10.5 in dim.
- **Horizontal, by request:** a main folder is one strip — audiences side by side (`.as-auds`,
  a rule between them), variant cards side by side, Meta and YouTube side by side inside a card
  (`.as-plats`); the strip scrolls sideways. `--as-h` clamp(180px, 30vh, 340px) on `.as-stage`;
  Square|Vertical at `--as-h`, Landscape|Portrait at `.5766 × --as-h` so both rows are one width.
  Below 760px everything stacks.
- Opening is a click, so it calls `folder.ensure()` first. Object URLs are revoked on rescan,
  close and unmount. Esc closes the enlarged image, then the window.
- **Never put an apostrophe in a single-quoted note string** — `YouTube's` in one killed the whole
  logic class at boot.
- **Testing trap:** the pane cannot open `showDirectoryPicker`; set `providentFolder.handle` to the
  origin-private file system (`navigator.storage.getDirectory()`). Its `name` is `''`, which is
  why `_as.has` — not the name — says a folder is set.

**Refined 2026-10-12:** section 30's CSS is ONE block now (three passes of overrides had left
rules for retired markup — `.as-proj`, `.as-more`, `.as-miss`, `.as-t-x` — all gone). The main
folder's heading is sticky; the strip snaps to an audience; a tile lifts a 2px `--ps-link` ring on
hover; each variant card states its image count; the platform pill carries a dot. The lightbox is a
pinned dark viewer with a breadcrumb (`t.ctx`), an `n of N` counter, Close, and Previous / Next
buttons plus ←/→ (`_asList` is every tile in scan order). Contrast over the overlay: 0 failures in
both themes; no overflow at 390.

**SEE DETAILS (2026-10-12):** under each platform's images, `Component.asCard` adds a **See
details** button carrying `mtCheck` / `ytCheck`'s badge; it opens `.as-det` (z 2, under the
lightbox; Esc closes it first) with the image, format buttons and the Publish tab's own check list
(`.yt-checks`), read from the saved `.adstudio.json`. An Ad-Library-style mock-up with Meta
analytics was built first and REJECTED the same day ("not to that extent") — the images are plain
exports with no link to a live ad, so neither the mock-up nor `meta-insights.py` exists.

**THE GOOGLE DRIVE LINK WAS REMOVED (2026-10-14), by request** — `driveDir`, `driveId`, `asDriveGo`, the API-key field and its CSS are gone; the panel is the drop zone alone. What follows about Drive is history.

**VIEW ANY FOLDER (2026-10-13):** the home page (under "View ad sets") and the Ad sets window
(bar button "Drop or link a folder") carry one `.as-src` panel. You can drop a folder anywhere on
`.p-br` or `.as-ov`, or paste a Google Drive folder link. `this._asSrc = {kind, handle, name}`
overrides the source folder for `asScan` only; `asUseSource` goes back, and the source folder is
never changed. Both sources are stand-ins for a directory handle: `entries()`,
`getDirectoryHandle()`, and a file's `getFile()` plus `modified`. `Component.entryDir`
(webkitGetAsEntry fallback) and `Component.driveDir` (Drive API v3, `?alt=media`). The scan now
picks the newest json by date before downloading and downloads only the tiles it shows. **The
Drive API key is per computer** (`localStorage['provident-drive-key']`, never in the repo), and
the folder must be shared as "Anyone with the link". `asDrop` reads `getAsFileSystemHandle()`
synchronously inside the event. `asDragOver` reacts only to `types` containing `Files`. Verified:
an OPFS tree dropped through `asDrop`, Drive with a mocked fetch (7 list calls, 2 downloads, key
saved, bad-key error shown), 0 contrast failures in both themes, and it fits at 390.
**Not exercised against the real Drive API or a real OS drag** (the pane cannot start either). Fix pass the same day: the drop zone is a
button (`asBrowse`: `showDirectoryPicker({mode:'read'})`, else a `webkitdirectory` input rebuilt by
`Component.filesDir`; the input is hidden by CSS because DC drops the boolean `hidden`); with
nothing to show, the panel IS the screen — no bar toggle (`asPanelBtnOn`) and no duplicate note
when no folder is set; the note and panel share the 880 column.

**SPEED (2026-10-14), after "it takes longer to load than usual":** the scan was one file at a
time, decoded every full-size export with `createImageBitmap` just to print its size, parsed each
whole `.adstudio.json` (photos included) for its state, and showed the full-size PNGs as tiles —
60 tiles was ~2 GB of decoded pixels. Now: the walk and each project's Variant folders run in
parallel (`found` sorted by path afterwards so a shared slot is still decided in path order);
`Component.asDims` reads PNG / JPEG / WebP size from the header; `Component.asState` parses only
the prefix up to `,"images":` (the file is written `{app, v, state, images}`, falls back to a
full parse); Files are read six at a time (`asPool`); tiles show `t.thumb`, a 640px-tall WebP
made in the background four at a time (`asThumbs`), while `t.url` (the full file) stays for the
enlarged view and See details. Measured on 60 exports (2160² and 2160×3840 PNGs) in headless
Chrome: **1,160 ms -> 50 ms to a laid-out window**, thumbnails done ~1.2 s later. Splash and editor
load were measured too and had not regressed (~0.35 s to the template cards in a fresh profile).

Verified on a stand-in tree: Local › Family (Meta A + B, YouTube A with Square and Landscape only),
Local › Investor (Meta A), International › Family (YouTube Landscape only) — Local first, the two
platforms merged under Variant A, missing YouTube sizes absent, no placeholders.

# AD SETS IS ONE AUDIENCE AT A TIME, WITH AN EDIT TEXT LAYER THAT WRITES BACK (2026-10-15)

By request ("the layout looks confusing … integrate the copy section … any text I change
auto-saves to the .json connected to those jpgs and auto-exports the new images … a top
level layer to focus on text change"). CAS only, section 36 of the sheet; chrome plus the
shell — no `ops.push` / renderer line moved.

- **Layout:** the nested sideways strips are gone. `.as-body` is a list of audiences on the
  left (`asNav`, grouped by main folder; `_asSel` is the selected `main\u0001aud` key, kept
  across rescans) and ONE audience on the right (`asSel`), its variants as rows (`.as-vrow`),
  Meta and YouTube side by side in a row. "See details" became an **Ad text** button beside the
  platform label. The nav's red dot (`au.bad`) is `card.need` — Meta text only counts once
  `mtUsed`, since it is optional.
- **`Images | Edit text`** (`.as-mode`, `_asMode`, remembered in `adstudio-as-mode`) is the
  top-level switch. Edit text (`aeVals` / `_ae`) shows the selected project's copy fields (the
  Copy view's `.cw-f` markup, text only — no add/remove/move of components) beside fresh renders
  of every image it exported.
- **Write-back:** `asScan` keeps each project's json handle (`jsonH`, `fname`) and `p.outs` — the
  newest file per variant and job, banners included (`reOut`). An edit goes through
  `C.writeMod(ae.st, …)`; 1.5s later `aeSave` writes `{...doc, state}` into the json (its
  `images` untouched) and re-renders each out with `buildOps` + `rasterFile` at
  `exportScale(sk, st)`, writing over the SAME handle in its own format. `Component.aeSize` maps
  a job back to a size (`landscape_1.91x1` is `yl` on a YouTube project, `ls` on Meta).
- **`loadAssets(state, own)`** takes an optional photo map — the json's `images` — so a project
  that is not open renders with its own photos, never the store's. `buildOps` reads only the
  state it is handed (checked); `applyFont` is restored to the open project after every render.
- **Guards:** a json with no `adstudio-bg-*` photo saves words only (re-exporting would drop the
  photos); a stand-in folder (Safari/Firefox entries, folder upload) is read-only (`aeCan` 'no');
  a dropped or picked real handle asks once (`aeAllow` → `requestPermission` readwrite); every
  exit (switch audience, back to Images, Refresh, Close) flushes a pending save first; after a
  save `_asStale` makes Images rescan. If the edited project is the one open in the studio
  (same `pid`), a note says the open copy will not see it.
- Verified on an OPFS stand-in folder with a two-variant project: typed into Heading with the
  keyboard → json updated with photos kept, 4 JPEGs re-written showing the new headline, Images
  refreshed; no console errors; no overflow at 390; 0 contrast failures in both themes.
- **Not done:** the Publish text (Meta / YouTube) is not editable here; `_Meta upload.json`'s byte
  sizes are not refreshed; recents keep their own older copy.

# AD SETS › DETAILS IS AN AD ANALYSIS, NOT THE META TEXT CHECK (2026-10-15)

By request ("forget about the meta ads repo … Marketing angle, Audience, USP, Copy ratio to
image"). The per-platform button is **Details** (no badge); the panel's right column is four
sections (section 37 of CAS's sheet, `.as-an*`). Chrome and shell only — no artwork line moved.

- **`Component.adRead(st, vi, ctx)`** reads the saved state's own words (no service, no model):
  the visible modules of that variant in reading order. `AN_ANGLES` is seven keyword families;
  **each component scores an angle ONCE** (hero 3, hook 2, eyebrow/cta/price/tags 1.5, spec/list
  1.2, else 1) — scoring per match let four distance facts outvote an office headline. The
  quote shows the matched words. Audience = market and segment from the folder path (`ctx`),
  currency from the copy, "copy speaks to" from the angles (+ investors when the folder says
  so). USP = tags, key facts ("20 mins · Downtown"), bullets, hook lines, the price line and
  the eyebrow as Location, de-duplicated.
- **Copy ratio** = `copyRatio(st, vi, sk)`: the export's own `buildOps`, every op except image /
  grad / blur and full-canvas rects, boxed through `CampaignStudio.opBox` and unioned on an 8px
  grid, per format (Feed / Story…). Measured against `COVER_MAX` (40), a marker on the bar.
  It is AREA, not the editor chip's band height, so the two numbers differ.
- The card carries its project (`card.proj`); the state is normalised once per card and the
  ratio is cached per shape (`card.an`). `applyFont` is restored after measuring.
- Verified on an OPFS stand-in of the reported ad: angle Workspace and business (also location,
  payment plan, Golden Visa, launch), USD investor audience, 8 USPs, Feed 31% / Story 24%; no
  console errors. `card.checks` / `mtCheck` are still computed and now unread here.

**Edit text previews are larger (2026-10-15, by request):** `.ae-shot` is `clamp(260px,46vh,520px)`
tall (landscape and banners `clamp(180px,28vh,320px)`), the form column 460, the preview column no
longer sticky (a tall preview pinned under the bar hid its own bottom), and `aePreview` renders at
`min(1, 1100 / long side)` so the larger shots stay sharp on a retina screen.

# AD SETS OPENS A GOOGLE DRIVE FOLDER LINK, READ AND WRITE (2026-10-15)

By request ("build option 2 and write the admin setup"). The Drive box sits under the drop zone
in both `.as-src` panels (section 38). Admin steps: **`docs/google-drive-setup.md`**.

- **Sign-in is Google Identity Services, token model** (`accounts.google.com/gsi/client`, loaded
  only when the box renders, so the click's popup is not blocked). No secret, no server. Scope is
  full `drive` — a folder opened by LINK has to be listed and its files overwritten, which
  `drive.file` cannot do — on an **Internal** app, so only providentestate.com accounts sign in
  and no Google review applies.
- **The client ID**: `Component.DRIVE_CLIENT_ID` (empty until the admin sends one — it is a
  public value, safe to commit) or `localStorage['provident-drive-client']` pasted per computer.
  The token lives in memory only (`Component._gdTok`, 1h); it is never stored.
- **`Component.gdDir(id, name)` is a directory stand-in**, the shape `asScan` already reads, plus
  a file `createWritable()` that PATCHes a new revision of THAT file (`upload/drive/v3/files/<id>
  ?uploadType=media`) — same id, same share link. Listings are cached 3s so Refresh sees new
  modified times; shortcuts to folders are followed; shared drives supported.
- **Edit text needed no new path**: `aeCan` reads the root's `queryPermission` (token valid →
  granted) and `aeAllow` calls `requestPermission` (→ sign-in popup, from the click). A 401 or an
  expired token throws `gdAuth`, which sets `ae.can = 'ask'` and shows *Sign in with Google*.
- Verified with Drive's REST API stood in by a fetch mock: the link opened, the tree listed (all
  calls carried the bearer token), the json and the feed JPEG downloaded, an Edit text change
  PATCHed the json (photos kept) and the JPEG; an expired token showed the sign-in panel; no
  client ID showed the paste field; the real GIS library loaded. **The real Google sign-in and
  the real Drive API were not exercised** — no client ID exists yet.

# SHARED EDIT LINKS — CAS AND OPS, ON A VERCEL FUNCTION (2026-10-23)

By request: a link others open to view AND edit a project, a right-side panel of who changed
what, and a name asked of everyone who opens it. **Share › Share an edit link** in both studios.
Admin setup (connect Upstash Redis to the Vercel project once): `docs/share-links-setup.md`.

- **`api/share.py`** is a stdlib Python Vercel function on Upstash Redis REST, reading
  `KV_REST_API_URL`/`TOKEN` (or `UPSTASH_REDIS_REST_*`) from the environment — never the repo.
  Keys `sh:<id>:meta|state|rev|imgs|log` plus `img:<hash>:<i>` photo parts (~0.9 MB each, because a
  Vercel request is capped near 4.5 MB). A save is ONE Lua `EVAL`: compare `base` with `rev`, write,
  bump, apply the photo map, and append the log entry or, in the same burst, REPLACE the last one.
  A stale base answers 409. 180-day TTL refreshed by every save and open. `tools/share-dev/serve.py`
  serves the repo with an in-memory store (`SHARE_DEV=1`) for testing.
- **`share-link.js`** (after studio-base.js in both `<head>`s) patches `StudioBase.prototype`: the
  shells call `eng.shareInit()` in `componentDidMount` and merge `eng.shareVals()` into renderVals.
  The panel, the pill and the name dialog are plain DOM it builds itself (styled with `--ps-*`
  tokens), outside React — no markup per document beyond the Share panel's one button.
- **A tab's link is in sessionStorage** (`provident-share:<app>`, plus `-base` and `-log`) with the
  project's **pid**; a tab that opens another project has another pid, so the link stops there and a
  new project can never be saved over a shared one. Opening a link goes through
  `loadSessionFile({clean:true})`, so a link for the other studio hands over like a session file.
- **Sync:** a 1s tick compares `canon(shPub(state))` with the last synced state (CANONICAL — the
  studios' load rebuilds objects in another key order, which first read as a change on every
  open); 2.5s after the last edit it uploads changed photos (followed through a new
  `image-slots-change` event and `ImageSlot.getRec/putRec/slotIds` in image-slot.js) and saves. A
  409 pulls, `StudioBase.merge3(base, mine, theirs)` (field by field, id-keyed lists by id; same
  field = mine), and retries. A 12s poll (visible tabs only) pulls the same way, writes remote
  photos with `putRec` under an `applying` flag so they are not sent back, and clears undo.
  `LOCAL` keys (screen, selection, active slide, export pick, story view, guided step, hubPost) are
  never sent or overwritten.
- **The log** reads like the copy changelog: CAS words through `copyFlat(copySnap())`, OPS words
  from `FIELDS` per slide id, plus "Changed the design / layout / a setting" per page and photo
  lines named from the slot id. Edits within 90s are one entry (`shBurst`).
- **An open panel takes 340px from the workspace** (`html.shl-open .p-body{margin-right}`, plus the
  guided screen, the Copy view, the panel bar and the sheets); it hides on the splash and picker.
- **Limits, stated to the user:** no sign-in (the link is the key); the same field edited by two
  people at once goes to whoever saved last; undo is local.
- **CAS shares the Ad sets VIEW** (2026-10-23, by request; OPS keeps the project link). **Share
  these ad sets** in the Ad sets bar (`asShareOn`) calls `window.providentAdSetsShare.create(shell)`
  (share-link.js): app `provident-ad-sets`, state `{kind:'adsets', root, projs:[{id:'p<n>', path,
  fname, app, v, st, photos:[slot], files:[{id:'f<n>', path}]}]}`, store pictures `p<n>-<slot>`
  (the photo record) and `f<n>` (a 1600px JPEG preview `{u}`). The opener's view is a STAND-IN
  FOLDER (`AsShare.build`, the gdDir shape) handed to `shell.asView({kind:'share', share})`, so
  asScan, Edit text and Download all run unchanged. Its json `getFile` is the state only;
  **`getFull`** fetches the photos (aeSync prefers it). A json write diffs `copyFlat` words per
  project into the log ("Family · Ad copy · Heading"); an image write is shrunk and uploaded; one
  save 1.5s after the last write, merge3 on a 409. A pull rescans unless someone is mid-edit.
  `#share=` of that app in OPS hands over to CAS (`goCas`). Panel over `.as-ov` via `html.shl-as`.
  Verified on the dev server: share, join as a second name, an Edit text change logged, the
  preview re-rendered and the other tab's tile updated.
  **Upload speed (2026-10-23):** nearly all of a link is the projects' photos at export grade
  (up to 3840px, 3-5 MB each; the first real link was ~170 parts for 46 photos). `slim()` sends a
  raster photo at `PHOTO` 2000px as WebP .82 (alpha kept), and uploads are keyed by content hash
  with a shared promise, so a photo several projects share goes up once even at 6 in parallel.
  Measured on a 2-project fixture with 8.4 MB photos: 35.3 MB / 46 requests -> 5.1 MB / 12.
- Vercel's Python runtime treats a module-level `app` as WSGI: the dispatcher is `route()`. The
  store's variables are found by suffix too (`STORAGE_KV_REST_API_URL`), and a not-connected
  answer names the store variables the deployment sees.
- Verified on the dev server with two tabs in both studios: create, open with a name, real typing
  syncing, a concurrent edit on a stale base merged (both kept, rev 4 to 6), a replaced photo
  arriving byte-correct and not re-uploaded, a CAS link opened from an OPS tab handing over, and
  the panel at 0 contrast failures in both themes. **Not exercised against real Upstash or Vercel.**

# THE AD SETS BAR HAS ONE PRIMARY AND ONE FOLDER GROUP (2026-10-23)

By request ("fix these buttons, add some hierarchy, use icons"). The labels used to wrap to two
lines. Now **Share / Copy link** is the one `.p-btn`. The folder controls form one `.p-tgrp.as-srcgrp`:
**Drop folder** (toggles the drop area), **Choose folder / Open folder**, and an icon-only
**Refresh**. A hairline (`.as-bar-sep`) sets off a round icon-only **×** Close. Every button has a
Material Rounded icon and `white-space:nowrap`. The title truncates instead of the buttons.

The "Viewing the shared…" chip is gone, because the subtitle names the source now: `asSub` starts
"Shared / Google Drive / Folder <name>". `asViewingOn` and `asViewing` are computed and unread.
Below 760px the bar stacks: title plus × on the first row, then Images | Edit text at full width,
then the group, then Share.

Verified at 1440, 1024 and 390 with no overflow and no wrapped label. Bar text contrast is 6.47 to
18.28 in dark. Chrome only.

# AD SETS SAVES SHOW UP IN IMAGES; OFF-SCREEN VIEWS COST NOTHING (2026-10-26)

Reported as "if you save a change it doesn't reflect on the files". Reproduced on an OPFS
fixture, three causes, all fixed:

- **Images was never rescanned after an Edit text save that was still exporting.** `aeFlush`
  resolved at once when the save was mid-export (`dirty` is cleared when a save STARTS), so
  `asSetMode('images')` saw `_asStale` false, and nothing rescanned when the save later set it.
  The tiles kept the old `File`s, which a rewrite makes unreadable, so **Download** failed with
  "Could not zip" too. Now `aeSave` returns one promise per run (`ae.run`, through `aeSaveRun`)
  and `aeFlush` returns it even when nothing is dirty; `asFresh()` (flush, then rescan if stale)
  is called by the Images switch, audience picks, All audiences and every Download; a finished
  save rescans by itself while Images is on screen; `asScan` waits for a save still writing.
- **Shared ad sets kept an edit off the link's data until it uploaded** (`pend`), so a rescan in
  that window (Images, another audience, someone else's change) read the old words back into
  Edit text and the next keystroke saved over the edit. `AP.onJson` writes `p.st` at once;
  `pend` is a flag cleared only once the store confirms (a failed save used to drop it), and the
  stand-in's image `getFile` reads an unsent preview (`pimg`) first.
- **A save in a shared view said "Saved to X.adstudio.json · N images re-exported"** — but a link
  is a copy and never touches the folder it was made from. It says *Saved to the shared link ·
  the original folder is not changed*, and Edit text carries a note saying so.

**Off-screen views:** `libVals` / `hubVals` built every card on every shell render whether their
view was open or not — 1 ms → 10 ms per render (each keystroke) once a 400-project folder had
been listed. Off screen they return the sidebar count only. `usageVals` memoised on
`savedRecents()`, a new array per call, so it never hit; it keys on `readRecents()` now, and the
style previews render when Component usage is first OPENED, not on the first editor render.

The studio switcher's Campaign row said "Meta and YouTube ads"; it reads "Meta ads, feed to banner".

# CAS REVIEWS: THREE ROLE LINKS AND A PROCESS (2026-10-26)

> **SUPERSEDED THE SAME DAY: a review is an AD SET now, not one project** — see *A REVIEW IS AN
> AD SET* at the end of this file. `sh:<id>:rv`, `rvmake/rvstep/rvset/rvinfo`, `liveDir`,
> `rvGuard`, `rvApply` and the single-project stepper are gone; an old review migrates to an ad
> set of one. The shNorm fix below and the "no re-export onto a live project" rule still hold.

By request: a campaign goes **INITIAL DESIGN > COPY CHECK > DEPLOY CAMPAIGN** with three
audiences — the **designer (DD)** with the full studio, the **content team (CT)** with the Copy
view only, **performance marketing (PM)** with the Ad sets overview only. Decided with the
user: **both DD and CT must sign off** (in either order), **PM always sees the latest** (renders
from the live project, not a published snapshot), **ready is the end** (no "campaign live"
button), and notifications are in-link only (a Roam bot was discussed and parked). Built on the
shared-edit-link infrastructure; everything is in `api/share.py` and `share-link.js`, and CAS
carries only a Share button, the Review links home view, and two Ad sets guards.

- **A review is a shared project plus `sh:<id>:rv`.** `rvmake` (only the project's own 12-char
  id, never a token) adds the record and two 16-char tokens, `rvt:<tok> -> {sid, role}`. Every
  op resolves a token wherever it takes an id (`resolve()`); the response carries `role` and
  `rv` (tokens only to `dd`), and the project's id never reaches a token's holder. `rv`, `sum`,
  `thumb`, `meta` and (for a review) the log have **no expiry** — the archive's record — while
  state/imgs keep the 180-day TTL. The save Lua takes a 5th key so a review's log is not
  re-expired.
- **Server-enforced:** a `pm` token's save/part is 403; `step` acts are checked by role
  (`STEP`: design-done/open dd only, copy-done ct only, copy-open ct or dd). **Client-enforced
  only:** CT's lock to the Copy view (`html[data-rv-role="ct"]` CSS plus `rvGuard` resetting
  `screen`). There is no sign-in; the link is the key.
- **Ready** = `design && copy`; any reopen clears it. Each step appends a `kind:'step'` log
  entry and a `hist` item; clients learn of steps through the polled `rev` (which now returns
  `rv`) and the log count.
- **PM's view is the Ad sets window on a stand-in folder** (`liveDir`): root named after the
  campaign, one `Meta ads.adstudio.json`, `Variant A…` folders with `<name>_Variant X_<job>.jpg`
  for sq/pt/st/ls, each file rendered on `getFile` through `buildOps` + `rasterFile` at
  `exportScale` and cached per project-state key. `rvGuard` rescans when the key moves, keeps
  the window open (`kind:'review'`; CAS's Escape returns early for it), and `html.rv-pm` hides
  close/pick/share/Edit text and pushes `.as-ov` under the `.rvh` header (`--rvh`, set by a
  ResizeObserver). Carousels show pages as Variant letters (named so the scan finds them).
- **The process replaces the Copy view's Draft › With design › Final under review** —
  `html[data-rv-role] .cw-steps/.cw-note/.cw-acts` hand-off buttons and `.p-cvcopy` are hidden.
- **The panel is the Changes panel renamed Review**: a `.rv` section (stepper, role, buttons,
  DD's links + Drive location). The stepper is `stepperHtml(rv, compact)`: dates/labels in a
  3-column grid under a dot-segment-dot line, mirroring the supplied delivery-tracker image.
- **The archive** (`Review links`, `splashView: 'rev'`) is plain DOM (`ArchView`) mounted into
  an empty `[data-rv-arch]` host by `Arch.mount`, scheduled from `shareVals` — React never
  reconciles it. Its index is `localStorage['provident-reviews']` (ids only); records come from
  `rvinfo` (≤60 ids; `full=1` adds the log). The DD's Drive location is `rv.drive` (`rvset`).
  The summary (`sum`) rides on every review save; the thumbnail is re-rendered at rvmake and at
  each sign-off.

## A PRE-EXISTING SHARE BUG THIS FIXED: OPENING A LINK READ AS AN EDIT

`load()` runs `normState` and `Object.assign(defaults(), p)`, so the state a tab holds after
opening a link differs from what it downloaded (`hidden: {}`, `bgO: 100`, `banOv: null`, top-level
defaults) — and the first tick saved that as "Sara changed the design" before she typed
anything. `SP.shNorm(st)` puts a downloaded state through the same normaliser; it is the base on
open AND what `shPull` merges as "theirs", so normalisation is never a change and the merge
never drops a default key. Verified: CT and PM opening a fresh review leave the log at rev 1.
**A tab bound before the fix still carries a raw base and saves once on its next reload.**

## Verification (local share server, `tools/share-dev/serve.py`)

- Server ops exercised directly: role resolution, rvmake refused from a token, pm save 403,
  steps by role, ready on both, rvinfo refusing tokens.
- In the browser, three workspaces: DD made the review with real clicks; CT opened, typed into
  the Copy view (synced and logged as "Ad copy · Heading"), pressed Copy approved; PM saw four
  renders at 2160²/2160×2880/2160×3840/1200×628, picked up Package ready on its own, flagged
  "1 change since ready" and re-rendered when CT edited after ready, returned to In progress
  when DD pressed Back to in process; Download package zipped the four files under export names.
  CT snapped back to Copy when pushed to the editor; PM ignored Escape.
- The archive listed, opened and saved a Drive location. Contrast: 0 failures over the PM
  header, the panel (26 runs) and the archive (18 + 66 runs), light and dark. No overflow at 390.
- **Not exercised against the real Vercel/Upstash.** The Lua change (5 keys, conditional log
  expire) and PERSIST/LTRIM only ran on the in-memory store.

**The Review links detail page was redesigned (2026-10-26, by request).** `AV.detHtml` in
share-link.js: a header (thumbnail, title, pill, "Created … · changed …", **Drive folder** and
**Open in Campaign Studio** with icons), then two columns capped at 1240 — main: a **Progress**
card (the stepper plus `rvNext(rv)`, the plain next step, and the changes-since-ready count),
**Review links** (one row per role: icon, description, the link in mono, a Copy link button that
keeps its icon), **Activity**; aside 320: **Details** (Format, Components, Sizes as chips,
Project live/expired — Design/Copy/Created left the list, the stepper and header say them),
**Google Drive** (saving redraws so the header gains its Drive button), and Remove from this
list. One column under 1100, stacked buttons under 760. Icons are Material Rounded wght300
(`ICO`). Contrast 0 failures both themes, no overflow at 390. `linkRows` still serves the panel.

## THE CONTENT TEAM WORKS IN EDIT TEXT, NOT THE COPY VIEW (2026-10-26, same day)

By request, with Ad sets › Edit text screenshotted as the window: the CT link now opens the Ad
sets window in **Edit text** on the same live stand-in folder PM gets (`liveDir(eng, write)`),
with the Review panel docked right. **The designer keeps the original Copy window**, hand-off
and all — the rule hiding `.cw-steps` / `.cw-acts` / `.p-cvcopy` under review is deleted.

- **The project file is writable for CT.** Edit text reads it with `getFull` (photos from
  `StudioBase.sidecar()`, so its previews show them) and writes it back on save; the write is
  `merge3(base = what it last read or wrote, mine = shNorm(doc.state), theirs = shPub())` onto
  the engine through `upd`, so a design change the designer made meanwhile survives — verified:
  DD centred the layout while CT was focused in a field; CT's next save kept `center` and both
  heading edits. The share sync then saves it as CT's edit ("Sara · Heading").
- **No re-export onto a live project**: `aeSaveRun` skips the image writes when the source's
  kind is `review` (the images are rendered from state anyway) and says the edit reaches the
  designer and PM; the image handles' `createWritable` is a no-op in case. The "no photos" and
  "also open in the studio" notes are off for that kind (`aeNoteOn`).
- **Own edits don't trigger a rescan** (`scanned` is re-marked 60 ms after the write, once React
  has the state); someone else's change rescans only when CT is not mid-edit (ae dirty/saving
  or focus in a field inside `.as-ov`), with `h._ae = null` so Edit text reopens the project.
- `html.rv-as` (pm and ct): the audience list is hidden and `.as-body` is one column, so the
  words and images get its width; the panel stays over `.as-ov` (z 211) and `.as-ov` gives it
  340px. `shTick` no longer hides the panel on the splash for pm/ct — their window covers it.
- The CT top-bar hiding rules remain but only matter for a frame before the window opens.

# A REVIEW IS AN AD SET: EVERY AUDIENCE AND LANGUAGE UNDER ONE SET OF LINKS (2026-10-26)

By request: "the generated link should be for the ad set (family + investor + international +
ENG + ARB…) — all under one link… designer does all audiences first, then translation… appended
on the same link". Decided with the user: **sign-off is per audience**; each audience runs
**DESIGN › ENG COPY CHECK › TRANSLATION › DONE**; the **designer adds the ARB project, the
content team approves it**; **PM downloads per audience**; markets are **Local / International /
International EUR**; audiences are **Family / Investor** for Residential and **Investor / Hybrid**
for Commercial (Hybrid = an end user who rents but may convert to buying).

## The server (`api/share.py`)

- **`rs:<rid>`** (no expiry): `{rid, name, product, created, by, tok:{dd,ct,pm}, drive,
  eng_only:{"<market>|<aud>":true}, items:[{sid, market, aud, lang, added, by, design, copy}],
  hist}`, plus `rs:<rid>:log` and `rs:<rid>:thumb`. `rvt:<tok> -> {rid, role}`; each member
  project has `sh:<sid>:rid` and keeps `sum` / `thumb`. ITEMS_MAX 40; one item per
  market+aud+lang; a project is in at most one ad set; Campaign projects only.
- **`resolve(id, p)`**: a 16-char token is an ad set link and acts on the project named by `p=`
  (which must be a member); a project's own 12-char id gets role `dd` when it is in an ad set.
  So every project op (`get/sync/rev/save/part/chunk`) works through a token with `p`, and PM's
  `save`/`part` is 403. Responses carry `role` and `rs` (tokens only for `dd`).
- Ops: `rsmake` (from a project's own id: name, product, market, aud, lang), `rsadd` (dd token,
  `sid` + labels), `rsstep` (`p` + act; design-done/open dd only, copy-done ct only, copy-open ct
  or dd — per PROJECT), `rsset` (dd: drive, name, eng_only, remove), `rsget` (one request for
  every member's rev and log count; `full=1` adds the log, sums, thumbs), `rsinfo` (archive by dd
  token or member sid; returns `dd` so an old entry re-keys; `full=1` adds every project's log).
- **`migrate_old(sid)`**: a pre-ad-set `sh:<sid>:rv` becomes an ad set of one (Local, first
  audience, ENG) the first time anything touches it; its old ct/pm tokens keep working.

## The client (`share-link.js`)

- **`rsAuds(rs)` is the one derivation** read by the panel, PM's bar and the archive: items
  grouped by market|aud, the ENG and ARB item, and four steps — Design (`eng.design`), ENG copy
  check (`eng.copy`), Translation (`eng_only`, or `arb.design && arb.copy`), Done. `rsOverall`
  counts audiences per step; Package ready = every audience done.
- **In a member project** (designer, own edit link) the Changes panel is **Ad set review**: this
  project's audience stepper, its buttons (`itemActs`), "n of N audiences done", **Open the ad
  set**, and the links + Drive under a fold. `S.rs`/`S.role` come back on every `rev`/`sync`
  (`rsSet`, which also notifies steps others took).
- **Share › Ad set review** (`reviewCreate` + `rsDialog`): start a new ad set (name, product) or
  add this project to one this computer knows (`Arch`, by dd token), then market / audience /
  language; shares the project first if needed.
- **An ad set link (`#share=<16 chars>`) is `RsView`**, not the studio's own binding: it loads
  every member's state (`get` with `p`), builds a stand-in folder (`root / Market / Audience[ ·
  Arabic] / {<label>.adstudio.json, Variant X/<name>_Variant X_<job>.jpg}` — English sorts
  first) and opens the Ad sets window on it (`asView({kind:'review', share: this})`). Images
  render on `getFile` from that project's state with its own photos (`fetchRec(tok, e, sid)`).
  Edit text writes go to `onJson` -> `merge3` onto the project, saved per project (`save` with
  `p`), retried on 409. A 1s tick keeps the window and its mode (CT Edit text, PM Images),
  rescans when a pull or a new project bumps `ver` and nobody is mid-edit; a 12s `rsget` poll
  pulls changed projects. Resumed from `sessionStorage['provident-share:rs']`. OPS hands a token
  to CAS (`goCas`).
- **The panel** (over the window, z 211) shows the ad set stepper, the project on screen with
  CT's buttons, every audience with its mini progress and per-language buttons; the designer
  also gets each project's **Open** link, **No Arabic for this audience**, and the links. The log
  merges the ad set's own log (steps, labelled by project) with every project's word changes.
- **PM's bar** (`.rvh`): the stepper, one chip per audience with **Download** once done, and
  **Download package / Download finished audiences** — flat zips of the scanned tiles, both
  languages; CAS's own Download buttons are hidden for PM.
- **Archive**: cards per ad set (`rsinfo`), detail page with Progress, **Audiences** (each
  audience's stepper and its project buttons, which open the project's own link), Ad set links,
  Activity, Details, Drive.

## Verification (local share server)

Three projects in three workspaces (Local Family ENG, Local Family ARB, Local Investor ENG) put
in one ad set with real clicks; the CT link listed all three, a real typed heading change saved
into the right project (logged "Local · Family · ENG · Ad copy · Heading"); Approve English
copy, then the designer's link marked the Arabic laid out, the Investor design done and Investor
"No Arabic"; CT approved the translation and Investor's copy and the set went Package ready;
PM's bar showed both audiences done and **Download** for Local · Family zipped all eight
ENG+ARB images under export names; the archive showed both audiences' steppers. Contrast 0
failures over PM's bar and the panel (light). No console errors. **Not exercised against real
Upstash/Vercel**, and the migration of an old review only ran in the Python harness.

**The performance-marketing header is one row (2026-10-26, by request: "so many text").**
`RV.barRender`: the ad set's name, the four steps as dots and labels only (`.rvh-st`, stretched
across the bar), **See details** and **Download** (`Download 1 of 2` while partial). Created,
Ready, each step's count and every audience with its own stepper and Download moved into a
`<dialog class="rvh-dlg">` (`RV.barMake` makes it; the backdrop and × close it). Under 1000px only
the current step keeps its label. Contrast 0 failures over bar and window, dark; no overflow at 390.

# AD SETS LIVE IN THE DESIGNER'S PROJECT; THE COPY VIEW FOLLOWS THE REVIEW (2026-10-26)

By request: the Ad sets viewer was built for the designer to see an ad set's overview, so it is
opened from inside a project now, and it knows the other projects of the ad set.

- **The home page has no Ad sets panel, no Ad sets sidebar row and no folder drop** (`.as-home`
  markup and the `.p-br` drag handlers are gone; the `.as-home*` CSS is left matching nothing).
- **`SP.rsOverview()` (share-link.js)** opens the Ad sets window over every project of this
  project's ad set: an `Object.create(RV)` with `embed: true` — RV's `load` / `photos` / `render`
  / `build` through the dd token, but no panel, timers or html classes, and no writable json
  (`!this.embed`). THIS project is taken from the editor (`shPub()` + the local photo store via
  `loadAssets(me)`), the rest from the share store. `_asSrc = {kind:'review', embed:true, share}`;
  the shell treats embed as an ordinary closable window (Escape closes, `!embed` on the Escape
  guard), Images only (`asModeBarOn`), no Drop/Open folder/Share/drop panel, Refresh re-runs
  `rsOverview`. `RV.projOf(key)` maps an audience folder to its item: the nav marks *This project*
  and the pane header carries **Open in the studio** (`asProjHref` = the project's own designer
  link, new tab) or *Open here*. The current audience is pre-selected.
- **The canvas bar's copy chip is the ad set chip** (`cvAdLabel/State/Tip/Go`): "Family · Design"
  opens the overview; out of an ad set it reads **Ad sets** and opens the empty folder viewer
  (`asOpen`). `cwBarLabel` / `cwOpen` are computed and unread.
- **The Copy view's Draft › With design › Final and Download .docx are retired.** `SP.rsCopyVals()`
  (merged into `shareVals`, CAS only, so the SHELL supplies the keys over the engine's) gives the
  head its audience line (`rsCwWhere`), the audience's four steps (`rsCwSteps`) and a note; the bar
  its state (`rsCwStatus`), **Ad set overview**, and the designer's forward / back button
  (`rsFwd*` / `rsBack*` → `rvStep`, which now also `forceUpdate`s). Out of an ad set: **Start an ad
  set review** (`rvGo`). The brief card shows until the design is marked done (`rsBriefOn`).
  History shows only for a project that has old snapshots, with no `.docx` buttons;
  `copyStatus`/`copyLog`/`cwDownload` stay in the code, unread by the markup.
- Verified on the dev share server (`tools/share-dev/serve.py`, port 8790) with a two-audience ad
  set: the chip and the Copy bar opened the overview, both audiences rendered, Open in the studio
  pointed at the other project's link, Escape closed it; a real click on Mark design done moved
  the stepper to ENG copy check and swapped the button to Back to design; a project outside an ad
  set showed Start an ad set review, which opened its dialog. `sc-if` +1/+1 on the baseline.
  **Defining `RV.*` above `const RV` throws at load (TDZ) and takes the whole script down** —
  `Arch`, `cssDone` then fail too. Add RV methods after its declaration.

# SHARED LINKS EXPIRE AFTER 60 DAYS, AND share-admin.html CLEARS THE STORE (2026-10-27)

Upstash warned the free plan's 256 MB was 70% full — nearly all of it shared links' photo parts.
`api/share.py`'s `TTL` is **60 days** (was 180) and, since the pass below, applies to full-size
photo parts ONLY. **Opening a link now also refreshes its photo parts** (`parts_of`): they
were only given a TTL at upload, so a link used daily still lost photos nobody had replaced.
**`share-admin.html`** (repo root, noindex) lists every `sh:<id>` with its size, largest first,
and deletes one (`op=adminlist` / `op=admindel`, POST with `key`); deleting an ad set member also
drops it from `rs:<rid>.items`. The key is **`SHARE_ADMIN_KEY` in Vercel's environment** — never
the repo; without it both answer 503. The in-memory dev store gained `SCAN` / `STRLEN` / `TTL`.
**The free alternative, not built:** keep photos in Vercel Blob or Cloudflare R2 as binary files
instead of base64 text parts in Redis — about a third smaller and a far larger free allowance.

# A LINK NEVER EXPIRES; ONLY ITS FULL-SIZE PHOTOS DO, AND THEY COME BACK (2026-10-27)

By request: the link, project and changelog are kept for good; full photos expire at 60 days and
the link shows a preview until someone restores them.
- **Server** (`api/share.py`): meta / state / rev / imgs / log are written with no expiry (the
  save Lua `SET`s without EX and `PERSIST`s; `get` PERSISTs too, which converts an older link).
  Every `img:` part keeps `TTL` and `get` renews it. **`sh:<id>:pv:<hash>`** is a photo's preview,
  no expiry (`op=pvput` POST ≤ 400 KB, refused for pm; `op=pv` GET). `get` / `sync` mark each
  `imgs` entry **`gone`** (its parts are missing) and **`nopv`** (no preview yet) through
  `flagged()`. `op=devexpire` exists on the in-memory dev store only, to simulate 60 days.
- **Client** (`share-link.js`): `putRec` also uploads a preview (`pvText`: the record itself under
  250 KB, else the picture at 640px WebP with the same crop fields). `fetchRec` falls back to the
  preview and adds it to the `PV_RECS` WeakSet. **`S.pv[slot]` = the preview's hash**, persisted in
  the binding; `shSave` skips a slot whose record is still that preview, so a preview is never sent
  up as the photo. `shareOpenLink` prefers an exact full copy in this computer's store or the
  project's Recent card. **`shHeal(extra)`** (1.5s after start, then every 60s while a preview is
  showing): re-uploads any `gone` photo whose EXACT record (hash match) is here, adds missing
  previews, swaps a preview for the full photo someone else restored, and infers `S.pv` from the
  `gone` flags if the binding lost it. **Restore from a saved file…** in the Changes panel reads a
  session `.json`'s `images`: exact matches restore in place, other photos for a still-preview
  slot are put in the project and save as a replacement. **`shGuard`** wraps the instance's
  `doExport` and `saveSessionFile` with a confirm while any photo is a preview.
- Verified on the dev store: preview 61 KB for a 669 KB photo; open after expiry shows the
  preview, flags it, never re-uploads it, export asks; opening on the original workspace restored
  it (same hash, no log entry); restore from a record on another workspace swapped the canvas to
  full. **Not exercised on real Upstash.** Ad set views (CT, PM) fall back to previews silently and
  do not heal; PM's Download would ship previews.

**Review surfaces carry a type hierarchy, and nothing in them is bold (2026-10-27, by request).**
One block at the end of share-link.js's sheet (`TYPE HIERARCHY`) overrides every 600 in the
activity log, the Changes panel, the ad set archive page, the details window and the PM bar:
Medium 500 only for page titles, people's and audiences' names and buttons; everything else 400,
ranked by colour — ink for what you read, ink-2 for headings and explanations, dim for dates,
counts, kickers and pending steps. A step line in the log reads "<dim where> <ink action>".
Contrast 0 failures, dark. Note: 1981bdf (another session) committed the first half of this block.

**The activity log is designed, and footnotes are italic (2026-10-27, by request).**
`logEntryHtml(e, opt)` in share-link.js is the ONE renderer for an entry, read by the Changes
panel and the ad set page (it replaced two hand-built copies). Changes group under the place
they happened, named once as a small dim kicker (a label that repeats its page is de-duplicated);
a field edit is the field in ink with an italic verb, then the old words italic, dim and struck
over the new words on a 2px hairline rule; a step is a dot (green forward, hollow for "back");
design and photo notes are italic dim footnotes ("Variant 2 · design changed"). The same person
again within six hours (`logCont`) keeps one name for the run. **Google Sans Flex has no italic
or slant axis** (its fvar is opsz + wght only, read off the woff2), so the italic is the
browser's synthetic oblique. The panel's footnotes (`.rv-lead`, `.rv-ntf`, `.shl-me`,
`.shl-state`) are italic too; their links stay upright. Rules are prefixed `.shl-list` to beat
`.shl-list ul li`. Contrast 0 failures, dark.

# AD SETS: REMOVE, RELABEL, DELETE AND ADD — AND WHY A REMOVED PROJECT CAME BACK (2026-10-27)

Reported with a screenshot: an ad set holding a mistaken second project labelled "Project",
"I tried deleting it but it keeps coming back", adding projects felt broken, and performance
marketing's side panel was redundant beside its bar's See details.
- **The "keeps coming back" bug was server-side.** A review made before ad sets lived on its
  project as `sh:<sid>:rv`; `migrate_old` converted it into an ad set of one with NO market or
  audience (hence "Project") and left `sh:<sid>:rv` in place. Removing the project, or deleting
  the ad set, lasted until that project was next resolved, which converted it again into a fresh
  ad set. `migrate_old` now DELs `sh:<sid>:rv` once converted, and remove / delete DEL it too.
- **Server:** `rsset` takes `relabel: {sid, market, aud, lang}` (409 on a clash) and logs
  "Changed X to Y"; `remove` now logs "Removed X". **`op=rsdel`** (designer only) deletes
  `rs:<rid>`, its log and thumb, the three `rvt:` tokens and every member's `sh:<sid>:rid` / `:rv`;
  the projects stay as plain edit links.
- **The ad set page (Review links › an ad set):** under each project **Change audience** (or
  **Set its audience** when unlabelled) as an inline market/audience/language row, and
  **Remove**; an **Add a project** card listing this computer's `savedRecents()` not already in the
  ad set (matched by `sum.pid`); **Delete this ad set for everyone** under Remove from this list.
- **Add a project** writes `localStorage['provident-rsjoin'] = {dd, pid, at}` and opens the
  studio in a new tab (a new workspace). `SP.rsJoinCheck` (end of `shareInit`, CAS only, 3-minute
  window) opens that project from Recent (`openRecent` reloads; the key survives) and then
  `reviewCreate({dd})`, whose dialog opens on "Add to an ad set" with that ad set chosen
  (`rsDialog` `preset`). A project already in an ad set says so instead.
- **Remove from this list sticks**: `Arch.drop` adds the id to `provident-reviews-hidden` and
  `Arch.add` skips hidden ids unless `force` — only pasting the designer link (the archive's Add
  box, or a preset join) brings it back. Opening a member project used to re-add it silently.
- **Performance marketing has no side panel**: `RV.shPanel` returns for `pm`, `RS.start` never
  opens it, and `html.rv-pm .shl-pill,.shl-panel{display:none}`. The bar and See details carry it.
- Verified on the dev store: migrate → relabel → add → clash refused → remove (no reappearance)
  → designer-only delete; in the browser, relabel, Add a project end to end (new workspace,
  reload into the project, preset dialog, added as Local · Family), PM with no panel and the
  window at full width, Remove from this list surviving an automatic re-add, paste to restore,
  Delete. Not exercised against real Upstash.

# REVIEW LINKS REFRESH ITSELF AND SHOW THE SHARE STORE'S HEALTH (2026-10-27)

By request ("I feel it's not updating" plus a health widget). `ArchView` loaded once per mount,
so a step taken in another tab or on another computer showed only after leaving the view. Now
`AV.refresh()` runs every 60s while the page is visible and when the window regains focus or
visibility (no more than once per 15s). The list reloads quietly with no "Reading…" flash. The
detail page re-opens quietly, unless a field in it has focus, a relabel is open, or the Drive
field holds an unsaved value. The timer stops once the host leaves the page.

**`GET /api/share?op=health`** is public and costs three commands: PING, DBSIZE and INFO. It
returns `{ok, ms, keys, bytes (INFO used_memory), limit (SHARE_STORE_MB, default 256), dev}`.
A strip above the list (`.rva-hl`, `AV.health` / `drawHealth`) shows one of these states:
- Healthy
- Filling up (70%) / Nearly full (90%), linking to share-admin.html
- Slow to answer (over 2s)
- Not answering, with the reason

The strip also carries "Updated hh:mm · Refresh".

**Upstash's own error now reaches the user.** `Upstash._post` read nothing from an HTTPError
body, so every refusal showed only as "refused the request (HTTP 400)". It now passes Upstash's
message through, and words the two plan limits (monthly requests, data size) in plain terms.
The live "HTTP 400" reported on 2026-10-27 was not identified: reads on production worked and
the ad set's data was correct (Design simply not marked done). The real reason will show the
next time it happens.

# A FULL SHARE STORE FREES ITSELF (2026-10-27)

The live store hit Upstash's 250,000,000-byte threshold and every save was refused ("ERR DB
capacity quota exceeded"), so edits stopped reaching review links. Upstash returns that in a 200
body, which bypassed the HTTPError mapping; `up_fail(why)` now maps it in `_post`, `cmd`, `pipe`
and `set_raw` (507). **`route` wraps `_route`: a POST answered 507 runs `reclaim(1)` and retries,
then `reclaim(2)` and retries.** Level 1 deletes `img:` parts whose hash is not in the link's
`imgs` map (replaced photos) unless written in the last ten minutes (an upload whose save has not
landed), and every `img:`/`pv:` key of a link with no `state`. Level 2 also deletes full parts of
a used photo whose TTL says nobody opened the link for `RECLAIM_DAYS` (14) — only when a preview
exists, so nothing is lost. `op=adminreclaim` (`old` for level 2) is share-admin.html's Free space
/ Free more. **Health's size was wrong**: INFO `used_memory` read 1.8 MB on a full store; it now
adds up STRLEN of the stored values, cached in `sys:size` for 20 minutes. Limit default 250 MB
(decimal, Upstash's own). The dev store takes `SHARE_DEV_QUOTA` (bytes) to act full.
**Not exercised on real Upstash**; links are under 14 days old, so level 2 frees nothing yet.
Biggest remaining lever if it fills again: an edit link stores each photo per link at export
grade, so the same photo in an ENG and an ARB project is stored twice.

## ONE PHOTO, STORED ONCE, AT 2560px (2026-10-27)

By request, right after the store filled. **`putRec` uploads `slimFull(rec)`** — 2560px long
side, WebP .86, alpha kept; an SVG or a photo already under 2560px and 1.2 MB goes as it is —
and keys its parts by **`c` = fnv of the stored text**, under the shared `img:<c>:<i>`; it asks
`op=have` first and skips the upload when any link already stored it (that also restarts its 60
days). A link's entry is `{h, n, c}`: **`h` is still the hash of the photo as the uploader holds
it** (what tells an edit from a pull, and what the designer's computer matches to put a photo
back), `c` is where its bytes live. Previews are shared too, `pv:<h>`. Entries without `c` are
from before; their parts stay at `sh:<id>:img:<h>:<i>`, and every read (chunk, pv, flagged,
refresh) falls back to them. **`shHeal` moves them**: an entry without `c` whose photo this
computer holds is uploaded the new way and saved (no log entry), and **a save deletes the link's
own old-style parts it no longer references** (replaced, removed or moved). `reclaim` drops a
shared `img:<c>` no live link references and a `pv:<h>` none uses; `admin_del` runs `reclaim(1)`.
admin list counts shared photos in every link that holds them, so rows can add up to more than
the total. A receiver's 2560px copy is not treated as a preview (`PV_MAX` length test).
Measured on the dev store: a 2.84 MB export-grade photo became 1.46 MB with its preview, a second
link of the same project added ~1 KB, and the receiver loaded the 1.45 MB copy with nothing
re-uploaded and nothing logged. **Trade-off:** someone who only has the link (PM's renders, CT)
draws from the 2560px copy, a slight upscale on a 2x Story export; the designer exports from
their own originals. Not exercised on real Upstash.

# AD SET REVIEWS LIVE IN THE AD SET'S GOOGLE DRIVE FOLDER (2026-10-27)

By request: the review links' backend moved from Upstash to Google Drive; every screen is
unchanged. **`dsApi` (share-link.js, "REVIEW LINKS ON GOOGLE DRIVE") answers the share store's
own requests in the same shapes** — get, sync, rev, save, rsget, rsstep, rsset, rsdel, rsinfo —
so `api()` just routes a Drive id to it, and photos go through `dsPutRec` / `dsFetchRec` from
`putRec` / `fetchRec`. Layout of the Main folder the designer names in the setup dialog:

```
<Main>/<ad set name>_Adset.json    ad set record + its log + tok + thumb (one file; renamed with the
                                   ad set; ones made before 28 Oct sit in Ad set review/Ad set.json)
<Main>/<Market>/<Audience>/<English|Arabic>/<name>.adstudio.json   session file; `review` holds
       meta, rev, imgs {slot: {h, n:1, f: Drive file id, m: crop fields}}, log, sum, thumb, rid
       .../Assets/background-variant-a.webp …   one file per picture (slimFull, 2560px)
```
- **Ids**: a project is `'D' + .adstudio.json file id`; an ad set link is `'R' + 10 random chars +
  '.' + Ad set.json file id`, role looked up in `rs.tok`. `isDs`, `isRsId` and `SHARE_ID` replaced
  every `length === 16` / `{8,16}` test. Old Upstash ad sets (16-char tokens) keep working.
- **Reads are cached by Drive `version`** (`dsRead`): a poll is one metadata request. Saves are
  read-check-write against `review.rev`; Drive has no atomic compare-and-set, so two saves in the
  same second can race (the loser's next save merges via the usual 409 path only if it reads the
  new rev first). Acceptable for this team; note it.
- **Sign-in**: `providentDrive` now keeps its token per tab in sessionStorage
  (`provident-drive-tok`) and fires `provident-drive-signed`. A Drive link opens through `dsGate`
  (a click to sign in); an expired token shows `dsSignBar`. Drive's sharing is the access
  control; the role in a link is workflow only (a pm save is refused by dsApi, client side).
- **Relabel moves the language folder** (`dsMove`); delete marks Ad set.json `deleted` and
  clears each project's `rid` (files stay). Nothing on Drive expires, so `shHeal` skips Drive.
- **Exports are flat** now (`exportPath`: `<name>_Variant A_feed.jpg`, no Variant folders); Ad
  sets reads flat files and old Variant folders both.
- **Testing**: `tools/share-dev/drive_mock.py` is a Drive v3 stand-in served by serve.py at the
  same origin. Set `localStorage['provident-drive-base'] = location.origin` and
  `sessionStorage['provident-drive-tok'] = {at:'dev', exp}`; `/drive-mock` prints the tree
  (`?reset` clears). Verified there: setup dialog → folder tree, designer edit saved and logged,
  content team's Edit text edit saved and pulled by the designer, design done → copy approved,
  Arabic added to its own folder, PM view rendering both audiences from Drive photos, archive
  list + detail, relabel moving the folder. **Not exercised against the real Google Drive**:
  sign-in needs a person at the keyboard. The real test folder (Review link Test,
  11Rk2HnQXzIXpphUvdTFw_UkRFCRKof87) was confirmed reachable and writable via the Drive connector.

**The ad set page was reordered (2026-10-27, by request).** `AV.detHtml`, top to bottom: the
header (Drive folder, Open the ad set); a controls row under it (`.rva-tools`: **Add a project**,
now a pop-up `.rva-mod` from `AV.addHtml` — `this.addOpen`, Escape or the backdrop close it — and
quiet **Remove from this list** / **Delete for everyone** at the right); **Progress** across the
full width (`.rva-prog`, its next-step line beside the title); **Ad set links** as three cards side
by side; **Audiences** as cards (market kicker over audience name, the steps, then an English and an
Arabic tile with thumbnail, campaign and item state; an empty tile says what is missing) beside
**Details** and **Google Drive**; **Activity** under Audiences at its width (grid areas in `.rva-cols`; one column under 1100px puts Details between them). CSS is one block at the end of the
sheet (`.rva-det` scopes it). The Done pill on an audience card inks in `--ps-ink` (green ink on
the card's fill measured 3.94).

# CAS'S HOME PAGE SETS UP THE AD SET; THE PRELOADED TEMPLATES ARE GONE (2026-10-27)

By request: the templates "do not serve a purpose any more"; a campaign starts by defining its
ad set. The splash's All view opens on **Set up the ad set** (`PlanView`, share-link.js, plain
DOM mounted into `[data-rs-plan]` by `Plan.mount` from `shareVals`, like the archive). The
Templates sidebar row, the template cards and `_tplTick`'s render are gone; `splashView: 'tpl'`
lands on All. `tplCards` / `tplCount` / `tplRenderAll` are still computed and unread. The
header's **New campaign** is `shNewGo` (scroll to and focus the widget).

- **Quick**: campaign name, Residential | Commercial, Main folder (Drive link, only when Drive is
  configured — `dsOn()`). A summary row of chips and a project count. **More settings**:
  Markets (toggle chips, at least one), Audiences (`AUDS[product]`), an **Arabic matrix** (one
  switch per market × audience, plus Every audience), Your name. Defaults: Local, both
  audiences, English only. The draft is per computer in `localStorage['provident-rsplan']`.
- **A plan** is `{name, product, folder, by, markets, auds, arb}`; `planCells(plan)` gives the
  ordered `{market, aud, arb}` cells (an array passes through).
- **Start the campaign** writes `provident-rsplan-go` and calls the engine's `newProject`
  (after `confirmDiscard` + `markSaved`, so it asks once). After the reload `rsPlanCheck`
  (from `shareInit`, only once the screen is `editor`, 3-minute window) names the campaign
  and opens `reviewCreate({plan})`: `rsDialog` prefilled with the first cell in English, mode
  tabs hidden. One click is still needed — Google's sign-in popup needs it.
- **On Drive**, `dsReview` writes `rs.plan = planCells(...)` and sets `eng_only` for every cell
  without Arabic; `dsPub` returns `plan`. On the old share store (no Drive) the plan is kept in
  `localStorage[PLAN_LOCAL + dd token]` and `eng_only` is set with `rsset`. `planOf(rs)` reads
  either.
- **The panel lists what is still to make** (`planTodoHtml`: every planned English version,
  then the Arabic ones). **Make from this design** = `SP.rsNext(key)`: flush the link's save,
  `recordSaved`, `shareStop`, a new pid (and `font: 'arabic'` for ARB), then `dsReview` mode
  `add` (or `rsadd`), `shareStart`. The project left behind keeps its file and link.
- Verified on the Drive stand-in: the widget's chips, matrix and count by real clicks; Start
  opened a new project and the prefilled dialog; the ad set saved `plan` and three `eng_only`
  cells; the panel listed 4 to make; Make from this design wrote `Local/Investor/English` and
  the tab became that project with Translation "Not needed". 0 contrast failures over the widget
  in both themes; fits at 375. **Not exercised on real Google Drive.**
- **Known gap:** "N of M audiences done" counts audiences that have a project, not the plan's.

**The widget was redesigned the same day (by request: too text heavy, no hierarchy).** Three
tiers: a header band (`--ps-card-h`) with Hairline's **Riffle** figure (`data-hl="riffle"`,
mounted by the shell's `hlBind`, which also destroys it) beside "Set up the ad set" at 26/500
and one line; three fields labelled Name / Product / Drive folder with no helper text; the plan
as **tiles**, one per market × audience (market dim over audience 16/500) with an EN chip and an
**AR toggle on the tile itself** (`.rsp-ar`, on = `--ps-link` fill with `--ps-app` ink, a mark).
The Arabic matrix, summary chips and Your name field are gone (the name comes from
`shareName()`; the review dialog still asks). **Markets & audiences** folds the market and
audience toggles; their explanations are tooltips. Footer: **Blank project** as a quiet text
link, **Start campaign →** as the primary. 0 contrast failures in both themes; fits at 375.

# GOOGLE SIGN-IN IS ONCE PER COMPUTER, AND IT NAMES THE PERSON (2026-10-27)

By request ("every time it asks for my Google email"). `providentDrive` (studio-base.js):
- **The token is in localStorage** (`provident-drive-tok`, shared by every tab, workspace and
  both studios — `provident-*` keys are not workspace-prefixed) until Google expires it (~1h).
  `valid()` re-reads it when its cached copy is stale, so a tab picks up another tab's sign-in;
  an old per-tab sessionStorage token is adopted once. `drop()` clears both.
- **The account is remembered for good** (`provident-drive-who` = `{email, name}`), learned from
  `GET /drive/v3/about?fields=user(...)` (`whoFetch`, no extra scope) after a sign-in. The next
  sign-in passes `login_hint` with `prompt: ''`, so Google's popup closes by itself — no chooser,
  no consent. **A token can only be renewed from a click** (the token model has no refresh token
  in the browser), so an expired session still costs one click: `dsGate` / `dsSignBar` say
  "Continue as <email>", with **Use another account** (`signOut()` forgets the account too).
  A session that NEVER asks would need the authorisation-code flow and a refresh token held by a
  server (a Vercel function with the client secret) — not built.
- **`StudioBase.shareName()`** falls back to `providentDrive.alias()` — the account's first name,
  else the email's alias capitalised — so every name dialog prefills from the sign-in. A name
  typed once (`provident-share-name`) still wins.
- The Drive stand-in answers `/drive/v3/about` with a fixed test account; set the test token in
  **localStorage** now, not sessionStorage. **The real Google popup with login_hint was not
  exercised** — only the stand-in.

## SILENT RENEWAL IS BUILT — `api/gauth.py` (2026-10-27)

The "would need a server" note above is done. **Off until `GOOGLE_CLIENT_SECRET` is set in
Vercel** (docs/google-drive-setup.md, Step 7); until then `/api/gauth?op=status` answers
`on:false` and every path falls back to the token model, unchanged.

- **Server** (stdlib, no store): `status` (GET), `exchange` {code} / `refresh` / `signout`
  (POST, must carry `X-Provident: 1`; no CORS headers, so only the site reads answers). The
  refresh token lives in cookie `pgr` — HttpOnly, Secure, SameSite=Strict, Path=/api/gauth,
  180 days sliding — SEALED (SHA-256 counter-mode keystream + HMAC-SHA256, keys derived from the
  client secret), so rotating the secret invalidates every cookie. `invalid_grant` clears it.
- **Client** (`providentDrive`): `srvOn()` (cached status), `kept()` = `provident-drive-srv`
  (JS cannot see an HttpOnly cookie), `renew()` (POST refresh; shared ONLY while in flight —
  the promise clears itself in a `.then` registered before any caller's, a `setTimeout` clear
  let a second renewal reuse a finished one), `ensure()` = valid or renewed. `signIn()` tries
  `renew()` first, then on a server-enabled site the CODE flow (`initCodeClient`, popup,
  `redirect_uri: 'postmessage'`, `prompt: 'consent'` the first time so Google returns a refresh
  token, `login_hint` after). `fetch()` renews before throwing expired and retries once on a 401.
  `watch()` (started at load) renews in the background when under 5 minutes remain, visible
  tabs only. `signOut()` revokes server-side too. `dsGate` / `dsFetch` / `libLoad` call
  `ensure()`, so an expired session opens a link with no prompt at all.
- **Dev:** `tools/share-dev/serve.py` routes `/api/gauth` and stands in for Google's token and
  revoke endpoints (`dev-code` signs in, `rt-dev` renews; `/gauth-mock` counts refreshes and
  revokes); `GAUTH_REAL=1` leaves the environment alone. Verified there: exchange sets the
  sealed cookie, refresh works, missing header 403, tampered cookie 401, a concurrent pair makes
  one request, an expired session opens a Drive link with no dialog, sign-out revokes and the
  next refresh is 401. **Google's real code popup and token endpoint were not exercised.**

# REVIEW LINKS' LIST WAS REDESIGNED (2026-10-27)

Same brief as the setup widget: less text, a clear hierarchy (share-link.js, `ArchView`).
- **Bar**: the explanatory paragraph is gone; adding a link is a small input with a link icon
  ("Add a designer link") at the right, its explanation a tooltip.
- **Overview** (`drawHealth`): ONE figure leads (audiences done, 48px, "of N"), three small
  counts beside it (ad sets, projects, ready), Updated + an icon-only refresh. Below a hairline,
  the four steps as columns (`.rvo-steps`): name with its colour dot, how many audiences sit
  there (26px), and a bar for its share. The "Waiting on" list is gone from here — it moved
  into each card. With nothing listed (all on Drive, signed out) the overview is hidden and
  the sign-in card says it all.
- **Cards**: name 16/500 on up to two lines; a "now" line — the least advanced audience's step
  (coloured dot, step in ink) and the audience, `+N` for more, the full list in its tooltip;
  four short progress segments (`.rva-segs`: done filled, current ringed — no gradient fills);
  a dim one-line meta (product · audiences · short date); a chevron. 76x95 thumbnail.
- Grid columns are `minmax(0,1fr)` on a phone — plain `1fr` let a card's min-content widen
  the track past the screen. 0 contrast failures in both themes; fits at 375. Checked with
  injected sample ad sets (the real ones are on Drive).

**Then (same day): Hairline's Stack figure and newest-change order.** The overview opens on the
**Stack** figure (`.rvo-fig`, `data-hl="stack"`), kept OUTSIDE the part `drawHealth` redraws
(`.rvo-in`), so a refresh does not recreate it; the shell's `hlBind` mounts and destroys it.
Beside the overview on a wide page, above it under 900px of container width (`.rva` is a size
container). **Cards sort by last change, newest first** — `modOf(it)`: the newest of the ad
set's `created`, its `hist` steps, each item's `added` / `design` / `copy`, and on Drive
`it.mod` (set in `dsInfo` from each project's `review.sum.updated` and last log entry). The
card's meta reads "Residential · Changed 3:45 PM" (today) or "Changed Oct 22".

# THE BRIEF CARD FILLS A CAROUSEL, AND FOLLOWS THE AD SET (2026-10-27)

Reviewed against the ad set setup, by request, with a five-project Stage 1 reply as the test.
- **Format: Single ad | Carousel** (`b.fmt`, '' = the project's own; `brFmt()`). Carousel asks
  for `BRIEF_SAMPLE_CAR` — `audiences[].pages[]` in swipe order, one per project when the brief
  covers several. **Fill** (`brFill`) then runs the rail's carousel switch if needed, adds pages
  as copies of page 1's layout (`forkPage`, keepOld false) up to the count (10 max), and fills
  page k with stack k through `brPlan`. Pages already past the count are left. One Undo.
- **The parse is `{src, flags, auds: [{name, pages: [stack]}]}`** (`brGroup`). A single ad picks
  a page with the **Project** tabs (`b.page`). `brStacks` reads plain replies per project:
  audience from the text since the previous block, project from the nearest `##` heading (the
  caps lines inside the heading are the project, the ones before it the tag), a headline set
  over two lines kept with its break, "from AED…" after a headline line kept in the headline,
  a price-only headline used as the heading, `Alts:` under a block as alternates, unit lines as
  proof. `brPair` labels "10% down payment", "40/60 plan", "Handover Q4 2029".
- **In an ad set** (`brCtx()`: the project's rs item) the audience chips are replaced by **For**
  market · audience · language, the prompt names that audience, market and language only, and
  the reply's matching audience is picked (`brAudIdx`, unless the user picked one).
- **Where it saves (Source folder + Drive link) left the card and the prompt**: Stage 1 writes
  copy only, the top bar owns the folder and the ad set owns the Drive folder. The fold is
  **Pictures for the ad**. `brDrive` / `brFolder*` are still computed, unread.
Verified on the sample: 5 projects × Families/Investors parsed right; a real click on Carousel
then Fill made 5 pages (26 unique ids, one Undo); single ad with Investors · Verdes picked;
the ad-set prompt and labels with a stand-in rs.

# A REVIEW LINK KNOWS WHO OPENED IT FROM THEIR GOOGLE SIGN-IN (2026-10-27)

By request: no name prompt. `StudioBase.shareWho()` (share-link.js) is the Google account this
computer signed in with (`providentDrive.who()`, `{name: full display name, email}`), and
`shareName()` returns its name first, a typed name only when no account is known. Every log
entry and step is stamped with it. `nameDialog` hides the name field when an account is known
("Signed in as … · email · Not you?" — signs out and runs Google sign-in from the click); with no
account but Drive sign-in configured (`dsOn()`) it offers **Sign in with Google instead**. The
three OPENING dialogs pass `auto: true`, so `dlg.name()` resolves at once and the link opens with
no dialog to press. Drive-stored ad sets always pass `dsGate` first, so they never ask; old
share-store links ask once only on a computer that never signed in. A typed name is stored only
when there is no account. The Changes panel shows the email with **Not you?**. Verified on the
dev share server: create, open in a fresh workspace with no dialog and the panel naming the
account; with the account removed the field and the Google button come back.

**And then the overview took the setup widget's own shape** (by request: "I like that it had a
header area"). `.rva-hl` is a card with no padding: a header band (`.rvo-h`, `--ps-card-h`) with
the persistent Stack figure and `.rvo-ht` — an "Overview" label, the one number as a 26/500
title ("1 of 4 audiences done"), one line of counts ("3 ad sets · 5 projects · 0 ready to run")
and Updated + refresh at the right; then the body (`.rvo-in`, hairline above) with the four step
columns. Under 700px of container width the header stacks (figure, then text). The separate
stat tiles (`.rvo-hero`, `.rvo-stats`) are no longer drawn; their CSS is unread.

**Fix (same day, "sign in with Google is not working"):** a computer holding a valid token from
an earlier Drive sign-in but no remembered account (WHO was only added on 27 Oct) made
`signIn()` return at once without learning the account, so the dialog never changed. `signIn()`
now runs `whoFetch()` when the token is valid but WHO is empty; `watch()` does the same at page
load; and `nameDialog` loads Google's script before the click (a script fetched after the click
can outlast the click's popup permission) and asks Drive whose a valid token is without waiting
for a click. If Google still names no account, the dialog says so instead of doing nothing.

# A PROJECT KNOWS ITS REVIEW LINK, NOT ONLY THE TAB (2026-10-27)

Reported as "very disruptive": after the ad set setup, the same project opened in another window
read as a NEW file; Share › Ad set review then said the folder already held an ad set, and Add to
it refused the duplicate audience. Cause: the share binding lives in sessionStorage, per tab.
- **`provident-share-pid:<pid>`** (localStorage, every tab and workspace; index
  `provident-share-pids`, last 12) holds the link id, rev, the last synced state and photo map.
  Written by `shareStart` and every `shPersist`.
- **`shareInit` reconnects**: no binding in this tab but a pid entry for this app → `shRejoin(id)`
  0.9s after load. It reads the link (`get`), checks the pid matches, three-way merges
  (`merge3(stored base || theirs, mine, theirs)` — with no base, this computer's edits win), takes
  down photos changed only there, marks photos changed only here dirty, binds and flashes
  "Reconnected to the ad set …". A Drive link needs a token: `ensure()`, else `dsGate`.
- **Stop following this link** now forgets the pid entry (`_shLeave`), so it does not reconnect.
- **Duplicates reconnect**: `reviewCreate` checks an Add's cell first (`rsget`, then the taken
  project's state via `get` with `p`); `dsReview` does the same on Drive. Same pid → `shRejoin`
  and the links ("already … — it is reconnected"); another pid → a clear message. A Drive folder
  that already holds an ad set takes the project as an ADD instead of refusing.
Verified on the Drive stand-in: bound, binding cleared, an edit made apart, reload → reconnected
by itself, the edit saved and logged "Heading"; with no local memory, both Make the ad set (same
folder) and Add (same cell) reconnected with no new files; another project into the same folder
was added as Investor; a third project on a taken cell got the message.

# REVIEW LINKS HAS A GOOGLE DRIVE STRIP, AND ITS PREVIEWS FOLLOW THE WORK (2026-10-27)

By request ("refresh or reconnect the google drives… not refreshing", then "preview is not
refreshing as well").
- **`.rva-gd`** above the list and the detail page (`AV.drawGd`, only when `dsOn()`): connected as
  name · email (green), session ended (amber), or not signed in. **Refresh** = `dsFlush()` (clears
  `DSC`/`DSP`) then re-reads (`AV.gdRefresh`); **Reconnect** = `D.drop()` + `D.signIn()` (the
  remembered account, no chooser) then refresh; **Use another account** = `signOut()` + sign-in.
  The overview's small refresh icon also flushes. `providentDrive.fetch` now sends
  `cache: 'no-store'`, so no Drive read can come from the browser's HTTP cache.
- **Previews were drawn once** (when the project joined the ad set, and at design done) and never
  again. `SP.shThumb` now redraws after edits settle (4s with nothing pending, at most every 15s)
  and sends it on its own — op **`thumb`** in both stores (`api/share.py` sets `sh:<sid>:thumb`
  and `rs:<rid>:thumb`; `dsApi` writes `review.thumb` + `thumbAt`) — so it is no new revision and
  nobody pulls for it. On Drive the ad set's card shows its most recently re-drawn project
  (`dsInfo`, by `thumbAt`). A reconnect sends one at once.
Verified on the Drive stand-in: an edited heading's preview landed ~5s after its save with rev
unchanged, the card showed it, a real click on Refresh re-read from Drive, an expired token showed
the amber state. The real Reconnect popup was not clicked (it opens Google's real sign-in).

# THE DESIGNER'S HAND-OFF IS "SEND TO COPY CHECK", IN THE CANVAS BAR, AND IT CHECKS FIRST (2026-10-28)

By request, after a review of the flow. `design-done` is labelled **Send to copy check**
(**Send for translation check** on an ARB project) everywhere — the canvas bar, the Ad set
review panel (`itemActs`) and the Copy view's bar. The canvas bar carries it beside the ad set
chip (`.p-cvsend`, section 58 of CAS's sheet, reading the shell keys `rsFwdOn` / `rsFwd` /
`rsFwdLabel`) while this project's design is still with the designer. **`SP.rsPrecheck()`**
(share-link.js, CAS only) lists what the content team would send back: empty words on any
page (hidden components skipped), a page or variant with no `adstudio-bg-<vi>` photo, the QR
switched on with no `adstudio-qr`, and any 1:1 / 3:4 / 9:16 canvas over `COVER_MAX`
(`coverPct` from `renderVals().variantViews`). `rvStep` runs it for this project's
`design-done` and asks `confirm()`; Cancel sends nothing, OK sends. It never blocks.
**Below 1200px the dock rose to `bottom:115px`**: the bar carries 58px of room for the panel
bar, and the dock row at 74px sat on the bar's content (name, chip, button) — found because a
real click on the new button hit `.p-dock-r`. Verified on the Drive stand-in with real clicks:
the check listed an empty heading, no photo and a missing QR; Cancel kept Design; OK moved the
audience to ENG copy check and the button left the bar.

# STEP NOTIFICATIONS ACTUALLY FIRE NOW, AND PREVIEWS FOLLOW EVERY SAVE (2026-10-28)

By request. **The notification code was there and could never run**: `notifySteps` only
notified while `document.hidden`, and both polls (`SP.shPoll`, `RV.shPoll`) skipped a hidden
tab. Now `sysNotify` shows a Chrome notification whenever permission is granted, front or back,
and focuses the tab on click; a hidden tab polls every 45s (`hidPoll`) — the designer's only
while in an ad set, the ad set view `rsget` only (no project pulls; `rsBg` stops the same step
notifying twice when the tab comes back). `askNotify()` (also `window.providentNotifyAsk`) asks
from a click: the designer's `rvStep` after the pre-check, the ad set view's `rvStep`, the panel's
Notify button, and a new **Notify me** in PM's bar while permission is `default`. Your own steps
never notify you — matched by NAME, so two tabs signed in as one Google account notify neither.
No push server: a browser with no tab open gets nothing.
**Previews**: `shThumb` runs 1.5s after each save, at most every 5s (was 4s / 15s); the Review
links page re-reads every 20s (was 60s, min gap 10s). Verified on the Drive stand-in with a
stubbed `Notification`: the designer's tab got "approved the English copy" and "reopened the
copy check" from the content team's tab; the content team's tab got the designer's reopen;
previews redrawn ~2s after each save. The real Chrome permission prompt and a truly hidden tab
were not exercised (the pane reports every tab visible).

# THE AD SET REVIEW PANEL AND PM'S DETAILS WINDOW, REFINED (2026-10-28)

By request ("too much text, show hierarchy, explain in tooltips"). share-link.js, one CSS block at
the end of its sheet ("REVIEW PANEL AND DETAILS WINDOW, REFINED").
- **The panel's title is the ad set's name**; its sub-line is role · product · project count
  (`RV.panelRender`), or "This project · Local · Family · ENG" in the designer's own project
  (`SP.rvRender`). The duplicate kicker + name + pill block is gone.
- **Where it stands is ONE block, `nowHtml(steps, done, info)`**: "Step 2 of 4", the step at
  20/500, an `i` (`infoHtml`) carrying the old explanation paragraph, and four segments
  (`segHtml`) whose tooltips name each step and its detail. No vertical stepper with sub-lines.
- **Audiences**: a dim "Audiences n" heading, each row name + current step + segments, the
  detail ("With the content team") as the row's tooltip. Hidden for a content-team link whose one
  audience has one project — the On screen card already says it.
- **The foot**: one full-width **Copy link** (the URL is its tooltip; the input is hidden, still
  what Copy reads), then initials + name with the email as a tooltip and a quiet "Not you?", and
  a one-word state (Saved / Saving… / View only).
- **PM's See details window**: name as the title, "Residential · Created … by Kelvin" under it,
  the pill by the close button. The overall step block only with 2+ audiences. Each audience
  card: name, its current detail in one line, Download when done, and a BARE stepper
  (`stepperHtml(steps, false, true)`: labels only, each step's detail in its tooltip).
- Verified on the local share server with three projects (Local Family ENG + ARB, Local
  Investor): contrast 0 failures over the panel (dark) and the window and PM bar (light).
  Testing note: the Browser pane rewrites a 16-char token in a URL it navigates to, so open a
  review link by calling `eng.shareOpenLink(tok)`, and set `localStorage['provident-share-base']`
  to the local origin first or the studio talks to the public site.

# A CAMPAIGN STARTS AS A TICKET; THE COPY TAB IS THE AD SET TAB (2026-10-28)

By request: performance marketing files the campaign first, the designer picks it up, and the
designer's flow is three moves — **initial setup · Design done · Create next audience**. CAS
only; everything is in `share-link.js` plus markup and one CSS block (section 59) in CAS.

- **Every CAS project is in a campaign.** Blank project, Share › Copy edit link and Share › Ad
  set review are gone. A project outside one (old, opened with Open session) shows **Set up** in
  the Ad set tab, which is `reviewCreate()` as before.
- **A ticket is an ad set with no project yet** (`isOpen(rs)`: `rs.ticket && !items.length`).
  `dsMakeSet(plan, by, ticket, files, busy)` writes `<name>_Adset.json` into the folder the
  person names — **one folder per campaign** (it refuses a folder that already holds one) —
  with `ticket: {brief, deadline, by, at, files:[{id,name,type,size}]}`, the plan cells and
  `eng_only`, the three tokens; the files go to `<folder>/Brief/`. Drive only.
- **The home page form (PlanView) is "Set up the campaign"**: name, product, deadline, Drive
  folder (NOT remembered — a folder is a campaign), brief, files, audience tiles. **File as
  ticket** shows the designer link; **Start designing** files it and picks it up at once.
- **Status** is the old Review links page (`ArchView`, `splashView: 'rev'`): **New ticket**,
  then Open tickets · In design · Package ready · Missing. An open ticket's page shows the brief
  (`briefHtml`), files (Drive links), audiences and **Pick up**. The list is still this
  computer's `provident-reviews`; a ticket from another computer appears once its designer link
  is pasted.
- **Pick up** = `pickUp(eng, dd)`: `provident-rspick` in localStorage, then `newProject()`.
  After the reload `rsPickCheck()` (from `shareInit`, replacing `rsPlanCheck`) adds the project
  as the first planned ENG audience through `dsReview` mode `add`, names it after the campaign,
  binds the link and lands on the Ad set tab. The first project of a ticket sets `rs.picked`.
- **The Ad set tab** (`screen: 'copy'`, top-bar label **Ad set | Design**) replaced the Copy
  window: two plain-DOM hosts `.adt-host[data-adt="top|bot"]` filled by `SP.adtRender` (mounted
  from `shareVals` with Arch and Plan), around CAS markup for **Copy from Claude** (the old
  brief card's reply step only — brief, audiences, format, notes, pictures and Open in Claude are
  gone from the markup; their render keys are still computed). Top: campaign · product, audience
  and language, its now-line, **Overview**, the stage action (`adtNext`), the steps. Bottom:
  Audiences (tiles; AR and Markets & audiences write `rsset {plan}`), Brief, Activity (ad set
  log via `rsget full` + this project's log), Links for the teams. The words list and History
  are gone; `copyVals` still computes them.
- **`adtNext()` is the one answer to "what next"**, read by the tab and by the canvas bar's
  button (`rsFlow*` keys; `rsFwd*` are unread now): Design done → Make the Arabic (this
  audience's ARB, once its English copy is approved) → Create next audience → none.
- **Create next audience is BLANK**: `rsNext` for an ENG cell clears the project's photo slots
  and resets the state to `defaults()` (campaign name kept, screen 'copy') before `dsReview`;
  an ARB cell still copies the design. The brief store's `audSet/filled/page/head` reset, so
  the reply picks the new audience.
- **Claude's reply is stored on the ad set** (`rs.reply`, `rsset {reply}`, debounced by
  `rsReplySave` from `onBrReply`); the tab copies it into an empty local brief store.
  `dsApi rsset` also takes `plan` and `product`; `dsPub` carries `ticket`, `picked`, `reply`.
- **The Changes pill and panel step aside for a campaign project** (`.shl[data-camp]`,
  `adtPill`), and `shPanel(true)` sends it to the Ad set tab instead. **Never flag the panel
  root with `data-adt`** — `adtRender` writes into `[data-adt]` hosts, and the first cut of this
  overwrote the panel itself, which hung Design done (rvRender threw on the missing h2).

Verified on the Drive stand-in, real clicks where it mattered: file a ticket with two files
(Brief/ written), Status lists it as Open, the ticket page, Pick up as another account (lands on
the Ad set tab as Local · Family), paste a reply → Families picked → Fill, Design done from the
canvas bar (pre-check, step saved, button turns to Create next audience), Create next audience
(blank, Local · Investor, Investors picked from the stored reply), Share menu export-only, a
project outside a campaign shows Set up. Contrast 0 failures over the tab, Status, the ticket
page and the form in both themes; no overflow at 375. **Not exercised on real Google Drive.**

**The CAS home header is the title and the theme toggle only (2026-10-28, same day).** New
campaign (it only scrolled to the form below it; Status has New ticket) and Open session are gone
from it. Opening a file is **Open a project file…** in the sidebar's Session group (it calls the
same `openSession`, and stays visible as a chip on a phone). **All is Home**, without the stale
count (`allCount` counted the deleted templates), and its subtitle counts campaigns from
`providentReviews.summary()` — `provident-status-sum`, written by Status's own load
(`statusSave`) and refreshed in the background by `Arch.refreshSum` when Home mounts, at most
every 2 minutes and only with a valid Google token (never a prompt). OPS's header is unchanged.

# AD SET SETTINGS, AND THE DESIGNER'S "ALREADY APPROVED" (2026-10-29)

By request: a way back into an ad set's setup after it is made, and a bypass of the content team
for ads already signed off elsewhere (so they still show on Status). share-link.js + api/share.py.

- **`rsSettings(rs, save, {ticket})`** is the setup form again as a `.shl-dlg` (`.rss`, section at
  the end of share-link.js's sheet): name, product, deadline, brief, markets × audiences tiles with
  AR. Opened by **Ad set settings** on the Status ad set page, **Ticket settings** on an open
  ticket, and **Ad set settings** in the Ad set tab's Audiences card (it replaced the
  Markets & audiences fold). It never orphans work: a cell with a project cannot be dropped (also
  through a product switch), and AR stays on while an ARB project exists. Resolves to the saved
  `rs` or null. **`rsSettingsSave`**: Drive → `rsset {name, product, plan, ticket}`; old share
  store → name, product, eng_only on the server and the plan in `PLAN_LOCAL`.
- **dsApi `rsset` logs what moved** (`chg`: renamed, product, added/dropped cells, Arabic on/off,
  deadline, brief) and takes `ticket {brief, deadline}`. The Ad set tab's AR tiles now log too.
  `api/share.py rs_set` accepts `product`.
- **`approved`** is a designer-only step (`DS_STEP`, `STEP` in share.py): sets `copy` and, if
  missing, `design`; log "Marked it approved — signed off before the review". Offered as
  **Already approved** wherever the designer sees a project without copy approval (`itemActs`,
  the Ad set tab header, Status's project rows), after `APPROVE_Q` confirm.
- Verified on the Drive stand-in: ticket settings saved and logged, the Adset.json renamed, the
  locks refused a busy cell / product switch, Already approved moved the audience on to the Arabic,
  0 contrast failures in dark. Not exercised on real Google Drive.

# A PROJECT FINDS ITS AD SET; THE HAND-OFF LIVES IN THE TOP BAR (2026-10-29)

Reported with a screenshot: a project in a fully set-up ad set showed "Not in a campaign" with
the old Changes panel, its Copy link handed out the project's own edit link, and the Design done
button was missed in the canvas bar. CAS + share-link.js.

- **Cause:** the window followed the project's OLDER edit link (from before the ad set). The
  pid record (`provident-share-pid:`) pointed at it, so every window reconnected there.
- **`SP.rsFind(force)`** (from `shareInit`, 1.5s in; and **Look again** in the Ad set tab):
  waits for any reconnect and the link's first poll, then looks the pid up — the
  `provident-rs-pid:<pid>` record (written by `rsSet`/`shPersist` whenever a tab follows the
  project in an ad set), else every Drive ad set in `Arch.list()` through `rsinfo`, whose
  `dsInfo` now returns `pids {sid: pid}` and `pmod {sid: last change}`. Found: save to the old
  link, `shareStop(false)`, then `shRejoin(sid, true, theirsWin)` — `theirsWin` merges over
  `mine` as the base, so the ad set's copy wins wherever the two differ (and no local-only
  photos go up). With no link followed, this computer's copy wins only when it was saved more
  than a minute after the ad set's copy changed.
- **`shPersist` never lets a link that is not in an ad set replace one that is** (`inRs` on the
  pid record).
- **`_rsFinding`** ('soon' until the first look, true while looking) makes the top bar say
  *Finding its ad set…* and the Ad set tab *Looking for this project's ad set…*; not found, the
  tab reads "This project is not in an ad set" with **Look again** and **Add to an ad set**.
- **The Changes panel's Copy link is the ad set's designer link** in an ad set (`linkKind`
  'dd', labelled "Copy designer link"), else "Copy edit link".
- **`.p-flow`** (CAS section 61), right after Ad set | Design: four segments (`rsBarSegs`,
  states `cur`/`done`/`pend`→todo; the current one amber while the content team has it), the
  step (`rsBarStep`: Design / Copy check / Arabic layout / Translation check / Done), the place
  (`rsBarWhere`, hidden ≤1360px) and `rsFlow` as a solid button. `adtNext` labels the hand-off
  **Send to copy check** / **Send for translation check**. The canvas bar's `.p-cvsend` and the
  Ad set tab header's action button are gone (one action, one place). Below 1600px a bar with a
  flow drops the studio switcher. Measured: fits at 1440 and 1280; 18–20:1 / 14.6:1 contrast in
  both themes.
- Verified on the Drive stand-in: a window following an old edit link reloaded into
  *Finding…* then the ad set's project, panel gone, toast naming the audience; Send to copy
  check from the top bar ran the pre-check and moved it to Copy check. Not on real Drive.

# STATUS › AN AD SET'S PAGE WAS REDESIGNED (2026-10-29)

By request. `AV.detHtml` (share-link.js) draws `.rvd` (CSS block "THE AD SET PAGE" at the end of
the sheet, a size container): ONE header card — thumbnail, product + brand, the name at 30px, a
plain pill and "Created … · changed …", then Open the ad set / Drive folder / a settings icon —
whose lower half is the four steps as counts with bars (`.rvd-steps`, the board's step colours,
the current step in ink) and a "Waiting on" row of chips, one per unfinished audience with its
step dot and what it waits for. The separate Progress card and the tools row are gone. Main
column: **Audiences** (Add a project in its heading) as one row each — name, the step and its
sub-line, four segments coloured by step, then the English / Arabic tiles (old `.rva-lt` markup
and actions) — then Activity. Side (340px): **Team links** (icon, role, one short line, Copy;
the URL is the button's tooltip), Details (empty rows omitted), Brief, Drive location, and
Remove / Delete at the foot. One column under 1000px of container width. Every `data-a` action
is unchanged. Verified with injected sample ad sets: 0 contrast failures in both themes, no
overflow at 375.

**Planned audiences with no project yet show placeholders (2026-10-29, by request).** On an ad
set's page every cell of the plan (Ad set settings: market × audience, Arabic or not) that has no
project gets a dashed **Start the English / Start the Arabic** tile (`.rvd-ph`, `data-a=
"startcell"`) — in an audience's row where one language is missing, and as a "Not started" row at
the foot for an audience with none. A click calls `startCell(dd, cell)`, which opens the studio
in a NEW window on a fresh workspace with `#pick=<base64 {dd, cell}>`; `SP.rsPickHash` (first in
CAS's `shareInit`) drops the hash, writes `provident-rspick` with the cell and runs
`newProject`; after the reload `rsPickCheck` adds that exact cell (Arabic sets `font: arabic`,
blank design) and lands on the Ad set tab, where Claude's reply is pasted. A cell taken
meanwhile says so instead of making a second project. Verified on the Drive stand-in end to end.

# STATUS READS THE CAMPAIGNS FOLDER, SO EVERY BROWSER SEES EVERY CAMPAIGN (2026-10-29)

Reported: performance marketing's browser showed no campaigns. Status listed only this
computer's `provident-reviews` (ad sets this computer made, added to or opened), so a browser
that never touched one saw nothing. **`DS_HOME` is the campaigns folder** — Drive "Offplan 2026",
`1Xj6QMTlEAuOkcafWWFW4rECpe8Ja6s69` (per computer: `localStorage['provident-status-root']`,
a link or id). `dsDiscover()` (share-link.js) reads it with batched Drive queries — the folder,
then every campaign folder in it, then any `Ad set review` folder (`dsFindSets`, depth 3, never
into Local/Brief/Assets) — and puts every live `*_Adset.json` on the list by its designer token
(`Arch.add`, so one removed from the list stays removed). It runs before Status loads (forced on
open, Refresh and Google Drive › Refresh; otherwise at most once a minute), before the Home
subtitle's counts, and in `rsFind`. Never prompts: no Google session, no scan. **A campaign set
up with the folder left empty goes in a new folder named after it inside the campaigns folder**
(`dsCampaignFolder`, " (2)" on a clash); a pasted folder link still wins. The Status subtitle no
longer says "on this computer". The Drive stand-in now answers OR'ed `in parents`, `name contains`
and `mimeType` queries. Verified on the stand-in: a campaign filed with no folder landed in its
own folder; a browser with an empty list found it on opening Status. The real folder was read
through the Drive connector: 5 ad sets, each directly in its campaign folder.

# A SAVE SESSION INTO THE AD SET'S DRIVE FOLDER CUT A PROJECT OFF FROM ITS AD SET (2026-10-29)

Reported: opening an audience from Status opened the project as "Not in an ad set". Read off the
real Drive (Palm Springs by Dubai Holding): both projects' files had their `review` block but no
`rid`, and both were in Drive's trash. The file's revisions showed why: at 08:36 on 28 Oct a
**Save session** wrote a plain `{app, v, state, images}` over it. The Source folder was the ad
set's own `Local/Family/English` folder, synced to the Mac by Google Drive, and the session file
has the same name as the project file (`<campaign>.adstudio.json`), so it landed on the same Drive
file. The next share save rebuilt `review` with no `rid`, and `dsResolve` could never find the ad
set again. A later 14 MB session save replaced the file (new id, old one trashed), and the studio
kept saving to the trashed file.
- **Prevention** (`writeProject`, studio-base.js, both studios): a `.adstudio.json` /
  `.smpstudio.json` that already exists AND carries `review` is never overwritten; the session is
  written beside it as `<name> (session).adstudio.json`.
- **Self-heal** (share-link.js): `dsRead` keeps the review block it held when a project file comes
  back without one; `save` / `thumb` go through `dsKeepReview` (restore the cached review, else
  the `rid` the client sends — the main save now sends `rid`).
- **Repair** of a project already cut off: `rsFind` finds it in an ad set by pid (rsinfo `pids`),
  and when the tab already follows that very link it calls the new Drive op **`relink`** (designer
  token + `p`): sets the `rid` (and `meta`), takes the file out of the trash, and the bar shows the
  ad set. Opening the project once repairs it. The repaired folder may then hold the session copy
  too; Open Session on that folder can pick either.
Verified on the Drive stand-in (which now returns `trashed` in metadata): a file wiped and trashed
like the real one reconnected on opening its link from a fresh workspace; a wipe under an open tab
kept rid, rev and log; a session write beside a review file went to `(session)`.

# AN UNBRANDED PROJECT RENDERED OUTSIDE THE EDITOR WAITS FOR ITS OWN FONTS (2026-10-29)

Reported: performance marketing's ad set window drew an unbranded project's headline in Google Sans
Flex while the designer saw its Google Font, and within one variant some sizes had the face and
some did not. A canvas never pulls a webfont, and the look's Google Fonts are fetched on demand
(`CampaignStudio.fontLoad`); `RV.render` (the content team's and PM's windows, and the designer's
ad set overview) and `rvThumb` (Status previews) drew as soon as the photos arrived, so every
render that beat the font download was drawn in the fallback. Both now await `projFonts(st)`
(share-link.js): `applyFont(st)` then `StudioBase.ensureFont`, which CAS wraps to include
`lookReady()` (capped at 6s). Ad sets' Edit text already did this (`aeFonts`). Measured on the
Drive stand-in from a clean origin: the headline face not loaded before opening the link, loaded
at all four draws. **`document.fonts.check` answers true for a face that is not there** — count
`[...document.fonts]` with `status === 'loaded'` instead.

# PERFORMANCE MARKETING'S WINDOW WAS REDESIGNED (2026-10-29)

By request, from a screenshot of the PM link's Ad sets window. share-link.js + three CAS hooks.
- **The window's title is the ad set's name** (`RV.pmHead(a)` → CAS `asTitle` / `asSub`: product
  · audiences · variants · images · ready date); the "Performance marketing" chip is hidden.
- **The package controls moved into the window's top bar**: an empty `[data-rvh-bar]` host
  (CAS markup, before the close separator) receives `.rvh` — status pill ("Package ready" /
  "1 of 2 ready"), Notify me, See details, and **Download package** as the one solid button.
- **The pane's big widget became a strip** (`.rvp`, still moved into `[data-rvh-host]`): for the
  audience on screen (`RV.audOf(key)` maps a folder — English or Arabic — to its ad set audience)
  it reads Ready to run + who signed off + date + Download, or the current step and what it waits
  on with Download disabled; under All audiences it is one row per audience (click opens it via
  `asPickAud`, `data-go`).
- **The nav says which audiences are ready**: `RV.audState(key)` → `au.st` → `data-st` on the
  nav button, a green or amber dot (`html.rv-as`, so the content team gets it too).
- **The tiles grow to fill the row** for PM: `.as-pane` is a size container and each `.as-vrow`
  sets `--as-h` to (width − 100px) / 3.414 (the four Meta sizes side by side), capped at
  min(58vh, 440px).
- Verified on the dev share server with a two-audience ad set (Family done, Investor at copy
  check): both views, the row click, 0 contrast failures over bar, strip and nav in dark, no
  overflow at 390. The details dialog is unchanged.

# THE DESIGNER'S LINK OPENS STATUS, NOT THE OLD OVERVIEW (2026-10-29)

Reported as the old Ad set overview flashing when loading another screen. Cause: opening an ad
set's DESIGNER link (`#share=<dd token>`, e.g. Status's "Open the ad set") started the old
"Designer overview" window (`RsView`, role `dd`) and saved the tab's binding
(`sessionStorage['provident-share:rs']`) with the tab's pid — `''` on any new or picked-up
campaign — so every later reload in that tab whose project had no pid yet reopened it. Not the
browser cache. Now `shareOpenLink` sends a `dd` link to `rsShowStatus` (Status, that ad set's
page, via `Arch.want`, read by `ArchView` and `Arch.mount`); `RS.resume` drops a `dd` binding;
Status's ad set page lost its "Open the ad set" button; the Team links' designer row says it
opens this page. Content-team and PM links are unchanged. The in-project Ad set tab's Overview
(`rsOverview`, embedded) is kept. Verified on the dev share store: a stale binding no longer
reopens the window, the designer link lands on the ad set page, the ct link still opens its window.

# THE CONTENT TEAM'S WINDOW TAKES PM'S SHAPE (2026-10-29)

By request, after PM's redesign. share-link.js + three CAS hooks; chrome only.
- **Their unit is a PROJECT, not an audience.** `ctState(it)` (share-link.js) is the one answer:
  **To check** (designer sent it, copy not approved), **Approved**, or **With the designer** (they
  may edit, nothing to approve). `ctLabel(it)` names it "Local · Family · English";
  `RV.ctQueue()` lists the To-check projects in nav order; `RV.itemOf(key)` maps a folder to it.
- **Title** = the ad set's name; sub "Copy check · Residential · 3 projects · 1 to check · 1
  approved" (`pmHead` is role-aware; CAS reads it for `ct` too). The role chip is hidden.
- **Top bar** (`[data-rvh-bar]`): a pill ("N to check" / "All copy approved" / "Nothing to check
  yet"), Notify me, and **Activity** (`data-pnl`, unread count) — the side panel is closed by
  default now and remembered per computer (`provident-share-open-ct`); the floating Changes pill
  is hidden for ct. The panel is the log alone, titled Activity (`.rv` section hidden).
- **The strip** (`ctRender`, in `[data-rvh-host]`): the project on screen — state, who sent or
  approved it and when, the audience's four segments, **Approve English copy / Approve
  translation** (or Reopen), and **Next: <project>** to the next one waiting. Under All
  audiences it is the queue: To-check first, one row per project, each with its button.
- **Nav**: each folder's line is the project's state, with an amber (to check), green
  (approved) or hollow (with the designer) dot (`audState` per item for ct; CAS `ASW`).
- **`barRender` force-updates the shell when any project's design/copy flags change**, so the
  title line and the nav follow a step at once (they lagged until the next render, PM's too).
- CAS: a review's pane line drops the `.adstudio.json` name; Edit text reads "Up to date" and
  "Saved for everyone · 3:00 PM"; ct has no Download buttons.
- Verified on the dev share server: a typed heading saved, Approve by real click, Next opened the
  second project, the queue and Activity, 0 contrast failures in both themes, fits at 390.
  **Probe trap:** `getComputedStyle` returns a `color-mix()` background as `color(srgb 0-1 …)`;
  an rgb parser reads that as black and reports false failures.

# A STALE DRIVE READ PUT OLD PHOTOS BACK (2026-10-29)

Reported: in an ad set, a photo uploaded to a new design disappeared after it saved, or another
picture came back in its place. Cause: every write to a project file on Drive is read the whole
file, change it, write it back, with no compare-and-set. The preview writer (`op: 'thumb'`, 1.5s
after each save, and the Status page's `AV.heal`) could read the file as it was BEFORE a save. Drive
can serve an older copy for a moment after an upload, and a thumb could also overlap a save. It
then wrote that copy back, rev and photo map included. The tab's next poll saw a different rev,
pulled it, and `shPull` deleted every slot missing from the old map (or fetched an old entry's
file, which `dsUpsert` overwrites in place, so pictures appeared to swap). The local stand-in
answers instantly, so it never showed there.
- **`_w` on every file this page writes** (`dsWrite`), with `DSW[id]` (never flushed) as the
  newest this page has seen. `dsRead` never believes a read with a smaller `_w`: the cached newer
  copy answers, or it retries 4 times and then fails as "still catching up".
- **This page's Drive writes run one at a time** (`dsApi` queues `DS_WRITES` ops; `dsApi1` is the body).
- **A tab never pulls an older revision**: `shPoll` pulls only on `r.rev > S.rev`; `shPull` returns on a
  smaller one.
- **`AV.heal` writes a preview only to a project unchanged for `HEAL_QUIET` (3 min)**, and `thumb`
  takes `rev` and skips the write if the file has moved on.
- The cross-COMPUTER case (two people saving within the same second) is still a lost update.
  Drive has no atomic write, and that was already the case.
Test: serve stale content for 5s after each project PATCH by wrapping `window.fetch` (alt=media
returns the pre-write text, metadata a moved version). The old code lost the photo about 20s
after the save; the new code kept two variants' photos and a replacement through 7 stale reads.

# AN AD SET'S NEXT PROJECT: ITS OWN FOLDER, GOOGLE TRANSLATE, NO DUPLICATE .JSON (2026-10-29)

Three reports on **Make the Arabic version** / **Create next audience** (`rsNext`, share-link.js).

- **The new project took the old one's Source folder.** `rsNext` changed the pid with the
  English folder still in the tab, and `bind(newPid)` remembered that folder as the Arabic
  project's own. Both export under the campaign's name, so the Arabic files overwrote the English
  ones. `rsNext` now runs `providentFolder.forget()` before `bindFolder()`; the old project keeps
  `dir:<old pid>`. **`rsNextDlg`** then finds the new folder. A browser can only go DOWN from a
  folder handle, so `rsFolderFind` works out which level of the ad set's tree the old folder is:
  Main (it holds the market folder), the market, or the audience. It then looks for
  Market/Audience/Language under it, every 2s for up to 2 minutes, while Drive for desktop syncs
  it down, and adopts it. When the old folder is the English project's own folder, it can't go
  up, so the dialog shows **Choose the Arabic folder…**, which opens the picker at the old folder
  (`startIn`). Picking the old folder again is refused.
- **Translation is Chrome's built-in Google Translate** (Translator API, Chrome 138+ on a
  computer; on-device, no key). After Make the Arabic version, the dialog's **Translate with
  Google Translate** button calls `arTranslator` → `arTranslateState`. That translates every
  component's `text` line by line (so breaks hold), `sub`, `chips[]` and `cols[].l/.v` — the
  single ad's `modules`, or each carousel page's `v.mods`. It runs from its own click, because
  the first use downloads the model and needs user activation. `availability()` gets 10s and
  `create()` 20s with no download progress, then a plain message: in the Claude Browser pane both
  hang. To stub it in a test, use `Object.defineProperty(window, 'Translator', …)`, since plain
  assignment does not replace the native one. **The real model was not exercised here.**
- **Duplicate `<name> (1).adstudio.json`.** Save, and every export, wrote a session `.json` and
  `Assets/` into the Source folder. That is usually the ad set's Drive folder, synced to the Mac.
  The guard that renames to "(session)" reads the local copy, and in a folder Drive for desktop
  had not synced yet there was nothing to read. So a second same-named file went up, and Finder
  showed "(1)". `writeProject` now drops session .json files and Assets/ while
  `shInDrive()` (a project in a Drive ad set). CAS's Save there only flushes the share save and
  records Recent, and it says the project is kept on Drive. Exports write the renders only.

# STATUS LOADS FAST: A CACHED LIST, PARALLEL DRIVE READS (2026-10-29)

Status drew nothing until it had scanned the campaigns folder and then read every ad set and
every project file ONE AFTER ANOTHER, two Drive requests per file. share-link.js now:
- **paints the last list at once** (`provident-status-list`, written by `listKeep` after each
  read; log/proj stripped, previews dropped if the JSON passes 1.5 MB), then refreshes quietly;
- **reads the ad sets it knows while the folder scan runs** (`AV.load`), and only then any the
  scan added;
- **`dsDiscover` skips ad sets already on the list or removed from it** (the link carries the
  file id) and reads new ones six at a time;
- **`dsInfo` reads six ad sets at a time** (`dsInfo1` is one), each ad set's projects at once;
- **`dsRead(id, fresh, fast)`**: a listing asks for metadata and content together when the file
  is not cached. Such an entry is marked `fast` and NEVER trusted by a non-fast read (save, step,
  preview writer), which reads it again the careful way.
Measured on the Drive stand-in with 200 ms added per request, 8 ad sets x 3 projects: first
open 6.7 s -> 1.1-1.6 s; every later open 10.2 s -> cards in ~0.1 s, fresh from Drive ~1.1 s;
an ad set's page 0.46 s. Not measured on real Google Drive.

## THE MAP WAS REVISED AFTER ITS CRITIQUE (same day, 24/40)

The critique (`.impeccable/critique/2026-10-29T13-04-32Z__…`) found the first map's bands were a
destructive click under the sketches, its flat scrim hid the photo, and its targets were
invisible. All five issues fixed, plus dragging, by the user's choice:

- **The map is MEASURED off the canvas it draws.** `lmMeasure()` (from the tick, every 200ms,
  `this._lmKey` = activeVi:focused size) reads each `.modwrap[data-mid]` box, the photo's drawn
  `img` box and opacity, and the ground, as fractions of the canvas carrying `data-lmk` (new on
  all six canvas divs; `lmKey` in mkCanvas). The scrim is the canvas's own `scrimStyle`, the
  coverage the canvas bar's `coverPct`.
- **A sketch is the component**: click selects (`lmSelect`), a pointer drag moves it
  (`lmDragStart` → `lmDropAt` → `canvasMove`, the canvas drag's own writer), Alt+arrows step it
  (`lmKey`). Mouse and pen only.
- **Whole-layout moves are a labelled row** (All copy: Top / Split / Bottom), scoped to a detached
  size when one is focused, with an Undo message (`lmNote`, 9s). The old `layoutTop/Split/Bottom`
  keys and `preset` still exist, unread by the map.
- Logo spots always drawn; a spot the copy covers (`busy`) shows only while pointing at the map
  and sits under the sketches. `aria-pressed` on every map and row button; reading-order DOM;
  a white-in-black focus ring that reads on any photo; caption `aria-live`.
- Verified with real pointer drags and clicks: CTA dragged to the top (ord and cluster written,
  selected), All copy → Bottom with Undo, Alt+Up stepping with focus kept, a detached 9:16 moving
  alone; a real photo (3:2, reframed to 160% and moved) drawn by the map at the canvas's box and
  the export op's box exactly (-0.88, -0.18, 2.4 × 1.6 of the canvas) and at its opacity (.5);
  contrast 0 failures over both rails in both themes; every map/row button has
  aria-pressed.

## THE MAP IS GONE: THE LAYOUT RAIL IS WORDS, PREVIEWED ON THE CANVAS (same day)

The user did not like the map either. Three new directions were drawn as mockups
(`.impeccable/mocks/layout-rail-options.html`: A words + live preview, B layout on the canvas,
C one keyboard field) and A was chosen. The map's markup, CSS, `lmMeasure`, its drag/keys and the
`data-lmk` geometry reads are deleted; `data-lmk` on the six canvas divs stays (the preview finds
the canvas by it).

- **Copy** (At the top / Split / At the bottom) and **Logo** (four corners) are lists of `.lw-o`
  rows with a glyph; Align and Background are `.lm-seg` rows. Each option is `lmOpt(key, label,
  tip, apply, note)` in renderVals: `apply(x)` mutates a draft, the click runs it through `upd`
  (and `lmNote` with Undo for Copy), on a detached focused size it writes only that size.
- **The preview never writes.** `lmPreview(apply, label)` sets `this._lmPrev`; the top of
  renderVals draws from `JSON.parse(JSON.stringify(state))` with it applied (`let s`). So nothing
  is persisted, undone or picked up by the share-link sync (which reads `this.state`). The focused
  canvas gets `data-preview` (outline via `::after`, `--z` set for the transform scale) and its
  plate head a Preview tag. Pointer enter/leave and focus/blur drive it. On-flags read the REAL
  state (`lmRead(this.state)`), never the clone.
- Verified with a real hover (preview drawn, state and undo untouched), leave (cleared), clicks
  (one undo entry, Undo message; clicking the current choice records nothing), keyboard focus
  (via focusin — `el.focus()` fires no focus event while the pane has no window focus), and
  contrast 0 failures over the rail in both themes.

**PM's and the content team's windows say which view they are (2026-10-29, by request).** A line
above the ad set's title — **Performance marketing view** (navy dot) or **Content team view** (green
dot), its tooltip saying what that view is for — from `asKickOn` / `asKick` / `asKickTip` in CAS's
Ad sets keys, `.as-kick` (section 57b). Shown only when `pmHead` titles the window (pm, ct). The
old role chip (`.as-role`) stays hidden for them.

# CAS HAS A SIGN-IN AND ROLES (2026-10-30, /impeccable)

By request: a login for CAS, a different view per role, and an admin panel that grants and
reviews who tries to get in. Setup: `docs/studio-access-setup.md`. User decisions: unknown
accounts **request access**; **one admin** (other designers get no admin panel); roles are
**Designer** and **Performance marketing**; "simulate a sign-in view for PM" is **Preview as**
in the admin panel.

- **Server = the `acc*` ops in `api/share.py`** (it already has the store and the dev server).
  `accstatus` (GET, public: on iff `ACCESS_ADMIN` is set), `accme`, `accreq`, `acclist`,
  `accset` (POST, body carries `tok`). **Identity is the Google access token, checked by the
  server against `{ACCESS_GOOGLE_BASE}/drive/v3/about`** (cached 5 min per token hash), never the
  page's word. `ACCESS_ADMIN` lives in the deployment, never the repo. Keys `acc:users` (one JSON
  map) and `acc:log` (list, 400). `accme` only writes when the record changes or ten minutes passed.
- **Client = `access.js`** (CAS `<head>`, after hairline.js; plain DOM outside React). It hides
  the shell (`html.acx-hold`) until the server answers; draws the gate `#acx` (sign in / checking /
  waiting for access with a note and a wanted role / declined / outside the domain / can't reach);
  sets `html[data-acc-role]` and `html[data-acc-isadmin]`; adds the account chip `.acx-me` to the
  Home sidebar; fills `div[data-acc-admin]` with the Access view (Requests · People · Activity,
  Preview as). **Never name the root flag `data-acc-admin`** — `querySelector('[data-acc-admin]')`
  then returns `<html>` and the panel draws nowhere; that cost a round.
- **Performance marketing**: CSS hides the studio switcher, Recent, Component usage, Continue /
  Open a file, the recents column, **Start designing** (File as ticket becomes the primary), and
  Status's designer actions (`PM_BLOCK`: pick, proj, startcell, add*, approve, relab*, rmproj,
  delset, overview). A capture-phase click guard refuses the same actions, the shell's `view`
  falls back to Home for anything but `all` / `rev`, and a tick sends `screen` back to `splash`.
- **Shell hooks** (CAS): `providentAccess.now()` read at the top of the splash keys
  (`shViewAcc`, `shShowAcc`, `shAccOn` / `shAccLabel`, the Access title and sub), and
  `providentAccess.attach(this)` in the shell's `componentDidMount`.
- **Bypasses, deliberately**: a `#share=` review link (and the tab it opened, `provident-acc-link`
  in sessionStorage) skips the gate — the link is the key. Off the website with no answer the
  studio opens; ON the website no answer fails closed. OPS and `index.html` are not gated.
- **It is a UI gate.** Campaign data is protected by Drive sharing; the HTML can be opened off the
  disk. Say so if asked whether this is "secure".
- Dev: `tools/share-dev/serve.py` sets `ACCESS_ADMIN` to the Drive stand-in's account; the stand-in's
  `about` answers `Bearer dev:<email>:<name>` as that person, so any role can be tested.

Verified on the dev server: sign-in, a request with note and wanted role, an outside-domain refusal,
Let in (real clicks), the waiting page letting itself in ~20s after approval, Preview as
performance marketing (Home with File as ticket only, Status without designer actions, the editor
and a `data-a="pick"` click refused), sign-out; 0 contrast failures over the gate and all three
Access tabs in both themes; no sideways scroll at 375. **Not exercised against real Google or
Vercel.**

# VIEWS BY ROLE, AND HAND-OFFS THAT NAME A PERSON (2026-10-30)

By request: **SMM** is OPS only (guided and All controls, Status, hand-offs to the designer and the
copy team); **CT** gets the copy requests from both studios; **DD** everything but Access. Each team
has two people, and every hand-off asks which one.

- **The team is seeded** (`ACC_SEED`, api/share.py): exec10.media smm, exec1.content cten,
  exec2.content ctar, exec4/exec5.graphics designer, digitalmarketing.lead1 pm. Applied once per
  store (`acc:seed1`), so the admin's later changes stick. `acc_users` reads both keys in one pipe.
  The admin's `accme` now also writes an `acc:users` record (role `ACCESS_ADMIN_ROLE`, default
  designer) so hand-offs can name them; `acc_list` leaves it out. **`op=accteam`** (POST, any
  active person) lists active people `{email, name, role, last}`.
- **access.js**: `blocked()` = CAS and role smm → the gate shows "Your work is in the Organic Post
  Studio" with a link (and **End the preview** for the admin); `only()` = CAS ct → `'rev'` (the CAS
  shell reads `acc.only`), OPS pm → `'rev'`. `data-acc-only` hides CAS's Home row and New ticket for
  ct; `[data-a=settings]` joined the limited roles' blocked actions. OPS hides the studio switch for
  smm (`.p-ws:not([data-on])`, `.p-top > .p-seg:not(.p-seg-mode)`) and a click guard refuses it.
  `now()` gains `only`, `blocked`, `email`.
- **The picker**: `providentAccess.handOff(rs, it, act)` → `{em, to}` or null on Cancel. Team by step
  (`teamFor`): ticket / draft-done → designers; design-done → copy (posts: both languages; an ad
  set's ENG item cten+ct, ARB item ctar+ct). Self is listed last; the last choice per team is
  remembered (`provident-handto:<team>`). Access off → no dialog, just `{em}`. It is `.acx-pk`, plain
  DOM over everything (z 4100).
- **Recorded on the item** (`it.to = {email, name, by, at}`) by both stores' rsstep: set on a forward
  step from `body.to`, and on a BACK step from the reopened step's `em` (every step record now keeps
  the sender's email). The log line gets " → Name". A ticket keeps `ticket.to` (PlanView asks on File
  as ticket; Start designing is yourself).
- **Callers**: `SP.rvStep`, `RV.rvStep`, post-flow's Home and Status step buttons (`stepBody`), all
  through `window.providentHandOff` (share-link). The Home row only shows Sending… after a choice.
- **Who sees it as theirs**: post-flow `waitingOnMe` and share-link `rsMine` / `toMine` — assigned
  work is that person's alone, **the admin included** (the admin is on a team); unassigned falls back
  to the role. The CT queue (`RV.ctQueue`) filters to `toMine`. Texts read "With Sara" (`withWho`,
  `waitOf`). CAS Status cards carry `data-me` + **Your turn**; ct's ad set page gets **Check the
  copy** (the ct link), pm's **Open the package**; non-designers no longer see the designer link in
  Team links.
- **SMM's second way on**: `acts(rs).alt` = design-done at Draft or Design, "Send to copy check",
  skipping the designer; shown in the panel and on the post's Status page.
- Verified on the dev server (port 8794; an older one held 8790) with the six accounts: SMM blocked
  from CAS and OPS's switch gone; SMM → Kelvin; the other designer saw it under With others; Kelvin
  → Sara (both CT offered for a post); Sara saw it as hers; PM's ticket → Rizi (For you · Your turn);
  Rizi's design-done offered only Sara (English); Sara's CAS = Status with Your turn and Check the
  copy; the admin's preview as smm and End the preview. **Not exercised on the real deployment.**

# AD SETS RUN IN PHASES, AND ARE BRANDED OR UNBRANDED (2026-10-30)

By request. Both are on Drive ad sets only (share-link.js); the old share store has neither.

- **Phases**: `PHASES` = teaser · launch · fat1 (Ad Fatigue 01) · fat2 (Ad Fatigue 02) · sold.
  `rs.phases` (enabled), `rs.phase0` (the first, default `launch`), `it.phase` on each item.
  **`phOf(rs, it)` is the one answer** — an item with no phase is the first phase's, so every ad
  set made before reads as one Launch package. `phList`, `phMulti`, `phPre` (a "Launch · " prefix
  only when there is more than one phase), `dsItemLabel` / `itemLabel` / `ctLabel` take `rs` for it.
- **`rsAuds` keys an audience by phase|market|aud** and returns `a.phase`; `rsOverall` over a
  filtered list is one phase. Uniqueness (dsReview's taken check, relabel) includes the phase.
  `planTodo(rs, ph)` is per phase; `rsNext` keys are `market|aud|lang|phase`; `startCell` /
  `rsPickCheck` carry `cell.phase`. The plan (markets × audiences × Arabic) is shared by every phase.
- **Drive layout**: the first phase stays at Main/Market/Audience/Language; an added phase lives
  under Main/<Phase name>/ (`dsPhRoot`, read by `dsPath` and `dsMove`), so nothing already on Drive
  moves. `rsFolderFind` looks for the phase folder too. The PM/CT stand-in folder names the market
  folder "Launch · Local" when there is more than one phase (`RV.pathOf`).
- **Adding a phase**: Status › an ad set's page has a tab per phase (`AV.phTabsHtml`, `.rvd-phs`,
  instance `phTabs` per ad set, opening on the latest phase with projects) and **Add phase**
  (designer, Drive only) → `rsset {phases}`. Ad set settings has a Phases row. `rsset` stamps every
  item without a phase with the first phase before changing the list, refuses to drop a phase
  with projects, and moves `phase0` only while it holds nothing. Logged.
- **Brand**: `rs.brand` = `provident` | `unbranded`, set on Home's setup (Branded | Unbranded) and
  in Ad set settings (`rsset {brand}`, logged). **It only decides how NEW projects open**:
  `SP.rsBrandApply(rs)` turns CAS's unbranded look on (strip closed) in `rsPickCheck` and in
  `rsNext`'s blank path; the Arabic copy keeps the English project's look. Existing projects are
  never switched. Status's Provident/Unbranded/Mixed chip still reads each project's own state.
- Verified on the Drive stand-in: a Teaser ad set picked up, Launch added by real clicks (tab,
  log, placeholders carrying the phase), a Launch project started into `Launch/Local/Investor/
  English` while Teaser's stayed at Main, Create next audience staying in Launch; an unbranded ad
  set's first project opened (and saved to Drive) with `look.on`. **Not on real Google Drive.**

**A new phase showed nothing to start (2026-11-04, fixed).** Reported on Palm Springs by Dubai
Holding: Ad set settings › tick Ad Fatigue 01 › Save changes, and the new phase had no Start
placeholders. Two causes. (1) The placeholders, the tab's done/planned count and `planTodo` read
only `rs.plan`; an ad set made before plans (or from a project) keeps none, so every added phase
read "0/0 · No projects yet". **`rsCells(rs)`** is now the one list of an ad set's audiences: the
plan's cells plus any market × audience a project holds in any phase (Arabic from `eng_only` or an
ARB project — the same merge Ad set settings always did, which now calls it too), sorted MARKETS ×
AUDS. `planTodo` (so `rsPickCheck`'s "Already made" check and the Ad set tab's "Still to make"),
`AV.phTabsHtml`, `AV.detHtml` and the Ad set tab's audience card read it. (2) Saving Ad set
settings stayed on the latest phase with projects, so the new, empty phase was a tab nobody
opened; the settings handler now sets `phTabs[id]` to a phase the save added, as **Add phase**
did. An empty phase's header says "Nothing started in <Phase> yet — start each audience below"
and its rows "No <Phase> project yet". Verified on the Drive stand-in: Ellington with `plan`
deleted from its Ad set.json → Add phase › Ad Fatigue 01 reproduced "0/0" on the old code, then
read 0/2 with a Start placeholder per audience; one opened CAS on the Ad set tab as Ad Fatigue 01
· International · Investor · English and landed in that phase; Damac's settings save of Ad Fatigue
02 opened on the fat2 tab with its three placeholders. **Not on real Google Drive.**

# PREVIEW AS ONE PERSON (2026-11-04)

By request ("give me access on what CT see and other users as well"). Access › **Preview the home
as** has two groups: **A role** (as before) and **A person** (every active user but the admin).
`provident-acc-viewas` (sessionStorage) holds the role, or `role|email|name`. `viewAs()` still
returns the role; `viewWho()` the person; `now().email` is the person's email while previewing, so
post-flow's `myEm`, share-link's `myEmail` and index.html's `build()` (which now reads
`acc.now().email` before `provident-acc-me`) judge "mine" for them. `me()` is untouched: hand-offs
and step bodies still carry the admin's own email. `now().previewKey` (the raw value) is what the
home compares to re-read on a switch between two people of one role.
- **The preview reaches a post-link tab** (no sign-in gate there): `viewRaw` honours `A.quiet.admin`,
  and `copyLang()` reads `viewAs()`, so previewing a content-team person opens OPS's copy check.
- **Fixed in passing:** `preview()` tested `window.StudioBase`, which is never set (a top-level class
  is a global binding, not a window property), so Back to Access in a studio ended the preview but
  stayed put. Now `typeof StudioBase`. `base()` at access.js:68 has the same test and falls back to a
  relative `/api/share` — harmless on the site, left alone.
- Verified on the stand-in as the admin: previewing Priya listed her four hand-offs with her email;
  her copy-check post opened on the words-only view with "Previewing as Priya Nair · Content team ·
  English"; Back to Access went to the home's Access.

# AD SET LINKS NO LONGER GLITCH (2026-11-04)

Reported as "the generated links are glitching" (the ad set page's Designer / Content team /
Performance marketing links). Two faults, one cause — the links open through CAS's start screen:
- **The content team's and PM's link left for the home's Projects ~15 s after opening.** Their
  window (`RV`, `html.rs-on`) lies over the start screen, so `state.screen` stays 'splash', and
  CAS's "nothing open → the home's Projects" check (`busy()` in the shell's renderVals) gives a
  link only 15 s. `busy()` now counts `html.rs-on` as an open project.
- **Every link flashed the start screen** (sidebar, "Projects · Opening them on the home page")
  behind "Open the ad set". `studio-base.js`, at load, puts `html.lnk-wait` on a `#share=R…` link,
  which hides `.p-shell` (the dialog sits outside it); `RV.start` removes it, a failed open removes
  it, and it lifts on its own after 20 s. The designer's link still goes on to the home's ad set page.
- Verified on the stand-in: Content team (Priya) and Performance marketing stayed on their windows
  for 25 s with no start screen behind the dialog; Designer went straight to #/item/cas/<id>.

# ARABIC PER PHASE (2026-11-04)

By request ("there are instances it doesn't require one on separate phases"). Reported as Ad set
settings refusing "Local · Family has an Arabic project. Remove it first to make this audience
English only." when only a later phase needed no Arabic: the plan was markets × audiences × Arabic,
shared by every phase. share-link.js only.
- **A plan cell may carry `arbOff: [phase keys]`**: the phases that skip its Arabic (only with
  `arb: true`; absent = Arabic in every phase, so every older plan reads as before). `arbOffOf(c)`
  cleans it, **`arbIn(c, ph)` is the one answer**. `rsCells` copies it and takes a phase off the
  list when that phase holds an ARB project. `planTodo` (so Make the Arabic, Still to make,
  rsPickCheck) and Status's placeholders (`AV.detHtml`) read `arbIn`; `rsAuds` sets `a.engOnly`
  for a phase that skips it (Translation "Not needed") and `a.phOff` for the "Not needed in
  <Phase>" wording. `eng_only` stays per market|aud and still means no Arabic anywhere.
- **dsApi `rsset {plan}`** keeps `arbOff` and logs "<cell>: no Arabic in …" / "Arabic again in …".
- **Ad set settings**: with more than one phase, an Arabic tile gets an **Arabic in** row (`.rss-arp`,
  `data-arbph="market|aud|phase"`, `.rsp-t` chips). A phase with that cell's ARB project is locked;
  unticking every phase turns AR off; AR on resets `arbOff`; save drops entries for phases no
  longer ticked. The whole-AR lock message now points at the chips.
- **CAS's Ad set tab**: on a multi-phase ad set the audience card's AR is the current phase's
  (`data-ph`), and it refuses to turn off where an ARB project exists (it did not check before).
- Verified on the Drive stand-in (Damac Lagoons, Launch + Ad Fatigue 01 + 02): real clicks unticked
  Ad Fatigue 01/02 for Local · Family (count 9 → 7), Launch refused with the new message, saved,
  logged; the Ad Fatigue 01 tab showed Start the English with "Arabic · Not needed in Ad Fatigue 01";
  reload read it back; re-ticking logged "Arabic again" and restored the seed. **Not exercised:**
  the Ad set tab's per-phase AR in CAS, and real Google Drive.

# PERFORMANCE MARKETING: CAMPAIGNS ONLY, LAUNCH, A SHORTER DETAILS PAGE (2026-11-04)

By request, from annotated screenshots of the live site previewed as Dennis (PM). **Supersedes
"ready is the end (no 'campaign live' button)"** from the review-process section above.
- **CAS only.** index.html `studiosFor('pm')` is `['cas']`, so posts leave PM's queue, With
  others, Where everything is and Status (no filter chips; lede "Every campaign in one place…";
  Ready's subtitle is `whoOf(s)`: "To run" for one studio's CAS, "To publish" for OPS).
- **Launch.** A PM sees **Launch** on the home's Next up card when the row carries `launch`. It
  confirms, then `providentDsKit.api('rslaunch', {id: row.launch})` — Drive ad sets only; the id is
  `tok.pm` (role pm) else the row id. dsApi `rslaunch` (pm or dd) stamps `rs.live[phase] = {by, at,
  em}` for every phase whose audiences are all done, logs "Launched the campaign" (with the phases
  when there are several), and is in `DS_WRITES`. `dsPub` passes `live`. **`rsLive(rs)` is the one
  answer**: every phase with projects is live → the latest launch, else null. A phase added later
  makes it null again, so the ad set comes back. `inboxCas` writes `live` (and `ready: false`,
  step "Launched") and `launch`; the home drops `live` rows from everything, for every role.
  The ad set page shows a **Launched** pill and "Launched <day> by <name>."
- **Details for PM**: `AV.detHtml` leaves out the Audiences section and Team links when
  `accRole() === 'pm'`; Open the package stays in the header. The designer-only buttons were
  already hidden by access.js's `data-acc-lim` CSS.
- **Open the package** already opened PM's ad set link (`#share=<tok.pm>`); unchanged.
- Verified on the share dev server (8791, seeded) as Dennis: Home/Status campaigns only; Launch on
  Ellington → off the queue, board 7 → 6, `rs.live.launch` by Dennis, logged; the designer saw it
  gone from Status, its page "Launched" with Audiences and Team links intact; PM's Damac page had
  neither. **Not exercised on real Drive: whether a PM's Google account can write Ad set.json** —
  if their account has only view access to the folder, Launch shows Drive's refusal.
- **The content team too (same day, by request):** `pmV` in `AV.detHtml` is `pm` or `ct`, so CT's
  campaign page has no Audiences or Team links either; its header keeps **Check the copy**
  (new tab). On the home, `tgt(x)` adds `target="_blank"` to a CT's campaign link (Next up and rows).

# MIXED BRAND, PER AUDIENCE (2026-11-05)

By request ("mix branded and non branded" in one ad set); asked and chosen: per audience (not per
phase, not both versions side by side). share-link.js only, Drive ad sets only (as Brand is).
- **`rs.brand` may be `mixed`**; then a plan cell's `brand: 'unbranded'` makes that market ×
  audience open unbranded (absent = branded). **`brandOf(rs, cell)` is the one answer**; it reads
  the plan, not `rsCells`. `SP.rsBrandApply(rs, cell)` takes the cell: `rsPickCheck` passes
  `next`, `rsNext`'s blank path `{market, aud}`. The Arabic copy still keeps the English look.
- **dsApi `rsset`** accepts `brand: 'mixed'` (logged "Mixed the ad set's brand…"), keeps a cell's
  `brand`, and logs "<cell> opens unbranded / branded" while mixed.
- **Ad set settings**: Brand is Branded | Unbranded | **Mixed**; going into Mixed seeds every cell
  with the brand the ad set had; each tile gets a `.rss-br` Branded | Unbranded `p-tabs` row
  (`data-cbr="market|aud|brand"`); save writes `brand` on unbranded cells only while mixed. The
  settings tiles now top-align (`align-content:flex-start`) — they stretch to the tallest in a row.
- **Status**: in a mixed ad set an English Start placeholder's line begins "Branded · " /
  "Unbranded · ". The Provident / Unbranded / Mixed chip still reads each project's own look.
- **Not done**: Home's New › A campaign setup still offers Branded | Unbranded only (its tiles are
  per audience across markets, not per cell) — set Mixed in Ad set settings after filing.
- Verified on the Drive stand-in (Damac Lagoons): real clicks set Mixed and Local · Investor
  Unbranded, saved and logged; Ad Fatigue 01's placeholders read Branded / Unbranded; its Start the
  English for Local · Investor opened CAS with the unbranded look on (`[data-look-host]` on). The
  test project was removed and Brand reset to Branded through `rsset`. **Not on real Google
  Drive**; a branded cell in a mixed set opening branded was not opened separately.

# MIXED, SECOND VERSION: EVERY AUDIENCE CAN ALSO RUN UNBRANDED (2026-11-05)

By request, replacing the per-audience Branded | Unbranded switch from earlier the same day.
Spec agreed: the unbranded version has its own steps (copy check, Arabic, translation, folder),
and in a Mixed ad set every audience offers it.
- **It is an audience of its own, `<aud> · Unbranded`** (`UB`, `isUb`, `ubBase` at the top of
  share-link.js). So rsAuds, planTodo, the folders (`Market/Family · Unbranded/English`), the
  copy view, the package and the logs needed no new key. `audOrd` sorts it straight after its
  branded audience (rsCells, Ad set settings); a twin cell derived from its items inherits the
  branded cell's Arabic and phases; rsAuds marks it English-only when the branded cell has no
  Arabic.
- **`brandOf`**: a `· Unbranded` audience is unbranded, anything else follows `rs.brand`
  (mixed = branded). Plan cells no longer carry `brand`; Ad set settings has no `.rss-br` rows,
  no seeding into Mixed, twin names are kept out of the audience chips, and setProd checks the
  base name. `rsset` no longer logs "opens branded/unbranded".
- **Status (`detHtml`)**: in a Mixed ad set each branded card (and each planned row) ends with
  `ubTile` — **Start the unbranded** (`.rvd-ph.rvd-ub`, spans the row) once the English exists,
  else a quiet "Start the English first". The twin's card header reads "Local · Unbranded /
  Investor" (`data-ub`).
- **The copy**: `ubStart(sid, key)` writes `provident-rsub` and opens the branded English
  project's own link. `rsSet` (every refresh while the key exists) calls `rsUbCheck`, which runs
  `rsNext(key, {auto: true})` once that project's ad set is loaded. `rsNext`'s new `ubCopy` path:
  no confirm, the design kept with a new pid, the Copy card's audience choice reset, screen
  'copy', `rsBrandApply` (look on); rsNextDlg says so. An existing twin in that phase stops it.
  CAS's home redirect waits while `provident-rsub` is fresh. `brAudIdx` (CAS) prefers a reply
  block whose name says unbranded for a `· Unbranded` project.
- **Found while testing:** a `#share=` link does not pass through the init line that runs
  rsPickCheck, which is why the check sits in rsSet. The Browser pane blocks `window.open`, so
  the new window was stood in for by writing the key and opening the link in the same tab.
Verified on the Drive stand-in (Damac Lagoons, Ad Fatigue 01 · Local · Investor made fresh from a
`#pick`): the placeholder on both branded cards; the copy saved as `Investor · Unbranded · ENG`
with the look on (unbranded preview, no wordmark or QR); its Status card after the branded one
with Arabic "Not needed"; Ad set settings with no brand switches and the twin's own tile. Test
projects, their stand-in files and the brand were put back. **Not exercised:** a real new window
from Status, real Drive, a twin with Arabic, the Copy card picking an unbranded block.

# CT AND PM LINKS OPEN FAST: TILES LAID OUT AT ONCE, THUMBNAILS DRAWN SMALL (2026-11-05)

By request ("optimize the speed of when PM and CT are viewing their generated link"). Measured on
the Drive stand-in with `DRIVE_DELAY_MS=200` (serve.py now takes it: that much latency on every
Drive request) and a real four-project ad set (Wadeem session files, 8 images each, ~2–4 MB
photos). The window opened at 1.0 s but **`asScan` rendered every image of every audience at full
export size (32 JPEGs, a Story is 2160 x 3840) before laying out one tile**, then shrank each to a
640px thumbnail; the content team's words waited for that too.
- **RV.build's image files say `lazy`, their size (`dim`) and `thumb`** (`RV.render(…, small)`:
  the same ops drawn 640px tall). `asScan` lays a lazy tile out from that with no render; the
  tile's `load()` renders the full file on the first ask (opened full size, Details, a format
  pick, Preview, a download) and `got` fills `url`/`file`/`meta`.
- **`asThumbs` takes the audience on screen first**, re-picked per tile so choosing another
  audience jumps the queue; then renders the full files two at a time in the background. While
  the window shows the words (CT) lazy tiles wait, so nothing competes with the live preview.
- `asCard`'s `img`/`meta` are getters on the current tile (it renders after the card is made);
  Preview and its arrows wait for the shots. `asDownload` and `RV.download` wait for any tile
  still rendering, all at once (one after another took ~10 s).
- **`RV.load`'s first read trusts what `rsget` fetched under 15 s ago** (`warm`, `dsRead(id,
  'warm')`): every project's metadata was being asked for a second time.
- Folder sources (real files) are unchanged: their tiles are not lazy.

| PM link, 200 ms per Drive request | before | after |
|---|---|---|
| tiles laid out | 7.6 s | 1.1 s |
| first image | 8.1 s | 2.3 s |
| the audience on screen complete | 8.3 s | 3.2 s |
| open and press Download at once → zip | not before 8.4 s | 6.2 s |
| CT: words and preview | after the scan (≥ 7.6 s) | 2.7 s |

Verified: PM Download zipped 16 images (14.9 MB) pressed at 2.2 s; a second Download 84 ms; a tile
opened full size before its render showed the 2160 x 2160 export; CT fetched only the open
project's photos. No console errors. **Not measured on real Google Drive or the live site** (the
live link asked to renew a Google session). Left: the page itself (~1 s to the window), and the
same photo is a separate Drive file per slot, so a project downloads it more than once.

# AN AD SET'S STATUS PAGE OPENS AT ONCE (2026-11-05)

Reported as "status detail screen is loading slow". On the Drive stand-in (200 ms per request,
the seeded campaigns plus a four-project one), a cold open of `#/item/cas/<id>` took 2.0 s to
draw anything past "Reading the ad set…":
- **the whole Status list read first.** index.html's `openItem` mounted the view and only then set
  `want`, so `ArchView` started on `load()` (discovery plus every ad set and every project file),
  and `startWork` also mounted OPS's post list (which `dsFlush`es the cache) and ran `refreshAll`.
  Now `want` is set before the view is made; the constructor opens that ad set and reads the
  list after it (`load(true)`); on an item page `startWork` mounts that page's studio only and the
  other studio plus `refreshAll` 4 s later.
- **the same files were downloaded twice**, by the list and the page at once. `dsRead` now shares
  a read already on its way (`DSI`, by id; a fast read may share a careful one, not the reverse;
  `fresh === true` — the writes — never shares).
- **the page waited for the slowest read.** `AV.open` draws at once from the ad set's card on
  the list (this page's, or `provident-status-list`) as `part`: name, steps, audiences; the
  activity says "Reading…" and the project lines leave out "Untitled" until the full read lands.

Cold open: drawn 0.05 s, complete 0.77 s (2.0 s), 10 Drive requests instead of ~50 before it.
From the board: drawn at once, complete 0.6 s (blank until 0.5 s before). Back, the board, an
OPS post's page opened cold — all checked; no console errors. Not measured on real Google Drive;
over HTTP/2 the remaining wait is about two Drive round trips.

# STATUS: START THE ARABIC COPIES THE ENGLISH; ONE CARD PER AUDIENCE; TEAM LINKS (2026-11-05)

All by request, on the ad set's Status page (`detHtml`).
- **Start the Arabic, once the English exists,** is `data-a="startub"` with the cell
  `market|aud|ARB|phase` and the English sid — the Start the unbranded hand-off. In the English
  project's tab `rsUbCheck` runs `rsNext(key, {auto: true})`: the `arbCopy` path (no confirm,
  `font: 'arabic'`, so the Arabic mirror), and `rsNextDlg` starts the translation at once. An auto
  ARB run only proceeds from that audience's own English, and stops if the Arabic exists. Before
  the English exists the placeholder is the old blank `startcell`.
- **Translation fallback** (`arTranslator`): Chrome's Translator API first (`arChrome`); on any
  failure (none, unavailable, no answer in 10/20s) `arWeb` — Google Translate's web endpoint
  (`translate.googleapis.com/translate_a/single?client=gtx`, CORS-open), one line at a time.
  That one sends the words to Google. Found because the Browser pane's Translator never answers.
- **One card per audience**: `part(a)` draws a head and tiles; an unbranded twin is drawn inside
  its branded audience's `li` (`.rvd-tw`, hairline above) and not on its own. In a mixed ad set
  each head ends with `.rvd-brc` — Branded (navy tint) / Unbranded (outline); `data-mx` widens
  the head grid to three columns (one column under the breakpoint).
- **Team links**: Copy puts `Content Review: <link>` / `AdSet Overview: <link>` (`LSAY`) on the
  clipboard for ct / pm (the designer's stays the bare link), and an icon link (`.rvd-op`) opens
  that view in a new tab.
- **Change audience** (`relabHtml`) lists each audience's `· Unbranded` version in a mixed ad set
  or for an unbranded project, so moving one no longer makes it branded.
Verified on the stand-in: Start the Arabic from a fresh Ad Fatigue 01 English made the Arabic
copy (Arabic typeface, mirrored), Chrome's translator failed in the pane and the web fallback
translated the layout ("Translated 2 lines"); the merged Family card with both chips; the copied
team-link text and open links. Demo data put back. **Not exercised:** real Chrome's Translator,
real Drive, a phone-width merged card.

## Performance marketing edits the words too (2026-11-06, by request)
The PM ad set link gets **Images | Edit text** like the content team's Edit text. The PM link
no longer opens in a forced mode: `RV.onTick` forces only CT to text, and `html.rv-as:not(.rv-pm)
.as-mode` shows the switch for PM. `RV.build` gives PM the writable project json, so `onJson`
merges and saves. `thumbFor` redraws the Review links preview for PM too, and the status shows
saving and saved instead of `view`. On the server side both share stores allow `save` / `thumb`
for pm: dsApi stopped throwing, and api/share.py now refuses only `part` / `pvput` (photos) for
pm. The PM bar, See details and Download are unchanged, and there's still no Changes panel on that
link.
Verified on the stand-in: a PM `save` went through (before this it was a 403). On the PM link,
Edit text showed the project's fields, and changing the Button to "Book a viewing" re-rendered
the preview, read "Saved for everyone", and was logged under the signed-in name. Demo state put
back (`{pid}`). **Not exercised:** api/share.py (the Upstash path) and real Drive.

## A phase of the designer's own name (2026-11-06, by request)
Ad set settings › Phases gets a field (`.rss-phx`, **Add phase** or Enter, `phAdd`) beside the five
standard chips. A typed phase's key is `'x:' + name` (`phKey`; `phClean` drops `| / \ :` and caps
it at 40). A name that matches a standard phase uses that phase's key. The name travels in the key,
so there is no table. Every `PH_NAME[k]` lookup is now `phN(k)` (standard name, or the name after
`x:`), and the fixed-order filters are `phSort` (the standard five in order, then typed ones in
the order they were added): `phList`, the rsset `phases` whitelist, the settings chips and
"Arabic in", and `rsAuds`'s sort. The folder for a later phase is `Main/<name>/…` as before.
**Status's + Add phase menu takes a name too** (same day): `.rvd-pmx` at the menu's foot,
`data-a="phtype"`, which shares `phnew`'s rsset call. The menu always shows for the designer
now, even with all five standard phases added. A name already added switches to that tab. The
typed text (`phTyped`) and the caret survive `AV.draw`'s redraws. Verified: "Price Drop" by Enter
became the selected tab; "sold out" typed added the standard `sold`. Demo phases put back.
Verified on the stand-in: "Price Drop" typed in settings and saved became its own Status tab
(`x:Price Drop`, 0/2, "No Price Drop project yet"), and a second typed phase dropped by clicking
it. Demo phases put back. **Not exercised:** making a project in a typed phase (the new window).
