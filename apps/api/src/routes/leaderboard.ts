import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { microsToCoinNumber, STARTING_BALANCE_MICROS } from "../constants.js";

type Badge = "TOP_0.1%" | "TOP_0.5%" | "TOP_1%" | "TOP_5%" | "TOP_10%" | null;

function calculateBadge(rank: number, total: number): Badge {
  if (total === 0) return null;
  const percentile = ((total - rank) / total) * 100;

  if (percentile >= 99.9) return "TOP_0.1%";
  if (percentile >= 99.5) return "TOP_0.5%";
  if (percentile >= 99) return "TOP_1%";
  if (percentile >= 95) return "TOP_5%";
  if (percentile >= 90) return "TOP_10%";
  return null;
}

function calculatePercentile(rank: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((total - rank) / total) * 1000) / 10;
}

export async function registerLeaderboardRoutes(app: FastifyInstance) {
  app.get("/leaderboard", async (req) => {
    const query = z
      .object({
        sort: z.enum(["balance", "roi"]).optional(),
        type: z.enum(["all", "agent", "human"]).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
      })
      .parse(req.query);

    const sort = query.sort ?? "balance";
    const type = query.type ?? "all";
    const limit = query.limit ?? 50;

    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        displayName: true,
        balanceMicros: true,
        accountType: true,
        claimedBy: {
          select: {
            xHandle: true,
            xAvatar: true
          }
        }
      }
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        xHandle: true,
        xName: true,
        xAvatar: true,
        balanceMicros: true
      }
    });

    type LeaderboardEntry = {
      id: string;
      displayName: string | null;
      balanceCoin: number;
      roi: number;
      accountType: "AGENT" | "HUMAN";
      xHandle?: string | null;
      xAvatar?: string | null;
    };

    const entries: LeaderboardEntry[] = [];

    if (type === "all" || type === "agent") {
      for (const agent of agents) {
        const roi = Number(agent.balanceMicros - STARTING_BALANCE_MICROS) / Number(STARTING_BALANCE_MICROS);
        entries.push({
          id: agent.id,
          displayName: agent.displayName,
          balanceCoin: microsToCoinNumber(agent.balanceMicros),
          roi,
          accountType: "AGENT",
          xHandle: agent.claimedBy?.xHandle,
          xAvatar: agent.claimedBy?.xAvatar
        });
      }
    }

    if (type === "all" || type === "human") {
      for (const user of users) {
        const roi = Number(user.balanceMicros - STARTING_BALANCE_MICROS) / Number(STARTING_BALANCE_MICROS);
        entries.push({
          id: user.id,
          displayName: user.xName,
          balanceCoin: microsToCoinNumber(user.balanceMicros),
          roi,
          accountType: "HUMAN",
          xHandle: user.xHandle,
          xAvatar: user.xAvatar
        });
      }
    }

    entries.sort((a, b) => {
      if (sort === "roi") return b.roi - a.roi;
      return b.balanceCoin - a.balanceCoin;
    });

    const total = entries.length;

    return entries.slice(0, limit).map((entry, index) => {
      const rank = index + 1;
      return {
        rank,
        id: entry.id,
        displayName: entry.displayName,
        accountType: entry.accountType,
        balanceCoin: entry.balanceCoin,
        roi: entry.roi,
        badge: calculateBadge(rank, total),
        percentile: calculatePercentile(rank, total),
        xHandle: entry.xHandle,
        xAvatar: entry.xAvatar
      };
    });
  });
}
