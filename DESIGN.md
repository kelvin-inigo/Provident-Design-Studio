---
name: Provident Design Studio — chrome
description: The tool interface of the Campaign Ads Studio and the Organic Post Studio, recorded from the built OPS home. Chrome only; canvas artwork is a separate system.
colors:
  app: "#131519"
  stage: "#0A0B0D"
  card: "#1D2024"
  card-h: "#252931"
  fill: "#282B31"
  fill-h: "#31353C"
  hair: "rgba(148,154,166,.16)"
  line: "rgba(148,154,166,.24)"
  ink: "#FFFFFF"
  ink-2: "#C3C8D0"
  dim: "#949AA6"
  provident-navy: "#1A2942"
  navy-lift: "#22355A"
  resting-navy: "#243352"
  link-slate: "#879CC5"
  good: "#22B457"
  warn: "#EAB308"
  bad: "#F07272"
  brand-orange: "#F3793C"
  app-light: "#FFFFFF"
  fill-light: "#EDEEF0"
  fill-h-light: "#E4E5E8"
  resting-tint-light: "#DADDE1"
  ink-light: "#0A0B0D"
  ink-2-light: "#3D434E"
  dim-light: "#5B616E"
  good-light: "#0F7A3A"
  warn-light: "#8A6206"
  bad-light: "#C81E1E"
typography:
  headline:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "clamp(24px, 2.6vw, 32px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  row-title:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
  section:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  button:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.16px"
  body:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.3
  small:
    fontFamily: "'Google Sans Flex', system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1
rounded:
  thumb-sm: "6px"
  sm: "8px"
  field: "14px"
  card: "16px"
  pill: "9999px"
spacing:
  row-gap: "10px"
  inner: "12px"
  row-pad: "14px"
  section: "28px"
  group: "32px"
components:
  button-primary:
    backgroundColor: "{colors.provident-navy}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.navy-lift}"
  button-ghost:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "36px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "36px"
  switch-track:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.pill}"
    padding: "4px"
  switch-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  switch-tab-on:
    backgroundColor: "{colors.resting-navy}"
    textColor: "{colors.ink}"
  queue-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 14px 12px 12px"
  queue-row-mine:
    padding: "14px 16px 14px 14px"
  count-chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  quiet-panel:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.card}"
    padding: "20px 22px"
  text-area:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  outline-pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "36px"
---

# Design System: Provident Design Studio — chrome

> **Scope.** This file records the **chrome**: the tool's own interface in the studios, recorded from the built OPS home (`post-flow.js`, Home and Start a post, hosted in `Provident Organic Studio.dc.html`). Every value comes from the `--ps-*` tokens in `ui-design-system/provident-ui.css`, which is upstream of all of it. **The canvas artwork is a separate system** (`CampaignStudio.PAL`, `OrganicStudio.ART`). It keeps literal brand values, never reads a `--ps-*` token, and is deliberately left out of this file. Never put a chrome token into an artwork op, and never use an artwork colour (cream, brass, the black canvas ground) in the chrome.

## Overview

**Creative North Star: "The Quiet Desk"**

The chrome is a working desk set back from the work. It is neutral grey in dark mode (the default) and plain white in light. Provident Navy runs through it as one family of tints. The only pictures are the posts' own 3:4 renders. The room stays neutral because the studio's job is judging colour on a canvas, so the chrome never competes with it. The home screen follows one rule: one decision at a time. It shows the posts that wait on you or a new post, behind one pill switch, and never stacks a form, a gallery and a list on one page.

Density is moderate. The rows are full width, with a render, a name, a step line, and one action at the row's end. Hierarchy comes from weight (500 for names, 600 for headings and buttons, 400 for everything else) and from three ink tiers (ink, ink-2, dim). Size does very little of the work. Nothing is bold and nothing is uppercase. Copy is sentence case and plain ("Waiting on you", "You're clear", "Send to copy check").

**Key Characteristics:**
- Neutral grey ground in dark mode and white in light. Navy is never the ground.
- One solid navy action per row. Choices sit on a quiet resting tint.
- Rings, not shadows. A card is a fill plus a 1px inset hairline.
- The four workflow steps show as small segments coloured link, warn and good.
- Google Sans Flex only, with the hierarchy carried by weight and ink tier.
- Motion is short and ease-out, and the reduced-motion setting turns it off.

## Colors

The palette is neutral grey surfaces with a single navy family. Status colours appear only as small marks, never as large fills.

### Primary
- **Provident Navy** (`provident-navy`): the fill of the one primary action (Send to copy check, Start the design, Sign in) in both themes, with white ink. On hover it lifts to **Navy Lift** in dark (`navy-lift`) and darkens to Shade 20 in light.
- **Resting Navy** (`resting-navy`; light `resting-tint-light`, which is Tint 16 of the navy ramp): the chosen half of a switch, the focused step's number disc, and a hot count in the sidebar. It is calmer than the action, so a selected tab never reads as a button to press.
- **Link Slate** (`link-slate`; in light it is the navy itself): marks only. These are text links (Refresh, Open Status), the current step segment, and the focus ring's light-on-dark counterpart.

### Neutral
- **Desk Grey** (`app`): the page ground. **Stage Black** (`stage`) sits behind canvases.
- **Card** (`card`, hover `card-h`): queue rows and detail cards. In light both are white, separated by their hairline ring.
- **Fill / Fill Lift** (`fill`, `fill-h`): switch tracks, quiet panels (You're clear, empty states), the brief field, count chips and thumbnail wells.
- **Hairline / Line** (`hair`, `line`): a row's resting ring and its hover ring. Also step-segment tracks and the name field's underline.
- **Ink, Ink 2, Dim** (`ink`, `ink-2`, `dim`): names and current values, then supporting lines, then timestamps, placeholders and the "Updated…" meta.

### Status (marks only)
- **Good** (`good`): done segments, Ready, and the You're clear disc.
- **Warn** (`warn`): a due date within a day (the dot only, while the text stays ink), and the current segment during copy check.
- **Bad** (`bad`): an overdue date, as text and dot.
- **Brand Orange** (`brand-orange`): the wordmark's period. It is punctuation and never a fill on dark.

### Named Rules
**The One Loud Thing Rule.** Each row has at most one solid navy button, and it is the step that moves the post on. Open, Refresh and every secondary action are quiet: ghost, outline or text link.

**The Rest Is Not Action Rule.** A selected state uses the resting tint (`resting-navy`). The solid navy is reserved for doing something. When the two are mixed, the screen loses its one call to action.

**The Two Systems Rule.** Chrome tokens never reach the artwork, and artwork colours never reach the chrome. Merging the two once leaked the UI's blue into finished posts.

## Typography

**Font:** Google Sans Flex (with `system-ui, sans-serif`). It is the only face. Readex Pro serves Arabic, on the canvas only.

**Character:** a single variable sans. Weight steps of 400, 500 and 600 and the three ink tiers do the work that a second typeface would otherwise do.

### Hierarchy
- **Headline** (500, clamp(24px, 2.6vw, 32px), 1.2, -0.01em): the new post's name, typed in place as the page's headline.
- **Title** (500, 18px, 1.3): the name on a row that waits on you. Rows waiting on others drop to **Row title** (500, 15px).
- **Section** (600, 14px, 1.3): group headings ("Waiting on you", "With others", "Ready to publish") and step headings. Groups waiting on others take ink-2.
- **Button** (600, 14px, +0.16px): every labelled action and switch tab.
- **Body** (400, 15px, 1.5): the brief and panel copy. Helper prose is 14px at 1.5 with a maximum width of 62ch.
- **Meta** (400, 13px, 1.3, ink-2): step lines ("From Sara Social · 17 min ago"). The step's own name ("Design", "Draft") is 500 in ink.
- **Small** (400, 12.5px, dim): the Drive status line, the "Optional" tag and file chips. Counts use tabular figures.

### Named Rules
**The No Uppercase Rule.** The chrome has no all-caps text and no tracked kickers. Tracked caps belong to the artwork.

**The Weight-Not-Size Rule.** To raise something in the hierarchy, step its weight or its ink tier. Do not add a new size.

## Layout

The home page is one column inside the project browser's main pane, beside the studio's sidebar. The page is a container (`container-type: inline-size`), so rows reflow on the column's own width, not the window's. From top to bottom:

1. The greeting and count.
2. The switch row: the My turn | Start a post switch on the left, and the Drive status with Refresh and Open Status on the right, 28px below.
3. Groups 32px apart, each a heading 12px above a list.
4. Rows 10px apart.

A row is a four-column grid: thumbnail, text, due date, actions, with a 20px column gap. The thumbnail is 48px wide at 3:4, or 72px for a row that waits on you. Recent projects sit at the foot under a hairline, as a strip of 140px items with 72px renders.

Start a post is a numbered list with a maximum width of 760px. Each step is a 32px disc, an 18px gap, then the body. A 1px line joins the discs. The template grid below it is indented by 50px to align with the step bodies.

Below 760px of container width, a row stacks: thumbnail and text on top, the due date under the text, and the actions full width. The primary button stretches to fill. On a phone the sidebar becomes a chip header, and the switch keeps its place under the greeting.

## Elevation & Depth

The chrome is flat: `--ps-shadow` is `none`. Depth comes from tonal steps (app, then card, then fill, then fill-h) and from inset rings. A ring has zero offset and zero blur, so it is a boundary, not a shadow.

### Ring Vocabulary
- **Resting ring** (`box-shadow: inset 0 0 0 1px var(--ps-hair)`): every card and row.
- **Hover ring** (`box-shadow: inset 0 0 0 1px var(--ps-line)`): the hover state of a row or card.
- **Outline pill** (`box-shadow: inset 0 0 0 1px var(--ps-line)`): the Due date pill and Attach files. On focus it becomes `var(--ps-ink)`.
- **Focus** (`outline: 2px solid var(--ps-ink); outline-offset: 2px`): uses the foreground colour, so it inverts with the theme.

### Named Rules
**The Ring-Not-Shadow Rule.** If a box shadow has an offset or a blur, it does not belong in the chrome.

## Shapes

Labelled actions and switches are full pills (9999px). Cards, rows and quiet panels are softly rounded (16px). The brief field is 14px. Thumbnails are 6px at 48px and 8px at 72px, small enough that the render still reads as a post. Dots and number discs are circles. Step segments are 14 x 4px capsules with a 3px gap.

## Components

### Buttons
Buttons are pill-shaped and come in three weights. The **primary** is Provident Navy with white ink, 36px tall, 10px 16px padding, 14/600. Its hover lifts the navy. The primary has no stroke. The **ghost** is a fill-tinted pill that becomes fill-h on hover. **Open** on a row is a quiet ghost: transparent, ink-2, and it fills on hover. **Text links** (Refresh, Open Status, "All N on Status") use link slate. Every button shows focus with the ink outline.

### Home switch
The switch is a single fill-coloured pill track with 4px padding and two 40px tabs. The chosen tab takes the resting navy. The other tab is ink-2 and fills on hover. It is a tablist, and arrow keys move between the tabs. A count shows as a 22px navy chip inside the tab, and the chip inverts on the chosen tab.

### Queue row (signature)
A queue row is one post's next step. From left to right:
- the post's real render as the thumbnail, which also opens the post;
- the name;
- a step line of four segments, the step's name, and then who it is from and when;
- the due date, with a status dot that turns warn within a day and bad when overdue;
- at most one primary step button, then Open.

Rows that wait on you are larger (72px render, 18px name). When a step is sent, the row fades and slides 28px right.

### Step segments
There are four 14 x 4px capsules: Draft, Design, Copy check, Ready. A done step is good, the current step is link (warn during copy check), and a step to come is line. Ready shows all four as good. Status's columns use the same dot colours.

### Quiet panels
These hold You're clear, the empty states and sign-in. Each is a fill panel at 16px radius, 20–28px padding, a 17/500 line over 14px ink-2 copy, and an optional single action. You're clear leads with a 28px good disc that holds a tick in the ground colour.

### Inputs / Fields
- **Name:** a bare headline-sized input on a 1px line underline. The underline turns ink on focus.
- **Brief:** a fill-coloured textarea, 14px radius, 15/1.5. Focus uses the ink outline.
- **Due date:** an outline pill containing a calendar icon, the word "Due" and a native date input.
- **Attached files:** fill-coloured chips, each with a round × button.
- **Number disc:** the step number's disc takes the resting navy while its step has focus.

### Navigation
The sidebar, top bar and studio switcher come from the shared chrome and are unchanged by this surface. A sidebar row's active state is the resting tint, and a hot count is a resting-navy chip.

## Do's and Don'ts

### Do:
- **Do** use `var(--ps-*)` tokens for every chrome colour, radius and motion value, and take them from `ui-design-system/provident-ui.css`.
- **Do** give each row at most one Provident Navy primary (`provident-navy`). Make everything else ghost, outline or a text link.
- **Do** show a selected state with the resting tint (`resting-navy` dark, `resting-tint-light` light), not the solid navy.
- **Do** separate surfaces with fills and 1px inset rings (`hair` at rest, `line` on hover).
- **Do** use the posts' own 3:4 renders as the only imagery, at 48 or 72px wide.
- **Do** use status colours only as marks: segments, dots, a 28px disc.
- **Do** time motion at about 150ms on `cubic-bezier(0.2,0,0,1)` for state changes, and turn every entrance and slide off under `prefers-reduced-motion`.
- **Do** read a quiet ink against the surface it sits on. An ink that passes on the page can fail on a fill or a resting tint.

### Don't:
- **Don't** fold the canvas palette (`CampaignStudio.PAL`, `OrganicStudio.ART`) into the chrome, or put a chrome token into an artwork op.
- **Don't** use drop shadows or offset elevation in the chrome.
- **Don't** set uppercase or tracked kickers in the chrome.
- **Don't** fill a large area with brand orange (`brand-orange`) on dark. It is the wordmark's period.
- **Don't** make the ground navy. Dark mode is neutral grey.
- **Don't** stack the queue, the new-post form and a gallery on one screen. Home shows one door at a time.
- **Don't** express quietness with `opacity` on text, because it does not survive a theme flip. Use the ink-2 or dim token.
