import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { microsToCoinNumber, STARTING_BALANCE_MICROS } from "../constants.js";

export async function registerLeaderboardRoutes(app: FastifyInstance) {
  app.get("/leaderboard", async (req) => {
    const query = z
      .object({
        sort: z.enum(["balance", "roi"]).optional()
      })
      .parse(req.query);
    const sort = query.sort ?? "balance";

    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        displayName: true,
        balanceMicros: true
      }
    });

    const withRoi = agents.map((a) => {
      const roi = Number(a.balanceMicros - STARTING_BALANCE_MICROS) / Number(STARTING_BALANCE_MICROS);
      return {
        agentId: a.id,
        displayName: a.displayName,
        balanceCoin: microsToCoinNumber(a.balanceMicros),
        roi
      };
    });

    withRoi.sort((a, b) => {
      if (sort === "roi") return b.roi - a.roi;
      return b.balanceCoin - a.balanceCoin;
    });

    return withRoi;
  });
}
