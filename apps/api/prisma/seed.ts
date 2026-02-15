import { PrismaClient } from "@prisma/client";

import { quoteBuyBinaryFpmm } from "../src/amm/fpmm.js";
import { MICROS_PER_COIN, STARTING_BALANCE_MICROS, coinToMicros } from "../src/constants.js";

const prisma = new PrismaClient();

const INITIAL_POOL_SHARES_MICROS = 1_000n * MICROS_PER_COIN;
const FEE_BPS = 100;

const DEMO_AGENT_ID = "00000000-0000-0000-0000-000000000001";
const BOT_AGENT_IDS = [
  "00000000-0000-0000-0000-000000000101",
  "00000000-0000-0000-0000-000000000102",
  "00000000-0000-0000-0000-000000000103",
  "00000000-0000-0000-0000-000000000104",
  "00000000-0000-0000-0000-000000000105"
];

type Outcome = "YES" | "NO";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function executeTrade(params: { agentId: string; marketId: string; outcome: Outcome; collateralCoin: number }) {
  const collateralInMicros = coinToMicros(params.collateralCoin);

  const [agent, market] = await Promise.all([
    prisma.agent.findUnique({ where: { id: params.agentId } }),
    prisma.market.findUnique({ where: { id: params.marketId }, include: { pool: true } })
  ]);

  if (!agent) throw new Error(`seed: agent not found: ${params.agentId}`);
  if (!market || !market.pool) throw new Error(`seed: market not found: ${params.marketId}`);
  if (market.status !== "OPEN") throw new Error(`seed: market not OPEN: ${params.marketId}`);
  if (agent.balanceMicros < collateralInMicros) throw new Error(`seed: insufficient balance for agent ${params.agentId}`);

  const pool = market.pool;
  const quote = quoteBuyBinaryFpmm({
    pool: { yesMicros: pool.yesSharesMicros, noMicros: pool.noSharesMicros, feeBps: pool.feeBps },
    outcome: params.outcome,
    collateralInMicros
  });

  const nextCollateral = pool.collateralMicros + quote.netCollateralMicros;
  const nextYes = quote.nextPool.yesMicros;
  const nextNo = quote.nextPool.noMicros;

  await prisma.$transaction(async (tx) => {
    await tx.house.upsert({
      where: { id: "house" },
      create: { id: "house", treasuryMicros: quote.feeMicros },
      update: { treasuryMicros: { increment: quote.feeMicros } }
    });

    await tx.agent.update({
      where: { id: params.agentId },
      data: { balanceMicros: { decrement: quote.collateralInMicros } }
    });

    await tx.marketPool.update({
      where: { marketId: params.marketId },
      data: {
        collateralMicros: nextCollateral,
        yesSharesMicros: nextYes,
        noSharesMicros: nextNo
      }
    });

    await tx.position.upsert({
      where: { agentId_marketId: { agentId: params.agentId, marketId: params.marketId } },
      create: {
        agentId: params.agentId,
        marketId: params.marketId,
        yesSharesMicros: params.outcome === "YES" ? quote.sharesOutMicros : 0n,
        noSharesMicros: params.outcome === "NO" ? quote.sharesOutMicros : 0n
      },
      update: {
        yesSharesMicros: params.outcome === "YES" ? { increment: quote.sharesOutMicros } : undefined,
        noSharesMicros: params.outcome === "NO" ? { increment: quote.sharesOutMicros } : undefined
      }
    });

    await tx.trade.create({
      data: {
        agentId: params.agentId,
        marketId: params.marketId,
        side: params.outcome,
        collateralInMicros: quote.collateralInMicros,
        feeMicros: quote.feeMicros,
        sharesOutMicros: quote.sharesOutMicros,
        poolCollateralMicros: nextCollateral,
        poolYesSharesMicros: nextYes,
        poolNoSharesMicros: nextNo
      }
    });
  });
}

async function resolveMarket(params: { marketId: string; outcome: Outcome }) {
  const market = await prisma.market.findUnique({ where: { id: params.marketId }, include: { positions: true } });
  if (!market) throw new Error(`seed: market not found: ${params.marketId}`);
  if (market.status !== "OPEN") throw new Error(`seed: market not OPEN: ${params.marketId}`);

  await prisma.$transaction(async (tx) => {
    for (const pos of market.positions) {
      const payout = params.outcome === "YES" ? pos.yesSharesMicros : pos.noSharesMicros;
      if (payout > 0n) {
        await tx.agent.update({
          where: { id: pos.agentId },
          data: { balanceMicros: { increment: payout } }
        });
      }
      await tx.position.update({
        where: { id: pos.id },
        data: { yesSharesMicros: 0n, noSharesMicros: 0n }
      });
    }

    await tx.market.update({
      where: { id: params.marketId },
      data: { status: "RESOLVED", outcome: params.outcome }
    });
  });
}

async function main() {
  await prisma.$connect();

  await prisma.house.upsert({
    where: { id: "house" },
    create: { id: "house", treasuryMicros: 0n },
    update: {}
  });

  // Reset database for deterministic local demo.
  await prisma.trade.deleteMany();
  await prisma.position.deleteMany();
  await prisma.marketPool.deleteMany();
  await prisma.market.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agent.deleteMany();

  const now = new Date();
  const closesAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const marketsSpec = [
    "Will BTC be above $100k on 2026-12-31?",
    "Will the US CPI YoY print be >= 3.0% next release?",
    "Will Team A win the next match?",
    "Will OpenAI ship GPT-6 in 2026?",
    "Will SpaceX land Starship successfully this quarter?",
    "Will the Fed cut rates by >= 25 bps next meeting?",
    "Will ETH outperform BTC this month?",
    "Will the S&P 500 close up this week?",
    "Will a top-5 AI lab open-source a frontier model in 2026?",
    "Will the next iPhone have a foldable variant?"
  ] as const;

  const marketIds: string[] = [];
  for (let idx = 0; idx < marketsSpec.length; idx++) {
    const title = marketsSpec[idx];
    const rng = mulberry32(1337 + idx * 97);
    const totalPoolCoin = 900 + Math.floor(rng() * 2200);
    const pYes = 0.12 + rng() * 0.76; // 12%..88%
    const noCoin = clamp(Math.round(pYes * totalPoolCoin), 1, totalPoolCoin - 1);
    const yesCoin = totalPoolCoin - noCoin;

    const m = await prisma.market.create({
      data: {
        title,
        description: "Seeded demo market (bots + manual resolution).",
        closesAt,
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: BigInt(yesCoin) * MICROS_PER_COIN,
            noSharesMicros: BigInt(noCoin) * MICROS_PER_COIN,
            feeBps: FEE_BPS
          }
        }
      },
      select: { id: true }
    });
    marketIds.push(m.id);
  }

  await prisma.agent.create({
    data: {
      id: DEMO_AGENT_ID,
      displayName: "DEMO_AGENT",
      balanceMicros: STARTING_BALANCE_MICROS
    }
  });

  const botNames = ["BOT_ALPHA", "BOT_BETA", "BOT_GAMMA", "BOT_DELTA", "BOT_EPSILON"];
  for (let i = 0; i < BOT_AGENT_IDS.length; i++) {
    await prisma.agent.create({
      data: {
        id: BOT_AGENT_IDS[i],
        displayName: botNames[i] ?? `BOT_${i}`,
        balanceMicros: STARTING_BALANCE_MICROS
      }
    });
  }

  // Seed bot activity for every market (skewed so prices aren't stuck near 50%).
  for (let mIdx = 0; mIdx < marketIds.length; mIdx++) {
    const marketId = marketIds[mIdx];
    const rng = mulberry32(4242 + mIdx * 311);

    const bias: Outcome = rng() < 0.5 ? "YES" : "NO";
    const biasStrength = 0.72 + rng() * 0.2; // 72%..92%
    const tradeCount = 8 + Math.floor(rng() * 5); // 8..12

    for (let t = 0; t < tradeCount; t++) {
      const agentId = BOT_AGENT_IDS[(mIdx + t) % BOT_AGENT_IDS.length];
      const outcome: Outcome = rng() < biasStrength ? bias : bias === "YES" ? "NO" : "YES";
      const collateralCoin = 1 + Math.floor(rng() * 4); // 1..4
      await executeTrade({ agentId, marketId, outcome, collateralCoin });
      // Ensure createdAt ordering is stable for "recent trades" lists.
      await sleep(5);
    }
  }

  // Ensure every bot has at least a couple open positions.
  const openMarketIds = marketIds.slice(0, 6);
  for (let i = 0; i < BOT_AGENT_IDS.length; i++) {
    const agentId = BOT_AGENT_IDS[i];
    const rng = mulberry32(9000 + i * 17);
    const mA = openMarketIds[i % openMarketIds.length];
    const mB = openMarketIds[(i + 2) % openMarketIds.length];
    await executeTrade({ agentId, marketId: mA, outcome: rng() < 0.6 ? "YES" : "NO", collateralCoin: 3 });
    await sleep(5);
    await executeTrade({ agentId, marketId: mB, outcome: rng() < 0.6 ? "NO" : "YES", collateralCoin: 2 });
    await sleep(5);
  }

  // DEMO_AGENT: 3 open positions.
  const demoOpen = [openMarketIds[0], openMarketIds[1], openMarketIds[2]].filter(Boolean);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: demoOpen[0], outcome: "YES", collateralCoin: 7 });
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: demoOpen[1], outcome: "NO", collateralCoin: 6 });
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: demoOpen[2], outcome: "YES", collateralCoin: 5 });

  // DEMO_AGENT: 4 markets in history (resolved) with wins + losses.
  const resolvedMarketIds = marketIds.slice(6);
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: resolvedMarketIds[0], outcome: "YES", collateralCoin: 6 });
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: resolvedMarketIds[1], outcome: "YES", collateralCoin: 6 });
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: resolvedMarketIds[2], outcome: "NO", collateralCoin: 6 });
  await sleep(5);
  await executeTrade({ agentId: DEMO_AGENT_ID, marketId: resolvedMarketIds[3], outcome: "NO", collateralCoin: 6 });
  await sleep(5);

  await resolveMarket({ marketId: resolvedMarketIds[0], outcome: "YES" }); // win
  await resolveMarket({ marketId: resolvedMarketIds[1], outcome: "NO" }); // lose
  await resolveMarket({ marketId: resolvedMarketIds[2], outcome: "YES" }); // lose
  await resolveMarket({ marketId: resolvedMarketIds[3], outcome: "NO" }); // win
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
