# Video Studio — prototype (branch `video-studio`, local only, never pushed)

Started 2026-11-12 by request: a simple video editor beside CAS and OPS. Lives in a worktree
(`.claude/worktrees/video-studio`); nothing in CAS, OPS or the shared scripts was changed.

| file | what it is |
|---|---|
| `Provident Video Studio.html` | the page; links `ui-design-system/provident-ui.css` directly for the chrome |
| `video-studio.js` | the whole editor (plain JS, no DC) |
| `video-dev-logos.js` | a COPY of `CampaignStudio.DEV_LOGOS` — regenerate from CAS when that list changes |
| `video-icons.js` | Material Symbols Rounded wght300 paths for the chrome |
| `tools/video-dev/serve.py` | static server, port 8794 (`python3 tools/video-dev/serve.py`) |

- **Sizes: Reel 9:16 (1080×1920, margins 100/260/100/460) and Square 1:1 (1080×1080, margins 80)** — only these two, by request.
- **Tracks:** Text, Logos, Video, Music, Sound. The Video track is magnetic (clips sit end to end;
  trim an edge, drag to reorder, S cuts at the playhead). The others are free, snap to edges and the
  playhead, and stack into lanes when they overlap.
- **Text** follows the Reel thumbnail (`RCV`): headline Regular 400 on Small–Jumbo (140/1.2 … 168×1.2),
  −0.046em, one lead; it steps DOWN the scale to stay under 42% of the canvas. Eyebrow tracked caps 500,
  sub line Light 300. Wash under the copy only. Effects: None, Fade, Rise, Line by line, Word by word.
- **Collaboration logo** = CAS's co-brand lockup: `StudioBase.CO` ratios, laid out from the mark's ink
  box, Match canvas / Original. Logos added here are kept per computer in `provident-video-dev-logos`
  (localStorage on this origin — NOT CAS's `adstudio-dev-logos`, which a different origin cannot read).
- **Canvas reads `ART` literals only**, never a `--ps-*` token.
- **Playback:** one master clock; every `<video>`/`<audio>` element is slaved to it and runs through a
  WebAudio gain (volume, fades, and the export mix share that path). The clock holds while the active
  clip is seeking; the next clip is pre-rolled 1.2s ahead.
- **Export records in real time** (`canvas.captureStream(30)` + the mix into `MediaRecorder`), MP4
  (H.264/AAC) where the browser supports it, else WebM. The tab must stay in front. A frame-exact
  offline export would need WebCodecs and a muxer — not built.
- **Storage:** the project is JSON in localStorage (`provident-video-project`); uploaded files are blobs
  in IndexedDB (`provident-video`). One project at a time; no Drive, no sign-in gate, no Recents.
- The Browser pane's launcher cannot start a server from inside `.claude/worktrees` ("Operation not
  permitted"); run `serve.py` from a shell instead.

## Second pass (2026-11-12, from the first test)

- **Scrubbing.** The playhead line is a 13px grab strip the full height of the timeline (it used to be
  grabbable only on the 24px ruler). Scrubbing lands on whole frames (1/30) and is magnetic to the start
  and end of every clip and item (`magnet()`, 9px). A click on the video clip moves the playhead to the
  click; a click on any other item moves it only if the playhead is outside that item.
- **Track labels are `position:sticky`** — an `absolute` after it used to win, so they scrolled away.
- **Graphics.** The track is called Graphics. Any uploaded image can be placed (Logos tab), and an image
  dropped on the video becomes a graphic, not a photo clip, once there is a video. A graphic placed at the
  very end steps back so it is on screen. Colour per graphic: Original / White / Navy (`flat()`).
- **Lockup colour.** "Match canvas / Original" looked dead because four of the five developer files are
  already white. The wordmark now has Colour White / Navy and the partner is Match wordmark / Original,
  so the control visibly does something for every file.
- **Drag guides and the Reel overlay** (`.vs-guide`, a DOM layer over the canvas, never exported) were
  added by a Side chat session in the same pass: safe-area bands, the Reel interface in outline, centre
  lines that light on lock, edges magnetic to the safe area, Alt frees it. The phone button in the
  transport keeps the overlay on.
- **Layer colours**: Text violet, Graphics rose, Video blue, Music green, Sound amber — a bar on each
  track label and the same colour on its items (`--tc`).

## Third pass (2026-11-12)

- **Placement preview** (top bar › Preview): CAS's phone frames and Facebook / Instagram chrome, ported
  by `tools/video-dev/build-preview.py`, which reads CAS's `.mk-*` rules and phone template and writes
  `video-preview.css` and `video-preview.js` (both GENERATED — rerun the script when CAS's preview
  changes, never edit them). 9:16 shows Reels + Story, 1:1 shows Feed. Each phone holds a
  `<canvas class="mk-shot">` the editor mirrors the live canvas into (`pvMirror`, called from `draw`),
  so the video plays inside the phones.
- **Scrub lag, the real cause.** The paused tick ran `sync(); draw();` — so a moving scrub started the
  NEXT seek before the frame that had just arrived was painted, and the picture only caught up when the
  pointer stopped. It is `draw(); sync();` now. Measured with `VideoStudio.stats.seeked`: ~27–30 new
  frames a second while sweeping the 1080×1920 test file, every source frame on a slow sweep.
- **Logo colour is one switch** (Logos tab › Logo colour): Match wordmark / Original. It sets the
  collaboration logo AND every placed graphic (`l.tint`), and a new graphic takes the current setting.
  **A logo on a flat background is keyed** (`keyed()`): when every edge pixel is opaque and the four
  corners agree, the background colour is removed so the mark can be painted; the lockup then measures
  the keyed mark's ink box. A photo (corners disagree) is left alone.
- **Brass highlight in text**: `**marked**` runs print in `ART.brass` #B0905C (headline and the line
  under it; it can start inside a word and run across lines). The Headline field has a Brass highlight
  button that wraps the selection, or the word under the caret, and unwraps on a second press.
  By request — the same exemption OPS records for its brass highlight.
- **The wash is the brand navy** (`ART.wash` 26,41,66), under text and behind the lockup.
- **The preview always shows Feed, Reels and Story** (by request, same day). A 9:16 in the feed is the
  centre 4:5 crop, as Meta does — which cuts off a wordmark at the top margin (260 < the crop's 285);
  a 1:1 in Reels and Story sits centred on black.

## Photos to video with Higgsfield (2026-11-12)

By request: a photo clip can be animated with a directed camera move, the way Higgsfield's Cinema
Studio offers them. **The studio never talks to Higgsfield.** It queues; Claude generates.

- **Picker** on a photo clip (inspector › Animate with Higgsfield): ten moves in `MOVES` (Push in,
  Pull back, Pan left/right, Tilt up/down, Crane up, Orbit, Slide, Hold), a length (5 / 8 / 10 s) and
  an optional extra direction. In Cinema Studio a move is a phrase in the prompt, so each move is one
  phrase and `MOVE_BASE` is the fixed real-estate prompt around it. **The studio writes the whole
  prompt** so the skill decides nothing — that is what keeps a run to a few short tool calls.
- **Send to the animate queue** renders the photo exactly as the clip frames it, at the video's size
  (so the generated clip drops in unreframed), and POSTs it to the local server.
- **The queue is `_animate/`** (git-ignored) served by `tools/video-dev/serve.py`:
  `POST /api/animate/job` · `GET /api/animate/jobs` · `POST /api/animate/placed` · `/cancel`.
  `<id>.json` (status queued → working → done / failed → placed), `<id>.jpg`, `<id>.mp4`.
- **The skill** is `.claude/skills/animate-photos/` (`/animate-photos`): reads the queue with
  `scripts/animate.py`, shows the credit cost and waits for a yes, uploads the frames, generates with
  `cinematic_studio_video_v2` (start image, sound off, std), waits, and runs `animate.py done` which
  downloads the MP4. It is told not to look at the photos or the results.
- **The studio polls every 4 s** while a clip is queued or generating (`animWatch` / `animPoll`),
  loads the MP4 into the library, and points the SAME clip at it (in 0, out = its length, muted).
- Tested end to end with a stand-in MP4 for the result — **no real Higgsfield generation has been run
  through it yet**, so the result URL's shape and the model's settings are unproven.
- The main checkout has a symlink `.claude/skills/animate-photos` → this worktree's copy, so the
  skill is listed in sessions started from the main folder. Untracked there.

## First real Higgsfield run (2026-11-13)

One photo went through `/animate-photos` end to end: queued from the studio (Push in, 5 s, 9:16),
`cinematic_studio_video_v2` with `start_image`, `sound: "off"`, `mode: "std"`, and the studio
swapped the clip on its own (job file ended `placed`).

- **Cost: 5 credits** for 5 s std. `get_cost: true` works without an upload.
- **About 2.5 minutes** to generate one clip.
- **The result is 720x1280**, not 1080x1920, and 5.04 s long. The compositor scales it to fill, so
  it is softer than native footage. A sharper result needs another mode or an upscale; not tried.
- `jobs_wait` returns the MP4 as `result_url` (a plain cloudfront link `animate.py done` downloads).
- The server filled `genre: auto`, `speedramp: auto`, `multi_shots: false`, `cfg_scale: 0.5`.
- Nobody has judged the motion yet: whether "Push in" reads as a push in is still the user's call.

**Pro mode (same day):** `mode: "pro"` returns **1080x1920** (5.04 s, about 21 MB against 8 MB) for
**7.5 credits per 5 s** (15 for 10 s; std is 5 and 10), again about 2.5 minutes. The photo clip's
inspector now has **Quality: Draft 720p / Full 1080p** (`genMode` on the clip, `mode` in the job,
read by the skill; a job without one is `std`) and a credit estimate (1 or 1.5 per second).

**Model choice (same day):** the user's own Higgsfield habit is Seedance 2.5, 10 s, 1080p, High
bitrate (160 credits). The photo clip now has **Model: Cinema Studio / Seedance 2.5** (`genModel`
on the clip, `model` in the job). Seedance goes as `mode: "omni_reference"` with `start_image`,
`generate_audio: false`; Draft = 720p standard bitrate (7 credits/s), Full = 1080p high (16/s; bitrate
and audio do not change the price). Priced with `get_cost` only: **no Seedance clip has been
generated through the skill yet**, so its `start_image` round trip is unproven.

**Name (2026-11-13):** the user calls the Video Studio **CASV**. Use it in replies; file names are unchanged.
