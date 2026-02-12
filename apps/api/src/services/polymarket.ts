import { prisma } from "../db.js";
import { MICROS_PER_COIN } from "../constants.js";
import { z } from "zod";
import { settleMarket } from "./settlement.js";

const POLYMARKET_API_URL = "https://gamma-api.polymarket.com/markets";

const JsonStringArray = z.preprocess((v) => {
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}, z.array(z.string()));

// Schema for Polymarket market response
export const PolymarketMarketSchema = z.object({
  id: z.string(),
  conditionId: z.string().optional(),
  question: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  endDate: z.string().datetime().optional(),
  outcomes: JsonStringArray,
  clobTokenIds: JsonStringArray.optional(),
  outcomePrices: z.string().optional(), // JSON string like "[\"0.65\",\"0.35\"]"
  volume: z.string().optional(),
  slug: z.string().optional(),
  // Status fields for settlement tracking
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  resolvedOutcome: z.string().optional() // e.g., "Yes", "No" when resolved
});

export type PolymarketMarket = z.infer<typeof PolymarketMarketSchema>;

export interface ForwardResult {
  forwarded: number;
  skipped: number;
  errors: string[];
}

export interface StatusSyncResult {
  checked: number;
  updated: number;
  resolved: number;
  errors: string[];
}

/**
 * Parse Polymarket outcome prices from JSON string.
 * Returns { yesPrice } in decimal format (0-1)
 */
export function parseOutcomePrices(outcomePricesJson: string | undefined): { yesPrice: number } | null {
  if (!outcomePricesJson) return null;

  try {
    const prices = JSON.parse(outcomePricesJson) as string[];
    if (prices.length < 2) return null;

    const yesPrice = parseFloat(prices[0]!);
    const noPrice = parseFloat(prices[1]!);

    if (isNaN(yesPrice) || isNaN(noPrice)) return null;
    if (yesPrice <= 0 || noPrice <= 0) return null;
    if (yesPrice >= 1 || noPrice >= 1) return null;

    void noPrice;

    return { yesPrice };
  } catch {
    return null;
  }
}

/**
 * Get YES token ID from Polymarket market
 */
export function getYesTokenId(pmMarket: PolymarketMarket): string | null {
  const tokenIds = pmMarket.clobTokenIds;
  if (!tokenIds || tokenIds.length < 2) return null;

  const outcomes = pmMarket.outcomes;
  const yesIndex = outcomes.findIndex((o) => o?.toLowerCase().includes("yes"));
  if (yesIndex < 0) return null;

  return tokenIds[yesIndex] ?? null;
}

/**
 * Validate if market is binary YES/NO
 */
export function isBinaryYesNoMarket(pmMarket: PolymarketMarket): boolean {
  if (pmMarket.outcomes.length !== 2) return false;
  const first = pmMarket.outcomes[0];
  const second = pmMarket.outcomes[1];
  if (!first || !second) return false;
  return first.toLowerCase().includes("yes") && second.toLowerCase().includes("no");
}

/**
 * Fetch a single market by slug from Polymarket API
 */
export async function fetchMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
  try {
    const url = new URL(`${POLYMARKET_API_URL}/${slug}`);
    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = PolymarketMarketSchema.safeParse(data);

    if (!parsed.success) {
      console.error("[Polymarket] Failed to parse market:", parsed.error);
      return null;
    }

    return parsed.data;
  } catch (err) {
    console.error(`[Polymarket] Failed to fetch market by slug ${slug}:`, err);
    return null;
  }
}

/**
 * Fetch top active markets by volume
 */
export async function fetchTopPolymarketMarkets(limit: number = 5): Promise<PolymarketMarket[]> {
  const url = new URL(POLYMARKET_API_URL);
  url.searchParams.append("closed", "false");
  url.searchParams.append("active", "true");
  url.searchParams.append("limit", "50");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = z.array(PolymarketMarketSchema).parse(data);

  // Filter for binary markets only
  const binaryMarkets = parsed.filter(isBinaryYesNoMarket);

  // Sort by volume
  const sorted = [...binaryMarkets].sort((a, b) => {
    const av = a.volume ? Number(a.volume) : 0;
    const bv = b.volume ? Number(b.volume) : 0;
    return bv - av;
  });

  return sorted.slice(0, limit);
}

/**
 * Check if market exists by external ID or source slug
 */
export async function marketExists(externalId: string, sourceSlug?: string): Promise<boolean> {
  const existing = await prisma.market.findFirst({
    where: {
      OR: [
        { externalId },
        ...(sourceSlug ? [{ sourceSlug }] : [])
      ]
    }
  });
  return existing !== null;
}

/**
 * Transform and validate Polymarket market data
 * Returns null if invalid (non-binary, missing prices, etc.)
 */
export interface TransformedMarket {
  title: string;
  description: string;
  closesAt: Date;
  externalId: string;
  sourceSlug: string;
  category: string;
  yesSharesMicros: bigint;
  noSharesMicros: bigint;
}

export function transformAndValidateMarket(pmMarket: PolymarketMarket): TransformedMarket | null {
  // Validate binary YES/NO
  if (!isBinaryYesNoMarket(pmMarket)) {
    return null;
  }

  const yesTokenId = getYesTokenId(pmMarket);
  if (!yesTokenId) {
    return null;
  }

  // Parse prices
  const prices = parseOutcomePrices(pmMarket.outcomePrices);
  if (!prices) {
    return null;
  }

  const { yesPrice } = prices;
  const totalLiquidity = BigInt(1000) * MICROS_PER_COIN;

  // Calculate shares for FPMM pool
  const yesSharesMicros = BigInt(Math.round((1 - yesPrice) * Number(totalLiquidity)));
  const noSharesMicros = BigInt(Math.round(yesPrice * Number(totalLiquidity)));

  // Ensure at least 1 micro in each side
  const finalYesShares = yesSharesMicros > 0n ? yesSharesMicros : 1n;
  const finalNoShares = noSharesMicros > 0n ? noSharesMicros : 1n;

  // Parse end date
  const closesAt = pmMarket.endDate
    ? new Date(pmMarket.endDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    title: pmMarket.question,
    description: pmMarket.description || `Synced from Polymarket. Original: https://polymarket.com/market/${pmMarket.slug || pmMarket.id}`,
    closesAt,
    externalId: yesTokenId,
    sourceSlug: pmMarket.slug || pmMarket.id,
    category: pmMarket.category || "Crypto",
    yesSharesMicros: finalYesShares,
    noSharesMicros: finalNoShares
  };
}

/**
 * Create a forwarded market in our database
 * Returns true if created, false if skipped (already exists)
 */
export async function upsertForwardedMarket(
  marketData: TransformedMarket
): Promise<{ created: boolean; marketId?: string; error?: string }> {
  try {
    // Check if already exists
    const exists = await marketExists(marketData.externalId, marketData.sourceSlug);
    if (exists) {
      return { created: false };
    }

    // Create market with pool
    const market = await prisma.market.create({
      data: {
        title: marketData.title,
        description: marketData.description,
        closesAt: marketData.closesAt,
        externalId: marketData.externalId,
        sourceSlug: marketData.sourceSlug,
        category: marketData.category,
        forwardedAt: new Date(),
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: marketData.yesSharesMicros,
            noSharesMicros: marketData.noSharesMicros,
            feeBps: 100
          }
        }
      }
    });

    return { created: true, marketId: market.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { created: false, error: errorMsg };
  }
}

/**
 * Forward markets by array of slugs
 */
export async function forwardMarketsBySlugs(slugs: string[]): Promise<ForwardResult> {
  const result: ForwardResult = {
    forwarded: 0,
    skipped: 0,
    errors: []
  };

  for (const slug of slugs) {
    try {
      // Fetch from Polymarket
      const pmMarket = await fetchMarketBySlug(slug);
      if (!pmMarket) {
        result.errors.push(`Market not found: ${slug}`);
        continue;
      }

      // Transform and validate
      const marketData = transformAndValidateMarket(pmMarket);
      if (!marketData) {
        result.errors.push(`Invalid market (non-binary or missing data): ${slug}`);
        continue;
      }

      // Upsert (create if not exists)
      const { created, error } = await upsertForwardedMarket(marketData);
      if (error) {
        result.errors.push(`Failed to create ${slug}: ${error}`);
      } else if (created) {
        result.forwarded++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Error processing ${slug}: ${errorMsg}`);
    }
  }

  return result;
}

/**
 * Sync settlement status from Polymarket for forwarded markets
 * Returns markets that were resolved (for settlement triggering)
 */
export async function syncSettlementStatus(): Promise<{
  result: StatusSyncResult;
  resolvedMarkets: Array<{ marketId: string; outcome: "YES" | "NO" }>;
}> {
  const result: StatusSyncResult = {
    checked: 0,
    updated: 0,
    resolved: 0,
    errors: []
  };

  const resolvedMarkets: Array<{ marketId: string; outcome: "YES" | "NO" }> = [];

  // Get all forwarded markets that are still open
  const forwardedMarkets = await prisma.market.findMany({
    where: {
      sourceSlug: { not: null },
      status: "OPEN"
    }
  });

  for (const market of forwardedMarkets) {
    try {
      result.checked++;

      if (!market.sourceSlug) continue;

      // Fetch current status from Polymarket
      const pmMarket = await fetchMarketBySlug(market.sourceSlug);
      if (!pmMarket) {
        result.errors.push(`Could not fetch status for ${market.sourceSlug}`);
        continue;
      }

      // Check if resolved
      if (pmMarket.closed && pmMarket.resolvedOutcome) {
        const outcome = pmMarket.resolvedOutcome.toLowerCase().includes("yes")
          ? "YES"
          : pmMarket.resolvedOutcome.toLowerCase().includes("no")
            ? "NO"
            : null;

        if (outcome) {
          // Use settlement service to resolve and payout (idempotent)
          const settlementResult = await settleMarket(market.id, outcome);

          if (settlementResult.success) {
            result.resolved++;
            result.updated++;
            resolvedMarkets.push({ marketId: market.id, outcome });
          } else {
            result.errors.push(`Settlement failed for ${market.sourceSlug}: ${settlementResult.error}`);
          }
        }
      } else if (pmMarket.closed && !pmMarket.active) {
        // Market closed but not yet resolved
        // Could update to a "CLOSED" status if needed
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Error syncing ${market.sourceSlug}: ${errorMsg}`);
    }
  }

  return { result, resolvedMarkets };
}
