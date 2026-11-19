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

**Seedance only (2026-11-13, user: "all needs to run on seadance"):** the Model choice is gone;
CASV always queues `seedance_2_5`. Quality stays Draft 720p (7 credits/s) / Full 1080p (16/s).
The skill's table still lists Cinema Studio for old jobs. Kling was priced but never built in.
A real Seedance run through the skill is still unproven.

**Three models again, and Generate now (2026-11-13, by request):** Model is Seedance 2.5 (default) /
Kling 3.0 / Cinema Studio (`GEN_MODELS` in video-studio.js holds ids and credits per second:
7/16, 1.25/1.5, 1/1.5, sound off). **Generate now** runs Higgsfield's command-line tool from
`tools/video-dev/serve.py` (`@higgsfield/cli` 1.2.2, installed globally with npm; `higgsfield auth
login` is the user's step): `/api/animate/cost` prices the job (`generate cost`), the page shows
"This will spend N credits" with Generate / Cancel, `/api/animate/run` starts a thread that runs
`generate create`, `generate wait`, `generate get`, downloads the MP4 and marks the job `done`; the
page's existing poll places it. Send to the animate queue (the Claude skill) is unchanged.
UNPROVEN until the tool is signed in: the param flag spelling (`--aspect_ratio`, `--bitrate_mode`,
`--generate_audio false`), the JSON shapes (the server only regex-reads a UUID, a credits number
and an .mp4 URL), and any real run. Kling's output size is not measured.

**Tool signed in and priced (2026-11-13):** `higgsfield auth login --port 8766` — the default 8765 clashes with a Logitech service on [::1]:8765, so Safari hands the callback to Logitech and the login times out. One workspace (Private) must be selected once with `higgsfield workspace set <id>`. Param flags are the model param names as written (`--aspect_ratio`, `--bitrate_mode`, `--generate_audio false`); `generate cost --json` answers `{"credits": N}` (Seedance 720p 5 s = 35, Kling std 5 s = 6.25, matching the connector). Generate now reached the confirm step in the page and Cancel cleared it. A real run through the tool (create, wait, get, download) is still unproven.

**Generate now proven (2026-11-13):** one Kling 3.0 draft (Pull back, 5 s, 9:16) went from the page through the tool with no Claude: price 6.25, confirm, `generate create` -> `wait` -> `get` -> download, and the page placed it (job file `placed`). About 2 minutes. Result 720x1280, 5.04 s, 8.4 MB; balance 2794.92 -> 2788.67. Kling Full and any Seedance run are still unproven.

## Captions timed to a voiceover (2026-11-13, by request)

Asked for after two reference reels (word-by-word captions under a voiceover). Captions belong to
an AUDIO item, not a new track: select the voiceover, Captions On, paste the script. Fields on the
item: `capOn, cap, capN (1-3 words), capStyle (plain | pill), capSize (S/M/L = 41.5/49.8/59.7),
capCase, capHi (spoken word in brass), capY (% of the safe area, default 90), capShift (s)`.
`drawCaption` runs in `draw()` after the logos, so preview and export share it.

**No transcription.** `capTiming` spreads the script's words over the SPOKEN stretches of
`media.peaks` (40/s, threshold 14% of the 95th percentile, breaths under 0.15 s bridged) in
proportion to word length. First cut drifted across sentences (a short first sentence pulled the
next one early), so sentences are now anchored: with S sentence breaks in the script, the S
longest silences (>= 0.3 s) are taken as those breaks, unless a sentence's share of speech would
be more than 2.5x off its share of letters, in which case it falls back to one global spread.
A pause longer than 0.8 s clears the caption. Trailing . , ; : are not drawn.

Tested with a macOS `say` voiceover (3 sentences, 11.4 s): twelve sampled frames all showed the
right words, and the two pauses cleared. NOT tested: a real recorded voice, music under the
voice (the threshold will read music as speech), a script that does not match the audio, 1:1.
The default height collides with a bottom-anchored text block; the user moves one of them.

**Make a voiceover (2026-11-13, by request):** Audio tab > Make a voiceover: script, voice, button. `/api/voice/list` gives Mac voices (`say`, free, offline) and the account's Higgsfield voices (3 of the user's own + 114 presets, from `higgsfield voices list`); `/api/voice/cost` and `/api/voice/make` use `text2speech_v2` with `--variant elevenlabs`. The result is added to the library and the Sound track at the playhead with captions on and the script filled in. Tested: Mac voice end to end (8.1 s file, captions on); Higgsfield price step (0.45 credits for 140 characters) then Cancel. NOT tested: an actual Higgsfield voice generation (the audio URL regex and download are unproven).

**Higgsfield voice proven, after one bug (2026-11-13):** the first real run (Grady, 0.45 credits) placed a 2.2 s file: the server regex-read the first .mp3 URL in `generate get --json`, which was the VOICE'S PREVIEW sample inside `params.voice.source`, not the result. Fixed with `hf_result()`, which reads `result_url` only, for audio and video alike. The paid result (10.4 s) was fetched and put in place by hand; the fixed path has NOT been re-run end to end (that would cost another generation).

## Shot markers, voice preview, smaller text (2026-11-13, by request)

- **Shot markers.** `findCuts(rec)` plays each video once, muted at 2x, into a 36x64 canvas via
  requestVideoFrameCallback; a frame whose mean RGB difference from the previous one is over
  `max(40, 5 x median)` is a cut (cuts within 0.5 s merge to the strongest). Stored on the media
  record as `cuts` (file seconds) with `cutsV: 2`. At 3x it missed one of the test video's nine
  cuts; at 2x it finds all nine (2.58 5.88 9.21 11.83 12.75 15.38 18.33 20.04 21.79). Seeking
  frame by frame does NOT work for this (frames are not decoded for an off-screen video).
  `markers()` maps cuts inside each clip's used range to timeline time; `renderTimeline` draws
  them (`.vs-mk`, dashed line with a diamond) and `edges()` includes them, so the playhead
  (`magnet`) and every dragged or trimmed item (`snapT`) lock to them. Dissolves are not found.
  NOT tested with a real pointer: an item actually snapping to a marker (same code path as the
  existing snapping, which was).
- **Hear this voice.** Higgsfield's listing in the CLI has no preview link; the MCP's does. The
  117 links were saved once to `_animate/voice-previews.json` (git-ignored; the user's own voices'
  links contain their account id) and `voice_list()` merges them in with gender. A voice added
  later has no sample until that file is refreshed. Mac voices read one line through `say`.
- **Text sizes.** Headline ladder was 116.7 / 140 / 168 / 201.6; now 59.7 / 86 / 123.8 / 168.
  Captions were 41.5 / 49.8 / 59.7; now 34.6 / 41.5 / 49.8. Existing items keep their size NAME,
  so they shrank.

## Voiceover to an exact length (2026-11-13, by request)

The Higgsfield voice model has no speed or length setting, so length is fitted, not asked for.
- **Audio items have a speed**, `rate` (default 1, limits `RATE = [.75, 1.35]`): the item's timeline
  `dur` covers `dur * rate` seconds of the file. `sync` sets `playbackRate` with `preservesPitch`;
  the waveform, captions, both trims, the Lasts field and split all multiply by it.
- **Inspector > Speed > Fit to exactly (seconds)** (`data-n="fit"`) sets the rate so the same stretch
  of audio lasts that long; past a limit it stops there and says to edit the script.
- **Make a voiceover > Length** (`VO.target`): a live hint counts words against `PACE = 2.5` words a
  second and says fits / too long (cut N words) / too short. Mac voices are generated near the pace
  (`say -r`, wpm x 1.12 because `say` runs slow of its nominal rate), then every voice is fitted.
Tested: 28 words, target 10 s, Mac voice -> 9.21 s file at 92% = exactly 10.00 s; Fit 4 s clamps at
135% (6.8 s) with the message; Fit 8 s -> 115%. NOT tested: how a stretched voice sounds, a
Higgsfield voice with a target, and export of a speed-changed item.

## Transitions, callouts, generated sound (2026-11-13, by request)

- **Generated clips carry sound.** The user's line ("Add natural sound of the environment in each
  scene, every interaction with the environment, accurate sound details") is appended to
  `MOVE_BASE`; `hf_args` and the skill now send `sound: on` / `generate_audio: true`; a placed clip
  is no longer muted. Prices with sound on, per second Draft / Full: Seedance 7 / 16 (unchanged),
  Kling 1.75 / 2, Cinema Studio 1.5 / 2. No clip has been generated with sound yet.
- **Transitions.** A clip has `tr` (cut | fade | wipe | slats | dip) and `trD` (0.2-1.5 s, default
  0.5): how it ARRIVES. The track stays end to end; for the first `trD` seconds of the incoming
  clip, `draw()` paints the previous clip underneath, held on its last frame (`sync()` parks that
  video at `out - 0.04`), then the incoming one through alpha, a clip rect, twelve slats, or a navy
  dip. `picOf(c)` is the one place that says whether a clip can be drawn. Audio still cuts.
- **Callouts.** Text-track items with `call` (ruler | count | box), drawn by `drawCallout`, added
  from the Text tab. x/y/w/h are % of the canvas, set with sliders (no canvas drag). White only:
  gold is not on the recorded exemptions list, though the reference reel used gold.
Checked on a contact sheet: count 50 -> 72 -> 73, the ruler growing then its figure, the box
drawing round its label, a fade mid-way and slats mid-way. NOT checked: wipe and dip, transitions
during real-time playback and export, 1:1, a photo-to-video transition.

**Make music (2026-11-13, by request):** Audio tab > Make music: a description, a length (defaults to the video), Sonilo or ElevenLabs Music v2.5 (always `force_instrumental`). `/api/music/cost` and `/api/music/make` in serve.py, same shape as the voiceover; the track is added as the music bed. Prices: Sonilo 1.88 credits for 30 s, 3.75 for 60 s; ElevenLabs 4.36 and 8.72. Tested to the price step for both models, then Cancel (driven by script in Chrome because the Browser pane was closed, so not real clicks). NOT tested: an actual generation and download. OpenMusic (IRCAM, a composition environment, not a generator) was installed to /Applications at the user's request and is not connected to CASV.

## End card, and music proven (2026-11-13, by request)

- **End card** (`call: 'cta'` on the Text track, `drawCta`, added from Text > End card at the last
  four seconds). After OPS's CTA page and the user's screenshot: a centred frosted panel (the
  canvas drawn onto itself through `ctx.filter = blur(46px)` inside a rounded clip, under a 34%
  navy veil; "Navy" is the plain fallback and what a browser without canvas filters gets), the
  brass overline, a Light line, the Regular headline (steps down past two lines), an outlined pill,
  and `provident.` in Light. Fields `line, head, btn, mark, glass, y`; an empty field drops its row.
  It draws last, over captions, and `drawBrand()` is skipped while it shows so the wordmark appears
  once. Seen rendered on a real project at 9:16. NOT seen: 1:1, Navy, export, Safari.
- **Music proven.** One Sonilo track (30 s, 1.88 credits) went end to end from the page: priced,
  confirmed, generated, downloaded as .m4a through `hf_result`, placed on the Music track at 30.0 s.
  That is also the first full run of the repaired `result_url` download path.
- The user now works in CHROME (their project and a Seedance clip they generated are there); the
  app's Browser pane was closed. Test there, and remember two open tabs share one saved project.

## Export tested with transitions and the end card (2026-11-13)

In Chrome on the user's 8-clip, 32.07 s project, with fade / slats / wipe / dip set on clips 2-5
for the test only and the end card on. Four exports:
- Runs 1 and 2 (the first two after a page load; run 2 with NO transitions or end card): the clock
  ran at about half speed and the file was 1.6 s / 2.9 s and 1.6 / 2.5 MB. So the failure is not
  caused by transitions or the end card. Cause NOT found. Plain playback at the same moment ran at
  full speed (6.0 s in 6.0 s, 60 rAF/s), so it is export-specific; the shot scan (`findCuts` plays
  every video at 2x after a load) is the suspect, unproven.
- Runs 3 and 4: correct. Run 4 with everything on: 32.28 s, 1080x1920, 48.9 MB, audio 32.3 s with
  signal; frames pulled from the file show the fade blending, the slats, the wipe edge, the navy dip,
  and the end card arriving and settled.
Guards added, NOT yet exercised in a browser: `rec.onstop` measures the recorded file and refuses to
save one shorter than 90% of the timeline ("came out short ... Press Export video again"); and
`findCuts` does not start during an export.
Test hygiene: the download was intercepted (anchor click patched), and the test's transitions were
never saved. The saved project DID change during the test (the user was editing in another tab) and
the test wrote its starting snapshot back over it — do not restore a snapshot while the user works.

### Short exports: cause found and fixed (2026-11-13, later)
**Cause: the AudioContext was suspended.** The earlier test pressed Export from a script, so the
page had no user activation; `actx.resume()` does nothing then. With the context suspended the
recording's audio track carries no time and the MP4 comes out a few seconds long, and unmuted
videos refuse `play()`, so `drive()` re-seeks every frame, `sync()` holds, and the clock crawls at
about half speed. Runs 3 and 4 were fine only because the page had been clicked by then. The shot
scan was NOT the cause. A person's own click on Export gives activation, so the user was unlikely to
hit this, but nothing guaranteed it.
Reproduced on a fresh load with a script click: context `suspended` for the whole run, 0.45 s of
timeline per second, short file (the 90% guard refused it — that guard is now proven).
**Fix:** `exportVideo` waits in `ready()` until `actx.state === 'running'` (retrying `resume()` for
1.5 s) before it waits for the first frame and starts the recorder; otherwise it closes the overlay
and says "The sound could not start, so nothing was exported. Click anywhere on the page, then press
Export video again."
Verified in Chrome on the 8-clip 32.07 s project: script click on a fresh load → refused in under
2 s with that message; real click immediately after a fresh load → context `running`, 32.25 s,
1080x1920, 48.9 MB, done in 40 s of wall time. Nothing was written to the saved project this time.
**Testing rule: drive Export with a real pointer click, never `el.click()` from a script.**

### End card: move it, and captions under it (2026-11-13)
The user's end card sat on top of a caption. Three ways to clear it, all on the end card's panel:
- **Drag the card on the picture**, up and down only (`cdrag.cta`), snapping to the middle (Alt frees it).
  `drawCta` now registers a hit box and clamps the card inside the safe area wherever `y` puts it.
- **Position** Higher / Middle / Lower (`y` 32 / 50 / 62) plus the "Up or down" slider (15–85).
- **Captions while it shows** Shown / Hidden (`capHide`, default shown): hidden skips `drawCaption`
  for as long as that end card is on screen.
Verified in Chrome with a real pointer on the user's project, saving blocked in the test tab: drag up
→ 36%, caption clear below; drag far down → stops at 54% (safe area); Higher → 32%; Hidden → the
caption is gone. 1:1 not checked.

### Headline line spacing (2026-11-13)
By request: a wrapped headline at Small was too tight (the Reel thumbnail's 158/168 leading).
`ART.leads = { tight: 158/168, normal: 1.1, open: 1.26 }`, per text as `lead`; unset = Normal at
Small and Medium, Tight at Large and Jumbo (`leadOf`). "Line spacing" Tight / Normal / Open sits under
Size on the text panel. Seen in Chrome: the user's two-line Small headline now sets at about 1.1.
The Tight / Normal / Open buttons themselves were NOT clicked in a browser (the user was working in
the test tab). Test hygiene: never `delete Storage.prototype.setItem` to undo a patch — it removes the
native method; keep the original and assign it back.

### End card background wash; the preview's Feed shows the Square (2026-11-13)
- **Wash.** By request, a navy wash over the whole picture while the end card shows (`ctaWash`,
  `t.wash` 0–80, default 45, "Background wash" slider). It fades with the card and is painted BEFORE
  the captions, so they sit on top at full strength. Seen in Chrome at 77%.
- **Preview.** The Feed phone showed a 4:5 crop of the 9:16, which cut the headline off. It now shows
  the Square 1:1 version of the same frame: `pvSquare()` swaps `cv` / `cx` (now `let`) and `P.size`
  to an offscreen 1080 canvas, runs the one `draw()`, and restores them, the hit boxes, `pTint`,
  `dirty` and `draw._had`. Synchronous, guarded by `pvBusy` (draw() ends in pvMirror()). Only runs
  while the preview is open, so export is untouched. Verified: Feed shows the square with the whole
  headline; the main canvas hashed identical before and after opening the preview (1080x1920).

### Graphics per size; text block gaps (2026-11-13)
- **Two graphics landed on each other in Square.** A graphic's x / y / w are shares of the canvas, so
  two stacked on the Reel keep their widths on the Square while the gap between them (a share of the
  height) shrinks to 56%. Now each size has its own: x / y / w are the 9:16's, `l.sq = {x, y, w}` is
  the Square's, written only when the graphic is moved or resized IN Square (`lgeoW`). Until then the
  Square derives it (`lgeo`): same place, width x 1080/1920. So a lone graphic is also smaller in
  Square than before this change. Drag, the Size slider, Centre it and Bottom corner all go through
  `lgeoW`.
- **Eyebrow / headline / line sat too close** at the smaller sizes, because the gaps were a share of
  the headline size only. Now `max(px * .2, eb * .8)` under the eyebrow (was `px * .16`) and
  `max(px * .26, sb * .7)` above the line (was `px * .22`). Slightly more air at Large and Jumbo too.
Seen in Chrome on the user's project, both sizes: the Palm Springs and Nakheel marks are apart in
Square and unchanged on the Reel; "Aliso Townhouses / 3 to 4-BR townhouses / From AED 3.8M" has clear
gaps. Moving a graphic in Square (the `sq` write path) was NOT exercised.

## Chrome redesign to match CAS (2026-11-13, branch `casv-redesign`, by request)

"Redesign the UI and UX of CASV, make the design of the UI same to CAS." Chrome only: the diff touches
`renderLib`, `renderInspector`, the handlers and the wiring; nothing between `setFont` and `fitCanvas`
(the paint path) changed except the waveform's fill, which now reads the track tint from the stylesheet.
Built on its own branch and worktree (`.claude/worktrees/casv-redesign`, served on 8798) because another
session was committing to `video-studio` at the same time.

- **Measured off CAS's Design tab** (computed values, light and dark): section heads 13/600 with a quiet
  11.5 meta beside them (no tracked caps anywhere in the chrome), switches as a fill track with the chosen
  half on the resting tint (`--ps-accent`, never the navy), rows as label left / control right, tiles as a
  swatch over an 11.5/500 label three across, dashed 14px drop, 16px cards with a ring and no shadow.
- **Top bar is CAS's**: wordmark (links home), a file group (Start a new video, which used to hide in the
  idle inspector, now behind a small dialog), the size switch, then theme, Undo / Redo (moved up from the
  transport), Preview, Save frame, Export video (ghost) and Send to CAS (the one navy action).
- **Left rail = what can be added.** Media, Audio, Text, Graphics. Text presets and callouts are specimen
  tiles; Make a voiceover and Make music fold away under Your audio (`ACC`).
- **Right rail = Selected | Whole video** (`rtab`). Whole video holds what is set once: comments from CAS,
  the wordmark, the collaboration logo, the logo colour. These left the old Logos tab, which is now
  Graphics and carries a pointer ("Looking for the wordmark?"). Selecting turns the rail to Selected,
  deselecting turns it back. `brandClick` serves the brand controls wherever they are drawn.
- **Stage** has CAS's size heading (Reel · 9:16 · 1080 × 1920 · length) with Safe zones at its right.
- **Timeline**: layer colours kept, as tints of the desk (`--tc` mixed into the card, a light and a dark set)
  instead of saturated fills; the playhead and the selection are the ink; shot markers are dim; comment
  pins are the link colour so they do not read as the playhead.
- **Help** (How to cut, Keys) left the idle inspector for a Shortcuts card on the transport bar (popover).
- **Dialogs**: `ask()` (a `<dialog>`) replaces `confirm()` and Send to CAS's `prompt()`; the export box
  shows time recorded.
- **Phones** (≤860px): picture, bar and timeline on top; the two rails become one panel behind Add / Edit.

Checked in the Browser pane at 1440, 1280, 1100 and 375, both themes: no console errors, the top bar fits,
no sideways scroll, every inspector kind renders without overflow, quiet inks ≥ 4.9:1 after a reload into
each theme. Canvas hashes at six times in both sizes equal the pre-change page served alongside (after a
reload; a logo uploaded in the same session hashes differently until then, in both versions).
NOT exercised: Export and Send to CAS end to end (real click needed), the generators' paid steps, the
comments list with real comments, drag on the picture, the placement preview, Safari.

### Filmstrips on the Video track (2026-11-13, by request)
Every piece of a split clip showed the file's first frame (the poster, repeated). Now each video file
gets a sprite of frames (`buildStrip`: one every 0.5 s, or dur/200 for long files, 92px high, by
seeking a spare in-page `<video>`), and `paintStrips` lays the frames inside a clip's in..out along
its `<canvas data-strip>`. In memory only, so it is rebuilt after each load (the 27.5 s test file
took a few seconds); one file at a time; it waits while the video plays or exports. The poster stays
underneath until the frames arrive. Photo clips are unchanged.
Seen in the Browser pane: a 27.5 s clip cut at 6.92 and 13.92 shows three different stretches, and
trims follow. NOT checked: a very long file, Safari, and whether the seeking slows scrubbing while a
strip is still being built.

### Taller timeline; the scrubber selects the clip it lands on (2026-11-13, by request)
- **Timeline height.** The top edge of the transport bar is a handle (`#tlRz`, `setTlh`): drag it up or
  down, or focus it and press the arrow keys; double-click puts the default back. It sets `--vs-tlh`
  (120px up to the window less 294px), kept per computer in `provident-video-tlh`. Hidden on phones.
- **Scrubbing shows the clip's options.** `landOn()` runs on a ruler click, a playhead drag and the
  arrow keys: the video clip under the playhead becomes the selection, so the right rail turns to it.
  It leaves a selected text, graphic or sound alone, and does nothing during playback or export. Side
  effect: a click on an empty part of a track no longer leaves nothing selected when a clip is under the
  playhead; Esc or the Whole video tab still does. This was my reading of "show option of the frame
  when scrubber lands on it"; the user has not confirmed it.
Seen with a real pointer in the Browser pane: drag 269 -> 419px and the picture refits; double-click
resets; ruler click and a drag across a cut switch the selected clip; a selected text stays selected.


### Send to CAS, comments back, Apply to all (2026-11-13)
**Send to CAS** (top bar): asks a name, then records the Reel 9:16 and the Square 1:1 through the one
`exportVideo(cb)` (twice the video's length), takes a poster a third of the way in, and PUTs all three
to the local server's **outbox** (`_outbox/`, git-ignored; `/api/outbox/file|meta|list|notes` in
serve.py). `P.cas = { id, title, at }` keeps the outbox id, so sending again replaces the same entry.
CASV never signs in: CAS's Add video (share-link.js, see reviews-sharing-drive.md) reads the outbox
from the website and uploads to Drive. The outbox answers only the site's origin, localhost origins
and `CASV_ORIGINS`, and answers Chrome's private-network preflight.
**Comments back:** CAS posts a video's timeline comments to `/api/outbox/notes`; `casNotes()` polls
every 15 s and shows open ones as numbered pins on the ruler (`.vs-nt`) and all of them under
"Comments from CAS" in the Whole video rail. Read-only here.
**Apply to all** (Selected rail, by request): copies a GROUP of settings from the selected item to
every other item on its track (`ALLG`, `allOf`, `allApply`): Sound / Transition / Fit and zoom for
clips; Volume and fades / Caption style for sounds (same track only); Size, place and effect for
texts; Size for callouts of the same kind; Size, opacity and colour for graphics. Never words, files
or timing. One undo step.
Verified in Chrome with real clicks, saving blocked in the test tab: a real Send to CAS of the 32 s
project parked 47.7 MB and 47.4 MB files and put the size back; two posted comments showed as a pin
(the open one) and two list rows; Volume and fades went from one sound to the other four.

### Marker options (2026-11-13, by request)
A **Markers** button on the transport bar opens a card with four switches (`MK`, kept per computer in
`provident-video-markers`, not in the project). `markersAll()` returns `{t, k}`; `markers()` is its
times, so the playhead (`magnet`) and dragged items (`snapT` via `edges`) snap to whatever is on.
- **Scene changes** (dim, dashed, diamond): the existing `findCuts` markers, now switchable.
- **Clip cuts** (solid, round head): where two clips meet, so a split shows as a marker.
- **Voice pauses** (amber): `voiceStops(m)` on the Sound track, from the 40-a-second peaks with the
  captions' own threshold: 0.2 s or more of speech followed by 0.3 s of quiet, or the end of the file.
- **Music beats** Off / Bars / Beats (green, faint line): `findBeats` decodes the file once and
  `beatGrid` reads the rise in loudness at 100 a second, takes the tempo from its autocorrelation
  (70-180 a minute, leaning to 120), tunes period and phase on a comb, and drops the grid when the comb
  scores under 1.4x the mean (no steady pulse). Bars = every fourth beat, starting on the loudest of
  the four. In memory only, so it is worked out again after each load.
Tested: a synthetic click track at 100 a minute, first click at 0.30 s, came back as 100 with beats at
0.30 0.90 1.50 and bars 2.4 s apart; the Sonilo bed read 149 (nobody has checked that by ear); the two
test voiceovers gave pauses at 1.30 3.78 7.40 10.40 and 4.47 8.98; Scene changes off and on with a real
click changed the count 9 -> 0 -> 9. NOT tested: whether the pauses and bars sit where a person hears
them, snapping to the new kinds with a real drag, music under a voice, a tempo that changes.

### The project travels with the video: .casv, the outbox and the inbox (2026-11-16, by request)
The project used to exist only in one browser. Now **Send to CAS** also parks `<id>.casv` in the
outbox (`part=project`, up to 2 GB): `casPack` writes 'CASV' + the header's length + the header
JSON (`project`, this computer's own logos, a row per media file) + the media blobs end to end.
Only media whose id appears in the project goes in. CAS saves it in the ad set's Drive folder.
- **Back:** CAS's Open in Video Studio PUTs the file to `/api/outbox/back` -> `_inbox/<id>.casv`
  + `<id>.json` (git-ignored). `casInbox` (every 15 s, and 2.5 s after load) asks before opening,
  because it REPLACES the one project here; declining deletes the inbox copy.
- **Opening** stores the new media first, sets `loading` (which makes `save()` a no-op so a pending
  autosave cannot write the old project back), writes the project, deletes media the new project
  does not use, clears the inbox and reloads. A full browser store changes nothing.
- `DB.tx` now rejects on `onabort` too: a quota failure aborts the transaction without `onerror`.
- Test on another port (another origin) — never on 8794, where the user's project lives.

## START NEW KEEPS THE LAST VIDEO; CAS'S "MAKE A NEW ONE" STARTS ONE (2026-11-16)

The user: "when I'm creating something new on CASV, the old session is still there." CASV holds ONE
project (localStorage `provident-video-project`) and reopens it on every load; Status's Add video ›
Make a new one in CASV only opened the page. Now:

- `startNew(name, from)` replaces the old `#newBtn` handler: asks when the timeline has anything
  (naming the ad set when CAS sent it, and saying when it was never sent to CAS), keeps the
  replaced project in `provident-video-project-prev` (PREV), starts `fresh()` keeping the size,
  sets `P.name` (Send to CAS's suggested name, after `P.cas.title`). `fresh()` has no `P.cas`, so
  the new video's Send to CAS is a new outbox video and the old one's comments stay with the old.
- **Reopen the last video** (`#prevBtn`, in the empty-timeline card, shown while PREV holds one)
  swaps PREV and the open project (asks first when the open one has anything).
- `#new=<name>` on load: the hash is dropped, then `startNew(name, name)` after 600 ms. Status
  (share-link.js on main) opens `CASV_PAGE() + '#new=' + ad set name`.
- Verified on a throwaway server (:8796, its own storage — :8794 is the user's): a seeded old
  video, `#new=Palm Springs by Nakheel` → "Start a new video for Palm Springs by Nakheel?" → empty
  timeline, `P.name` set, PREV holds the old, Reopen the last video brings it back and empties PREV.
  Not run: a real Send to CAS from a new video, media-heavy projects (PREV is the project JSON
  only; its media stays in the library because Start new never deletes media).

## Playback froze at the cut when a clip ran to the end of its file (2026-11-17)

Reported as "when the playhead is on the next timeline layer, it glitches". Measured in the pane on
a three-clip project: playing from 4.3 s, the clock stopped at 5.039 s (the cut is at 5.042) and
never reached clip 2. Cause, in `drive()`: a video that has run out is `ended`, which reads as
`paused`, and `play()` on an ended video restarts it from 0. So each frame it restarted, was sought
back to the tail, went `seeking` (which holds the clock in `tick`), and ran out again. Only clips
whose out point is the end of the file were hit, which is every untrimmed clip.

Fix: within the last 30 ms of the file (`tail`), or when `ended`, `drive()` pauses the element on
its last frame and does not call `play()`.

- Tested: before, real playback in the pane, 50+ consecutive frames held at 5.039. After, with the
  clock stepped by hand (the pane was hidden, so `requestAnimationFrame` did not run): clip 1 rests
  paused at 5.00, clip 2 is playing at 5.3 s, 2 `play()` calls and 1 seek across the cut.
- NOT tested: real-time playback after the fix, Export across a cut, Safari.

## Several texts at once on the Text track (2026-11-17, by request)

Shift- or Cmd-click adds a text to a group (`multi`, a Set of ids beside `sel`; `group()` returns
the members only while `sel` is a text inside it, and `renderAll` drops a stale set). Dragging
either end of any member scales the whole group about its far end, so starts, lengths and the gaps
between them all scale by one factor (no member goes under 0.2 s). Dragging a body moves the group;
Delete removes all of it; a plain click on a member goes back to that one; a second Shift-click
takes one out. The right rail shows "N texts selected" in place of one text's controls.
`edges(skipId)` takes a Set so the group does not snap to itself. Text track only: clips, sounds
and graphics still select one at a time.

- Tested in the pane with synthetic pointer events: three texts 2–12 s pulled 100 px in from the
  right end became 2–10.4 s, each scaled by 0.84 and still butted up; a pair pulled in from the left
  kept its end at 12 s; move shifted both by the same amount; undo restored each step.
- NOT tested: a real pointer (Shift-click and the drag), Cmd-click, Delete on a group, phones.

## Left rail: Media and Audio panels (2026-11-17, by request)

- Upload is one 56 px row (icon, label, formats) on all three tabs that have it, not an 80 px block.
- Media: two tiles across (`.vs-grid[data-m]`, 4:3 thumbs) so a name reads on two lines; an
  "In video" pill (×n) on files already on the video track; a plus over the thumb on hover says what
  a click does, so the instruction line under the grid went into the section meta ("click to add").
- Audio: a row is two lines, not three: name, then length (whole seconds) with "used" beside the
  two targets, now labelled Music and Sound (the note explaining them sits above the list). The
  round button plays the file in the library (`hearToggle`, one `Audio` outside the timeline graph,
  so it cannot reach an export); playing the video or removing the file stops it.
- Tested in the pane, dark, 1440: no horizontal overflow, rows 61 px (were about 124), play/stop
  toggles the row state and label, text contrast 6.5 or better. "used ×2" ellipsises (title carries it).
- NOT tested: light theme, 1280 and phone widths, hearing the preview, the hover plus with a real pointer.

## The library is organised: search, filters, stars, folders, names, grid or list (2026-11-17)

Asked for after the rail pass above, which only restyled it: with 17 files named by hash there was
still no way to tell them apart. Media, Audio and Graphics now share one builder (`libSec` /
`libList` / `libPick`), under the upload row:

- Search by name (also matches the folder name). Typing repaints only `#libList` and the count
  (`libRefresh`), so the field keeps its caret.
- Filter chips, one at a time: All, Starred, In video, Not used; Media adds Videos and Photos.
- Folders: a select (All folders, Not in a folder, each folder) with New, and Rename and Delete
  when a folder is open. Deleting a folder leaves its files in the library. One folder list for
  all three tabs.
- A star and a "more" menu on every file (on the thumbnail in the grid; at the right of a row):
  Rename, Star, Move to (folders, New folder), Remove from the library. The old × is gone from
  these lists (it stays on the collaboration-logo tiles).
- Media has a Grid / List switch (`LIB.view`); the list shows a thumbnail, the name on two lines,
  kind, length, use and folder. Audio is always rows; Graphics always a grid.
- Storage: stars, folders and the view in localStorage `provident-video-lib` (`LIB`), keyed by
  media id and dropped when the file is removed. Rename writes `media[id].name` and the IndexedDB
  record (`dbRec`), so the timeline label follows. Search, filter and open folder are per tab and
  last for the session. `LKEY` was already the developer-logo key, hence `LIBKEY`.
- Tested in the pane (scripted clicks, dark, 1024 wide): search 5 → 1 with focus kept; star and the
  Starred filter; list view; the menu opens; New folder from the menu files the item; folder
  rename; file rename reaches the timeline label; folder delete unfiles; no console errors; no
  horizontal overflow in grid, list or folder view.
- NOT tested: a real pointer and keyboard on the star and menu, light theme, 1440 and phone widths,
  many folders, Graphics tab beyond rendering, the menu near the bottom of the window.

## Animate panel: one state at a time, a visible queue, results come home (2026-11-17, by request)

The panel was a form with two dead-looking buttons and the missing step named at the very bottom;
a running job showed one line of text; the queue was invisible; a finished clip only arrived if a
clip on the open timeline was still waiting for it.

- `animHtml(it)` builds the section ("Animate this photo"). No job: the form, "choose one" beside
  Camera move, then a summary line (what will be made, about how many credits), **Generate now** as
  the one primary, and "Or add it to the queue for Claude" as a link, each with its own line saying
  what it costs and when. With a job the form is replaced by a status card (`.vs-job`): Ready to
  generate (exact credits on the button), Waiting in the queue (position: "2nd of 3 waiting"),
  Generating (busy bar, step, running clock), That did not work (the error, form back, "Try again").
- No percentage: Higgsfield's tool reports none, so the bar is indeterminate beside a clock
  (`jobSince`, ticked each second through `time[data-since]`). `serve.py` now writes `started`,
  `step` (sending / rendering / downloading) and `done_at` into the job; the page falls back to
  `at` and a generic step until the server is restarted.
- The queue is in the Media tab (`queueHtml`, "Animating · 1 generating · 2 waiting"): every job
  on the server that is waiting or generating, with its start frame, move, length, state, clock,
  and a remove button; a row for a clip in this video selects it. A job "working" for over 40
  minutes reads "Stalled" (the tool gives up at 25).
- Polling is always on (`animPoll` at start; 4 s while anything is active, 20 s otherwise), not
  only while a clip here has a job. `JOBS` holds the last answer.
- Finished clips: one waited for by a clip still replaces the photo and is in Your media
  (`jobToMedia`). One nobody here is waiting for (photo deleted, page closed, another video) is
  added to Your media once per browser (`provident-video-anim-got`); its server status is left
  alone, so CAS can still collect a job it asked for.
- Tested in the pane: the queue lists the server's three live jobs with counts; form disabled
  until a move is chosen, then the summary and "about 35 credits"; the four cards render from a job
  set by hand; no overflow at 320; no console errors.
- NOT tested: a real generation end to end (it spends credits), the orphan import with a real
  finished job, the restarted server's `step` values, cancel from the queue row, light theme.

## The library rail can be resized (2026-11-17, by request)

Drag the left rail's right edge (`#libRz`, `.vs-rzx`, a child of `.vs-body`). Width is `--vs-lw`
on the root (default `--vs-lwd`: 272, 240 under 1180), clamped 220 to 640 and so the stage keeps
380; kept per browser in `provident-video-libw`; double-click resets; arrow keys step 24 while the
handle has focus; hidden on phones. The left rail's grids are now `auto-fill` (media tiles 108 min,
other tiles 72 min), so a wider rail shows more across.

- Tested in the pane at 1385 (scripted pointer events; `elementFromPoint` reaches the handle):
  272 → 432 on a 160 px drag, media grid 2 → 3 across, stored, no page overflow; arrow key −24;
  capped at 640 with the stage at 464; double-click back to 272 and the key removed.
- NOT tested: a real pointer, reload restoring the width, light theme, 1180 and below.

## A selected clip is plainly selected (2026-11-17, by request)

The 2 px ink outline on a selected Video-track clip disappeared against a pale filmstrip. The clip
now carries a two-tone ring drawn over the frames (`::after`: 2.5 px `--ps-ink`, then 2 px
`--ps-sb` inside it) and its name chip inverts (ink ground, rail-ground text). Other tracks keep the
plain outline, which reads on their flat tints. Seen in the pane, dark theme; light theme not checked.

## One Generate panel in the right rail (2026-11-18, by request)

Everything that is generated moved out of the left rail (which is now only what can be added) into
the right rail's third tab, **Generate**, with one inner tab each: **Animate** (the queue,
`queueHtml`), **Voiceover** (`voHtml`), **Music** (`muHtml`). This supersedes "the queue is in the
Media tab" and "Audio tab > Make a voiceover / Make music" above.

- It is its own container, `#gen`, beside `#insp`; `renderInspector` shows one or the other. Its
  handlers are on `#gen`, so the inspector's `mark()` on focus and its `rtab !== 'sel'` guards never
  see it. The folding sections (`acc` / `ACC`) are gone.
- `renderGen()` replaces `renderLib()` in the voiceover and music code and on a queue change.
  `paintGen` puts the caret back after a repaint, because the 4 s queue poll repaints while a script
  is being typed.
- The rail tab reads "Generate · 3" while jobs are waiting or generating (`genTab`), since the queue
  is no longer in view on Media. A generator that is working or showing a price pulls its inner tab
  forward.
- Selecting something still turns the rail to Selected (a queue row selects its clip). Animate's
  settings for one photo stay under Selected.
- Tested in the pane on a spare port with an empty project: the three tabs, the server's three live
  jobs, typing a script through a poll (caret kept, hint updated), the script kept across tabs, no
  console errors. Not tested: making a voiceover or music from the new place, light theme, phones.

## Several video clips at once (2026-11-18, by request)

The texts' group selection (`multi` / `group()`) now also works on the Video track (`GK`): Shift- or
Cmd-click adds a clip, a second one takes it out. Clips sit end to end, so the group is not a span:
dragging an end of any member multiplies every member's length by one factor (right end moves each
`out`, left end each `in`; each clamped to 0.2 s and, for video, its own footage, so a clip at its
limit stops while the others carry on). Dragging a body moves the members as one block, in their
order. Delete removes them all. The inspector shows "N clips selected".
Tested in the pane with three photo clips: Shift-click, the right end shrinking two of three by the
same share with the middle one untouched, ⌘Z. Not tested: the left end, the block move, Delete,
video clips at their footage limit.

## QR code for the whole video (2026-11-18, by request; positions agreed first)

Right rail › Whole video › **QR code**, under Collaboration logo: Upload a QR code, then Position
(Bottom left / Bottom right / Top right), Size (60–160%), Remove, Replace.

- Stored in the project itself: `P.brand.qr = { name, u }` (a PNG data URL, at most 600 px), with
  `qrPos` and `qrScale`, so it survives a reload and travels in the `.casv` bundle.
- `qrBox()` is the one geometry, `drawQr()` paints it in `draw()` right after `drawBrand()`, so the
  preview, Save frame and the export all get it. It rests while an end card shows, like the wordmark.
- 16% of the width (173 px at 100%), on a white rounded plate (`QR`). Bottom positions end on the
  safe area's bottom edge (460 up on 9:16); Bottom right is pulled 170 further in on 9:16 for the
  Reels buttons; a bottom wordmark lifts a bottom QR above its row. Top right is offered only while
  the wordmark is shown top left (brand rule: in the wordmark's row); otherwise it draws bottom left.
- Text is not moved out of its way.
- Tested in the pane on a spare port: upload, the plate's pixels at each of the three positions on
  9:16, reload keeps it, labels fit. Not tested: 1:1, a bottom wordmark, the export file, Send to CAS,
  scanning a real code.

## Top bar and right rail tidy-up (2026-11-18, /impeccable, by request)

- **Top bar:** the quiet buttons (theme, Preview, Save frame) carried the class `vs-q`, which is
  also the library search box (`flex:1`, icon absolutely placed). That is why they stretched across
  the bar with the icon far from, or on top of, the label. They are `vs-tq` now; never reuse `vs-q`.
- **Right rail, every Selected panel:** the title row (`.vs-cap`) sticks under the tabs and
  Duplicate / Delete (`.vs-foot`) stick to the foot, so what is selected and its actions are always
  in view. `#insp` is a flex column so the foot sits at the bottom of a short panel.
- **Photo clip:** Lasts is a compact row with a small number field (`.vs-num`), Transition's style
  is a row, Framing comes before Animate, and **Animate this photo** is folded (`details.vs-acc`,
  `animOpen`) until opened, or once a move is chosen or a job exists. The whole panel fits one view.
- **Camera moves** are filled chips, so they read as buttons.
- **Whole video:** the three long notes are one line each.
- Checked in the pane at 1385 wide, dark theme: top bar positions, photo clip folded and open,
  Whole video, no sideways overflow, no console errors. Not checked: light theme, phones, the text,
  graphic, audio and end card panels beyond the shared sticky title and foot.

## Camera moves show themselves (2026-11-18, by request: "so i know what i will generate")

Each camera move button carries a small copy of the selected photo (`.vs-mvp u`, the media's own
blob URL, placed with the clip's Left to right / Top to bottom) that loops the move in CSS
(`@keyframes vs-m-<move>`): push in and pull back scale, pans and tilts slide the picture the
opposite way, crane rises while widening, orbit turns in perspective, slide travels further, hold
stays still. No GIF files. It is an indication of direction only: Higgsfield's result adds depth and
parallax the flat preview cannot. Off under reduced motion; paused while a job is running.
Animate this photo is open by default (`animOpen = true`).
Checked in the pane: ten previews, each with its own running animation, buttons 70 px, no sideways
overflow. The pane cannot play animations, so the motion itself was not watched.

## Start from a video script (2026-11-19, by request: "can this skill be built in inside CASV")

The video-script skill (it runs in Cowork, not in this repo) writes a Markdown file: a header,
Table 1 `# | Time | Voiceover | On-screen text` and Table 2, the image map
`# | Time | Scene | Image | PDF file | Page | Treatment`. Writing the script stays in Claude: it
needs the brochure read and every fact checked against the developer's pages. CASV only **reads**
the result. Top bar › the page icon beside Start new, or "Or start from a video script" on the
empty stage: choose the `.md` and the brochure PDF together (or the PDF when asked).
`importScript` / `parseScript`, also on `window.VideoStudio`.

- **Parsing.** Header bullets (`- **Format:**`, Total length, Voice, Music mood, Developer, End card
  with its indented Line above / Headline / CTA / Legal), Open items, both tables. Columns are found by
  name, and each is also kept under its first word ("Image (what it shows)" reads as `image`). Page
  column: "19 (alt 17)" uses 19 only; lists and ranges are read; "p24 is text" drops p24.
- **Pictures.** pdf.js 3.11.174 (`vendor/pdfjs/`, UMD build, loaded only when importing) renders
  each page the script names, once. **The picture on the page, not the page**: brochure pages are
  spreads with type around the photo. `pageImage` walks the page's drawing list for the images and
  where they land, and picks the one the script means: a pixel size from its low-res notes
  ("p7 map (1840x1197)") first, then "portrait" / "landscape" in its words, then the biggest. Strips
  lying edge to edge are joined. The pick is rendered alone at its own resolution (never below what
  fills the frame, at most 4096 a side). The Wilds p19 is the case that needs it: the biggest image
  is a full-page paper texture, the photo is the 2608x3376 portrait on it.
- **Timeline.** One still per page; a scene's pages share its time equally (scene 5: five cuts of
  1.2 s). Framing from the crop words (`aimOf`: "right 40%", "centre-left", "50% across, 45% down")
  turned into Left to right / Top to bottom for a filled frame (`focusFor`). Camera move from
  "Animate this photo: …" (`moveOf`; Hold = stays still); **nothing is queued or spent**. Each
  clip carries `sc` (its scene). On-screen text: "A / B" is headline + line under, three parts add
  the eyebrow; Medium, bottom, Rise. The last scene is the end card (CAS-style CTA: Line above,
  Headline, CTA) with the Legal line as a Small centred text under it.
- **Generate panel.** Voiceover gets the script's voiceover lines and Length = the total; Music gets
  the mood and the length (`scriptFill`, again on load when those fields are empty).
- **Whole video › From the script:** what is still needed (missing developer logo, [NEED: …] in
  the image map, on-screen placeholders, pages with no photo), each with a link to its scene; the
  script's open items folded; Voiceover, Music, and **Queue N camera moves** (free; `/animate-photos`
  generates). A generated clip for a script clip keeps its scene's length (`animPoll`), so the
  voiceover and texts stay on cue.
- **Export and Send to CAS ask first** while any text still says [NEED: …] ("Record anyway").
- **Fixed in passing:** `#insp{display:flex}` (e32d045) beat `[hidden]`, so the Generate tab
  opened BELOW Whole video / Selected, off screen. `#insp[hidden]{display:none}`.

Tested in the pane with The Wilds script and its real 36-page, 98 MB brochure: 10 scenes, 17
clips, 11 texts, 57.00 s, in 18 s; the right photo on every portrait page; scene link, Voiceover
button (filled, "Fits 57 s"), Export gate with Cancel (nothing recorded); no console errors.
Aldar is not among the preloaded developer logos, so it is listed as needed.
**Not tested:** the native file picker itself (the import was called with the same files), the
Queue button against the live queue (it calls the existing `animSend`), Square 1:1, light theme.
**Known limits:** type printed on top of a photo in the PDF comes with it (The Wilds p23
"AMENITIES", p20's tagline); the crop words are approximate (the p7 marker lands right of centre);
floorplan pages are filled like photos, not placed on a background.

## The prompt is the photo-to-video framework (2026-11-19, by request: "bake this skill in CASV")

The photo-to-video-prompt skill (`.claude/skills/photo-to-video-prompt/`, now tracked here; the
main checkout has a symlink to it, like animate-photos) reads a photo in three passes (analysis
sheet, word bank, prompt) and writes a Higgsfield prompt in 14 fixed sections: Scene context,
Active references, Location map, First frame / blocking, Format mode, Optics, Camera, Action,
Performance, Physics, Lighting, Audio, Style, Positive locks. It was built from a Higgsfield prompt
the user liked (a couple in a lounge, 5 s, 9:16).

- **Every animate prompt is now those 14 sections.** `MOVE_BASE` is gone. `promptFor(c)` fills them
  from what the studio knows: the move (MOVES' third field is now the CAMERA line, "Slow dolly in at
  1 km/h …"), the length (three ACTION beats at 30 / 40 / 30 %), Extra direction, and a new
  **People in it: No / Yes** on the photo clip (`c.people`), which changes Scene context,
  Performance and the locks. The user's sound line is the AUDIO section (`SOUND`).
- **Animate › Prompt** (`promptBox`, folded `details.vs-pr`): the prompt that will be sent, who
  wrote it (the studio's template / Written by Claude from the photo / Edited by you), a count
  against `PMAX` 2,500 (Kling's cap; every model gets the same text; animSend refuses longer).
  Typing keeps the edit (`genPrompt`, `genPromptBy: 'you'`). A written prompt remembers what it
  was written for (`genPromptFor` = `promptSig`: move, length, size, people); when those change it
  is flagged, not dropped. "Back to the studio's template" clears it.
- **Have Claude write it from the photo** queues a free **describe** job (`kind: 'describe'`,
  status `describe`) with the start frame (`frameFor`, shared with animSend) and the settings
  (`jobBase`: move, move_phrase, duration, aspect, note, people, sig). `/animate-photos` reads the
  frame, runs the framework's passes with CASV's rules (the move is the user's, AUDIO keeps the sound
  line, locks end "No new people, objects, text or logos appear"), and runs
  `animate.py prompt <id> <file.json>` (refuses over 2,500 or without the headings), which marks it
  `described`. `animPoll` copies the prompt to the clip and cancels the job. The queue row reads
  "Prompt to write · free".
- **Add it to the queue for Claude** with the template prompt sends `read: true`: the skill writes
  the prompt from the photo first, then generates with it. Generate now (Higgsfield's tool, no
  Claude) sends whatever the Prompt box holds. Old jobs and CAS's jobs carry no `read` and are
  used verbatim, as before.
- `serve.py` keeps the new job fields (`kind`, `move_phrase`, `note`, `people`, `sig`, `read`);
  cost and run still accept only `queued`, so a describe job can never spend credits.
- **Fixed in passing:** the inspector repaint (the 4 s queue poll) now keeps the caret in the
  prompt; a queue row whose clip was already selected now switches the rail to Selected (it stayed
  on Generate, so its clip's buttons were dead).

Tested in the pane on a spare port (8797) with a frame of the couple clip: template at 5 s and at
10 s with People Yes (beats 0–3 / 3–7 / 7–10, people lines in), describe job queued with the right
settings, `animate.py list` showing `write_prompt`, a 2,479-character prompt written from the frame
and stored, the page picking it up in one poll ("Written by Claude from the photo", job removed),
the stale flag after a length change, queue jobs carrying `read: false` with Claude's prompt and
`read: true` with the template, first hand edit (caret kept, way back shown), the reload keeping
it, no sideways overflow, no console errors.
**Not tested:** a real generation with a 14-section prompt (whether Seedance, Kling and Cinema
Studio follow it better than the old one-line prompt is still the user's call), a real
`/animate-photos` run in a fresh session, light theme, phones, Square 1:1.

**Follow-ups (same day):** "Have Claude write it from the photo" checks the server's answer: a
server from before this change drops `kind` and would file the photo as a video to generate, so the
page takes it straight back off the queue and says to restart `serve.py` (tested against the old
`serve.py` on a spare port). The home's Help (on `main`, `bfb881b`) has two CASV guides, **Start a
video from a script** (`casv-script`) and **Turn a photo into video** (`casv-animate`), with frames
captured from a demo script and the Palm Springs brochure in this checkout's `_test-media/`
(`palm-springs-demo-script.md`, `palm-springs-brochure.pdf`; git-ignored, needed to recapture).
When the Animate panel or From the script changes, change `help-content.js` on main and recapture
with `tools/help-capture/capture.py casv-script,casv-anim,casv-prompt`.

## Open project: a .casv file from disk (2026-11-19, by request)

The user: "add an open project button, because theres casv made by grok bots". Until now a `.casv`
only came back through CAS's Open in Video Studio (the inbox).

- `#openBtn` (top bar, after Start new, `ICS.folder`), `#emptyOpen` (the empty timeline's link) and
  a `.casv` dropped anywhere on the window (the drop handler looks for one before `addFiles`) all
  call `openProject(file)`; the picker is a hidden input made in JS (`accept=".casv"`).
- `openProject` reads it with `casUnpack`, asks when the timeline has anything, stores the file's
  media, keeps the replaced video in PREV and reloads. **Unlike the inbox it deletes no media**, so
  Reopen the last video brings the old one back whole.
- Not a project → a toast, nothing changes.
- Verified on :8797 with built files (no media): the wrong-file toast, the question, the project
  replaced and PREV written. Not run: a real drop, a file carrying media, the empty-card link, a
  bot-made file (nothing in the bot bridge writes a `.casv` yet — a direct hand-over tool is a
  separate step, on `main`).

## Redesign for clarity: named video, two menus, Selected · Brand · Queue (2026-11-19, by request)

The user: "with all these new feature built the UX is so confusing". Plan shown first, then built.

- **Top bar.** `#fileBtn` shows the video's name (`P.name`, else `P.cas.title`, else "Untitled
  video") and opens `#filePop`: rename (`#nameIn`, writes `P.name`), Start a new video, Open a
  project file, Start from a video script, Reopen the last video (`#prevBtn2` clicks `#prevBtn`),
  the theme switch. `#outBtn` (Export) opens `#outPop`: Export the video, Save this frame. **The
  old buttons keep their ids and handlers; they only moved into the menus** as `.vs-mi` rows.
  `popUnder` places a menu under its button (`popAt` places above, for the timeline's popovers).
- **Right rail tabs** read Selected · Brand · Queue (`rtab` values unchanged: sel / doc / gen).
  Brand is the old Whole video; Queue is the old Generate, still tabbed Animate / Voiceover / Music.
- **Nothing selected** offers Add footage / Add text / Add a graphic (`data-ltab` clicks the left
  tab) and Logos and QR code (`data-go2`).
- **Audio tab** has Voiceover and Music under "Or make one" (`data-mk` → `gtab`, `rtab = 'gen'`).
- **Animate** shows the camera move, length and one Generate button; model, quality, extra
  direction, people, the prompt and "Add it to the queue for Claude instead" are under More options
  (`details[data-acc=more]`, `moreOpen`; opened when Claude is asked to write the prompt).
- Verified on :8797 with real clicks: both menus, the tabs, the empty state, the Audio shortcuts,
  the folded Animate (1374 → 1083 px), the top bar at 1327 and 1280 (no overflow, no overlap).
  Not run: the light theme, phones, renaming by typing, an export from the new menu, the help
  page's CASV frames (they show the old top bar and tab names).

## The bot's door: VideoStudio.bot, and hand-overs that name who sent them (2026-11-19, by request)

The Grok bot's four video tools (`tools/studio-mcp/video.py` on **main**; see main's
`docs/notes/architecture.md`) drive this page in their own headless Chrome through
`window.VideoStudio.bot`: `ready`, `push`/`take` (files in, base64 pieces), `start(name, size)`,
`open(key)` (a .casv), `addMedia(key, name, type)` (library only — it undoes addFiles' "first video
goes on the timeline"), `edit(ops)` (add_clip, add_text, add_audio, set, remove, wordmark, size,
name; values checked against the studio's own lists), `summary()`, `pack()` + `chunk(i, n)` (out).
Text is stored plain (`**` is the only markup), never HTML-escaped.

- `serve.py`'s `/api/outbox/back` keeps `from`; `casInbox` asks "Open … from <from>?" for such a
  row and goes through `putProject` (shared with Open project): the open video is kept as PREV and
  no media is deleted. CAS's rows (no `from`) behave as before.
- **The user's running server (:8794) must be restarted to carry `from`** — an older one drops it
  and the hand-over reads as if CAS sent it (and replaces without keeping the last video).

## Time stretch on video clips and sounds (2026-11-19)

- A video clip carries `rate` (absent = 1). `clipLen(c) = (out - in) / rate`: the clip still covers
  `out - in` seconds of its file, played `rate` times as fast. Every reader of a clip's length goes
  through `clipLen`; the places that map timeline time to file time multiply by the rate (`sync`,
  the filmstrip, scene markers, `split`, the trims). Export records what `sync` plays, so it follows.
- Sounds already had `rate`; the range is now `ARATE` 50–200% (was 75–135%). `RATE` 75–135% stays as
  the natural-voice range: the voiceover's automatic fit uses it and the Speed note warns past it.
  Video is `VRATE` 25–400%. Pitch is kept (`preservesPitch`).
- One setter, `setRate(it, kind, r)`. Three ways in: Option-drag an end on the timeline
  (`drag.st`, single clip or sound; a group ignores it), the Speed section in Selected (`speedSec`:
  slider, Fit to exactly, Back to natural speed), and the bot's `speed` (percent) on `add_clip`,
  `add_audio` and `set` for a clip. Photos have no speed.
- Tested with synthetic pointer events for Option: the Browser pane's drag tool sends no modifier.
  The handle itself was proven reachable with a real pointer.
- The bridge's `video_edit` description on main does not mention `speed` yet.

## The Higgsfield library (2026-11-19)

- Media tab › **From Higgsfield** (and a link in the empty state, both `data-hf`) opens `#hfOv`:
  a grid of the account's finished videos, the chosen one playing beside it, All · 9:16 · 1:1,
  tick several, **Import** or **Import and add to timeline**, Load more (24 at a time, to 120).
- `serve.py`: `GET /api/hf/list?size=` runs `higgsfield generate list --video` (free, read-only)
  and remembers id → result URL in `HF_SEEN`; `GET /api/hf/file?id=` fetches that URL for the page.
  The page names only an id, never a URL. Thumbnails and the preview play straight from Higgsfield.
- Imported ids are kept in `localStorage['provident-video-hf']` (hf id → media id) so a tile reads
  "Imported" and a second import reuses the file.
- While it is open no timeline shortcut fires (keydown returns early); Esc and a click on the
  backdrop close it.
