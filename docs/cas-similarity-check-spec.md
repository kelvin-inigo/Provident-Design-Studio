# CAS similarity check — spec

Status: built 2026-11-25 on branch `cas-similarity` (not on main). What shipped differs from
the proposal below where marked **As built**; the full record is in
`docs/notes/reviews-sharing-drive.md` (LIKENESS).

## Why

Meta's Creative Insights report (Nov 2026) on our account:

- **12 identical pairs, 5 similar, 5 diverse.**
- Flagged pairs ran at **79–84% similar**. They were the same Open House design in light and
  dark, the same beach photo as 9:16 and 1:1, and the Rockefeller tower in two layouts built
  the same way.
- Above **65%**, Meta shows both ads to the same people. The second ad adds no reach.
- **45.8% of spend** sat in medium or high fatigue.

The check catches a near-duplicate **before it leaves CAS**, and says what to change.

## What it does

It compares every design that will run in the same Meta ad set and gives each pair a
**Likeness** score from 0 to 100, with plain reasons:

> Investor · Design 2 looks **82%** like Investor · Design 1: same photo, same layout, same
> angle (Payment plan). Meta treats ads above 65% as the same ad.

The score is our own estimate. It is not Meta's number, so it is called *Likeness*, never
"Meta similarity".

## What is compared with what

| compared | why |
|---|---|
| Designs in the **same phase, market and audience root** (Design 1, Design 2…, Unbranded): `audRoot(aud)` equal | These designs run together in one Meta ad set |
| A **later phase** (Ad Fatigue 01/02) against the **previous phase**, same market and audience root | A fatigue refresh that looks like Launch does nothing |
| **Not** the sizes of one design (1:1 / 3:4 / 9:16) | They are one ad, delivered as placement versions |
| **Not** English vs Arabic of one design | They run in different ad sets |
| **Not** Family vs Investor | They run in different ad sets (a possible later option) |

Each design is represented by its **9:16 render**. A carousel uses its first page. An animated
design or a CASV video uses its **first frame**, which is the frame people scroll past.

## The score

Likeness = weighted blend of four parts, each 0–1:

| part | weight | how it is measured | reason shown |
|---|---|---|---|
| **Picture** | 0.45 | 9:16 render at 64 px: difference hash (16×16, greyscale) for structure, plus an HSV colour histogram (8×4×4) for palette, averaged | "looks the same" / "same colours" |
| **Photo** | 0.25 | Difference hash of the **background photo itself**, before the crop. A match of 90% or more counts as 1. The saved `imgs[slot].h` is not enough, because it hashes the crop record too, so a recrop would read as a new photo | "same photo" |
| **Layout** | 0.15 | Same layout preset, plus how far the visible component kinds overlap in reading order (Jaccard over the `orderedFor` list) | "same layout" |
| **Message** | 0.15 | Same top angle from `adRead` (`AN_ANGLES`), plus how far the headline words overlap (Jaccard) | "same angle (…)" / "same headline" |

Only the parts that score 0.7 or more are listed as reasons, strongest first.

**Bands:**
- **65 or more: Too alike** (amber). This is Meta's line.
- **50–64: Close** (neutral note).
- **Under 50:** nothing is shown.

**As built:** picture .10, photo .30, layout .35, message .25. Calibrating on the report's pairs
showed the picture part cannot separate them, so it only nudges. The picture is the 1:1 preview
Status already stores, not a new 9:16 render. The photo is an exact match of the photo's bytes,
not a perceptual hash. The crops stay out of this public repo. Known miss: two different photos of
the same building under different headlines (Meta's Rockefeller pairs).

**Calibration:** the weights above were the starting point. Before release, tune them on the eight
pairs in the report (slides 27–30, cropped out of the phone frames). The 79–84% pairs must score
65 or more, and the 47–48% pairs must score under 55. The fixtures go in
`tools/similarity-fixtures/` with the expected bands.

## Where it shows

1. **Send to copy check.** `SP.rsPrecheck()` gains one line per design over 65, in the same
   `confirm()` the hand-off already uses. Like every other precheck line, it **never blocks**.
2. **Status › the ad set's page.** Each audience card gets a **Variety** row: "3 distinct of 4",
   plus any pair over 65. Clicking a pair opens both previews side by side with the score and
   reasons.
3. **Ad set tab in CAS:** the same Variety row, for the open project's audience. **As built: not
   done yet**; Status and Send to copy check carry it.

## Where the numbers come from

- A design's **fingerprint** is computed when its preview is redrawn (`SP.shThumb`, 4 s after
  edits settle). It is sent with the thumbnail (op `thumb`) as `review.sim`:
  `{v:1, dh, hist, photo, layout, angle, words, at}`. So it is no new revision, and Status never
  re-renders anything.
- **Scoring is pairwise and done in the browser** from those fingerprints (a few hundred bytes
  each). There is no server change, no model and no Meta API.
- A design saved before this ships has no `sim`. It is fingerprinted on its next preview redraw,
  and until then it shows "Not checked yet".

## What it does not touch

- **Chrome and shell only.** No `buildOps`, `modLayout` or canvas preview change. Even so, run
  the op-signature census against `_PRE` to prove no artwork moved.
- Nothing is blocked, renamed or moved on Drive.

## Docs in the same pass

- Architecture PDF: the ad set, Status and precheck sections; new revision and changelog row.
- `docs/notes/reviews-sharing-drive.md`: a new section.
- `CAS-OPS-GUIDE.md` and `GROK-BOT-INSTRUCTIONS.md`: the Variety row and the precheck line.
- `engine-map.json`: no change (no new service or connection).

## How it is verified

- The report's eight pairs land in the right bands (unit check over the fixtures).
- On the Drive stand-in, one audience holds four designs:
  - a light and a dark copy of the same design
  - a recrop of the same photo
  - one design that is genuinely different
  - an Unbranded version that keeps only the photo

  Expected: the first two are flagged and the reasons name the photo and layout; the different
  one is not flagged. Send to copy check lists the pair, and Cancel sends nothing.
- A fatigue phase holding a copy of a Launch design is flagged against Launch.
- Real clicks on Status and the Ad set tab, in both themes, with no console errors.

## Open questions

1. Is **65** the right line, or should Close (50–64) also be amber?
2. Should Family vs Investor be compared too? They are separate ad sets, but they often share
   one audience pool.
3. Should the designer tag **Subject** (people / property) and **Finish** (polished / raw) on
   each design? CAS cannot read these from the canvas, and they are two of Meta's four
   difference points. With the tags, the Variety row could also show the mix
   ("2 property, 1 people · 3 polished").
