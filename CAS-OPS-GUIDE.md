# CAS & OPS — user guide

How to use the two Provident design studios in this folder.

| | file | for |
|---|---|---|
| **CAS** — Campaign Ads Studio | `Provident Campaign Studio.dc.html` | paid Meta ads (1:1, 9:16, 16:9) and Eventbrite banners |
| **OPS** — Organic Post Studio | `Provident Organic Studio.dc.html` | organic feed and story posts, built from locked templates |

> **For Claude in Cowork:** answer "how do I…" questions about CAS and OPS from this file, and
> quote on-screen names exactly as they appear here in **bold**. `CLAUDE.md` is the engineering
> record (why things work the way they do). It is very long, so search it rather than reading it
> whole, and only for "why" questions or before changing code. Don't edit the `.dc.html` files
> unless you're asked to. The studios are web pages: you can explain the steps, but you can only
> click them if you have a browser tool.

**Contents:**
1. [Opening the studios](#1-opening-the-studios)
2. [Projects: new, open, save](#2-projects-new-open-save)
3. [CAS: build an ad](#3-cas-build-an-ad)
4. [CAS: variants, carousels and sizes](#4-cas-variants-carousels-and-sizes)
5. [CAS: the Eventbrite banner](#5-cas-the-eventbrite-banner)
6. [CAS: the Copy workspace](#6-cas-the-copy-workspace)
7. [CAS: export](#7-cas-export)
8. [OPS: make a post](#8-ops-make-a-post)
9. [OPS: the templates](#9-ops-the-templates)
10. [OPS: All controls](#10-ops-all-controls)
11. [OPS: export](#11-ops-export)
12. [Photos](#12-photos)
13. [Rules the studios keep for you](#13-rules-the-studios-keep-for-you)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Opening the studios

- Open the file in **Chrome** or **Edge**. You can double-click it, or open `index.html` (the
  home page) and pick a studio from there.
- Safari and Firefox work too, but they can't use a **Source folder**. Exports then download as a
  zip instead.
- Keep both `.dc.html` files in this folder. They load their scripts and fonts from here, and the
  two studios link to each other.
- To switch studios, use **Campaign ads** / **Organic posts** in the top bar or in the project
  browser's sidebar.
- The sun/moon button switches between light and dark. Both studios share the setting.

## 2. Projects: new, open, save

Each studio opens on its **project browser**.

- **Start something new:**
  - In CAS, press **+ New campaign**, or click a template card: New launch, Event, Payment plan
    or Spec ladder.
  - In OPS, click a template card, or press **+ New post** to get **Pick a template**.
- **Continue last** reopens the project you were working on.
- **Save** (top bar) writes the project into your **Source folder**:
  - the session file (`<name>.adstudio.json` for CAS, `.smpstudio.json` for OPS);
  - an `Assets/` folder with a copy of every upload.

  The first time, it asks you to pick the folder. After that it saves in place.
- **Open Session**: pick the project's folder, and the newest session file in it opens. A session
  file from the other studio opens in that studio.
- **Source folder** (top bar) picks or changes the folder that saves and exports go into.
- **Recent** only lists projects that have actually been saved. A save, an export into the Source
  folder, and opening a session file all count.
- **Undo** / **Redo** (top bar) go back up to 5 steps.
- If there's unsaved work when you leave, the studio asks first.

---

## 3. CAS: build an ad

What's on the screen, from left to right:
- **Design Components**: the palette of pieces you can add.
- **The canvases**: one row ("plate") per variant. The 1:1 is on top and the 9:16 under it, then
  the optional 16:9 and banner.
- **This component**, **Background image** and **Hidden components**.
- **Layout**, on the right.

**Adding and editing:**
- **Add a component:** click a card in **Design Components**. The cards are Eyebrow, Hero
  headline, Hook line, Body line, Tag chips, Spec data, Price block, Bullet list, Process steps,
  CTA button, Graphic, Divider and Spacer.
- **Edit its words:** click the component on the canvas, then type in **This component**.
  - Headline, hook and body take line breaks (Enter), up to 4 lines.
  - Tag chips and spec rows have one field per item. Use **+** to add one and × to remove one.
- **Change its style:** **This component** → **Style**. Each tile is your component, with your
  words, drawn in that style — click the one you want. Hover a tile to see what it's for.

  | component | styles |
  |---|---|
  | Eyebrow | Plain caps, Rule-led, Framed, Filled, Status dot, Underlined |
  | Hero headline | Regular, Two-tone, Fade out, Glass card, Underscored |
  | Hook line | Plain, Glass card, Bars, Quote |
  | Body line | Plain, Corner note, Ruled, Boxed |
  | Bullet list | Checks, Dots, Dashes, Ruled rows, Two columns |
  | Tag chips | Outline pill, Filled pill, Glass pill, Icon pill, Divided strip, Dotted strip |
  | Spec data | Row, Ladder, Icon row, Glass row, Glass ladder |
  | Process steps | Icon plates, Numbered plates, Timeline, Compact list |
  | Price block | Plain, One line, Glass bar |
  | CTA button | Filled pill, Outline pill, Soft rect, Pill + arrow, Text link |
  | Divider | Full rule, Short bar, Dotted, Fading, Ornament |

- **Change its size:** **This component** → **Size**: **S**, **M**, **L** or **XL**. Each step
  moves the words one step along the type scale (×1.2 each), and the padding, lines and plates
  grow with them, so the component keeps its shape. **M** is the component as designed. Like the
  style, the size is set per variant (and per canvas, once a canvas is edited separately).
  - Divider: the size is the line's weight.
  - Spacer: the size scales the gap you dragged.
  - Graphic: preset heights. Dragging a corner overrides them; picking a size resets the drag.
- **Eyebrow colour:** **This component** → **Ink**: Canvas ink, Brass, Soft or Mute, or type a
  hex code. The rule, frame or dot follows the label's colour.
- **Older projects:** a style that was removed opens as the nearest new style, with the size or
  colour that made the difference. For example, a "Jumbo" headline opens as Regular at **XL**, and
  "Brass caps" opens as Plain caps in **Brass** ink.
- **Move it:** select it, then use the small bar that appears on the canvas.
  - **↑ / ↓** reorder it.
  - **Top / Bottom** send it to the top or the bottom of the ad.
  - **✕ Delete** removes it.
- **Hide it on one variant:** **This component** → **Hide in Master** (or in the variant you're
  on). Hidden components are listed under **Hidden components**, where you can show or delete
  them.
- **Icons** (Process steps, Icon pills and the spec Icon row): type a Material Symbols name in the
  icon picker, e.g. `calendar_month`, `schedule` or `location_on`, and press Enter.

**Photo and look:**
- **Background photo:** use **Background image** → **Photo**.
  - Double-click the photo on the canvas to reframe it.
  - **Image opacity** dims it.
  - **Overlap image** takes a cut-out PNG that sits in front of the headline, for a parallax look.
- **Layout** (right rail):

  | control | what it does |
  |---|---|
  | **Background** | Dark or Light |
  | **Logo** | Top or Bottom, Left or Center (never right) |
  | **Layout preset** | Bottom, Split or Top |
  | **Scaling** | the size of all the content, in steps of the type scale (83%, 100%, 120%…), set per canvas size |
  | **Alignment** | Left or Center |
  | **Vertical spacing** | Tight, Medium or Roomy |
  | **Scrim** | the wash behind the copy: Opacity, Fade and Colour |

**Checking it:**
- **Copy %:** each canvas shows how much of the ad the copy covers. Above 40% it turns amber,
  because the image should always outweigh the words.
- **Preview** (top bar) shows the ad inside an Instagram or Facebook feed, reel or story mock-up.
  **Platform UI** and **Safe margins** switch on the app's own buttons and the safe area.

## 4. CAS: variants, carousels and sizes

- **Add Variant** (the pill at the foot of the canvases) copies the variant you're on. You can
  have up to 3: the Master plus two more.
  - The components and their words are shared by every variant.
  - Layout, style, visibility and photo are set per variant.
- **Edit** / **Editing** on a plate chooses which variant the side panels edit. **Remove** deletes
  that variant; the Master can't be removed.
- **9:16:** it mirrors the 1:1 until you press **Edit layout separately**. **Own photo** gives it
  a different picture.
- **16:9:** press **Show 16:9** on the plate. It has the same two buttons.
- **All Variants Option** (the pill next to **Add Variant**) holds the settings for the whole
  project:
  - **Format:** **Single ad** or **Carousel**. A carousel has up to 10 pages, and each page has
    its own components, words and photo.
  - **Story 9:16:** **Shown** or **Hidden**. This one only appears on a carousel.
  - **QR code:** **Visible** or **Hidden**, and the **Corner** it sits in.
  - **Typeface:** **English** or **Arabic**.
  - **Collaboration logo:** **Off** or **On**. It puts a partner's mark beside the wordmark, with
    settings for size and colour.

## 5. CAS: the Eventbrite banner

1. On a plate, find the **Banner 2:1** row and press **Show banner**. Two canvases appear:
   **1880 × 940** and **758 × 380**. They're one design, and the photo fills each one edge to edge.
2. **Edit layout separately** unlinks the banner from the 1:1. **Own photo** gives it its own
   picture, which both banner sizes share.
3. In **Scaling**, the rows **1880** and **758** size the two banners separately. Raise the **758**
   (it goes up to 150%) when its words are too small for an email.
4. Banners never carry a QR code. They're clicked, not scanned.

Eventbrite shows the 1880 file at 940 px wide on a desktop and 375 px wide on a phone. On a phone
only the headline really reads, so keep the words few and big.

## 6. CAS: the Copy workspace

This is for copywriters: the ad's words on their own, next to a live preview.

1. Press **Copy** in the top bar (**Design** takes you back).
   - The big preview is the real export.
   - The picker above it chooses which variant (or page) you're looking at.
2. Fill in the fields.
   - **Add to this page** adds a component, grouped as Text, Lists or Action. It arrives in its
     basic look; the designer styles and places it.
   - The bin icon removes one, and the notice that appears offers **Undo**.
3. **Reorder** a line by dragging its grip, or focus the grip and use the arrow keys.
4. **Hand the copy off:**
   - **Send to design** saves a snapshot and marks the copy "With design".
   - **Mark as final** saves another snapshot and marks it "Final".
   - **Reopen for edits** and **Back to draft** step back without saving a snapshot.
5. **History** lists every snapshot, each with its own `.docx`.
   - **Your name** labels the snapshots made on this computer.
   - **Download .docx** gives you the words as they are right now.
   - With a Source folder set, every hand-off also writes
     `Copy/<name>_Copy_<Status>_<date>.docx` into it.

CAS remembers which workspace (Design or Copy) you last used on each computer, so a copywriter's
machine reopens on Copy.

## 7. CAS: export

1. Set a **Source folder** once, from the top bar.
2. Open **Share**, check the **Campaign name**, and pick a format:
   - **JPEG 2×**: the smallest files, and what Meta takes.
   - **PNG 2×**: lossless, but large.
   - **SVG**
   - **PDF**
3. Press **Export**. The files land like this:

```
Source folder/
  Variant A/                        ← the Master; Variant B and C for more variants
    <name>_Variant A_feed.jpg       ← 1:1
    <name>_Variant A_Story.jpg      ← 9:16
    <name>_Variant A_16x9.jpg       ← only if that variant shows its 16:9
    Eventbrite Banners/
      <name>_Variant A_EventBrite_Banner_wide.jpg    ← 1880 × 940
      <name>_Variant A_EventBrite_Banner_Small.jpg   ← 758 × 380
  <name>.adstudio.json   Assets/    ← the session and uploads, refreshed on every export
```

- **Every export overwrites the last one without asking.** It never deletes anything, so files an
  export no longer writes (a removed variant, a hidden banner, old names) stay until you delete
  them yourself.
- A **carousel** exports into one `Carousel/` folder, with files named `<name>_page1_feed.jpg` and
  so on, and its banners in `Carousel/Eventbrite Banners/`.
- **Without a Source folder**, you get a zip with the same folders inside.
- **PDF** is one file with every size, saved wherever you choose.

---

## 8. OPS: make a post

Picking a template opens the **guided run**: one page of the post at a time, filled in top to
bottom.

1. **Each page's sections come in a fixed order:**
   1. **Pages in this post**: on the first page only. This is where you add or remove pages.
   2. **Layout**: on carousel and reel pages.
   3. **Words**
   4. **Agent**
   5. **Pictures**
   6. **QR code & listing number**
   7. **ADM & CN**: on the reel thumbnail.

   A page only shows the sections it needs. Each section shows **Done** or how many items are
   still missing.
2. **Next** checks the page. If something's missing it lists it; click an item to jump to it.
   Enter moves to the next field.
3. The thumbnails beside the preview are every page of the post. Click one to jump there. An amber
   ring marks a page you've left with gaps.
4. The last tile is **Finish**:
   - **Look**: wash strength, photo strength, panel colour, and whether to include the 9:16 story.
   - **Save**: the file name, where the files go, then **Save all**.
5. Press **All controls** in the top bar at any time to open the full editor (section 10).
   **Guided** brings you back.

## 9. OPS: the templates

| template | what it makes | worth knowing |
|---|---|---|
| **Just listed / sold** | one listing card | Status: Just listed or Just sold. A listing gets Sale or Rent, with /year or /month for rent. Each USP point becomes its own chip. The agent's photo is cut out automatically (section 12). Needs a QR code and a listing number. |
| **Weekly listings** | cover, property pages, closing slide | Up to 15 properties. The cover needs a QR code, and each property needs its own QR code and a listing number (numbers only, any length). A USP point per chip. |
| **Top agents** | a cover plus 5 ranking cards | Portraits are cut-outs. Drag the ranks in the slide list to reorder them. The cover's group photo uses the five portraits: pick one with the rank pills, size it, then **Stand on bottom** or **Stand all**. |
| **Google reviews** | up to 10 review cards | Quote, reviewer, and the agent's name, role and photo. Drag the portrait on the card to move it. |
| **Congratulations award** | one award card | The partner's mark can follow the card's colour (**Match canvas**) or keep its own (**Original**). |
| **Carousel** | up to 10 pages | Each page has a layout: Front page, Stats, Bullets, Text or Call to action. **Brass highlight** colours a word in a headline. Switches control the overline and the permit number. You can drop a floating graphic and drag it. Drag the inside pages to reorder them. |
| **Reel thumbnail** | one 9:16 Reel cover | 7 layouts: Masthead, Pop-out, Editorial, Caption, Punchline, Centre stage and Big number. **Text size** runs Small to Jumbo and steps down on its own to fit. **4:5 guide** shows what the profile grid shows. On Pop-out, **Remove background** puts the subject in front of the headline. |

## 10. OPS: All controls

This is the full editor.
- **Left rail:** the **Template** and the list of slides. Click a slide to edit it; add pages
  where the template allows.
- **Right rail:** the same form as the guided run, for the page you're on.
- **Post look** (the pill at the foot of the canvases): settings for the whole post.
  - Wash strength, photo strength and panel colour.
  - Photo darkening, on the listing card.
  - The wash, on a carousel.
- **The bar under the canvases:**
  - **Show story 9:16** adds the story canvas. It's also what decides whether stories are exported.
  - **This page** jumps to the page's form.
- **On the canvas**, some templates let you drag things: the listing photo, a review's portrait,
  a carousel graphic, and the Top agents cover figures.

## 11. OPS: export

- Use **Save all** on **Finish**, or **Share** → pick a format → **Export**.
- The files go flat into the Source folder: `…_3x4` for the feed, plus `…_9x16` for the story
  when **Story 9:16** is on. The session file and `Assets/` go beside them.
- **PDF** holds the feed pages only. It's always in **Share**; on the guided **Finish** page,
  **Download as PDF** appears when the post has more than one page.
- Unlike CAS, OPS asks before replacing files that are already there.

---

## 12. Photos

- **Adding:** drop a picture on its box, or click the box to choose a file. On a phone, tap.
- **Once a picture is in:**
  - OPS shows **Replace**, **Reframe** and **Remove** under it.
  - CAS shows **Remove** under the drop box, and **Replace** or **Edit** when you hover the photo
    on the canvas.
- **Reframe:** drag the picture to move it, use the zoom slider, then press **Done**. In CAS you
  can also double-click the photo on the canvas.
- **Agent cut-outs (OPS):** agent photos lose their background automatically while the removal
  service is running on this computer.
  - Install it once with `./tools/rembg/install.sh`.
  - Run `./tools/rembg/serve.sh` in Terminal while you work.

  The drop box tells you whether the service is on. Without it, upload a PNG that's already cut
  out.
- **Quality and privacy:** uploads are kept at up to 3840 px, so exports never upscale, and the
  photo's location data is removed.

## 13. Rules the studios keep for you

- **Type:** one font, Google Sans Flex. Headlines are Regular and body copy is Light. Small labels
  are tracked capitals. Every size sits on one scale (×1.2 per step), and nothing is smaller than
  24 px on the canvas.
- **Logo:** only the `provident.` wordmark, placed left or centre, never right.
- **Image first:** copy should stay under about 40% of the canvas.
- **9:16 margins:** the copy stays clear of Instagram's and Facebook's own buttons. The studio sets
  these margins for you.
- **QR code:** small and in a bottom corner. Banners don't have one.

You don't need to set these; the layouts already follow them.

## 14. Troubleshooting

| problem | fix |
|---|---|
| "Source folder … is no longer where it was" | The folder was moved or renamed. Pick it again with **Source folder**. |
| No **Source folder** button, or everything downloads as a zip | You're in Safari or Firefox. Use Chrome or Edge. |
| The type looks like a different font | Open the file in Chrome, from this folder, with `fonts/` and `_ds/` next to it. |
| A photo is missing after opening a session file | A session file only carries the photos that were saved with it. Drop the photo again. |
| An agent photo keeps its background | Background removal is set up once per computer with `./tools/rembg/install.sh`, and then starts by itself at every login. If it's off, run `./tools/rembg/serve.sh`, or upload a PNG that's already cut out. |
| The top bar is cut off and **Share** is missing | Make the window wider. CAS's top bar needs about 1150 px. |
| Old files are still in the export folder | Exports overwrite but never delete. Remove old files by hand. |
| A project isn't in **Recent** | Only saved projects are listed. Press **Save**. |
| An export went into the wrong design folder | CAS's Master is **Variant A**, Variant 2 is **B**, Variant 3 is **C**. |
