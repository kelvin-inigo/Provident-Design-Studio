# Handover: connecting CAS to the task app

This is for the Claude thread building the task app. It covers what CAS is and what it already
offers to connect to, so you don't have to read CAS's 1.3 MB page. Last checked 2026-10-21
against the CAS repository's code and `CLAUDE.md`.

## Key facts

- **CAS is hosted** at https://provident-design-studio.vercel.app. The repo,
  `github.com/kelvin-inigo/Provident-Design-Studio`, is **public**. CAS also opens straight
  from the disk. It has no sign-in and does not use the Provident OS login.
- **CAS can already send an export to a server** (Share › Send, below), and it can already
  tag that send with an external id (`X-Card-Id`). A task link can follow the same pattern.
- **No secrets in the repo.** Every token and URL CAS uses is stored per computer, in the
  browser's `localStorage`.

## What CAS is

- **CAS** (Campaign Ads Studio) is `Provident Campaign Studio.dc.html`. **OPS** (Organic Post
  Studio), its sister for organic posts, is `Provident Organic Studio.dc.html`. Both are
  single-file web apps with no build step. Shared code lives in `studio-base.js` and `runtime.js`.
- CAS makes Meta ads. A project has up to 3 design variants, or a carousel of up to 10 pages.
- **Sizes per variant:**
  - Feed 1:1 and Story 9:16.
  - Horizontal 1.91:1 and two Eventbrite banners, each turned on per variant.
  - Portrait 3:4, off by default.
  - A temporary Portrait Fix.
- A project is a **session file**, `<name>.adstudio.json`, holding `{app, v, state, images}`.
  The source photos are embedded, so a file is often 10–30 MB.
- **Exports go into a source folder** the user picks:
  - Renders land in `Variant A/<name>_Variant A_feed.jpg` and so on, flat inside each
    variant folder.
  - The session file and `Assets/` sit at the root.
  - Each export overwrites the last.
- **Each browser tab is its own workspace** (`?ws=<id>`), so parallel sessions don't
  overwrite each other.
- **The Copy workspace has a status:** Draft → With design → Final, with snapshots. That is
  the nearest thing CAS has to a review stage. A task's "In review" state could follow it.

## Connection points that already exist

### 1. The MCP server `provident-studio` (`tools/studio-mcp/`)

It is a Python server using only the standard library, registered in Claude Desktop and
Cowork. It drives the real studio page in a private headless Chrome, so the artwork is
never reimplemented.

| tool | does |
|---|---|
| `studio_catalog` | lists templates, components and fields |
| `studio_new_project` | creates a project from a template (writes a session file) |
| `studio_read_project` | reads a session file's words, sizes and variants |
| `studio_edit` | edits copy, components, sizes and variants |
| `studio_set_image` | sets a photo (cuts out agent photos where the slot asks for it) |
| `studio_preview` | returns rendered images |
| `studio_export` | writes the final files |

A task-app connector beside it would let one Cowork request read a task, build the ad and
update the task, with no change to CAS.

### 2. Share › Send (CAS and OPS)

The contract is in `docs/studio-endpoint.md`. Send runs the normal export and POSTs it as
`multipart/form-data`:

- `content`: the session `.json`
- `images`: one part per exported image, under the export's own file name
- Headers:
  - `Authorization: Bearer <token>`
  - `X-Source: Design system`
  - `X-Card-Id: <id>` when the project carries a Content Hub card id (`state.hubCardId`)

**Limits.** The current receiver, the LAN import hub at
`http://192.168.50.30:8090/api/imports`, takes 50 MB and 50 images. Over the size limit,
Send re-encodes the images as JPEG until they fit. The URL and token are stored per
computer.

**The hub also reads back.** The project browser's **From the hub** view lists the imports
the hub received and reopens one as a project.

**What a task app needs to accept Send:**

- the same multipart shape, or a receiver that adapts to it
- CORS for the Vercel origin
- a Bearer token
- https. An https page cannot reach a plain-http address without Chrome's local-network
  prompt. That prompt is fine for the LAN hub but not for a production service.

**Precedent for a task id.** `hubCardId` is an id stored in the project and sent as a
header. A `state.taskId` sent as `X-Task-Id` would be the same few lines.

### 3. The session file

Any service can read `{app, v, state, images}`. `state` holds the campaign name, the
variants and the components' copy. It also holds a stable project id, `state.pid`, which
survives saves and renames. A link from a task to "its" CAS project should key on `pid`.

## Constraints

- **Don't embed CAS in another site.** Saving to the source folder (the File System Access
  API) mostly fails in an iframe, and the page is very large.
- **Changing CAS is costly.** It is one large file with a lot of verification history behind
  it. Work in the task app, the MCP server or a small field in the Send panel is cheaper than
  new screens in CAS.
- **CAS has no user identity.** "Your name" in the Copy view is a free-text label. Per-user
  permissions have to come from the task app or from Provident OS.

## Suggested order

1. **Links both ways.**
   - Store `state.taskId` on the CAS project. It is saved in the session file, the MCP
     server can read it, and `hubCardId` is the model to copy.
   - Store the CAS `pid` on the task.
2. **A task-app MCP connector** beside `provident-studio`, so Cowork can go from task to ad
   to attachments to status in one request.
3. **Later, if wanted:** Send posts to the task app's endpoint with the task id. This builds
   on the existing Send rather than adding a new feature.
4. **Provident OS sign-in** for the task app is independent of CAS and can wait.

## Open questions for the user

- Is the goal a handoff ("this task's ad is done, here are the files") or one place to do
  everything?
- Which address and backend will the task app use (for example Supabase, or
  `tasks.provident.estate`)?
- Should a CAS project know its task, or only the task know its project?

## Files to read

- `CLAUDE.md`: the full engineering record. It is long, so search it rather than read it end
  to end.
- `CAS-OPS-GUIDE.md`: the user guide.
- `docs/studio-endpoint.md`: the Send contract.
- `tools/studio-mcp/README.md` and `page.js`: the MCP server and the engine methods it calls.
- `.claude/skills/hub-design-queue/`: how a hub card's id travels from a claim into the
  project and back out on Send. This is the closest existing model for a task id.
