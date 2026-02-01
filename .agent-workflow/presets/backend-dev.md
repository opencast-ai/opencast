# Preset: Backend / Stateful Logic (High Discipline)

Use when you are building APIs, services, smart contracts, or anything that moves funds or mutates state.

Agent roster
- Sisyphus: orchestrator
- Implementer (backend): main coding
- Tester: unit + integration + negative cases
- Oracle: adversarial review before passes=true
- Integrator: cross-module wiring (if needed)

Verification profile
- Unit tests for pure logic
- Integration tests for boundary contracts
- Scenario/state-machine tests for cross-action flows
- Critical Gate ON by default for money/auth/state

Defaults
- Concurrency: 2–3 tasks, strict allowed_paths
- Require negative tests for every critical path
