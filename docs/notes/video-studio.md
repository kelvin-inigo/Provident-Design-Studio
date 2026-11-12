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
