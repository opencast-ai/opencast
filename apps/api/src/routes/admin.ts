import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/admin/resolve", async (req) => {
    const configured = process.env.ADMIN_TOKEN;
    if (!configured && process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("Admin disabled"), { statusCode: 403 });
    }
    if (configured) {
      const token = req.headers["x-admin-token"];
      if (typeof token !== "string" || token !== configured) {
        throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
      }
    }

    const body = z
      .object({
        marketId: z.string().uuid(),
        outcome: z.enum(["YES", "NO"])
      })
      .parse(req.body);

    const market = await prisma.market.findUnique({
      where: { id: body.marketId },
      include: { positions: true }
    });
    if (!market) throw Object.assign(new Error("Market not found"), { statusCode: 404 });
    if (market.status !== "OPEN") throw Object.assign(new Error("Market not open"), { statusCode: 400 });

    await prisma.$transaction(async (tx) => {
      for (const pos of market.positions) {
        const payout = body.outcome === "YES" ? pos.yesSharesMicros : pos.noSharesMicros;
        if (payout > 0n) {
          if (pos.agentId) {
            await tx.agent.update({
              where: { id: pos.agentId },
              data: { balanceMicros: { increment: payout } }
            });
          } else if (pos.userId) {
            await tx.user.update({
              where: { id: pos.userId },
              data: { balanceMicros: { increment: payout } }
            });
          }
        }

        await tx.position.update({
          where: { id: pos.id },
          data: { yesSharesMicros: 0n, noSharesMicros: 0n }
        });
      }

      await tx.market.update({
        where: { id: body.marketId },
        data: {
          status: "RESOLVED",
          outcome: body.outcome
        }
      });
    });

    return { ok: true };
  });
}
