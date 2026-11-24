# PDS on the office server

The studios served from the office server (`provident-marketing`, Ubuntu) at
**https://design-studio.ngrok-free.dev**, beside the Vercel site.

- `serve.py` serves the repo's files on `127.0.0.1:8800` and nothing else: no `/api`, no dev
  sign-in. It refuses hidden paths (`.env`, `.git`, `.claude`), `tools/`, `api/`, `exports/`,
  Python and shell files, and folder listings. The studios call the live store on Vercel
  (`share-link.js` `shareBase()`), as on the site.
- ngrok publishes it with Google sign-in at the door; only `@providentestate.com` accounts pass
  (`ngrok.yml.example`; the real file is `~/.config/ngrok-pds/ngrok.yml`, mode 0600, with
  `NGROK_AUTHTOKEN` from `.env`). Its own agent, web UI on `127.0.0.1:4042`; the Content Hub's
  and retell's tunnels on the same server are separate.
- `pds-studio start | stop | restart | status` (installed as `~/pds-deploy/pds-studio`); an
  `@reboot` crontab line starts it.

Never run `tools/share-dev/serve.py` behind the tunnel: its stand-in sign-in makes anyone admin.

**Updating is automatic.** `pds-sync` (installed as `~/pds-deploy/pds-sync`, cron every minute)
fetches `main` from the public repository, no keys, and resets the copy to it when it moved;
`.env` and other ignored files stay. So the site follows `main` within a minute of a push, and
only pushed, committed work is served. Its log is `~/pds-deploy/logs/sync.log`.

`.env` is not in git, so a change to it is copied by hand (the login is `SERVER_CONNECTION` in
`.env`; this Mac's SSH key is installed there):

```bash
scp .env <user>@<office server>:Provident-Design-Studio/.env
```

**Pushes reach both repositories.** `origin` has two push URLs (`kelvin-inigo/Provident-Design-Studio`
and `Provident-AI-ops/Design-Studio`), and `tools/git-hooks/post-commit`, installed in `.git/hooks/`,
pushes `main` to both after each commit on it (log `.git/autopush.log`; `GIT_AUTOPUSH=0` skips).

**Links made here open here.** `StudioBase.linkBase()` (share-link.js) builds edit, ad set, review
and post links from this address; the share store still answers on Vercel (`shareBase()`). Only
Provident Google accounts pass the door, so a review link for someone outside is made on the Vercel
site.

**Google sign-in inside the studios** needs `https://design-studio.ngrok-free.dev` in the OAuth
client's Authorised JavaScript origins (`docs/google-drive-setup.md`, step 4).
