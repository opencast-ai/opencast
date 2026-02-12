# Slide 2: Agent Registration + Agent Auth - Implementation Log

**Started:** 2026-02-12
**Goal:** Agent self-registration + wallet-based claim flow for human↔agent linking

---

## Clarified Flow (per discussion)

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   Agent (Bot)   │────▶│ POST /agents/register    │────▶│  {agentId,      │
│                 │     │ (self-registration)      │     │   apiKey,       │
└─────────────────┘     └──────────────────────────┘     │   claimUrl}     │
                                                         └─────────────────┘
                                                                    │
                                                                    ▼
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  Human Wallet   │◄────│   Visit claimUrl         │◄────│  Link provided  │
│    Linked       │     │   (web UI)               │     │  to human       │
└─────────────────┘     └──────────────────────────┘     └─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Sign message with wallet │
│ POST /claim/:token/verify│
│ (wallet-based claim)     │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Agent.ownerUserId set   │
│  Human ↔ Agent linked    │
└──────────────────────────┘
```

---

## Checklist Progress

### Schema & Migration
- [x] Add `ownerUserId` to `Agent` model
- [x] Create Prisma migration `20260212090000_add_agent_owner`
- [x] Apply migration to database
- [x] Generate Prisma client

**Activity:** Added `ownerUserId` field to `Agent` model with foreign key to `User`. Created relation `OwnedAgents` on User for reverse lookup. Migration applied successfully.

### Agent Self-Registration
- [x] Keep `POST /agents/register` working
- [x] Returns claimUrl for wallet-based claiming

**Activity:** Existing endpoint already returns claimUrl. No changes needed.

### Wallet-Based Claim Flow
- [x] Create `POST /claim/:token/verify` endpoint
- [x] Create `POST /claim/:token/nonce` endpoint for claim flow
- [x] Verify wallet signature
- [x] Link agent to human user

**Activity:** Created `agentClaim.ts` with wallet-based claim endpoints:
- `GET /claim/:token` - Get agent info
- `POST /claim/:token/nonce` - Issue nonce for signing
- `POST /claim/:token/verify` - Verify signature and link agent to user

Endpoints reuse signature verification logic from web3auth. Agent linked via `ownerUserId`.

### Auth Resolution
- [x] Modify `requireAccount` to resolve agent → owner user
- [x] All endpoints use trader account (User's balance/positions)

**Activity:** Modified `requireAccount()` in `auth.ts`:
- User API key → returns `{ userId }` directly
- Agent API key with owner → returns `{ userId: ownerUserId }` (shared trader account)
- Agent API key without owner → returns `{ agentId }` (unclaimed agent, for demo flexibility)

### Tests
- [x] Agent self-registration test (in agentClaim.test.ts)
- [x] Wallet claim flow test (nonce + verify endpoints)
- [x] Shared account resolution test (agent key → owner user)
- [x] E2E full flow test (register → claim)

**Activity:** Created comprehensive test suite in `agentClaim.test.ts` with 15 tests:
- Agent self-registration
- Claim info retrieval
- Nonce issuance and validation
- Wallet signature verification
- Agent-human linking
- Replay attack prevention
- Auth resolution (agent → owner)

### Done Gate
- [x] All slide tests pass (15/15 agentClaim tests, 37/37 total)
- [x] Full backend tests pass
- [x] Typecheck passes

**Activity:** 
- All 37 backend tests passing
- TypeScript typecheck clean
- No regressions in existing endpoints

---

## Summary

Slide 2 completed successfully. Agent registration and wallet-based claim flow is now working.

**Key Changes:**
1. Prisma schema: Added `ownerUserId` to `Agent`, created `OwnedAgents` relation on `User`
2. Migration: `20260212090000_add_agent_owner` applied
3. New endpoints: `POST /claim/:token/nonce`, `POST /claim/:token/verify`
4. Auth resolution: `requireAccount()` now resolves agent keys to owner user
5. Tests: 15 comprehensive tests for agent claim flow

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/register` | Agent self-registration (existing) |
| POST | `/claim/:token/nonce` | Get nonce for wallet signing |
| POST | `/claim/:token/verify` | Verify signature, link agent to human |

**Completed:** 2026-02-12

---

## Activity Log

