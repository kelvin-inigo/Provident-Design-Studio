# CAS and OPS sign-in and roles — admin setup

Both studios ask people to sign in with Google and shows each of them what their role allows
(`access.js`, the `acc*` ops in `api/share.py`). It is **off** until the deployment names the admin.

## Switch it on (Vercel)

1. Vercel → the project → **Settings → Environment Variables**.
2. Add **`ACCESS_ADMIN`** = the admin's Google email (one address). Production and Preview.
3. Optional: **`ACCESS_DOMAIN`** (default `providentestate.com`) — the only accounts that can be let in.
4. Redeploy. Open CAS on the site: it shows the sign-in screen. The admin signs in and gets
   **Access** in CAS's Home sidebar (it manages both studios).

It uses the share store (Upstash) that review links already use — two keys, `acc:users` and
`acc:log`. No new service, no secret in the repo. Remove `ACCESS_ADMIN` to switch it off again.

## How it decides

- The page sends its Google access token; the server asks **Google** whose it is (Drive's `about`,
  the scope the studio already has). The page's own word is never trusted.
- Admin = the `ACCESS_ADMIN` email. Everyone else on the domain is a request until the admin lets
  them in as **Designer**, **Social media manager**, **Content team** or **Performance
  marketing**. In CAS only the designer (and the admin) gets the editor; in OPS everyone but
  performance marketing does, and the post's steps go by role (see CAS-OPS-GUIDE.md §8). Other domains are refused and logged.
- A removed person is shut out at the next check (the studio re-checks every five minutes).

## The team is seeded

`ACC_SEED` in `api/share.py` lets these accounts in, with these roles, the first time the user list
is read (`acc:seed1` marks it done, so a later change or removal in **Access** sticks):

| Account | Role |
|---|---|
| exec10.media@ | Social media manager (OPS only) |
| exec1.content@ | Content team · English |
| exec2.content@ | Content team · Arabic |
| exec4.graphics@, exec5.graphics@ | Designer |
| digitalmarketing.lead1@ | Performance marketing |

The admin (`ACCESS_ADMIN`) is also listed on a team for hand-offs: designer, unless
`ACCESS_ADMIN_ROLE` says otherwise. `op=accteam` gives anyone let in the list of active people and
their roles, which is what the hand-off picker shows.

## AI Engineers and the Engine page (2026-11-18)

`marketing.ads@` and `ai.engineer1@` are let in once as **AI Engineers** (`ACC_SEED_AI`, marked
done by `acc:seed-ai`; a waiting request from either is let in too). The role opens **Engine** on
the home (capability `arch`, ticked for AI Engineers by default under Access › Roles).

Engine reads the public repository's commits and Vercel's deployments from GitHub, through
`/api/share?op=engine`, so one server cache serves everyone. Without a token GitHub allows the
server 60 reads an hour, so it re-reads every 3 minutes. For a steady 30-second feed, add a
**read-only** token in Vercel as `GITHUB_TOKEN` (GitHub › Settings › Developer settings › Fine-grained
tokens, this repository only, Contents: read and Deployments: read). `ENGINE_REPO` overrides the
repository (default `kelvin-inigo/Provident-Design-Studio`).

## Roles the admin names (2026-11-18)

Under **Let in as**, **New role…** makes a team role the admin types (`op=accrole`), kept in
`acc:roles` as `x-<slug>`. It starts with no capability; the admin ticks what it opens under
**Roles**. In the studios it is treated like performance marketing (Home and Status) unless Roles
lets it design. A role can be removed only while nobody active or waiting has it.
Tick **View ad sets** (capability `view-adsets`, AI Engineers by default) for a role that only
follows campaigns: Status and each ad set's page, read-only. The page enforces it; Drive sharing is
the real lock, so share the campaigns folder with such accounts as Viewer.

## What it does not protect

- It guards the **studio and its access list**, not the files. Campaign data lives in Google
  Drive, protected by Drive sharing as before. Anyone with the HTML file can still open it off the
  disk; it's a tool, not the data.
- **Review links** (`#share=`) open without signing in — the link is the key, as before.
- **The landing page** is not gated.
- A post's step buttons follow the signed-in role in the page. Whoever can open the post's Drive
  folder can open the project; Drive sharing on **Organic posts** is what guards it.

## Testing locally

`python3 tools/share-dev/serve.py 8792` sets `ACCESS_ADMIN` to the Drive stand-in's account and
checks tokens against the stand-in. In the page: `provident-share-base` and `provident-drive-base`
= the local origin, and `provident-drive-tok` = `{"at":"dev:<email>:<name>","exp":…}` signs in as
anyone (`at: "dev"` is the admin).
