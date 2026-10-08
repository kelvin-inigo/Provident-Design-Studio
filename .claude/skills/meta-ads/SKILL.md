---
name: meta-ads
description: Meta Ads for Provident — read-only performance reports (daily check, bleeders, winners, fatigue, budget) through the vendored meta-ads-kit, writing Meta ad text into a CAS project, and turning a CAS export into a validated PAUSED-only upload plan. Use when the user asks how their Meta ads are doing, wants ad copy for a CAS campaign, or wants to send a CAS export to Meta.
---

# Meta Ads (tools/meta-ads)

Everything lives in `tools/meta-ads/` — read its `README.md` first. `kit/` is
TheMattBerman/meta-ads-kit (vendored); `cas-to-meta.py` is the CAS bridge.

## Rules that do not bend

- **Never ask for, print, store or pass an access token.** Credentials are in
  `tools/meta-ads/kit/.env`, which the user edits themselves. If it is missing, say so and stop.
- **Never upload, create, pause, resume or change a budget yourself.** The bridge only prepares;
  a person runs the generated `*.commands.sh` with `META_KIT_MODE=live-approved` and
  `META_KIT_APPROVAL_ID`. Do not set those variables, and do not run the script.
- Everything created is PAUSED. Activation happens in Ads Manager.

## Reports

`cd tools/meta-ads/kit && ./run.sh daily-check` (or `bleeders`, `winners`, `fatigue`,
`efficiency`, `recommend`, `pacing`). `doctor` says whether it is in mock mode — say so if the
numbers are sample data. Interpret with `kit/skills/meta-ads/SKILL.md` and
`kit/skills/ad-creative-monitor`, `kit/skills/budget-optimizer`.

## Copy for a CAS campaign

Write it the way `kit/skills/ad-copy-generator/SKILL.md` describes (look at the exported feed
image), within Meta's limits: primary text 125 shown / 500 max, headline 40, description 30,
up to 5 each, none repeated. Provident's brand copy rules (CLAUDE.md) win over the kit's.
Put it into the project with the Studio MCP (`studio_edit`, op `meta_text`:
`bodies`, `headlines`, `descriptions`, `cta`, `link`) or tell the user to paste it into
CAS → Publish tab → Meta ad text.

## CAS export → Meta

1. The project must be on the Meta platform with Meta ad text written; export JPEG/PNG into the
   source folder (it then holds `<name>_Meta upload.json`).
2. `python3 tools/meta-ads/cas-to-meta.py "<source folder>"` — report its FIX lines verbatim.
3. When it says Ready, show the user `Meta upload/plan.json` and the commands file, and tell
   them the one command they run after approval (from the README). Stop there.
