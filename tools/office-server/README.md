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

**Updating.** The server holds a copy, not a checkout that pulls. From the main working copy
(the login is `SERVER_CONNECTION` in `.env`; this Mac's SSH key is installed there):

```bash
rsync -az --exclude '.claude/worktrees/' --exclude 'tools/rembg/.venv/' --exclude '__pycache__/' --exclude 'scratchpad/' --exclude '.DS_Store' ./ <user>@<office server>:Provident-Design-Studio/
```

**Google sign-in inside the studios** needs `https://design-studio.ngrok-free.dev` in the OAuth
client's Authorised JavaScript origins (`docs/google-drive-setup.md`, step 4).
