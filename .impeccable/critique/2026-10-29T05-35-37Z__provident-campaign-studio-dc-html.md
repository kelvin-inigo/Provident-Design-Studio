---
target: the CAS flow
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/rizi/Documents/Provident Design Studio/Provident Campaign Studio.dc.html"
target_fingerprint: "sha256:c33126defae315b28246f6be9609905713d0a22b6df4a5087c32f627df57b821"
target_path: /Users/rizi/Documents/Provident Design Studio/Provident Campaign Studio.dc.html
timestamp: 2026-10-29T05-35-37Z
slug: provident-campaign-studio-dc-html
---
# CAS flow critique — 24/40

Heuristics: 1 status 3 · 2 real world 3 · 3 control 2 · 4 consistency 2 · 5 error prevention 2 · 6 recognition 3 · 7 efficiency 1 · 8 minimalist 3 · 9 error recovery 2 · 10 help 3.

Priority issues:
- P0 Start is blocked without a Drive /folders/ link; no way into the editor; error shown in the footer, not under the field.
- P1 Provident|Unbranded switch (.p-lkseg) overlaps the dock row at 1440 (clipped "Unb"), hidden at 1280, and covers the Portrait 3:4 size-row label.
- P1 No keyboard path: canvas components not focusable, no Cmd+Z/Cmd+S/Delete/nudge (0 metaKey/ctrlKey handlers in CAS, studio-base, share-link).
- P2 Stale copy: Ad set tab says "Campaigns start from New campaign on the home page" (share-link.js:2015; button removed); "Set up ad set" beside "Ad sets"; Share only exports; Share's campaign name not carried from Home.
- P2 At 1280 the stage is 380px; canvas bar truncates; floating component control (compact) runs 57px into the component rail.
- P3 10px "in use" and ratio chips under the 11px floor; icon-only size-row buttons have title but no aria-label; deadline date input unlabelled; window.confirm() for Send to copy check.
