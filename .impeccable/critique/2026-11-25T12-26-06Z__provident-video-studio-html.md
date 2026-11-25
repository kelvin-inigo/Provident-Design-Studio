---
target: CASV UI
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/rizi/Documents/Provident Design Studio/.claude/worktrees/video-studio/Provident Video Studio.html"
target_fingerprint: "sha256:9353ac97797f7a0321263feed7f95e3bd950320d50ba89c0b34dcabe06a538f2"
target_path: /Users/rizi/Documents/Provident Design Studio/.claude/worktrees/video-studio/Provident Video Studio.html
timestamp: 2026-11-25T12-26-06Z
slug: provident-video-studio-html
---
Method: dual-agent (A: design review · B: detector, browser evidence and technical audit)

# CASV critique and audit (2026-11-25)

Verdict: brand-specific tool; the right panel has become a manual (a note on almost every control).

Design health 27/40: status 3, real world 3, control 3, consistency 2, error prevention 4, recognition 3, flexibility 3, minimalism 1, error recovery 3, help 2.
Technical audit 13/20: accessibility 2, performance 3, responsive 2, theming 3, implementation 3.
Detector: 34 findings (24 radius, 3 font-size, 6 colour, 1 marquee; about a third false positives; regex fallback).

Priority issues
1. P1 Animate this photo swamps the photo inspector (animHtml, promptBox): 38 controls, 5 notes. Show Camera move, Duration, Generate; rest under More options; 5 moves + More moves.
2. P1 About 40 .vs-note paragraphs; keep cost/consequence notes only, rest to tooltips.
3. P1 Sticky Duplicate/Delete footer (.vs-foot, #iDup, #iDel) covers rows and repeats the toolbar: delete.
4. P1 Timeline not keyboard reachable (.vs-it, .vs-hd); 7 unlabelled fields (f() helper emits label without for).
5. P2 Queue shows other videos' jobs, hash names, stalled jobs (queueHtml).
6. P2 Phone: .vs-time runs under #mkBtn; #mseg off-screen; #sendBtn unlabelled; #fileName clipped.
7. P2 Graphics tab lists photos (libAll('graphics')).

Remove or collapse
- Delete: inspector footer; Animate Aspect ratio row; three Animate notes; End card Position seg; prototype chip and repeated Reel meta.
- Merge: Extend photo with Animate Extend to 9:16; Audio "Or make one" with Queue's Voiceover/Music (rename Queue to Generate); From Higgsfield into the drop zone.
- Collapse: Captions fine controls; Speed Fit to exactly + Option hint; Apply to all into a menu; library chips/view/folders until ~8 files; Markers Cut at markers paragraph; Brand/Text/Graphic notes to tooltips.

Smaller: .p-in edge 1.29:1 (kit-level); targets under 24px (.vs-st, .vs-mo 22px); text 10-10.5px; theme ignores prefers-color-scheme; no main/headings; tabs lack roving focus.
Not tested: screen reader, 200% zoom, dialog focus trapping; video and audio inspectors reviewed from code only.
