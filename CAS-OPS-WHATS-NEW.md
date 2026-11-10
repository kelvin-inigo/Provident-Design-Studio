# What's new in CAS & OPS — a note for Claude in Cowork

Changes from 28 Oct to 10 Nov 2026 (the newest first). Read this after the **For Claude in Cowork** block in
`CAS-OPS-GUIDE.md`. The guide is the full reference; this note says what moved, so you don't send
anyone to a screen that is gone. Quote on-screen names exactly as they appear here in **bold**.

## The one thing to remember

**There is one home now: `index.html`.** Everything that waits on someone — tickets, hand-offs,
copy checks, packages, access — lives on the home page for both studios. **CAS and OPS are only
for designing.** When a user asks "where is…", the answer is almost always the home page.

| they ask for | send them to |
|---|---|
| their queue, what to do next | home › **Home** › **Next up** (‹ › or the arrow keys flip through it) |
| every campaign and post, by stage (Content Hub posts too) | home › **Status** (one board: **New**, **Design**, **Copy check**, **Ready**; **Show closed** adds **Closed**) |
| a saved project, "Recent", "Continue last" | home › **Projects** (people who design), or **Pick up where you left off** at the foot of Home |
| a new campaign, ticket or post | home › **New** (top right; it follows the role) |
| roles, requests, who can do what | home › **Access** (the admin); everyone else: the account menu (their initials) |
| their role, **Sign out** | the account menu (their initials, top right) |
| switching between CAS and OPS | back to the home page (the editors' top bar no longer has the switch) |

## New from 4 to 10 Nov

### Campaigns (CAS)

- **Copy is pasted as plain lines.** The Ad set tab's card is now **Copy** (it was **Copy from
  Claude**). Each audience starts with its name and a colon (`Family:`), then one line per part in
  reading order: small label, heading, hook line, optional key facts and tag chips, and the button
  last. A line with a colon, a percentage, a split, a handover date or a price becomes a **key
  fact**; any other extra line a **tag chip**. Each audience gets a tab; **Fill with the … copy**
  adds missing parts in that order, and **Remove unused parts** drops the template's sample words.
  A Claude reply with a `cas-copy` block still works. Full format: the guide's *Pasting the copy*.
- **Arabic is translated from the layout.** An Arabic project takes no pasted copy. **Make the
  Arabic**, or **Start the Arabic** on Status once the English exists, copies the English design,
  lays it out right to left and translates it with Google Translate, with no question. **Translate
  the layout to Arabic** (the Ad set tab's **Arabic copy** card) runs it again. The content team
  still checks it at the translation step.
- **Use an existing design.** On an open ticket, beside **Pick up**: pick a saved project, or **Open
  a project folder…**, say its market, audience and language, and the ticket is picked up with it.
- **Name phases yourself.** Phases are no longer a fixed list of five. Type any name (**Add phase**
  on Status, or the field under **Phases** in **Ad set settings**); each gets its own tab and Drive
  folder. Rename a phase in **Ad set settings** and **Save changes**. A new phase shows a **Start
  the English** placeholder for every audience.
- **Arabic per phase.** With more than one phase, each Arabic audience in **Ad set settings** has an
  **Arabic in** row: untick a phase and that audience is English only there (**Not needed in
  <phase>**).
- **Mixed ad sets.** **Brand › Mixed** in **Ad set settings**: every audience is branded and each
  card on Status ends with **Start the unbranded**, which saves a copy of the English design on the
  unbranded look as its own audience (for example **Local · Family · Unbranded**) with its own steps,
  copy check, Arabic and Drive folder. Its words come from a Copy block named for it
  (`Family unbranded:`).
- **Performance marketing's link can change words** in **Edit text** (photos stay locked), and
  every download goes in the ad set's **Activity**.
- **Launch.** Once the ads run, performance marketing presses **Launch** on Next up (or its row):
  the campaign reads **Launched** and moves to Status's **Closed** column. A phase added later
  brings it back.
- **Team links ready to send.** On an ad set's Status page, **Team links › Copy** puts
  `Content Review: <link>` or `AdSet Overview: <link>` on the clipboard; the button beside it opens
  that view.
- **Roam message.** **Send to copy check** / **Send for translation check** also posts to the
  **Design Task Hub** channel in Roam from the Content Engine bot, tagging the person picked, that
  language's copywriter and performance marketing, with the package link. If Roam can't be
  reached, the step still goes through and the studio says Roam wasn't told.
- **Overlap image** is cut out on upload (10–20 s, needs background removal running); its row says
  when a picture still has its background.
- The content team's and performance marketing's links open fast: tiles at once, thumbnails drawn
  small first. The copy check shows each variant's **Feed 1:1**; **Show all sizes** brings the rest.

### Posts (OPS)

- **Posts live in the team's files folder**, one folder per post under its template (for example
  `Weekly Listings/November 2026/<post name>/`), holding the record, the project, `Assets/`, the
  brief's files and the exports.
- **Ready goes to a social media manager.** **Approve copy**, or a designer's new **Send to SMM** at
  Design (no copy check), asks **Which social media manager gets it?** The post reads "With <name>
  to download". The social media manager's **Next up** is the posts ready to publish: **Open the
  files** (each image **Download**, **Download all**, **Drive folder**), then **Posted** closes it
  into Status's **Closed** column.
- **Delete for everyone** on a post's page (admin, designers, social media manager) takes it off
  Status and Home everywhere; its Drive files stay.
- **No more "Untitled post".** A template picked with no name or brief stays on this computer
  ("Not on Drive") until **Send to designer**.
- **A Reel thumbnail always starts as Just me**; **Send to designer** in the top bar puts it on
  Drive and Status.
- **The content team's copy check sits inside the post's page** on the home: every line of copy on
  the left, every page rendered on the right, **Approve copy** and **Back to design**. They never get
  the OPS editor; a link into OPS brings them to the post's page.

### Content Hub posts on Status (replaces point 5 below)

The hub now **pushes** its design tasks to Status; Status no longer reads the hub with OPS's
Import hub key. A task waits on the designer named in the hub's **Designer** field (others see "For
<name>"). Designers, the content team and the social media manager all see them; one waiting for
approval on the hub shows **Waits on you** to the content team and the social media manager.
Pressing **Open in OPS** in the hub is enough to put a post on Status (under **Design**), **Send**
moves it to **Copy check**, and the card shows the post's first page once it has been opened. The
content team can open a hub post in OPS from Status. OPS's **Send** is unchanged.

### Roles, Access and the home

- **Digital Marketing Team** is a new role: it sees and does exactly what performance marketing
  does (tickets, Status, the package link, **Edit text**, downloads, **Launch**) and has its own
  **Digital** column under **Access › Roles**.
- **Each role sees only its own work.** Performance marketing and Digital: campaigns only, and a
  shorter **Details** page (no audiences or team links; **Open the package** for the images). The
  content team: only what is handed to them (plus Content Hub tasks), and a campaign opens their
  link in a new tab. The top bar shows **Projects** only to people who design and **Access** only to
  the admin.
- **Preview the home as a person**, not only a role: **Preview the home as** lists everyone let in.
  A line under the top bar says **Viewing as** that person; **End preview** ends it. Steps pressed
  while previewing are really taken.
- **Also waiting on you** rows each have their button, plus **Posted** (social media) or **Launch**
  (performance marketing).
- **Closed column**: launched campaigns and posted posts, hidden until **Show closed** is on.
- The greeting sits on a sky for the time of day, with the date and time.
- **Both studios fit tablets and phones** too: the top bar takes two rows, and on a phone the step
  that moves the work on sits at the foot of the screen.

## What moved (28 Oct to 3 Nov)

**1. The studios lost their own Home, Status and Recent screens.**
- Opening CAS or OPS with nothing in it lands on the home's **Projects**. The studios' sidebar
  **Home**, **Status**, **Projects** and **Access** all go to the home page.
- **Templates**, **From the hub** (OPS) and **Component usage** (CAS) are still in the studios.
- **Open a project file…** (CAS) / **Open a post file…** (OPS) still work: from the home's
  Projects, or the foot of a studio's sidebar.
- Reloading a studio tab, or **Open in the studio** on a post, reopens the project you had open
  instead of a start screen.

**2. Projects is a page on the home.** Every saved project from both studios, CAS grouped by
campaign and OPS by format, with filters and search. Each tile is a card: the render on top, the
title and a grey line under it. **Your studios** on Home continues the newest project of each
studio. Only *saved* projects appear (a Save, an export into the Source folder, or opening a
session file).

**3. New follows the role.** A designer chooses **A campaign** or **An organic post**:
- **A campaign** opens CAS's campaign setup on its own page (**File as ticket**, or **Start
  designing**). Its picture is a crop guide: one 1:1 render with the 4:5, 9:16 and 1.91:1
  canvases outlined round it.
- **An organic post** opens OPS's **Start a post** (**Feed 3:4 · one page or a carousel**, or
  **Story 9:16**).
- Performance marketing gets **New ticket** (only **File as ticket**). Social media goes straight
  to OPS. The content team has no New.

**4. Item pages are on the home.** Clicking a card on Status opens the same page the studios had:
a campaign's ticket or ad set page (brief, audiences, **Pick up**, **Ticket settings**, phases,
Remove, Delete) or a post's page (**Send to designer**, **Send to copy check**, **Approve copy**,
Copy link, activity). A filed ticket shows on Status at once. Translation only counts audiences
that have an Arabic version.

**5. Content Hub posts are on Status.** Posts the Content Hub sent to design show on the board,
tagged **Content Hub**: waiting for a designer under **New**, in design or with changes asked
under **Design**, delivered and waiting for approval on the hub under **Copy check**, approved
under **Ready** (for two weeks). Clicking one opens it in OPS with the hub's copy on its pages;
**Send** then attaches the design to that hub post. (Since 3 Nov the hub pushes these to Status;
see *Content Hub posts on Status* above.)

**6. Access has a Roles tab (admin only).** One row per capability (Design campaign ads, Design
organic posts, File campaign tickets, Draft organic posts, Approve English copy, Approve the
Arabic translation), one tick box per role. **Save changes** reaches everyone with that role
within five minutes: what **New** offers, **Your studios**, **Projects**, whether CAS opens, and
who appears in the "Which designer" / "Who checks the copy" pickers. **Let people in** stays the
admin's alone. **Preview the home as** shows the home as that role, with an **End preview**
bar, instead of opening the old studio screens.

**7. Signing out** lands on a sign-in page and clears the last person's queue and cached lists
from that computer. **Sign out** is in the account menu (your initials).

**8. Phones, tablets and Safari.** The home works on a tablet (Status shows two stages by two) and
a phone (a compact Next up, filters in one swipeable line, a Status board that swipes one stage at
a time). Safari's broken thumbnails and gaps in the tile grids are fixed. Safari and Firefox still
can't use a **Source folder**: exports download as a zip.

## Fixed — tell the user if they hit the old behaviour

- **CAS: switching windows no longer reverts the canvas.** If the browser's storage is full, the
  studio now frees old workspace copies or warns, instead of silently going back to an older copy.
- **A details page no longer reloads itself** twice a second for performance marketing, social
  media and the content team.
- The open ticket page has room between its header and the brief.
- **Home and Status no longer lose every campaign** when the Drive sign-in lapses: they keep the
  last good list and the footer asks to **Sign in again**. **Refresh** renews an expired sign-in
  first.
- **A full browser storage no longer freezes the queue** on a day-old copy.
- **An ad set's Status page opens at once** instead of after every ad set has been read.
- **The content team's and performance marketing's links stay on their window** instead of
  jumping to Projects after ~15 seconds.

## Still the same

- The ad set flow (**Pick up › Design done › Create next audience › Make the Arabic**),
  Branded / Unbranded, review links (`#share=…`, no sign-in), hand-offs that name a person.
- OPS's Drive flow (**Draft › Design › Copy check › Ready**), **Send** to the Content Hub with the
  design key, exports to the team Drive folder.
- Every tab is its own `?ws=…` workspace; saved projects are shared between tabs.
- The **provident-studio** tools ([guide section 15](CAS-OPS-GUIDE.md#15-for-claude-the-studio-tools)).
- The brand rules. Never make up a fact that goes on an ad.

## Gone — don't offer these

- The **Campaign ads | Organic posts** switch in the editors' top bar.
- The studios' **Recent**, **Status**, campaign setup and **Access** screens (all on the home now).
- **Copy from Claude** (now **Copy**, plain lines), and pasting Arabic copy (the Arabic is
  translated from the layout).
- The fixed five phases (they are typed names now), and Mixed's per-audience brand switch (now
  **Start the unbranded**).
- Status reading the hub with OPS's **Import hub** key (the hub pushes its tasks).
- From earlier: YouTube Demand Gen, the Meta Ads kit bridge, CAS's Publish tab and Send / From the
  hub, the OPS support desk, the Projects folder view, the old in-editor guided wizard.

## For whoever tests the studios locally

The local test server (`python3 tools/share-dev/serve.py`, port 8790; a second one runs on 8791) has two helper pages that
the website never has:
- **/dev-signin** picks a test account (the admin or one of the team) without Google.
- **/dev-seed** fills the test server with demo campaigns and posts at every stage, access
  requests and saved projects.

## Where the engineering history went

`CLAUDE.md` is short now: standing rules only. The "why" behind each area is in `docs/notes/`
(for the home page, `docs/notes/landing-page.md`). Search those for "why" questions; don't change
studio files unless the user asks for a change to the studio itself.
