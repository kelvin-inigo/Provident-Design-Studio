# CAS animated ads — branch `cas-animated` (2026-11-16)

Not on main. Local branch and worktree (`.claude/worktrees/cas-animated`), cut from main at
53a566b. Do not merge until the user has tested it; do not push.

## What it is

The second of a new campaign's three minimum deliverables (Static, Animated, CASV MVP video): the
static design with a video where the background photo is, exported as 1:1 (1080x1080) and 9:16
(1080x1920) video. The user's choice: the clip is generated outside CAS (Higgsfield, image to
video from the same background photo) and dropped into CAS. A Generate button inside CAS is a
later add-on; it would end in the same clip slot.

## How it works (all in `Provident Campaign Studio.dc.html`)

- **Export panel** (Share, top right): an **Animated** section under Format. **Add a video clip**
  / **Replace clip**, **Remove clip**, **Export animated**. One clip per variant (the active one).
  Keys `an*` in the panel's values; markup `.sx-an`.
- **The clip is not in the photo store.** It lives in its own IndexedDB database
  `provident-cas-clips` (store `clips`, key `pid|variant`, value `{name, blob, dur}`), read back
  on the first `anClip()` of a project. So it is on this computer only: not in the .adstudio.json,
  not in a share link, not on Drive, not in a copy made by Create next audience / Make the Arabic.
- **No artwork code changed.** `anRecord` copies the clip's current picture to a canvas that stands
  in for the photo (`naturalWidth` / `naturalHeight` set on it: that is all `buildOps` and the
  image op read), puts it in the size's own photo slot keeping that slot's zoom and position
  (`bgSep` respected), builds the ops ONCE, and draws them through the unchanged
  `renderOpsToCanvas` for every frame. So framing matches the static when the clip has the photo's
  aspect ratio, and glass blurs the moving picture.
- **Recording** is MediaRecorder on the dialog's canvas: `captureStream(0)` + `requestFrame()`
  after each paint, 12 Mbps, the first supported of H.264 MP4 then WebM (`anMime`). It runs in real
  time, once through the clip, per size. No sound.
- **The frame loop is a 33 ms timer**, not rAF or requestVideoFrameCallback: in the Browser pane
  both fire about twice a second (measured: 2 rAF/s against 31 timers/s) and the first cut wrote 4
  frames in 3 s.
- Files go through the normal `deliver`: `<campaign>_<variant>_feed_animated.mp4` and
  `..._Story_animated.mp4`, beside the stills.
- `window.__casAn` is set on localhost only, so a test can drive the export without the file picker.

## Verified (share-dev from this worktree, port 8795, started from a shell)

A real project picked up from Status (Palm Springs, Local · Family · Design 2). A 4 s test clip
made in the page (a red bar crossing blue, 720x1280) set as the variant's clip, then
`anExport()`: two H.264 MP4s, 1080x1080 and 1080x1920, 4.1 s, 116 frames (about 28 a second);
read back, the bar is at the left early and at the right late in both, under the wordmark,
eyebrow, headline and QR. The dialog showed the frame being recorded; the panel shows the clip's
name with Replace / Remove / Export animated. The diff is additions only (template, CSS, panel
values, new methods before `doExport`), nothing inside `buildOps` or either renderer.

## Not done / not run

- The file picker itself (Add a video clip) and the clip coming back after a reload: the test set
  the clip in memory. A real Higgsfield MP4, a long clip, a design with a photo, glass, a cut-out
  or a QR over it.
- Saving through `deliver` to a Source folder or a zip (the test captured the files instead).
- Real Chrome outside the pane, Safari, a hidden tab (timers drop to one a second there; the dialog
  says to keep the tab in front).
- No live video preview on the canvas in the editor; you see it only while it records.
- The clip does not travel with the project (see above). Sharing it would need Drive.
- The Deliverables card on main does not tick Animated when this exports; they are on different
  branches.
- Carousel pages, the 4:5 and banner sizes are left out on purpose (1:1 and 9:16 only).

## MOVED TO THE BACKGROUND PANEL; THE CLIP PLAYS ON THE CANVAS (2026-11-16, later)

By request: "can it be on CAS but just an option to upload a video on the background". The branch
was merged with main first (260a927).

- **Background image › Background: Photo | Video** (`anSetPhoto` / `anSetVideo`, flag `bgVid: '1'`
  on the variant, saved with the project; buildOps never reads it). Video shows the clip's name,
  **Upload video / Replace video** and **Remove**. Uploading a clip sets Video. The Photo group
  stays below it: the stills and the other sizes use it, and its crop frames the video.
- **Share › Animated** now only exports, and only shows when a variant has Video AND its clip here
  (`anVis`). Add / Remove left the Share panel.
- **The canvas plays it** (`anPreview`, every 250 ms from the first `anClip`): a muted looping
  `<video class="an-pv">` appended inside the 1:1's and 9:16's photo slot SHADOW `.frame` (React
  never reaches it), sized from the clip's own width/height with the slot's live `_view` — the
  same cover × zoom and 50% + x / y as image-slot's `_applyView` and as `anRecord`'s stand-in
  photo, so a reframe moves the video exactly as it will be recorded. The videos are tracked in
  `_anPvs` (a document-level querySelectorAll cannot see into shadow roots — the first cut left
  them playing after Photo was chosen).
- **Proof the artwork did not move:** `git diff main` on the .dc.html is additions only (styles,
  the Share and Background markup, the methods before `doExport`, two render-value spreads) — no
  hunk in buildOps, renderOpsToCanvas or renderOpsToSvg.
- **Verified** (share-dev :8795 from this worktree, a test clip made in the page): Video tab →
  the panel prompt; a 720×1280 clip → playing on the 1:1 (cover: 100% × 177.8%) and 9:16, not the
  3:4; a view of s 2, x 10, y −5 → 200% × 355.6% at 60% / 45%; Export animated → two H.264 MP4s
  (90 frames in 3 s); the clip saved, the page reloaded → Video still chosen, the clip back and
  playing; Photo → no video on the canvas, Video → back; Remove → gone from the canvas and from the
  clip store.
- Not run: a real Higgsfield MP4 through the file picker, a design with a real photo / glass / a
  cut-out over the moving clip, Safari, phones, dark theme; carousel pages.

## GENERATE WITH HIGGSFIELD IN CAS; EDIT IN CASV (2026-11-17)

By request (annotated screenshot): "add the higgsfield generation control on this, the simple
controls, then maybe have a button that calls CASV to edit a more detailed video".

- **Background › Video › Generate from this photo:** Camera move (8 of CASV's moves), Length 5 / 10 s,
  Model Kling / Cinema / Seedance (CASV's GEN_MODELS ids and credit rates), Quality Draft / Full.
  Settings are per session (`_anG`), not saved. Methods `anG*`, `anGen`, `anGenRun`, `anPoll`,
  `anToCasv`, `anGenVals` (spread into the Background render values).
- **CAS never talks to Higgsfield.** It posts the job to CASV's local server (`anCasv()`:
  `provident-casv-local` or http://localhost:8794) — the same `/api/animate/job → cost → run` and
  the same prompt text (`AN_PROMPT` = CASV's MOVE_BASE) as CASV's own photo clips; the server runs
  Higgsfield's CLI with this computer's sign-in. Price first, a second Generate spends. Jobs are kept
  in localStorage `provident-cas-hfjobs` (pid|variant) so a reload resumes the poll (4 s,
  `/api/animate/jobs`); done → `GET /api/animate/file?id` → `anSetClip` (same store and `bgVid` as an
  upload) → `/api/animate/placed`.
- **Start frame:** the variant's photo (`loadAssets` bg slot) centre-cropped to 9:16, 1080×1920.
- **Edit in CASV:** opens the window on the click (a window opened after the upload is a blocked
  pop-up — the first cut was), posts the frame to `/api/inbox/photo` (`_inbox/<id>.jpg`), then
  points the window at `…/Provident Video Studio.html#new=<campaign>&photo=<id>`; CASV's startNew
  then puts the photo on the new timeline.
- **CASV server (local `video-studio` branch, never pushed):** CORS now also for `/api/animate/*` and
  `/api/inbox/photo`; new `GET /api/animate/file`, `POST|GET /api/inbox/photo`. A running CASV server
  must be restarted to pick this up.
- **Verified** (Chrome, share-dev :8795 serving this file, CASV server :8796): the controls render;
  Orbit 10 s Kling Draft → Higgsfield's real price, 17.5 credits (nothing spent), kept over a
  reload; Cancel → the job left the queue; a stand-in done job (an existing MP4) → became the clip,
  playing 1080×1920 on the 1:1 and 9:16, job `placed`; Edit in CASV (real click) → CASV opened a
  new video with the photo on its timeline. Not run: a real paid generation, the live site → localhost.
