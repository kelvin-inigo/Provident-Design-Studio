# The Grok bot: letting it work in CAS and OPS

The Grok bot the team already talks to (its instructions: `GROK-BOT-INSTRUCTIONS.md`) can only
explain the studios and draft copy. This gives it hands: the same studio tools Claude has in
Cowork — start a project from a template, fill the words, drop in pictures, look at it, export —
served over HTTPS from one Mac in the office, so Grok can call them from anywhere. The studio
itself does the work in a headless Chrome on that Mac; a render there IS the export.

What it does **not** do yet: anything on the home page — tickets, Status, hand-offs, copy checks,
Drive. Those name a signed-in person, and the bot has no Google identity (see *Sign-in* below).
That is the second phase.

## What you need

| | why |
|---|---|
| **A Mac that stays on**, with Google Chrome | the studio renders there. The Mac that runs background removal (`tools/rembg`) is the natural one — the bot's agent photos are cut out by it too |
| **A Grok plan with custom connectors** | custom MCP connectors are on Grok's paid tiers. On Grok **Business / Enterprise** a team admin provisions the connector in xAI's console first; on **SuperGrok** you add it yourself at grok.com › Connectors |
| **A tunnel with a fixed address** | Grok must reach the Mac over https. Either **ngrok** (free account → one free static domain, e.g. `provident-studio.ngrok-free.dev`) or **Cloudflare Tunnel** on a domain you own. The Content Hub already uses an ngrok domain, so the team knows the pattern |
| **15 minutes on that Mac** | the steps below |

Nothing in these steps goes into the repository: tokens, the tunnel account and the public address
live on that Mac only (the repo is public).

## 1. Install the service on the Mac

```bash
sh "tools/studio-mcp/install-remote.sh"
```

It copies the studios into `~/Library/Application Support/Provident/studio-remote/repo` (a login
item cannot read `~/Documents`), registers a login item on port 7313 and prints the **first token**
(for you). Run it again after every `git pull` — that is how a studio change reaches the bot.

Projects the bot makes, and their exports, land in
`~/Library/Application Support/Provident/studio-remote/projects/<project>/`. They are ordinary
session files: **Open a post file…** / **Open a project file…** in the studio opens them for
hand-finishing.

## 2. Put it on the internet

**ngrok** — sign up at ngrok.com, claim your free static domain (Domains › New), install ngrok
(`brew install ngrok` or the download), then on the Mac:

```bash
ngrok config add-authtoken <your authtoken>
```

```bash
sh "tools/studio-mcp/install-remote.sh" --tunnel ngrok provident-studio.ngrok-free.dev
```

**Cloudflare Tunnel** — `brew install cloudflared`, then `cloudflared tunnel login`,
`cloudflared tunnel create provident-studio`, `cloudflared tunnel route dns provident-studio studio.yourdomain.com`, and:

```bash
sh "tools/studio-mcp/install-remote.sh" --tunnel cloudflared studio.yourdomain.com
```

Either way the tunnel becomes a second login item, and the service learns its public address.
Check: `https://<your host>/health` answers `{"ok": true, …}`.

## 3. One token per person

```bash
sh "tools/studio-mcp/install-remote.sh" --token "Sana"
```

prints the token **once**, with the connector address that carries it:
`https://<your host>/t/<token>/mcp`. Treat it like a password: whoever holds it can make and
export artwork as that person. `--revoke "Sana"` takes it back. The service log says who called
what: `~/Library/Logs/Provident/studio-remote.log`.

## 4. Connect Grok

**In Grok (grok.com, or the app)** — Connectors › **New connector** › **Custom**. Name it
*Provident Studio*; paste the person's address from step 3. Grok lists the eight `studio_…` tools.
If the connector is being set up for a **Bot**, attach it there so the bot always has the tools,
and paste `GROK-BOT-INSTRUCTIONS.md` into the bot's instructions (Part 3 tells it how to use the
tools). Every Grok user who should have the bot *act* gets their own token; people who only ask it
questions need none.

**A bot you build on the xAI API** (a Telegram or WhatsApp bot, say) — add the tool to the
Responses API request; the bearer token travels in `authorization`:

```json
{"type": "mcp", "server_url": "https://<your host>/mcp", "server_label": "provident_studio",
 "authorization": "<token>", "allowed_tools": []}
```

## 5. Try it

> Make a reel thumbnail that says "Dubai Marina, two bedrooms, handover Q2 2027", with this
> photo: https://drive.google.com/uc?export=download&id=…

The bot calls `studio_catalog`, `studio_new_project`, `studio_edit`, `studio_set_image` (the
photo by its https link), `studio_preview` and `studio_export`, and answers with links to the
PNGs. The links open without signing in and last 14 days; the files stay on the Mac.

## Sign-in: does the bot need one?

**Yes, and the token is it — for now.** The studios' Google sign-in (`access.js`) is a gate on the
*website*: it is off when the page cannot reach the server, and the headless studio the tools drive
never does. So nothing but the token stands between the internet and your artwork. That is why:

- a token is **per person**, revocable, logged with every call, never in the repo;
- the bot can only read and write **inside the projects folder** on that Mac — a path or a file
  anywhere else is refused, and pictures come in by https link, not by Mac path;
- exported files go out only as **signed links** that expire.

A Google sign-in (OAuth, so the bot acts *as* a named teammate with a role) becomes necessary in
the second phase, when the bot touches hand-offs and Status — those say "With Sana", and a shared
bot identity would make the log a lie. Until then the per-person token gives the same
accountability with far less to build and nothing for the team to sign into.

## When it breaks

| | |
|---|---|
| Grok says the connector cannot be reached | `curl https://<host>/health`. Nothing: the tunnel login item — `tail -f ~/Library/Logs/Provident/studio-tunnel.log`. `{"ok": true}` but Grok still fails: Grok needs the address exactly as printed, ending in `/mcp` |
| 401 in the log | the token is missing or revoked — make a new one |
| "The studio did not finish loading" | the studio threw on boot in the copy — re-run `install-remote.sh`, then open the studio in Chrome and read the console |
| a picture is refused | it must be an **https** link that returns the image itself. A Drive file: share with anyone with the link and use `https://drive.google.com/uc?export=download&id=<file id>` |
| agent photos keep their background | background removal is not running on that Mac: `sh tools/rembg/install.sh` there |
| the Mac is busy | Chrome is kept up while calls come in and closed after 30 idle minutes; the first call after that takes a few seconds longer |

The stdio server for Claude Desktop (`install.sh`) is unaffected by any of this; the two share
`server.py` and run side by side.
