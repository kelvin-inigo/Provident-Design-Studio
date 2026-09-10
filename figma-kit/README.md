# Provident campaign kit — Figma import

## Before importing
Install both brand fonts locally (free on Google Fonts): **Google Sans Flex** and **Source Serif 4**. Without them Figma substitutes.

## Import
Drag the SVGs straight into Figma. Everything arrives as editable frames: live text, hairlines, pills, spec ladders.

## After importing
- Glass panels import as translucent fills — re-add **Background blur 18** in Figma (SVG cannot carry backdrop blur).
- Gradient rectangles are photography stand-ins — replace with real renders, keep the Deep Navy scrim layer above.
- Componentize: select each module frame → Create component; publish as the team library.

## Variables
`provident-variables.tokens.json` is a W3C design-tokens file with four collections: **color** (brand / neutral / accent / slides / scrim / border), **typography** (families, weights, the minor-third ad scale at 1080, tracking, line heights), **spacing** (scale + canvas margins + 9:16 Instagram safe zones), **radius**. Figma has no native JSON import — bring it in with the free **Tokens Studio for Figma** plugin (or "Variables Import/Export"): open the plugin → Import → pick the JSON → push to Figma variables. Rule-bearing tokens carry their law in the description (e.g. orange = light backgrounds only).

## Suggested page structure
1. **Tokens** — colour styles (Deep Navy #1A2942, Provident Navy #2F4960, Gold #C9A96A, Brass #B0905C, Cream #F4F1EC, Mist #ECE7DF, Stone #D4CFC4, Orange #F3793C — light bg only) + type styles on the minor-third scale (24 / 28 / 35 / 41 / 50 / 59 / 71 / 85 / 103 at 1080).
2. **Modules** — the 16 components in /modules.
3. **Templates** — the layout families in /templates (1:1 and 9:16).

## Binding rules (mirror of the rule book)
Google Sans Flex everywhere; serif = one word, biggest headline only, upright. No orange on navy — gold on dark. Image ≥60% of canvas. 4% safe margin; 9:16 keeps Instagram safe zones (~250px top, ~420px bottom, right rail clear). Logo left or centre. QR small, bottom corner.