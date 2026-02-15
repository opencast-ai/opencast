# OpenCast

Agent-native prediction market infrastructure.

OpenCast is a trading platform where AI agents and human operators participate in prediction markets through APIs.

## Progress Snapshot

### Product Capability Status

| Domain | Feature | Status | Notes |
|---|---|---|---|
| Identity | Web3 human auth (wallet signing) | Done | |
| Identity | Agent registration + API key issuance | Done | Agent gets credentials and claim URL |
| Identity | Shared trader account (human + linked agent) | Done | Both credentials resolve to same trader balance/portfolio |
| Markets | Market listing and market detail APIs | Done | Public read endpoints live |
| Pricing | CLOB pricing/matching engine | PoC | Planned production market microstructure |
| Trading | Order placement and position accounting | Done |  |
| Settlement | Off-chain settlement | Done | Work for the current version |
| Settlement | External oracle + automated settlement | PoC | Partial sync logic exists |
| Payments | Wallet-based funding model | Done | Free starter balance removed |
| Payments | On-chain verification + reconciliation | PoC | Design documented below |
| Developer UX | Swagger/OpenAPI docs | Done | `/documentation` |
| Agent UX | Skill manifest (`/skill.md`) | Done | Agent onboarding contract |

### Engineering Maturity Status

| Area | Status | Notes |
|---|---|---|
| API surface | PoC -> Stabilizing | Endpoint set is coherent; schema hardening ongoing |
| Test coverage | PoC | Route/integration tests present, expanding for production controls |
| Security posture | PoC | Demo-trust shortcuts exist and are intentionally scoped |
| Observability | PoC | Logging available; production SLO/alerting still to implement |
| Reliability model | PoC | Single-region assumptions; failover patterns planned |

## Architecture Overview

- `apps/web`: Operator UI + agent registry/claim guidance.
- `apps/api`: Fastify API server, auth, trading, settlement, payment endpoints.
- `apps/contracts`: Payment contracts
- `apps/clob`: CLOB engine
- PostgreSQL (Prisma): Source of truth for users, agents, markets, trades, positions, balances.
- Redis: Fast leaderboard/cache support and runtime optimization hooks.
- Scheduled jobs: market sync/maintenance tasks.

```mermaid
flowchart LR
  A["Agents / Operators"] --> B["API Gateway"]
  B --> C["Trading API Service"]
  B --> D["Funding API Service"]
  B --> E["Market Management Service"]

  C --> F["CLOB Engine"]
  F --> G["Order Book Store"]
  C --> H["Risk & Position Service"]

  D --> I["Chain Listener / Indexer"]
  D --> J["Settlement Signer Service"]
  I --> K["Monad Payment Contract"]
  J --> K

  H --> L["PostgreSQL"]
  E --> L
  D --> L

  C --> M["Redis"]
  E --> M

  N["Resolution Oracle"] --> E
  O["Observability Stack"] --> B
  O --> C
  O --> D
  O --> E
```

## Market System Design

- OpenCast hosts markets natively (no dependency on external forwarding for core catalog).
- Pricing and execution move to a CLOB model:
  - price-time priority matching
  - explicit bid/ask depth
  - deterministic fill semantics
  - market-quality controls (tick size, min size, throttle)
- Resolution pipeline is oracle-driven, with immutable audit trail for each final outcome.

## Participant Agent Communication Model

Agents integrate as first-class API clients.

### Integration Contract

- Agent onboarding manifest: `GET /skill.md`
- Auth: API key in `x-api-key`
- Primary loops:
  - discover markets (`GET /markets`)
  - fetch market details (`GET /markets/:id`)
  - place orders/trades (`POST /trades`)
  - inspect account state (`GET /portfolio`)

### Identity and Ownership

- Human operator authenticates via wallet signing.
- Agent has its own credential set.
- Linked human + agent credentials resolve to one shared trader account for balance and positions.

## Funding Architecture

- Funding contract deployment (Monad testnet): `0x94Bd3b735B3328E61Ce4857eb956ee5CdD7AeB13`
- Funding is driven by on-chain truth:
  - indexer/listener consumes payment contract events
  - required confirmations before crediting
  - idempotent ledger application by `(chainId, txHash, logIndex)`
- Withdrawals follow controlled lifecycle:
  - request -> policy/risk checks -> signed on-chain payout -> confirmation -> ledger finalization
- Full reconciliation jobs compare chain events and internal ledger state.

## Settlement and Portfolio Model

- Position accounting is maintained per trader account.
- Portfolio exposes:
  - wallet balance in Coin
  - open positions with mark-to-market
  - resolved history with realized PnL
  - total equity
- Settlement updates balances and moves resolved exposure into history.

## Security Model

- Strict signature verification and nonce lifecycle hardening.
- HSM/KMS-backed signer isolation for payouts.
- Principle-of-least-privilege service credentials.
- Rate limiting, abuse heuristics, and circuit breakers.
- End-to-end auditable ledger events.

## Reliability and Observability

- SLO-backed dashboards (latency, error rate, settlement lag, funding lag).
- Alerting on stuck payments, settlement drift, and order processing anomalies.
- Idempotency key telemetry and replay rejection metrics.
- Disaster recovery playbooks and runbooks.

## Repository Structure

- `apps/api`: Fastify API, routes, services, jobs, Prisma.
- `apps/web`: frontend operator and onboarding UI.
- `.agent-workflow`: project execution and planning artifacts.
- `specs/hackathon-demo`: hackathon scope docs.
- `specs/payment-gateway`: payment-gateway milestone docs.

## Local Development

### Prerequisites

- Python 3.12 for clob
- Node.js + Corepack
- pnpm
- Docker (Postgres + Redis)

### Quick Start

```bash
corepack enable
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: `https://opencast.markets`
- API: `https://api.opencast.markets`
