import { prisma } from "../db.js";

import { coinToMicros, STARTING_BALANCE_MICROS } from "../constants.js";
import { executeTrade } from "../services/executeTrade.js";

type Outcome = "YES" | "NO";

const BOT_AGENT_IDS = [
  "00000000-0000-0000-0000-000000000101",
  "00000000-0000-0000-0000-000000000102",
  "00000000-0000-0000-0000-000000000103",
  "00000000-0000-0000-0000-000000000104",
  "00000000-0000-0000-0000-000000000105"
];

const BOT_DISPLAY_NAMES = ["BOT_TRADER_ALPHA", "BOT_TRADER_BETA", "BOT_TRADER_GAMMA", "BOT_TRADER_DELTA", "BOT_TRADER_EPSILON"];

const TRADE_SPACING_MS = 100;
const COLLATERAL_MIN_COIN = 1;
const COLLATERAL_MAX_COIN = 5;

// With 100ms spacing, a 5-second cadence can fit ~50 trades without overlap.
const MAX_TRADES_PER_CYCLE = 50;

let botTraderRunning = false;
let botIdx = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = tmp as T;
  }
}

function envEnabled(): boolean {
  return process.env.BOT_TRADER_ENABLED === "true";
}

function nextBotAgentId(): string {
  const id = BOT_AGENT_IDS[botIdx % BOT_AGENT_IDS.length];
  botIdx++;
  return id as string;
}

function randomOutcome(): Outcome {
  return Math.random() < 0.5 ? "YES" : "NO";
}

function randomCollateralCoin(): number {
  return COLLATERAL_MIN_COIN + Math.floor(Math.random() * (COLLATERAL_MAX_COIN - COLLATERAL_MIN_COIN + 1));
}

async function ensureBotAgents(): Promise<void> {
  // Create bots if missing. Give them a starter balance suitable for sustained sim.
  // Dev-only (env gated), so we optimize for reliability over realism.
  const minBalanceMicros = coinToMicros(1_000);
  const targetBalanceMicros = coinToMicros(10_000);

  for (let i = 0; i < BOT_AGENT_IDS.length; i++) {
    const id = BOT_AGENT_IDS[i] as string;
    const displayName = BOT_DISPLAY_NAMES[i] ?? `BOT_TRADER_${i}`;

    const existing = await prisma.agent.findUnique({ where: { id }, select: { id: true, balanceMicros: true } });
    if (!existing) {
      await prisma.agent.create({
        data: {
          id,
          displayName,
          balanceMicros: targetBalanceMicros > STARTING_BALANCE_MICROS ? targetBalanceMicros : STARTING_BALANCE_MICROS
        }
      });
      continue;
    }

    if (existing.balanceMicros < minBalanceMicros) {
      await prisma.agent.update({
        where: { id },
        data: { balanceMicros: targetBalanceMicros }
      });
    }
  }
}

export async function runBotTraderCycle(): Promise<void> {
  if (!envEnabled()) return;
  if (botTraderRunning) return;

  botTraderRunning = true;
  try {
    await ensureBotAgents();

    const openMarkets = await prisma.market.findMany({
      where: { status: "OPEN" },
      select: { id: true }
    });

    if (openMarkets.length === 0) return;

    const selected: string[] = [];
    for (const m of openMarkets) {
      if (Math.random() < 0.5) selected.push(m.id);
    }

    if (selected.length === 0) {
      selected.push(openMarkets[Math.floor(Math.random() * openMarkets.length)]!.id);
    }

    shuffleInPlace(selected);
    const toTrade = selected.slice(0, MAX_TRADES_PER_CYCLE);

    for (const marketId of toTrade) {
      const agentId = nextBotAgentId();
      const outcome = randomOutcome();
      const collateralCoin = randomCollateralCoin();

      try {
        await executeTrade({
          account: { agentId },
          body: { marketId, outcome, collateralCoin }
        });
      } catch (err) {
        console.warn(
          `[BotTrader] Trade failed (agent=${agentId} market=${marketId} outcome=${outcome} coin=${collateralCoin}):`,
          err instanceof Error ? err.message : String(err)
        );
      }

      await sleep(TRADE_SPACING_MS);
    }
  } finally {
    botTraderRunning = false;
  }
}
