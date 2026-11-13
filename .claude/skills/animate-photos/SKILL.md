---
name: animate-photos
description: Turn the photo clips queued in the Provident Video Studio into video with Higgsfield Cinema Studio and put the finished clips back on the timeline. Use when the user runs /animate-photos, or asks to "animate the photos", "run the animate queue", "generate the queued clips" or "turn the photos into video" for the Video Studio.
---

# Animate queue → Higgsfield → back on the timeline

In the Video Studio a user selects a photo clip, picks a camera move and presses **Send to the
animate queue**. That only queues it. This skill generates each queued photo as a video with
Higgsfield and hands the MP4 back; the studio, which watches the queue through its local server,
swaps the photo clip for the video on its own.

**Decide nothing.** The studio already wrote the full prompt, the length and the size into each
job. Do not rewrite the prompt, do not pick a model other than the job's, and **do not open the photos or the
finished videos to look at them** — the whole point of this skill is that it costs a few short
tool calls per photo. Follow the steps and report.

Everything that touches the queue goes through `scripts/animate.py` (Python 3 standard library):

```bash
A="<this skill's folder>/scripts/animate.py"
python3 "$A" list                     # queued jobs, one JSON object per line
python3 "$A" start <id> <job_id>      # mark as generating
python3 "$A" done  <id> <video_url>   # download the MP4, mark done (the studio then places it)
python3 "$A" fail  <id> <reason>      # mark failed; the studio shows the reason on the clip
```

## Steps

1. **Read the queue.** `python3 "$A" list`. Each line has `id`, `photo_path`, `prompt`,
   `duration` (seconds), `aspect` (`9:16` or `1:1`) `mode` (`std` or `pro`) and `model`. No lines: say so and stop.

2. **Show the cost and get a yes.** Generating spends the user's Higgsfield credits. Call
   `generate_video` once with `get_cost: true` and the settings from step 4 (one check per
   distinct model, duration and mode in the queue; no upload is needed for a cost check if the tool allows it, otherwise do step 3
   first). Tell the user: how many clips, the credits each, the total. **Wait for a clear yes**
   unless the message that started this run already said to go ahead and spend. Never use
   `use_unlim` or `use_free_gens` unless the user asked for that in words.

3. **Upload the photos.** One `media_upload` call with `files: [{ filename: "<id>.jpg" }, …]`,
   then PUT each `photo_path` to its `upload_url` with curl exactly as the tool's result says,
   then one `media_confirm` with all the media ids (`type: "image"`). Proceed only when every
   PUT returned 200.

4. **Generate.** Settings come from the job's `model` and `mode`; nothing else varies.

   Every job: `prompt` = the job's `prompt` verbatim, `duration` = the job's `duration`,
   `aspect_ratio` = the job's `aspect`, `medias` = `[{ "role": "start_image", "value": "<media id>" }]`.

   | job `model` | job `mode` | extra params | size | credits per second |
   |---|---|---|---|---|
   | `cinematic_studio_video_v2` (or none) | `std` (or none) | `sound: "off"`, `mode: "std"` | 720x1280 | 1 |
   | `cinematic_studio_video_v2` | `pro` | `sound: "off"`, `mode: "pro"` | 1080x1920 | 1.5 |
   | `seedance_2_5` | `std` | `mode: "omni_reference"`, `resolution: "720p"`, `bitrate_mode: "standard"`, `generate_audio: false` | 720p | 7 |
   | `seedance_2_5` | `pro` | `mode: "omni_reference"`, `resolution: "1080p"`, `bitrate_mode: "high"`, `generate_audio: false` | 1080p | 16 |

   Sound is always off: the studio adds its own music. The credit figures were measured on
   2026-11-13; the cost check in step 2 is what you quote.

   One job: `generate_video`. Two to twelve: `generate_video_batch`, one item per job (load its
   schema with ToolSearch first; same settings). More than twelve: groups of twelve.
   Follow whatever the Higgsfield tools' own descriptions require before a first generation
   (preferences, destination folder). As soon as a job id comes back, run
   `python3 "$A" start <id> <job_id>` so the clip in the studio reads "Generating…".
   On a transport timeout do **not** resubmit; the job may already be running.

5. **Wait.** `jobs_wait` with all the job ids, repeating after its `poll_after_seconds` until
   everything is terminal. A clip usually takes a few minutes. Do not open a widget per job.

6. **Hand back.** For each finished job run `python3 "$A" done <id> <result video url>`. For
   each one that failed, `python3 "$A" fail <id> <short reason>`. The studio picks the result up
   within a few seconds if its page is open; if it is closed, the clip is placed the next time
   the page loads.

7. **Report** in two or three lines: how many were generated, how many failed and why, the
   credits spent. Do not describe the videos — you have not watched them.

## If something is off

- **`list` cannot find the studio**: set `VIDEO_STUDIO_QUEUE` to the `_animate` folder beside
  `Provident Video Studio.html` (print the folder it is using with `python3 "$A" where`).
- **The studio page shows "Could not reach the local server's animate queue"**: its server is
  not running or is an old copy. Start `python3 tools/video-dev/serve.py` from the Video Studio
  checkout.
- **Higgsfield rejects the model or a setting**: call `models_explore` with
  `action: "get"` and the job's model id once, adjust only the setting it
  names, and tell the user what changed. If the model is gone, stop and ask which to use.
- **The result needs a different move**: that is the user's call in the studio — they pick
  another move on the clip and queue it again.
