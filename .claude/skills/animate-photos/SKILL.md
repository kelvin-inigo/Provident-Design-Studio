---
name: animate-photos
description: Turn the photo clips queued in the Provident Video Studio into video with Higgsfield Cinema Studio and put the finished clips back on the timeline. Use when the user runs /animate-photos, or asks to "animate the photos", "run the animate queue", "generate the queued clips" or "turn the photos into video" for the Video Studio.
---

# Animate queue → Higgsfield → back on the timeline

In the Video Studio a user selects a photo clip, picks a camera move and presses **Send to the
animate queue**. That only queues it. This skill generates each queued photo as a video with
Higgsfield and hands the MP4 back; the studio, which watches the queue through its local server,
swaps the photo clip for the video on its own.

**Decide nothing except the prompts you are asked to write.** The studio wrote the length, size,
model and a full 14-section prompt into each job. A job with `write_prompt: true` asks you to look
at its start frame and rewrite that prompt from what you see (step 2); every other job's prompt is
used **verbatim**. Never pick a model other than the job's, never open a photo whose job does not
ask for a prompt, and **never open the finished videos**. Follow the steps and report.

The queue holds two kinds of job:
- **Prompt to write** (`status: "describe"`): free, nothing is generated. You write the prompt,
  the studio puts it in the clip's Prompt box, and the user generates later.
- **Video** (`status: "queued"`): generated in steps 3–7. If it also has `read: true`
  (`write_prompt: true`), write its prompt in step 2 first.

Everything that touches the queue goes through `scripts/animate.py` (Python 3 standard library):

```bash
A="<this skill's folder>/scripts/animate.py"
python3 "$A" list                     # queued jobs and prompts to write, one JSON object per line
python3 "$A" prompt <id> <file.json>  # store the prompt you wrote ({"prompt", "sheet", "words"})
python3 "$A" start <id> <job_id>      # mark as generating
python3 "$A" done  <id> <video_url>   # download the MP4, mark done (the studio then places it)
python3 "$A" fail  <id> <reason>      # mark failed; the studio shows the reason on the clip
```

## Steps

1. **Read the queue.** `python3 "$A" list`. Each line has `id`, `status`, `photo_path`, `prompt`,
   `duration` (seconds), `aspect` (`9:16` or `1:1`), `mode` (`std` or `pro`), `model`,
   `write_prompt`, and from CASV also `move`, `move_phrase`, `note` and `people`. No lines: say so and stop.

2. **Write the prompts from the photos** (every line with `write_prompt: true`; free, no credits).
   The studio's server now writes prompt-to-write jobs itself within a minute (Claude Code
   headless); one still listed here means that did not run, so write it as below.
   For each one, Read its `photo_path` and follow
   `../photo-to-video-prompt/SKILL.md` (Pass 1 sheet, Pass 2 word bank, Pass 3 prompt with all 14
   headings, then its checks). These CASV rules override the framework:
   - **The camera move is the user's.** CAMERA starts with `move_phrase` as written; add only the
     shadow-side placement and the colour words. Do not pick another move.
   - **Length and size are the job's:** ACTION's three beats add up to `duration`.
   - **`note`** (if any) is the user's extra direction: work it into SCENE CONTEXT or ACTION.
   - **`people: false`** means the user sees no one: PERFORMANCE reads "No people in frame; none
     appear." If you do see people, write them in anyway and say so in the report.
   - **AUDIO** is always: "Natural sound of the environment in each scene, every interaction with
     the environment, accurate sound details." followed by the ambience you would pick (the user's
     standing sound rule).
   - **POSITIVE LOCKS** always ends: "No new people, objects, text or logos appear."
   - **2,500 characters at most** (`prompt` refuses longer).

   Write `{"prompt": "...", "sheet": "<Pass 1, short>", "words": "<Pass 2>"}` to a file in your
   scratchpad and run `python3 "$A" prompt <id> <that file>`. A prompt-to-write job is then
   finished (the studio picks it up within a few seconds); a video job continues below with the
   new prompt. Do not paste the sheets or prompts into the reply: the user reads them in the
   studio's Prompt box. If the frame is unreadable, `python3 "$A" fail <id> <reason>`.
   **Only prompts to write in the queue: report and stop here** (no cost step).

3. **Show the cost and get a yes.** Generating spends the user's Higgsfield credits. Call
   `generate_video` once with `get_cost: true` and the settings from step 5 (one check per
   distinct model, duration and mode in the queue; no upload is needed for a cost check if the tool allows it, otherwise do step 4
   first). Tell the user: how many clips, the credits each, the total. **Wait for a clear yes**
   unless the message that started this run already said to go ahead and spend. Never use
   `use_unlim` or `use_free_gens` unless the user asked for that in words.

4. **Upload the photos.** One `media_upload` call with `files: [{ filename: "<id>.jpg" }, …]`,
   then PUT each `photo_path` to its `upload_url` with curl exactly as the tool's result says,
   then one `media_confirm` with all the media ids (`type: "image"`). Proceed only when every
   PUT returned 200.

5. **Generate.** Settings come from the job's `model` and `mode`; nothing else varies.

   Every job: `prompt` = the job's `prompt` verbatim (for a job you wrote in step 2, the prompt you stored), `duration` = the job's `duration`,
   `aspect_ratio` = the job's `aspect`, `medias` = `[{ "role": "start_image", "value": "<media id>" }]`.

   | job `model` | job `mode` | extra params | size | credits per second |
   |---|---|---|---|---|
   | `cinematic_studio_video_v2` (or none) | `std` (or none) | `sound: "on"`, `mode: "std"` | 720x1280 | 1.5 |
   | `cinematic_studio_video_v2` | `pro` | `sound: "on"`, `mode: "pro"` | 1080x1920 | 2 |
   | `kling3_0` | `std` | `sound: "on"`, `mode: "std"` | 720x1280 | 1.75 |
   | `kling3_0` | `pro` | `sound: "on"`, `mode: "pro"` | not measured | 2 |
   | `seedance_2_5` | `std` | `mode: "omni_reference"`, `resolution: "720p"`, `bitrate_mode: "standard"`, `generate_audio: true` | 720p | 7 |
   | `seedance_2_5` | `pro` | `mode: "omni_reference"`, `resolution: "1080p"`, `bitrate_mode: "high"`, `generate_audio: true` | 1080p | 16 |

   Sound is always ON (since 2026-11-13): the job's prompt asks for natural environment sound and the studio plays it under its own music. The credit figures were measured on
   2026-11-13; the cost check in step 3 is what you quote.

   One job: `generate_video`. Two to twelve: `generate_video_batch`, one item per job (load its
   schema with ToolSearch first; same settings). More than twelve: groups of twelve.
   Follow whatever the Higgsfield tools' own descriptions require before a first generation
   (preferences, destination folder). As soon as a job id comes back, run
   `python3 "$A" start <id> <job_id>` so the clip in the studio reads "Generating…".
   On a transport timeout do **not** resubmit; the job may already be running.

6. **Wait.** `jobs_wait` with all the job ids, repeating after its `poll_after_seconds` until
   everything is terminal. A clip usually takes a few minutes. Do not open a widget per job.

7. **Hand back.** For each finished job run `python3 "$A" done <id> <result video url>`. For
   each one that failed, `python3 "$A" fail <id> <short reason>`. The studio picks the result up
   within a few seconds if its page is open; if it is closed, the clip is placed the next time
   the page loads.

8. **Report** in two or three lines: how many prompts were written from photos, how many clips
   were generated, how many failed and why, the credits spent. Do not describe the videos — you have not watched them.

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
