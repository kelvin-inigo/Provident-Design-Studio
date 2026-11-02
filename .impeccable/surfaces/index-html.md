---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Landing page (index.html)

Scope: the site's front door at provident-design-studio.vercel.app. Mode: Operate — a daily start screen for the studio's own staff, not a pitch.
Audience: designers, the social media manager, the content team (English / Arabic), performance marketing, and the one admin.
Job: show the signed-in person the one thing most worth doing next across both studios, the rest of their queue, and the studio they work in; the admin also sees who has signed in and who is waiting for access.
Content: real renders only (the studios' Status previews, recent saved projects, preview/ template renders). No invented claims.
Constraints: runs no studio code; reads what the studios leave in localStorage (provident-inbox-cas|ops, provident-acc-me, recents in IndexedDB) and, on the site, /api/share accme/acclist with the Google token.
Unresolved: the queue is only as fresh as the last Status read in a studio.

## Direction contract

THESIS: The page is one person's next move, not a menu; it refuses the two-equal-doors hero.
OWN-WORLD: The studios' Quiet Desk chrome (DESIGN.md): neutral grey ground, one Provident Navy action, weight-not-size hierarchy, rings not shadows, real renders as the only pictures, step segments in link / warn / good.
STORY: You see the greeting and who you are signed in as, the most urgent item with its render, step and one button, then the rest of your queue; your studio is one click away; the admin sees sign-ins and requests.
FIRST VIEWPORT: Greeting at headline size, left. Under it the Next up card across the main column: render 260 tall on the left, studio, name at 30px, step segments, from / due, one navy button. A 340px right column holds the account card, the studio rows (role-filtered) and, for the admin, Sign-ins.
FORM: Next up, 2nd on my list, seed 624b51b0.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
