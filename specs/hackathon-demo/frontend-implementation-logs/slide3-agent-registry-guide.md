# Slide 3: Agent Registry Guide (Config Route) - Implementation Log

## Overview
Replace old config page with actionable guide for agent onboarding and claim flow.

## Checklist Items

### [ ] Replace `apps/web/src/pages/ConfigPage.tsx` content
**Status:** In Progress

New content:
- Agent Registry Guide page
- Keep route path `#/config` for compatibility

### [ ] Include required informational block
**Status:** Pending

- "Send Your AI Agent: Read `BASE_URL/skill.md` and follow the instructions to join MoltMarket"

### [ ] Include registry guide sections
**Status:** Pending

- Register agent (`POST /agents/register`) quick action
- Display/copy returned `agentId`, `apiKey`, `claimUrl`
- Explain shared trader account model (human+agent credentials)

### [ ] Include claim guide section
**Status:** Pending

- Linking to `#/claim/:token` flow

### [ ] Remove admin controls
**Status:** Pending

- No admin token inputs/buttons in UI

## Design Notes

Terminal theme preserved:
- Code blocks with monospace font
- Copy-to-clipboard functionality
- Clear section headers
