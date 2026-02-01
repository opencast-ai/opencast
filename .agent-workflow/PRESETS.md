# PRESETS.md — Presets (agentic SDLC v4)

Pick 1 preset per slice (default: keep same until you change).

Presets live in `presets/`.

Quick pick (panel)
TAB: Output
A Spec/design
B Backend/module
C Frontend/UI
D Full-stack
E Spike (messy, fast)

TAB: Risk
A High (money/auth/state)
B Medium
C Low

Mapping
- A+B → `presets/system-designer.md`
- B+* → `presets/backend-dev.md`
- C+* → `presets/frontend-dev.md`
- D+* → `presets/full-stack.md`
- E+* → `presets/spike.md`  (Clarify=OFF, Evidence=RELAXED, goal.txt)

Rule
- Spike must end with Retrospective Agent → formal PRD/WorkGraph.
