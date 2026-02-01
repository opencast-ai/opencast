# presets/spike.md — Spike Mode (agentic SDLC v4)  <!-- Sisyphus Audit: Rigidity -->

Purpose: prototype fast, accept mess, then formalize.

Overrides
- Clarify Gate: DISABLED (0 questions)
- Evidence Gate: RELAXED (console logs/screenshots ok; deterministic tests optional)
- Primary artifact: `goal.txt` (not PRD.json)

Rules
- still obey `allowed_paths`
- do NOT touch SECURE/money/auth/on-chain semantics in spike mode

Completion trigger
- on finish: auto-invoke Retrospective Agent
  → convert goal → Spec/PRD + acceptance tests + WorkGraph tasks
