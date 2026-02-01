# Test Plan (agentic SDLC v4)

Goal: fast loop, real confidence.

Layers (only as needed)
1) Targeted test (the failing one)
2) Fast suite (feature-focused, 50–70% coverage)
3) Boundary/contract tests (schemas, types)
4) Integration/system tests (critical flows)
5) UI smoke (Playwright screenshot on failure)

Default loop (small bug)
- reproduce in 1 cmd
- fix
- rerun same cmd
- run fast suite (if exists)

Full suite only when
- integration boundary changed
- release/demo gate
- repeated weird failures (possible hidden coupling)

Evidence
- cmd + output (log path ok)
- UI: attach Playwright trace/screenshot when possible
