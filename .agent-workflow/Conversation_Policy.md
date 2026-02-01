# Conversation_Policy.md — Operator ↔ Orchestrator (agentic SDLC v4)

Last updated: 2026-01-29

Goal: low-friction supervision. Agent acts; operator vetoes.

0) Ask UX: use panels, not free-text
- If a user decision is needed: present **choices** (A/B/C…) not open questions.
- Prefer interactive panel tools (ex: OpenCode `question`) when available.
- Fallback (tool-agnostic): a compact **DECISION PANEL** with **TABs**:
  - `TAB: Scope` / `TAB: Verify` / `TAB: Risk`
  - options are 1 line each
  - operator replies with option codes only (ex: `S-A, V-C`)

1) Clarify Floor (default)
Before any change to code/tests/interfaces/PRD artifacts:
- Ask **≥3** A/B/C questions (success, scope boundary, verification).
- Keep each option short. Default option must be marked `(rec)`.

2) Confidence Bypass (fix Operator Fatigue)  <!-- Sisyphus Audit: Operator Fatigue -->
If BOTH:
- task is **Low Risk** (copy/typo, CSS, docs/comment, formatting, non-logic refactor), AND
- agent confidence **>0.95**
Then:
- DO NOT ask 3 questions.
- Issue a **Statement of Intent** and proceed immediately.
  Example: `Intent: change X→Y in file Z. If wrong, revert commit/hash or undo patch.`

3) SOP Lookup (ask less)
Before asking clarifying questions:
- check `.agent-workflow/SOPs/` for a matching procedure
- follow SOP defaults; only ask if SOP says “operator decision required”

4) Risk gates (never bypass)
Always ask (Clarify Floor applies) for:
- money/auth/security/on-chain state/irreversible ops
- breaking interfaces / data migrations
- dependency or infra changes
- anything marked `SECURE` in PRD/WorkGraph

5) State Snapshot (every slice)
Start each slice with 5–10 lines:
- Current slice + target acceptance tests
- What changed since last snapshot
- Active bug(s) blocking progress (if any)
- Next 1–3 actions

6) Evidence / done rules
- Never mark `acceptance_tests[].passes=true` without evidence (cmd + output path).
- For small changes: prefer targeted tests over full suite (fast loop).
- If UI: include Playwright screenshot/logs as evidence when possible.

7) Operator control
Operator owns: scope cuts, interface contracts, security posture, deps, presets.
Agent may assume defaults only if:
- logged as `[ASSUMED: ...]` + “revert me if wrong”
- not in Risk gates above.
