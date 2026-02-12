# Hackathon Demo Gap Analysis

## 1) Demo Target (as defined)

Build a **working, testable app** (not a video) for hackathon judges where the primary product users are AI agents calling APIs.

Constraints:
- Deadline: **1 working day**
- Team: **1 senior full-stack + AI assistants**
- Deploy target: **Vercel**
- UI quality: **same as current POC (functional, not high polish)**
- Success: all required functions work end-to-end + clear API guidelines for AI participants to test A2A flow

## 2) Required vs Mocked Scope

Required to work:
- Human registration with **Web3 wallet (MetaMask)**
- Human can register agent and receive credentials for OpenClaw agent usage
- APIs for agents to discover markets and place bets
- Markets arena showing **OPEN + RESOLVED** markets
- Markets forwarded from **Polymarket** (metadata + price + settlement state)
- Admin API to manually choose which Polymarket markets to forward
- Demo buy/sell logic: API call deducts balance and records position
- Settlement logic: propagate result from Polymarket, settle positions, pay winners
- Agent portfolio: accurate balance/equity + active positions + resolved history

Allowed to mock:
- Leaderboard
- Real exchange/orderbook/AMM complexity (simple in-app balance deduction + payout is acceptable)

## 3) Current Project Baseline (from code)

Backend/API (implemented):
- Agent registration + API key: `POST /agents/register`
- Trading API with in-app balance deduction + position tracking: `POST /trades`
- Portfolio API with open positions + resolved history: `GET /portfolio`
- Markets APIs: `GET /markets`, `GET /markets/:id`
- Manual admin resolve endpoint: `POST /admin/resolve`
- Polymarket market import endpoint: `POST /admin/sync-polymarket` (imports top active markets)

Frontend (implemented):
- Markets arena + market detail/trade ticket
- Agent initialization flow from UI
- Dashboard with positions/history
- Leaderboard page (already exists; can be left as-is)

Auth/identity (implemented):
- Human auth is currently **X/Twitter OAuth**, not Web3 wallet

Polymarket integration (implemented):
- Market creation/import from Polymarket for active markets
- Chart endpoint can use Polymarket CLOB history
- No automatic settlement sync from Polymarket outcome state in current flow

## 4) Gap Matrix (Current -> Hackathon Demo)

| Requirement | Current State | Gap | Priority |
|---|---|---|---|
| Human register with MetaMask | Only X OAuth exists | Implement wallet auth/sign-in path (SIWE-lite or signed nonce) | P0 |
| Human register agent + generate credentials | Agent credential generation exists but not cleanly tied to human wallet identity | Add "human-owned agent" create flow and return agent creds in one path | P0 |
| Agent APIs to bet | Mostly present | Tighten API docs/examples to match actual payloads | P0 |
| Markets arena open+resolved | Present in UI/API | Ensure resolved state from forwarded markets is actually represented after settlement sync | P0 |
| Markets forwarded from Polymarket | Present but auto-sync top markets | Add **manual forward list API** for admin-selected Polymarket market IDs | P0 |
| Price/settlement state from Polymarket | Price bootstrap exists; settlement sync not implemented | Add settlement sync job/endpoint and status mapping | P0 |
| Buy/sell demo logic | Buy YES/NO works; "sell" is only semantic (NO as inverse), no explicit close/sell endpoint | Clarify demo semantics or add simple close-position sell endpoint | P1 |
| Settlement payout from Polymarket | Manual resolve exists | Add automatic/admin-triggered resolve from Polymarket result source | P0 |
| Portfolio precision (equity + active + history) | Balance + positions + history exist; dashboard "Total_Equity" currently shows balance only | Return/compute total equity explicitly and surface in UI | P1 |
| Clear AI-participant guidelines | Docs exist but inconsistent with live payload names in skill doc | Fix runbook/API docs/skill.md examples to match implementation | P0 |

## 5) Critical Findings (highest risk to demo success)

1. **Identity mismatch (MetaMask missing)**
- Demo requirement says human registration is wallet-based, but implementation is X OAuth.
- This is a visible demo blocker for judges if not addressed.

2. **Polymarket forwarding control mismatch**
- Required: admin manually chooses specific markets to forward.
- Current: sync imports top active markets automatically.
- This weakens deterministic demo control.

3. **Settlement source mismatch**
- Required: settlement forwarded from Polymarket.
- Current: settlement is manual via `/admin/resolve`.
- Without settlement sync, demo narrative breaks at "source-of-truth resolution".

4. **Agent API guidance quality risk**
- Current machine-readable doc (`/skill.md`) has payload field names inconsistent with API implementation.
- This directly threatens A2A onboarding during demo.

## 6) Recommended Scope Cut for 1-Day Delivery

Given the 1-day constraint, target a strict "Demo M1" implementation:

P0 (must ship):
- Wallet login (MetaMask) with minimal signed nonce flow
- Human-owned agent registration endpoint that returns agent credentials
- Admin manual forward endpoint for specific Polymarket markets
- Admin/cron settlement sync endpoint using Polymarket status/outcome
- Docs cleanup for AI participants (copy-paste accurate)

P1 (ship only if time):
- Explicit "sell/close" endpoint UX
- Total-equity field + UI refinement

P2 (defer):
- Leaderboard improvements
- Advanced market microstructure/orderbook realism

## 7) Proposed Implementation Work Packages

WP1: Wallet Auth (P0)
- Add nonce issue + verify signature endpoints
- Persist wallet address on `User` (new field)
- Web login page: connect MetaMask + sign message + store API key

WP2: Human -> Agent Credential Flow (P0)
- Add endpoint like `POST /agents/register-for-user` (auth required)
- Return `{agentId, apiKey, balanceCoin}`
- Link ownership directly in DB (no social proof dependency for demo)

WP3: Admin Manual Polymarket Forward (P0)
- Add endpoint accepting explicit Polymarket market IDs/slugs
- Fetch metadata + current prices + create local markets deterministically

WP4: Settlement Forwarding (P0)
- Add endpoint/job to poll forwarded markets and map final outcomes
- Resolve local positions + payout winners using current payout logic
- Mark market resolved and persist resolved outcome

WP5: API/Guideline Hardening (P0)
- Update `runbook.md`, API docs page, and `GET /skill.md` examples to exact payload schema
- Provide one end-to-end A2A test script (register -> list -> trade -> settle -> portfolio)

WP6: Equity Field (P1)
- Add `totalEquityCoin` in portfolio response
- Define as `balanceCoin + sum(markToMarketCoin for open positions)`
- Surface on dashboard

## 8) Acceptance Checklist (Demo-Day)

Functional acceptance:
- Human can connect MetaMask, sign, and receive authenticated session/API key
- Human can create agent credentials for OpenClaw use
- Agent API key can place a trade successfully
- Markets list includes forwarded Polymarket markets
- Admin can forward specific Polymarket market(s) manually
- Settlement sync resolves at least one forwarded market and pays winners
- Portfolio shows active positions + resolved history + correct balances
- API guideline doc is accurate and usable by external AI participants

Non-goals for this stage:
- Performance hardening
- Production-grade anti-abuse/security posture
- Real-money rails

## 9) Dependencies and Unknowns

Dependencies:
- MetaMask/browser wallet available in demo environment
- Polymarket API stability during demo window
- Admin token configured for controlled settlement/forward operations

Open decisions (should lock before implementation starts):
- "Sell" semantics for demo: keep YES/NO-only bets vs implement explicit close endpoint
- Wallet auth protocol depth: SIWE-lite (recommended for speed) vs full SIWE stack
- Whether to keep X OAuth in parallel or hide it during demo

## 10) Suggested Execution Order (1 day)

1. Wallet auth + user model update
2. Human-owned agent credential endpoint
3. Manual Polymarket forward endpoint
4. Settlement sync endpoint/job
5. Docs/runbook/skill.md fixes
6. Smoke test on Vercel deployment

---

Status: Drafted against current codebase snapshot on 2026-02-12.
