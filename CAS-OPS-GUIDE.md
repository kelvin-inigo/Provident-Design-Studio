# CAS & OPS — user guide

How to use the two Provident design studios in this folder.

| | file | for |
|---|---|---|
| **CAS** — Campaign Ads Studio | `Provident Campaign Studio.dc.html` | paid Meta ads (1:1, 3:4, 9:16, a horizontal 1.91:1) and Eventbrite banners |
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
15. [For Claude: the studio tools](#15-for-claude-the-studio-tools)

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
- **Every tab is its own workspace.** When you open a studio, a `?ws=…` tag appears at the
  end of the address. That tab has its own project and photos, so several tabs (or several Claude
  Cowork sessions) can work at once without changing each other. Reloading keeps the tab's
  workspace; a new tab gets a new one. **Saved projects are shared**: every tab's Projects screen
  lists all of them, and in a new tab **Continue last** opens the newest saved project. The source
  folder you picked last is the starting folder in a new tab. Unsaved work belongs to its tab, so
  save before closing a tab. To work on one project in two windows at once, open both with
  `?ws=shared`.

## 2. Projects: new, open, save

Each studio opens on its **project browser**.

- **Start something new:**
  - In CAS, press **New campaign**, or click a template card: New launch, Event, Payment plan
    or Spec ladder.
  - In OPS, click a template card, or press **New post** to get **Pick a template**.
- **Continue last** reopens the project you were working on; the line under it names that project.
- **Save** (top bar) writes the project into your **Source folder**:
  - the session file (`<name>.adstudio.json` for CAS, `.smpstudio.json` for OPS);
  - an `Assets/` folder with a copy of every upload.

  The first time, it asks you to pick the folder. After that it saves in place.
- **Open session**: pick the project's folder, and the newest session file in it opens. A session
  file from the other studio opens in that studio.
- **Source folder** (top bar) picks or changes the folder that saves and exports go into.
- **Recent** only lists projects that have actually been saved. A save, an export into the Source
  folder, and opening a session file all count.
- **Undo** / **Redo** (top bar) go back up to 5 steps.
- **From the hub** (sidebar, under Library) lists what the Content Hub has received from **Send**,
  newest first, with a few of the sent images on each card. Click one to open it as a project:
  its words, layout and the photos it was sent with all come back. A delivery made in the other
  studio opens there. The hub keeps its copy; nothing is deleted. It uses the **Endpoint URL** and
  **Import token** from **Share › Import hub**; **Refresh** asks the hub again.
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
- **Add a component:** click a card (or its **+**) in **Design Components**. The cards are in four
  groups: **Text** (Eyebrow, Hero headline, Hook line, Body line), **Data** (Price block, Spec data,
  Tag chips, Bullet list, Process steps), **Action & media** (CTA button, Graphic) and **Structure**
  (Divider, Spacer). Click a group's heading to fold it; a folded group lists what it holds, and
  the computer remembers which groups you folded. A card already on the canvas shows **N in use**;
  hover a card for what it is.
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
  | Spec data | Row, Ladder, Icon row, Glass row, Glass ladder, Pills |
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
  - **Hide / Show** hides it on this variant; **Delete** removes it.
- **Turn it into another component:** the first button on that bar names the component (e.g.
  **Hero headline ▾**). Press it and pick another kind (Text, Lists or Action): a headline can
  become a body line, a bullet list, tags, key facts, a price, a button and so on. The words come
  across line by line, and it keeps its place and visibility. Its style and size start fresh
  (the new kind's first style, size M). Undo turns it back. Dividers, spacers and graphics carry
  no words, so they have no Turn into.
- **Hide it on one variant:** **This component** → **Hide in Master** (or in the variant you're
  on). Hidden components are listed under **Hidden components**, where you can show or delete
  them.
- **Icons** (Process steps, Icon pills and the spec Icon row): type a Material Symbols name in the
  icon picker, e.g. `calendar_month`, `schedule` or `location_on`, and press Enter.
  The search covers every Material Symbol (3,929 icons) by name and by keyword: type part of a
  name, e.g. `pool` or `stadium`, or a plain word for what you want, e.g. `beach`, `swim` or
  `city building`, and pick from the results. Name matches come first, keyword matches after. The same search is in OPS's stats icons. In both studios (CAS's icon picker, and OPS's Stats and Icon grid pages), the picker with nothing typed shows **every** Material Symbol, 160 at a time: **Show more** adds the next 160, **Show all** lists them all, and the line above the grid says how many there are.

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

  **Scaling**, **Vertical spacing** and **Scrim** fold away. Closed, each one still shows its
  current setting; click its title to open it. **Background image** and **Hidden components**
  in the middle rail fold the same way, and the app remembers which ones you leave open.
  The style previews show every style at once, two to a row. A reset button only appears once a value has been moved.

**Checking it:**
- **Copy %:** each canvas shows how much of the ad the copy covers. Above 40% it turns amber,
  because the image should always outweigh the words.
- **Preview** (top bar) shows the ad on three phones at once — Feed, Reels and Story —
  for one app at a time. The **Facebook | Instagram** toggle picks the app: the Facebook feed
  shows the 1:1, the Instagram feed the Portrait 3:4, and Reels and Story both show the 9:16.
  **Light** or **Dark** sets the phone's appearance for the feed (Reels and Stories are always
  dark, as in both apps). The advertiser's profile photo is the provident. wordmark, and the
  mock-up's primary text, headline and button are filled from the ad's own words.

**Recreate a component from a screenshot** (with Claude Code):
1. In Claude Code, drop a screenshot of **one** element (a rating badge, a price card, a countdown
   strip) and type **`/cas-component`**. Cropping to the element gives the best result.
2. Claude rebuilds it in the brand's own type, colours and spacing, using the same treatments as
   the existing components (glass card, outline pill, divided strip and so on). It comes back
   with three or four styles, one text field per piece of text, and matching icons. Claude tells
   you what each style is and copies the component to your clipboard.
3. Open CAS's editor and press **⌘V**. The component lands on the canvas, selected, for **this
   project only**.
4. Select it to edit it like any other component:
   - **Style** tiles and **Size** S / M / L / XL.
   - **Align:** Follow ad, Left or Centre.
   - One text field per part, each with **Hide** / **Show**.
   - **Icon colours**, and the icon picker for each icon slot.
   - **Save to library**, to keep it under **Custom** for every project on this computer.

   A saved project carries its custom components with it, so another computer can open it.

No API key or service is needed: Claude Code reads the screenshot.

## 4. CAS: variants, carousels and sizes

- **Add Variant** (the pill at the foot of the canvases) copies the variant you're on. You can
  have up to 3: the Master plus two more.
  - The components and their words are shared by every variant.
  - Layout, style, visibility and photo are set per variant.
- **Edit** / **Editing** on a plate chooses which variant the side panels edit. **Remove** deletes
  that variant; the Master can't be removed.
- **Each canvas row** is its name, its ratio, and icon buttons on the right (hover one to see
  what it does):
  - **Link** — the canvas mirrors the 1:1. Press it to edit that canvas's layout separately;
    press it again to mirror the 1:1 again. Unlinking keeps the layout exactly as it was, so
    nothing moves until you change it.
  - **Alignment** — appears once a canvas is edited separately. It shows that canvas's alignment;
    press it to switch between left and centre. The rail's **Alignment** does the same while that
    canvas is selected (it reads *this size only*).
  - **Logo** — click a separated canvas (anywhere on it) and the Layout rail edits that canvas:
    its heading reads e.g. *Master · 9:16 (own layout)*, and the **Logo** tiles and **Alignment**
    set the wordmark corner and alignment for that canvas only. It starts where the variant's is.
  - **Picture** — give that canvas its own photo instead of sharing the main one.
  - **Eye** — show or hide the canvas. A hidden canvas is not exported.
- **Portrait 3:4:** hidden by default — press the eye on its row to show it. It mirrors the 1:1
  until you press its link button. It exports as `<name>_Variant A_Portrait_3x4.jpg` at 2160 × 2880.
- **Portrait Fix (temporary):** shown by default under the 3:4 row. It is the 9:16 Story with
  260px more clearance at the top (520 in all). Same link, picture and eye buttons, and a
  **Scale** slider right under its row (58–100%, on its own — it does not move the Story). It exports as
  `<name>_Variant A_Portrait_Fix.jpg` at 2160 × 3840.
- **9:16:** it mirrors the 1:1 until you press its link button.
- **Horizontal 1.91:1:** press the eye on its row to show it. It is a 1200 × 628 landscape, and
  its words run the full width of the canvas. It exports into the variant's folder with the other
  images (section 7).
- **All variants** (the pill next to **Add Variant**, which shows how many variants you have
  out of the most allowed) holds the settings for the whole project:
  - **Format** is a pair of cards: **Single ad** or **Carousel**. A tick marks the one in use. A carousel has up to 10 pages,
    and each page has its own components, words and photo.
  - **Story 9:16**, **QR code** and **Collaboration logo** are switches. The line under each
    one says what it does right now. Story 9:16 only appears on a carousel. With the QR code
    on, pick the **Corner** it sits in.
  - **Typeface:** **English** or **Arabic**. Arabic mirrors the whole ad for right-to-left
    reading: a left-aligned design becomes right-aligned, the logo moves to
    the right (the photo is left as it is, so any sign or logo in it still reads correctly) and the QR code moves to the other corner (the code itself is not flipped, so it
    still scans). Lists, steps and tags read from the right. A centred design stays centred.
    Your alignment setting doesn't change, so switching back to English restores the layout.
  - With the collaboration logo on, add the partner's mark and set its size and colour.

## 5. CAS: the Eventbrite banner

1. On a plate, find the **Eventbrite banner** row and press its eye button. Two canvases appear:
   **1880 × 940** and **758 × 380**. They're one design, and the photo fills each one edge to edge.
2. The link button unlinks the banner from the 1:1. The picture button gives it its own
   picture, which both banner sizes share.
3. In **Scaling**, the rows **1880** and **758** size the two banners separately. Raise the **758**
   (it goes up to 150%) when its words are too small for an email.
4. Banners never carry a QR code. They're clicked, not scanned.
5. The banner is laid out like the Horizontal 1.91:1: the copy runs across the full width,
   not squeezed into a column on the left, and the darkening sits behind the top and bottom copy.

Eventbrite shows the 1880 file at 940 px wide on a desktop and 375 px wide on a phone. On a phone
only the headline really reads, so keep the words few and big.

## 6. CAS: the Copy workspace

This is for copywriters: the ad's words on their own, next to a live preview.

1. Press **Copy** in the top bar — the switch reads **Copy | Design**. **Design** takes you
   back.
   - The big preview is the real export.
   - The picker above it chooses which variant (or page) you're looking at.
2. **Start from a brief (optional).** The **Brief to copy, with Claude** card at the top runs
   the `meta-ad-design-copy` skill in your own Claude.
   - Paste the brief (script, fact sheet, EOI brief), tick the audiences, and add any notes
     (permit number, what to lead with).
   - **Where it saves** shows the Source folder this campaign saves and exports into, with
     **Choose folder** / **Change**, and takes the project's Google Drive folder link. Both go
     into the prompt.
   - **Attach pictures** (optional): a **Logo** and up to 10 **Photos & images**. On Fill, the
     first pictures become the backgrounds of the design variants (or carousel pages) in order,
     and the logo becomes the partner mark beside provident. (collaboration logo turned on). Any
     picture can also go on the ad as a graphic with **As graphic** under it. The prompt tells Claude what is
     attached so it doesn't flag the logo as missing. Attachments stay in the card, not in the
     session file.
   - **Open in Claude** opens the Claude app with the prompt typed in; press Return there. The
     prompt is also copied, so if Claude opens empty, press ⌘V. **or use claude.ai** opens the
     website instead. A very long brief is not typed in for you; paste it from the clipboard.
   - Paste Claude's whole reply into step 3. The card lists Claude's **Flags** as checkboxes,
     lets you pick **Families** or **Investors** and the main or an alternate heading, and shows
     which field each line goes into.
   - **Fill this campaign** puts only the critical details on the ad: small label, heading,
     hook line (project), price, up to two key-fact rows (payment) and button. Claude is asked to
     keep each one short; support lines and amenities stay in its reply for you to read. It
     reuses the components already on the page and adds any that are missing at the end. With **Remove components this
     copy doesn't use** on, template sample text is cleared. **Undo** reverses the whole fill.
   - Families and Investors are separate campaigns: fill one, then start a new campaign for the
     other. The brief and the reply stay in the card.
3. Fill in the fields.
   - **Add to this page** adds a component, grouped as Text, Lists or Action. It arrives in its
     basic look; the designer styles and places it.
   - The bin icon removes one, and the notice that appears offers **Undo**.
4. **Reorder** a line by dragging its grip, or focus the grip and use the arrow keys.
5. **Hand the copy off:**
   - **Send to design** saves a snapshot and marks the copy "With design".
   - **Mark as final** saves another snapshot and marks it "Final".
   - **Reopen for edits** and **Back to draft** step back without saving a snapshot.
6. **History** lists every snapshot, each with its own `.docx`.
   - **Your name** labels the snapshots made on this computer.
   - **Download .docx** gives you the words as they are right now.
   - With a Source folder set, every hand-off also writes
     `Copy/<name>_Copy_<Status>_<date>.docx` into it.

CAS remembers which workspace (Design or Copy) you last used on each computer, so a copywriter's
machine reopens on Copy.

## 7. CAS: export

1. Open **Share** and check the **Campaign name**.
2. Under **Format**, pick a card. All are exported at 2×:
   - **JPEG**: the smallest files, and what Meta takes.
   - **PNG**: lossless, but large.
   - **SVG**: vector text.
   - **PDF**: one document.
3. Press the button at the bottom. It names what it will do, for example **Export 6 JPEGs**. The result shows under it. The files land like this:

```
Source folder/
  Variant A/                        ← the Master; Variant B and C for more variants
    <name>_Variant A_feed.jpg       ← 1:1
    <name>_Variant A_Story.jpg      ← 9:16
    <name>_Variant A_Landscape_1.91x1.jpg        ← 1200 × 628, only if shown
    <name>_Variant A_EventBrite_Banner_wide.jpg  ← 1880 × 940
    <name>_Variant A_EventBrite_Banner_Small.jpg ← 758 × 380
  <name>.adstudio.json   Assets/    ← the session and uploads, refreshed on every export
```

- **Every export overwrites the last one without asking.** It never deletes anything, so files an
  export no longer writes (a removed variant, a hidden banner, old names) stay until you delete
  them yourself.
- **There are no folders inside a variant's folder.** Every image of that variant sits side by
  side; the file name says which one it is.
- A **carousel** exports into one `Carousel/` folder, with files named `<name>_page1_feed.jpg` and
  so on, banners included.
- **Without a Source folder**, you get a zip with the same folders inside.
- **PDF** is one file with every size, saved wherever you choose.

### See everything you exported: Ad sets

On CAS's home page, press **Ad sets** in the sidebar, in the **Review** group. It opens in its own window. It reads the Source folder
and finds every exported ad set.

- **The list on the left** is every audience, grouped under its main folder (Local, International,
  International EUR — Local comes first). Each one says how many variants and images it holds.
- **Click an audience** to show it on the right: its name and main folder at the top, then one row
  per variant (Variant A, Variant B …). Each row shows its
  **Meta** images: Feed, Portrait 3:4, Portrait Fix, Story and the Horizontal 1.91:1. A small line under each image
  gives its pixel size and file size.
- **All audiences**, at the top of the list, shows every audience in the folder in one window,
  each under its own heading. (Edit text works one audience at a time, so it is hidden there.)
- **Each audience has its own Download** — beside Download all when one audience is on screen
  (*Download Family · 4*), and on each audience's heading in All audiences. It saves that
  audience's images as one zip, named after its main folder and audience (`Local - Family.zip`).
- **Download all**, at the top right, saves every image in the folder as one zip named after the
  folder. The files sit side by side with no folders inside; their names already say the variant
  and size, and where two audiences share a file name, the main folder and audience are added
  to the front (for example `Local Family Test_Variant A_feed.png`).
- **Images | Edit text** at the top of the window switches what you work on. The window remembers
  which one you used last.

#### Change the words: Edit text

Press **Edit text** to work on the words of the audience on screen, without opening the studio:

- The left column holds the ad's words: Small label, Heading, Hook line, Tags, Button and so on.
  A single ad shares its words, so a change updates every variant.
- The right column shows every image that audience exported, rendered fresh as you type.
- **About a second after you stop typing, the change is saved** into the project's own
  `.adstudio.json`, and **every image it had already exported is exported again over its file**
  (same name, same JPEG or PNG, same size), banners included. Nothing new is added to the folder.
- The pill at the top says where it is: *Editing…*, *Saving…*, then *Saved to Family.adstudio.json ·
  4 images re-exported · 13:20*. **Save now** saves at once. Switching audience, going back to
  **Images** or closing the window also saves first, and **Images** then shows the new files.
- **Allow editing**: a folder you dropped or picked is read-only until you allow it. Press the
  button once; the browser asks permission to change files there. Your Source folder needs nothing.
- If the project file carries no photos, only the words are saved and the images are left alone —
  re-exporting would drop the photos. Save the project from the studio once to include them.
- If that project is also open in the studio, the open copy does not see these edits. Reopen it
  from the folder (Open session) to continue there.
- To add or remove a line, move it or change its look, use the studio's Copy and Design views.

#### What it shows

- It looks for **saved projects**: folders holding a `.adstudio.json`. Point it at the campaign
  folder that holds Local / International, or at a single project folder. A project directly in
  the Source folder uses its campaign name as the audience.
- Only `<name>_Variant A_feed`, `_Portrait_3x4`, `_Portrait_Fix`, `_Story` and
  `_Landscape_1.91x1` files are shown, from the Variant folders. Banners, carousels and anything
  else are left out.
- **A size that was not exported is simply not shown.** A variant or audience with nothing to
  show is left out.
- It shows the files as they are on disk, so export first, then press **Refresh**. Click an image
  to see it large: the top line says where it sits (Local › Family › Variant A › Meta · Feed), and
  the arrows or **←** / **→** step through every image in the window in order. **Esc** closes it,
  and **Esc** again closes the window.
- **Details** beside the **Meta** label opens its images beside an analysis of the ad, read
  from its saved project:
  - **Marketing angle** — the theme the copy leans on hardest (Workspace and business, Payment
    plan and entry price, Location and connectivity, Golden Visa and residency, Investment and
    returns, Launch and urgency, Lifestyle and luxury), with the words that show it and any
    other angles it also uses. The headline counts most, then the hook.
  - **Audience** — the market and segment from the folders, the currency, and who the copy
    speaks to (investors, business owners, residency seekers, families…).
  - **USP** — every selling point the ad states: its tags, key facts, bullets, hook, price
    and location label.
  - **Copy ratio to image** — how much of the picture the text, panels and buttons cover, for
    the format you are looking at, against the brand's 40% guide.
  The analysis reads the words only; it does not change anything.
- Each variant row shows how many images it holds.
- With no Source folder set, the window offers **Choose source folder**. It needs Chrome or Edge.

#### View any folder: drop it

You do not have to change your Source folder to look at someone else's exports. On CAS's home
page, in the **Ad sets viewer** panel, and in the Ad sets window (press **Drop a folder**):

- The viewer is for **looking at finished exports**, not for opening a project to design. To
  keep designing, use **Open session** at the top of the page. **Open viewer** in the panel
  opens the Ad sets window on your Source folder.

- **Drop a folder** anywhere on the page. Use the project folder (the one holding the
  `.adstudio.json` and its Variant folders), or a folder above several projects. You can also
  **click** the drop area (*Drop an exported campaign folder to view its ads*) to choose one.
- The window shows the folder exactly as it shows the Source folder. Nothing is written to the
  dropped folder unless you change its words in **Edit text** and press **Allow editing**.
- The bar says which folder you are viewing. **Use source folder** goes back to your own, and
  your Source folder is never changed by viewing another one.

#### Open a Google Drive folder link

Under the drop area there is a **Google Drive** box. It works in any browser, with no Drive app
installed.

- **First time on a computer:** paste the OAuth client ID your admin gave you and press
  **Save**. The admin's steps are in `docs/google-drive-setup.md`.
- **Paste the folder's link** (the address of the folder in Drive, containing `/folders/`) and
  press **View ads**. Sign in with your Provident Google account; allow pop-ups if the browser asks.
- The folder opens like a local one. In **Edit text**, saving writes the project file and the
  re-exported images back into that Drive folder, so its files and share links stay the same.
- You can only open and change what your account can already open and change in Drive. A
  sign-in lasts an hour; after that, Edit text shows **Sign in with Google** and keeps your
  edits until you do. **Sign out** is in the Google Drive box.

---

### Audit the components: Component usage

On CAS's home page, press **Component usage** in the sidebar, in the **Review** group. It counts
every design component, and every style of it, across the saved projects in **Recent** (the studio
keeps your 10 newest saved projects, so that is the sample).

- Every component and every style has a **picture of it**, drawn the way the export draws it.
- Each one carries a verdict and the reason for it:
  - **Worth keeping** — a third or more of the projects use the component (at least two), or a
    style is picked in two projects or for a quarter of its component's uses.
  - **Needs rework** — used, but only rarely, or added and then hidden more often than shown.
  - **Consider deleting** — no saved project uses it.
- The three boxes at the top count each verdict. Press one to see only those; press it again,
  or **Show everything**, to go back.
- The big number is how many projects use the component. Hover anything to see which projects.

Only saved projects count. A project you have opened but never saved is not in the numbers. With
fewer than five saved projects the page says so — treat the verdicts as early signals.

- **Send … + .json** (under the Export button in **Share**) sends the project `.json` and every
  exported image to the import hub. The first time, press it and paste your import token into
  the **Import hub** fold that opens (the URL is already filled in); both stay on this computer.
  A PDF stays local, so Send sends JPEGs. On the website, Chrome asks to allow access to
  your local network the first time: press **Allow**. If the delivery is over the hub's 50 MB,
  the images are sent as JPEGs, compressed just enough to fit. See `docs/studio-endpoint.md`.
  A project opened from a **Content Hub design job** remembers its post, so Send attaches the
  pages to that post and moves it to **Ready to publish** ("attached to the hub post").


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
| **Carousel** | up to 10 pages | Each page has a layout: Front page, **Key figure** (a big number beside its caption, a split bar and a row of facts), Stats, Bullets, **Price table** (rows of type, detail and price), **Cards** (stacked glass cards — a heading, an optional tag and a line each — with an optional badge top right), **Icon grid** (three-across icons with labels, for amenities), **Payment plan** (a bar split by the payment shares), Text, **Quote** (a quotation and who said it), **Big number** (one figure set huge, with a headline and a line or two under it), **Steps** (a headline over up to five numbered steps) or Call to action. The Front page can also carry a kicker above the headline and a key-facts line under it; the Call to action can carry a key-facts line under the button and a web address under the wordmark. On the Key figure, Price table, Icon grid and Payment plan, use **‹ ›** to set how many facts, rows, icons or payments there are, then fill in each one. Cards uses the same **‹ ›** for one to four cards. A new carousel opens on the first five; switch any page to another layout from its Layout tiles, and its words come with it. **Brass highlight** colours a word in a headline. Switches control the overline and the permit number. The overline can be **Brass** or **White**, per page. **Page photo** gives one page its own photo strength. **Logo** in Post look is a dropdown — **Provident**, **Vacation Homes**, **Property Boutique**, **Property Solutions** or **Prism** — and the chosen mark goes on every page. You can drop a floating graphic and drag it. Drag the inside pages to reorder them. |
| **Reel thumbnail** | one 9:16 Reel cover | 7 layouts: Masthead, Pop-out, Editorial, Caption, Punchline, Centre stage and Big number. **Text size** runs Small to Jumbo and steps down on its own to fit. **4:5 guide** shows what the profile grid shows. On Pop-out, **Remove background** puts the subject in front of the headline. **Logo** in Post look picks the mark at the top: Provident, Vacation Homes, Property Boutique, Property Solutions or Prism. |

## 10. OPS: All controls

This is the full editor.
- **Left rail:** the **Template** and the list of slides. Click a slide to edit it; add pages
  where the template allows. Hover the **i** beside Template or Slides for how they work. A
  slide's **✕** shows when you point at the slide (or on the slide you are editing).
  - On a carousel, **Layout** (the page's layout) and **Wordmark** (Hide / Top / Bottom) fold:
    click the heading to fold one, and a folded one shows its current choice. On a Reel
    thumbnail, **Layout** and **Text size** fold the same way. The computer remembers what you folded.
- **Right rail:** the same form as the guided run, for the page you're on. Each section
  (Words, Pictures, …) folds from its heading or the arrow at its right, and stays folded as
  you move between pages. The guided run itself never folds.
- **Post look** (the pill at the foot of the canvases): settings for the whole post.
  - **Story 9:16**, a switch: on, every page also exports a 9:16 story.
  - Wash strength, photo strength and panel colour (White or Navy, each shown with its colour).
  - Photo darkening, on the listing card.
  - The wash, on a carousel.
  - The logo (Provident, Vacation Homes, Property Boutique, Property Solutions or Prism), on a carousel or a Reel thumbnail.
- **The bar under the canvases:**
  - **Show story 9:16** adds the story canvas. It's also what decides whether stories are exported.
    While the story shows, each page carries a **Story 9:16** row above it; its eye button hides it.
  - **This page** jumps to the page's form.
- **On the canvas**, some templates let you drag things: the listing photo, a review's portrait,
  a carousel graphic, and the Top agents cover figures.

## 11. OPS: export

- Use **Save all** on **Finish**, or open **Share**: set the file name, pick a **Format** card, then press the button at the bottom. It names what it will do, for example **Export 6 JPEGs**.
- The files go flat into the Source folder: `…_3x4` for the feed, plus `…_9x16` for the story
  when **Story 9:16** is on. The session file and `Assets/` go beside them.
- **PDF** holds the feed pages only. It's always in **Share**; on the guided **Finish** page,
  **Download as PDF** appears when the post has more than one page.
- Unlike CAS, OPS asks before replacing files that are already there.
- **Send … + .json** (under the Export button in **Share**) sends the project `.json` and every
  exported image to the import hub. The first time, press it and paste your import token into
  the **Import hub** fold that opens (the URL is already filled in); both stay on this computer.
  A PDF stays local, so Send sends JPEGs. On the website, Chrome asks to allow access to
  your local network the first time: press **Allow**. If the delivery is over the hub's 50 MB,
  the images are sent as JPEGs, compressed just enough to fit. See `docs/studio-endpoint.md`.
  A project opened from a **Content Hub design job** remembers its post, so Send attaches the
  pages to that post and moves it to **Ready to publish** ("attached to the hub post").
- **The hub's design queue** (posts someone pressed *Approve and send to design* on): in Claude,
  run **/hub-design-queue**. It lists the queue, claims the post you pick, lays it out as an OPS
  carousel from the hub's copy and brief photos, shows you the pages, then exports and sends
  them back to the post.

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
- **Edit in Photoshop (extend, retouch, Generative Expand):** once a picture is in, press
  **Edit in Photoshop** (OPS: under the picture; CAS: under the drop box, or **Photoshop** when you
  hover the photo on the canvas). Photoshop opens the picture. Edit it, then **save** (⌘S). Any
  format works, PSD included, as long as you keep the same name. The studio picks up each save
  within a couple of seconds, and the picture's framing resets to fit its new size.
  - The photo shows *Open in Photoshop — save there to update* while it is linked. **Unlink**
    stops watching. Replacing or removing the photo also unlinks it.
  - Pressing the button again while linked just brings the same file back up. It never
    overwrites the file you're working on.
  - Set it up once per Mac with `./tools/photoshop/install.sh`. After that it starts by itself at
    every login.
  - Without it, in Chrome or Edge with a **Source folder** set, the button still works: it saves
    the picture to `<Source folder>/Photoshop/` for you to open in Photoshop yourself. Save it
    back as PNG or JPEG under the same name (not PSD), and it updates the same way.
  - **An SVG opens in Illustrator instead** (the button reads **Edit in Illustrator**), so a
    partner mark or graphic stays vector. Save it there as SVG with the same name (⌘S, then OK
    on the SVG options). Saving as `.ai` does not come back.
  - Not available in the iPhone app.
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
| No **Edit in Photoshop** button | Set it up once with `./tools/photoshop/install.sh`, or set a **Source folder** in Chrome or Edge. The button appears within 15 seconds; no reload needed. |
| Saved in Photoshop but nothing changed | Keep the same file name (⌘S, or Save a Copy with the same name). Without the helper, save as PNG or JPEG, not PSD. |
| The top bar is cut off and **Share** is missing | Make the window wider. CAS's top bar needs about 1150 px. |
| Old files are still in the export folder | Exports overwrite but never delete. Remove old files by hand. |
| A project isn't in **Recent** | Only saved projects are listed. Press **Save**. |
| **From the hub** says it can't reach the hub | Be on the office network. On the website, press **Allow** when Chrome asks about devices on your local network (and allow Chrome under System Settings › Privacy & Security › Local Network on a Mac). Safari and Firefox can't read the hub from the website. |
| **From the hub** says the token was refused | Set the **Import token** in **Share › Import hub**. |
| A project from the hub has no photo | It was sent before a photo was added, or the photo was never in the studio (the sent pictures are the finished exports, which aren't put back). Drop the photo again. |
| ⌘V does nothing after `/cas-component` | Make sure CAS is showing the **editor** (not the project browser or Copy), then press ⌘V again. Claude also saved it in `custom-components/` — open that file and copy its contents if the clipboard was overwritten. |
| An export went into the wrong design folder | CAS's Master is **Variant A**, Variant 2 is **B**, Variant 3 is **C**. |

## 15. For Claude: the studio tools

When the **provident-studio** connector is available, Claude can make CAS and OPS work itself
instead of explaining the clicks. It runs the real studio in the background, so the result is
exactly what the studio would export.

1. `studio_catalog` (studio `cas` or `ops`) — the templates and every field they ask for.
2. `studio_new_project` — start from a template; or `studio_read_project` on an existing
   `.adstudio.json` / `.smpstudio.json`.
3. `studio_edit` to fill fields, `studio_set_image` for photos, QR codes and logos (agent photos
   are cut out automatically when background removal is running).
4. `studio_preview` — look at it before exporting.
5. `studio_export` — PNG, JPG, SVG or PDF, with the studio's own file names and folders.

Rules for Claude: ask for anything you don't have — never make up a listing number, price, permit
or name. Every required field must be filled; the export says what is missing. The project is a
normal session file, so the user can open it with **Open session** to fine-tune by hand. Setup:
`sh tools/studio-mcp/install.sh`, then restart Claude (see `tools/studio-mcp/README.md`).

