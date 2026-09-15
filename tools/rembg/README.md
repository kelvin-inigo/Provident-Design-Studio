# Background removal for the Organic Studio

Every agent photo in `Provident Organic Studio.dc.html` is drawn as a **cut-out**.
The ranking card stands the portrait above its own white ground, the texture and
the giant numeral, so a rectangular photo covers all three; the listed card's
agent and the review card's agent are clipped to a window and framed on the face.
Until now the studio asked the user to supply a transparent PNG and had no way to
make one.

This is that way. [danielgatis/rembg](https://github.com/danielgatis/rembg) runs as
a small service on loopback, and the studio calls it as a photo goes into the
store.

## Install

```sh
./tools/rembg/install.sh     # once, ~10 min on a good connection
./tools/rembg/serve.sh       # leave running while you work
```

Nothing goes system-wide and nothing needs admin. `install.sh` fetches `uv` to
`~/.local/bin`, builds a private Python 3.13 in `tools/rembg/.venv`, installs
rembg from `src/rembg-main`, and downloads the weights.

| | where | size |
|---|---|---|
| `uv` | `~/.local/bin/uv` | 36MB |
| Python + rembg + onnxruntime | `tools/rembg/.venv` | 390MB |
| model weights | `~/.rembg` | **1.1GB** |

`./tools/rembg/uninstall.sh` removes all of it.

The studio notices the service starting or stopping **within 15 seconds, with no
reload** — the drop zones say which state they are in.

## Why a service and not something in the document

The studio is one `.dc.html` that opens straight off the disk with no build step,
which is why its fonts and template art are base64'd into it. A 1.1GB model plus
an ONNX runtime cannot go in there, and there is no JS toolchain on this machine
to bundle a WASM build with even if it could.

So this is a **capability, never a requirement**. With the service off, every
upload behaves exactly as it did before and the studio still works offline with
nothing installed. That property is the whole reason the studio is a single file
and this must not erode it.

## Quality — measured, not assumed

The request was "no fuzzy edges". rembg offers four edge treatments; all four
were run on Provident's own studio portraits (dark suits against a dark wall, and
a ponytail against it). What "fuzzy" actually is: a semi-transparent edge pixel
keeps the **backdrop's colour** mixed into it, so the subject carries a dark halo.

Measured on one portrait — how far an edge pixel's colour has been pulled toward
the backdrop, and how many edge pixels end up notably darker than the subject
beside them:

| mode | soft edge px | colour drift | dark halo |
|---|---|---|---|
| `naive` | 7 815 | 16.16 | **16.3%** |
| `decontaminate` | 7 815 | 7.90 | 0.7% |
| `alpha_matting` | 13 274 | 7.60 | 1.3% |
| **`vitmatte` (shipped)** | 12 977 | 10.72 | **1.7%** |

`naive` is the halo, one edge pixel in six. Both `decontaminate` and `vitmatte`
remove it.

**`alpha_matting` measures well and looks worst, which is why the numbers are not
the whole story.** It widens the soft band by 70% and the extra is invented — a
visible grey frizz around shoulders and hair in the side-by-side renders. Do not
turn it on. `vitmatte` widens the band too, but there the extra pixels are real
hair, which is why it reads clean.

`vitmatte` ships. It costs one extra 1024x1024 inference over `decontaminate`;
`--refine decontaminate` is the fallback when the wait matters more.

## Why the 977MB model, when a 170MB one is 5x faster

ViTMatte does the edge work whatever produced the coarse mask, so on a single
figure all three segmenters look alike. They differ on **who to keep**. On a
portrait cropped out of a group shot:

| model | size | per photo | result |
|---|---|---|---|
| **`bria-rmbg` (shipped)** | 977MB | 12–19s | the subject alone |
| `isnet-general-use` | 170MB | 2.6–3.4s | kept a whole second person from the background |
| `u2net_human_seg` | 168MB | 2.0s | same |

Agent photos are routinely shot in an office or at an event with colleagues
behind them, so that is the common case, not an edge case. `--model
isnet-general-use` is there for anyone who only ever shoots on a clean backdrop.

**CoreML was tried and rejected.** `--provider coreml` stalls indefinitely
compiling a 977MB BiRefNet — 0% CPU, no progress after ten minutes. The flag is
kept only so the next reader does not have to re-derive why a Mac tool is not
using the Neural Engine. It may be worth trying with a smaller model.

## What it does to an upload

Drop a photo on an agent slot and the slot spins with "Removing the background…"
for about 12 seconds, then fills with the cut-out. Downstream nothing knows: what
reaches `providentEncodeFile` is an ordinary PNG with alpha.

Two guards matter:

* **An upload that is already a cut-out passes straight through**, byte for byte,
  in about 10ms. Re-running the model on a hand-made alpha channel could only
  damage it. The test is more than 2% fully-transparent pixels.
* **A failure never costs the upload.** The service being off is silent; anything
  else says why and keeps the original photo. The photo is what the user has —
  the cut-out is a convenience on top of it.

## Which slots

The document opts in with `data-cutout`; the runtime only provides the
capability. Four slots, all agents:

| slot | where |
|---|---|
| `smp-agent` | the listed card's agent, project level |
| `smp-agent-r<id>` | the review card's agent, per slide |
| `smp-bg-<id>` on a `tagent` slide | a ranking portrait — both the form and the canvas |

Background photographs, QR codes and the partner mark are deliberately untouched,
and `Provident Campaign Studio.dc.html` mounts no such slot at all. The parallax
cut-out on the listed card (`smp-fg-<id>`) is the one obvious candidate left out:
it is a cut-out of the *picture's* foreground rather than an agent, and it is one
attribute to add if it is wanted.

## The vendored copy is TRIMMED

`src/rembg-main` holds only what pip needs to build the package — `rembg/`,
`pyproject.toml`, `README.md`, `LICENSE.txt` (MIT) and `MANIFEST.in`. The upstream
repo's own `.github/workflows`, Dockerfiles, Windows installer scripts, notebook and
test suite were dropped rather than committed into this one: they would never run from
a subdirectory, and another project's CI config in this repo is noise. 4.8MB -> 244KB.
The full repo is at https://github.com/danielgatis/rembg if any of it is ever wanted.

Verified after trimming: `uv pip install ./src/rembg-main[cpu]` still builds and
`remove` / `new_session` / `vitmatte_alpha` all import.

## API

```
GET  /health    {"ok":true,"model":"bria-rmbg","refine":"vitmatte",...}
POST /cutout    raw image bytes in, image/png with alpha out
```

Loopback only, CORS open to `*` (the studio's origin is `null` when the document
is opened from the disk). `--port`, `--model`, `--refine`, `--provider`; the
studio's end is `localStorage['provident-cutout-url']` if the port ever moves.
