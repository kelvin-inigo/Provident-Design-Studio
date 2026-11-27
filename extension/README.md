# PDS Chrome extension

One extension for the team's Chrome: it brings photos, text and listings into PDS, catches
Claude Motion exports for CASV, shows what is waiting on you, and puts approved ads into Meta
Ads Manager's upload box.

## Install (each person, once)

1. In Chrome open `chrome://extensions` and switch on **Developer mode** (top right).
2. **Load unpacked** and choose this `extension` folder.
3. On the PDS card press **Details** and switch on **Allow access to file URLs**. The
   extension needs it to read your downloads, for Ads Manager and for Claude Motion files.
4. Pin it: puzzle-piece icon › pin **PDS**. Clicking the icon opens the side panel.

Later, publish it privately on the Chrome Web Store for the Workspace, and the admin can
force-install it for everyone.

## What it does

| | where | how |
|---|---|---|
| **Send to PDS** | any page | Right-click an image › **Send this image to PDS**, or selected text › **Add to the CAS brief**. Items wait in the **Tray** (side panel). From there a photo goes to the CAS brief's photos, onto the open CAS design, onto the open OPS page, or into CASV's library. |
| **Capture an area** | any page | Right-click › **Capture an area for a CAS component**, or ⌥⇧S. Drag a box; the crop is copied for `/cas-component` in Claude and kept in the Tray. |
| **Listing importer** | Property Finder, Bayut | **Make an OPS post** (button bottom right, right-click, or the panel's **Read this listing**). The facts, the photos and a QR of the listing's link go to the Tray. **Make the OPS post** opens a new OPS tab with a filled **Just listed** card, on the photo you pick. |
| **Claude Motion › CASV** | claude.ai | When a Claude Motion export finishes downloading and CASV is open, it goes straight in as a mograph with its film link. If CASV is waiting (Bring from Claude Motion, or Update), it counts as that export. |
| **Waiting on you** | toolbar | The badge counts what the PDS home lists as waiting on you; a notification for each new one. It refreshes whenever a PDS tab or the PDS app is open (and every 10 minutes while one is). |
| **Ads Manager** | side panel | Lists the ad sets and the downloads from PDS. Pick downloads (a package zip is opened) and **Put in Ads Manager's upload**, with the ad's media upload open. Nothing is published. |

## For the engineers

- `background.js`: the tray (IndexedDB `pds-tray`), the menus, delivery, the badge, the
  downloads watcher, the Ads hand-over. `globalThis.__pds` is a handle for tests only.
- `content/pds-main.js` runs inside PDS pages (MAIN world) and reaches each studio's own engine
  the way `tools/studio-mcp/page.js` does: `image-slot` `_ingest` / `putUrl` after
  `providentEncodeFile`, `brSet` for the brief, `applyProject` for a new OPS post. It never
  paints artwork.
- `content/casv-main.js` calls CASV's `VideoStudio.cmDeliver(file, link)` (branch `video-studio`).
- `index.html` publishes `window.providentHome` (`pubHome`) after each build of Home.
- `lib/qr.js` makes the listing QR (byte mode, level M); checked with Chrome's BarcodeDetector.
- `kit/` is a copy of `ui-design-system/provident-ui.css` and its font: run `sync-kit.sh`
  after any kit change.
- The page features match `https://design-studio.ngrok-free.dev/*`, `localhost:8790` (share-dev)
  and CASV on `localhost:8794` (manifest `content_scripts`).
