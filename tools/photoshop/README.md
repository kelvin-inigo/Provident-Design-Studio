# Edit in Photoshop (and Illustrator) — the helper

**An SVG goes to Illustrator** and comes back as SVG, so it stays vector; everything else goes
to Photoshop. The helper finds the newest installed copy of each (Illustrator's bundle sits at
`Adobe Illustrator 2026/Adobe Illustrator.app`, without the year). Only an SVG save comes back
from Illustrator — `.ai` is not read.

Lets CAS and OPS hand a picture to Photoshop and take every save back. A web page can't
launch a desktop app, so this small loopback service does that part.

```bash
./tools/photoshop/install.sh     # once per Mac; a login item from then on
./tools/photoshop/serve.sh       # or run it in a terminal instead
./tools/photoshop/uninstall.sh   # remove it
```

macOS's own `python3`, standard library only. Port **7312**, bound to 127.0.0.1. The helper and
the files it hands to Photoshop live in `~/Library/Application Support/Provident/photoshop/`
(`Edits/`). That isn't in the repo because a login item can't read ~/Documents.

## How the round trip works

1. **Edit in Photoshop** POSTs the slot's stored picture to `/edit?name=<slot id>`. The helper
   writes `Edits/<slot id>.<png|jpg|webp>`, deletes any older file with that name, and runs
   `open -a "<newest Adobe Photoshop>"` on it.
2. `image-slot.js` polls `/stat` every 1.5 s, and at once when the studio window regains focus.
3. A newer file with that name (PNG, JPEG, WebP, **or PSD/PSB/TIFF/HEIC, converted with macOS's
   own `sips`**) is fetched from `/file` and goes through the slot's own `_ingest`. So the
   encode, the cut-out pass-through, the crop reset and the store write are the same as a drop.
4. Pressing the button again while linked calls `/open`, which reopens the file **untouched**.
   It must never overwrite a PSD that is still being worked on.

The page only ever sends a slot id (`[A-Za-z0-9_-]`), never a path.

**Without the helper**, in Chrome or Edge with a source folder set, the slot writes
`<Source folder>/Photoshop/<slot id>.<ext>` and watches that folder through its handle. The user
opens the file in Photoshop themselves and must save it as PNG, JPEG or WebP: a browser can't read
a PSD, and there is no `sips` to convert one.

`localStorage['provident-photoshop-url']` overrides the address, which is how tests point the
studios at a copy on another port.
