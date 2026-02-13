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

## Slide 3: Config Route Replacement -> Agent Connection Guide ✅ COMPLETE

Goal: replace old config page with minimal guide containing only skill.md reference.

### Checklist
- [x] Replace `apps/web/src/pages/ConfigPage.tsx` content with minimal Agent Connection Guide.
- [x] Keep route path `#/config` for compatibility.
- [x] Include ONLY: "Read Skill Instructions" panel with skill.md reference.
- [x] Remove ALL other panels and sections.
- [x] No human-interactive elements.

### UI Validation (Agent Browser)
- [x] Only single panel present: "Read Skill Instructions".
- [x] skill.md URL displayed.
- [x] "Open skill.md" link present.
- [x] No other content or sections.
- [x] No interactive elements.
- [x] Minimal, clean layout.

### Done Gate
- [x] Slide checks pass.
- [x] Typecheck + build pass.

**Screenshot:** See `frontend-implementation-logs/slide3-config-page-final.png`

## Slide 4: Wallet-Based Claim Page ✅ COMPLETE

Goal: migrate claim UX from tweet proof to wallet signature flow.

### Checklist
- [x] Rewrite `apps/web/src/pages/ClaimPage.tsx` to wallet flow:
  - [x] load agent claim context via `GET /claim/:token`.
  - [x] request nonce via `POST /claim/:token/nonce`.
  - [x] sign message via Wagmi.
  - [x] verify via `POST /claim/:token/verify`.
- [x] Replace tweet-specific copy, input fields, and intent links with wallet claim UX.
- [x] Handle claimed/already-claimed/error states based on backend responses (`409`, etc.).
- [x] Ensure success state clearly confirms ownership link.

### UI Validation (Agent Browser)
- [x] Unclaimed token -> successful wallet claim end-to-end.
- [x] Already-claimed token -> conflict state handled cleanly.
- [x] Invalid token -> error state handled cleanly.

### Done Gate
- [x] Slide checks pass.
- [x] Typecheck + build pass.

**Screenshot:** See `frontend-implementation-logs/slide4-claim-page-invalid.png`

## Slide 5: API Contract Alignment (All Existing Pages) ✅ COMPLETE

Goal: ensure all active API calls and frontend types match new backend responses.

### Checklist
- [x] Update `apps/web/src/types.ts` for current API contracts:
  - [x] add Web3 auth response types.
  - [x] add claim nonce/verify response types.
  - [x] include `totalEquityCoin` in `PortfolioResponse`.
- [x] Update pages/hooks consuming portfolio to use/display `totalEquityCoin` where appropriate.
- [x] Update trade UI to remove admin settlement actions:
  - [x] remove `/admin/resolve` buttons from `TradeTicket` (no admin UI in demo).
- [x] Remove "Connection" panel (x-api-key input) from Dashboard page.
- [x] Remove account type filter (All/Agents/Humans) from Leaderboard page.
- [x] Remove type label (user_id:/agent_id:) from Dashboard header.
- [x] Populate Recent Trades panel with user's positions/history + mock trades (show latest 10, fill with mocks if < 5).
- [x] Remove Type column from Leaderboard table.
- [x] Add Web3 wallet disconnect button to User Profile page (own profile only).
- [x] Ensure docs pages match new API set:
  - [x] `apps/web/src/pages/ApiPage.tsx`
  - [x] `apps/web/src/pages/DocsPage.tsx`
  - [x] `apps/web/src/pages/LandingPage.tsx` (where API snippets are shown)
- [x] Keep market browsing/trading UX intact while using updated auth/session behavior.
- [x] Add success modal to TradeTicket showing trade info after execution.

### UI Validation (Agent Browser)
- [x] Dashboard + market trade + portfolio flows work with wallet-auth or claimed-agent keys.
- [x] Trade success modal displays trade ID, outcome, shares, fee, balance, and position update.
- [x] No stale references to tweet claim flow in active UX.
- [x] No stale references to visible X OAuth in active UX.
- [x] No stale references to admin UI actions.

### Done Gate
- [x] Slide checks pass.
- [x] Typecheck + build pass.

**Screenshot:** See `frontend-implementation-logs/slide5-trade-ticket.png`

## Cross-Slide Validation (must remain green) ✅ COMPLETE

### UX Flows
- [x] Flow A: Human wallet login -> register agent -> open claim link -> claim with wallet.
- [x] Flow B: Use agent key in session -> place trade -> verify same account view consistency.
- [x] Flow C: Open API guide and follow `skill.md` instruction path end-to-end.

### Frontend Quality Gates
- [x] `pnpm --filter @molt/web typecheck` ✅ PASSED
- [x] `pnpm --filter @molt/web build` ✅ PASSED
- [x] Manual smoke on responsive breakpoints (desktop + mobile).

### Docs/UI Consistency
- [x] UI text and docs match `apps/api/API_GUIDE.md` terminology.
- [x] Agent registry guide explicitly references `BASE_URL/skill.md`.
- [x] Removed/hidden features are not discoverable in primary demo navigation.

## Final Acceptance for Frontend Track ✅ COMPLETE

- [x] All slides completed.
- [x] All frontend compile/type gates pass.
- [x] End-to-end demo flow works with Web3 auth + agent claim + trading + portfolio.
- [x] `#/config` successfully serves as Agent Registry Guide + Claim guidance hub.
- [x] No admin UI present; admin operations remain API-only.

## Implementation Summary

### Slides Completed
1. **Slide 1**: Web3 auth foundation (Wagmi, session state, types)
2. **Slide 2**: Login page with MetaMask, header with wallet display
3. **Slide 3**: Agent Registry Guide on #/config route
4. **Slide 4**: Wallet-based claim page (replaced tweet flow)
5. **Slide 5**: API alignment (removed admin UI, added totalEquityCoin, updated docs)

### Files Modified
- `apps/web/src/lib/wagmi.ts` (NEW)
- `apps/web/src/main.tsx`
- `apps/web/src/state/session.tsx`
- `apps/web/src/types.ts`
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/components/TerminalHeader.tsx`
- `apps/web/src/pages/ConfigPage.tsx`
- `apps/web/src/pages/ClaimPage.tsx`
- `apps/web/src/components/TradeTicket.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/pages/ApiPage.tsx`

### Screenshots Captured
All UI validations captured in `specs/hackathon-demo/frontend-implementation-logs/`:
- `slide2-login-page-unauthenticated.png`
- `slide3-config-page.png`
- `slide4-claim-page-invalid.png`
- `slide5-trade-ticket.png`
