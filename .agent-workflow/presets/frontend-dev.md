# Preset: Frontend / UX

Use when you are building UI components, UX polish, or dashboard-style features.

Agent roster
- Sisyphus: orchestrator
- Frontend implementer: UI code + styling
- Tester: UI smoke/E2E (minimal but deterministic)
- Oracle: review auth/session handling, data validation

Verification profile
- Component/unit tests where cheap
- E2E smoke tests for critical flows
- Visual regression optional (if available)

Defaults
- Concurrency: 2 tasks max (UI merge conflicts are common)
- Interfaces: pin API response types early; mock adapters
