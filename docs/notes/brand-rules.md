<!-- Moved out of CLAUDE.md on 2026-11-02. Read on demand. A dated work log, oldest first:
     later sections supersede earlier ones, and SUPERSEDED notes mark what changed.
     Check the code before trusting a detail. -->

# Brand rules (binding) — campaign and organic

# Provident campaign rules (user-set, binding)

- Google Sans Flex is the ONLY font. **Headers are Regular 400** (hero, price figure, property title, agent/reviewer names). **Everything else is Light 300**, including the wordmark, hook, body, spec values and CTA labels. The single exception is **tracked caps at 500** — eyebrows and the small labels that share that role.
- **No second typeface and no highlight feature.** Source Serif 4 and the single-word serif emphasis are removed: `heroLines` emits one run, and the emphasis span renders as plain 400 copy so old sessions carrying a `serif` word still lay out correctly.
- **Gold and brass are minimised.** No gold in canvas output at all — `PAL.accent` and `PAL.ruleGold` resolve to cream on dark and slate on light, so rules, bullets and chips are neutral. Gold survives only as UI chrome: the primary action button and active states. Brass #B0905C is retired as the panel caption colour (now a neutral grey).
- Orange #F3793C never appears on navy/dark backgrounds — light backgrounds only.
- 9:16 reels/stories: campaign canvas margins in px at 1080×1920 — **left 100, top 260, right 100, bottom 460** — so platform UI never covers copy. Retraced off live Facebook Reels ads that WERE being overlapped, then confirmed by a supplied UI-mockup SVG (which puts the bottom at 466 against this 460). The like/comment/share rail is reserved separately, as **`railR: 170` on the BOTTOM CLUSTER only** — not as a margin, because the rail covers only the lower two-thirds and a margin would narrow the top cluster and shift the whole design off centre. See *The 9:16 margins ARE the Reels safe area*. 1:1 ads: 80px margin all sides.
- All ads run a full-bleed background image; modules cluster top/bottom leaving a clear image window (centre, top, or bottom).
- Logo: main "provident." wordmark only (no sub-brand lockups); placed left or centre, never right.
- QR code: small rounded-rectangle placeholder in a bottom corner — visible, never dominant.
- Kicker bars: hairline-framed or rule-flanked, never solid fills (solid reads as a CTA).
- Image-first ratio: the image always outweighs text — modules/copy cover at most ~40% of the canvas; keep only essential elements (headline, one hook/spec, CTA, logo, QR), cut the rest.
- Meta-ads type scale: minor third ×1.200 from the 2.2cqw floor — steps 2.2 · 2.6 · 3.2 · 3.8 · 4.6 · 5.5 · 6.6 · 7.9 · 9.5 cqw (≈24px floor at 1080). No off-scale sizes, nothing under the floor. Eyebrows/tags 2.2–2.6, body 2.6–3.2, hooks 3.2–3.8, headlines 5.5+.

# Organic post rules

- Feed 3:4 is 1080×1440 with 80/90px margins; story 9:16 is 1080×1920 with a 200px top margin so platform UI stays clear of the copy.
- Layouts are fixed per template — the studio exposes fields, not free positioning. Nothing should drift off the grid. **The award card insets its text column 30px INSIDE the margin (110 on the feed), and that is not a grid violation** — the rule is about content escaping the margin, and both the SVG and the finished render agree on 110. See *A FIFTH TEMPLATE*.
- Scrims cover only the text areas (plus ~20px breathing room), fading out ~60px beyond — never the whole photo. **Three kinds carry no ADJUSTABLE wash and the rail's control disappears with them** (`scrimUsed`): the paper kinds `tacover` and `tagent`, which take none at all, and `review`, whose wash is now the supplied drawing's own FIXED navy ramp — one full-canvas gradient, transparent to y 720 and solid by 1283, emitted from `REV.scrimTop` / `REV.scrimFull` so the story follows. A slider over a fixed ramp is a control with nothing to set. The `listed` card keeps one band behind its wordmark and status — it was briefly removed on the reasoning that they sat on black, but that black was a photograph a bad 4:3 crop had cut away.
- Property and weekly-listing slides require their own QR code and a listing number; export is blocked until both are present. **There is NO eleven-digit rule anywhere any more** — first the weekly property page and then the `listed` card went to numbers only, as many as the listing has, and every gate asks whether a number is there rather than how long it is. See *THE WEEKLY LISTING NUMBER HAS NO LENGTH RULE* and *SIX FIXES ON THE LISTED CARD*. On the **weekly** template the QR is 220x220 with a 6px white quiet-zone ring and 4px corners (centred above the bottom margin on the cover and closing slide, bottom right on the property page) — the `listed` card keeps `tk.qr`'s 250 at r8. The "small rounded rectangle in a bottom CORNER" line in the campaign rules is a campaign rule; organic layouts are template-owned, and these three are drawn.
- Top-agent slides need a full-bleed studio portrait each, and the blurb is capped at 40 words. **The cap's stated reason is obsolete twice over** — there is no gold ranking numeral (the brass is the place badge) and the numeral now sits BEHIND the glass panel rather than beside the blurb, so it clears nothing. Keep the number, which is a sensible panel-height rule; the justification is what has expired.
- Photos are stored at export-grade resolution (up to 2560px on the long side) so a 2160px export stays sharp; feed and story share one photo per slide.
- Exports write **flat** — one file per slide per size, told apart by a `_3x4` / `_9x16` suffix, not by folders. **The story is only included while its canvas is shown** (the Show story 9:16 toggle in the canvas bar); hidden, only `_3x4` ships. The PDF is **feed pages only**, and always has been.

## Files in this folder

| file | what it is |
|---|---|
| `Provident Campaign Studio.dc.html` | the Campaign Ad Studio |
| `Provident Organic Studio.dc.html` | the Organic Post Studio |
| `studio-base.js` | `StudioBase`, shared by both — ONE copy |
| `runtime.js` | storage stand-in, Safari fallbacks, the one image encoder |
| `image-slot.js` · `support.js` · `_ds/` · `fonts/` | shared, unchanged by the split |
| `web-image-studio.html` | the standalone website photo tool (its own app) |
| `ui-design-system/` | the chrome design system — the one place to change it |
| `.image-slots.state.json` | the photo store, shared by both studios |

Both `.dc.html` files must sit in **this folder**: every path they use is relative, and the
cross-studio hand-over navigates to the other by bare filename.

## Reference files

`reference/`, `figma-kit/`, `uploads/`, `Provident_Digital_Media_Templates.pdf` and the stale
`Provident Campaign Studio/` copy were DELETED on 2026-10-01 as no longer relevant to CAS or
OPS — nothing loaded them. They remain in git history before that commit.
