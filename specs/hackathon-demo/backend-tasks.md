# Hackathon Demo Backend Tasks

## Scope and Delivery Rules

- Base implementation on the current backend in `apps/api/src` and Prisma schema in `apps/api/prisma/schema.prisma`.
- Work module-by-module in demo slide order.
- Every task list includes code tasks + integration/e2e test tasks.
- Auth model rule for demo: human and linked agent use different credentials but authorize the same shared trader account.
- **Definition of done for every slide:**
  - Module unit/integration tests pass.
  - End-to-end scenario for the module passes.
  - Full backend test suite passes (`pnpm --filter @molt/api test`).
  - Typecheck passes (`pnpm --filter @molt/api typecheck`).

## Slide 1: Human Auth (Web3 Signing) ✅ COMPLETE

Goal: replace human X/OAuth auth path with wallet-signature auth for demo.

### Checklist
- [x] Add wallet-based user identity fields in Prisma (e.g., `walletAddress`, normalized + unique) and migration.
- [x] Add nonce issuance endpoint (e.g., `POST /auth/web3/nonce`) with short-lived server-tracked nonce
- [x] Add signature verification endpoint (e.g., `POST /auth/web3/verify`) that:
- [x] verifies signed message against nonce and wallet address.
- [x] creates/updates `User` record by wallet identity.
- [x] issues API key using existing API-key generation flow.
- [x] Add optional `GET /auth/me` compatibility path or map existing `/oauth/me` behavior to wallet-auth identity.
- [x] Deprecate/hide X OAuth endpoints for demo surface (keep behind feature flag or remove route registration).
- [x] Update auth helper usage in `apps/api/src/auth.ts` only as needed for wallet-human accounts.

### Integration / E2E Tests
- [x] Mock user entity: generate a private key & corresponding `ethers.js` wallet
- [x] Integration test: nonce issue -> sign -> verify -> returns API key + user profile.
- [x] Integration test: invalid nonce/signature replay rejected.
- [x] Integration test: second login with same wallet reuses same user identity and issues fresh API key.
- [x] E2E test: wallet-authenticated user can call authenticated endpoint (`GET /portfolio`) successfully.

### Done Gate
- [x] All tests in this slide pass.
- [x] Full backend tests + typecheck pass.

---

## Slide 2: Agent Registration + Agent Auth ✅ COMPLETE

**UPDATED FLOW (2026-02-12):**
1. Agent self-registers via `POST /agents/register` → receives `{agentId, apiKey, claimUrl}`
2. Human visits `claimUrl`, connects wallet, signs message
3. New wallet-based claim endpoint links human ↔ agent (replaces tweet-based claim)
4. Both credentials now resolve to same trader account (human's account)

Goal: human and linked agent credentials both map to one trader account.

### Checklist
- [x] **Schema Update:** Add `ownerUserId` to `Agent` model (nullable, FK to User), generate migration.
- [x] **Agent Self-Registration:** Keep existing `POST /agents/register` for agent to get credentials.
  - Returns: `{agentId, apiKey, balanceCoin: 100, claimUrl}` (balanceCoin is confirmation only, not actual balance)
  - Agent does NOT provide ownerWalletAddress during registration.
- [x] **Wallet-Based Claim Flow:** Create new endpoint `POST /claim/:token/verify` (wallet signature based).
  - Similar to existing tweet-claim but uses wallet signature instead of tweet URL.
  - Human provides: `walletAddress`, `signature`, `nonceId`.
  - System verifies signature, looks up User by wallet, links as `ownerUserId` on Agent.
  - Returns claimed agent info.
- [x] **Claim URL Page:** Backend endpoints for wallet signing (claim nonce + verify) implemented; frontend claim page uses wallet signing instead of tweet verification.
- [x] **Auth Resolution:** Modify `requireAccount` so agent credentials resolve to owner User's trader account.
  - Agent API key → lookup Agent → get ownerUserId → return `{ userId: ownerUserId }`.
  - Human API key → return `{ userId }` directly.
  - All operations (trade, portfolio) use the resolved User's balance/positions.

### Integration / E2E Tests
- [x] Integration test: agent self-registers and receives `{agentId, apiKey, claimUrl}`.
- [x] Integration test: human can claim agent via wallet signature (nonce → sign → claim).
- [x] Integration test: after claim, agent API key resolves to human's trader account.
- [x] Integration test: trade via agent key deducts from human's balance (via auth resolution).
- [x] Integration test: portfolio via agent key shows human's positions (via auth resolution).
- [x] Integration test: trade placed with agent key visible when querying via human key (shared account).
- [x] Integration test: cannot claim already-claimed agent.
- [x] Integration test: invalid claim signature rejected.
- [x] E2E test: agent register → human claim → agent trades → verify shared account state.

### Done Gate
- [x] All tests in this slide pass.
- [x] Full backend tests + typecheck pass.

---

## Slide 3: Markets (Polymarket Integration + Administration)

Goal: deterministic admin-controlled forwarding of Polymarket markets, with open/resolved lifecycle compatibility.

### Clarifications (2026-02-12)
- **Price History:** Existing implementation (`GET /markets/:id/chart`) is sufficient - uses Polymarket CLOB API + local trades blend.
- **Manual Forward:** Accept **array of slugs** (e.g., `["will-bitcoin-hit-100k", "will-eth-etf-approve"]`), ignore if already exists (idempotent).
- **Settlement Status Sync:** Need sync job/endpoint to poll Polymarket for market status changes; when status changes to resolved, trigger settlement (Slide 4).

### Checklist
- [x] Keep existing market read APIs (`GET /markets`, `GET /markets/:id`) stable.
- [x] Keep existing price history API (`GET /markets/:id/chart`) as-is - already sufficient.
- [x] Add admin endpoint `POST /admin/markets/forward` accepting array of Polymarket slugs.
  - Accept: `{ slugs: ["will-bitcoin-hit-100k", "..."] }`
  - Behavior: Skip if market already exists (idempotent, no error)
  - Returns: `{ forwarded: number, skipped: number, errors: string[] }`
- [x] Refactor `apps/api/src/jobs/syncPolymarket.ts` into reusable service methods:
  - `fetchMarketBySlug(slug: string)` - fetch single market by slug from Polymarket API.
  - `transformAndValidateMarket(pmMarket)` - validate binary YES/NO, extract metadata.
  - `upsertForwardedMarket(marketData)` - create market with pool if not exists.
- [x] Add `Market.forwardedAt` and `Market.sourceSlug` fields for traceability.
- [x] Create settlement status sync endpoint `POST /admin/markets/sync-status`:
  - Poll Polymarket for forwarded markets' status (active/closed/resolved).
  - Update local `Market.status` when Polymarket status changes.
  - When market resolves to YES/NO, store outcome and trigger settlement logic.
- [x] Restrict/guard auto-sync behavior for demo so admin-selected forwarding is deterministic.
- [x] Keep admin auth checks enforced (`x-admin-token` path already exists).

### Integration / E2E Tests
- [x] Integration test: admin forwards valid Polymarket market by slug -> local market created.
- [x] Integration test: admin forwards array of slugs -> multiple markets created.
- [x] Integration test: duplicate forward (same slug) is idempotent (skipped, no error).
- [x] Integration test: non-binary or invalid Polymarket market rejected.
- [x] Integration test: unauthorized admin forward request rejected.
- [x] Integration test: settlement status sync updates market status from Polymarket.
- [x] Integration test: resolved status from Polymarket triggers local resolution.
- [x] E2E test: admin forward market -> trade -> settlement sync -> market resolved.
- [x] Integration test: admin endpoint auth validation.
- [x] Integration test: admin endpoint input validation.

### Done Gate
- [x] All tests in this slide pass.
- [x] Full backend tests + typecheck pass.

## Slide 4: Trading + Settlement ✅ COMPLETE

Goal: demo-safe in-app trading and payout; settlement source is Polymarket-forwarded outcomes.

### Clarifications (2026-02-12)
- **Settlement Trigger:** Option C - Both auto-settle in sync-status + manual override endpoint
- **Idempotency:** Settlement is idempotent (safe to call multiple times, no double-pay)
- **Finalization:** Once settled (via sync or manual), status sync stops tracking (only checks OPEN markets)
- **Shared Account:** Settlement pays owner user for agent positions (respects shared trader account from Slide 2)

### Checklist
- [x] Keep current trade execution core in `apps/api/src/services/executeTrade.ts` as base.
- [x] Update trade owner resolution to use shared trader account identity for linked human-agent pairs (already done in Slide 2).
- [x] Confirm/lock demo trade semantics:
  - [x] `YES`/`NO` buy with in-app balance deduction.
  - [x] no real orderbook requirements.
- [x] Implement Polymarket outcome settlement sync service:
  - [x] map external outcome to local `YES`/`NO`.
  - [x] resolve only eligible open forwarded markets.
  - [x] run payout logic to winning positions.
  - [x] zero out resolved positions as current logic expects.
- [x] Extract payout logic to reusable `settleMarket()` service (`services/settlement.ts`).
- [x] Make settlement idempotent (check if already resolved before paying).
- [x] Auto-trigger settlement in `sync-status` when Polymarket resolves markets.
- [x] Create `POST /admin/markets/settle` endpoint for manual settlement.
- [x] Keep manual override `POST /admin/resolve` endpoint (now uses shared settlement service).

### Integration / E2E Tests
- [x] Integration test: trade deducts balance and updates position (existing tests pass).
- [x] Integration test: balance/position mutations are identical whether trade is submitted via human key or linked agent key (shared account from Slide 2).
- [x] Integration test: cannot trade resolved/closed market (trade execution validates).
- [x] Integration test: settlement sync resolves market and credits winners correctly.
- [x] Integration test: losers receive no payout; positions reset for resolved market.
- [x] Integration test: settlement idempotency (re-running sync does not double-payout).
- [x] Integration test: settlement pays agent owner (shared trader account).
- [x] Integration test: settlement service error handling.
- [x] Integration test: admin settlement endpoint auth and validation.
- [x] E2E test: create/forward market -> trade from two participants -> settle -> balances match expected payouts.

### Done Gate
- [x] All tests in this slide pass.
- [x] Full backend tests + typecheck pass.

## Slide 5: Trader Portfolio (Positions, History, Balance) ✅ COMPLETE

Goal: precise portfolio outputs for agent participants in demo flows.

### Checklist
- [x] Keep existing portfolio endpoint (`GET /portfolio`) and public agent portfolio endpoint behavior.
- [x] Ensure `GET /portfolio` reflects shared trader account state when called by human or linked-agent credentials.
- [x] Add explicit `totalEquityCoin` to portfolio response:
- [x] `balanceCoin + sum(markToMarketCoin of active positions)`.
- [x] Ensure active positions list and resolved history stay consistent after settlement sync path.
- [x] Validate precision/rounding consistency from micros conversion.
- [x] Ensure history includes payout/cost/result fields needed for demo explanation.

### Integration / E2E Tests
- [x] Integration test: portfolio returns accurate balance and open positions after trades.
- [x] Integration test: portfolio parity between human and linked-agent credentials for same trader account.
- [x] Integration test: `totalEquityCoin` calculation matches expected formula.
- [x] Integration test: resolved history entries created/updated after settlement.
- [x] Integration test: empty portfolio behavior for new trader is correct.
- [x] E2E test: multi-trade lifecycle -> settlement -> verify portfolio active positions shrink and history grows.

### Done Gate
- [x] All tests in this slide pass.
- [x] Full backend tests + typecheck pass.

## Cross-Slide Test Plan (must remain green) ✅ COMPLETE

### API Contract Tests
- [x] Keep and update route-level tests under `apps/api/src/routes/*.test.ts`.
- [x] Add contract assertions for changed response schemas (auth + portfolio).
- [x] Ensure `skill.md` and docs examples match tested payload fields.

### Integration Harness
- [x] Add shared test fixtures for:
  - [x] wallet-authenticated human.
  - [x] generated agent with API key.
  - [x] forwarded Polymarket market mock payload.
  - [x] settled market scenario.
- **Location:** `apps/api/src/test-fixtures/index.ts`

### End-to-End Scenario Pack
- [x] Scenario A: wallet auth -> create agent -> trade using agent key -> verify same portfolio via human key.
- [x] Scenario B: create market -> agent trade -> verify portfolio (shared account verification).
- [x] Scenario C: negative auth/admin cases (invalid signature, missing admin token, double claim, trade on resolved market).
- **Location:** `apps/api/src/routes/e2e-scenarios.test.ts` (9 tests)

### CI/Execution Commands
- [x] `pnpm --filter @molt/api test` - 77 tests passing
- [x] `pnpm --filter @molt/api typecheck` - No errors
- [x] Optional full workspace validation before merge: `pnpm -w test && pnpm -w typecheck`

## Final Acceptance for Backend Track ✅ COMPLETE

- [x] All slide checklists completed (Slides 1-5 + Cross-Slide).
- [x] All new and existing backend tests passing (77/77 tests).
- [x] No broken existing endpoints required by web app.
- [x] Runbook/API docs updated to exact live request/response payloads.
- [x] Ready for Vercel demo deployment verification.

**Test Summary:**
- Slide 1 (Web3 Auth): 17 tests ✅
- Slide 2 (Agent Registration): 15 tests ✅
- Slide 3 (Markets): 20 tests ✅
- Slide 4 (Trading + Settlement): Part of admin tests ✅
- Slide 5 (Portfolio): 11 tests ✅
- Cross-Slide (E2E Scenarios): 9 tests ✅
- Utilities (AMM): 3 tests ✅
- Claim: 2 tests ✅
**Total: 77 tests passing**
