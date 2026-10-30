# CAS & OPS — user guide

How to use the two Provident design studios in this folder.

| | file | for |
|---|---|---|
| **CAS** — Campaign Ads Studio | `Provident Campaign Studio.dc.html` | paid Meta ads (1:1, 3:4, 9:16, a horizontal 1.91:1) and Eventbrite banners |
| **OPS** — Organic Post Studio | `Provident Organic Studio.dc.html` | organic feed and story posts, built from locked templates |

> **For Claude in Cowork — read this block first.**
> - **Answer "how do I…" questions from this file**, and quote on-screen names exactly as they
>   appear here in **bold**.
> - **On a computer you haven't used before, check the setup in [section 0](#0-set-up-on-a-new-computer)**
>   before starting any work: whether the folder is there and whether the **provident-studio**
>   connector is listed. Tell the user what is missing; don't work around it silently.
> - **If you have the provident-studio tools, do the work with them** ([section 15](#15-for-claude-the-studio-tools))
>   instead of describing clicks. If you don't have them, explain the steps, or click them yourself
>   if you have a browser tool. Tell the user which of the three you are doing.
> - **Never make up a fact that goes on an ad**: a listing number, price, permit, ADM/CN number, a
>   name, a phone number or a QR code. Ask for it. Every required field has to be filled before export.
> - **Don't change the studios.** Don't edit the `.dc.html`, `.js` or `tools/` files unless you
>   are asked to change the studio itself. `CLAUDE.md` is the engineering record of why things work
>   the way they do. It is very long, so search it rather than reading it whole, and only for
>   "why" questions or before changing code.
> - **Never write a token, key or password into a file in this folder.** The folder is a public
>   GitHub repository. Tokens are typed into the studio's own fields and stay on that computer.
> - When you finish, **tell the user where the files are**: the folder path and the file names.

**Contents:**
0. [Set up on a new computer](#0-set-up-on-a-new-computer)
1. [Opening the studios](#1-opening-the-studios)
2. [Projects: new, open, save](#2-projects-new-open-save)
3. [CAS: build an ad](#3-cas-build-an-ad)
4. [CAS: variants, carousels and sizes](#4-cas-variants-carousels-and-sizes)
5. [CAS: the Eventbrite banner](#5-cas-the-eventbrite-banner)
6. [CAS: the Ad set tab](#6-cas-the-ad-set-tab)
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

## 0. Set up on a new computer

Do this once on each Mac that will use the studios, including a teammate's Cowork.

**1. Get the folder.** The studios are files, not an installed app. Two ways:

| | how | what you get |
|---|---|---|
| **Website** | open `https://provident-design-studio.vercel.app` in Chrome | the studios to click through. Nothing to install, but Claude can't drive them, and the helpers below don't work |
| **The folder** (recommended for Cowork) | in Terminal: `git clone https://github.com/kelvin-inigo/Provident-Design-Studio.git "$HOME/Documents/Provident Design Studio"`. Without git, use GitHub's **Code › Download ZIP** and unzip it in Documents | everything: the studios, this guide, the Claude tools and the helpers |

Keep the folder as it is. The studios load their fonts and scripts from the folders next to them.
To update it later, run `git pull` inside it, or download the ZIP again.

**2. Open the folder in Cowork.** Pick the `Provident Design Studio` folder as the session's
folder. Claude then reads this guide, `CLAUDE.md`, and the folder's own skills:
**/cas-component** (a CAS component from a screenshot) and **/hub-design-queue** (design posts
the Content Hub has queued).

**3. Install the studio tools for Claude** (needed for Claude to make and export posts itself):

```bash
sh "$HOME/Documents/Provident Design Studio/tools/studio-mcp/install.sh"
```

Then quit Claude completely (⌘Q) and reopen it. **provident-studio** should now be in Claude's
connectors. It needs Google Chrome installed, nothing else. Run the script again if the folder
moves, because it records where the folder is.

**4. Optional helpers**, each set up once and then started at every login:

| helper | install | what it does |
|---|---|---|
| Background removal | `sh tools/rembg/install.sh` | cuts agent photos out automatically in OPS. Downloads about 1.1 GB once |
| Edit in Photoshop | `sh tools/photoshop/install.sh` | the **Photoshop** / **Illustrator** button on a picture |

Run these from inside the folder (`cd "$HOME/Documents/Provident Design Studio"` first).

**5. Settings each computer keeps for itself.** Ask the person who set up yours for the values:
- **Import token**, in OPS's **Share › Import hub**, for **Send** and **From the hub** (OPS only).
  The hub is `http://192.168.50.30:8090`, reachable only on the office network.
- **Google Drive client ID**, in Ad sets' **Google Drive** box. The admin's steps are in
  `docs/google-drive-setup.md`.
- **Your name** in a campaign's activity comes from your Google account.

**6. Skills that live in Claude, not in this folder.** `meta-ad-design-copy` (brief to Meta ad
copy) and `top-agents-of-the-month` are installed in your Claude account, not in this folder. If
your Claude doesn't list them, ask whoever set yours up to share them.

**Checklist for Claude:** the folder holds `Provident Campaign Studio.dc.html` and
`Provident Organic Studio.dc.html`; the **provident-studio** tools are available (try
`studio_catalog`); for agent photos, background removal is running. If any of these is missing,
say so and point to the step above.

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
  lists all of them, and in a new tab **Continue last** opens the newest saved project. A new tab
  has no Source folder until you pick one or open a session. Unsaved work belongs to its tab, so
  save before closing a tab. To work on one project in two windows at once, open both with
  `?ws=shared`.

## 2. Projects: new, open, save

Each studio opens on its **project browser**.

- **Start something new:**
  - In CAS, every project belongs to a **campaign** (an ad set). Use **Set up the campaign** at
    the top of **Home** (the first page of CAS): a **Name**, **Residential** or
    **Commercial**, a **Deadline**, the **Drive folder** (an empty Google Drive folder for this
    campaign), the **Brief** (paste the script, fact sheet or WhatsApp brief) and **Files**
    (renders, logos, brochures). By default the campaign is **Local**, both audiences, **English
    only**; press **AR** on an audience tile to add an Arabic version, and **Markets &
    audiences** for International or International EUR. Then either:
    - **File as ticket** — saves it in the Drive folder as an **open ticket** for a designer to
      pick up from **Status**. Performance marketing uses this. It shows the designer link to send.
    - **Start designing** — files the same ticket and opens its first audience straight away.
    There is no blank project and no preloaded templates any more.
  - In OPS, click a template card, or press **New post** to get **Pick a template**.
- **Continue last** reopens the project you were working on; the line under it names that project.
- **Save** (top bar) writes the project into your **Source folder**:
  - the session file (`<name>.adstudio.json` for CAS, `.smpstudio.json` for OPS);
  - an `Assets/` folder with a copy of every upload.

  The first time, it asks you to pick the folder. After that it saves in place.
- **Open session** (OPS, top right of the project browser) or **Open a project file…** (CAS, in
  the sidebar under Session): pick the project's folder, and the newest session file in it opens. A session
  file from the other studio opens in that studio.
- **Source folder** (top bar) picks or changes the folder that saves and exports go into.
- **Every new project starts fresh.** A new campaign or post, a template, or a project opened from
  Recent has no Source folder and no pictures from the one before. Pick its folder on the first
  Save. A new browser tab is a fresh session too. Opening a project file sets the folder it opens from.
- **Home** (CAS) is the first page. Under its title it counts your campaigns — open tickets, in
  design, ready to run — as Status last read them.
- **Recent** only lists projects that have actually been saved. A save, an export into the Source
  folder, and opening a session file all count. In CAS they are grouped by campaign: the
  campaign's name is the heading, and each card shows the audience, market and language, when it
  was saved and how many variants it has. Campaigns with only one project share an
  **Other projects** row. Hover a card to see its full name.
- **Undo** / **Redo** (top bar) go back up to 10 steps. A photo reframe counts as a step.
- **From the hub** (OPS only; sidebar, under Library) lists what the Content Hub has received from **Send**,
  newest first, with a few of the sent images on each card. Click one to open it as a project:
  its words, layout and the photos it was sent with all come back. A delivery made in the other
  studio (an older CAS delivery) opens there. The hub keeps its copy; nothing is deleted. It uses the **Endpoint URL** and
  **Import token** from **Share › Import hub**; **Refresh** asks the hub again.
- If there's unsaved work when you leave, the studio asks first.

### Share an edit link

**Share › Share an edit link** makes a link to the open project that other people can open, look
at and change. It works the same in CAS and OPS.

1. Press **Share an edit link** and **Make the link** (type your name if you're not signed in with Google). The project and its
   photos are uploaded, and the link is copied.
2. Send the link to the people who should edit. Anyone signed in with their Google account on
   that computer goes straight in under their Google name; nobody else is asked their name once
   (or can press **Sign in with Google instead**). The project opens with its photos in their
   browser; while it loads, the window shows three steps — **Read the project**, **Load the
   pictures** (with a count) and **Open it here**. **Cancel** stops the open. Campaigns on Drive
   always need the Google sign-in, so they never ask.
3. Everyone's changes reach everyone else within a few seconds. Two people can work at the same
   time: different fields are kept from both. If two people change the same field, the last
   save wins.
4. **Changes** (the button at the bottom right) opens the panel on the right. It lists who
   changed what, newest first: the field, what it said before (struck through) and what it says
   now, plus layout, setting and photo changes. A number on the button counts changes made by
   others since you last looked. Your name and Google email show at the top; **Not you?** switches
   the Google account (or **change** renames you, when you're not signed in).
5. Once shared, the button reads **Copy edit link**.

Things to know:
- **Anyone with the link can edit.** There's no sign-in. Share it only with people who should edit.
- The link works on the studio website and never expires, with its whole changelog. **Full-size
  photos** are kept 60 days after the link was last opened; after that the link shows small
  previews and the Changes panel says so. **Restore from a saved file…** puts them back for
  everyone (pick the project's saved `.json`), and opening the link on the computer that made the
  project restores them by itself. Export and Save ask first while a photo is only a preview.
- **Undo** stays on your computer, and it's cleared when someone else's change arrives.
- The link belongs to the PROJECT on this computer. Open the same project in another window, from
  Recent or from its saved file, and it reconnects by itself ("Reconnected to the ad set …"); what
  you changed while it was apart goes up to the link. Opening another project in a tab stops the
  link there. **Stop following this link** at the foot of the panel stops it on this computer
  until you open the link again.
- Putting a project in an ad set it is already in (**Pick up**, or **Make the ad set**
  into a Drive folder that already holds the ad set) reconnects it instead of refusing. A folder
  that already holds an ad set takes the project as another audience; a slot already taken by a
  different project says so.
- Saving, exporting and the Source folder are still each person's own.

**In CAS, share the Ad sets view.** In the Ad sets window, open a folder of exported ads and press
**Share**. The link carries every audience and variant in the folder, each project's
words and photos, and a preview of each image (about 1600px — not the full-size files). To keep the upload quick, the photos go up at a smaller size too (2000px), which is still more than the previews use. Whoever
opens it gets the same viewer: they can look through every audience, download the previews, and
change the words in **Edit text**, which re-draws that project's previews for everyone. The
**Changes** panel names who changed which audience's words. Your own folder is never changed by
edits on the link: Edit text there says *Saved to the shared link · the original folder is not
changed*, and the files the link was made from keep their old words. Once shared, the button reads **Copy link**. An ad sets link opened in OPS
moves to CAS.

### A campaign from ticket to package (CAS)

The flow has three moves for the designer, and the screen always offers the next one:

1. **Initial setup.** Performance marketing files the campaign as a ticket (above). In
   **Status**, the designer opens the ticket — its brief, files and audiences — and presses
   **Pick up**. A new project opens as the first audience, in English, on the **Ad set** tab.
   Run the meta-ad-design-copy skill in your own Claude on the brief, paste its whole reply into
   **Copy from Claude**, check the flags, and press **Fill with the … copy**. The reply is kept
   with the campaign.
2. **Design done.** Design the ad, then press **Design done** — in the bar under the canvas, or at
   the top of the Ad set tab. It first lists anything missing (empty words, no photo, a QR code
   with none added, too much copy on a canvas); press OK to send anyway. The content team checks
   the English copy from their link.
3. **Create next audience.** The same button now reads **Create next audience**. It opens a
   blank project for the next planned audience, on the Ad set tab, with Claude's reply already
   there and that audience picked: press **Fill**, design, **Design done**. Once an audience's
   English copy is approved, the button offers **Make the Arabic** — a copy of the design in the
   Arabic typeface, to translate.

When every audience is done, performance marketing downloads the package from their link.

### The roles, and the four steps of each audience

A campaign covers every project of one ad set, for each market, audience and language, under
**one set of links**. The links are in the Ad set tab, under **Links for the teams**.

| who | the link opens | they can |
|---|---|---|
| **Designer** | the ad set's overview, with each project one click from the full studio | design, mark steps done, add projects, put work back in progress |
| **Content team** | the words of every project beside its images | change the words, approve the English copy and the translation |
| **Performance marketing** | every project's images, always the latest | download each audience when it's done |

**Markets:** Local, International, International EUR. **Audiences:** for Residential, Family and
Investor. For Commercial, Investor and Hybrid (an end user who rents but may buy a commercial
space). **Languages:** English and Arabic.

Each **audience** (a market plus an audience, for example *Local · Family*) goes through four
steps: **Design › ENG copy check › Translation › Done**.

1. **Start the campaign** with **Set up the campaign** on the home page (see *Start something
   new*). Google asks you to sign in with your Provident account the first time.
2. **Design.** The top bar, beside **Ad set | Design**, always shows where this project stands
   in its campaign: four small bars for the four steps, the step it is on, and its market,
   audience and language (for example *Design · Local · Family · EN*). Beside it is the one
   thing to do next. When the design is ready, press **Send to copy check** (an Arabic project
   says **Send for translation check**). It first lists anything missing: empty words, a page or
   variant with no background photo, a QR code switched on with none added, or copy covering
   more than 40% of a canvas. Fix them, or press OK to send anyway. While the content team has
   it, the current bar turns amber and the step reads **Copy check**; the button moves on to
   **Create next audience** or **Make the Arabic**. **Back to design** is in the **Ad set** tab.
   Clicking the status opens the Ad set tab. On a narrower screen the studio switcher leaves the
   bar to make room; it is still on the home page.
4. **ENG copy check.** The content team opens their link and picks a project on the left. Its
   words are beside every image, which update as they type, and the designer sees the change
   within seconds. **Approve English copy** in the panel signs it off.
5. **Translation.** The designer adds the Arabic project for that audience, lays it out and presses
   **Send for translation check**. The content team checks it and presses **Approve translation**. If an
   audience needs no Arabic, the designer ticks **No Arabic for this audience** and the step is
   skipped.

   **Already approved.** For an ad that was signed off before it came into the studio, the designer
   can skip the content team: **Already approved** (in the Ad set tab's header, the review panel,
   and under each project in Status) marks it designed and approved in one step, after asking once.
   The activity log says who marked it. **Reopen copy check** undoes it.
6. **Done.** An audience is done when its design, English copy and translation are signed off.
   The ad set is **Package ready** when every audience is.
7. **Performance marketing** opens their link. A bar at the top shows the ad set's progress and
   one row per audience. Each finished audience has **Download**, which zips its English and Arabic
   images, named the way an export names them. **Download package** (or **Download finished
   audiences** before then) takes every finished audience. Images are rendered from the projects as
   they are now. This link can't change anything. There is no side panel on this link: the bar's **See details**
   holds the steps, the dates and each audience.

The **Ad set** tab lists every audience, with its progress (**AR** on a tile plans or drops its
Arabic version; **Ad set settings** changes the rest, see below), then the brief and files from
the ticket, the **Activity** — who changed what, including each step — and **Links for the teams**.
In a campaign project the floating **Changes** button is gone: the Ad set tab carries all of it.

**Chrome notifications.** When someone else presses a step button (Send to copy check, Approve,
Back to design, Reopen), everyone who has that ad set open gets a Chrome notification, whether
the tab is in front or in the background. Clicking it brings the tab forward. Chrome asks
permission once, the first time you press a step button; you can also turn it on with **Notify
me in this browser** in the panel, or **Notify me** in performance marketing's bar. It only
reaches a browser with the project or ad set link open in some tab: a closed browser gets
nothing. A background tab checks about every 45 seconds, so a notification can arrive up to a
minute late there.

The **preview picture** each project shows on the Status page is redrawn after every save,
photos included, whoever made the change. If a preview is missing or older than the project,
Status draws it itself when you open it, and saves it for everyone else.

Things to know:
- **No sign-in.** Whoever holds a link has that role, so send each link only to its team.
  The server refuses saves from performance marketing's link. The studio keeps the content team
  to the words.
- **Each project still has its own edit link.** That's the designer's way into the full studio for
  that project (the **Open** buttons in the overview use it).
- **The designer sees the whole ad set from inside the project.** In a project that is in an ad
  set, **Ad set overview** in the bar under the canvas (or **Overview** at the top of the Ad set tab) opens the Ad sets window
  over every audience and language in the ad set, rendered from the latest work. The audience
  you are working on says *This project*. Every other audience has **Open in the studio**, which
  opens that project in a new tab. Close the window with **×** or Escape.
- If the designer changes a design while the content team is typing, both changes are kept: the
  content team's words go on top of the latest design.
- A review started before ad sets (one project) opens as an ad set of one, with its old links.

### Status: every campaign (CAS home page)

On the home page, **Status** (in the **Review** group) lists every campaign filed, picked up or
opened as the designer on this computer: **Open tickets** first (waiting for a designer), then
**In design**, then **Package ready**. **New ticket** files one. An open ticket's page shows its
brief, files, deadline and audiences, and **Pick up**. A ticket filed on another computer is
listed once you paste its designer link in **Add a campaign link**. Each card says whether the ads are **Provident** (branded: the
wordmark and QR) or **Unbranded** — or **Mixed** when its projects differ — and so does the
ad set's Details.

The page refreshes itself every minute while it is on screen, and again as soon as you come
back to the window. A step someone takes elsewhere shows up without a reload.

The **Google Drive** strip at the top says which Google account this computer is connected as:
- **Refresh** reads every ad set again straight from Drive (it forgets anything cached).
- **Reconnect** gets a new Google session with the same account, then refreshes. Use it when the
  page stops picking up changes, or the strip says the session has ended.
- **Use another account** signs out and lets you pick a different Google account.

Each card's picture is the latest look of its most recently changed project. A project's picture
is redrawn a few seconds after you stop editing (at most every 15 seconds), so the cards follow
the work instead of showing it as it was when the ad set was made.

Ad sets started from 27 Oct live in their Google Drive folder. If you are not signed in to Google,
a box above the list says how many there are, with **Sign in with Google**; once you sign in they
appear. An ad set your account cannot reach shows under **Missing**.

The **Overview** above the list counts every ad set on this computer:
- **Ad sets** and how many projects they hold
- **In progress**, with how many audiences are still waiting
- **Package ready**
- **Audiences done**, out of all of them
- a bar showing how many audiences are at each step (Design, ENG copy check, Translation, Done)
- **Waiting on**: the first few audiences not done, with the step each is on

Ad sets on Drive you have not signed in for, and missing ones, are not counted; a line says so.
How full the share store is lives on `share-admin.html` now, not here.

Open one to see its record:
- **At the top:** the name, its product, its status, the dates, **Drive folder** (once a link is
  saved) and **Open the ad set**.
- **Progress:** the four steps, counted in audiences, and one line saying what is still waiting.
- **Audiences:** each audience's own four steps, who signed off and when, and its English and
  Arabic projects. Each project opens in the full studio. Under each project:
  **Change audience** (its market, audience and language — **Set its audience** on a project that
  has none, shown as "Project") and **Remove**, which takes it out of the ad set. The project
  itself is not deleted and its own edit link keeps working.
- **Add a project:** the Campaign projects saved on this computer that are not in the ad set yet.
  **Add to this ad set** opens that project in a new tab and asks for its market, audience and
  language, with this ad set already chosen.
- **Ad set settings** (beside Add a project; **Ticket settings** on an open ticket): the setup form
  again. Change the **name**, **product**, **deadline**, **brief**, the **markets** and
  **audiences**, and which audiences get an **Arabic** version (**AR** on each tile). **Save
  changes** applies it for everyone on the ad set's links, and the Activity lists what changed.
  It won't drop an audience that already has a project, or switch off Arabic where there is an
  Arabic project: move the project with **Change audience**, or remove it, first. Also in the Ad
  set tab, under **Audiences**.
- **Ad set links:** one row per team, with **Copy link**.
- **Activity:** every step and every word changed in every project, newest first.
- **On the right:** **Details** and **Google Drive**.

To add an ad set from another computer, paste its **designer** link into the box at the top.
**Remove from this list** only removes it from this computer, and it stays removed. Opening one of
its projects no longer brings it back; paste its designer link to add it again. The links keep
working. **Delete this ad set for everyone** ends it: its three links stop working and its review
history goes. Its projects stay, each on its own edit link. The record
(status, dates, log, links) is kept even after a project expires. Full-size photos expire after
60 days unused; the project and its previews stay.

---

## 3. CAS: build an ad

What's on the screen, from left to right:
- **On this ad / Add** (left rail): what is on the ad in reading order, then the pieces you can add.
- **The canvases**: one row ("plate") per variant. The 1:1 is on top, then the Portrait 3:4,
  the 9:16 and the Horizontal 1.91:1, then the optional Eventbrite banner.
- **This component**, **Background image** and **Hidden components**.
- **Layout**, on the right.

**Adding and editing:**
- **See and arrange what is on the ad:** the top of the left rail, **On this ad**, lists the
  components on the canvas you are looking at, in reading order, under **Top** and **Bottom** (and
  **Floating** for a graphic placed by hand). Each row shows the component's shape, its name and
  its words.
  - Click a row to select it. **Drag a row** to reorder, including from Bottom to Top; a line
    shows where it will land, and an empty Top or Bottom says "drag a component in". With a row
    selected, **Alt+↑ / Alt+↓** steps it one place.
  - Hover a row and press the eye to hide it on this variant (press it again to show it). A
    hidden component stays in the list, struck through.
- **Add a component:** the grid pinned at the foot of the left rail, **Add a component**, shows
  every component as its own look over its name: Eyebrow, Headline, Hook, Body, Price, Key facts,
  Tags, Bullets, Steps, Button, Graphic, Divider, Spacer. Click one and it goes to the bottom of
  the ad. Hover a tile for what it is.
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
- **Layout** (right rail) lists the choices in words. **Point at one and the canvas shows it**,
  outlined and tagged Preview, before anything changes; click to keep it, move away to drop it.
  With the keyboard, tabbing onto a choice previews it the same way.
  - **Copy**: At the top, Split (eyebrow, headline and hook at the top, the rest at the bottom) or
    At the bottom. Keeping one shows a message with **Undo**.
  - **Logo**: Top left, Top center, Bottom left or Bottom center (never right).
  - **Align**: Left or Center. Under the choices, a line says how much of the canvas the copy
    covers (amber over the brand's 40%).
  - Click another canvas (the 9:16, say) and the choices apply to that one. On a canvas you
    separated with the link button they change only that size, and say "this size only".

  Then: **Spacing** (Tight, Medium or Roomy), **Scaling** (the size of all the content,
  in steps of the type scale, set per canvas size), **Background** (Dark or Light) and **Scrim**
  (the wash behind the copy: Opacity, Fade and Colour). **Scaling** and **Scrim** fold away and
  show their setting when closed; the app remembers which ones you leave open. A reset button only
  appears once a value has been moved.
  In the middle rail, the style previews show every style at once, two to a row.

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
- Each plate's head names the variant. The one the side panels edit says **Editing**; press **Edit**
  on another to switch. The bin icon at the right removes that variant; the Master can't be removed.
- Under every canvas: its pixel size and **Copy N%**, a small bar with a tick at 40%. Past 40% the
  bar turns amber — a warning about how much of the picture the copy covers, never a block.
- **Each canvas row** is its name, its ratio, and icon buttons on the right (hover one to see
  what it does):
  - **Link** — the canvas mirrors the 1:1. Press it to edit that canvas's layout separately;
    press it again to mirror the 1:1 again. Unlinking keeps the layout exactly as it was, so
    nothing moves until you change it.
  - **Alignment** — appears once a canvas is edited separately. It shows that canvas's alignment;
    press it to switch between left and centre. The rail's **Align** does the same while that
    canvas is selected (it reads *this size only*).
  - **Logo** — click a separated canvas (anywhere on it) and the Layout rail edits that canvas:
    its heading reads e.g. *Master · 9:16 (own layout)*, and the **Logo** and **Align** rows
    set the wordmark corner and alignment for that canvas only. It starts where the variant's is.
  - **Picture** — give that canvas its own photo instead of sharing the main one. It starts as a
    copy of the main photo, so you can simply reframe it, or replace it with another picture.
  - Pressing the **link button** does the same for the photo: the canvas gets its own copy of the
    main photo, and reframing it there leaves the other sizes alone. You only upload once.
    Re-linking goes back to the shared photo, unless you put a different picture on that canvas.
  - **Eye** — show or hide the canvas. A hidden canvas is not exported.
- **Portrait 3:4:** shown by default — press the eye on its row to hide it. It mirrors the 1:1
  until you press its link button. It exports as `<name>_Variant A_Portrait_3x4.jpg` at 2160 × 2880.
- **9:16:** it mirrors the 1:1 until you press its link button.
- **Horizontal 1.91:1:** shown by default — press the eye on its row to hide it. It is a 1200 × 628 landscape, and
  its words run the full width of the canvas. It exports into the variant's folder with the other
  images (section 7).
- **All variants** (the pill next to **Add Variant**, which shows how many variants you have
  out of the most allowed) holds the settings for the whole project:
  - Each setting is one row: its name and current state on the left, the control on the right.
    Point at a row's name for the full explanation.
  - **Format:** **Single** or **Carousel**. A carousel has up to 10 pages,
    and each page has its own components, words and photo.
- **Organize pages** (beside **Add Page**, on a carousel with two or more pages) opens every
  page as a picture. Drag a page to move it: a line shows where it will land. Its photo moves
  with it. You can also select a page and use the arrow keys, or press Enter or double-click a
  page to edit it. Undo reverses a move. Press **Done** or Escape to close.
  - **Story 9:16**, **QR code** and **Partner logo** are switches. The line under each
    one says what it does right now. Story 9:16 only appears on a carousel. With the QR code
    on, upload the code under the switch and pick the **Corner** it sits in: **Left** or **Right**.
  - **Typeface:** **English** or **Arabic**. Arabic mirrors the whole ad for right-to-left
    reading: a left-aligned design becomes right-aligned, the logo moves to
    the right (the photo is left as it is, so any sign or logo in it still reads correctly) and the QR code moves to the other corner (the code itself is not flipped, so it
    still scans). Lists, steps and tags read from the right. A centred design stays centred.
    Your alignment setting doesn't change, so switching back to English restores the layout.
  - With the partner logo on, pick a developer from the logos above the upload — **Nakheel**,
    **Emaar**, **Meeras**, **Imtiaz** and **Beyond** come with the studio — or upload the
    partner's mark yourself. Then set its **Size** and **Colour** (**Match canvas** or **Original**).
  - With more than 9 logos the list shows two rows: the logo in use first, then the ones you
    picked most recently. **Show all** opens the whole list with a search box (type part of a
    name); **Show fewer** or Escape closes it.
  - **Add logo** adds SVG or PNG logos to that list. They stay on this computer for every
    project; hover one you added and press × to take it off the list (ads already using it
    keep it). If you upload a mark straight into the slot, **Save this logo to the list** keeps it.

### Unbranded ads

For an ad that must not carry the Provident brand, use the **Provident | Unbranded** switch that
floats at the bottom left of the canvas, across from **Add Variant** and **All variants**. It applies to the whole project: every variant, size and banner.

- The **provident.** wordmark, the collaboration logo and the QR code are not drawn, and the
  wordmark's space goes back to the copy. The layout, components and copy stay as they are.
- A strip opens under the canvas. Its top line shows the look at a glance: the five colours,
  the two fonts, and whether all the copy is readable. Click that line (or its arrow) to fold
  the strip down to it once the design is set; click it again, or press **Unbranded** again, to
  open it. Folded or open is remembered on this computer. Under the line are four sections:
  - **Colour**: five colours, one per role: **Text**, **Accent** (the eyebrow and the price),
    **Button**, **Chip** and **Scrim**. The first time you switch on, they are read from the
    background photo. Click a colour to pick a new one; a colour you pick is locked. The lock in
    a colour's corner keeps it when you press **From photo** (read the photo again) or
    **Shuffle** (new colours). **Light on dark | Dark on light** picks the tone and rebuilds the
    unlocked colours for it. Under each colour are its name and hex; **Text**, **Accent** and
    **Button** also show their readability score — a green dot passes, a red dot means too faint
    (hover it for what it needs).
  - **Type**: a **Headline** font (headline and price), a **Body** font (everything else) and an
    **Arabic** font (used when the Typeface is set to Arabic), from Google Fonts. Each shows a
    sample in its own face. The lists start with tested fonts; type in **Search Google Fonts**
    to find any of them.
  - **Shape**: **Corners** (square to a full pill), **Glass blur**, **Glass fill** (how much of the panel's colour covers the photo), and
    **Eyebrow tracking** (the spacing of the capitals in eyebrows and labels).
  - **Saved looks**: **Save** keeps the colours, fonts and shape under a name on this
    computer; click a saved look on another project to apply it.
- The scrim keeps its own controls in the Layout rail (strength and fade); only its colour comes
  from the palette. The Layout rail's **Background** dark/light does nothing while Unbranded is
  on: the tone switch decides.
- The placement **Preview** shows the advertiser as "Sponsored page" with a grey picture.
- Switch back to **Provident** at any time: the Provident look returns exactly as it was, and the
  unbranded look is kept for the next time.
- The fonts load from Google, so the studio needs an internet connection to show them.

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

## 6. CAS: the Ad set tab

The top bar's **Ad set | Design** switch. **Ad set** is this project's place in its campaign
(the old Copy workspace is gone; the words are edited in **Design**, and the content team edits
them from their link):

- **The header** names the audience and language and where it stands, with **Back to design**,
  **Already approved** and **Overview** (every audience and language of the campaign, rendered
  from the latest work). The next step itself (**Send to copy check**, **Create next audience**,
  **Make the Arabic**) is in the top bar, on both tabs.
- **A project knows its ad set.** Open it from Recent, a saved file or another window, and it
  looks up its campaign by itself (the top bar says *Finding its ad set…*), then follows the ad
  set's copy. That includes a window still following the project's older edit link from before
  the ad set. If it is not found, the tab says so, with **Add to an ad set** and **Look again**.
  It looks through the campaigns on this computer's Status list, so paste a campaign's designer
  link into Status first if it came from someone else.
- **Copy designer link.** In an ad set, the link to hand out is the ad set's designer link (the
  overview of every audience), not this one project's edit link.
- **Copy from Claude**: paste the meta-ad-design-copy reply, check the flags, pick the heading,
  and **Fill**. The reply is kept with the campaign, so the next audience fills from it.
- **Audiences**, **Brief**, **Activity** and **Links for the teams** (see above).
- The preview on the right is the ad as it will export.

A project that is not in a campaign (an older one, opened with **Open a project file…**) shows **Set up**
here instead, which puts it in one.

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
  <name>_Variant A_feed.jpg       ← 1:1 (Variant A is the Master; B and C for more variants)
  <name>_Variant A_Portrait_3x4.jpg            ← 3:4, unless hidden
  <name>_Variant A_Story.jpg      ← 9:16
  <name>_Variant A_Landscape_1.91x1.jpg        ← 1200 × 628, unless hidden
  <name>_Variant A_EventBrite_Banner_wide.jpg  ← 1880 × 940
  <name>_Variant A_EventBrite_Banner_Small.jpg ← 758 × 380
  <name>_Variant B_feed.jpg …
  <name>.adstudio.json   Assets/    ← the session and uploads, refreshed on every export
```

The variant is in each file's name; there are no Variant folders (an export made before 27 Oct
2026 has them, and Ad sets still reads those).

- **Every export overwrites the last one without asking.** It never deletes anything, so files an
  export no longer writes (a removed variant, a hidden banner, old names) stay until you delete
  them yourself.
- A **carousel** exports the same way, with files named `<name>_page1_feed.jpg` and so on,
  banners included.
- **Without a Source folder**, you get a zip of the same files.
- **PDF** is one file with every size, saved wherever you choose.
- **Everything Content Hub is in OPS only**: CAS has no Send, no Import hub settings and no
  **From the hub** view.

### See everything you exported: Ad sets

The Ad sets window is opened from inside a project, not from the home page. In a project that is
in an ad set review, the chip under the canvas opens the ad set's overview (see *Run an ad set
review*). In any other project the chip reads **Ad sets** and opens the window empty: drop a
folder of exported ad sets on it, choose one, or paste a Google Drive link. It never loads the
Source folder by itself.


- **The list on the left** is every audience, grouped under its main folder (Local, International,
  International EUR — Local comes first). Each one says how many variants and images it holds.
- **Click an audience** to show it on the right: its name and main folder at the top, then one row
  per variant (Variant A, Variant B …). Each row shows its
  **Meta** images: Feed, Portrait 3:4, Story and the Horizontal 1.91:1. A small line under each image
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
- Only `<name>_Variant A_feed`, `_Portrait_3x4`, `_Story` and
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
- **Choose folder** (top of the window) opens the folder picker. It needs Chrome or Edge.
- The bar has one main button, **Share**. The folder controls sit together in one group:
  **Drop folder** (shows or hides the drop area), **Choose folder** / **Open folder**, and the
  circular-arrow **Refresh**. **×** at the right closes the window.

#### View any folder: drop it

Ad sets never uses your Source folder. In the Ad sets window:

- The viewer is for **looking at finished exports**, not for opening a project to design. To
  keep designing, use **Open a project file…** in CAS's sidebar.

- **Drop a folder** anywhere on the window. Use the project folder (the one holding the
  `.adstudio.json` and its Variant folders), or a folder above several projects. You can also
  **click** the drop area (*Drop an exported campaign folder to view its ads*) to choose one.
- Nothing is written to the
  dropped folder unless you change its words in **Edit text** and press **Allow editing**.
- The bar says which folder you are viewing. **Open folder** switches to a different one.
  Closing the window forgets it; your Source folder is never changed.

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
  sign-in lasts about an hour; after that, Edit text shows **Sign in with Google** (one click —
  the studio remembers your account) and keeps your
  edits until you do. **Sign out** is in the Google Drive box.

---

### Audit the components: Component usage

On CAS's home page, press **Component usage** in the sidebar, in the **Review** group. It counts
every design component, and every style of it, across your saved projects.

- The row at the top says what is being counted. **Choose a folder** there picks the folder where
  the team keeps its projects (or paste its Google Drive link beside it). Every Campaign
  project in it, and up to four folders inside it, is counted. The folder is only read, never
  changed, and is remembered on this computer.
- **Set it up once with Google Drive for desktop — no Google sign-in after that:**
  1. Install Google Drive for desktop and sign in to your Provident account (once, in the app).
  2. In Component usage press **Choose a folder**, open **Google Drive** in the picker's sidebar
     and pick the team's projects folder.
     If the picker shows several `GoogleDrive-…` folders, pick the one with no date after it. The
     dated ones are old copies.
  3. After the next Chrome restart, press **Reconnect the folder** once and choose **Allow on
     every visit**. From then on the folder is read without asking.
- **Without Drive for desktop**, paste the folder's Drive link instead and sign in with your
  Provident Google account. That sign-in lasts an hour and is asked again after every reload.
- The folder is read when you open the view. A project that has not changed since the last time
  is not read again, so it is quick after the first visit. **Refresh** reads it again now, and
  **Use Recent instead** forgets the folder.
- Until a folder is chosen, it counts the saved projects in **Recent** (the studio keeps your 10
  newest), and says so.

- The view is one table: a row per component, with a **picture of it** (drawn the way the export
  draws it), the reason for its verdict, **Used in** (how many projects, with a bar),
  **Placements** (and how many are hidden) and **Sizes** (how often S, M, L and XL are used).
  Click a row to open its styles, in the same columns. A component with one style does not open.
- Each component and style carries a verdict:
  - **Worth keeping** — a third or more of the projects use the component (at least two), or a
    style is picked in two projects or for a quarter of its component's uses.
  - **Needs rework** — used, but only rarely, or added and then hidden more often than shown.
  - **Consider deleting** — no saved project uses it.
- The line over the table says how many components were counted and how many nobody uses. The
  track beside it — **All**, **Worth keeping**, **Needs rework**, **Consider deleting**, each with
  its count — shows only that verdict; **All** goes back.
- Hover **Used in** to see which projects use a component. **How it is counted**, under the
  table, explains the verdicts.

Only saved projects count. A project you have opened but never saved is not in the numbers. With
fewer than five saved projects the page says so — treat the verdicts as early signals.

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
   7. **ADM, CN & DLD QR**: on the reel thumbnail. The **DLD QR code** is off until you turn on
      its switch; then add the code and it sits above the ADM / CN chips. Export waits for the
      code while the switch is on.

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
| **Top agents** | a cover plus 5 ranking cards | Period: Weekly, Monthly, Quarterly or Yearly. Weekly asks for the week and prints its dates (e.g. 19–25 Oct 2026). Portraits are cut-outs. Drag the ranks in the slide list to reorder them. The cover's group photo uses the five portraits: pick one with the rank pills, size it, then **Stand on bottom** or **Stand all**. |
| **Top agent — solo** | 1 ranking card | One agent's card for their own channel: the carousel's rank card on its own. The period (Weekly, Monthly, Quarterly or Yearly), team and place (1st–5th) are set on the card. There is no blurb: the panel's heading reads "Top Agent of the Week" (or Month, Quarter, Year), with the dates and team under it. It opens on the navy panel. The portrait is a cut-out. |
| **Google reviews** | up to 10 review cards | Quote, reviewer, and the agent's name, role and photo. Drag the portrait on the card to move it. |
| **Congratulations award** | one award card | The partner's mark can follow the card's colour (**Match canvas**) or keep its own (**Original**). |
| **Carousel** | up to 10 pages | Each page has a layout: Front page, **Key figure** (a big number beside its caption, a split bar and a row of facts), Stats, Bullets, **Price table** (rows of type, detail and price), **Cards** (stacked glass cards — a heading, an optional tag and a line each — with an optional badge top right), **Icon grid** (three-across icons with labels, for amenities), **Payment plan** (a bar split by the payment shares), Text, **Quote** (a quotation and who said it), **Big number** (one figure set huge, with a headline and a line or two under it), **Steps** (a headline over up to five numbered steps) or Call to action. The Front page can also carry a kicker above the headline and a key-facts line under it; the Call to action can carry a key-facts line under the button and a web address under the wordmark. On the Key figure, Price table, Icon grid and Payment plan, use **‹ ›** to set how many facts, rows, icons or payments there are, then fill in each one. Cards uses the same **‹ ›** for one to four cards. A new carousel opens on the first five; switch any page to another layout from its Layout tiles, and its words come with it. **Brass**, beside a headline's name, colours the word you select. Each field says **Optional** or **Required**; the section's "N to fill in" counts the Required ones. In a body field, the icon track sets a line as text, a quote, a divider, a callout or a list. Switches control the overline and the permit number. The overline can be **Brass** or **White**, per page. **Page photo** gives one page its own photo strength. **Logo** in Post look is a dropdown — **Provident**, **Vacation Homes**, **Property Boutique**, **Property Solutions** or **Prism** — and the chosen mark goes on every page. You can drop a floating graphic and drag it. Drag the inside pages to reorder them. |
| **Reel thumbnail** | one 9:16 Reel cover | 7 layouts: Masthead, Pop-out, Editorial, Caption, Punchline, Centre stage and Big number. **Text size** runs Small to Jumbo and steps down on its own to fit. **4:5 guide** shows what the profile grid shows. On Pop-out, **Remove background** puts the subject in front of the headline. **Logo** in Post look picks the mark at the top: Provident, Vacation Homes, Property Boutique, Property Solutions or Prism. A **DLD QR code** can be switched on in ADM, CN & DLD QR (hidden by default). |

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
- **Save also sends** a project that came from a Content Hub post: after the save, the pages and
  the `.json` go to that post exactly as Send would, so the hub always shows the latest saved
  design. It only happens on a computer with the import URL and token set; elsewhere Save just
  saves. To turn it off on one computer, set `localStorage['ops-save-sends']` to `off`.
- **The hub's design queue** (posts someone pressed *Approve and send to design* on): in Claude,
  run **/hub-design-queue**. It lists the queue, claims the post you pick, lays it out as an OPS
  carousel from the hub's copy and brief photos, shows you the pages, then exports and sends
  them back to the post.
- **Opened from a hub post's Open in OPS** (the local Content Hub): OPS opens with the post's
  copy and brief pictures, or its latest design if one was sent before. A **Hub post** bar above
  the canvas shows the post, its brief, any change requests and which version you're on; **Open the
  post** goes back to it. Send reads **Send v2 to the hub post**: each send is kept on the post as a
  new version and the post waits at **To review** until someone approves it or asks for changes.

---

## 12. Photos

- **Adding:** drop a picture on its box, or click the box to choose a file. On a phone, tap.
- **Once a picture is in**, both studios list its actions beside the picture: **Replace**,
  **Reframe** (photos only), **Photoshop** (or **Illustrator** for an SVG) and **Remove**. An
  empty box shows **Upload**. In CAS you can also hover the photo on the canvas for the same
  actions.
- **Reframe:** drag the picture to move it, use the zoom slider, then press **Done**. In CAS you
  can also double-click the photo on the canvas.
- **Agent cut-outs (OPS):** agent photos lose their background automatically while the removal
  service is running on this computer.
  - Install it once with `./tools/rembg/install.sh`. After that it starts by itself at every login.

  The drop box tells you whether the service is on. Without it, upload a PNG that's already cut
  out.
- **Edit in Photoshop (extend, retouch, Generative Expand):** once a picture is in, press
  **Photoshop** in the picture's actions. Photoshop opens the picture. Edit it, then **save** (⌘S). Any
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
  - **An SVG opens in Illustrator instead** (the button reads **Illustrator**), so a
    partner mark or graphic stays vector. Save it there as SVG with the same name (⌘S, then OK
    on the SVG options). Saving as `.ai` does not come back.
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
| No **Photoshop** button | Set it up once with `./tools/photoshop/install.sh`, or set a **Source folder** in Chrome or Edge. The button appears within 15 seconds; no reload needed. |
| Saved in Photoshop but nothing changed | Keep the same file name (⌘S, or Save a Copy with the same name). Without the helper, save as PNG or JPEG, not PSD. |
| The top bar is cut off and **Share** is missing | Make the window wider. CAS's top bar needs about 1150 px. |
| Old files are still in the export folder | Exports overwrite but never delete. Remove old files by hand. |
| A project isn't in **Recent** | Only saved projects are listed. Press **Save**. |
| **From the hub** says it can't reach the hub | Be on the office network. On the website, press **Allow** when Chrome asks about devices on your local network (and allow Chrome under System Settings › Privacy & Security › Local Network on a Mac). Safari and Firefox can't read the hub from the website. |
| **From the hub** says the token was refused | Set the **Import token** in **Share › Import hub**. |
| A project from the hub has no photo | It was sent before a photo was added, or the photo was never in the studio (the sent pictures are the finished exports, which aren't put back). Drop the photo again. |
| ⌘V does nothing after `/cas-component` | Make sure CAS is showing the **editor** (not the project browser or Copy), then press ⌘V again. Claude also saved it in `custom-components/` — open that file and copy its contents if the clipboard was overwritten. |
| **Share an edit link** says it isn't switched on | The website's share store hasn't been connected. An admin sets it up once: `docs/share-links-setup.md`. |
| Others don't see my change | The panel's status line says **All changes saved to the link** once it has gone. If it says it can't reach the share store, check the connection; it tries again by itself. |
| An export went into the wrong design folder | CAS's Master is **Variant A**, Variant 2 is **B**, Variant 3 is **C**. |

## 15. For Claude: the studio tools

When the **provident-studio** connector is available, Claude can make CAS and OPS work itself
instead of explaining the clicks. It runs the real studio in the background, so the result is
exactly what the studio would export.

Projects and their exports are saved in `~/Claude/Provident Studio/<project name>/` when a
`~/Claude` folder exists (Cowork's own), otherwise in `~/Documents/Provident Studio/<project name>/`.
Tell the user the full path when you're done.

1. `studio_catalog` (studio `cas` or `ops`) — the templates and every field they ask for.
2. `studio_new_project` — start from a template; or `studio_read_project` on an existing
   `.adstudio.json` / `.smpstudio.json`.
3. `studio_edit` to fill fields, `studio_set_image` for photos, QR codes and logos (agent photos
   are cut out automatically when background removal is running).
4. `studio_preview` — look at it before exporting.
5. `studio_export` — PNG, JPG, SVG or PDF, with the studio's own file names and folders.

Rules for Claude: ask for anything you don't have — never make up a listing number, price, permit
or name. Every required field must be filled; the export says what is missing. The project is a
normal session file, so the user can open it with **Open a project file…** (CAS) or **Open session** (OPS) to fine-tune by hand. Setup:
`sh tools/studio-mcp/install.sh`, then restart Claude (see `tools/studio-mcp/README.md`).

