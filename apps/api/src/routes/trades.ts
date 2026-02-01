import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { requireAgent } from "../auth.js";
import { quoteBuyBinaryFpmm } from "../amm/fpmm.js";
import { coinToMicros, microsToCoinNumber } from "../constants.js";
import { prisma } from "../db.js";

export async function registerTradeRoutes(app: FastifyInstance) {
  app.post("/trades", async (req) => {
    const { agentId } = await requireAgent(req);
    const body = z
      .object({
        marketId: z.string().uuid(),
        outcome: z.enum(["YES", "NO"]),
        collateralCoin: z.number().int().positive()
      })
      .parse(req.body);

    const collateralInMicros = coinToMicros(body.collateralCoin);

    const [agent, market] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentId } }),
      prisma.market.findUnique({ where: { id: body.marketId }, include: { pool: true } })
    ]);

    if (!agent) {
      throw Object.assign(new Error("Agent not found"), { statusCode: 404 });
    }
    if (!market || !market.pool) {
      throw Object.assign(new Error("Market not found"), { statusCode: 404 });
    }
    if (market.status !== "OPEN") {
      throw Object.assign(new Error("Market is not open"), { statusCode: 400 });
    }
    if (agent.balanceMicros < collateralInMicros) {
      throw Object.assign(new Error("Insufficient balance"), { statusCode: 400 });
    }

    const pool = market.pool;

    const quote = quoteBuyBinaryFpmm({
      pool: {
        yesMicros: pool.yesSharesMicros,
        noMicros: pool.noSharesMicros,
        feeBps: pool.feeBps
      },
      outcome: body.outcome,
      collateralInMicros
    });

    const result = await prisma.$transaction(async (tx) => {
      await tx.house.upsert({
        where: { id: "house" },
        create: { id: "house", treasuryMicros: quote.feeMicros },
        update: { treasuryMicros: { increment: quote.feeMicros } }
      });

      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          balanceMicros: agent.balanceMicros - quote.collateralInMicros
        },
        select: {
          id: true,
          balanceMicros: true
        }
      });

      await tx.house.upsert({
        where: { id: "house" },
        create: { id: "house", treasuryMicros: quote.feeMicros },
        update: { treasuryMicros: { increment: quote.feeMicros } }
      });

      const updatedPool = await tx.marketPool.update({
        where: { marketId: body.marketId },
        data: {
          collateralMicros: pool.collateralMicros + quote.netCollateralMicros,
          yesSharesMicros: quote.nextPool.yesMicros,
          noSharesMicros: quote.nextPool.noMicros
        },
        select: {
          collateralMicros: true,
          yesSharesMicros: true,
          noSharesMicros: true
        }
      });

      const position = await tx.position.upsert({
        where: {
          agentId_marketId: {
            agentId,
            marketId: body.marketId
          }
        },
        create: {
          agentId,
          marketId: body.marketId,
          yesSharesMicros: body.outcome === "YES" ? quote.sharesOutMicros : 0n,
          noSharesMicros: body.outcome === "NO" ? quote.sharesOutMicros : 0n
        },
        update: {
          yesSharesMicros:
            body.outcome === "YES" ? { increment: quote.sharesOutMicros } : undefined,
          noSharesMicros: body.outcome === "NO" ? { increment: quote.sharesOutMicros } : undefined
        },
        select: {
          yesSharesMicros: true,
          noSharesMicros: true
        }
      });

      const trade = await tx.trade.create({
        data: {
          agentId,
          marketId: body.marketId,
          side: body.outcome,
          collateralInMicros: quote.collateralInMicros,
          feeMicros: quote.feeMicros,
          sharesOutMicros: quote.sharesOutMicros,
          poolCollateralMicros: updatedPool.collateralMicros,
          poolYesSharesMicros: updatedPool.yesSharesMicros,
          poolNoSharesMicros: updatedPool.noSharesMicros
        },
        select: {
          id: true
        }
      });

      return { updatedAgent, updatedPool, position, tradeId: trade.id };
    });

    return {
      tradeId: result.tradeId,
      feeCoin: microsToCoinNumber(quote.feeMicros),
      sharesOutCoin: microsToCoinNumber(quote.sharesOutMicros),
      balanceCoin: microsToCoinNumber(result.updatedAgent.balanceMicros),
      position: {
        yesSharesCoin: microsToCoinNumber(result.position.yesSharesMicros),
        noSharesCoin: microsToCoinNumber(result.position.noSharesMicros)
      }
    };
  });
}
