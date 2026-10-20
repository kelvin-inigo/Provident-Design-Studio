---
name: hub-design-queue
description: Pick up a post the Content Hub has queued for design, lay it out in OPS (Organic Post Studio) as a carousel, export it and send the pages back so the post moves to Ready to publish. Use when the user runs /hub-design-queue, or asks to "check the design queue", "do the hub jobs", "design the posts approved in the hub", or names a hub card to design.
---

# Hub design queue → OPS → back to the hub

The Content Hub (`http://192.168.50.30:8090`, office network) puts a social post on the design
queue when someone presses **Approve and send to design**. That only queues it — this skill is
what designs it. You claim the job, lay the copy out in OPS through the **provident-studio** MCP
tools, check it, export it, and post the pages back with the post's card id. The hub then
attaches them to the post and moves it to **Ready to publish**.

Everything that talks to the hub goes through `scripts/hub.py` (Python 3 standard library):

```bash
H="<this skill's folder>/scripts/hub.py"
python3 "$H" jobs                 # what is waiting
python3 "$H" claim <card_id>      # claim, write the OPS draft, download the brief images
python3 "$H" deliver <card_id> <session.smpstudio.json> <export folder>
python3 "$H" status <card_id>     # design: delivered · status: publish when it worked
```

## Before you start

- **The token.** `hub.py` reads `HUB_IMPORT_TOKEN` from the environment, else the first line of
  `~/.config/provident/hub-token`. If neither is set it says so: ask the user for the hub's
  `HUB_IMPORT_TOKEN` and write it to that file with `chmod 600`. **Never put the token in the
  repository, a project file, a message or a commit** — the repository is public.
- **The tools.** `studio_read_project`, `studio_edit`, `studio_set_image`, `studio_preview` and
  `studio_export` come from the provident-studio MCP server (`tools/studio-mcp/`). If they are
  missing, tell the user to run `sh tools/studio-mcp/install.sh` and restart Claude.

## The run

1. **List** — `hub.py jobs`. Show the user each job: card id, title, format, platforms, how many
   slides and brief images. Let them pick one (if there is exactly one, confirm it). Jobs marked
   `in_progress` are claimed by someone already — say who, and only take one if the user says so.
   **Do not claim a job the user did not choose**: claiming shows "In design" in the hub.
2. **Claim** — `hub.py claim <card_id>`. It writes, into
   `~/Documents/Provident Studio/Hub <id> - <title>/`:
   - `<title>.smpstudio.json` — the OPS carousel draft, `state.hubCardId` set, one page per slide:
     the first slide on a **Front page** (`cfront`), the middle ones on **Text** pages (`ctext`,
     split at the copy's own break into title and body), the last on the **Call to action**
     (`ccta`, the "link in bio" part moved into the button);
   - `brief/` — the brief images, and `job.json` — the whole job (copy, caption, brief, links).
   It prints all of that as JSON. Read it.
3. **Fix the copy** — `studio_read_project` on the session lists every page's fields and what is
   still missing. Then `studio_edit` with `{op:'fields', slide:i, fields:{…}}`:
   - Every **required** field must be filled: a Text page's `body`, the CTA's `small` (lead line),
     `big` and `button`. Write them **from the job's own words** — the slide text, the caption,
     the LinkedIn text, the brief. Never invent a number, price, date, name or claim.
   - A middle slide that is one number with a line under it reads better as **Big number**
     (`{op:'layout', slide:i, kind:'cnum'}` then `fig` + `label`); a list as **Bullets** (`cbul`).
     Use the other layouts the same way when the copy is that shape (`studio_catalog` lists them).
   - Keep the hub's wording; trim only to fit. Title Case is the templates' job, not yours.
   - `customName` is the file name — the hub title is set; shorten it if it is long.
4. **Pictures** — put the brief images on the pages: `studio_set_image` with
   `slot: 'smp-bg-<slide id>'` (the summary lists each page's slot) and the downloaded file. The
   front page gets the strongest one. With no brief images, say so and leave the photos empty —
   do not use a stock photo unless the user gives one.
5. **Look** — `studio_preview` (feed, every page). Check that nothing is cut off, every page has
   copy, and the CTA reads as one call. Fix and look again. Show the user the previews and wait
   for their go-ahead before sending.
6. **Export** — `studio_export` with `format: 'jpg'` and `include_assets: true`. It writes the
   JPGs beside the session file (feed `_3x4`, plus `_9x16` if the story is shown).
7. **Deliver** — `hub.py deliver <card_id> <session> <folder>`. It posts the session JSON as
   `content` plus every image in the folder as `images`, with `X-Card-Id`. It refuses unless the
   hub answers 201 **with** `card_id` set, then prints the post's state: expect
   `design: delivered` and `status: publish`. Pass the export folder, not the project folder, if
   the brief images sit in the same tree — `deliver` sends every image in the folders you name.
8. **Tell the user** the card id, the title, how many pages went, and that it is in Ready to
   publish. If anything was left empty or guessed, say which page.

## When it goes wrong

- `HTTP 401` — wrong or missing token. `409` on claim — the job was already delivered.
- `Could not reach the hub` — not on the office network, or the hub is down.
- `studio_export` refuses — it names the missing fields; fill them and export again.
- Delivered but `card_id` is null — the hub did not match the card; check the id and send again
  (a second delivery replaces the first on the post).

## Also in the studio itself

A project opened from a hub draft keeps `state.hubCardId`, and both studios' **Share › Send**
send it as `X-Card-Id` — so a designer can finish the same draft by hand in OPS (Open Session on
the `.smpstudio.json`) and Send attaches the pages to the post just the same.
