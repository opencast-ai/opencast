# Preset: System Designer / Research-Heavy

Use when you are designing a system, protocol, or architecture and want minimal coding.

Agent roster
- Sisyphus: orchestrator
- Librarian: docs/spec research (optional)
- Prometheus: architecture + interfaces + ADRs
- Oracle: critic for trade-offs, threat model, failure modes

Verification profile
- ADRs for key decisions
- Interface contracts (OpenAPI/ABI/types) with examples
- Threat model + risk register
- Minimal executable scaffolding (optional)

Defaults
- Concurrency: 1–2 tasks (avoid premature parallel build)
- Tests: minimal harness smoke tests only
