# OPS — Send to an endpoint

OPS's Share panel can POST a finished export to a URL you control. This is the contract a
receiving server has to meet.

## Setting it up (per computer)

Share › **Send to an endpoint**: the **Endpoint URL**, and an optional **Key**. Both are kept in
this browser's `localStorage` (`provident-ops-endpoint`) and never in the repo. The URL must be
`https://`; plain `http://` is accepted only for `localhost` / `127.0.0.1` / `[::1]`.

**Send N … + project** runs the normal export (same gate, same renders, same file names, the
format card you picked — a PDF selection sends JPEGs) and uploads the result instead of writing
it to the Source folder.

## The request

```
POST <Endpoint URL>
Content-Type: multipart/form-data; boundary=…
Authorization: Bearer <Key>        (only when a key is set)
X-Provident-App: ops
```

The browser sends it cross-origin, so the server must answer the CORS preflight:

```
OPTIONS → 204
Access-Control-Allow-Origin: <the studio's origin, or *>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, X-Provident-App, Content-Type
```

(and `Access-Control-Allow-Origin` on the POST response too).

### Parts

1. **`manifest`** — one JSON part, `manifest.json`:

```json
{
  "app": "provident-smp-studio", "studio": "ops", "v": 1,
  "name": "Just Listed_Agent",
  "pid": "pmvf9f4wp7c3ytc",
  "template": "listed",
  "format": "jpg",
  "sizes": ["3x4"],
  "slides": 1,
  "exportedAt": "2026-10-19T12:57:57.926Z",
  "files": [
    { "path": "Just Listed_Agent-01_3x4.jpg",     "role": "render",  "type": "image/jpeg",       "bytes": 100751 },
    { "path": "Just Listed_Agent.smpstudio.json", "role": "session", "type": "application/json", "bytes": 1666841 },
    { "path": "Assets/qr.png",                    "role": "asset",   "type": "image/png",        "bytes": 1663 }
  ]
}
```

2. **`files`** — one part per file, in the manifest's order. Each part's **filename is its
   path in the bundle** (`Assets/…` carries its folder). Writing each part to
   `<somewhere>/<filename>` reproduces exactly what an export puts in the Source folder.

- `pid` is the project's identity across saves and renames — use it to replace a previous
  upload of the same project.
- `role`: `render` (the images to post), `session` (open it in OPS with Open Session to keep
  editing), `asset` (the source uploads, role-named).
- The session file embeds its photos, so expect it to be the largest part (a few MB).

## The response

Any 2xx is success. If the body is JSON with `message` (or `error` / `status`), or short plain
text, OPS shows it in the status line, e.g. `HTTP 200 · received 3 files`. A non-2xx status is
shown as *Endpoint refused it — HTTP 401 · …*. A network or CORS failure reads *the request did
not reach it*. The request times out after 3 minutes.
