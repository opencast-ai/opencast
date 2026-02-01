# AGENTS.md — Workflow Rules (agentic SDLC v4)

Read order
1) `Conversation_Policy.md`
2) `progress_summary.md`
3) `Product_Description.md`
4) `PRD.md` + `PRD.json`
5) `WorkGraph.json` (if used)
6) `Test_Plan.md`
7) `scratchpad.md` (if interface work)
8) `SOPs/` (when stuck)

Non-negotiables
- Clarify Gate (except Confidence Bypass for Low Risk)
- Evidence gate (`passes=true` needs evidence)
- Treaty Before War: SIGN `scratchpad.md` before implement/test split
- Archive+Prune Progress.txt each slice (delta state)

Speed rules
- default: targeted test → fast suite → full suite (only when needed)
- stop fix-break-fix loops (SOP-005)

Operator owns
- scope cuts, deps, interface breaks, security posture, preset changes
