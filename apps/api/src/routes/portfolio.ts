import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { requireAccount } from "../auth.js";
import { prisma } from "../db.js";
import { microsToCoinNumber } from "../constants.js";
import { quotePriceYes } from "../amm/fpmm.js";

function pricesForMarket(params: {
  status: string;
  outcome: string;
  yesMicros?: bigint;
  noMicros?: bigint;
}): { priceYes: number; priceNo: number } {
  if (params.status === "RESOLVED") {
    if (params.outcome === "YES") return { priceYes: 1, priceNo: 0 };
    if (params.outcome === "NO") return { priceYes: 0, priceNo: 1 };
  }

  if (typeof params.yesMicros === "bigint" && typeof params.noMicros === "bigint") {
    const priceYes = quotePriceYes({ yesMicros: params.yesMicros, noMicros: params.noMicros });
    return { priceYes, priceNo: 1 - priceYes };
  }

  return { priceYes: 0.5, priceNo: 0.5 };
}

type PortfolioOwner =
  | { accountType: "AGENT"; agentId: string }
  | { accountType: "HUMAN"; userId: string };

async function buildPortfolio(owner: PortfolioOwner) {
  const [balanceMicros, positions, trades] = await Promise.all([
    owner.accountType === "AGENT"
      ? prisma.agent
          .findUnique({ where: { id: owner.agentId }, select: { balanceMicros: true } })
          .then((a) => a?.balanceMicros ?? null)
      : prisma.user
          .findUnique({ where: { id: owner.userId }, select: { balanceMicros: true } })
          .then((u) => u?.balanceMicros ?? null),
    prisma.position.findMany({
      where: owner.accountType === "AGENT" ? { agentId: owner.agentId } : { userId: owner.userId },
      include: {
        market: {
          include: { pool: true }
        }
      }
    }),
    prisma.trade.findMany({
      where: owner.accountType === "AGENT" ? { agentId: owner.agentId } : { userId: owner.userId },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            status: true,
            outcome: true
          }
        }
      }
    })
  ]);

  if (balanceMicros === null) {
    throw Object.assign(new Error(owner.accountType === "AGENT" ? "Agent not found" : "User not found"), { statusCode: 404 });
  }

  const costBasisByMarketId = new Map<string, bigint>();
  const yesSharesByMarketId = new Map<string, bigint>();
  const noSharesByMarketId = new Map<string, bigint>();

  const historyAgg = new Map<
    string,
    {
      marketId: string;
      title: string;
      status: string;
      outcome: string;
      costMicros: bigint;
      yesSharesMicros: bigint;
      noSharesMicros: bigint;
      lastTradeAt: Date;
    }
  >();

  for (const t of trades) {
    costBasisByMarketId.set(t.marketId, (costBasisByMarketId.get(t.marketId) ?? 0n) + t.collateralInMicros);
    if (t.side === "YES") {
      yesSharesByMarketId.set(t.marketId, (yesSharesByMarketId.get(t.marketId) ?? 0n) + t.sharesOutMicros);
    } else {
      noSharesByMarketId.set(t.marketId, (noSharesByMarketId.get(t.marketId) ?? 0n) + t.sharesOutMicros);
    }

    const prev = historyAgg.get(t.marketId);
    const next = prev
      ? prev
      : {
          marketId: t.marketId,
          title: t.market.title,
          status: t.market.status,
          outcome: t.market.outcome,
          costMicros: 0n,
          yesSharesMicros: 0n,
          noSharesMicros: 0n,
          lastTradeAt: t.createdAt
        };

    next.title = t.market.title;
    next.status = t.market.status;
    next.outcome = t.market.outcome;
    next.costMicros += t.collateralInMicros;
    if (t.side === "YES") next.yesSharesMicros += t.sharesOutMicros;
    if (t.side === "NO") next.noSharesMicros += t.sharesOutMicros;
    if (t.createdAt > next.lastTradeAt) next.lastTradeAt = t.createdAt;
    historyAgg.set(t.marketId, next);
  }

  const positionRows = positions
    .filter((p) => p.yesSharesMicros > 0n || p.noSharesMicros > 0n)
    .map((p) => {
      const pool = p.market.pool;
      const { priceYes, priceNo } = pricesForMarket({
        status: p.market.status,
        outcome: p.market.outcome,
        yesMicros: pool?.yesSharesMicros,
        noMicros: pool?.noSharesMicros
      });

      const yesSharesCoin = microsToCoinNumber(p.yesSharesMicros);
      const noSharesCoin = microsToCoinNumber(p.noSharesMicros);

      const yesValue = yesSharesCoin * priceYes;
      const noValue = noSharesCoin * priceNo;

      const markToMarketCoin = yesValue + noValue;
      const costBasisCoin = microsToCoinNumber(costBasisByMarketId.get(p.marketId) ?? 0n);

      return {
        marketId: p.marketId,
        title: p.market.title,
        status: p.market.status,
        outcome: p.market.outcome,
        yesSharesCoin,
        noSharesCoin,
        markToMarketCoin,
        costBasisCoin,
        unrealizedPnlCoin: markToMarketCoin - costBasisCoin
      };
    });

  // Calculate total equity: balance + sum of markToMarket for all positions
  const totalMarkToMarketCoin = positionRows.reduce(
    (sum, pos) => sum + pos.markToMarketCoin,
    0
  );
  const totalEquityCoin = microsToCoinNumber(balanceMicros) + totalMarkToMarketCoin;

  const history = Array.from(historyAgg.values())
    .filter((h) => h.status === "RESOLVED" && (h.outcome === "YES" || h.outcome === "NO"))
    .sort((a, b) => b.lastTradeAt.getTime() - a.lastTradeAt.getTime())
    .slice(0, 25)
    .map((h) => {
      const payoutMicros = h.outcome === "YES" ? h.yesSharesMicros : h.noSharesMicros;
      const realizedPnlMicros = payoutMicros - h.costMicros;
      return {
        marketId: h.marketId,
        title: h.title,
        outcome: h.outcome,
        costBasisCoin: microsToCoinNumber(h.costMicros),
        payoutCoin: microsToCoinNumber(payoutMicros),
        realizedPnlCoin: microsToCoinNumber(realizedPnlMicros),
        result: realizedPnlMicros >= 0n ? "WIN" : "LOSE",
        lastTradeAt: h.lastTradeAt
      };
    })
    .slice(0, 4);

  const baseResponse = {
    balanceCoin: microsToCoinNumber(balanceMicros),
    totalEquityCoin,
    positions: positionRows,
    history
  };

  return owner.accountType === "AGENT"
    ? {
        accountType: "AGENT" as const,
        agentId: owner.agentId,
        ...baseResponse
      }
    : {
        accountType: "HUMAN" as const,
        userId: owner.userId,
        ...baseResponse
      };
}

export async function registerPortfolioRoutes(app: FastifyInstance) {
  app.get("/portfolio", {
    schema: {
      tags: ["Portfolio"],
      summary: "Get my portfolio",
      description: "Returns balance, positions, total equity, and trade history for the authenticated account",
      security: [{ apiKey: [] }]
    }
  }, async (req) => {
    const account = await requireAccount(req);
    if (typeof account.agentId === "string") {
      return buildPortfolio({ accountType: "AGENT", agentId: account.agentId });
    }
    return buildPortfolio({ accountType: "HUMAN", userId: account.userId });
  });

  // Public portfolio view (for demo / profile pages).
  app.get("/agents/:agentId/portfolio", {
    schema: {
      tags: ["Portfolio"],
      summary: "Get agent's public portfolio",
      description: "Returns public portfolio information for an agent"
    }
  }, async (req) => {
    const params = z.object({ agentId: z.string().uuid() }).parse(req.params);
    return buildPortfolio({ accountType: "AGENT", agentId: params.agentId });
  });
}
