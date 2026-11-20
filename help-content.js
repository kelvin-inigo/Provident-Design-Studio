/* HELP CONTENT (2026-11-18, by request): the words of the Help page (#/help, help.js).
   Every article is one job someone does, written from CAS-OPS-GUIDE.md, with on-screen names
   in bold exactly as the studios print them. An article is shown only to the roles that do that
   job (who):
     a capability the admin sets under Access › Roles — design-cas, design-ops, tickets, posts,
       copy-en, copy-ar, view-adsets, arch — so a change there changes Help too;
     or a role family — smm, pm (performance marketing and the Digital Marketing Team), ct (both
       content roles), admin — for work that belongs to a role rather than a capability;
     or 'all' (everyone signed in) and 'out' (shown before signing in).
   A guide's thumbnail is its first step's frame, or th: [frame, part] where that crops badly.
   Each step may point at a captured frame (f, in help/frames/) and a part of it (s, a rect
   recorded at capture time in help/frames.json). Frames are captured from the local test server
   with its demo data (tools/share-dev, /dev-seed), so the names in them are demo names.
   When a label, button or flow changes, change it here with the guide in the same pass. */
(function () {
  'use strict';
  var AREAS = [
    { k: 'cas', n: 'CAS + CASV', long: 'Campaign Ads Studio and the Video Studio', desc: 'Meta ads in every size, the ad set from ticket to package, and its video.' },
    { k: 'ops', n: 'OPS', long: 'Organic Post Studio', desc: 'Feed and story posts from locked templates, Draft › Design › Copy check › Ready.' },
    { k: 'home', n: 'Home', long: 'The home page', desc: 'Next up, Tracker, New, Projects, Access and the Engine: one page for both studios.' }
  ];

  // what each role is told first: its one-line job, and the articles that start it
  var ROLES = {
    designer: { area: 'cas', line: 'You design in both studios: pick up tickets, design every audience, hand work to the content team, export.', start: ['home-read', 'cas-pickup', 'ops-start'] },
    admin: { area: 'home', line: 'You have everything a designer has, plus Access and the Engine. Preview as shows any role’s Help.', start: ['home-access', 'home-read', 'home-engine'] },
    smm: { area: 'ops', line: 'You draft organic posts in OPS, hand them to a designer, and publish them when they are Ready.', start: ['ops-start', 'ops-move', 'ops-publish'] },
    pm: { area: 'cas', line: 'You file campaigns as tickets, follow them on Status, download the package and launch it.', start: ['home-ticket', 'home-status', 'cas-package'] },
    dmt: { area: 'cas', line: 'You run the same campaigns on email, SMS and WhatsApp: file tickets, follow Status, download the finished ads.', start: ['home-ticket', 'home-status', 'cas-package'] },
    cten: { area: 'ops', line: 'You check the English copy of posts and campaigns that are handed to you.', start: ['home-read', 'ops-copycheck', 'cas-copycheck'] },
    ctar: { area: 'cas', line: 'You check the Arabic translation of campaigns that are handed to you.', start: ['home-read', 'cas-copycheck', 'home-status'] },
    ct: { area: 'ops', line: 'You check the copy of posts and campaigns that are handed to you.', start: ['home-read', 'ops-copycheck', 'cas-copycheck'] },
    ai: { area: 'home', line: 'You read the Engine: how PDS is built, every commit and deployment. You can follow campaigns on Status, read-only.', start: ['home-engine', 'home-viewonly', 'home-status'] },
    other: { area: 'home', line: 'Your team opens what the admin ticks for it under Access › Roles. Help shows what that is.', start: ['home-read', 'home-status', 'home-account'] }
  };

  var A = [
    // ═════════════ HOME ═════════════
    { id: 'home-signin', area: 'home', group: 'Getting in', who: ['out', 'all'], min: 1,
      title: 'Sign in and get access',
      sum: 'Use your @providentestate.com Google account. The first time, the admin lets you in.',
      steps: [
        { t: 'Open the home page and press **Sign in with Google**. Pick your **@providentestate.com** account.', f: 'gate', s: 'signin' },
        { t: 'The first time, you land on **Waiting for access**. Add a note, say what you need to do, and press **Send to the admin**.' },
        { t: 'Keep the page open: it lets you in by itself once the admin says yes. Declined or removed? Write a note and press **Ask again**.' }
      ],
      more: ['Review links (a content-team or performance-marketing link) open without signing in: the link is its own key.', 'The studios opened straight off the disk with no internet open without the sign-in screen.'] },

    { id: 'home-read', area: 'home', group: 'Getting around', who: ['all'], min: 2,
      title: 'Read your Home: Next up and what waits on you',
      sum: 'Home puts the one thing most worth doing first, then the rest of your queue.',
      steps: [
        { t: '**Next up** is the one campaign or post most worth doing now: its picture, its step, who sent it and when it is due, and one button that moves it on.', f: 'home', s: 'next' },
        { t: '**‹ ›** (or the arrow keys) flip through the rest of what waits on you.', f: 'home', s: 'flip' },
        { t: '**Also waiting on you** lists the rest. Filter it by **Campaign ads** or **Organic posts**. **With others** is what you sent on and are waiting for.', f: 'home-list', s: 'also' },
        { t: '**Where everything is** counts each stage, **New**, **Design**, **Copy check** and **Ready**. Click a stage to open Tracker’s Kanban on it.', f: 'home', s: 'where' },
        { t: '**Pick up where you left off** at the foot holds your last saved projects.', f: 'home-desk', s: 'desk' }
      ],
      more: ['Home reads the campaigns and posts from Google Drive itself, about every minute while it is open. **Refresh** reads them now.', 'The first time on a computer it asks you to **Connect Google Drive**.'] },

    { id: 'home-status', area: 'home', group: 'Getting around', who: ['all'], min: 3,
      title: 'Find anything on Tracker',
      sum: 'Tracker’s Kanban (once Status): one board for both studios, in four stages, with filters that remember how you like it.',
      steps: [
        { t: 'Open **Tracker** in the top bar and press **Kanban** at its top right (**Progress**, the default, shows each campaign’s deliverables and each post’s steps as rows). Every campaign and post sits in its stage: **New**, **Design**, **Copy check**, **Ready**.', f: 'status', s: 'board' },
        { t: '**Only what waits on me** and **Find by name** narrow the board. A card with a blue ring and **Waits on you** is yours.', f: 'status', s: 'tools' },
        { t: '**Filter** opens **Stage**, **Due** and **From**. Each filter in force becomes a chip under the tools; click one to drop it, or **Clear all**.', f: 'status-filter', s: 'menu' },
        { t: '**Board | List** switches to a compact list you can sort by any heading. **View** holds Sort by, Group by and Density.', f: 'status-list', s: 'list' },
        { t: '**Show closed** adds a fifth column: launched campaigns and posted posts, newest first.' },
        { t: 'Click a card for its page: its steps, the step buttons, **Open in the studio**, **Copy link**, the brief and everything that happened.', f: 'item-cas', s: 'head' }
      ],
      more: ['**Overdue** (the red-dot button, only when something is late) puts late work in its own lane, in its stage, or hides it.', 'Content Hub posts show too, tagged **Content Hub**.'] },

    { id: 'home-ticket', th: ['new-cas', 'aud'], area: 'home', group: 'Starting work', who: ['tickets'], min: 3,
      title: 'File a campaign as a ticket',
      sum: 'Set up a campaign on the home page and hand it to a designer.',
      steps: [
        { t: 'Press **New** in the top bar (**New ticket** for performance marketing).', f: 'home', s: 'new' },
        { t: 'Give it a **Name**, **Residential** or **Commercial**, a **Deadline**, an empty Google Drive folder, the **Brief** (paste the script, fact sheet or WhatsApp brief) and any **Files**.', f: 'new-cas', s: 'form' },
        { t: 'It starts **Local**, both audiences, English only. Press **AR** on an audience to add Arabic, and **Markets & audiences** for International. **Reach** is Broad until phase 3.', f: 'new-cas', s: 'aud' },
        { t: 'Press **File as ticket**. Pick which designer picks it up. It waits for them under **New** on Status.' }
      ],
      more: ['A designer can press **Start designing** instead: it files the same ticket and opens the first audience in CAS.', 'Every audience delivers **Static**, **Animated** and the **MVP video**, in English and Arabic.'] },

    { id: 'home-post', area: 'home', group: 'Starting work', who: ['posts', 'design-ops'], min: 2,
      title: 'Start an organic post',
      sum: 'New › An organic post opens OPS on Start a post.',
      steps: [
        { t: 'Press **New** and pick **An organic post** (a social media manager’s button reads **New post**).', f: 'new', s: 'ops' },
        { t: 'OPS opens on **Start a post**: type the name, set **Due**, write the brief, attach files, then pick a template.', f: 'ops-start', s: 'name' },
        { t: 'The rest is in OPS: see **Start a post: Just me or Hand it on**.' }
      ] },

    { id: 'home-projects', area: 'home', group: 'Getting around', who: ['design-cas', 'design-ops', 'posts'], min: 1,
      title: 'Reopen a saved project',
      sum: 'Projects lists every saved project from both studios.',
      steps: [
        { t: 'Open **Projects** in the top bar. CAS projects are grouped by campaign; each card shows its audience, market, language and when it was saved.', f: 'projects', s: 'grid' },
        { t: 'Click a card to open it in its studio. **Continue last** opens the newest one.' },
        { t: 'Only saved projects are listed. A save, an export into the Source folder, or opening a session file all count.' }
      ] },

    { id: 'home-viewonly', area: 'home', group: 'Getting around', who: ['view-adsets'], min: 2,
      title: 'Follow campaigns without working on them',
      sum: 'View ad sets: every campaign on Status, read-only.',
      steps: [
        { t: '**Status** lists every campaign with its stage, and Home lists them under **In progress**. Nothing waits on you.', f: 'status', s: 'board' },
        { t: 'A campaign opens on its ad set page marked **View only**: phases, the four steps, every audience and its designs, the video and the whole **Activity** log.' },
        { t: 'There is nothing to press: no Pick up, settings, Approve, Launch or Download. A team link sent to you says **This isn’t your view**.' }
      ] },

    { id: 'home-account', area: 'home', group: 'Getting around', who: ['all'], min: 1,
      title: 'Your account, the theme and signing out',
      sum: 'Your photo at the top right holds your role and Sign out.',
      steps: [
        { t: 'Click your photo (or initials) at the top right: it shows your name, email and role, **Your access**, and **Sign out**.', f: 'menu', s: 'menu' },
        { t: 'The sun/moon button switches light and dark. The studios share the setting.', f: 'menu', s: 'theme' },
        { t: 'The **provident. DESIGN STUDIO** wordmark in either studio brings you back here.' }
      ] },

    { id: 'home-access', area: 'home', group: 'Admin', who: ['admin'], min: 4,
      title: 'Let people in, set roles, preview as',
      sum: 'Access is the admin’s: requests, people, what each role opens, and the activity log.',
      steps: [
        { t: 'Open **Access**. The badge counts people waiting. **Requests** shows each with their note: pick a role and press **Let in**, or **Decline**.', f: 'access', s: 'req' },
        { t: 'A team that isn’t listed? Pick **New role…** at the end of the dropdown, type its name and press **Add role**.' },
        { t: '**People** changes a role or removes access (they are out within five minutes).' },
        { t: '**Roles** is one row per capability, one tick per role. Change the ticks and **Save changes**. Help follows it: each role sees the guides for what it opens.', f: 'access-roles', s: 'table' },
        { t: '**Preview the home as** shows the home, the studios and this Help as a role or one person sees them. **End preview** comes back.', f: 'access', s: 'pv' }
      ],
      more: ['A step you press while previewing is really taken.', '**Let people in** is always the admin’s alone.'] },

    { id: 'home-engine', area: 'home', group: 'Admin', who: ['arch'], min: 3,
      title: 'Read the Engine',
      sum: 'How PDS is built, what is live, and whether every connection works.',
      steps: [
        { t: 'Open **Engine** in the top bar. **In production** is the deployment the site runs now.', f: 'engine', s: 'prod' },
        { t: '**How it connects** maps every part of PDS and every outside service. Lines are green when working, amber when slow, red when down, grey when not set up.' },
        { t: '**Alerts** tell you when a connection stops working, on any page of the home. **Turn on desktop alerts** sends them to the desktop too.' },
        { t: 'The **Timeline** lists every commit on main with its area and whether Vercel shipped it. **Find a commit** searches the messages.' }
      ] },

    // ═════════════ CAS ═════════════
    { id: 'cas-pickup', th: ['item-cas', 'phases'], area: 'cas', group: 'From ticket to package', who: ['design-cas'], min: 3,
      title: 'Pick up a ticket and fill the copy',
      sum: 'Open the ticket on Status, pick it up, paste the copy and fill.',
      steps: [
        { t: 'On **Status**, open the ticket under **New**: its brief, files and audiences. Press **Pick up**.', f: 'item-ticket', s: 'pick' },
        { t: 'A new project opens as the first audience, in English, on the **Ad set** tab.' },
        { t: 'Paste the copy into **Copy**: the audience name and a colon, then one line per part in reading order, the button last. Check where each line lands, then press **Fill with the … copy**.' },
        { t: 'Already have the design? **Use an existing design** on the ticket picks a saved project instead.' }
      ],
      more: ['A line with a colon, a percentage, a date or a price becomes a **key fact**; any other extra line becomes a **tag chip**.', 'An Arabic project takes no pasted copy: Claude writes it from the English layout.'] },

    { id: 'cas-build', area: 'cas', group: 'Design an ad', who: ['design-cas'], min: 4,
      title: 'Build an ad: components, styles and sizes',
      sum: 'The left rail is what is on the ad; This component edits the one you picked.',
      steps: [
        { t: '**On this ad** lists the components in reading order under **Top** and **Bottom**. Drag a row to reorder; the eye hides it on this variant.', f: 'cas-design', s: 'rail' },
        { t: '**Add a component** at the foot of the rail adds Eyebrow, Headline, Hook, Body, Price, Key facts, Tags, Bullets, Steps, Button, Graphic, Divider or Spacer.', f: 'cas-design', s: 'add' },
        { t: 'Click a component on the canvas and type in **This component**. **Style** shows every style with your words; **Size** is **S**, **M**, **L** or **XL**.', f: 'cas-design', s: 'comp' },
        { t: 'The small bar on the canvas moves it, sends it **Top** or **Bottom**, hides or deletes it. Its first button turns it into another kind.' }
      ] },

    { id: 'cas-layout', area: 'cas', group: 'Design an ad', who: ['design-cas'], min: 3,
      title: 'Layout, the photo and the 40% rule',
      sum: 'Point at a layout choice and the canvas previews it before anything changes.',
      steps: [
        { t: '**Layout** on the right: **Copy** (At the top, Split, At the bottom), **Logo** (left or centre, never right) and **Align**. Point at one to preview it; click to keep it.', f: 'cas-design', s: 'layout' },
        { t: 'Under each canvas, **Copy N%** shows how much of the ad the copy covers. Over 40% it turns amber: the picture should always outweigh the words.', f: 'cas-design', s: 'pct' },
        { t: '**Background image › Photo** sets the photo. Double-click it on the canvas to reframe.' },
        { t: '**Preview** in the top bar shows the ad on three phones, Feed, Reels and Story, for Facebook or Instagram.' }
      ] },

    { id: 'cas-variants', area: 'cas', group: 'Design an ad', who: ['design-cas'], min: 3,
      title: 'Variants, sizes, carousels and banners',
      sum: 'One design, every Meta size; up to three variants; a carousel of ten pages.',
      steps: [
        { t: 'The canvases run 1:1, Portrait 3:4, 9:16 and Horizontal 1.91:1. Each mirrors the 1:1 until you press its **link** button; the **eye** hides a size from export.', f: 'cas-design', s: 'plates' },
        { t: '**Add Variant** copies the one you are on (up to three). Words are shared; layout, style and photo are per variant.' },
        { t: '**All variants** holds the whole project: **Single** or **Carousel**, **QR code**, **Partner logo** and **Typeface** (English or Arabic, which mirrors the ad).', f: 'cas-allvar', s: 'panel' },
        { t: 'The **Eventbrite banner** row adds 1880 × 940 and 758 × 380. Banners never carry a QR code.' }
      ] },

    { id: 'cas-handoff', area: 'cas', group: 'From ticket to package', who: ['design-cas'], min: 3,
      title: 'Send to copy check, the next audience and the Arabic',
      sum: 'The top bar always offers the next move.',
      steps: [
        { t: 'Beside **Ad set | Design**, four small bars show the step, with the market, audience and language. The button beside them is the next thing to do.', f: 'cas-design', s: 'step' },
        { t: 'Press **Send to…** and pick the task: **Copy check**, **Arabic**, **Animated**, **Video**, **Design** or **Done**. Then pick who gets it. It lists anything missing first.' },
        { t: 'Then **Create next audience** opens the next planned audience with the copy already there: **Fill**, design, send.' },
        { t: 'Once an audience’s English is approved, **Make the Arabic** copies the design in the Arabic typeface, laid out right to left, with the words written in Arabic.' }
      ],
      more: ['**Already approved** marks a design that was signed off before it came in. **Reopen copy check** undoes it.', 'Sending to copy check also posts to the **Paid Ads Hub** channel in Roam.'] },

    { id: 'cas-adset', area: 'cas', group: 'From ticket to package', who: ['design-cas'], min: 4,
      title: 'Run the ad set on Status',
      sum: 'Phases, audiences, designs and looks, laid out the way the ad set is built.',
      steps: [
        { t: 'Open the ad set on **Status**. At the top: its name, status, dates, **Drive folder** and **Ad set settings**.', f: 'item-cas', s: 'head' },
        { t: 'A tab per phase, and **Add phase**. Under it, **Waiting on** chips jump to each audience still open.', f: 'item-cas', s: 'phases' },
        { t: 'One card per market and audience. A project is a tile that opens it; a dashed slot says how it starts: **Start the English**, **Start the Arabic**, **Start the unbranded**.', f: 'item-cas', s: 'aud' },
        { t: 'The **⋯** on a tile holds **Change audience**, **Already approved** and **Remove**. **Team links** on the right copy each team’s link.' }
      ],
      more: ['Reach is set per phase: press **Broad** on a phase for one Broad audience.', 'Drive follows Status: moving, renaming and removing change the Drive folder too.'] },

    { id: 'cas-unbranded', area: 'cas', group: 'Design an ad', who: ['design-cas'], min: 2,
      title: 'Make an unbranded ad',
      sum: 'No wordmark, no QR, its own colours and fonts.',
      steps: [
        { t: 'Use the **Provident | Unbranded** switch at the bottom left of the canvas. It applies to the whole project.', f: 'cas-design', s: 'brand' },
        { t: 'Press **Unbranded** again to open its panel: **Colour** (read from the photo; lock any you pick), **Type**, **Shape** and **Saved**.' },
        { t: 'Switch back to **Provident** any time: the Provident look returns exactly as it was.' }
      ] },

    { id: 'cas-export', area: 'cas', group: 'Export', who: ['design-cas'], min: 2,
      title: 'Export, and see everything you exported',
      sum: 'Share › pick a format › one button. Every export overwrites the last.',
      steps: [
        { t: 'Open **Share**, check the **Campaign name**, pick **JPEG**, **PNG**, **SVG** or **PDF**, then press the button (it says what it will do, e.g. **Export 6 JPEGs**).', f: 'cas-share', s: 'panel' },
        { t: 'Files land flat in the Source folder: `<name>_Variant A_feed.jpg`, `_Portrait_3x4`, `_Story`, `_Landscape_1.91x1`.' },
        { t: 'The **Ad sets** chip under the canvas opens every audience you exported, with **Download** per audience and **Images | Edit text**.' }
      ] },

    { id: 'cas-animated', area: 'cas', group: 'Export', who: ['design-cas'], min: 3,
      title: 'The Animated deliverable: a video background',
      sum: 'The same design with a video behind it, on the 1:1 and the 9:16.',
      steps: [
        { t: '**Background image › Background › Video**. **Add a video**: **Generate from the photo**, **Upload a clip**, or **Edit in CASV**.', f: 'cas-design' },
        { t: '**Generate from the photo** shows **See the price** first and spends nothing until **Generate · N credits**. It needs CASV running on the same computer.' },
        { t: 'A photo wider than 9:16 shows **Extend to 9:16**. **Yes** (the default) has Nano Banana 2.1 add more of the scene above and below it before the clip is made, so nothing is cropped (2 credits more). **No** crops the centre.' },
        { t: '**Share › Animated › Export animated** records the 1:1 and 9:16 as MP4. Keep the tab in front.' }
      ] },

    { id: 'cas-copycheck', area: 'cas', group: 'Copy check', who: ['copy-en', 'copy-ar'], min: 2,
      title: 'Check a campaign’s copy',
      sum: 'Your link shows every project’s words beside its images.',
      steps: [
        { t: 'A campaign waiting on you is on your Home. Its button opens the content-team link in a new tab.', f: 'home-ct', s: 'next' },
        { t: 'Pick a project on the left. Its words sit beside the Feed 1:1, which updates as you type; the designer sees your change within seconds.', f: 'ct-link', s: 'words' },
        { t: '**Show all sizes** brings in every other size. **Approve English copy** (or **Approve translation** for the Arabic) signs it off.', f: 'ct-link' }
      ],
      more: ['Signed in with Google, you only see your language’s approve button.'] },

    { id: 'cas-package', area: 'cas', group: 'From ticket to package', who: ['pm'], min: 3,
      title: 'Download the package and launch',
      sum: 'Your link shows every audience’s images, always the latest.',
      steps: [
        { t: 'Open the campaign from Home or Status, then **Open the package**. A bar at the top shows the ad set’s progress and one row per audience.', f: 'pm-link', s: 'bar' },
        { t: 'Each audience sent for review has **Download**. **Download package** takes every one that is ready; you don’t have to wait for the copy approvals.', f: 'pm-link', s: 'dl' },
        { t: '**Images | Edit text** switches to the words: change them and the images update as you type. Words are all it can change.' },
        { t: 'Once the ads run, press **Launch** on Home. The campaign reads **Launched** and moves to **Closed** on Status.' }
      ] },

    { id: 'casv-make', area: 'cas', group: 'CASV: the video', who: ['design-cas'], min: 4,
      title: 'Make the MVP video in CASV',
      sum: 'CASV runs on your own computer: a timeline with Text, Logos, Video, Music and Sound.',
      steps: [
        { t: 'Open the Video Studio on your computer. The top bar has the size switch (**Reel 9:16** or **Square 1:1**), Undo and Redo, **Preview**, **Export video** and **Send to CAS**.', f: 'casv', s: 'top' },
        { t: 'The left rail is what you can add: **Media**, **Audio**, **Text**, **Graphics**. Click a file to add it to the video.', f: 'casv', s: 'lib' },
        { t: 'On the timeline the Video track is magnetic: trim an edge, drag to reorder, **S** cuts at the playhead.', f: 'casv', s: 'tl' },
        { t: 'The right rail is **Selected | Whole video**: settings for what you picked, or the wordmark and collaboration logo once for the whole video.', f: 'casv', s: 'insp' }
      ] },

    { id: 'casv-script', area: 'cas', group: 'CASV: the video', who: ['design-cas'], min: 3,
      title: 'Start a video from a script',
      sum: 'Choose the script and its brochure: CASV lays out the first cut, scene by scene.',
      steps: [
        { t: 'The script comes from the video-script skill in Claude: a Markdown file (.md) with the script table and the image map. In CASV press the page icon in the top bar (**Start from a video script**), or **Or start from a video script** on an empty timeline, and choose the script and its brochure PDF together.', f: 'casv-script', s: 'btn' },
        { t: 'CASV takes the photo from each brochure page the script names, cuts it to its scene’s time and frames it from the script’s crop words. The on-screen lines become texts and the last scene becomes the end card.', f: 'casv-script', s: 'tl' },
        { t: '**Whole video › From the script** lists what is still needed: a missing developer logo, lines that still say [NEED: …], pages with no photo. Each **Scene** link jumps to its clip.', f: 'casv-script', s: 'from' },
        { t: '**Voiceover** and **Music** open the Generate panel with the script’s lines, mood and length filled in. **Queue N camera moves** queues each photo’s move from the script; nothing is spent until you run **/animate-photos** in Claude.', f: 'casv-script', s: 'from' },
        { t: '**Export video** and **Send to CAS** ask first while any text still says [NEED: …].' }
      ] },

    { id: 'casv-animate', area: 'cas', group: 'CASV: the video', who: ['design-cas'], min: 4,
      title: 'Turn a photo into video',
      sum: 'Pick a camera move, check the prompt Higgsfield gets, then generate.',
      steps: [
        { t: 'Select a photo on the timeline. Under **Selected › Animate this photo**, choose a **Camera move** (each button plays the move on your photo), then **Length**, **Model** and **Quality**.', f: 'casv-anim', s: 'moves' },
        { t: 'A photo wider than the video (a landscape photo, or a 3:4 one in a Reel) shows **Extend to 9:16**, set to **Yes**: nothing is cropped. Nano Banana 2.1 first adds more of the scene above and below the photo (more sky, more ground or water), then the clip is made from that. The photo itself stays exactly as it is, and it adds 2 credits. **No** crops it to the frame as the canvas shows it.' },
        { t: 'Set **People in it** to **Yes** when the photo has people, so the prompt keeps their faces, hair and clothes and asks only for small movements.', f: 'casv-prompt', s: 'people' },
        { t: '**Prompt** is exactly what Higgsfield gets, in 14 parts: the scene, camera, action, light, sound, and what must not change. The studio fills it from your choices, and you can type in it.', f: 'casv-prompt', s: 'prompt' },
        { t: 'For a prompt written from what is actually in the picture, press **Have Claude write it from the photo**, just under **Length**. Claude looks at the photo and the prompt comes back in about a minute, marked **Written by Claude from the photo**. It is free.', f: 'casv-prompt', s: 'write' },
        { t: '**Generate now** shows the exact credits and waits for your yes. **Or add it to the queue for Claude** waits for **/animate-photos**, which writes the prompt from the photo first. Either way the finished clip takes the photo’s place on the timeline.' }
      ] },

    { id: 'casv-send', area: 'cas', group: 'CASV: the video', who: ['design-cas'], min: 3,
      title: 'Put the video on the ad set',
      sum: 'Send to CAS records both sizes; Add video puts them in the ad set.',
      steps: [
        { t: 'Turn it on once: Status › the ad set › **Ad set settings** › **Video** › **Includes a video**.' },
        { t: 'In CASV press **Send to CAS**, name the video and press **Record and send**. It records the Reel and then the Square.', f: 'casv', s: 'top' },
        { t: 'On the ad set page press **Add video**, pick it under **From CASV on this computer**, choose its **Audience** and press **Add video**.', f: 'item-cas', s: 'aud' },
        { t: 'Comments made on the ad set come back to CASV as numbered pins on its timeline. Fix, **Send to CAS** again, then **Replace video**.' }
      ] },

    { id: 'casv-review', area: 'cas', group: 'CASV: the video', who: ['design-cas', 'pm', 'ct', 'tickets'], min: 2,
      title: 'Review a video on the ad set',
      sum: 'Play it, comment on the timeline, download both sizes.',
      steps: [
        { t: 'Click the video’s tile on the ad set page. **Reel 9:16 | Square 1:1** switches size.', f: 'item-cas', s: 'aud' },
        { t: 'Pause where something should change, write under **Comment at 0:12** and press **Add comment**. Each comment is a pin on the bar under the video.' },
        { t: '**Download Reel 9:16** and **Download Square 1:1** save the MP4s. Performance marketing also has **Video** in **Open the package**.' }
      ] },

    // ═════════════ OPS ═════════════
    { id: 'ops-start', area: 'ops', group: 'Make a post', who: ['posts', 'design-ops'], min: 3,
      title: 'Start a post: Just me or Hand it on',
      sum: 'Name it, brief it, choose who works on it, pick a template.',
      steps: [
        { t: 'From **New › An organic post**, type the post’s name at the top, set **Due**, write a **Brief** and **Attach files**.', f: 'ops-start', s: 'name' },
        { t: '**Just me**: you make and export it here; it is not on Status. **Hand it on**: it gets its own Drive folder and goes Draft › Design › Copy check › Ready.', f: 'ops-start', s: 'who' },
        { t: 'Pick a template below. A Reel thumbnail always starts as Just me.', f: 'ops-start', s: 'tpl' }
      ] },

    { id: 'ops-guided', area: 'ops', group: 'Make a post', who: ['posts', 'design-ops'], min: 3,
      title: 'Make a post in the guided run',
      sum: 'One page of the post at a time, top to bottom.',
      steps: [
        { t: 'The form heads with the page’s name and where it sits ("Page 2 of 6"). Each section shows **Done** or how many items are missing.', f: 'ops-guided', s: 'form' },
        { t: '**Next** checks the page and lists anything missing; click an item to jump to it.', f: 'ops-guided', s: 'next' },
        { t: 'The thumbnails under the preview are every page: blue ring where you are, green when finished, amber with **!** when left with gaps.', f: 'ops-guided', s: 'pages' },
        { t: 'The last tile is **Finish**: the look (wash, photo strength, panel colour, the 9:16 story), then **Save all**.' }
      ] },

    { id: 'ops-templates', area: 'ops', group: 'Make a post', who: ['posts', 'design-ops'], min: 2,
      title: 'Pick the right template',
      sum: 'Each template is a fixed layout: you fill it, the brand rules are kept for you.',
      steps: [
        { t: '**Just listed / sold**: one listing card; needs a QR code and a listing number. **Weekly listings**: a cover, up to 15 property pages, a closing slide.', f: 'ops-start', s: 'tpl' },
        { t: '**Top agents**: a cover and five ranking cards. **Top agent — solo**: one agent’s card. **Google reviews**: up to 10 review cards. **Congratulations award**: one card.' },
        { t: '**Carousel**: up to 10 pages, each with its own layout. **Reel thumbnail**: one 9:16 cover in 7 layouts.' }
      ] },

    { id: 'ops-all', area: 'ops', group: 'Make a post', who: ['posts', 'design-ops'], min: 2,
      title: 'All controls: the full editor',
      sum: 'The same form as the guided run, beside every page at once.',
      steps: [
        { t: 'Press **All controls** in the top bar. **Guided** brings you back.', f: 'ops-all', s: 'switch' },
        { t: 'The left rail is the post’s pages; click one to edit it, **Add page** where the template allows.', f: 'ops-all', s: 'pages' },
        { t: 'The right rail is the form for the page you are on. Each section folds from its heading.', f: 'ops-all', s: 'form' },
        { t: '**Post look** at the foot of the canvases holds the whole post: **Story 9:16**, wash, photo strength, panel colour, the logo.' }
      ] },

    { id: 'ops-move', area: 'ops', group: 'Hand-offs', who: ['posts', 'design-ops'], min: 3,
      title: 'Move a post on: Draft › Design › Copy check › Ready',
      sum: 'The top bar shows the post’s step and the one button for what you do next.',
      steps: [
        { t: 'Beside **Guided | All controls** is the step and its button: **Send to designer** at Draft, **Send to copy check** at Design.', f: 'ops-guided', s: 'step' },
        { t: 'A step that names who gets it asks you to pick the person. The post then reads **With Sara** and waits on her Home.' },
        { t: 'Click the step for the post’s panel: who did each step and when, **Back to draft** / **Back to design**, **Open on Status**, **Drive folder**.' },
        { t: 'A social media manager can press **Mark as done** to move a post straight to **Ready**.' }
      ] },

    { id: 'ops-copycheck', area: 'ops', group: 'Hand-offs', who: ['copy-en', 'copy-ar', 'ct'], min: 2,
      title: 'Check a post’s copy',
      sum: 'The words sit beside every page, right on the post’s page.',
      steps: [
        { t: 'A post waiting on your check is on your Home. Open it.', f: 'home-ct', s: 'next' },
        { t: 'Every line of copy is on the left, headed by its page; every page renders on the right and updates as you type.' },
        { t: '**Approve copy** moves it to Ready. **Back to design** sends it back to the designer.' }
      ] },

    { id: 'ops-publish', area: 'ops', group: 'Hand-offs', who: ['smm'], min: 2,
      title: 'Publish a Ready post',
      sum: 'Your Next up is the posts ready to publish.',
      steps: [
        { t: 'A Ready post is on your Home: **Open the files** shows every exported image.', f: 'home-smm', s: 'next' },
        { t: '**Download** each, or **Download all**, or open the **Drive folder**.' },
        { t: 'Publish it, then press **Posted**: the post closes and moves to **Closed** on Status.' }
      ] },

    { id: 'ops-export', area: 'ops', group: 'Export', who: ['posts', 'design-ops'], min: 2,
      title: 'Export a post',
      sum: 'Save all on Finish, or Share › Format › one button.',
      steps: [
        { t: 'Use **Save all** on **Finish**, or open **Share**: set the file name, pick a **Format**, press the button.', f: 'ops-share', s: 'panel' },
        { t: 'Files go flat into the Source folder: `…_3x4` for the feed and `…_9x16` for the story when **Story 9:16** is on.' },
        { t: 'Every export is also saved to the post’s folder on Google Drive, by template. OPS asks before replacing files.' }
      ] },

    { id: 'ops-photos', area: 'ops', group: 'Make a post', who: ['posts', 'design-ops', 'design-cas'], min: 2,
      title: 'Photos: reframe, cut-outs and Photoshop',
      sum: 'Drop a picture on its box; its actions sit beside it.',
      steps: [
        { t: 'Drop a picture on its box, or click to choose. Then **Replace**, **Reframe**, **Photoshop** and **Remove** sit beside it.', f: 'ops-all', s: 'form' },
        { t: 'Agent photos lose their background automatically while the cut-out service runs on your computer.' },
        { t: '**Photoshop** opens the picture; save it there under the same name and the studio picks it up within seconds.' }
      ] }
  ];

  // GETTING AROUND: each view, what its parts are. A view is shown when its 'who' matches.
  var VIEWS = [
    { id: 'v-home', area: 'home', n: 'Home', who: ['all'], f: 'home', pins: [
      ['next', 'Next up', 'The one thing most worth doing, with one button.'],
      ['where', 'Where everything is', 'Each stage and what is in it; click to open Tracker’s Kanban there.'],
      ['new', 'New', 'Follows your role: a campaign, a post, or a ticket.'],
      ['nav', 'The pages', 'Home, Tracker, Projects, Help, and Access or Engine when your role has them.']] },
    { id: 'v-status', area: 'home', n: 'Tracker › Kanban', who: ['all'], f: 'status', pins: [
      ['tools', 'Narrow it', 'Only what waits on me, Find by name, the kind chips, Filter.'],
      ['board', 'The board', 'New, Design, Copy check, Ready. Click a card for its page.']] },
    { id: 'v-adset', area: 'cas', n: 'An ad set page', who: ['design-cas', 'tickets', 'pm', 'view-adsets', 'ct'], f: 'item-cas', pins: [
      ['head', 'The campaign', 'Name, status, dates, Drive folder, Ad set settings.'],
      ['phases', 'Phases', 'A tab per phase; Waiting on chips under it.'],
      ['aud', 'Audiences', 'One card per market and audience, a row per look.']] },
    { id: 'v-cas', area: 'cas', n: 'The CAS editor', who: ['design-cas'], f: 'cas-design', pins: [
      ['rail', 'On this ad', 'What is on the canvas, in reading order.'],
      ['plates', 'The canvases', 'One row per variant: 1:1, 3:4, 9:16, 1.91:1.'],
      ['comp', 'This component', 'Words, Style and Size of what you picked.'],
      ['layout', 'Layout', 'Copy, Logo, Align, Spacing, Scaling, Scrim.'],
      ['step', 'The step', 'Where it stands and the next move.']] },
    { id: 'v-casv', area: 'cas', n: 'CASV', who: ['design-cas'], f: 'casv', pins: [
      ['lib', 'Add', 'Media, Audio, Text, Graphics.'],
      ['tl', 'Timeline', 'Text, Logos, Video, Music and Sound tracks.'],
      ['insp', 'Selected | Whole video', 'Settings for the pick, or for the whole video.'],
      ['top', 'Top bar', 'Size, Preview, Export video, Send to CAS.']] },
    { id: 'v-ops', area: 'ops', n: 'The OPS guided run', who: ['posts', 'design-ops'], f: 'ops-guided', pins: [
      ['form', 'The page’s form', 'Sections in a fixed order, each Done or counting what is missing.'],
      ['pages', 'Every page', 'Rings: blue here, green done, amber gaps.'],
      ['step', 'The step', 'Where the post stands and its one button.']] }
  ];

  // SOMETHING NOT WORKING: the guide's troubleshooting, per studio, for the roles it concerns
  var TROUBLE = [
    { area: 'home', who: ['all'], q: 'I signed in but see “Waiting for access”', a: 'The admin hasn’t let you in yet. Add a note saying what you need to do and press **Send to the admin**; keep the page open and it lets you in by itself.' },
    { area: 'home', who: ['all'], q: 'Something I expect is not on Home or Status', a: 'Press **Refresh** under the lists: Home reads Google Drive about every minute. On a new computer, **Connect Google Drive** first. If it still isn’t there, your role may not open that studio: the admin sets it under Access › Roles.' },
    { area: 'home', who: ['design-cas', 'design-ops', 'posts'], q: 'A project isn’t in Projects', a: 'Only saved projects are listed. Open it and press **Save**.' },
    { area: 'home', who: ['all'], q: 'Status stopped picking up changes', a: 'On a campaign’s page, the **Google Drive** strip has **Reconnect**: it gets a new Google session with the same account, then reads everything again.' },
    { area: 'cas', who: ['design-cas'], q: 'Everything downloads as a zip, or there is no Source folder button', a: 'You are in Safari or Firefox. Use Chrome or Edge.' },
    { area: 'cas', who: ['design-cas'], q: 'The top bar is cut off and Share is missing', a: 'Make the window wider: CAS’s top bar needs about 1150 px.' },
    { area: 'cas', who: ['design-cas'], q: 'Old files are still in the export folder', a: 'Exports overwrite but never delete. Remove old files by hand.' },
    { area: 'cas', who: ['design-cas'], q: 'An export went into the wrong design folder', a: 'CAS’s Master is **Variant A**, Variant 2 is **B**, Variant 3 is **C**.' },
    { area: 'cas', who: ['pm', 'tickets'], q: 'The package isn’t ready to download', a: 'Each audience can be downloaded as soon as the designer sends it for review, before the copy approvals. **Download 1 of 2** means one of two is ready so far.' },
    { area: 'cas', who: ['design-cas'], q: 'Generate from the photo or Edit in CASV does nothing', a: 'Both need the Video Studio (CASV) running on the same computer. Start it, then try again.' },
    { area: 'cas', who: ['design-cas'], q: 'CASV says its local server is an older copy', a: 'Restart CASV’s server: stop it, then run `python3 tools/video-dev/serve.py` again in the Video Studio folder, and press the button again.' },
    { area: 'cas', who: ['design-cas'], q: 'I pressed Have Claude write it from the photo and nothing came back', a: 'It takes about a minute. If it says Claude is not signed in on this computer, run `python3 tools/video-dev/serve.py --claude-login` in Terminal once, sign in, and press it again.' },
    { area: 'cas', who: ['design-cas'], q: 'The prompt says the settings have changed since', a: 'It was written for another camera move, length or People choice. Press **Have Claude write it again**, or **Back to the studio’s template**; left as it is, it is used as written.' },
    { area: 'ops', who: ['posts', 'design-ops'], q: 'An agent photo keeps its background', a: 'The cut-out service is set up once per computer with `./tools/rembg/install.sh`. Until then, upload a PNG that is already cut out.' },
    { area: 'ops', who: ['posts', 'design-ops', 'design-cas'], q: 'Saved in Photoshop but nothing changed', a: 'Keep the same file name (⌘S). Without the Photoshop helper, save as PNG or JPEG, not PSD.' },
    { area: 'ops', who: ['posts', 'design-ops'], q: 'My post is not on Status', a: 'A post stays off Status until you **Save** it or press a step such as **Send to designer**. A post made with **Just me** is never on Status.' },
    { area: 'ops', who: ['copy-en', 'copy-ar', 'ct'], q: 'A link into OPS took me to the post’s page', a: 'That is on purpose: the content team checks copy on the post’s page, never in the OPS editor.' }
  ];

  window.providentHelpContent = { AREAS: AREAS, ROLES: ROLES, ARTICLES: A, VIEWS: VIEWS, TROUBLE: TROUBLE };
})();
