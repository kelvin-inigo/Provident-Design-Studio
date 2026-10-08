# tools/meta-ads — Meta Ads Kit, wired to CAS

Two halves:

| | what it is |
|---|---|
| `kit/` | [TheMattBerman/meta-ads-kit](https://github.com/TheMattBerman/meta-ads-kit) vendored at commit `dffa0da` (MIT, see `kit/LICENSE`): agent skills plus a bash adapter over **Meta's official Ads CLI** (`meta`, PyPI `meta-ads`). Daily check, bleeders, winners, fatigue, budget recommendations, copy generation, Pixel/CAPI audit, PAUSED-only upload. |
| `cas-to-meta.py` | the bridge from a **Campaign Ads Studio** export to a validated, PAUSED-only upload plan. |

## Setup (once per Mac)

```bash
bash tools/meta-ads/install.sh
```

Installs the `meta` CLI with uv (Python 3.12), creates `kit/.env` and `kit/ad-config.json`
(both git-ignored) and runs the kit's doctor. It starts in **mock mode** with sample data.

To go live, edit `tools/meta-ads/kit/.env` yourself:

```
ACCESS_TOKEN=          # a Meta system-user token with ads_read (+ ads_management to upload)
AD_ACCOUNT_ID=act_…
META_KIT_MODE=live     # reports only; uploads still need the approval step below
META_PAGE_ID=          # the Facebook Page the ads run as
META_ADSET_ID=         # the ad set CAS uploads go into
```

Never commit that file and never paste a token into a chat — the repo is public.

## Reports

```bash
cd tools/meta-ads/kit
./run.sh daily-check      # the five questions: pacing, campaigns, 7-day, winners/bleeders, fatigue
./run.sh bleeders | winners | fatigue | efficiency | recommend | pacing
```

Read-only. Snapshots land in `kit/local/outputs/` (git-ignored).

## From CAS to Meta

1. **In CAS** (Meta ads platform): the **Publish** tab → **Meta ad text** — up to 5 primary texts (125 shown,
   500 max), 5 headlines (40), 5 descriptions (30), the button and the https destination link.
   The dock's *Meta ad text* group and the canvas bar's chip show whether it is ready.
2. **Export JPEG or PNG** into the source folder. Beside `Variant A/…_feed.jpg` and `…_Story.jpg`
   CAS now writes `<name>_Meta upload.json` (only once some Meta text exists).
3. **Run the bridge** on that folder:

   ```bash
   python3 tools/meta-ads/cas-to-meta.py "<source folder>" [--page-id … --adset-id …]
   ```

   It checks every text against Meta's limits and every image (exists, JPEG/PNG, ≥600px,
   ≤30 MB, a Meta ratio), skips the Eventbrite banners, and writes `<folder>/Meta upload/`:
   `plan.json` and one `Variant X.commands.sh` per variant — the exact
   `meta ads creative create … --status PAUSED` and `meta ads ad create … --status PAUSED`
   calls. It also records the kit's own PAUSED-only dry-run artifact. **It uploads nothing.**
4. **Upload, after approval** — a person runs the generated script with the kit's approval
   convention; without it the script refuses:

   ```bash
   META_KIT_MODE=live-approved META_KIT_APPROVAL_ID="Sara 2026-10-08" bash "<folder>/Meta upload/Variant A.commands.sh"
   ```

   The creative and the ad are created **PAUSED**. Activate in Ads Manager after review.

Notes:
- Feed + story (or several texts) make a **Dynamic Creative**, which Meta only runs in an ad set
  created with `--dynamic-creative`. One image and one of each text makes a standard creative.
- A **carousel** is validated but not scripted (it needs uploaded image hashes and a
  `child_attachments` spec); use the kit's `ad-upload` skill for it.
- The Studio MCP server takes the same text: `studio_edit` op `meta_text`.

## Updating the kit

```bash
git clone --depth 1 https://github.com/TheMattBerman/meta-ads-kit /tmp/mak
rsync -a --delete --exclude .git --exclude .env --exclude ad-config.json --exclude local /tmp/mak/ tools/meta-ads/kit/
```

Then update the commit above. The kit's `scripts/` are unmodified; nothing here patches them.
