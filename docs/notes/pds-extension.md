# The PDS Chrome extension (branch `pds-extension`, 2026-11-27)

By request ("what possible extensions can we built here" › six proposals › "build all"). One MV3
extension in `extension/`; how to install and what each part does is in `extension/README.md`.
Not on `main` yet: when it lands, the architecture PDF, `engine-map.json` (the extension as a part,
its connections to PDS, CASV, Property Finder, Bayut, claude.ai downloads and Ads Manager) and
`CAS-OPS-GUIDE.md` / `GROK-BOT-INSTRUCTIONS.md` get it in the same pass.

## Decisions, and why

- **There is no photo library in CAS or OPS.** Every photo lives in a slot of a design
  (`image-slot` store). So a captured photo is delivered to a place: the CAS brief's photos
  (`adbrief-ph-0..5`, first free), the open CAS design (`adstudio-bg-<activeVi>`), the open OPS
  page (`smp-bg-<slides[activeSi].id>`), or CASV's library (`VideoStudio.addFiles`, `media`).
  Design and page replace the photo there, so the panel asks first (a photo store write: Undo does
  not bring it back).
- **The studios have no message API.** The extension reaches the engine the way studio-mcp does
  (React fiber of `.p-shell` › `logic.active()`), from a MAIN-world content script
  (`content/pds-main.js`), called by the background with `chrome.scripting.executeScript`.
  Photos go through the slot's own `_ingest` when it is on screen (exactly a drop) or
  `providentEncodeFile` + `putUrl`.
- **The brief** is written with `eng.brSet('brief', …)`, never `localStorage` directly: runtime.js
  renames keys per workspace (`ws:<id>:adstudio-brief`). Checked: it landed in the tab's own key.
- **A listing becomes a new "Just listed" post in a new OPS tab**: a new tab is a new workspace,
  so an open post is never replaced. Built as picking the template builds it, then
  `applyProject` (which reloads). Fields: status Just listed, usp chips (beds, area, Off-plan /
  Ready to move, Furnished; at most three), ptype from the portal's type, deal Sale/Rent,
  building "Building, Community" in Title Case, price digits, listno = the portal's listing id
  (digits). The Just listed card's QR is the post-level slot **`smp-qr`**; `smp-qr-<id>` is only
  the weekly template's per-property slot (a first pass put it there and the card showed an
  empty white square).
- **QR codes**: nothing in PDS makes one (OPS only reads them), so `lib/qr.js` draws it.
- **Portal photos carry the listing agency's watermark** (the Bayut test listing had "Hills
  Field Real Estate" on every photo). The tray shows every photo of a listing and the person picks
  the one for the card. For Provident's own listings the photos are Provident's.
- **Bayut's own photos** are the `Cover Photo` / `Property image` / `Gallery dialog photo grid`
  boxes; the page also carries "Listing card" thumbnails of other properties, which are skipped.
  Property Finder's are in `__NEXT_DATA__` (`propertyResult.property`).
- **Waiting on you** is worked out inside the home from Drive; no server returns it. So
  `index.html` publishes `window.providentHome` (`pubHome`, after each `build()`), the content
  script carries it to the background, and the badge keeps the last count (greyed after six hours
  with no PDS tab open). Notifications are for rows that were not there before.
- **Ads Manager**: approved ad images exist only as PDS renders (no Drive files), so the panel
  works from what was downloaded from PDS (`chrome.downloads`, url or referrer on the PDS origin),
  reads the files with file-URL access, opens a package zip (`lib/zip.js`, stored or deflated),
  and sets them on the open upload box's `<input type=file>` with a change event. Nothing is
  published.
- **Claude Motion**: `chrome.downloads.onChanged` sees the export finish (referrer or URL on
  claude.ai / claudeusercontent.com, mov/mp4/m4v/webm). With file access the extension reads the
  bytes itself; otherwise CASV's helper reads the file by name (no polling). The film link is the
  download's referrer when it is a `claude.ai/artifact/` page. CASV: `VideoStudio.cmDeliver`.
- **Dropped: CASV's Save to Drive without the popup.** casv-save.html is where the person picks the
  ad set and signs in to Google, so a background tab would have to come to the front anyway; the
  popup stays.

## Tested (2026-11-27)

Chrome 158 ignores `--load-extension`; the tests loaded the extension with CDP
`Extensions.loadUnpacked` in a headless Chrome started with `--enable-unsafe-extension-debugging`,
against this branch served by `tools/share-dev/serve.py 8795` with `ACCESS_ADMIN=` (gate off) and a
CASV copy on 8799 (its own `_work/8799`). Both portals block headless browsers, so the listing
readers were run on the live pages in the user's Chrome and their output fed to the background.

- Readers: Property Finder (8 Boulevard Walk) and Bayut (Shione by Beyond) — price, beds, baths,
  area, type, completion, building, community, agency, photos (24 from Bayut's gallery).
- Tray: photos fetched (jpeg / webp), QR drawn, thumbnails; QR decoded by BarcodeDetector at
  versions 1, 4, 7, 13.
- OPS: new tab, Just listed card filled; rendered with OPS's own `buildOps` / `renderOpsToCanvas`;
  the QR decoded from the rendered post; photo 2 chosen.
- CAS: text into the brief (workspace key), photo into `adbrief-ph-0`, photo onto design 1.
- CASV: a 21 MB mp4 handed over as a Claude Motion export arrived as a mograph with `cm` set.
- Badge: a seeded home queue gave "1" and "PDS · 1 waiting on you", href `#/item/cas/R1`.
- Capture: real mouse drag, 400×200 crop.
- Ads: a PDS zip (StudioBase.zip) downloaded from the PDS origin is listed, read and unzipped;
  two PNGs set on an upload input, change event received.
- Panel: dark and light.

**Not tested:** the real Meta Ads Manager upload box (needs a signed-in ad account; nothing must be
published), a real Claude Motion download on claude.ai, notifications on screen, the right-click
menu by hand, the side panel opened from the toolbar, and the extension against the office server
while signed in.
