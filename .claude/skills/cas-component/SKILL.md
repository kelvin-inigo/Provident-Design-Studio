---
name: cas-component
description: Recreate a design element from a screenshot as a new Campaign Ads Studio (CAS) component — on brand, with text fields, icon slots, layout and 3–4 style variants — and put it on the clipboard so the user can press ⌘V in CAS. Use when the user runs /cas-component, or drops a screenshot and asks to turn it into a CAS design component.
---

# /cas-component — a screenshot becomes a CAS component

The user has dropped a screenshot (an image in this conversation, or a path given as the
argument). Read it, rebuild its ONE design element in CAS's component grammar, check it, and hand
it over. CAS (`Provident Campaign Studio.dc.html`) draws the result with its own engine, on the
brand's type ladder and palette, and it arrives with:

- one text field per part
- icon slots
- S / M / L / XL
- style tiles
- Align
- Hide / Show per part

The user presses **⌘V in the CAS editor** to add it to the canvas (temporary, this project only).
**Save to library** in the rail keeps it for other projects.

## Steps

1. **Look at the screenshot.** Identify the single most distinctive reusable element. If it is a
   whole ad or page, pick one element and say which. List its copy exactly, its icons, and its
   structure: what is beside what, what is stacked, what sits on a surface.
2. **Read the existing components** — the new one must look like part of this family:
   ```bash
   python3 .claude/skills/cas-component/scripts/catalog.py
   ```
   Where part of the screenshot matches a treatment there, build it the way that style draws it.
   That covers a glass card, an outline pill, a divided strip, a rule-led label and a figure over
   its label. Your extra variants should borrow these treatments too.
3. **Write the spec** to the scratchpad as `spec.json`, using the grammar below.
4. **Check it:**
   ```bash
   python3 .claude/skills/cas-component/scripts/check.py <scratchpad>/spec.json
   ```
   - Fix every `ERROR` and run it again.
   - Read the `warn` lines and decide.
   - On `OK`, the component is on the clipboard and saved in `custom-components/` (git-ignored).
5. **Tell the user**, briefly:
   - the component's name and what each style is;
   - which icons you chose;
   - anything you could not reproduce, and why. The grammar has no images, no gradients and no
     custom colours. See the binding rules below.

   Then the one action: *open CAS's editor and press ⌘V*.

## The brand rules the studio enforces (design within them, never around them)

- **One typeface**, sized by ROLE on a minor-third scale. You never give pixel sizes, fonts or
  weights. Tracked caps (500) are only for small labels: `role: "eyebrow"` or `caps: true`.
  Headings and figures are Regular; everything else is Light.
- **Colours are ROLES** that flip with a dark or light canvas. You never give a hex. There is no
  gold except `brass`, used sparingly as an accent; orange does not exist here.
- It sits over a full-bleed **photograph**. Surfaces are glass, outlines or small solid chips,
  never large opaque slabs. Keep it compact: an ad's copy covers at most ~40% of the canvas.
- **Units:** every gap, pad, size and radius is in `u`. 1u is the body size, about 28 px on a
  1080 canvas, and a body line is about 1.4u tall.

## The grammar — anything else is rejected

**`stack`** places its kids in a column or a row, optionally on a surface:

```json
{"t":"stack","dir":"col"|"row","gap":u,"pad":[top,right,bottom,left],
 "align":"auto"|"start"|"center"|"end","justify":"start"|"center"|"end"|"between",
 "hug":bool,"fill":null|"glass"|"solid"|"label"|"brass"|"tint",
 "stroke":null|"rule"|"chip"|"strong"|"brass","r":u|"pill","kids":[...]}
```

- `align: "auto"` follows the ad's own alignment (left or centred). Use it for the root and for
  text columns.
- `hug: true` shrinks the stack to its content: pills, chips, badges.
- `fill`: `glass` is a frosted panel, `solid` a button chip, `label` a small solid label chip,
  `brass` a brass chip, `tint` a faint panel with no blur.
- `stroke`: `rule` is a hairline, `chip` a light pill outline, `strong` a firmer outline, `brass`
  a brass outline.
- A row centres its kids vertically unless `align` says otherwise.

**`text`**:

```json
{"t":"text","field":"<key>","role":"eyebrow"|"body"|"cta"|"hook"|"stat"|"headline"|"hero",
 "caps":bool,"ink":"auto"|"ink"|"soft"|"mute"|"brass","lines":1-6}
```

- Roles run from smallest to largest: eyebrow, body, cta, hook, stat (a big figure such as a
  price or rating), headline, hero.
- `ink: "auto"` reads on the nearest surface. Use `mute` or `soft` only to make something quieter,
  and `brass` only as an accent.

**The small nodes:**

| node | what it draws |
|---|---|
| `{"t":"icon","slot":0-5,"size":u,"ink":...}` | one slot per distinct icon, named in `iconHints` |
| `{"t":"dot","size":u,"ink":...}` | a bullet, status dot or separator |
| `{"t":"rule","len":u\|"fill","weight":1-4,"ink":...}` | a horizontal hairline; `"fill"` stretches across the row or column |
| `{"t":"vrule","weight":1-4,"ink":...}` | a vertical hairline the height of its row, for divided strips |

**Fields carry ALL the words.** Each one is:

```json
{"key":"snake_case","label":"Human label","kind":"line"|"area","sample":"<exact text>"}
```

- Use `area` for a sentence or more.
- Transcribe the copy exactly and keep its case. The studio upper-cases caps text itself.
- At most 8 fields.
- Repeated items (three stats) are separate fields; five identical stars are five icon nodes.
- Every variant restyles the SAME fields and never adds copy. A field no variant draws is an error.

**Variants:** give 3, at most 4, each `{"key":"short","label":"1–3 words","desc":"one line","root":{...}}`.
- The FIRST is a faithful recreation.
- The others differ in **shape**: layout direction, container (glass vs outline vs none), divider
  treatment, icon placement, figure-first vs label-first. They never differ only in colour or
  size; the studio already has Ink and S / M / L / XL controls.
- Keep each under 40 nodes.

**Top level:**

```json
{"name":"Rating badge","desc":"one line","fields":[...],"variants":[...],"iconHints":["star:fill", ...]}
```

`iconHints[i]` is a Google Material Symbols name for slot `i`, such as `star`, `location_on`,
`calendar_month`, `bed`, `bathtub`, `square_foot` or `verified`. Add `:fill` for a solid glyph
(rating stars, status marks, anything drawn filled), and use `""` when nothing fits.

## A worked example

A screenshot of "4.9 ★★★★★ Google reviews · Based on 1,284 reviews" on a dark card:

```json
{"name":"Rating badge","desc":"A review score with stars and its source",
 "fields":[{"key":"score","label":"Score","kind":"line","sample":"4.9"},
           {"key":"source","label":"Source","kind":"line","sample":"Google reviews"},
           {"key":"count","label":"Review count","kind":"line","sample":"Based on 1,284 reviews"}],
 "iconHints":["star:fill","star:fill","star:fill","star:fill","star:fill"],
 "variants":[
  {"key":"card","label":"Glass card","desc":"Score beside stars on a frosted card","root":
   {"t":"stack","dir":"row","gap":0.8,"pad":[0.8,1.2,0.8,1.2],"hug":true,"fill":"glass","r":0.7,"kids":[
    {"t":"text","field":"score","role":"stat"},
    {"t":"stack","dir":"col","gap":0.2,"kids":[
     {"t":"stack","dir":"row","gap":0.15,"hug":true,"kids":[
      {"t":"icon","slot":0,"size":0.9,"ink":"brass"},{"t":"icon","slot":1,"size":0.9,"ink":"brass"},
      {"t":"icon","slot":2,"size":0.9,"ink":"brass"},{"t":"icon","slot":3,"size":0.9,"ink":"brass"},
      {"t":"icon","slot":4,"size":0.9,"ink":"brass"}]},
     {"t":"text","field":"source","role":"eyebrow"},
     {"t":"text","field":"count","role":"body","ink":"mute","lines":1}]}]}},
  {"key":"pill","label":"Outline pill","desc":"One line: star, score and source","root":
   {"t":"stack","dir":"row","gap":0.5,"pad":[0.45,1,0.45,1],"hug":true,"stroke":"strong","r":"pill","kids":[
    {"t":"icon","slot":0,"size":0.9,"ink":"brass"},{"t":"text","field":"score","role":"body"},
    {"t":"vrule"},{"t":"text","field":"source","role":"eyebrow"},{"t":"text","field":"count","role":"body","ink":"mute","lines":1}]}},
  {"key":"stack","label":"Figure first","desc":"The big score over a rule and its source","root":
   {"t":"stack","dir":"col","gap":0.4,"align":"auto","kids":[
    {"t":"text","field":"score","role":"hero"},{"t":"rule","len":3,"ink":"brass","weight":2},
    {"t":"text","field":"source","role":"eyebrow"},{"t":"text","field":"count","role":"body","ink":"soft"}]}}]}
```

## Notes

- **Nothing here needs an API key.** You are the model that reads the screenshot. The studio
  never contacts a service for this; its only network use is fetching the Material icon glyphs.
- ⌘V adds the component only while CAS's **editor** is on screen. If the user is in a text field,
  the paste still goes to the component, never into the field.
- To change one you made before, edit `custom-components/<slug>.json` (or its spec), run the check
  again and paste. **Keep its `id`** so Save to library replaces the old copy instead of adding a
  second.
