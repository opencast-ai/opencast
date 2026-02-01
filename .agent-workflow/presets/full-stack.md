# Preset: Full-Stack (Default)

Use when you are shipping vertical slices end-to-end (FE + BE + infra) with moderate risk.

Agent roster (conceptual)
- Sisyphus (orchestrator): strongest reasoning model you have
- Prometheus (planner/architect): strong reasoning + big context
- Implementer: balanced coding model
- Tester: strong at deterministic/unit/integration tests
- Integrator: strong reasoning across modules
- Oracle (adversarial): independent reviewer before passes=true on risky changes
- Retrospective: batch-efficiency analysis after milestones

Verification profile
- Unit tests for core logic
- One integration/scenario test per slice
- Critical Gate enabled for auth/money/state changes
- Evidence recorded in Progress logs

Defaults
- Concurrency: 2–3 tasks max
- Interfaces: freeze only what the slice needs (Slice Lock)
