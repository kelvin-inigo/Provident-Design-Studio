# CAS and OPS — Send to the import hub

Both studios' Share panels have a **Send … + .json** button under Export. It runs the normal
export (same gate, same renders, same file names, the format card you picked — a PDF selection
sends JPEGs) and uploads the result to the import hub instead of writing it to a folder.

## Setting it up (per computer)

Open the **Import hub** fold under the Send button (pressing Send with nothing set opens it):

- **Endpoint URL** — defaults to `https://provident-content-hub.ngrok-free.dev/api/imports`.
- **Design key** — the hub's `HUB_DESIGN_KEY`. OPS sends it as `X-Design-Key` (and, for an older hub, as `Authorization: Bearer …`). The hub accepts it on `POST /api/imports` only; every other route still needs `HUB_IMPORT_TOKEN`.

Both are kept in this browser's `localStorage` (`provident-ops-endpoint` /
`provident-cas-endpoint`). **The token is never in the repo** — this repository is public.
The URL must be `https://`, or plain `http://` to this computer or the office network
(10.x, 172.16–31.x, 192.168.x).

## The request

The same as:

```
curl -X POST http://192.168.50.30:8090/api/imports \
  -H "Authorization: Bearer $HUB_IMPORT_TOKEN" \
  -H "X-Source: Design system" \
  -F "content=@<project>.smpstudio.json;type=application/json" \
  -F "images=@<render 1>.png" -F "images=@<render 2>.png" …
```

- `content` — the project's session file (`.smpstudio.json` from OPS, `.adstudio.json` from
  CAS). It embeds every source photo, so it is usually the largest part.
- `images` — one part per exported image, filename = the export's own file name (CAS's
  `Variant A/` folder is dropped from the filename; the name already says the variant).
  Assets/ is not sent.
- `X-Card-Id: <card id>` — only when the project came from a Content Hub design job
  (`state.hubCardId`, which a hub draft's `.smpstudio.json` carries and Open Session keeps). The
  hub then attaches the pages to that post and moves it to Ready to publish; its 201 answers with
  `card_id` set, and the status line says "attached to the hub post". The design queue is
  picked up by the `hub-design-queue` skill (`.claude/skills/hub-design-queue/`).

## Size limit and compression

The hub takes up to **50 MB and 50 images** per delivery. If the export plus the `.json` fit, the
images go exactly as exported. If not, Send re-encodes every raster image as **JPEG**, stepping
quality down (90 → 85 → 80 → 72%), and only after that reduces the pixel size (85 → 45%), until
the delivery fits under ~48 MB. SVGs pass through. The status line says what it did, e.g.
*compressed from 163.2 MB to JPEG 90%*. Your local export is never changed. If even the smallest
step does not fit, or the `.json` alone is over the limit, Send says so and sends nothing.

## What the hub must do

It is called from a browser page, so it has to answer the CORS preflight:

```
OPTIONS → 204
Access-Control-Allow-Origin: <the studio's origin, or *>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, X-Source, X-Card-Id
```

and send `Access-Control-Allow-Origin` on the POST response too. Chrome may also send
`Access-Control-Request-Private-Network: true` when a page reaches a LAN address; answer it
with `Access-Control-Allow-Private-Network: true`.

**From the website (https) to the hub (plain http):** browsers block this as mixed content.
Send declares the request as local-network (`targetAddressSpace`, Chrome's Local Network
Access), so **Chrome asks once to allow access to devices on your local network — press Allow**.
On a Mac, Chrome also needs System Settings › Privacy & Security › Local Network turned on.
Safari and Firefox cannot do this; use Chrome, open the studio from this Mac, or give the hub an
https address.

## The response

Any 2xx is success; a JSON `message` / `error` / `status` (or short text) is shown in the status
line. A 401 / 403 says to check the token. A network or CORS failure says the request did not
reach the hub. Timeout 3 minutes.
