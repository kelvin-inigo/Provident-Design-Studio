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
>   the way they do: the standing rules, with the history of each area in `docs/notes/`. Search
>   those only for "why" questions or before changing code.
> - **Never write a token, key or password into a file in this folder.** The folder is a public
>   GitHub repository. Tokens are typed into the studio's own fields and stay on that computer.
> - When you finish, **tell the user where the files are**: the folder path and the file names.
> - **Read `CAS-OPS-WHATS-NEW.md` too**: what moved in the latest changes (one home page, Projects
>   off the studios, Roles in Access), so you never send anyone to a screen that is gone.

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
| Generative fill (CAS) | none: start it with `python3 tools/genfill/serve.py` when you need it | the **Generate** button on the photo. Nano Banana needs Higgsfield's tool signed in (`higgsfield auth login`); Firefly needs Claude Code signed in, with the Adobe connector on your Claude account |

Run these from inside the folder (`cd "$HOME/Documents/Provident Design Studio"` first).

**5. Settings each computer keeps for itself.** Ask the person who set up yours for the values:
- Nothing for the Content Hub: OPS's **Send** and **From the hub** get the hub's design key from
  the studio's server (`HUB_DESIGN_KEY`) once you're signed in. The hub is
  `https://provident-content-hub.ngrok-free.dev`, reachable from anywhere.
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

- Open `index.html` (the **home page**; on the website it is the first page) in **Chrome** or
  **Edge**. Everything that waits on someone — tickets, hand-offs, copy checks, packages — is
  managed here for both studios. The studios themselves are for designing: opened with nothing in
  them, CAS and OPS bring you to the home's **Projects**, and their sidebar's **Home**, **Status** (Tracker's Kanban),
  **Projects** and **Access** all come back to this page. The home page has these tabs at the top:
  - **Home** shows **Next up**: the one campaign or post most worth doing now, with its picture,
    its step and one button that opens it in its studio. **‹ ›** (or the arrow keys) flip through
    the rest. Under it, **Also waiting on you** (filter by **Campaign ads** or **Organic posts**)
    and **With others**. On the right, **Where everything is** shows each stage (**New**,
    **Design**, **Copy check**, **Ready**) with the work in it, and **Your studios**. Your last
    saved projects sit at the bottom under **Pick up where you left off**.
  - **Tracker** has two views, switched at its top right: **Progress** (the default) and
    **Kanban**. Status is no longer its own page: its board, with every control, is Tracker's
    **Kanban**, and an old Status link opens it. Wherever this guide says *Status*, it means
    **Tracker › Kanban**. The board's controls sit above both views and work on both: the
    **Everything** / **Campaign ads** / **Organic posts** / **Content Hub** chips, **Find by name**,
    **Filter**, **Only what waits on me** and **Show closed**. What you pick stays when you switch
    views. **Progress** shows the work as rows. It lists every campaign by its
    due date with what it still needs in English and Arabic: **Static**, **Animated**, **MVP video**
    and **Copy**, each **Done**, **1 of 2** (designs), **Missing** or **Not needed** (**MVP video** and **Copy** are
    English only, one cell across both rows: the Arabic words come from the Google Translate rail), and how many
    are done in all, and every organic post with its picture and its four steps
    A campaign's line says how many audiences and designs it has (**1 audience · 4 designs**: an
    audience's **Design 2**, **3**… and its unbranded version are designs of it). A video added in
    the ad set's **Video** section counts as **MVP video** for the audience it was added for, or for
    every audience when added for **All audiences**. A design with the **Animated** badge (a video
    behind it) counts as **Animated** in its language.
    (**Draft**, **Design**, **Copy check**, **Ready**). It only shows; **Open the ad set**, **Open
    the ticket** or **Open the post** takes you to its page. A campaign shows its deliverables
    once the Kanban has been read on that computer.
  - **Kanban** (once **Status**) is one board for both studios, in the same four stages. **Only what waits on me**
    and **Find by name** narrow it, and so do the kind chips (**Everything**, **Campaign ads**,
    **Organic posts**, and **Content Hub** when the hub has posts) and **Filter** (see *Organising
    Status* below). Click a card for its page — the same page the studios had:
    a campaign's ticket or ad set page (brief, audiences, **Pick up**, **Ticket settings**,
    phases, Remove, Delete) or a post's page (progress, the step buttons such as **Send to
    designer**, **Send to copy check** and **Approve copy**, Copy link, the brief, activity). A step
    that names who gets it next asks you to pick the person, as in the studios. **Pick up** and
    **Open in the studio** open the studio on that work.
  - **Content Hub posts on Status.** When the Content Hub sends a post to design, it shows on the
    board too, tagged **Content Hub**: waiting for a designer under **New**, in design or with
    changes asked under **Design**, delivered and waiting for approval on the hub under **Copy
    check**, approved under **Ready** (for two weeks). In the hub, the **Designer** field (at
    **Approve and send to design**, and in the post's Design section beside **Open in OPS**) says
    who it's for: it then waits on that designer only, and shows "For <name>" to everyone else.
    A Content Hub post waiting for approval has a **Copy approved** button on Home (Next up and
    the list) for the content team and social media: click it, then **Click again to approve**.
    It moves to **Ready** on Status ("Copy approved by <name>"). The Content Hub itself is not
    told, so approve it there too if the hub needs it.
    Designers, the content team and the social media manager all see these posts on Status (the
    content team sees them even though the rest of their board is only their own hand-offs); one
    waiting for approval on the hub shows **Waits on you** to the content team and the social
    media manager. Pressing **Open in OPS** in the hub is enough to put a post on Status (under
    **Design**, waiting on whoever opened it), and **Send** moves it to **Copy check**. The card shows the post's first page once it has been
    opened in OPS, and opening it again from Status loads it in OPS without moving it back. Clicking it on Status opens it in OPS with the hub's copy on its pages, for the content team too
    (they otherwise never get the OPS editor); **Send** works exactly
    as before and attaches the design to that hub post.
  - **Access**: the admin gets the whole Access panel (requests to let in, people and their roles,
    activity, and Preview as). Everyone else sees their role and what it lets them do.
  - **Help** is the support page, for everyone (even before signing in, when it shows only how
    to get in). It shows only the guides for what your role opens, following Access › Roles:
    a switch of the studios you use, **CAS + CASV**, **OPS** and **Home**, beside **Search help**
    (it finds a guide by the words on its buttons); **Start here** (your role's first three
    guides); then the chosen studio's guides by job, **Getting around** (each view you use,
    captured, with its parts numbered: point at a number to ring that part) and **Something not
    working?**. Open a guide (**Watch**) for its walkthrough: the real screens play step by step,
    moving in on the part each step names and ringing it, with the steps listed beside it. A
    guide's small bars fill as you watch it on this computer. **Pause**, **‹ ›**, a click on a
    step or on its bar, and the arrow keys and space move it. The screens are captured from the
    test server, so the names in them are demo names (**Demo data**). The admin sees every guide;
    **Preview the home as** shows one role's Help. In CAS and OPS, the **?** beside your name at
    the foot of the sidebar opens Help on that studio's guides.
- **New** (top right) follows your role: a designer picks **A campaign** or **An organic post**;
  performance marketing gets **New ticket**. **A campaign** is CAS's campaign setup, on the home
  page (**File as ticket**, or **Start designing**, which opens CAS on its first audience).
  **An organic post** opens OPS's **Start a post**. The content team has no New.
- The home page reads the campaigns and posts from Google Drive itself, every minute or so while
  it is open. The first time on a computer it asks you to **Connect Google Drive**. **Refresh**
  under the lists reads them again now.
- Safari and Firefox work too, but they can't use a **Source folder**. Exports then download as a
  zip instead.
- **On an iPad or a phone** (Safari or Chrome) the studios fit the screen. On a tablet held
  upright and on a phone the top bar has two rows: **Projects**, the folder, **Save** and
  **Share** on top, then **Ad set | Design** (CAS) or **Guided | All controls** (OPS), the theme,
  **Undo** and **Redo**. On a phone the step that moves the work on (**Add to an ad set**,
  **Save to Drive** and the like) sits at the foot of the screen, over **Components /
  Component / Layout** (CAS) or **Template / Slide** (OPS).
- **The home site on a phone** (Home, Tracker, an ad set's page): the menu (**Home**, **Tracker**,
  **Projects**, **Access**, **Help**) is a bar at the foot of the screen. Home shows what waits on
  you, then **Where everything is**, then the rest. **Tracker** shows one short card per campaign
  with what is missing in words; **Show the deliverables** opens the English and Arabic grid.
  **Send to…**, the person picker and **Settings** open as sheets from the bottom, their buttons
  always in view, even with the keyboard up. After a send, the line saying what was sent sits just
  above the menu bar, with **Undo** and a **×** to put it away.
- Keep both `.dc.html` files in this folder. They load their scripts and fonts from here, and the
  two studios link to each other.
- People show with their Google account photo wherever their initials were (the account menu, Status cards, Access, the hand-off picker, the activity logs). Someone who hasn't signed in since 11 November 2026 still shows initials until they next sign in.
- To switch studios, go back to the home page: the editors' top bar has no **Campaign ads** /
  **Organic posts** switch any more.
- The **provident. DESIGN STUDIO** wordmark at the left of the top bar, in CAS and OPS, is a link to the home page.
- The sun/moon button switches between light and dark. Both studios share the setting.
- **Every tab is its own workspace.** When you open a studio, a `?ws=…` tag appears at the
  end of the address. That tab has its own project and photos, so several tabs (or several Claude
  Cowork sessions) can work at once without changing each other. Reloading keeps the tab's
  workspace; a new tab gets a new one. **Saved projects are shared**: every tab's Projects screen
  lists all of them, and in a new tab **Continue last** opens the newest saved project. A new tab
  has no Source folder until you pick one or open a session. Unsaved work belongs to its tab, so
  save before closing a tab. To work on one project in two windows at once, open both with
  `?ws=shared`.

### Signing in (CAS and OPS)

On the website, both studios open on a **Sign in to the studio** screen. Press **Continue with Google** and
use your **@providentestate.com** account. What you see next depends on what the admin has given you:

| Role | What opens |
|---|---|
| **Designer** | Both studios, everything: design, export, Status, hand-offs. Only the admin's **Access** is not theirs. |
| **Social media manager** | **OPS only.** Draft and design posts (guided and All controls), Status, and hand a post to a designer or straight to the content team. Their home's **Next up** is the posts ready to publish: **Open the files** shows every exported image with **Download** each and **Download all**, and **Posted** closes the post once it is published (on Next up and on every row of Also waiting on you). **With others** lists the posts with the designer or the content team. CAS does not open for them: it shows a page with **Open the Organic Post Studio**. |
| **Content team · English** | Only what is handed to them, from both studios, on the home page and Status (nobody else's work). A post waiting on their copy check carries the check in its own page (the words beside every page); they never open the OPS editor — a link into OPS brings them to the post's page. A campaign waiting on you opens its content-team link in a new tab, where only **Approve English copy** shows. A campaign's page (**Details**) shows its steps, activity, details and brief, without the audiences or the team links. Opening CAS itself goes to the home page. |
| **Content team · Arabic** | The same, but in a campaign's content-team link only **Approve translation** shows (the Arabic projects). |
| **Everyone but the admin** | The top bar shows only the pages you use: **Home**, **Tracker** and **Help** for everyone, **Projects** for people who design (designers, social media), **Access** for the admin. Your role and **Sign out** are in the account menu (your Google account photo, or your initials). |
| **Performance marketing** | The home page: **New ticket** (the only button is **File as ticket**) and **Tracker**, campaigns only (no organic posts anywhere). No editor, no Recent, no Component usage. On Status you can follow every campaign and edit a ticket you filed, but you can't pick it up, open a project or approve copy. A campaign's page (**Details**) shows its steps, activity, details and brief, without the audiences or the team links; **Open the package** is the way to the images. Opening CAS or OPS goes to the home page. |
| **Digital Marketing Team** | Runs the same campaigns as the Meta ads on email, SMS and WhatsApp. It sees and does exactly what **Performance marketing** does (above): file tickets, follow campaigns on Status, open an ad set's performance-marketing link to see the finished ads, change words in **Edit text**, download and **Launch**. It has its own name and its own column (**Digital**) under Access › Roles. |
| **AI Engineers** | The **Engine** page on the home (they land on it): how PDS is built, every commit and every deployment, live. They also have **View ad sets** (below) from the start: campaigns on Status, read-only, no posts, no editor. marketing.ads@ and ai.engineer1@ are let in as AI Engineers from the start. |
| **A role the admin named** | A team that fits none of the above (for example Video production). It opens only what the admin ticks for it under Access › Roles; until then Home and Status are there but list no campaigns or posts. |
| **A role with View ad sets** | For people who follow campaigns without working on them (for example a CMO or Video Creatives). **Status** lists every campaign with its stage (no organic posts, unless the role also has a posts capability), and Home lists them under **In progress**; nothing ever waits on them. A campaign opens on its ad set page marked **View only**: the phases and the four steps, every audience with its designs and looks and where each stands, the video (it plays, and its comments can be read) and the whole **Activity** log with its filters. There is no Pick up, Start, Add, Remove, Delete, Move, settings, Approve or Launch, no Download, no Drive folder or team links, no way into the studio, and no comment box. If a team link is sent to them it says **This isn't your view**. |
| **Admin** | Everything a designer has, plus **Access** and **Engine** on the home page (CAS's sidebar row opens Access there too). There is one admin. |

**Hand-offs name a person.** Each team has two people. Whenever you send work on — **File as
ticket** (to a designer), **Send to designer**, **Send to copy check**, **Send for translation
check** — a window asks **who** picks it up, listing that team's people with their Google names and
emails (someone who hasn't signed in yet shows their email). The studio remembers who you chose last.
From then on the post or campaign reads **With Sara** instead of "With the content team", it shows
as **Your turn** only for that person, and the activity says "→ Sara". Sending something **back**
(Back to design, or the content team reopening their own check) returns it to whoever did that
step; a designer reopening an approved copy or translation check picks the checker. Only an English copy person
is offered for an English project, and only an Arabic one for the translation; for a post, both.

The team is set up already: exec10.media (social media manager), exec1.content (English copy),
exec2.content (Arabic copy), exec4.graphics and exec5.graphics (designers),
digitalmarketing.lead1 (performance marketing), marketing.ads and ai.engineer1 (AI Engineers). They can sign in straight away; their names fill in
from Google the first time they do. The admin can still change or remove anyone in **Access**.

- **First time?** Sign in anyway. You land on **Waiting for access**, and the admin sees your
  request. Add a note and say whether you design ads or file campaigns, then press **Send to the
  admin**. Keep the page open: it lets you in by itself once you're approved.
- **Declined or removed?** The page says so. Write a note and press **Ask again**.
- **Sign out** is the arrow beside your name at the foot of the Home sidebar.
- **Review links still open without signing in.** A content-team or performance-marketing link
  (`#share=…`) is its own key, as before.
- Opened straight off the disk with no internet, CAS opens without the sign-in screen.

**Access (admin only).** Open **Access** at the top of the home page. The badge counts people waiting.

- **Requests**: everyone who signed in but hasn't been let in, with how often they tried and their
  note. Pick their role from the dropdown (Designer, Social media manager, Content team · English,
  Content team · Arabic, Performance marketing, Digital Marketing Team, AI Engineers, or a role you named), then press **Let in**, or **Decline**.
  **A team that isn't listed?** Pick **New role…** at the end of the dropdown, type the team's name
  (say "Video production") and press **Add role**: it is made and picked for that person. The same
  works under **People** and **Add someone**. A new role opens nothing until you tick what it may do
  under **Roles**.
- **People**: everyone with access. Change a role from its dropdown, or **Remove access** (they're
  shut out within five minutes). Declined or removed people can be let in again, or **Forget** removes them from the list.
- **Preview the home as** is a dropdown beside the tabs. Choose **a role** (Designer, Social media
  manager, Content team · English, Content team · Arabic, Performance marketing, Digital Marketing Team, AI Engineers, or a role you named) to see the home and
  studios as that role does, or **a person** (everyone let in, listed by name and role) to see
  exactly what waits on them — their Status, their "Waits on you", and in OPS the view they get
  (for the content team, the copy check). A line under the top bar says **Viewing as** that person
  and their role; **End preview** at its end or
  **Back to Access** ends it. Nothing changes their account, but a step you press (Approve copy,
  Send…) is really taken.
- A content-team member who opens a link while signed in with Google sees only their language's
  approve button. Opened without signing in, the link still shows both.
  **Add someone** lets in an @providentestate.com email before they've signed in.
- **Roles**: what each role opens. One row per capability (Design campaign ads, Design organic
  posts, File campaign tickets, Draft organic posts, Approve English copy, Approve the Arabic
  translation, See the engine, and **View ad sets**), one tick box per role, including AI Engineers and every role you
  named. **Roles you named** above the table lists those; **Name a role** adds one, and × removes one
  nobody has any more. Change the ticks, then **Save changes** (**Discard** drops
  them, **Back to defaults** restores the studio's own). It reaches everyone with that role within
  five minutes: what **New** offers, **Your studios** and **Projects** on the home, whether the
  Campaign Ads Studio opens for them, and who appears in the "Which designer" and "Who checks the
  copy" pickers. **View ad sets** is for a role that takes no part in a campaign: tick it and
  that role follows every campaign on Status and opens each ad set read-only (designs, steps,
  video, Activity; nothing to edit or download). Designers, performance marketing, the Digital
  Marketing Team and the content team show **Own view** in that row, because they already work on
  ad sets in their own way and the tick changes nothing for them. A named role with nothing ticked
  sees no campaigns or posts at all. **Let people in** is always the admin's alone. Each person sees their own role's
  list on their Access page.
- **Activity**: every sign-in attempt (including accounts from outside Provident) and every decision.
- **Preview the studio as**: see the studio exactly as that role sees it. A bar
  at the bottom says you're previewing; **Back to Access** returns.

**Engine (the admin and AI Engineers).** **Engine** at the top of the home page is PDS's own
status page, kept live while it is open:
- **In production**: the deployment the site runs now, its commit and when it went live; a build in
  progress or a failed one shows under it.
- The services the studios lean on (the studio server, Google sign-in, the share store, the GitHub
  feed), each with a dot: green answering, amber slow or nearly full, red down.
- **How it connects**: a map of every part of PDS and every outside service it talks to, in four
  lanes (this Mac and the office; the browser; PDS's server on Vercel; outside services such as
  Google, Upstash, Anthropic, Roam and GitHub). Each box says how its check went just now, and each
  line is coloured by whether that connection works: green moving dashes working, amber slow or
  partly working, red not working, grey dots not set up or not running here. Hover a box to follow
  its lines. **Check this Mac** also checks the helpers on your own Mac (cut-outs, Photoshop, CASV,
  the studio tools); Chrome may ask to let the page reach your local network. The server-side
  checks (Upstash, Anthropic, Roam) run at most every five minutes; while the studio server itself
  isn't answering, they say "Unknown" rather than an old result. The map updates by itself: it is
  read again whenever a new version of PDS goes live, and its heading says which commit last
  changed it.
- **Alerts**: while the home is open (any page), you're told when a connection stops working: a
  note in the corner, a red number on **Engine** in the top bar and in the tab's title, and a red
  line at the top of the Engine page with **Show on the map**. You're told again when it answers
  again. **Turn on desktop alerts** (Engine, top right) also sends a desktop notification when the
  tab is in the background. Amber (slow) and grey (not set up) never alert.
- **Share** (Engine, top right): the page's link with **Copy link**, and who the AI Engineers are.
  The admin also gets **Let an engineer in**: type their @providentestate.com email, press **Let in
  as AI Engineer**, then **Email them the link** opens a ready email in your own mail app (nothing is
  sent for you). The link opens only after they sign in with Google, and only for the admin and AI
  Engineers.
- **Every day since the first commit**: one bar per day since 10 September 2026, taller for more
  commits, darker on days something was shipped to Vercel. Click a bar to jump to that day.
- **Timeline**: every commit on main, newest first, by day, with its time, its area (CAS, OPS, Home,
  Server…), its commit id (opens it on GitHub) and, when Vercel shipped it, **Live**, **Deployed**,
  **Replaced**, **Building** or **Failed**. **Find a commit** searches the messages; the chips
  narrow it: **All | Deployed**, and an area (CAS, OPS, Home, Server…), which combine. The bar stays
  at the top while you scroll, says how many are shown ("3 of 411 · deployed · OPS") and has
  **Clear**. New commits slide in at the top as they are pushed.
- **How PDS is built**: each part of PDS, its files, what it does and when it last changed; click one
  to see only its commits. **Architecture reference** opens the PDF.
- **Endpoints**: every address on the site this page and Access use (`/api/share?op=engine` feeds
  this page, `op=accrole` names roles, `op=accstatus`, `op=accme`, `op=health`, `/api/gauth?op=status`),
  what each is for, who may call it, and a dot for how it answered just now.
Work on a Mac shows here once it is pushed to GitHub.

## 2. Projects: new, open, save

Saved projects from both studios are on the home page's **Projects**; a studio opened with
nothing in it goes there.

- **Start something new:**
  - In CAS, every project belongs to a **campaign** (an ad set). Use **New › A campaign** on the
    home page: a **Name**, **Residential** or
    **Commercial**, a **Deadline**, the **Drive folder** (an empty Google Drive folder for this
    campaign), the **Brief** (paste the script, fact sheet or WhatsApp brief) and **Files**
    (renders, logos, brochures). By default the campaign is **Local**, both audiences, **English
    only**; press **AR** on an audience tile to add an Arabic version, and **Markets &
    audiences** for International or International EUR. Then either:
    - **File as ticket** — saves it in the Drive folder as an **open ticket** for a designer to
      pick up from **Status**. Performance marketing uses this. It shows the designer link to send.
    - **Start designing** — files the same ticket and opens its first audience straight away.
    There is no blank project and no preloaded templates any more.
  - In OPS, use **New › An organic post** on the home page (it opens OPS's **Start a post**), or
    **Templates** in OPS's sidebar, and click a template card.
- **Continue last** reopens the project you were working on; the line under it names that project.
- **Save** (top bar) writes the project into your **Source folder**:
  - the session file (`<name>.adstudio.json` for CAS, `.smpstudio.json` for OPS);
  - an `Assets/` folder with a copy of every upload.

  The first time, it asks you to pick the folder. After that it saves in place.
- **Open a post file…** (OPS) or **Open a project file…** (CAS), at the foot of the sidebar:
  pick the project's folder, and the newest session file in it opens. A session
  file from the other studio opens in that studio.
- **Source folder** (top bar) picks or changes the folder that saves and exports go into.
- **Every new project starts fresh.** A new campaign or post, a template, or a project opened from
  Recent has no Source folder and no pictures from the one before. Pick its folder on the first
  Save. A new browser tab is a fresh session too. Opening a project file sets the folder it opens from.
- **Projects** (on the home) only lists projects that have actually been saved. A save, an export into the Source
  folder, and opening a session file all count. In CAS they are grouped by campaign: the
  campaign's name is the heading, and each card shows the audience, market and language, when it
  was saved and how many variants it has. Campaigns with only one project share an
  **Other projects** row. Hover a card to see its full name.
- **Undo** / **Redo** (top bar) go back up to 10 steps. A photo reframe counts as a step.
- **From the hub** (OPS only; sidebar, under Library) lists what the Content Hub has received from **Send**,
  newest first, with a few of the sent images on each card. Click one to open it as a project:
  its words, layout and the photos it was sent with all come back. A delivery made in the other
  studio (an older CAS delivery) opens there. The hub keeps its copy; nothing is deleted. It uses the **Endpoint URL** from
  **Share › Import hub** and the design key from the studio's server; **Refresh** asks the hub again.
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

1. **Initial setup.** Performance marketing files the campaign as a ticket (above). On the home
   page's **Status**, the designer opens the ticket — its brief, files and audiences — and presses
   **Pick up**. A new project opens as the first audience, in English, on the **Ad set** tab.
   Already have the design? Press **Use an existing design** instead: pick one of the projects
   saved in the studio, or **Open a project folder…** and choose the folder it was saved in (the
   one holding its .adstudio.json). It opens in a new tab, you say which market, audience and
   language it is, and the ticket is picked up with that design.
   Type or paste the copy into **Copy** on the Ad set tab, as plain lines (see *Pasting the
   copy* below), check where each line lands, and press **Fill with the … copy**. The copy is
   kept with the campaign.
2. **Design done.** Design the ad, then press **Design done** — in the bar under the canvas, or at
   the top of the Ad set tab. It first lists anything missing (empty words, no photo, a QR code
   with none added, too much copy on a canvas); press OK to send anyway. The content team checks
   the English copy from their link.
3. **Create next audience.** The same button now reads **Create next audience**. It opens a
   blank project for the next planned audience, on the Ad set tab, with the copy already there
   and that audience picked: press **Fill**, design, **Design done**. Once an audience's English
   copy is approved, the button offers **Make the Arabic** — a copy of the design in the Arabic
   typeface, whose words Claude writes in Arabic from the layout straight away.

#### Pasting the copy

Each audience starts with its name and a colon on a line of its own, then one line per part, in
the order the ad reads:

```
Family:
Haven and Athlon Sold Out Within Hours.      ← small label
Aldar's Next Dubai Launch Is Coming.         ← heading
3BR Townhouses                               ← hook line
Handover: Q4 2028 · 10% down payment         ← key facts (optional)
Golden Visa eligible | Waterfront            ← tag chips (optional)
Be the First to Know                         ← button (always the last line)

Investor:
…
```

- Any lines between the hook line and the button are extras. A line that reads as a fact (it has
  a colon, a percentage, a split like 40/60, a handover date or a price) becomes a **key fact**;
  any other line becomes a **tag chip**. Put several on one line with ` · ` or ` | `.
- A shorter block still ends on the button: three lines are small label, heading, button; two are
  heading, button.
- Each audience gets its own tab. The card shows every line in the part it will fill, and parts
  the ad does not have yet are added in that order. **Remove unused parts** drops the template's
  sample words. One Undo puts it all back.
- A Claude reply with a `cas-copy` block still works the old way.

#### The Arabic copy

An Arabic project takes no pasted copy. Its words are the English layout's, written in Arabic by
Claude under the team's Arabic copy rules: original, natural Modern Standard Arabic that reads
right to buyers of every Arab nationality, not a word-for-word translation; written for the ad
set's audience (Families or Investors); each line kept to its place (a short heading, a 2–4 word
button, chips and key facts as short as the English); every number, price, date and name kept
exactly; nothing added that the English does not say. You need to be signed in to the studio.

If Claude cannot write it (the site has no Claude key yet, or Claude does not answer), Google
Translate does it instead, as before, and the message says so: Chrome's own translator on the
computer, or, where a browser has none (Safari, an iPad), Google Translate's web service.

That runs by itself when **Make the Arabic** makes the project, and when **Start the Arabic** is
pressed on Status once the audience's English exists: the English project opens in a new window
and a copy of its design becomes the Arabic, laid out right to left, with no question asked. The
Ad set tab's **Arabic copy** card has **Write the Arabic** to run it again after the layout
changed. Undo puts the English back. The content team checks the Arabic at the translation step.

When every audience is done, performance marketing downloads the package from their link. They
don't have to wait for the approvals: anything the designer has marked **Design done** (sent for
review) can be downloaded straight away, whatever its copy check says. If only an audience's
English is designed so far, its button reads **Download English** and saves just the English
images (the zip ends in `- English`). Images that aren't approved yet can still change. Each
download (the package, or one audience) shows in the ad set's **Activity** with who and when. Once
the ads are running, they press **Launch** on the home's Next up card (or on its row under Also waiting on you): the campaign reads
**Launched** on its page, the log says who launched it, and it leaves everyone's Home for the **Closed** column on Status (shown with **Show closed**).
A phase added later (say Ad Fatigue 01) brings it back once that phase is ready.

#### Broad reach or audience-based

A campaign starts **broad**: its first waves tell the key facts to everyone, so there is one
design per market, in English and Arabic, and no audience-based designs. The setup on Home has
**Reach: Broad reach | Audience-based** (Broad reach is the default). A broad ad set plans one
audience called **Broad**.

Reach is set **per phase**. In **Ad set settings**, every phase under **Phases** has a **Broad**
button: pressed, that phase makes only the Broad audience; not pressed, it makes the audiences
ticked under **Audiences** (Family, Investor…). A phase added after a broad one starts broad too.
So the usual run is phase 1 and 2 with **Broad** pressed, then, on the third phase, tick the
audiences you want and un-press **Broad** on that phase. A project already made always stays
where it is, whatever the reach.

**A new market starts from the designs you already made.** Switch on **International** or
**International EUR** under **Markets** in **Ad set settings** and press **Save changes**: every
Local design of that phase (Design 1, Design 2…) is copied into the new market as its own project,
with its pictures and its video background, so the **Animated** version comes too. The English is
always copied; the Arabic only if that market has Arabic. The copies start **In design**: change
their words, prices and currency for the new market, then send them on as usual. A market that was
switched on before it had anything to copy shows **Copy from Local** on its card on the ad set
page; press it to copy the designs in.

#### The minimum deliverables

Every audience has three deliverables, each in English and Arabic: **Static**, **Animated** (the
same CAS design with a video as its background instead of the photo, 1:1 and 9:16, made in CAS) and
the **MVP video** (the short key-facts video, made only in the Video Studio, CASV, and added in the
ad set's **Video** section). The **Ad set** tab shows them in a **Deliverables** card. **Static**
ticks itself when the project is sent on. Press **Missing** beside **Animated** or **MVP video**
when it is delivered; it turns to **Done** and the Activity says who ticked it. The card only shows
what is missing: it never stops a project being sent to **Done**.

#### Phases

A campaign runs in **phases**, and each phase is its own package of every planned audience. You
name every phase yourself (Teaser, Launch, Price Drop, Ad Fatigue 03… whatever the round is
called). The setup on Home asks for the phase the ad set **starts** with (**Phase**, Launch if
you leave it). Most ad sets only ever need one.

To add another at any point, open the ad set in **Status**, press **Add phase** beside the phase
tabs, type its name and press **Add** or Enter. Or type it in the field under **Phases** in
**Ad set settings** and press **Add phase**. It gets its own tab and its own Drive folder. A name
the ad set already has (in any case) isn't added twice: Status opens that phase's tab instead.

**Renaming a phase.** In **Ad set settings**, every phase under **Phases** is a field holding its
name: click it, type the new name, and press **Save changes**. The phase keeps its projects, its
Arabic and its progress; its tab, labels and Drive folder take the new name. Two phases can't
share a name. Press the **×** on a phase to drop it while it has no projects.
Each phase has its own tab with its own
progress, audiences and **Start the English / Start the Arabic** buttons. A new phase starts with
no projects: every audience of the ad set (the planned ones and any that already have a project in
another phase) waits there as a **Start the English** (and, where planned, **Start the Arabic**)
button that opens CAS in a new window on that audience's **Ad set** tab. After you save Ad set
settings with a new phase added, the page opens on that phase. **Create next audience** and **Make the Arabic** stay in the phase you are working in.
A phase that has projects can't be dropped.

**Arabic per phase.** An audience's **AR** covers every phase. When an ad set has more than one
phase, each Arabic audience tile in **Ad set settings** also has an **Arabic in** row with one
chip per phase: untick a phase (an Ad Fatigue round, say) and that audience is English only there.
Its Arabic tile on that phase's tab reads **Not needed in <phase>**, and Translation is skipped.
In CAS's **Ad set** tab the **AR** on each audience is the current phase's Arabic. A phase that
already has an Arabic project for that audience can't be unticked.

On Drive, the first phase's projects stay where they always were (Market / Audience / Language).
Each phase you add gets its own folder above that (for example `Ad Fatigue 01/Local/Family/English`).
The content team and performance marketing see each phase's projects under "Ad Fatigue 01 · Local".

#### Branded or unbranded

The setup's **Branded | Unbranded** choice (also in **Ad set settings**, under **Brand**) decides
how each new project opens. An **unbranded** ad set opens every new project on the unbranded look:
no wordmark or QR code, with its own colours and fonts (see *Unbranded ads*). Projects already made
keep what they have; switch them with the Provident | Unbranded switch over the stage.

To run both in one ad set, pick **Mixed** under **Brand** in **Ad set settings** (the button at
the top right of the ad set's header on Status). Every audience is then branded and can **also**
run unbranded, with its own words:

**More than one design for an audience.** Each audience card on Status ends with **Add a design**,
under its last design.
It opens a new window on a new project for the next design, for example
**Local · Investor · Design 2** (then Design 3, and so on). Each design has its own steps, copy
check, Arabic (when the audience has one) and Drive folder (`Local/Investor · Design 2/English`),
and the performance-marketing link shows and downloads it as its own audience. On Status the
designs sit in their audience's card one under the other, each tagged **Design 1**, **Design 2**…;
the audience is done when every design is. **Change audience** also offers the ad set's designs, to
move a project you already made into one. In a pasted copy reply, a block named
`Investor design 2:` fills Design 2. CAS also recognises a second design on its own: adding a
project to an ad set (**Add to an ad set**, or **Use an existing design** on a ticket) as an
audience that already has an English design makes it that audience's next design, for example
**Investor · Design 2**, instead of refusing it. In an ad set with phases, that dialog also asks
for the **Phase**. It starts on the Status tab you added the project from, otherwise on the
newest phase.

- On Status, each design in an audience's card has an **Unbranded** row under its **Branded** one,
  with a **Start the unbranded** slot. Press it once that design's English exists: the English project opens in a new window and a copy of its design is saved
  on the unbranded look as its own audience, for example **Local · Family · Unbranded**.
- That unbranded version has its own steps, copy check, Arabic (when its branded audience has
  one) and Drive folder (`Local/Family · Unbranded/English`), in every phase. On Status it is the
  **Unbranded** row of its design, under the **Branded** row, in its audience's card.
- Its words: give it its own block in the Copy card, named for it (`Family unbranded:`). An
  unbranded project picks the block whose name says unbranded.

An Arabic copy keeps its English project's look.

### The roles, and the four steps of each audience

A campaign covers every project of one ad set, for each market, audience and language, under
**one set of links**. The links are in the Ad set tab, under **Links for the teams**, and on the
ad set's Status page under **Team links**. There, **Copy** puts a line ready to send on the
clipboard (`Content Review: <link>` for the content team, `AdSet Overview: <link>` for
performance marketing), and the button beside it opens that team's view in a new tab.

| who | the link opens | they can |
|---|---|---|
| **Designer** | the ad set's overview, with each project one click from the full studio | design, mark steps done, add projects, send work back to design |
| **Content team** | the words of every project beside its images | change the words, approve the English copy and the translation |
| **Performance marketing** | every project's images, always the latest | change the words in **Edit text**, download each audience once the designer sends it for review |

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
   thing to do next. When the design is ready, press **Send to…** and pick the task the project
   goes to. The list is grouped: **Next** (**Copy check**, or **Translation check** on an Arabic
   project, **Arabic**, **Animated**, **MVP video**), **Back** (**Design**) and **Finish**
   (**Done**, which asks **Mark done?** before it goes). Any order works, and you can send it back.
   Then pick who gets it, in the same dialog (the content team for a copy check, a designer for
   Arabic, Animated and MVP video); **Back** returns to the list. After the first hand-off,
   **Send to…** stays in the **Ad set** tab's header, and a line under the step says what was
   sent, when, and who has it. Each project on the ad set page (Tracker › **Open the ad set**)
   also has its own **Send to…** button, so you can hand work on without opening the studio; the
   line saying what was sent stays on that page until you leave it.
   Under the people there is a **Note for them** box (optional): what they should know before
   they start. **Design** (back to design) has no one to pick, since it goes back to whoever did
   that step, so it asks **What needs changing?** in the list instead. A copy or translation check
   that was already approved (**Reopens it**) asks **What should they check again?** in the list,
   then who checks it: the English or Arabic copywriter, as on the first send.
   The note shows on the project's tile, in the **Ad set** tab and in that person's queue on Home.
   Sent it to the wrong task or person? Press **Undo** on the line saying what was sent. It
   puts the project back where it was, for 30 minutes, as long as nobody has moved it on since.
   A Chrome alert already shown stays, and so does a message already posted to the Paid Ads Hub.
   Sending to **Copy check** from the studio first lists, in the dialog, anything missing: empty
   words, a page or variant with no background photo, a QR code switched on with none added (or
   an empty ADM number when ADM & CN is chosen), or copy covering more than 40% of a canvas.
   Press **Fix it first**, or **Send anyway**. The person you pick gets a Chrome alert only if
   they have that ad set open; either way it waits in their queue on Home. While the content team has
   it, the current bar turns amber and the step reads **Copy check**; the button moves on to
   **Create next audience** or **Make the Arabic**. **Back to design** is in the **Ad set** tab.
   Clicking the status opens the Ad set tab. The editor's bar has no Campaign ads | Organic posts
   switch: to work in the other studio, go back to the home page.
4. **ENG copy check.** The content team opens their link and picks a project on the left. Its
   words are beside each variant's Feed 1:1, which updates as they type, and the designer sees the
   change within seconds. **Show all sizes** above the previews brings in every other size
   (**Feed 1:1 only** goes back). **Approve English copy** in the panel signs it off.
5. **Translation.** The designer adds the Arabic project for that audience, lays it out and presses
   **Send for translation check**. The content team checks it and presses **Approve translation**. If an
   audience needs no Arabic, the designer ticks **No Arabic for this audience** and the step is
   skipped.

   **Already approved.** For an ad that was signed off before it came into the studio, the designer
   can skip the content team: **Already approved** (in the Ad set tab's header, the review panel,
   and in each project's **⋯** menu on Status) marks it designed and approved in one step, after asking once.
   The activity log says who marked it. **Reopen copy check** undoes it.
6. **Done.** An audience is done when its design, English copy and translation are signed off.
   The ad set is **Package ready** when every audience is.
7. **Performance marketing** opens their link. A bar at the top shows the ad set's progress and
   one row per audience. Each audience the designer has sent for review has **Download**, which
   zips its designed images (English and Arabic once both are), named the way an export names
   them, approved or not. **Download package** (or **Download 1 of 2** before then) takes every
   audience that has been sent for review. Images are rendered from the projects as
   they are now. **Images | Edit text** at the top switches to the words: change them as the
   content team does, the images update as you type, and your name goes beside the change. Words
   are all it can change. There is no side panel on this link: the bar's **See details**
   holds the steps, the dates and each audience.

The **Ad set** tab lists every audience, with its progress (**AR** on a tile plans or drops its
Arabic version; **Ad set settings** changes the rest, see below), then the brief and files from
the ticket, the **Activity** — who changed what, including each step — and **Links for the teams**.
In a campaign project the floating **Changes** button is gone: the Ad set tab carries all of it.

**Roam message.** Pressing **Send to copy check** (or **Send for translation check**) also posts
to the **Paid Ads Hub** channel in Roam, from the Content Engine bot: the master design as a
picture, the ad set's name, market and audience in bold, **ENG copy check** or **ARABIC copy check**, then Dennis in performance marketing with
an **Ad Set Overview** link (the PM link), then the copywriter for that language (Sana for English,
Fatema for Arabic) with a **Content Review** link (the content team's link). If Roam cannot be
reached, the step still goes through and the studio says Roam was not told; if only the picture
fails, the message goes without it and the studio says so. A designer reopening an approved copy
or translation check (**Send to… › Translation check**, **Reopen it**) posts the same message,
marked **reopened**, with a **Check again:** line holding what was typed. The content team
reopening their own check posts nothing. Sent from the ad set page (Tracker), the picture is the design's thumbnail from its last send.

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
  The content team's and performance marketing's links can change the words only (photos, design
  and steps stay the designer's).
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

### Status: every campaign (Tracker › Kanban on the home page)

The home page's **Tracker › Kanban** (once **Status**) lists every campaign filed, picked up or
opened as the designer on this computer: **Open tickets** first (waiting for a designer), then
**In design**, then **Package ready**. **New ticket** files one. An open ticket's page shows its
brief, files, deadline and audiences, and **Pick up**. A ticket filed on another computer is
listed once you paste its designer link in **Add a campaign link**. Each card says whether the ads are **Provident** (branded: the
wordmark and QR) or **Unbranded** — or **Mixed** when its projects differ — and so does the
top of the ad set's page.

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
The page is laid out the way an ad set is built: the campaign, then its phase, then each audience,
its designs, each design's look (branded or unbranded) and its languages.

- **At the top:** the campaign's card. The name, its product, its status, the dates, one line of
  facts (markets, how many projects and audiences, the sizes), **Drive folder** (once a link is
  saved) and **Ad set settings**.
- **The phase:** a tab per phase and **Add phase**. Under the tabs, the four steps counted for that
  phase, and **Waiting on**: a chip for each audience not done yet, with what it waits for. Press a
  chip to jump to it in the list below.
- **Audiences:** one card per market and audience, in the plan's order, started or not. Inside a
  card, each design has its own block (**Design 1**, **Design 2**…), and each design has one row
  per look: **Branded** and, in a Mixed ad set, **Unbranded**. At the left of a row, the look's name
  with its four step bars, and under it the step it is on and who it is with; then **English** and **Arabic** side by side. A project that exists
  is a tile that opens it in the full studio. A place nothing fills yet is a dashed slot that says
  how it starts: **Start the English**, **Start the Arabic**, **Start the unbranded**. Where the
  audience has no Arabic, the place says **Not needed**.
  The **⋯** button at the end of a project's tile holds its actions:
  **Change audience** (its market, audience and language — **Set its audience** on a project that
  has none, shown as "Project"), **Already approved**, and **Remove**, which takes it out of the ad set. Its folder in the ad
  set's Google Drive folder (the project, its pictures and exports) goes to Drive's trash, where it
  can be restored for 30 days, with the audience and market folders it leaves empty. **Change audience** also has an
  **Ad set** field: pick **Move to <another ad set>** (and its phase, when it has more than one),
  then **Move**. The project leaves this ad set and joins the other one with its steps, and its
  Drive folder moves into the other ad set's folder at its new market, audience and language.
  Both ad sets' Activity logs say so. When the other ad set already has that audience in English,
  the project becomes its next design (**Investor · Design 2**). The other ad set must be on
  this computer's list. In an ad set with phases there is also a **Phase** field: pick another phase and **Save**
  to move a project filed in the wrong phase (its Drive folder moves into that phase's folder).
- **Add a project:** the Campaign projects saved on this computer that are not in the ad set yet.
  **Add to this ad set** opens that project in a new tab and asks for its market, audience and
  language, with this ad set already chosen.
- **Ad set settings** (beside Add a project; **Ticket settings** on an open ticket): the setup form
  again. Change the **name**, **product**, **brand**, **phases**, **deadline**, **brief**, the **markets** and
  **audiences**, and which audiences get an **Arabic** version (**AR** on each tile). **Save
  changes** applies it for everyone on the ad set's links, and the Activity lists what changed.
  It won't drop an audience that already has a project, or switch off Arabic where there is an
  Arabic project: move the project with **Change audience**, or remove it, first. Also in the Ad
  set tab, under **Audiences**. It has two tabs: **Campaign** (name, product, brand, deadline,
  brief, video, QR) and **Plan** (phases, markets, audiences, Arabic). **Save changes** stays at
  the bottom as you scroll. Closing with unsaved changes asks **Discard your changes?**
  (**Keep editing** or **Discard**).
- **Remove or delete this ad set** (at the foot of the side column) opens **Remove from this
  list** and **Delete for everyone**.
- **Tracker › Progress** says **Signed off · N deliverables missing** for an ad set the content
  team has approved but that still lacks deliverables (an Animated version, the MVP video…). It
  is a warning only; the package is not held back.
- **One QR code for the whole ad set:** **Ad set settings** › **QR code** › **Upload a QR code**
  (**Replace** / **Remove** once there is one), then **Save changes**. Every design in the ad set
  takes it into its QR the next time it is opened ("QR code filled from …"), Status and its
  downloads already show it, and **Make a new one in CASV** starts the new video with it. A design
  whose QR you replace by hand keeps that one until the ad set's QR changes. Removing the ad
  set's QR leaves each design with the last one it took.
- **Ad set links:** one row per team, with **Copy link**.
- **Each link is for its own team.** The content team's link opens for the content team (English
  or Arabic), performance marketing's for performance marketing and the Digital Marketing Team, the
  designer's for designers. Designers and the admin open all three. Anyone else signed in sees
  **This isn't your view** with **Request access**, which asks for that view of this ad set only.
- **Access** (on the right, under Team links, when someone has asked): each request with **Allow**
  and **Decline**, and everyone already let in with **Remove**. Allowing lets that person open that
  link of this ad set; it gives nothing in any other ad set. When the access check is off, every
  link opens as before.
- **Video** (when the ad set has video on): a card with each video and **Add video**. The **⋯** on a
  video's tile holds **Replace video** and **Remove**.
- **Activity:** every step and every word changed in every project, newest first, under its day,
  one line each. The latest six show; **Show all** lists the rest. The buttons above it show one
  kind at a time: **Progress** (designs done, copy approved, sent on), **Projects** (added,
  removed, moved, the ticket), **Edits** (words and photos changed in a project; **Show the
  changes** opens the old and new words) and **Video and downloads**. A kind with nothing in it
  has no button.
- **On the right:** **Team links**, the **Brief** and **Drive location**.

To add an ad set from another computer, paste its **designer** link into the box at the top.
**Remove from this list** only removes it from this computer, and it stays removed. Opening one of
its projects no longer brings it back; paste its designer link to add it again. The links keep
working. **Delete for everyone** ends it: its three links stop working and its review history goes. On
Google Drive, every project's folder, the **Video** folder and the ad set's record go to Drive's
trash (restorable for 30 days), then the campaign folder itself if nothing else is left in it.

**Drive follows Status.** Whatever changes on the ad set page changes in its Drive folder too:
**Change audience** and **Move to** move the project's folder, renaming a phase renames its folder,
a new project gets its own folder, and **Remove** (a project or a video) and **Delete for everyone**
send their files to Drive's trash. The record
(status, dates, log, links) is kept even after a project expires. Full-size photos expire after
60 days unused; the project and its previews stay.

---

### A video on the ad set (the Video Studio, CASV)

An ad set can also deliver a **video**. The video is made in the **Video Studio (CASV)**, which runs
on the designer's own computer, and reaches the ad set through CAS.

**Turn it on.** Status › the ad set › **Ad set settings** › **Video** › **Includes a video**. The ad
set page then shows a **Video** section with an **Add video** placeholder. Only the designer and the
admin see Add video.

**The designer adds it.**
1. In the Video Studio press **Send to CAS**, name the video and press **Record and send**. It records
   the **Reel 9:16** and then the **Square 1:1** (twice the video's length) and keeps both on that
   computer.
2. In Status, open the ad set and press **Add video**. It asks first:
   - **Add one made in CASV**: under **From CASV on this computer** pick the video, choose its
     **Audience** (or All audiences) and press **Add video**. Both sizes are uploaded into the ad
     set's Drive folder, in **Video**.
   - **Make a new one in CASV**: opens the Video Studio on this computer in a new tab (it must be
     running) and starts a new, empty video named after the ad set. If a video is open there it
     asks first, and keeps that one: **Reopen the last video** (on the empty timeline) brings it
     back. Make the video and press **Send to CAS**; the Add video window comes back with that
     video picked and named. Then choose its audience and press **Add video**.
3. On another computer, use **Or choose the two files** and pick the Reel and the Square.

**The project is saved with it.** Send to CAS also packs the Video Studio project and the media it
uses into one file. Add video (or Replace video) saves that file in the ad set's Drive folder, in
**Video**, beside the two sizes, named like the video and ending in `.casv`. To carry on with it, on
any computer that runs the Video Studio: open the video's tile and press **Open in Video Studio**,
then switch to the Video Studio and press **Open it**. It replaces the project open there, so it
asks first. The Drive copy is only as new as the last Send to CAS; choosing the two files by hand
saves no project.

In the Video Studio, the video's **name** (top left, beside the wordmark) is a menu: rename it,
**Start a new video**, **Open a project file** (a `.casv` from Downloads or Drive; you can also
drop one on the window), **Start from a video script**, **Reopen the last video**. **Export** holds
**Export the video** and **Save this frame**. The right side reads **Selected · Brand · Queue**:
Brand is the wordmark, collaboration logo and QR code; Queue is everything being generated.
When the Grok bot has built a video for you, the Video Studio asks **Open … from the Grok bot?**;
the video you had open is kept under Reopen the last video.

**Everyone reviews it.** Click the video's tile. The window plays it, with **Reel 9:16 | Square 1:1**
at the top.
- **Comment on the timeline:** pause where something should change, write under **Comment at 0:12**
  and press **Add comment**. Each comment is a numbered pin on the bar under the video; click a pin
  or a comment to jump there. **Mark done** / **Reopen** on each; **Delete** your own.
- **Download Reel 9:16** and **Download Square 1:1** save the two MP4 files. Performance marketing's
  downloads are written to the ad set's Activity.
- Performance marketing also has a **Video** button in the bar of **Open the package**.

**Remove a video.** The **⋯** on its tile, or **Remove** in its window. Its comments go with it,
and the Reel, the Square and its `.casv` project go to Google Drive's trash (restorable for 30
days), then the **Video** folder if it is empty.

**Back to the designer.** When the designer has the home page, Status or the ad set open on the
computer that made the video, the comments are sent to the Video Studio on their own (the video does
not need to be opened) and show as numbered pins on its timeline and under **Comments from CAS**
within a few seconds. A page that is already open picks up new comments when it is reloaded. After the changes, **Send to CAS** again and use **Replace video** in the window: the
comments stay and the version number goes up.

**Start a video from a script.** The video-script skill in Claude writes the script as a Markdown
file (.md): the script table (voiceover and on-screen text per scene) and the image map (which
brochure page each scene uses, and how to crop it). In the Video Studio press the page icon in the
top bar (**Start from a video script**), or **Or start from a video script** on an empty timeline,
and choose the script and its brochure PDF together. It lays out a first cut: the photo from each
page the script names, cut to its scene's time and framed from the crop words; the on-screen lines
as texts; the last scene as the end card. **Whole video › From the script** lists what is still
needed (a missing developer logo, lines that still say [NEED: …], pages with no photo), each with a
**Scene** link; **Voiceover** and **Music** open the Generate panel with the script's lines, mood
and length filled in; **Queue N camera moves** queues each photo's move from the script (free until
**/animate-photos** runs in Claude). **Export video** and **Send to CAS** ask first while a text
still says [NEED: …].

**Turn a photo into video.** Select a photo on the timeline; under **Selected › Animate this
photo** choose a **Camera move** (each button plays the move on the photo), **Length**, **Model**,
**Quality**, an optional **Extra direction**, and **People in it** (**Yes** when the photo has
people, so their faces and clothes are kept and only small movements are asked for).
- **Extend to 9:16** (or **1:1** in a Square video) shows when the photo is wider than the video, for
  example a landscape photo in a Reel, and is on (**Yes**) by default: instead of cropping the sides,
  Nano Banana 2.1 adds more of the scene above and below the photo, then the clip is made from that.
  The photo itself is kept exactly as it is. It adds 2 credits, included in the total you confirm.
  **No** crops the photo to the frame as the canvas shows it.
- **Prompt** shows exactly what Higgsfield gets, in 14 parts (scene, references, location, first
  frame, format, optics, camera, action, performance, physics, lighting, audio, style, and what
  must not change). The studio fills it from the choices above (**The studio's template**); type in
  it to change it (**Edited by you**). It must stay under 2,500 characters.
- **Have Claude write it from the photo** (just under **Length**) is free: Claude looks at the
  photo, describes what it sees, and writes the 14 parts from that. The prompt comes back to the
  clip in about a minute, marked **Written by Claude from the photo**. The first time, Claude must be
  signed in on the computer: run `python3 tools/video-dev/serve.py --claude-login` in Terminal once. If the camera move, length or People change
  afterwards, the box says so: **Have Claude write it again**, or **Back to the studio's template**.
- **Generate now** shows the exact credits and waits for a yes. **Or add it to the queue for
  Claude** waits for **/animate-photos**, which writes the prompt from the photo first when the box
  still holds the studio's template. Either way the finished clip takes the photo's place.
- If it says the local server is an older copy, restart the Video Studio's server
  (`python3 tools/video-dev/serve.py`) and press it again.

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
  - **AED becomes the Dirham sign on the ad.** Type "AED" as usual ("From AED 2.6M"); the canvas and
    every export draw the UAE Dirham sign in its place. The field, the layers list and the Copy view
    keep "AED", so the ad text Meta shows is unchanged.
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
- **Video background (the Animated deliverable):** **Background image** › **Background** ›
  **Video**. The video you have sits on top (its name, length, and whether it is saved on Drive;
  **×** removes it). Under it, one list of the ways to get one — **Add a video**, or **Replace
  it** once there is one:
  - **Generate from the photo** opens a few settings in place: **Camera move**, **Length** (5 or
    10 s), **Quality** (Draft or Full) and **Model** (Kling, Cinema or Seedance). **See the price**
    asks Higgsfield first and spends nothing; **Generate · N credits** spends them, or **Cancel**.
    It takes a few minutes and lands on the design by itself; keep working. The clip is made at
    9:16 from the photo (the 1:1 plays its centre). It needs CASV running on the same computer,
    signed in to Higgsfield.
    - **Extend to 9:16** shows when the photo is wider than 9:16 (a landscape photo). **Yes**, the
      default: nothing is cropped. Nano Banana 2.1 adds more of the scene above and below the photo
      first, keeping the photo itself as it is, then the clip is made from that taller frame. It adds
      2 credits, included in **See the price**. **No** crops the centre of the photo to 9:16, as before.
  - **Upload a clip:** an MP4 from this computer (Higgsfield or anything else).
  - **Edit in CASV:** like Edit in Photoshop. CASV opens a fresh video with only this photo (no
    wordmark, and its library shows only this video's media). Edit it, then press **Send back to
    CAS** at the top: it records the 9:16, and CAS places it behind the design by itself. CAS shows
    **Waiting for CASV** meanwhile; **Stop waiting** stops watching.
  - The video plays behind the design on the **1:1** and the **9:16**. The other sizes, and every
    still image, keep the photo, so keep the photo too. The video is framed by the photo: reframe
    the photo on the canvas and the video moves with it.
  - **Reframe the video on the 1:1:** double-click the 1:1's picture (not a component) and drag the
    video; scroll to zoom it. **Esc**, or a click off the picture, finishes. From then on the 1:1's
    video keeps its own framing; the photo, the stills and the 9:16 keep theirs. **Export animated**
    records the 1:1 exactly as framed. A new or removed clip starts from the photo's framing again.
  - **Saved with the project:** when the project is in an ad set on Drive, the video goes into
    the project's **Assets** folder (`video-background-variant-a.mp4`), so another computer, Status
    and performance marketing get it too.
  - **Share** › **Animated** › **Export animated** records the 1:1 and 9:16 as MP4 video
    (`…_feed_animated.mp4`, `…_Story_animated.mp4`), beside the stills. It takes as long as the
    clip; keep the tab in front.
  - **Where it shows:** on Status the design's tile says **Animated**; in the performance
    marketing view the Feed and Story tiles say **Animated** and play on their own while they are
    on screen, like a GIF, and so does the enlarged image; the **Preview** (placement preview)
    plays the video in the phones by itself, in the studio and in the performance marketing view.
    (Status shows the badge only: it cannot draw designs.)
  - **Content team:** in Edit text the previews of an animated design say **Animated** and play
    on their own too.
  - **A video added before clips were saved to Drive** (before 17 Nov 2026) is only on the computer
    it was added on. Open the project there once: it goes up to Drive by itself, and then it shows
    and plays for everyone.
  - **Performance marketing's download** puts the animated ads in the zip beside the stills
    (`…_feed_animated.mp4`, `…_Story_animated.mp4`). They are recorded in the browser at download
    time, so a dialog shows each one as it records; it takes as long as each clip (a second
    download of an unchanged design in the same tab is instant). Keep the tab in front; Cancel
    stops the download. Use Chrome.
  - **Photo** turns the video off without forgetting it.
  - **Overlap image** sits in front of the headline, for a parallax look. Drop a photo and its background is removed for you (10–20 seconds), or drop a PNG already cut out. If background removal is not running on that computer the line under the picture says so, and a picture that still has its background is flagged "background not removed".
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
  (the wash behind the copy: Opacity, Fade and Colour). **Scaling** and **Scrim** are open to start
  with; you can fold either away and it shows its setting when closed. The app remembers which ones
  you leave open or closed. A reset button only
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
    on, upload the code under the switch and pick the **Corner** it sits in: **Left** or **Right**
    (bottom), or **Top** (top right, in the wordmark's row). With the logo at the bottom, a top-right
    code pushes the top copy down to clear it. Under the code's picture a line says what it opens,
    read off the code itself (for example *Opens trakheesi.dubailand.gov.ae/…*), with **Open link**
    beside it: it opens the code's page (the DLD permit card, which names the project) in a new tab.
    *No QR code found in this picture* means the file is probably the wrong one.
  - **Print: QR code | ADM & CN.** Under the QR code switch, choose what goes in that corner.
    **ADM & CN** prints the permit numbers instead of the code, and the code is not printed. Type
    the project's **ADM** permit (numbers only; a pasted "ADM:" is dropped). **CN** is always
    6323926. The corner shows *ADM: …* over *CN: 6323926* in small capitals, on the same side as
    the Corner you pick. The switch's name changes to **ADM & CN**, and the panel says *1 to fill in*
    until the ADM number is typed. Left empty, only the CN line prints.
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
- Its colours, fonts and shape open in a panel above the switch, like **All variants**: press
  **Unbranded** again (it carries an arrow) to open or close it, or press **Escape** or anywhere
  outside it to close it. The panel's top line says whether all the copy is readable. Its four tabs:
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
  - **Saved**: **Save** keeps the colours, fonts and shape under a name on this
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
- **Copy**: type or paste the copy as plain lines, one audience per block (see *Pasting the
  copy*), check where each line lands, and **Fill**. It is kept with the campaign, so the next
  audience fills from it. In an Arabic project this card is **Arabic copy**, with **Translate the
  layout to Arabic**.
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
- **On a content-team or performance-marketing link**, a group (a phase and market, such as
  *Launch · Local*) whose every audience is done from your side — approved, or ready to run — moves
  to the foot of the list and is hidden, so what still needs you comes first. **Show finished · n**
  at the foot of the list shows those groups again; **Hide finished** folds them away.
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
  from the folder (Open a project file…) to continue there.
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

## 8. OPS: posts on Google Drive, from draft to ready

Every post goes through four steps:

1. **Draft** — the **social media manager** makes the post.
2. **Design** — a **designer** refines it and makes the final design.
3. **Copy check** — the **content team** checks the words, right on the post's page: every line of
   copy on the left (headed by its page), every page rendered on the right, updating as you type.
   **Approve copy** moves it to Ready and goes back to Status; **Back to design** sends it back to
   the designer. The content team never gets the OPS editor: opening a post's link in OPS brings
   them to its page.
4. **Ready** — ready to publish, and **sent to a social media manager**. When the content team
   presses **Approve copy**, or a designer presses **Send to SMM** at Design (a post that needs no
   copy check), a picker asks **Which social media manager gets it?** — whoever drafted the post is
   picked already. The post then reads "With <name> to download" and is on that person's Home.
   The social media manager opens its files from the home page
   (**Open the files**: each image, **Download**, **Download all**, **Drive folder**), publishes it,
   then presses **Posted**: the post is closed, its page reads "Posted", the log says who, and it
   leaves Home for the **Closed** column on Status (shown with **Show closed**).

A post goes on Google Drive when it has a name or a brief as you pick its template, but it stays
off Status and Home until you **Save** it (or press a step such as **Send to designer**). Until
then the top bar reads "Not on Status until you save it", and closing the tab asks first ("Leave
site?"). Leave anyway and the post never shows on Status. Picked with neither a name nor a brief,
it opens on this computer only ("Not on Drive"), and **Send to designer** puts it on Drive under
the project's name, so looking at a template no longer leaves an "Untitled post".

**Delete for everyone** (a post's page, under the brief; the admin, designers and the social media
manager) takes the post off Status and Home on every computer. Click it once, then click again
(**Click again to delete …**) within a few seconds. Its Google Drive folder goes to Drive's trash,
where it can be restored for 30 days. **Take off this computer's Status** only hides it here.

**What waits on you is on the home page** (`index.html`): the posts **Waiting on you**, most
urgent first, with their step, who handed them over and when they're due. A post's page there has
its next step as a button (**Send to designer**, **Send to copy check**, **Approve copy**), so you
can move it on without opening it; **Open in the studio** opens it in OPS. A draft is waiting
only on whoever started it.

**Start a post** (OPS, from **New › An organic post** on the home page): type the post's name at
the top, set a **Due** date, write a **Brief** and **Attach files** (optional), then pick a
template below. The content team has no Start a post.

**Just me or Hand it on.** Under the name, choose who works on it (the choice is remembered):
- **Just me** — you make it and export it here. It is **not** put on Status and nobody else is
  asked. The top bar says **Just you** and where its exports go; click it to hand the post on
  after all.
- **Hand it on** — picking the template makes the post. It gets its own folder on Google Drive, in
  the team's files folder under its template (for example `Weekly Listings/November 2026/<post name>/`),
  holding the post's record (`<post name>_Post.json`), the project (`<post name>.smpstudio.json`),
  its pictures (`Assets/`), the brief's files and its exports. Every change is saved there within
  seconds, and it goes Draft › Design › Copy check › Ready on Status.

**A Reel thumbnail always starts as Just me**, whichever you chose: it stays with you and is not on
Status. To have a designer approve it, press **Send to designer** in the top bar (beside **Just
you**). That saves it to Google Drive, puts it on Status, and asks which designer picks it up.
From there it goes Design › Copy check › Ready like any other post.
Sign in to Google once if it asks.

**Every export is also saved to the team's files folder on Google Drive**, by template, in a
folder named for the post:

| Template | Folder | File name |
|---|---|---|
| Weekly listings | `Weekly Listings/<Month Year>/` | `Weekly Listing_Week01_01_Cover_3x4.jpg` |
| Top agents, Top agent — solo | `Top Agents/<Team>/` | `Top Agents_…` / `Top Agent_…` |
| Reel thumbnail | `Reel Thumbnail/` | `Reel_Thumbnail_2026-10-30_9x16.jpg` (the day it was started) |
| Just listed / sold, Google reviews, Award, Carousel | `Just Listed & Sold/`, `Google Reviews/`, `Awards/`, `Carousel/` | as before |

Exporting the same post again replaces its files. A different post with the same file name gets
` (2)` instead of replacing someone else's. If the post's month or team changes, its next export
moves the whole post folder to the right place. Posts started before 4 November stay in
**Organic posts** until their next export moves them.

**A new post starts with no Source folder.** Opening a post from Status, the hub or a file never
keeps the folder the tab had for another post; a post you set a folder for gets it back when
you reopen it.

**Hand it on from the top bar.** Beside **Guided | All controls** is the post's step and the one
button for what you do next:

| Step | Button | Who sees it |
|---|---|---|
| Draft | **Send to designer** (the social media manager also gets **Send to copy check**, to skip the designer) | social media manager, designer |
| Design | **Send to copy check** | designer |
| Copy check | **Approve copy** | content team |
| Ready | none (Share is the main button again) | |

**The social media manager can finish a post alone.** Until it is Ready, the top bar (and the
post's panel and its Status page) also shows **Mark as done**: it asks once, then moves the post
straight to **Ready**, with no designer and no copy check. The activity log says who marked it.

Click the step itself to open the post's panel: its steps with who did each and when, **Back to
draft** / **Back to design** / **Reopen copy check**, the brief, **Open on Status** and **Drive
folder**. **Notify me** turns on a Chrome notification when the post moves on.

A post opened from a file, or made before this, says **Not on Drive** with **Save to Drive** (a
social media manager sees **Send to designer**, which saves it and hands it on in one click).

**Tracker › Kanban** (the home page; once **Status**) shows every post in the Drive folder with the campaigns, in four
columns — New (drafts), Design, Copy check, Ready. **Show closed** (beside Only what waits on
me, with its count) adds a fifth, **Closed**: every campaign that performance marketing launched
and every post marked posted, the newest first, with how long ago. It is off until you turn it on,
and this computer remembers your choice.

**Organising the Kanban (Status).** The row under the kind chips holds the controls; the layout choices are
remembered on this computer, the filters last for the visit.
- **Overdue** (the button with the red dot and the count; it appears only when something is
  overdue) decides where overdue work goes: **In its own lane** (the default: one **Overdue** lane
  at the end of the board, folded until you open it, so the stage columns hold only what is on
  time), **In its stage** (each card stays in its column, marked overdue, as before) or **Hidden**
  (off the board; the count stays on the button and the line under the tools says how many are
  hidden).
- **Filter** opens **Stage**, **Due** (**Overdue**, **Due this week**, **Due later**, **No date**)
  and **From** (who last handed it on). Tick as many as you like: ticks in one group widen it,
  groups narrow each other, and they combine with the kind chips, **Only what waits on me** and
  **Find by name**. Each option shows how many it would leave, and options that would leave
  nothing are not listed. Every filter in force is a chip under the tools — click one to remove
  it, or **Clear all** — beside "n of n shown". Ticking **Overdue** always shows the overdue work,
  whatever the Overdue button says.
- **Board | List** switches between the columns and a compact list (Name, Stage, From, Due,
  Updated; click a heading to sort by it).
- **View** holds **Sort by** (**Due date** — yours first, then the soonest — **Name**, **Last
  updated**, and **Stage** when the board is not grouped by stage), **Group by** (**Stage**,
  **From**, **Kind**) and **Density** (**Comfortable**, **Compact**).
- The arrow on a column's heading folds it to a narrow rail (its count stays); click the rail to
  open it. A stage with nothing in it folds by itself. In the list, click a group's heading.

Home's **Where everything is** counts only the four still moving. **Only what waits on me** shows only yours; a
card with a blue ring and **Waits on you** is yours. Click a card for its page: progress, the step buttons, **Open in
the studio**, **Copy link**, the brief and files, and everything that happened. Every export is
also uploaded to the post's **Exports** folder on Drive.

## 8a. OPS: make a post

Picking a template opens the **guided run**: one page of the post at a time, filled in top to
bottom. The page's name heads the form, with where it sits in the run beside it ("Page 2 of 6",
or "Last step" on Finish). Over the preview are the template's name and its size (**Feed 3:4**,
or **Reel cover 9:16**); under it, the size in pixels.

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
3. The thumbnails under the preview are every page of the post. Click one to jump there. The page
   you are on has a blue ring, a finished page a green one, and an amber ring and **!** mark a
   page you've left with gaps.
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
- **Left rail:** the template's name, then the post's pages, each shown as a small picture of
  the page over its name. Click a page to edit it; add pages with **Add page** (or **Add
  property slide** / **Add review slide**) where the template allows. Hover the template's name
  or the page count for how they work. The **bin** at a page's right removes it, where the
  template allows. The list scrolls on its own; the page's layout controls stay at the foot.
  - On a carousel, **Layout** (the page's layout) and **Wordmark** (Hide / Top / Bottom) fold:
    click the heading to fold one, and a folded one shows its current choice. On a Reel
    thumbnail, **Layout** and **Text size** fold the same way. The computer remembers what you folded.
- **Right rail:** the same form as the guided run, for the page you're on. Each section
  (Words, Pictures, …) folds from its heading or the arrow at its right, and stays folded as
  you move between pages. The guided run itself never folds.
- **Over each canvas:** the page's name, **Editing** on the page the rails edit, **Edit** on
  the others, and a bin to remove it. Under that, the size: **Feed 3:4** (or **Reel cover 9:16**).
- **Post look** (the pill at the foot of the canvases): settings for the whole post, one row
  each — the name and its value on the left, the control on the right. Point at a name for what
  it does.
  - **Story 9:16**, a switch: on, every page also exports a 9:16 story.
  - Wash, photo strength and panel colour (White or Navy, each shown with its colour).
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
- File names start with the template: `Carousel_…`, `Weekly Listing_…`, `Google Reviews_…`,
  `Top Agents_…`, `Top Agent_…`, `Award_…`, `Reel Thumbnail_…`, `Just Listed_…` / `Just Sold_…`.
  A name typed in **File naming** gets the template in front too.
- The files go flat into the Source folder: `…_3x4` for the feed, plus `…_9x16` for the story
  when **Story 9:16** is on. The session file and `Assets/` go beside them.
- **PDF** holds the feed pages only. It's always in **Share**; on the guided **Finish** page,
  **Download as PDF** appears when the post has more than one page.
- Unlike CAS, OPS asks before replacing files that are already there.
- **Send … + .json** (under the Export button in **Share**, **carousel posts only**) sends the project `.json` and every
  exported image to the import hub. There is no key to type: the design key comes from
  the studio's server while you're signed in, and the URL is already filled in.
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
- **Generate (CAS, Generative fill):** fills the rest of a size's frame around your photo with
  AI, so a square photo can fill a 9:16 or a 1.91:1 without stretching or cropping.
  Press **Generate** in the Photo row (after **Reframe**).
  - Pick the **Engine**: **Nano Banana 2.1** (Google, through Higgsfield; the default; its card
    shows the price, e.g. *2 credits each*) or **Firefly** (Adobe, on your Adobe account). The
    editor remembers your pick. A card that can't run says what to set up.
  - Pick the size (1:1, 3:4, 9:16, 1.91:1, 2:1). The photo snaps edge to edge; the blurred bands
    marked *Nano Banana fills this* (or *Firefly fills this*) are what will be generated.
  - Drag the **crosshair** onto what must stay in view (the building, the person); arrow keys
    nudge it. Drag the photo to move it in the frame. **Photo size** shrinks it so every side is
    filled. **Copy margins** shows where the ad's copy sits.
  - With Nano Banana you can **Describe the surroundings** (optional): "more sky, no people".
  - Choose 1, 2 or 3 **Variations**. With Nano Banana the button shows the total
    (**Generate · 6 credits**), and nothing is spent until you press it. Press **Generate**
    (about a minute), pick one, then
    **Use on 9:16** (or the size you chose). That size gets its own photo, like **Edit
    separately**; the main photo and the other sizes stay as they were. Re-link the size to go
    back to the shared photo. **Use on 1:1** replaces the main photo.
  - It needs the helper running on that computer: in Terminal, from the PDS folder,
    `python3 tools/genfill/serve.py`. Without it **Generate** in the editor is greyed out and
    says so. Nano Banana spends Higgsfield credits on the account signed in on that computer;
    Firefly spends Adobe generative credits on the Adobe account connected to your Claude account.
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
- **QR code:** small, in a bottom corner or top right. Banners don't have one. **ADM & CN** can
  take its place: the two numbers print in the same corner and the code does not.

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
| A project isn't in **Projects** | Only saved projects are listed. Press **Save**. |
| **From the hub** says it can't reach the hub | Be on the office network. On the website, press **Allow** when Chrome asks about devices on your local network (and allow Chrome under System Settings › Privacy & Security › Local Network on a Mac). Safari and Firefox can't read the hub from the website. |
| **Send** or **From the hub** says the key was refused or is not set | The design key lives on the studio's server: the admin sets `HUB_DESIGN_KEY` in Vercel (and in `.env` for the local test server) to the hub's own. |
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
normal session file, so the user can open it with **Open a project file…** (CAS) or **Open a post file…** (OPS) to fine-tune by hand. Setup:
`sh tools/studio-mcp/install.sh`, then restart Claude (see `tools/studio-mcp/README.md`).

**The Grok bot uses the same tools.** `tools/studio-mcp/remote.py` serves them over https from one
always-on office Mac, behind a token per person, so a Grok custom connector (or a bot built on the
xAI API) can make and export posts and ads from anywhere. Exports and previews come back as links
that open for 14 days; the projects live on that Mac in
`~/Library/Application Support/Provident/studio-remote/projects/`, where **Open a post file…** /
**Open a project file…** picks them up for hand-finishing. The bot cannot touch tickets, Status,
hand-offs or Drive. Setup: `docs/grok-bot-setup.md`; the bot's instructions:
`GROK-BOT-INSTRUCTIONS.md`.

