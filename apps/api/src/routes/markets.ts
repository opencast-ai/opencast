import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { quotePriceYes } from "../amm/fpmm.js";
import { microsToCoinNumber } from "../constants.js";

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

export async function registerMarketRoutes(app: FastifyInstance) {
  app.get("/markets", {
    schema: {
      tags: ["Markets"],
      summary: "List all markets",
      description: "Get all available prediction markets with current prices"
    }
  }, async () => {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: "desc" },
      include: { pool: true }
    });

    return markets.map((m) => {
      const pool = m.pool;
      const { priceYes, priceNo } = pricesForMarket({
        status: m.status,
        outcome: m.outcome,
        yesMicros: pool?.yesSharesMicros,
        noMicros: pool?.noSharesMicros
      });
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        outcome: m.outcome,
        priceYes,
        priceNo
      };
    });
  });

  app.get("/markets/:id", {
    schema: {
      tags: ["Markets"],
      summary: "Get market details",
      description: "Get detailed information about a specific market"
    }
  }, async (req) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const market = await prisma.market.findUnique({
      where: { id: params.id },
      include: { pool: true }
    });
    if (!market) {
      throw Object.assign(new Error("Market not found"), { statusCode: 404 });
    }

    const pool = market.pool;
    const { priceYes, priceNo } = pricesForMarket({
      status: market.status,
      outcome: market.outcome,
      yesMicros: pool?.yesSharesMicros,
      noMicros: pool?.noSharesMicros
    });
    return {
      id: market.id,
      title: market.title,
      description: market.description,
      status: market.status,
      outcome: market.outcome,
      priceYes,
      priceNo
    };
  });

  app.get("/markets/:id/trades", async (req) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).optional()
      })
      .parse(req.query);

    const limit = query.limit ?? 25;

    const trades = await prisma.trade.findMany({
      where: { marketId: params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        agent: { select: { displayName: true } },
        user: { select: { xHandle: true, xName: true, xAvatar: true } }
      }
    });

    return trades.map((t) => {
      const priceYesAfter = quotePriceYes({ yesMicros: t.poolYesSharesMicros, noMicros: t.poolNoSharesMicros });
      const accountType = t.userId ? "HUMAN" : "AGENT";
      const traderId = t.userId ?? t.agentId;
      const traderDisplayName = t.userId ? t.user?.xName ?? t.user?.xHandle ?? null : t.agent?.displayName ?? null;
      return {
        id: t.id,
        createdAt: t.createdAt,
        accountType,
        traderId,
        traderDisplayName,
        xHandle: t.user?.xHandle ?? null,
        xAvatar: t.user?.xAvatar ?? null,
        side: t.side,
        // In a binary prediction market, BUY_NO is equivalent to SELL_YES.
        action: t.side === "YES" ? "BUY" : "SELL",
        volumeCoin: microsToCoinNumber(t.collateralInMicros),
        sharesOutCoin: microsToCoinNumber(t.sharesOutMicros),
        priceYesAfter
      };
    });
  });
}
