import { z } from "zod";

import { quoteBuyBinaryFpmm } from "../amm/fpmm.js";
import { coinToMicros, microsToCoinNumber } from "../constants.js";
import { prisma } from "../db.js";

type AccountRef = { agentId: string; userId?: undefined } | { userId: string; agentId?: undefined };

export type ExecuteTradeInput = {
  account: AccountRef;
  body: unknown;
};

export type ExecuteTradeResult = {
  tradeId: string;
  feeCoin: number;
  sharesOutCoin: number;
  balanceCoin: number;
  position: {
    yesSharesCoin: number;
    noSharesCoin: number;
  };
};

export async function executeTrade(input: ExecuteTradeInput): Promise<ExecuteTradeResult> {
  const body = z
    .object({
      marketId: z.string().uuid(),
      outcome: z.enum(["YES", "NO"]),
      collateralCoin: z.number().int().positive()
    })
    .parse(input.body);

  const agentId = ("agentId" in input.account && input.account.agentId) ? input.account.agentId : null;
  const userId = ("userId" in input.account && input.account.userId) ? input.account.userId : null;

  if (!agentId && !userId) {
    throw Object.assign(new Error("Invalid account"), { statusCode: 401 });
  }

  const ownerPromise = agentId
    ? prisma.agent.findUnique({ where: { id: agentId }, select: { balanceMicros: true } })
    : prisma.user.findUnique({ where: { id: userId as string }, select: { balanceMicros: true } });

  const collateralInMicros = coinToMicros(body.collateralCoin);

  const [owner, market] = await Promise.all([
    ownerPromise,
    prisma.market.findUnique({ where: { id: body.marketId }, include: { pool: true } })
  ]);

  if (!owner) {
    throw Object.assign(new Error(agentId ? "Agent not found" : "User not found"), { statusCode: 404 });
  }
  if (!market || !market.pool) {
    throw Object.assign(new Error("Market not found"), { statusCode: 404 });
  }
  if (market.status !== "OPEN") {
    throw Object.assign(new Error("Market is not open"), { statusCode: 400 });
  }
  if (owner.balanceMicros < collateralInMicros) {
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

    const updatedOwner = agentId
      ? await tx.agent.update({
          where: { id: agentId },
          data: {
            balanceMicros: owner.balanceMicros - quote.collateralInMicros
          },
          select: {
            id: true,
            balanceMicros: true
          }
        })
      : await tx.user.update({
          where: { id: userId as string },
          data: {
            balanceMicros: owner.balanceMicros - quote.collateralInMicros
          },
          select: {
            id: true,
            balanceMicros: true
          }
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
      where: agentId
        ? {
            agentId_marketId: {
              agentId,
              marketId: body.marketId
            }
          }
        : {
            userId_marketId: {
              userId: userId as string,
              marketId: body.marketId
            }
          },
      create: agentId
        ? {
            agentId,
            marketId: body.marketId,
            yesSharesMicros: body.outcome === "YES" ? quote.sharesOutMicros : 0n,
            noSharesMicros: body.outcome === "NO" ? quote.sharesOutMicros : 0n
          }
        : {
            userId: userId as string,
            marketId: body.marketId,
            yesSharesMicros: body.outcome === "YES" ? quote.sharesOutMicros : 0n,
            noSharesMicros: body.outcome === "NO" ? quote.sharesOutMicros : 0n
          },
      update: {
        yesSharesMicros: body.outcome === "YES" ? { increment: quote.sharesOutMicros } : undefined,
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
        userId,
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

    return { updatedOwner, position, tradeId: trade.id };
  });

  return {
    tradeId: result.tradeId,
    feeCoin: microsToCoinNumber(quote.feeMicros),
    sharesOutCoin: microsToCoinNumber(quote.sharesOutMicros),
    balanceCoin: microsToCoinNumber(result.updatedOwner.balanceMicros),
    position: {
      yesSharesCoin: microsToCoinNumber(result.position.yesSharesMicros),
      noSharesCoin: microsToCoinNumber(result.position.noSharesMicros)
    }
  };
}
