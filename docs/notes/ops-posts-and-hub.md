<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# OPS posts on Drive, Home, and the Content Hub

# OPS SENDS AN EXPORT TO AN ENDPOINT (2026-10-19)

By request ("an endpoint for sending the export version including the .json and image assets"):
Share › **Send to an endpoint** (a folding `<details class="sx-ep">` under Export). OPS only;
CAS and `studio-base.js` are untouched. The contract is `docs/studio-endpoint.md`.

- **It reuses `doExport` whole.** `sendExport()` sets `this._ep` and calls `doExport`;
  OrganicStudio **overrides `deliver`** to call `epPost` while `_ep` is set and `super.deliver`
  otherwise — so the gate, renders and names are the export's own, and the shared `deliver` is
  unchanged. A PDF selection sends JPEGs (`epKind`).
- **One multipart POST**: a `manifest` JSON part (name, pid, template, format, sizes, each
  file's path / role render|session|asset / type / bytes), then one `files` part per file whose
  filename is its bundle path — the renders plus `projectFiles()` (session json + `Assets/`).
  `Authorization: Bearer <key>` when a key is set, `X-Provident-App: ops`, 3-minute timeout.
- **Config is per computer** (`localStorage['provident-ops-endpoint']`, `epCfg` / `epSet`), never
  the repo. `epUrlOk`: https anywhere, http only to localhost.
- It does not mark the project saved or touch Recent: nothing was written locally.
- Verified with a real click against a local stand-in receiver (CORS, Bearer key, 3 files
  reproducing the export layout, the 2160x2880 JPEG intact); unreachable host and an http URL
  both reported; plain Export still goes through `saveAs`. Not tested against a real server.

**CAS takes the same Send (2026-10-19, by request "give me a send button under the share
button").** CampaignStudio carries the identical `epCfg` / `epSet` / `epUrlOk` / `sendExport` /
`deliver` override / `epPost` (key `provident-cas-endpoint`, manifest `studio: 'cas'` with
`platform`, `mode`, `variants`; YouTube sends JPEG unless PNG is picked). In BOTH studios the
**Send N … + project** button now sits always visible under Export, and the URL and key fold
below it in `<details class="sx-ep">`; Send with no URL opens the fold and focuses the field. The
contract moved to `docs/studio-endpoint.md`. Verified in CAS with real clicks: 3 PNGs at
2160x2160 / 2160x3840 in `Variant A/`, the session json and 3 assets arrived (26 MB).

**Send targets the IMPORT HUB now (2026-10-19, by request), in both studios.** `epPost` sends
the hub's curl format: `content` = the session .json, `images` = every exported image (basename
filenames; Assets/ and non-image files left out), `X-Source: Design system`, `Authorization:
Bearer <token>`. No `manifest` part any more. `EP_DEFAULT` is `http://192.168.50.30:8090/api/imports`;
`epUrlOk` allows http to localhost and private LAN ranges; Send with no token opens the fold on
the token field. **The token is per computer and NEVER in the repo** (public). Verified against
a stand-in hub in both studios (201, 401 path); the real hub was not reachable from this Mac
when tested. An https page (Vercel) cannot reach an http LAN hub — mixed content.

**Send from the Vercel site (2026-10-19, "it didnt send").** The https site posting to the http
LAN hub failed as mixed content ("did not reach it"); the hub itself answered and its CORS was
right (checked with curl). `epPost` now passes `targetAddressSpace: 'local'` (then `'private'`)
for a LAN http URL, which makes Chrome's Local Network Access prompt instead of blocking, and the
failure message on an https page says to press Allow / enable Local Network for Chrome on macOS.
**Confirmed by the user: Send reached the hub from the Vercel site after pressing Allow.** The
Claude Browser pane cannot test this (it ignores the option and cannot reach the LAN).

**Send compresses to fit the hub (2026-10-19, after "HTTP 413 · Delivery is larger than 50 MB").**
`epFit(imgs, jsonBytes)` in both studios: under `EP_MAX` (48 MB, the hub's 50 less framing) the
images go byte for byte; over it, every raster image is re-encoded to JPEG on a white ground,
quality .9 → .85 → .8 → .72, then size .85 → .45, stopping at the first step that fits. SVGs
untouched; > `EP_MAX_IMGS` (50) images or a .json over the limit refuses with a message. Runs on
the sent copy only. Measured: a 3-variant CAS PNG export, 163.2 MB, sent as 30.3 MB of 90% JPEGs
at full 2160x3840 and accepted; with the limit forced to 24 MB it stopped at 80%.


**CAS's icon picker browses every symbol too (section 49, 2026-10-20, by request — "add full icon
library of google icons").** OPS's paging, ported: with nothing typed `iconSearch` returns the
curated `ICONS` then all of `ICONS_ALL` (3,948 after de-duplication; it returned the 12 curated),
`iconPick(q)` pages it 160 at a time (`_iconCap`, instance state, reset on a new query), and the
rail shows the count line (`.p-ic-n`), a taller `.p-icons-all` grid with `loading="lazy"` images,
and **Show more** / **Show all**. It was a flat 40 results before. Verified with a real click:
Show more 320, Show all 3,948, "house" 155 matches, a tile applied to the step on every canvas.

**Spacing reworked (2026-10-20, "cramped").** Section 48 is on one 8px rhythm that grows with the
level it separates — 8 inside a row, 16 between rows, 24 inside a card, 20 between cards, 48
between groups. Component preview 240 wide, name 20/600, count 36. Styles sit under a "Styles · N"
label (`styleCount`) in two columns (minmax 400), each a 140px render, name, count over reason, and
the verdict at the right; one column on a phone. Contrast 0 failures both themes; no overflow at 375.

# THE CONTENT HUB'S DESIGN QUEUE IS PICKED UP BY A SKILL, AND SEND ATTACHES TO THE POST (2026-10-20)

The Content Hub (`http://192.168.50.30:8090`, its own project at
`~/Documents/provident-content-hub`, contract in its `docs/design-studio-integration.md`) queues a
social post for design when someone presses **Approve and send to design**. That button only
queues; nothing designs the post until something claims it.

- **`.claude/skills/hub-design-queue/`** is that something. `scripts/hub.py` (stdlib) does the
  hub half — `jobs`, `claim` (POST `/claim`, `X-Source: Design Studio (Claude)`, writes
  `~/Documents/Provident Studio/Hub <id> - <title>/<title>.smpstudio.json` with
  `state.hubCardId`, downloads `brief.images[]` to `brief/`), `deliver` (multipart `content` +
  `images` to `/api/imports` with `X-Card-Id`, and it refuses unless the 201 carries `card_id`),
  `status`. SKILL.md has Claude fix the copy, place the brief photos, preview, export JPG and
  deliver through the provident-studio MCP tools.
- **The token is per computer**: `HUB_IMPORT_TOKEN`, else `~/.config/provident/hub-token`
  (chmod 600). Never in the repo.
- **`hub.py` remaps the hub's draft.** The hub's `design.py studio_draft` puts each middle slide's
  whole text in `ctext.title` with an empty (required) body, and the last slide in `ccta.big`
  beside a fixed "Link in bio" button. `pages()` splits a slide at its own break (colon, dash,
  sentence) into title + body, moves a trailing "…: link in bio" into the CTA button, strips
  emoji (the bundled face has none), and leaves what it cannot fill EMPTY for Claude — the CTA's
  required lead line always is. The hub-side function lives on the hub's machine and was not
  changed.
- **Both studios' Send carries `X-Card-Id`** when the project has a hub id
  (`StudioBase.hubCardOf(state)`, in `epPost`), and the status line says "attached to the hub
  post" when the 201 carries `card_id`. `normState` keeps `hubCardId` (dropping only a value that
  is not a card id). **What actually lost it** was the hub draft's id sitting at the TOP level beside
  `state`, which Open Session (`loadSessionFile`) and the MCP's `ps.apply` throw away — both lift it
  into the state now. It is stored as a string; the hub accepts either.

Verified 2026-10-20: a [TEST] card re-queued, claimed with `hub.py`, laid out through the MCP
server (three pages switched to Big number, the brief photo on page 1), exported as 5 JPGs and
delivered — 201 with `card_id`, the card in `publish` with its five pages; OPS and CAS opened the
hub's draft shape through Open Session, kept `hubCardId` across a reload, and Send went out with
`X-Card-Id` (checked at a local stand-in, so the real token never went into a browser). The test
card and its imports were deleted; the two real jobs in the queue were not touched.

**Photos and images are ONE group now (same day, by request: "they are the same").** Up to
`BRIEF_PH_MAX` (10) pictures in `adbrief-ph-0..9`; on Fill the first N (N = variants or pages)
become backgrounds and every picture offers **As graphic**. `BRIEF_IM_MAX` and the `adbrief-im-*`
slots are gone.

**Fill takes only the critical details (same day, after a test "pasted so many text").** `brWant`
maps six jobs — tag, heading, project, price, at most 2 payment rows, button — and no longer fills
the body (support line) or tags (proof). The prompt asks for the `cas-copy` block in that short
form (word caps per field, no support line, amenities or travel times); `BRIEF_SAMPLE` dropped
`support` and `proof`. The parser still reads them, so an older reply does not fail.

# THE PROJECT BROWSER HAS A "FROM THE HUB" VIEW (2026-10-20)

By request: see and reopen what the Content Hub received, from inside CAS and OPS. Sidebar row
**From the hub** (Library, under Recent, Material Rounded `inbox`) in both studios →
`splashView: 'hub'`. All logic is shared in `studio-base.js` (`hubCfg`, `hubFetch`, `hubLoad`,
`hubThumbs`, `hubOpenItem`, `hubVals`); each shell merges `eng.hubVals(view === 'hub')` and calls
`eng.hubLoad()` when the view is picked. Markup and CSS section 53 (`.hb-*`) are mirrored.

- **The list is the Send endpoint** (`epCfg().url`, `…/api/imports`), GET with the Bearer token
  when one is set — the own studio's, else the other studio's (`HUB_KEYS`). The hub's GETs do not
  check the token today; a 401/403 is still handled. Same `targetAddressSpace` local/private dance
  as `epPost`, so an https page can read the http LAN hub after Chrome's Allow.
- Cards: title, `hubWhen(received_at)`, image count, source, and a tag from `hubKind` — a guess
  from the render names (`_feed`/`_Story`/… → Campaign, `_3x4`/`_9x16` → Organic), because the list
  carries no app tag. Up to `HUB_THUMBS` (3) renders per card, fetched four at a time and shrunk to
  240px-tall WebP object URLs (`hubDrop` revokes them). Newest 40.
- **Opening** fetches `/api/imports/<id>`, wraps `content` as a File and calls
  `loadSessionFile(file, { clean: true })` — so the other studio's delivery hands over exactly like
  a session file. `clean` is new: the delivery IS the whole project, so a delivery with no photos
  also clears this studio's slots instead of opening over the last project's photos. A delivery
  with no `content.state` is refused with a message. Read only — nothing deletes an import.
- **What comes back:** the whole state and every photo that was in the store at Send (the json's
  `images`), so OPS deliveries come back with their backgrounds, QRs and icons. **What does not:**
  a photo never in the store (CAS's template deliveries carry `images: {}`), and `Assets/` (Send
  never sends it). **The delivered images are NOT re-attached** — they are the finished renders,
  copy baked in, possibly JPEG-compressed by `epFit`; as a background they would print the words
  twice. They are only the thumbnails. Opening also records the project in Recent (the
  session-file rule).
- Verified against the real hub (4 deliveries, read only): list and thumbnails in both studios, a
  CAS delivery opened in CAS, an OPS delivery opened from CAS's view handed over to OPS with its
  photos and QRs, unreachable / 401 / non-list errors shown in the view, 0 contrast failures over
  the view in both themes. The token was never put into the test browser.

**The view was redesigned (2026-10-21, by request).** A status bar (dot + Connected / Not
reachable / Checking, the host and "updated N min ago", one line of what opening does, Refresh)
replaces the intro paragraph and the loose Refresh row. Deliveries are grouped by day
(`hubDay`: Today / Yesterday / weekday and date) under `hubGroups`. A card's stage shows its
renders at their own aspect, one row of one height (`hubRow`, aspects recorded in `hubThumbs`),
a kind chip (Campaign / Organic / Not a project — with an arrow when it opens in the other
studio), "+N" for renders beyond three, and an Open pill on hover or focus (always on touch)
that names where it opens. The meta line drops a "Design system" source, and a title already
seen in a newer delivery carries "Older copy". `shViewSub` reads "4 deliveries". Mirrored in
both studios, section 53. Verified against the real hub: 0 contrast failures in both themes,
no overflow at 375, no console errors; `sc-if` / `sc-for` +2/+2 and +1/+1.

**Ad sets has Download all (2026-10-21, by request).** A `.as-dl` ghost button in the pane header
(Images view only, `asDlOn`) labelled `Download all · N`. `Component.asDownload()` zips the selected
audience's tiles — the `File`s the scan already holds, nothing re-rendered — as `Variant X/<file>`,
names the zip `<main> - <audience>.zip`, and saves it through the engine's `saveAs` (the OS save
dialog, else a download). `_asDl` (instance) drives Zipping… / Downloaded / Could not zip. Uncompressed
(the shared `zip`), so a big PNG set makes a big file. Verified on an OPFS stand-in: 4 files in two
variant folders, `Local - Family.zip`.

**Ad sets' left nav has a three-level hierarchy (2026-10-21, by request).** A main folder is a
group heading, 15/600 in ink, with its count line. Its audiences are indented under it on a
hairline guide, 13/500 in ink-2. The selected audience takes the resting fill and a 2px
`--ps-link` guide. Hairlines separate the groups. On a phone the nav stays a sideways chip row
with no guide. CSS only (`.as-nav*`). Text contrast is at least 6.47:1 in dark, with no light
failures.

**Ad sets: All audiences, and Download all takes the whole folder, flat (2026-10-21, by request).**
An **All audiences** row tops the nav (`asPickAll`, `_asAll` instance state): the pane shows every
audience's variant rows, each audience opening with an `.as-agrp` heading (`c.headOn` on its first
col — cols are copied, not mutated). Edit text is hidden there (`asModeBarOn`; `aeVals` is off while
`_asAll`). Picking an audience leaves it. **Download all now zips every image in the folder** (all
audiences, `asAllImgs` is the count), named after the folder, and **FLAT — no folders in the zip**,
by request: a file name two audiences share gets `<main> <audience> ` prefixed, and any remaining
clash a ` (2)`. Verified: 3 audiences, 8 files, 6 prefixed, 2 unique kept as is.

**Each audience has its own Download (2026-10-21, by request).** `asDownload(key)` — `'*'` (or none)
is the whole folder, an audience key is that audience (zip `<main> - <audience>.zip`), both flat with
the same naming. The single-audience header shows `Download <audience> · N` beside Download all
(`asDlAud*`); the All audiences headings carry a smaller one (`c.dl`, `.as-dl-s`). `_asDlKey` says
which button shows Zipping… / Downloaded (`asDlText`); one runs at a time. The one-row rules are
scoped to `.as-ov .as-dl` so every download button gets them.

# THE HUB POST IS THE DESIGN'S HOME: VERSIONS, REVIEW, CHANGE NOTES (2026-10-21)

On the LOCAL Content Hub (`~/Documents/provident-content-hub`, never the office hub), a social post
in the Design system column is where its design lives. **Open in OPS** opens OPS at
`#hubopen=<base64url URL>`, the hub's `GET /api/items/<id>/studio`: the post's current version (the
project .json OPS sent, photos and all), or with no version / `?from=copy` a draft from the copy plus
`hubImages` (the brief's pictures as URLs). `?v=<n>` opens a given version. The answer carries `hub`
(post, brief, change notes, `opened`, `next`), which `StudioBase.hubDraftOpen` keeps as
**`state.hubPost`** and drops into `loadSessionFile` after placing the pictures. `#hubdraft=<JSON>`
(the first form) still works. The hash is dropped before loading, because the loader reloads.

- **OPS shows a Hub post bar** above the stage (`hp*` keys, section 32 of its sheet, `<details
  data-acc="ops-hubpost">`): title, "Opened v2 · Send makes v3", the change requests, the brief and
  a link back (`<hub>/#card=<id>`). Send is labelled **Send v3 to the hub post** and the reply's
  `version` updates `hubPost`. `hubPost` is stripped from the undo signature and carried by
  `restore()`, so Undo never rewinds it.
- **Every Send is a version on the post, all kept** (`design.deliver`): `card.design.versions[]`
  `{n, delivery_id, at, by, assets, copy_sig}`, `current`, and the card stops at `design.state =
  "review"` with status still `design` (a send to an approved post moves it back). The board pill
  reads **To review · v2**; **Approve** -> Ready to publish (`state: approved`), **Request changes**
  -> a free-text note in `design.notes[]` and `state: changes` (a job again). Each version has Open
  in OPS, **Download images + .json** (`/api/imports/<id>/zip`) and Use this one. A copy edit after
  the version was made raises "The copy changed after v2…" (`copySig`, recorded as `open_sig` when
  OPS is opened). A card delivered before versions reads its one delivery as v1
  (`design.versions_of` / `versionsOf`).
- **Received is Activity**: one line per delivery, "OPS sent v2 of <post>" with Open the post and
  Download; a delivery with no post offers **Attach to a post** (`POST /api/imports/<id>/attach`),
  which makes it the post's next version (numbered by attach order). The badge counts deliveries
  since Activity was last opened on that computer (`hub-activity-seen`).
- The OPS address is per computer on the hub (`localStorage['hub-ops-url']`, the quiet **OPS
  address** link in the Design heading), default the Vercel site.
- The office hub has none of this; the hub-design-queue skill still expects `design: delivered`
  there. Verified end to end on the local hub with a throwaway token: open from copy, Send v1, To
  review, Request changes, the note in OPS's bar, Send v2, both versions on the post, zip download,
  Use this one, Approve, Attach an unfiled delivery as v3.

## A PROJECT BEING OPENED IS NOT SAVED OVER (2026-10-21)

Found on the hub's Open in OPS with four full-size photos: `loadSessionFile` writes the project to
localStorage, then spends seconds writing the photos to the store, then reloads. In that window the
template OPS opened on saved itself (`gdSeedSelect` -> `upd`), overwriting the project, so the reload
came back on the template with the new photos orphaned. **`StudioBase.loadingSession`** is set once
the project is written and stops the studios' own saves (`upd` and `restore` in both, Campaign's
`persist`), and the loader writes the project again just before `reloadNow`. Any new localStorage
save of the project state must check the flag too.

# THE CONTENT HUB IS OPS ONLY (2026-10-26)

By request ("all CH endpoint related is for OPS only"). CAS has no Send, no Import hub fold, no
From the hub sidebar row or view: its `sendExport` / `epCfg` / `epSet` / `epFit` / `epPost` /
`deliver` override and the `ep*` render keys are DELETED, and a stored `splashView: 'hub'` lands
on All. `StudioBase.hubVals` / `hubCfg` stay shared code, read by OPS alone; CAS's normState still
keeps a `hubCardId` (harmless, unread). OPS's Save also sends a hub-linked project
(`autoSendAfterSave`; off with `localStorage['ops-save-sends'] = 'off'`), and each studio moves a
stored `localhost` endpoint to the office hub `http://192.168.50.30:8090/api/imports` once
(`provident-ep-office:<key>`). Sections above that describe CAS's Send or From the hub are history.

**Follow-up the same day, found on the live site: the read itself was failing.** In the user's
Chrome `providentRuntime.get` answered `undefined` in 3 ms for BOTH recents lists while a fresh
connection read the 210 MB value fine, so the runtime's cached connection was dead. And
`loadRecents` took a failed read for "no list" and fell back to an old 19-card copy in
`adstudio-recents` with no `saved` flags, which is the empty Recent the user saw (the fallback
writer had also been dropping `saved` and `pid`). Now: a failed IndexedDB request drops the
cached connection and retries once on a fresh one (`drop`, `getOnce`, `setOnce` in runtime.js;
`onclose` / `onversionchange` clear the cache); `providentRuntime.getStrict` REJECTS on a real
failure; `loadRecents` never falls back to the legacy copy after a failure (`_recFail`), and
`recordSaved` then does not write, so a tab's partial copy cannot replace the real list.

**THE ACTUAL ROOT CAUSE: `runtime.js` declared `var STORE` twice.** Section 3 sets it to
`'files'` (the IndexedDB object store); the photo-store pass of 23 Oct added
`var STORE = '.image-slots.state.json'` ~450 lines further down the SAME function. `var` is
function-scoped, so once that line ran every database read and write named the wrong store:
reads of the shared recents failed ("object store not found"), and every workspace database
created after 23 Oct got a `.image-slots.state.json` store and no `files` store — which is
why saves stopped reaching Recent and a refreshed tab lost its Source folder. The second
variable is `SIDECAR` now. `db()` opens at the database's current version, and a database with
no `files` store is upgraded once: `files` is created and the stray store's entries (its
folder handle, its photos) are copied in. An old tab holding the database open blocks the
upgrade; after 4s the read fails and the next one tries again. **Never add a second `var` of
an existing name in runtime.js** — it is one long function. Verified locally on a database
broken the same way: upgraded to v2, folder, photo and Recent all back; a new workspace keeps
its folder and its saves across a refresh. The retry and `getStrict` above stay as hardening.

# OPS POSTS LIVE ON GOOGLE DRIVE AND GO DRAFT › DESIGN › COPY CHECK › READY (2026-10-30)

By request: the social media manager (SMM) drafts a post in OPS and hands it to a designer (DD)
to refine and finish; the content team (CT) checks the copy; every OPS file lives on Google Drive;
OPS's home page gets a Status board and the hand-off like CAS's. **`post-flow.js`** (OPS only,
in `<head>` after `access.js`) holds it; it is CAS's ad set machinery with `kind: 'post'`.

- **Storage**: `<Organic posts>/<post name>/` — `<name>_Post.json` (the record: name, `ticket`
  {brief, deadline, files}, `items` [one project, with `draft`/`design`/`copy` steps], `hist`,
  `log`, `tok.dd`, `folder`), `<name>.smpstudio.json` (the project, `review` block as CAS's),
  `Assets/`, `Brief/`, `Exports/`. **Organic posts** is found or made inside the team folder that
  holds Offplan 2025/2026 (`POSTS_PARENT` 1FD5dl42YxKi6h8hlHvTwaMT__Nt545WO; per computer
  `provident-posts-root` overrides). The project syncs through the existing `dsApi` save/poll:
  every edit reaches Drive in ~2.5s with its changelog.
- **share-link.js gained only what posts need**: `window.providentDsKit` (the Drive helpers,
  read by post-flow.js), `draft-done`/`draft-open` in `DS_STEP`, `isPost`/`POST_TEXT` (a post's
  `rsstep` skips the link-role check — everyone opens a post by the project's own `D` link, role
  `dd` — runs steps in order, logs post wording), `kind`/`folder`/`tpl` in `dsPub`, post-aware
  `rvRender` (calls `postPanel`), `notifySteps`, `shRender` (the project link, not an ad set
  link), `shThumb`/`rvSum`/`rvThumb` deferring to `postSum`/`postThumb` off CAS, `shareInit`
  calling `postInit`, `shareVals` merging `postVals` and `postMount`. **Posts never enter CAS's
  Status list**: every `Arch.add` on an rs is guarded, and CAS's `AV.load` drops any that did.
- **Who presses what is the signed-in role** (`providentAccess.now().role`), client side: Draft
  smm|designer, Design designer, Copy check ct, admin anything, sign-in off = anyone. A
  designer's own new post opens at Design (draft marked done).
- **The OPS surfaces**: Home's **New post** sheet (`[data-post-plan]`, draft per computer in
  `provident-postplan`, files in memory); picking a template is wrapped (`proto.pickTpl`) to make
  the post on Drive first, then `postPickCheck` adds the new project after the reload (the CAS
  ticket/pick-up shape). **Status** (`[data-post-status]`, sidebar group "Posts", `splashView
  'rev'`): four columns with "Your turn" cards, **Waiting on me**, and a post page (progress,
  step buttons, Open in the studio, Copy link, Drive folder, brief + files, activity). The list is
  this computer's `provident-posts` plus everything `discover()` finds in Organic posts. The
  **top bar flow** (`pf*` keys, CAS's `.p-flow` markup and CSS) shows the step and the one
  action; a project not on Drive offers **Save to Drive** (SMM: **Send to designer**).
  `proto.deliver` is wrapped to upload every export to `Exports/`.
- **Testing trap:** a button carrying `data-post-status` was a mount host to `Status.mount` — the
  board drew inside the panel. Hosts are `div[data-post-…]`; the panel's button is `data-post-go`.
- **Testing trap:** `StudioBase` is a top-level class — a global binding, **not** `window.StudioBase`.
  post-flow.js returned early on `!window.StudioBase` and nothing ran.

## The login layer covers both studios, with two new roles

`ACC_ROLES` is `designer · pm · smm · ct · cten · ctar` (`api/share.py`). **The content team is two roles since 2026-10-30**: `cten` approves English copy, `ctar` the translation; `access.js`'s `role()` folds both to `'ct'` (so every `=== 'ct'` check still holds), `now().copy` is `'en'`/`'ar'`/null and `html[data-acc-copy]` carries it. A review-link tab is never gated but looks the account up quietly (`A.quiet`) when Google is signed in; share-link's `ctLangOk(it)` hides the other language's approve buttons and drops it from the queue. Legacy `ct` approves either. OPS posts do not track a language, so both approve posts. Preview as lists all five roles. `access.js` gates OPS too (`CAS`
flag; the gate's caption and figure follow the studio) and sets **`data-acc-lim`** when the role
is limited in THIS studio: in CAS pm, smm and ct (Home + Status, the old pm rules now keyed on
`data-acc-lim`); in OPS pm only (Status only — OPS's shell forces `view = 'rev'`). The request
form, the admin's role switch and Preview as list all four. CAS's shell view fallback reads
`acc.lim`. The admin panel stays in CAS and manages both.

Verified on the dev share server + Drive stand-in with four accounts and real clicks: SMM named a
post, picked a template (folder, record and project on Drive), Send to designer; the designer's
fresh workspace found it on Status by Drive discovery, opened it, an edit reached Drive with its
log entry, Send to copy check; the content team saw "Your turn", Approve copy → Ready; an export
landed in `Exports/`; Save to Drive for a local post; PM saw Status only; CAS's Status list
stayed free of posts. Contrast 0 failures over the board, post page, Home sheet, panel and flow
in both themes; no overflow at 375. **Not exercised against real Google Drive.**

# OPS HOME IS TWO DOORS: MY TURN AND START A POST (2026-10-30, /impeccable)

Designed through /impeccable (surface brief and direction contract in
`.impeccable/surfaces/provident-organic-studio-dc-html.md`; structure "Two doors", picked by the
user from three; code-led, no image generation here). OPS's `splashView` **`all` is My turn**
and **`new` is Start a post**; the sidebar's All became **Home** (first in a Posts group, with the
waiting count) and its title is the greeting (`homeTitle`/`homeSub` in OPS's shell).

- **My turn** (`HomeView`, `div[data-post-home]`, post-flow.js): Waiting on you (full rows: 72px
  render, name, step segments, "From X · when", due as words — Due today / tomorrow / weekday,
  Overdue in red — and the step's button), then With others ("With the designer · from X") and
  Ready to publish (4, then "All N on Status"). A row's step button calls `rsstep` directly; the
  row slides out (`data-sent`) and the next Drive read files it under its new group — the page's
  one authored moment.
- **A draft is waiting only on whoever started it** (`waitingOnMe`). A designer or another social
  media manager can still send it on from the post's page on Status or its panel; on Home it sits
  under With others.
- **The empty-queue door**: someone who can start a post (not ct/pm) with nothing waiting opens on
  Start a post once per visit (`autoDoor`); My turn then reads "You're clear".
- **Start a post** (`PlanView`, `.pp2`): three numbered steps — Name it (+ Due), Brief (+ files),
  Pick a template — and the React template gallery under it is step three (indented to the step
  column; its "Pre loaded templates" label is hidden). The header's New post button is hidden on
  Home (the switch replaces it); `newProject` from the shell opens the `new` door.
- **`Feed`** is the one reader of the posts for Home and Status (cache `provident-posts-list`,
  45s poll while visible); `Status.count()` reads it.
- **Bug found in testing, now fixed: the Drive kit referenced `PICO` before its `const`
  declaration** — a TDZ error that killed share-link.js at load, and with it every studio feature
  that file carries. The kit exposes it through a getter. Any new kit field must exist ABOVE
  `window.providentDsKit`, or be a getter.
- Tested in headless Chrome (`tools/studio-mcp/chrome.py`; the Browser pane was blocked by a
  sign-in popup) with three roles and six seeded posts: contrast 0 failures on both doors in both
  themes, a step from Home, the empty-queue door, 390 wide. Captures in `.impeccable/review/`.
- **The finish review (two rounds, verdict "fix" then resolved) changed:** the switch stays under
  the greeting (contract amended with the reason); the Drive line (Updated · Refresh · Open Status)
  sits at the switch row's right, or in the first section heading when the content team has no
  switch; Open in a row is unfilled; the count lives in the subtitle, the sidebar badge and each
  section heading (not the switch); the current step segment takes its step's colour as on Status
  (Copy check amber); recents at Home's foot are a strip at queue scale (72px render, 140px label,
  name only); the Carousel chip sits top-right on Start a post's template tiles; phone from-lines wrap.
- Headless capture recipe (`.impeccable/review/`): drive `tools/studio-mcp/chrome.py`, set the dev
  Drive keys in localStorage, seed posts through `pickTpl` with a `provident-postplan` draft, and
  measure full-page height off every element's scrollHeight (the splash scrolls inside `.p-br-mn`).

# OPS HOME TAKES CAS'S DESIGN (2026-10-30, /impeccable)

By request ("the OPS home page is poorly designed, grab the design elements from CAS"). The two
doors (My turn | Start a post) stay; everything around them is CAS's now. Chrome only.
- **Sidebar = CAS's section 62**, mirrored as OPS section 49: the Design Studio lockup copied from
  CAS's markup, the studio switcher, ONE nav list (Home with a resting-navy count `.p-nav2-bd`,
  Status, a rule, Templates, Recent, From the hub as the quiet row), and the foot pinned: Continue
  last as a `.p-sbc` card, **Open a post file…** as a `.p-sbo` row. The Posts / Library / Session
  headings are gone. Status keeps `.p-nav2-rev`, which the PM-only rule in post-flow.js keys on.
- **Header** is CAS's: title **Home**, the line under it "Kelvin, 2 posts are waiting on you", and
  the theme toggle only. **Open session moved to the sidebar foot; New post is gone** (Start a post
  is the door). The header takes the content's 1240 column (`.p-br-mn > .p-br-h`).
- **Start a post is CAS's brief sheet** (`PlanView`, `.pp3` in post-flow.js): the name as a 46px
  input on an underline, a chip row (Due; "Saved to Google Drive · Organic posts" when Drive is on),
  the brief as one card with Attach files and file chips in its foot, then "Pick a template" over the
  React gallery. The `.pp2` numbered-steps CSS matches nothing now.
- The switch takes CAS's `.p-tabs` proportions; rows take the audience card's `--ps-card-h` fill;
  the recents heading on Home reads **Pick up where you left off** (`shRecLabel`).
Verified on the dev server: contrast 0 failures over both doors in light and dark, no sideways
scroll at 375. CAS-OPS-GUIDE.md, DESIGN.md and the surface brief are updated.
- **Recents are grouped as CAS's are** (OPS section 50 mirrors CAS section 65; `recentGroups` in
  OPS renderVals, the `rc` markup verbatim). An OPS project is one post, so the group is its
  TEMPLATE ("Reel thumbnail · 3 projects"); a card is the post's name, its brand mark if not
  Provident, when it was saved and its slide count, with stacked plates for a carousel. Single
  ones share "Other projects", each naming its template. Same markup on Home and on Recent (where
  the "Pick up where you left off" label hides). `recentsView` is still computed and unread.

# OPS: SMM'S MARK AS DONE, CAROUSEL-ONLY SEND, TEMPLATE-LED FILE NAMES, FOLDER OWNER (2026-10-30)

By request.
- **Mark as done** (post-flow.js `acts().fin`, smm only, any step before Ready): the existing
  `approved` step, which on a post marks draft, design and copy at once (`rsstep`'s in-order rule).
  A quiet `.p-flow-fin` button in the top bar (`pfFin*` keys), and in the panel and the Status page.
  One confirm (`POST_DONE_Q` / `stepBody`); no hand-off picker (`teamFor('approved')` is null).
  `POST_TEXT.approved` reads "Marked it done — ready to publish".
- **The import hub's Send and its fold render only on the carousel template** (`epOn`), and Save's
  auto-send (`autoSendAfterSave`) skips every other template.
- **File names lead with the template** (`OrganicStudio.FILETPL`, `tplFileLabel()`, `baseName()`):
  `Carousel_<head>`, `Weekly Listing_<MONTH>_<Week>`, `Google Reviews_<agent>`, `Top Agents_<date>_<team>`,
  `Top Agent_<date>_<name>`, `Award_<rank>_<title>`, `Reel Thumbnail_<head>`, `Just Listed|Sold_<agent>`.
  A custom name is prefixed unless it already starts with the label. Recents and the session file
  carry the same name.
- **The tab's Source folder has an OWNER** (`runtime.js` `project-dir-pid`, `folder.owner`). A folder
  set by pick / adopt belongs to the bound pid ('*' when none, and Open Session's `handOver()`). `bind`
  keeps it only for its owner; for any other pid it is dropped and that project's own `dir:<pid>`
  (or nothing) is used. Before this, opening a post from Status / the hub / a file kept the tab's
  folder and then remembered it as the opened post's own. A folder set before owners existed is
  dropped once and comes back from `dir:<pid>`. Shared with CAS.
- Verified on the Drive stand-in as smm: a new post and another post's pid open with no folder, the
  original post gets its folder back across reloads, Mark as done Draft → Ready, Send hidden on weekly.

# OPS: "JUST ME" POSTS, AND EXPORTS TO THE TEAM'S DRIVE FOLDER BY TEMPLATE (2026-10-30)

By request. post-flow.js.
- **Start a post asks Just me | Hand it on** (`.pp3-flow`, `Plan.draft().flow`, remembered per
  computer in `provident-postflow`, default Hand it on). Just me calls the original `pickTpl(t,
  {solo: true})`: no post record, nothing on Status; `state.solo` makes the top bar read "Just you"
  with the export destination, and clicking it hands the post on after all (`postToDrive`).
- **Every OPS export uploads to `FILES_ROOT` (1TaY-j8lW84J-JdrdZAyZwnJOuU9ozOyw)**, solo or not,
  replacing the old post/Exports upload. `fileDest(st)`: Weekly Listings/<Month Year> (year from
  `state.made`, a December post made in January goes to the year before), Top Agents/<Team> (the
  cover's team, or the solo card's), Reel Thumbnail, and Just Listed & Sold / Google Reviews / Awards /
  Carousel (created on first use). Per computer `provident-ops-files-root` overrides. Assets/ never
  goes up. `provident-ops-out:<pid>` maps file names to the Drive ids this project wrote: a re-export
  PATCHes those, a same name from another project gets " (2)". Needs a Google token (`ensure()`, never a
  popup); without one the status says so.
- **Names**: weekly is `Weekly Listing_<Week>` (the month is the folder); the reel is
  `Reel_Thumbnail_<YYYY-MM-DD>` from `state.made`, set by `pickTpl` (an older project falls back to today).
- Verified on the Drive stand-in: Just me opened with no post, exports landed in Weekly Listings/October
  2026, Reel Thumbnail and Top Agents/Primary, a re-export replaced, another pid got " (2)", Assets skipped.

# OPS SENDS A DESIGN KEY, NOT THE IMPORT TOKEN (2026-10-30)

By request: the Content Hub checks a key the team hands out, not its import token. OPS's
**Share › Import hub** field is **Design key** (still `epCfg().key`, per computer in
`provident-ops-endpoint`, never the repo); `epPost` sends it as **`X-Design-Key`** and also as
`Authorization: Bearer` for a hub that only knows the token. The local hub
(`~/Documents/provident-content-hub`) accepts `HUB_DESIGN_KEY` from its `.env` on
**`POST /api/imports` only** (`design_key_ok`, constant-time compare; the preflight lists the
header); every other route still needs `HUB_IMPORT_TOKEN`. **Never write the key's value into
this repo.** Verified on a throwaway hub: no key and a wrong key 401, the design key 201, the key
alone refused on DELETE. **The ngrok link still fails until its host runs this hub version with
`HUB_DESIGN_KEY` set and exempts `/api/imports` from the tunnel's Google sign-in** — the sign-in
redirects the browser's preflight to ngrok's login, so the request never reaches the hub.

**The default hub is the ngrok tunnel now** (`EP_DEFAULT` =
`https://provident-content-hub.ngrok-free.dev/api/imports`, by request). A stored office
(`192.168.50.30`) or localhost URL moves to it once per computer (`provident-ep-ngrok:<key>`); a
URL typed by hand otherwise stays. Every request to an ngrok host carries
`ngrok-skip-browser-warning` (`StudioBase.hubTunnel`, read by `hubFetch` and `epPost`) so ngrok's
free-domain warning page is skipped; the hub lists that header in its CORS allowed headers.

# THE CONTENT HUB PUSHES ITS DESIGN TASKS TO STATUS (2026-11-03)

By request: "just push the task to status when CH sends it" — **without changing OPS's endpoint or
Send**. (A first cut read the hub's queue from the home with OPS's Import hub key; replaced the
same day, and its `hubFetch` change undone: studio-base.js, the studios, share-link.js and
post-flow.js are byte for byte what they were.)

- **The hub pushes.** `provident-content-hub/backend/server/studio_push.py`: after every card
  write (`write_card`) and delete, a background POST of that social post's task to the share
  service, `api/share.py?op=hubpush` {key, tasks}. Only when the task changed; a card that leaves
  design (or is deleted) is sent as `{id, gone: true}`. Hub `.env`: `STUDIO_PUSH_KEY` (unset =
  nothing sent), `STUDIO_SHARE_URL` (default the Vercel site's /api/share), `HUB_PUBLIC_URL` (the
  hub as designers' browsers reach it, default the office address) — the task's open link is
  `<HUB_PUBLIC_URL>/api/items/<id>/studio`.
- **The share service keeps them.** `hub:tasks` (one JSON), `hub_push` checks `HUB_PUSH_KEY`
  (Vercel env; `dev-hub-push` on the dev server), cleans each field, refuses an open link that is
  not a hub `/api/items/<id>/studio`, drops approved ones after 14 days. `hubtasks` (anyone let
  in) lists them; `hubteam` (the key) gives the active designers for the hub's picker.
- **Status reads them.** index.html `hubLoad()` → `providentAccess.call('hubtasks')` (new: the
  share call as the signed-in person), kept in `provident-inbox-hub`; `hubRows()` maps queued →
  New, in_progress / changes → Design, review → Copy check, approved → Ready, tagged **Content
  Hub**. A task with `to` waits on that designer only ("For <name>" for everyone else); without one
  it waits on every designer; review waits on the social media manager. A card opens
  `OPS#hubopen=<open link>` — the hub's own Open-in-OPS link — so OPS's Send attaches as always.
- **The hub picks the designer.** content-hub.html: a **Designer** select at Approve and send to
  design and in the post's Design section beside Open in OPS (queued / in design / changes),
  filled from `GET /api/design/designers` (server.py → studio_push.designers → hubteam, cached
  5 min). The choice is `card.design.to` {email, name}.

Verified on this Mac (studio test server + the hub's serve_local.py on :8091 with DATA_DIR in a
scratch folder, STUDIO_* given in the environment — serve_local.py now passes those three through):
picked a designer and approved → the hub pushed → Status showed it under New, "Waits on you" for
that designer and "For <name>" for the other; Open → OPS opened the hub's draft with hubCardId;
changing the Designer in the hub moved it. **Not done, needs people:** set `HUB_PUSH_KEY` in
Vercel and the same value as `STUDIO_PUSH_KEY` in the office hub's `.env`, and copy the three hub
files (studio_push.py, server.py, content-hub.html) to the office hub — I never touch it.

## A full localStorage froze Home and Status (2026-11-04)

Symptom: a post sent to Copy check never showed on Status, while Drive's `_Post.json` was right
and `providentPostFeed` had read it. `provident-inbox-ops` was a day old: the browser's 5 MB
localStorage was full and `StudioBase.inboxSave` swallowed the QuotaExceededError. The space
went to OPS's agent auto-crop marks (`smp-agent…-auto`), which stored the whole photo data URL
(3 MB for one) just to remember "cropped this one". Now the mark is `StudioBase.mark(u)`
(length + sampled FNV hash); `StudioBase.lsRoom()` turns old marks into short ones on every
page load of studio-base.js and before inboxSave retries; inboxSave retries, then drops thumbs.
Never keep a picture in localStorage; IndexedDB (`runtime.js`) is the photo store.

## The content team saw no posts (2026-11-04)

Status lists posts with Drive searches (`'<folder>' in parents`), and Drive search leaves out
files a person reaches only through the company-wide (domain) share. 'Organic posts' was shared
by name with the designers and media accounts but not the content team, so CT's Status found no
posts (CAS worked: the campaigns folder names exec1/exec2.content). Fix: `postsRoot` falls back
to its id (`POSTS_ROOT`) when the name look-up in POSTS_PARENT finds nothing. **The share itself
was still missing on 2026-11-04** (the folder's permissions list no exec1/exec2.content, so a
hand-off to the copy check never reached their Status even though `_Post.json` named them in
`it.to`). Only the owner, exec5.graphics, can add them — an editor's share is refused. They need
editor (they write the copy check). Anyone new on SMM or CT must
be added on 'Organic posts' by name, like the campaigns folder.

## Posts live in the team's files folder, by template (2026-11-04)

By request ("save it here instead … depending on the template it goes under the existing folders,
then it will subfolder according to name, save also the .json review"). A new post's folder is
made at `<FILES_ROOT>/<fileDest(st)>/<post name>/` instead of `Organic posts/<post name>/`
(`makePost` → `destDir`; `postToDrive` passes the open state, so month and team are right; a
post started on Home has no slides yet, so Top Agents waits in `Top Agents/` with no team level).
The folder holds `_Post.json` (the review/step record), the `.smpstudio.json` project, `Assets/`,
`Brief/` and now **the exports too**: `exportsUp` writes into the post's own folder after
`placePost` moves it to `fileDest(st)` when the path changed (month, team, or a post still in
'Organic posts') — a Drive move (PATCH addParents/removeParents), so every file id and link stays.
A Just me post's exports go to `<fileDest>/<post name>/`.
Status (`discover` → `postDirs`) walks FILES_ROOT three folder levels down (template › month/team ›
post) plus 'Organic posts' one level, skipping Assets/ and Brief/, then finds `_Post.json` in them.
Verified on the Drive stand-in: Save to Drive made `Weekly Listings/November 2026/<name>/` with both
.json files; after setting the month to October an export moved it to `October 2026/` with the
export inside; a fresh Status (post list cleared) found it and the old posts.
**Sharing:** FILES_ROOT lists exec3.content but not exec1.content or exec2.content (2026-11-04), so
until the owner (exec5.graphics) adds them as editors their Status cannot find posts here either.

## The content team: only their hand-offs, and a words-only copy check (2026-11-04)

By request ("for CT, on Status only show what they need to see, task handover to them; on OPS when
it's handed over to them, go straight to the copy check window so CT can edit/review text").
- **Home and Status** (index.html `build()`): role `ct` keeps only rows with `mine`; the "Only what
  waits on me" switch is hidden for them. A post's page reads **Check the copy** for CT at step 2.
- **The copy check is the guided run, words only** — a projection, not a new screen (the run's own
  rule). `SP.postCopyMode()` (post-flow.js) is true for a post at Copy check opened by CT;
  `gdPlan` then keeps only `words` asks and the agent's text (`field`/`proj`), drops Finish, and the
  last page's Next reads **Approve copy** and calls `rvStep('copy-done')`. `postCopyLand` (from
  `postVals`) puts the tab on `screen: 'guide'`, first page, once per post. `postAfterStep` sends
  CT back to Status once the post leaves Copy check.
- **CT on a post link has no `role()`**: the link skips the sign-in gate (`gated()` false), so
  `access.js` only learns the role quietly — `now().copy` ('en' | 'ar') is what post-flow's `isCt()`
  reads. That is also why the top bar showed Approve copy (`may()` is true with no role) while
  the copy mode stayed off at first.
- Verified on the Drive stand-in as exec1.content: Status listed only their four hand-offs; Check
  the copy opened OPS on "Property 01 · Copy check · Page 1 of 1" with Words only; typing a
  community updated the preview; Approve copy moved it to Ready and returned to Status, where it
  was gone. OPS diff: no artwork-path lines.
- **Test data trap**: the seeded posts' projects hold only `{pid}`, so opening one from Status
  loads OPS's blank default and the studio sends you to Projects. Test with a post saved from OPS.
