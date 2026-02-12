# Hackathon Demo Frontend Tasks

## Scope and Delivery Rules

- Base implementation on current frontend under `apps/web/src`.
- Keep current UI style/quality bar (same as POC).
- Primary objective: align frontend API calls and UX with `apps/api/API_GUIDE.md` and new backend auth/account model.
- Keep X OAuth codepath hidden (not exposed in UI), not fully removed.
- Reuse `#/config` route but replace content with Agent Registry Guide + Claim guidance.
- No admin UI features in hackathon demo (admin uses APIs directly).
- **Definition of done for every slide:**
  - All checklist items completed.
  - Frontend typecheck passes (`pnpm --filter @molt/web typecheck`).
  - Frontend build passes (`pnpm --filter @molt/web build`).
  - Updated UI flows manually validated end-to-end against backend API.

## Slide 1: Session/Auth Foundation (Web3 + Wagmi) ✅ COMPLETE

Goal: replace visible X OAuth login UX with Web3 signing UX using Wagmi.

### Checklist
- [x] Add Wagmi dependencies/config for wallet connect + sign message flow.
- [x] Implement shared wallet auth helper flow:
  - [x] `POST /auth/web3/nonce`
  - [x] wallet sign using Wagmi
  - [x] `POST /auth/web3/verify`
- [x] Update `apps/web/src/state/session.tsx`:
  - [x] add wallet-based login methods.
  - [x] store `walletAddress` in session/localStorage.
  - [x] keep `apiKey`, `userId`, `agentId`, `accountType`, `adminToken` support.
- [x] Keep X OAuth methods hidden from UI (no button/path exposure), but do not hard-delete code path.
- [x] Remove reliance on `#/auth-callback` in active login flow.

### UI Validation (Agent Browser) - Moved to Slide 2
Note: UI validation requires LoginPage updates from Slide 2. Slide 1 provides the foundation.

### Done Gate
- [x] Slide checks pass.
- [x] `pnpm --filter @molt/web typecheck` passes.
- [x] `pnpm --filter @molt/web build` passes.

## Slide 2: Login and Header Navigation ✅ COMPLETE

Goal: update login UI and top nav to reflect wallet auth + new guide-focused flow.

### Checklist
- [x] Update `apps/web/src/pages/LoginPage.tsx`:
  - [x] remove visible X OAuth login CTA.
  - [x] add wallet connect/sign CTA and states (connect/signing/success/error).
  - [x] keep "register agent" shortcut if useful for operator flow.
- [x] Update `apps/web/src/components/TerminalHeader.tsx`:
  - [x] retain `#/config` nav target but relabel context to agent registry/guide intent.
  - [x] avoid showing X-specific identity affordances in primary UX.
- [x] Update `apps/web/src/router.tsx` and `apps/web/src/App.tsx`:
  - [x] keep route compatibility; ensure no dead-end auth-callback dependency in normal flow.

### UI Validation (Agent Browser)
- [x] Unauthenticated user can reach wallet login and authenticate.
- [x] Authenticated user identity chip/header renders correctly from wallet-auth session.
- [x] No visible X OAuth entrypoint in primary demo navigation.

### Done Gate
- [x] Slide checks pass.
- [x] Typecheck + build pass.

**Screenshot:** See `frontend-implementation-logs/slide2-login-page-unauthenticated.png`

## Slide 3: Config Route Replacement -> Agent Registry Guide

Goal: replace old config page with actionable guide for agent onboarding and claim flow.

### Checklist
- [ ] Replace `apps/web/src/pages/ConfigPage.tsx` content entirely with Agent Registry Guide page.
- [ ] Keep route path `#/config` for compatibility.
- [ ] Include required informational block:
  - [ ] "Send Your AI Agent: Read `BASE_URL/skill.md` and follow the instructions to join MoltMarket"
- [ ] Include registry guide sections:
  - [ ] Register agent (`POST /agents/register`) quick action.
  - [ ] Display/copy returned `agentId`, `apiKey`, `claimUrl`.
  - [ ] Explain shared trader account model (human+agent credentials).
- [ ] Include claim guide section linking to `#/claim/:token` flow.
- [ ] Remove admin controls from page (no admin token inputs/buttons in UI).

### UI Validation (Agent Browser)
- [ ] Agent registration from guide page works and shows returned credentials.
- [ ] Skill link/instruction is clearly visible and copyable.
- [ ] No admin operation UI rendered on this page.

### Done Gate
- [ ] Slide checks pass.
- [ ] Typecheck + build pass.

## Slide 4: Wallet-Based Claim Page

Goal: migrate claim UX from tweet proof to wallet signature flow.

### Checklist
- [ ] Rewrite `apps/web/src/pages/ClaimPage.tsx` to wallet flow:
  - [ ] load agent claim context via `GET /claim/:token`.
  - [ ] request nonce via `POST /claim/:token/nonce`.
  - [ ] sign message via Wagmi.
  - [ ] verify via `POST /claim/:token/verify`.
- [ ] Replace tweet-specific copy, input fields, and intent links with wallet claim UX.
- [ ] Handle claimed/already-claimed/error states based on backend responses (`409`, etc.).
- [ ] Ensure success state clearly confirms ownership link.

### UI Validation (Agent Browser)
- [ ] Unclaimed token -> successful wallet claim end-to-end.
- [ ] Already-claimed token -> conflict state handled cleanly.
- [ ] Invalid token -> error state handled cleanly.

### Done Gate
- [ ] Slide checks pass.
- [ ] Typecheck + build pass.

## Slide 5: API Contract Alignment (All Existing Pages)

Goal: ensure all active API calls and frontend types match new backend responses.

### Checklist
- [ ] Update `apps/web/src/types.ts` for current API contracts:
  - [ ] add Web3 auth response types.
  - [ ] add claim nonce/verify response types.
  - [ ] include `totalEquityCoin` in `PortfolioResponse`.
- [ ] Update pages/hooks consuming portfolio to use/display `totalEquityCoin` where appropriate.
- [ ] Update trade UI to remove admin settlement actions:
  - [ ] remove `/admin/resolve` buttons from `TradeTicket` (no admin UI in demo).
- [ ] Ensure docs pages match new API set:
  - [ ] `apps/web/src/pages/ApiPage.tsx`
  - [ ] `apps/web/src/pages/DocsPage.tsx`
  - [ ] `apps/web/src/pages/LandingPage.tsx` (where API snippets are shown)
- [ ] Keep market browsing/trading UX intact while using updated auth/session behavior.

### UI Validation (Agent Browser)
- [ ] Dashboard + market trade + portfolio flows work with wallet-auth or claimed-agent keys.
- [ ] No stale references to tweet claim flow in active UX.
- [ ] No stale references to visible X OAuth in active UX.
- [ ] No stale references to admin UI actions.

### Done Gate
- [ ] Slide checks pass.
- [ ] Typecheck + build pass.

## Cross-Slide Validation (must remain green)

### UX Flows
- [ ] Flow A: Human wallet login -> register agent -> open claim link -> claim with wallet.
- [ ] Flow B: Use agent key in session -> place trade -> verify same account view consistency.
- [ ] Flow C: Open API guide and follow `skill.md` instruction path end-to-end.

### Frontend Quality Gates
- [ ] `pnpm --filter @molt/web typecheck`
- [ ] `pnpm --filter @molt/web build`
- [ ] Manual smoke on responsive breakpoints (desktop + mobile).

### Docs/UI Consistency
- [ ] UI text and docs match `apps/api/API_GUIDE.md` terminology.
- [ ] Agent registry guide explicitly references `BASE_URL/skill.md`.
- [ ] Removed/hidden features are not discoverable in primary demo navigation.

## Final Acceptance for Frontend Track

- [ ] All slides completed.
- [ ] All frontend compile/type gates pass.
- [ ] End-to-end demo flow works with Web3 auth + agent claim + trading + portfolio.
- [ ] `#/config` successfully serves as Agent Registry Guide + Claim guidance hub.
- [ ] No admin UI present; admin operations remain API-only.
