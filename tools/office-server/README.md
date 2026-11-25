# PDS on the office server

The studios served from the office server (`provident-marketing`, Ubuntu) at
**https://design-studio.ngrok-free.dev**, beside the Vercel site.

- `serve.py` serves the repo's files on `127.0.0.1:8800` **and its own `/api/share` and
  `/api/gauth`** (2026-11-25): `api/share.py` and `api/gauth.py` run unchanged on the server's own
  store, `store_disk.py`, in `~/pds-data` (outside the repo, so a sync never touches it). No dev
  sign-in, no Drive stand-in, `SHARE_DEV` is cleared. It refuses hidden paths (`.env`, `.git`,
  `.claude`), `tools/`, the `api/` sources, `exports/`, Python and shell files, and folder listings.
- ngrok publishes it with Google sign-in at the door; only `@providentestate.com` accounts pass
  (`ngrok.yml.example`; the real file is `~/.config/ngrok-pds/ngrok.yml`, mode 0600, with
  `NGROK_AUTHTOKEN` from `.env`). Its own agent, web UI on `127.0.0.1:4042`; the Content Hub's
  and retell's tunnels on the same server are separate.
- `pds-studio start | stop | restart | restart-server | status` (installed as `~/pds-deploy/pds-studio`);
  an `@reboot` crontab line starts it. It runs `serve.py` straight from the repo.

Never run `tools/share-dev/serve.py` behind the tunnel: its stand-in sign-in makes anyone admin.

## The office store (`~/pds-data`)

```
~/pds-data/store.db                              links, ad sets, review tokens, access list and roles,
                                                 hub tasks, Roam threads (SQLite)
~/pds-data/images/photos/<c>/<i>.part            full-size photo parts, shared by every link
~/pds-data/images/previews/<h>.txt               each photo's ~640px preview
~/pds-data/images/links/<id>/photos|previews/    an older link's own photos
~/pds-data/images/view/photos|previews/*.jpg     viewable copies for people browsing the folder
```

`python3 tools/office-server/store_disk.py ~/pds-data` prints what it holds; `… view` writes the
viewable copies again. A full-size photo nobody opened for 60 days expires here as on Upstash.

## Moving the Vercel store across (`pull-vercel.py`, `install.sh`)

`pull-vercel.py` reads every key of the Vercel store (Upstash) with its type and expiry and writes
it into `~/pds-data`. Running it again overwrites with Vercel's copy and keeps keys only the office
store has. Vercel is never changed.

`install.sh` (run ON the server, once) installs `pds-studio` and `pds-sync` from the repo, copies
the Vercel store when `.env` has `KV_REST_API_URL` and `KV_REST_API_TOKEN`, names the secrets
still missing, and restarts the server. The keys copied from Vercel go in `.env.vercel` beside
`.env` (git-ignored, mode 0600; a template is filled in on the Mac and copied across with `scp`),
which `serve.py` and `install.sh` read after `.env`. It needs the same names as Vercel:

| name | for |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | reading the Vercel store (the copy only) |
| `GOOGLE_CLIENT_SECRET` | staying signed in (`/api/gauth`) |
| `ACCESS_ADMIN` | studio sign-in and roles: unset, the studios' role gate is OFF here |
| `SHARE_ADMIN_KEY` | `share-admin.html` |
| `ROAM_API_KEY`, `HUB_PUSH_KEY`, `HUB_DESIGN_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` | Roam notes, hub tasks, Arabic copy, the Engine page |

**The cut-over.** Until the server runs the new `serve.py` and the store is copied, the studios
there keep using the Vercel store (`StudioBase.shareBase()` in `share-link.js`). The last step is
one line in `shareBase()`: answer with `location.origin` on `design-studio.ngrok-free.dev` (as
`linkBase()` already does), pushed only after `curl http://127.0.0.1:8800/api/share?op=health` on
the server shows the copied keys. Run `pull-vercel.py` once more right before that push, so nothing
written on Vercel in between is left behind. From then on the two addresses keep separate stores:
a link made on one does not open on the other, and the Content Hub's `hubpush` still goes to Vercel
(the hub is outside ngrok's door).

**Updating is automatic.** `pds-sync` (installed as `~/pds-deploy/pds-sync`, cron every minute)
fetches `main` from the public repository, no keys, and resets the copy to it when it moved;
`.env` and other ignored files stay. When `api/` or `tools/office-server/` changed it reinstalls
both scripts and restarts the server. Its log is `~/pds-deploy/logs/sync.log`.

`.env` is not in git, so a change to it is copied by hand (the login is `SERVER_CONNECTION` in
`.env`; this Mac's SSH key must be in the server's `~/.ssh/authorized_keys`):

```bash
scp .env <user>@<office server>:Provident-Design-Studio/.env
```

**Pushes reach both repositories.** `origin` has two push URLs (`kelvin-inigo/Provident-Design-Studio`
and `Provident-AI-ops/Design-Studio`), and `tools/git-hooks/post-commit`, installed in `.git/hooks/`,
pushes `main` to both after each commit on it (log `.git/autopush.log`; `GIT_AUTOPUSH=0` skips).

**Links made here open here.** `StudioBase.linkBase()` (share-link.js) builds edit, ad set, review
and post links from this address. Only Provident Google accounts pass the door, so a review link
for someone outside is made on the Vercel site.

**Google sign-in inside the studios** needs `https://design-studio.ngrok-free.dev` in the OAuth
client's Authorised JavaScript origins (`docs/google-drive-setup.md`, step 4).
