# What's new in CAS & OPS — a note for Claude in Cowork

Changes from 28 Oct to 3 Nov 2026. Read this after the **For Claude in Cowork** block in
`CAS-OPS-GUIDE.md`. The guide is the full reference; this note says what moved, so you don't send
anyone to a screen that is gone. Quote on-screen names exactly as they appear here in **bold**.

## The one thing to remember

**There is one home now: `index.html`.** Everything that waits on someone — tickets, hand-offs,
copy checks, packages, access — lives on the home page for both studios. **CAS and OPS are only
for designing.** When a user asks "where is…", the answer is almost always the home page.

| they ask for | send them to |
|---|---|
| their queue, what to do next | home › **Home** › **Next up** (‹ › or the arrow keys flip through it) |
| every campaign and post, by stage (Content Hub posts too) | home › **Status** (one board: **New**, **Design**, **Copy check**, **Ready**) |
| a saved project, "Recent", "Continue last" | home › **Projects**, or **Pick up where you left off** at the foot of Home |
| a new campaign, ticket or post | home › **New** (top right; it follows the role) |
| roles, requests, who can do what | home › **Access** |
| switching between CAS and OPS | back to the home page (the editors' top bar no longer has the switch) |

## What moved

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
**Send** then attaches the design to that hub post. Status reads the hub only — it claims and
posts nothing. It uses the address and **Design key** set in OPS under **Share › Import hub**; the
line under the board says when the hub was last read, or why it couldn't be (not set up, key
refused, hub not reached). From the website, Chrome asks once to allow local network access.

**6. Access has a Roles tab (admin only).** One row per capability (Design campaign ads, Design
organic posts, File campaign tickets, Draft organic posts, Approve English copy, Approve the
Arabic translation), one tick box per role. **Save changes** reaches everyone with that role
within five minutes: what **New** offers, **Your studios**, **Projects**, whether CAS opens, and
who appears in the "Which designer" / "Who checks the copy" pickers. **Let people in** stays the
admin's alone. **Preview the home as** shows the home as that role, with an **End preview**
bar, instead of opening the old studio screens.

**7. Signing out** lands on a sign-in page and clears the last person's queue and cached lists
from that computer. Sign out is the arrow beside your name.

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

## Still the same

- The ad set flow (**Pick up › Design done › Create next audience › Make the Arabic**), phases,
  Branded / Unbranded, review links (`#share=…`, no sign-in), hand-offs that name a person.
- OPS's Drive flow (**Draft › Design › Copy check › Ready**), **Send** to the Content Hub with the
  design key, exports to the team Drive folder.
- Every tab is its own `?ws=…` workspace; saved projects are shared between tabs.
- The **provident-studio** tools ([guide section 15](CAS-OPS-GUIDE.md#15-for-claude-the-studio-tools)).
- The brand rules. Never make up a fact that goes on an ad.

## Gone — don't offer these

- The **Campaign ads | Organic posts** switch in the editors' top bar.
- The studios' **Recent**, **Status**, campaign setup and **Access** screens (all on the home now).
- From earlier: YouTube Demand Gen, the Meta Ads kit bridge, CAS's Publish tab and Send / From the
  hub, the OPS support desk, the Projects folder view, the old in-editor guided wizard.

## For whoever tests the studios locally

The local test server (`python3 tools/share-dev/serve.py`, port 8790) has two helper pages that
the website never has:
- **/dev-signin** picks a test account (the admin or one of the team) without Google.
- **/dev-seed** fills the test server with demo campaigns and posts at every stage, access
  requests and saved projects.

## Where the engineering history went

`CLAUDE.md` is short now: standing rules only. The "why" behind each area is in `docs/notes/`
(for the home page, `docs/notes/landing-page.md`). Search those for "why" questions; don't change
studio files unless the user asks for a change to the studio itself.
