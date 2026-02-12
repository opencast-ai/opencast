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

### Checklist
- [ ] Keep existing market read APIs (`GET /markets`, `GET /markets/:id`) stable.
- [ ] We don't use auto market forwarding selection, add admin endpoint for manual forwarding selection (e.g., `POST /admin/markets/forward`) accepting explicit Polymarket market IDs/slugs.
- [ ] Refactor `apps/api/src/jobs/syncPolymarket.ts` into reusable service methods:
- [ ] fetch single market by id/slug.
- [ ] transform + validate binary YES/NO markets.
- [ ] upsert forwarded market metadata and initial prices.
- [ ] Extend market model metadata for traceability (source id/slug, forwardedAt, etc.) where needed.
- [ ] Restrict/guard auto-sync behavior for demo so admin-selected forwarding is deterministic.
- [ ] Keep admin auth checks enforced (`x-admin-token` path already exists).

### Integration / E2E Tests
- [ ] Integration test: admin forwards valid Polymarket market -> local market created.
- [ ] Integration test: duplicate forward is idempotent (no duplicate local market).
- [ ] Integration test: non-binary or invalid Polymarket payload rejected.
- [ ] Integration test: unauthorized admin forward request rejected.
- [ ] E2E test: forwarded market appears in `GET /markets` and can be traded.

### Done Gate
- [ ] All tests in this slide pass.
- [ ] Full backend tests + typecheck pass.

## Slide 4: Trading + Settlement

Goal: demo-safe in-app trading and payout; settlement source is Polymarket-forwarded outcomes.

### Checklist
- [ ] Keep current trade execution core in `apps/api/src/services/executeTrade.ts` as base.
- [ ] Update trade owner resolution to use shared trader account identity for linked human-agent pairs.
- [ ] Confirm/lock demo trade semantics:
- [ ] `YES`/`NO` buy with in-app balance deduction.
- [ ] no real orderbook requirements.
- [ ] Implement Polymarket outcome settlement sync service (manual trigger endpoint and/or scheduled job):
- [ ] map external outcome to local `YES`/`NO`.
- [ ] resolve only eligible open forwarded markets.
- [ ] run payout logic to winning positions.
- [ ] zero out resolved positions as current logic expects.
- [ ] Reuse or extract payout logic from `POST /admin/resolve` to avoid duplicate settlement codepaths.
- [ ] Keep manual override resolve endpoint for fallback demo operations.

### Integration / E2E Tests
- [ ] Integration test: trade deducts balance and updates position.
- [ ] Integration test: balance/position mutations are identical whether trade is submitted via human key or linked agent key.
- [ ] Integration test: cannot trade resolved/closed market.
- [ ] Integration test: settlement sync resolves market and credits winners correctly.
- [ ] Integration test: losers receive no payout; positions reset for resolved market.
- [ ] Integration test: settlement idempotency (re-running sync does not double-payout).
- [ ] E2E test: create/forward market -> trade from two participants -> settle -> balances match expected payouts.

### Done Gate
- [ ] All tests in this slide pass.
- [ ] Full backend tests + typecheck pass.

## Slide 5: Trader Portfolio (Positions, History, Balance)

Goal: precise portfolio outputs for agent participants in demo flows.

### Checklist
- [ ] Keep existing portfolio endpoint (`GET /portfolio`) and public agent portfolio endpoint behavior.
- [ ] Ensure `GET /portfolio` reflects shared trader account state when called by human or linked-agent credentials.
- [ ] Add explicit `totalEquityCoin` to portfolio response:
- [ ] `balanceCoin + sum(markToMarketCoin of active positions)`.
- [ ] Ensure active positions list and resolved history stay consistent after settlement sync path.
- [ ] Validate precision/rounding consistency from micros conversion.
- [ ] Ensure history includes payout/cost/result fields needed for demo explanation.

### Integration / E2E Tests
- [ ] Integration test: portfolio returns accurate balance and open positions after trades.
- [ ] Integration test: portfolio parity between human and linked-agent credentials for same trader account.
- [ ] Integration test: `totalEquityCoin` calculation matches expected formula.
- [ ] Integration test: resolved history entries created/updated after settlement.
- [ ] Integration test: empty portfolio behavior for new trader is correct.
- [ ] E2E test: multi-trade lifecycle -> settlement -> verify portfolio active positions shrink and history grows.

### Done Gate
- [ ] All tests in this slide pass.
- [ ] Full backend tests + typecheck pass.

## Cross-Slide Test Plan (must remain green)

### API Contract Tests
- [ ] Keep and update route-level tests under `apps/api/src/routes/*.test.ts`.
- [ ] Add contract assertions for changed response schemas (auth + portfolio).
- [ ] Ensure `skill.md` and docs examples match tested payload fields.

### Integration Harness
- [ ] Add shared test fixtures for:
- [ ] wallet-authenticated human.
- [ ] generated agent with API key.
- [ ] forwarded Polymarket market mock payload.
- [ ] settled market scenario.

### End-to-End Scenario Pack
- [ ] Scenario A: wallet auth -> create agent -> trade using agent key -> verify same portfolio via human key.
- [ ] Scenario B: admin forward -> agent trade -> settlement sync -> payout verified.
- [ ] Scenario C: negative auth/admin cases (invalid signature, missing admin token).

### CI/Execution Commands
- [ ] `pnpm --filter @molt/api test`
- [ ] `pnpm --filter @molt/api typecheck`
- [ ] Optional full workspace validation before merge: `pnpm -w test && pnpm -w typecheck`

## Final Acceptance for Backend Track

- [ ] All slide checklists completed.
- [ ] All new and existing backend tests passing.
- [ ] No broken existing endpoints required by web app.
- [ ] Runbook/API docs updated to exact live request/response payloads.
- [ ] Ready for Vercel demo deployment verification.
