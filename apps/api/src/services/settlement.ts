import { prisma } from "../db.js";
import type { MarketOutcome } from "@prisma/client";

export interface SettlementResult {
  success: boolean;
  marketId: string;
  outcome: MarketOutcome;
  payouts: Array<{
    userId?: string;
    agentId?: string;
    amountMicros: bigint;
  }>;
  error?: string;
}

/**
 * Settle a market and pay out winners
 * This function is IDEMPOTENT - calling it multiple times is safe
 * 
 * @param marketId - The market to settle
 * @param outcome - YES or NO
 * @returns SettlementResult with payout details
 */
export async function settleMarket(
  marketId: string,
  outcome: "YES" | "NO"
): Promise<SettlementResult> {
  // First, check if market exists and is open
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { positions: true }
  });

  if (!market) {
    return {
      success: false,
      marketId,
      outcome: outcome === "YES" ? "YES" : "NO",
      payouts: [],
      error: "Market not found"
    };
  }

  // Idempotency check: if already resolved with same outcome, return early
  if (market.status === "RESOLVED") {
    if (market.outcome === outcome) {
      // Already settled with this outcome - return success but no payouts
      return {
        success: true,
        marketId,
        outcome: market.outcome,
        payouts: [],
        error: "Market already resolved with this outcome"
      };
    } else {
      // Trying to resolve with different outcome - error
      return {
        success: false,
        marketId,
        outcome: market.outcome,
        payouts: [],
        error: `Market already resolved with different outcome: ${market.outcome}`
      };
    }
  }

  // Perform settlement in transaction
  const result = await prisma.$transaction(async (tx) => {
    const payouts: Array<{
      userId?: string;
      agentId?: string;
      amountMicros: bigint;
    }> = [];

    // Process each position
    for (const pos of market.positions) {
      // Calculate payout based on outcome
      const payout = outcome === "YES" ? pos.yesSharesMicros : pos.noSharesMicros;

      if (payout > 0n) {
        // Pay winner
        if (pos.agentId) {
          // For agents, pay the owner (shared trader account)
          const agent = await tx.agent.findUnique({
            where: { id: pos.agentId },
            select: { ownerUserId: true }
          });

          if (agent?.ownerUserId) {
            // Pay the owner user
            await tx.user.update({
              where: { id: agent.ownerUserId },
              data: { balanceMicros: { increment: payout } }
            });
            payouts.push({ userId: agent.ownerUserId, amountMicros: payout });
          } else {
            // Agent has no owner - pay agent directly (fallback)
            await tx.agent.update({
              where: { id: pos.agentId },
              data: { balanceMicros: { increment: payout } }
            });
            payouts.push({ agentId: pos.agentId, amountMicros: payout });
          }
        } else if (pos.userId) {
          // Pay user directly
          await tx.user.update({
            where: { id: pos.userId },
            data: { balanceMicros: { increment: payout } }
          });
          payouts.push({ userId: pos.userId, amountMicros: payout });
        }
      }

      // Zero out position
      await tx.position.update({
        where: { id: pos.id },
        data: { yesSharesMicros: 0n, noSharesMicros: 0n }
      });
    }

    // Update market status
    await tx.market.update({
      where: { id: marketId },
      data: {
        status: "RESOLVED",
        outcome: outcome
      }
    });

    return { payouts };
  });

  return {
    success: true,
    marketId,
    outcome: outcome === "YES" ? "YES" : "NO",
    payouts: result.payouts
  };
}

/**
 * Check if a market can be traded (is open)
 */
export async function isMarketOpen(marketId: string): Promise<boolean> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { status: true }
  });
  return market?.status === "OPEN";
}
