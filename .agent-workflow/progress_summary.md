# progress_summary.md (active memory)  <!-- Sisyphus Audit: Context Bloat -->

Last updated: 2026-02-12

STATE OF TRUTH (keep short)

Verified (facts)
- Scope locked for M0 vertical slice (seeded markets + manual resolution; integrations later)
- Stack locked: Node.js + TypeScript backend, Prisma/Postgres, Redis, pnpm, simple React web dashboard
- Workflow docs are present under `.agent-workflow/`
- PRD scaffold updated with M0 acceptance tests (`.agent-workflow/PRD.json`)
- Product Description filled for M0 (`.agent-workflow/Product_Description.md`)
- Docker compose services run locally (Postgres + Redis) via `docker-compose.yml`
- Prisma migrations applied and DB seeded with 3 markets
- API smoke test verified register -> markets -> trade -> portfolio -> leaderboard -> resolve
- Web UI smoke test verified same flow via dashboard
- Vercel deploy lockfile synced for apps/api deps (node-cron added to pnpm-lock.yaml)

**COMPLETED: Slide 5 - Trader Portfolio & Settlement (68/68 tests passing)**

Implemented:
1. `totalEquityCoin` field in portfolio endpoint (`apps/api/src/routes/portfolio.ts`)
   - Calculates equity = balance + sum(position markToMarket)
   - Handles both open markets (price-based) and resolved markets (outcome-based)
   - Filters out zeroed positions after settlement
   - Shared account model: both human and agent credentials resolve to same user portfolio

2. Comprehensive portfolio tests (`apps/api/src/routes/portfolio.test.ts`)
   - 11 tests covering: basic portfolio, equity calculation with positions, agent keys, 
     settlement filtering, resolved market pricing, multiple positions, public agent portfolio
   - Test isolation with unique identifiers per test file (TEST_PREFIX + random suffixes)
   - All 68 API tests passing (including existing: web3auth 17, agentClaim 15, claim 2, admin 20, amm 3)

Architecture:
- Shared trader account: Agent API keys resolve to owner's userId via `requireAccount()`
- Position markToMarket: For open markets, calculated as (yesShares * priceYes) + (noShares * priceNo)
- Resolved markets: priceYes = 1/0 based on outcome, priceNo = 0/1
- Zeroed positions filtered out of portfolio response

Active bugs / unknowns
- (none)

Next slice
- S01: Bootstrap repo into runnable M0 demo (API + DB + seeds + minimal UI)

Evidence pointers
- archive/: (empty)
