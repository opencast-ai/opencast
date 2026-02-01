import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { quoteBuyBinaryFpmm, quotePriceYes } from "../amm/fpmm.js";
import { coinToMicros, microsToCoinNumber } from "../constants.js";
import { prisma } from "../db.js";

export async function registerQuoteRoutes(app: FastifyInstance) {
  app.post("/quote", async (req) => {
    const body = z
      .object({
        marketId: z.string().uuid(),
        outcome: z.enum(["YES", "NO"]),
        collateralCoin: z.number().int().positive()
      })
      .parse(req.body);

    const market = await prisma.market.findUnique({
      where: { id: body.marketId },
      include: { pool: true }
    });

    if (!market || !market.pool) {
      throw Object.assign(new Error("Market not found"), { statusCode: 404 });
    }

    if (market.status !== "OPEN") {
      throw Object.assign(new Error("Market is not open"), { statusCode: 400 });
    }

    const pool = market.pool;
    const collateralInMicros = coinToMicros(body.collateralCoin);

    const priceYesBefore = quotePriceYes({ yesMicros: pool.yesSharesMicros, noMicros: pool.noSharesMicros });
    const quote = quoteBuyBinaryFpmm({
      pool: {
        yesMicros: pool.yesSharesMicros,
        noMicros: pool.noSharesMicros,
        feeBps: pool.feeBps
      },
      outcome: body.outcome,
      collateralInMicros
    });
    const priceYesAfter = quotePriceYes({ yesMicros: quote.nextPool.yesMicros, noMicros: quote.nextPool.noMicros });

    return {
      feeCoin: microsToCoinNumber(quote.feeMicros),
      netCollateralCoin: microsToCoinNumber(quote.netCollateralMicros),
      sharesOutCoin: microsToCoinNumber(quote.sharesOutMicros),
      priceYesBefore,
      priceNoBefore: 1 - priceYesBefore,
      priceYesAfter,
      priceNoAfter: 1 - priceYesAfter
    };
  });
}
