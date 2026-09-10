# Provident Estate Design System

Provident Estate is a Dubai-based real estate brokerage (providentestate.com). CEO: Loai Al Fakir. The brand promise: "Your trusted real estate partner · Making property personal." Products span property brokerage, Provident Holiday Homes (PVH), and marketing across web, social, presentations, photography and video.

**Source**: `uploads/Latest Provident brand guideline - optimized..pdf` — "Brand Identity Guidelines 2026" (47 pp): voice, logo, colour, typography, digital/social templates, presentation system, photography and video guidelines. Page renders in `extract/`. No product codebase or Figma was provided.

## Logo
The mark is a typeset wordmark: **"provident."** in Google Sans Flex Light (~350), lowercase, 0.04em tracking, with the full stop in Signature Orange #F3793C. App icon/favicon is "p." navy on white.
- `assets/logo-navy.png` — navy wordmark + orange dot, for light backgrounds
- `assets/logo-white.png` — all-white lockup, for navy or photography (**never** the orange dot on navy)
- `assets/app-icon.png` — "p." mark
Rules: clear space = one logo height on all sides; never below 24px tall; never stretched, recoloured, or on busy backgrounds. Watermark on photography: white wordmark bottom-left, ≈30% frame width, 8% margins.

## CONTENT FUNDAMENTALS
- **Personality**: knowledgeable, human, confident, approachable. Confidence from expertise, never hype.
- **Person**: first-person plural — we, our, us — on Provident-owned channels. Speak to "you".
- **English**: predominantly British English ("colour", "personalised"), with common American terms where natural.
- **Casing**: sentence case for headings, body, buttons. Tracked UPPERCASE reserved for eyebrows/labels only. Wordmark always lowercase.
- **Contractions**: welcome (we're, you'll, don't) — used naturally.
- **Dates**: month in full where space allows — "17th June 2026"; never mix formats in one piece. **Time**: 12-hour, uppercase AM/PM — "10:00 AM". **Numbers**: zero–nine as words, 10+ as numerals.
- **Exclamation marks**: one at most, never stacked.
- **Emoji**: not part of the brand voice; none appear in the guideline outside social-platform UI.
- **Vocabulary**: Expertise · Trusted · Insight · Client-First · Tailored · Seamless · Prime · Bespoke · Capital Appreciation · Rental Yield. Phrases: "Your trusted real estate partner", "Making property personal", "From property search to ownership".
- **Never**: Distress Deals, Cheap Property, Guaranteed Returns, Risk-Free, Get Rich, No-Brainer, 100% Guaranteed. Caution (only if substantiated): Best, Number One, Iconic, Highest ROI.
- **Craft**: translate features into benefits; verify every fact (prices, handover dates, distances); SEO woven naturally; review before publishing.

## VISUAL FOUNDATIONS
- **Colour**: Deep Navy #1A2942 (primary surface + text on light), Provident Navy #2F4960 (voice), Signature Orange #F3793C (the dot), Paper #FAF8F4 (background). Extended neutrals: Cream #F4F1EC, Mist #ECE7DF, Stone #D4CFC4, Muted #6B7280, Charcoal #1A1A1A, Brass #B0905C (luxury). Presentation-only: slide navy #1A2B4A, slide cream #F2EDE3, Gold #C9A96A. Legacy teal #1C6E8C is retired.
- **The four colour laws**: 1) No orange on blue, ever — on navy the logo goes all-white. 2) White headings on navy; support copy Mist, data labels Stone. 3) Blue (Deep Navy) text on light. 4) Orange at dot scale only — ≤10% by area, 1–2% of emphasis; never text, never fills, never CTAs. "Navy dominates. Orange punctuates. Warm neutrals carry the breathing room."
- **Type**: Google Sans Flex = every headline, paragraph, button, label, form (weights 300/400/500, embedded via @font-face). Source Serif 4 = accent voice, **Light 300 italic only**, opsz 30, tracking −1.5% — pull quotes and editorial headlines only, never UI. On video: one accent word per headline; GSF Bold 700 tabular for data. Weight logic: 300 storyteller (body, large numerals), 400 structure (headings, emphasis — never bold in running text), 500 interface (buttons, labels, nav). Scale: H1 32–48/1.15/−1%, H2 28–40, H3 19/1.35, body 17/1.7 ≤68ch, stat 32–44, eyebrow 12–13 caps +14–18% tracking. Don'ts: bold in running text, Source Serif 4 in UI, upright or heavy Source Serif 4 (accent is Light Italic only), >2 type colours per block, tracking/uppercase on body.
- **Backgrounds**: flat colour, never gradients — Deep Navy, Cream, Provident Navy, or imagery. Over photography: Deep Navy gradient scrim 100%→0% bottom-to-top behind type.
- **Buttons/CTAs**: navy fill, GSF Medium 500, 16px, sentence case. Never orange.
- **Eyebrows**: GSF Medium 500, tracked caps; Brass on light, Gold on slides, from approved copy.
- **Layout**: 100px canvas margins on digital templates; 50px inner gaps; generous whitespace; one accent per frame.
- **Motion**: fades and smooth zooms only; no spins or drastic transitions. Hover states not specified — derived here as navy-shift (Deep→Provident navy) and opacity.
- **Imagery**: warm, bright, guest-ready interiors; balanced daylight; shoot the experience. Portraits: formal attire, angled torso, Provident pin left of torso, composited onto company backdrop.
- **Radii/shadows**: not specified in the guideline — soft derived values in `tokens/spacing.css`, flagged as derived.

## ICONOGRAPHY
The guideline defines **no icon system** — no icon font, no SVG set. Iconography in the wild is limited to: the orange dot as bullet marker (presentation content slides), platform-native UI (social), and QR codes (DLD permit QR, 250×250px reserved slot top-right on vertical video). Emoji are not used. For UI work here we use **Material Symbols (Outlined, weight 300)** from CDN as the nearest match to the Google Sans Flex letterform DNA — this is a substitution, flagged; replace if Provident adopts an official set. Bullet markers should be the orange dot, not glyph icons.

## Fonts
- Google Sans Flex (variable 1–1000) — `assets/fonts/GoogleSansFlex-Variable.woff2` (Google Fonts, OFL)
- Source Serif 4 (variable 200–900, + italic) — `assets/fonts/SourceSerif4-Variable.woff2`, `SourceSerif4-Italic-Variable.woff2` (substituted for the guideline's Source Serif 4 at the user's request)
Both are the genuine brand faces per the guideline, sourced from Google Fonts.

## Presentation system (from the guideline)
Four core layouts: **Title** (navy, orange rule, gold eyebrow), **Section** (cream, Source Serif 4, numbered), **Content** (white, headline + orange-dot bullets, body navy@72%, max 3 lines), **Data** (navy, gold + orange accents). One flat background colour per slide; one orange accent per slide; headline GSF Medium — cream on navy, navy on cream. See `slides/`.

## Intentional additions
- `Wordmark` component — the logo is typeset, so a live-type component guarantees fidelity at any size.
- Material Symbols CDN for UI icons (see ICONOGRAPHY — substitution).
- Derived spacing/radius/shadow/hover tokens where the guideline is print/video-focused and silent on UI specifics.

## Index
- `styles.css` → `tokens/` (fonts, colors, typography, spacing)
- `assets/` — logo PNGs, app icon, webfonts
- `guidelines/` — foundation specimen cards (colour, type, voice, logo)
- `components/` — brand/ (Wordmark), actions/ (Button, IconButton), forms/ (Input, Select, Checkbox, Radio, Switch), display/ (Card, Badge, Tag, Tabs, Stat), feedback/ (Dialog, Toast, Tooltip)
- `slides/` — the four presentation layouts as 1280×720 cards
- `ui_kits/social/` — Instagram 4:5 listing post + 9:16 story per the digital template specs
- `extract/` — rendered pages of the source PDF
- `SKILL.md` — agent skill entry point

## Caveats
- No codebase/Figma: component inventory is the standard set styled strictly to the guideline; website UI kit omitted (would be invention).
- Icons are a flagged CDN substitution.
