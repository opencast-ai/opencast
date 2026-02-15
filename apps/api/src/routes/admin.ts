import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { syncPolymarketMarkets } from "../jobs/syncPolymarket.js";
import { forwardMarketsBySlugs, syncSettlementStatus } from "../services/polymarket.js";
import { settleMarket } from "../services/settlement.js";

function requireAdmin(req: { headers: Record<string, string | string[] | undefined> }) {
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
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/admin/resolve", async (req) => {
    requireAdmin(req);

    const body = z
      .object({
        marketId: z.string().uuid(),
        outcome: z.enum(["YES", "NO"])
      })
      .parse(req.body);

    // Use shared settlement service (idempotent)
    const result = await settleMarket(body.marketId, body.outcome);

    if (!result.success) {
      throw Object.assign(new Error(result.error || "Settlement failed"), { statusCode: 400 });
    }

    return {
      ok: true,
      marketId: result.marketId,
      outcome: result.outcome,
      payouts: result.payouts.map(p => ({
        ...p,
        amountCoin: Number(p.amountMicros) / 1_000_000
      }))
    };
  });

  /**
   * POST /admin/markets/settle
   * Manual settlement endpoint (alternative to /admin/resolve)
   * Settles a specific market with given outcome
   */
  app.post("/admin/markets/settle", {
    schema: {
      tags: ["Admin"],
      summary: "Settle a market (admin only)",
      description: "Manually resolve a market and pay out winners",
      security: [{ adminToken: [] }],
      body: {
        type: "object",
        required: ["marketId", "outcome"],
        properties: {
          marketId: { type: "string", description: "Market UUID" },
          outcome: { type: "string", enum: ["YES", "NO"], description: "Winning outcome" }
        }
      }
    }
  }, async (req) => {
    requireAdmin(req);

    const body = z
      .object({
        marketId: z.string().uuid(),
        outcome: z.enum(["YES", "NO"])
      })
      .parse(req.body);

    const result = await settleMarket(body.marketId, body.outcome);

    if (!result.success) {
      throw Object.assign(new Error(result.error || "Settlement failed"), { statusCode: 400 });
    }

    return {
      success: true,
      marketId: result.marketId,
      outcome: result.outcome,
      payouts: result.payouts.map(p => ({
        ...p,
        amountCoin: Number(p.amountMicros) / 1_000_000
      })),
      alreadyResolved: result.payouts.length === 0 && result.error?.includes("already resolved")
    };
  });

  app.post("/admin/sync-polymarket", async (req) => {
    requireAdmin(req);
    const result = await syncPolymarketMarkets();
    return result;
  });

  /**
   * POST /admin/markets/forward
   * Manually forward markets from Polymarket by array of slugs
   * Accepts: { slugs: ["will-bitcoin-hit-100k", "..."] }
   * Returns: { forwarded: number, skipped: number, errors: string[] }
   */
  app.post("/admin/markets/forward", {
    schema: {
      tags: ["Admin"],
      summary: "Forward markets from Polymarket (admin only)",
      description: "Import markets from Polymarket by their slugs",
      security: [{ adminToken: [] }],
      body: {
        type: "object",
        required: ["slugs"],
        properties: {
          slugs: {
            type: "array",
            items: { type: "string" },
            description: "Array of Polymarket market slugs"
          }
        }
      }
    }
  }, async (req) => {
    requireAdmin(req);

    const body = z
      .object({
        slugs: z.array(z.string().min(1)).min(1).max(10)
      })
      .parse(req.body);

    const result = await forwardMarketsBySlugs(body.slugs);
    return result;
  });

  /**
   * POST /admin/markets/sync-status
   * Sync settlement status from Polymarket for forwarded markets
   * Polls Polymarket status and AUTO-TRIGGERS settlement for resolved markets
   * Returns: { checked: number, updated: number, resolved: number, errors: string[], settlements: [...] }
   */
  app.post("/admin/markets/sync-status", async (req) => {
    requireAdmin(req);

    const { result, resolvedMarkets } = await syncSettlementStatus();

    // Auto-trigger settlement for resolved markets
    const settlements = [];
    for (const { marketId, outcome } of resolvedMarkets) {
      try {
        const settlementResult = await settleMarket(marketId, outcome);
        settlements.push({
          marketId,
          outcome,
          success: settlementResult.success,
          payouts: settlementResult.payouts.map(p => ({
            ...p,
            amountCoin: Number(p.amountMicros) / 1_000_000
          })),
          error: settlementResult.error
        });
      } catch (err) {
        settlements.push({
          marketId,
          outcome,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return {
      ...result,
      settlements
    };
  });
}
