---
target: live Tracker (office server)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "url:https://design-studio.ngrok-free.dev/index.html"
timestamp: 2026-11-25T07-25-19Z
slug: design-studio-ngrok-free-dev-index-html
---
Method: dual-agent (A: design review · B: detector + browser). Target: live Tracker on the office server, Progress and Kanban (Board, List), dark theme, 2560px viewport, real data (23 rows: 18 campaigns, 5 posts). No narrow pass (resizing the user's real Chrome was avoided; phone CSS read instead).

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Cells clear; freshness only in a small footer |
| 2 | Match System / Real World | 2 | One state, three names: Signed off / Ready to run / Ready |
| 3 | User Control and Freedom | 3 | Removable chips, state carries across views |
| 4 | Consistency and Standards | 2 | Filter › Due › Overdue (3) lists signed-off rows that say "Deadline" (FV.due uses dueK, not isLate) |
| 5 | Error Prevention | 3 | Read-only view |
| 6 | Recognition Rather Than Recall | 2 | Progress rows carry no "Waits on you"; Kanban does |
| 7 | Flexibility and Efficiency | 3 | Rich filters; Progress has no sort |
| 8 | Aesthetic and Minimalist Design | 2 | Done cells loudest (green fill+border), Missing quiet hatch |
| 9 | Error Recovery | 2 | "n deliverables missing" with no route to resolve or mark not needed |
| 10 | Help and Documentation | 2 | Tooltips only; ring and hatching unexplained |
| Total | | 24/40 | Acceptable |

Priority issues:
1. [P1] Overdue facet contradicts the rows (FV.due = dueK). Fix: due facet reads isLate; signed-off past-deadline gets its own bucket or none.
2. [P1] Progress opens on finished work (sort: due then newest; first 3 rows are signed-off Oct/Nov deadlines; the one row waiting on the viewer is row 8). Fix: attention order — waits on me, overdue, in progress, signed off with gaps, done; mark mine rows.
3. [P1] One state, three names (Signed off / Ready to run / Ready). Fix: one word; "Ready to run" only when every deliverable is in.
4. [P2] Visual weight inverted: Done green fill/border at 4.50:1 vs quiet Missing hatch. Fix: quiet Done, weighted Missing.
5. [P2] Kanban List drops "n deliverables missing" (.lr has no .cd-ms).
6. [P3] Organic posts ~2,500px down under 18 campaign rows.

Detector: index.html 44 (regex mode, parser deps missing); only real rule hit is .sky-sun layout transition (Home). Tracker token drift: radii 9/3/12px, 10.5px avatar initials. Browser overlay ran: Progress 23 (17 nested-cards on .tk-c chips FP, stripes FP, skipped-heading FP (aria-level 2 divs)); real: Engine nav badge .eg-nb 2.86:1 (global chrome), 10.5px initials. Measurements: Progress 4110px tall, first row y=337 under 20 controls; Kanban first card y=369 under 26, Ready column 2626px vs Design 5 / Copy 3. Targets <24px: Refresh 47x16, wordmark, search input (wrapper 36px). No row text fails AA.

Personas: PM — no "ready to download" signal or filter on the Tracker. Designer — waits-on-me row unmarked in Progress; Overdue filter points at signed-off work; 15 of 18 undated. Alex — no Progress sort, 22 tab stops before first row. Sam — Done cell at exactly 4.50:1, 11–11.5px Light 300 labels, "n of N shown" not live.
