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
