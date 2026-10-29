---
target: CAS Layout rail map
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/rizi/Documents/Provident Design Studio/Provident Campaign Studio.dc.html"
target_fingerprint: "sha256:61899da639b1421b230580a881753a3207e152e8c215dcafd452508f5145fbda"
target_path: /Users/rizi/Documents/Provident Design Studio/Provident Campaign Studio.dc.html
timestamp: 2026-10-29T13-04-32Z
slug: provident-campaign-studio-dc-html
---
# Critique: CAS Layout rail map (2026-10-29)

Method: dual-agent (A: design review · B: detector)

Heuristics 24/40 (Acceptable). 1 Status 3 · 2 Real world 3 · 3 Control 2 · 4 Consistency 2 · 5 Error prevention 2 · 6 Recognition 2 · 7 Efficiency 2 · 8 Minimalist 3 · 9 Recovery 2 · 10 Help 3.

Specificity: authored (real components, real order, focused canvas's shape, no right logo target). Weakness is fidelity and invisible hit targets.

Detector: exit 2, degraded (parser modules missing, regex fallback); 1 finding, gradient-text on the hero fade preview (line ~14238), out of scope / false positive. None in §64.

## Priority issues
1. [P1] Copy bands are a destructive click under the content: the marks sit inside the band buttons, so clicking a component (even the blue selected one) runs the preset, rewriting clusters on every size via recsOf, while Logo/Align next to it are size-scoped. Fix: marks select, band edges/chips move; scope presets to a detached size; "Copy moved · Undo" toast. (harden)
2. [P1] Map misrepresents photo and scrim: flat full-strength scrim extended 47% past each band paints ~90% of a split ad navy; the remaining photo stripe sits on the Split strip and reads as a selection. Fix: scrim sized to the cluster with the variant's fade; photo thumbnail as ground; coverage %. (clarify, polish)
3. [P2] Invisible targets taught by a paragraph: empty logo corners render nothing, Split is hover-only and 17-18px tall on 1.91:1/banner maps, logo corners 14px (under 24px). Fix: ghost logo slots at rest, a drawn split seam with chip, persistent state tag, delete the note. (clarify)
4. [P2] Caption row mixes state with an icon-only Left/Center control. Fix: Align on its own row with words; caption is state only. (layout)
5. [P2] A11y: no aria-pressed on bands/Split/corners/align; corners after the bottom band in tab order; focus ring #8FB0FF 2.98:1 on dark ground, 1.10:1 on light; no live announcement. (audit, harden)

## Personas
Alex: clicking the headline mark rewrites the layout; can't move one component between bands; band click on a detached 9:16 changes all sizes. Jordan: reads the grey stripe as "selected"; never finds the empty corners or Split. Sam: no pressed state, corners last in tab order, focus ring invisible on light map.

## Minor
1:1 badge sits in the never-right corner and does nothing; splitOn unused; "Copy split" also names any hand-made mix; no QR or floating graphic on the map; selected-mark blue could read as a CTA colour; text under 11px (.mk-c 9px, .lm-sz 10px, .lm-tag 10.5px); .lb-x 22px target.
