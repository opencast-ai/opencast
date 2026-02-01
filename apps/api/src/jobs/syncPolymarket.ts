import { prisma } from "../db.js";
import { MICROS_PER_COIN } from "../constants.js";
import { z } from "zod";

const POLYMARKET_API_URL = "https://gamma-api.polymarket.com/markets";

// Schema for Polymarket market response
const PolymarketMarketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  endDate: z.string().datetime().optional(),
  outcomes: z.array(z.string()),
  outcomePrices: z.string().optional(), // JSON string like "[\"0.65\",\"0.35\"]"
  volume: z.string().optional(),
  slug: z.string().optional()
});

const PolymarketResponseSchema = z.array(PolymarketMarketSchema);

interface SyncResult {
  fetched: number;
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Parse Polymarket outcome prices from JSON string.
 * Returns { yesPrice, noPrice } in decimal format (0-1)
 */
function parseOutcomePrices(outcomePricesJson: string | undefined): { yesPrice: number; noPrice: number } | null {
  if (!outcomePricesJson) return null;
  
  try {
    const prices = JSON.parse(outcomePricesJson) as string[];
    if (prices.length < 2) return null;
    
    const yesPrice = parseFloat(prices[0]!);
    const noPrice = parseFloat(prices[1]!);
    
    if (isNaN(yesPrice) || isNaN(noPrice)) return null;
    if (yesPrice <= 0 || noPrice <= 0) return null;
    if (yesPrice >= 1 || noPrice >= 1) return null;
    
    return { yesPrice, noPrice };
  } catch {
    return null;
  }
}

/**
 * Fetch top markets by volume from Polymarket API.
 * Filters for binary markets only.
 */
async function fetchTopPolymarketMarkets(limit: number = 5): Promise<z.infer<typeof PolymarketMarketSchema>[]> {
  const url = new URL(POLYMARKET_API_URL);
  url.searchParams.append("closed", "false");
  url.searchParams.append("active", "true");
  url.searchParams.append("sort", "volume");
  url.searchParams.append("order", "desc");
  url.searchParams.append("limit", "20"); // Fetch more to filter binary markets
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  const parsed = PolymarketResponseSchema.parse(data);
  
  // Filter for binary markets only (YES/NO outcomes)
  const binaryMarkets = parsed.filter(m => {
    if (m.outcomes.length !== 2) return false;
    const first = m.outcomes[0];
    const second = m.outcomes[1];
    if (!first || !second) return false;
    return first.toLowerCase().includes("yes") && second.toLowerCase().includes("no");
  });
  
  return binaryMarkets.slice(0, limit);
}

/**
 * Check if a market with given Polymarket ID already exists in our DB.
 */
async function marketExists(externalId: string): Promise<boolean> {
  const existing = await prisma.market.findUnique({
    where: { externalId }
  });
  return existing !== null;
}

/**
 * Create a market in our database bootstrapped with Polymarket's current odds.
 * 
 * Uses the FPMM formula where initial price = noShares / (yesShares + noShares)
 * To bootstrap with Polymarket's YES price of P, we set:
 * - yesShares = (1-P) * totalLiquidity
 * - noShares = P * totalLiquidity
 */
async function createMarketFromPolymarket(
  pmMarket: z.infer<typeof PolymarketMarketSchema>,
  initialLiquidityCoin: number = 1000
): Promise<boolean> {
  const prices = parseOutcomePrices(pmMarket.outcomePrices);
  if (!prices) {
    return false;
  }
  
  const { yesPrice, noPrice } = prices;
  const totalLiquidity = BigInt(initialLiquidityCoin) * MICROS_PER_COIN;
  
  // Calculate shares to match Polymarket's price ratio
  // priceYes = noShares / (yesShares + noShares)
  // To get priceYes = yesPrice, we need noShares = yesPrice * total, yesShares = (1-yesPrice) * total
  const yesSharesMicros = BigInt(Math.round((1 - yesPrice) * Number(totalLiquidity)));
  const noSharesMicros = BigInt(Math.round(yesPrice * Number(totalLiquidity)));
  
  // Ensure at least 1 micro in each side to avoid division issues
  const finalYesShares = yesSharesMicros > 0n ? yesSharesMicros : 1n;
  const finalNoShares = noSharesMicros > 0n ? noSharesMicros : 1n;
  
  // Parse end date or default to 30 days from now
  const closesAt = pmMarket.endDate 
    ? new Date(pmMarket.endDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  await prisma.market.create({
    data: {
      title: pmMarket.title,
      description: pmMarket.description || `Synced from Polymarket. Original: https://polymarket.com/market/${pmMarket.slug || pmMarket.id}`,
      closesAt,
      externalId: pmMarket.id,
      category: pmMarket.category || "Crypto",
      pool: {
        create: {
          collateralMicros: 0n,
          yesSharesMicros: finalYesShares,
          noSharesMicros: finalNoShares,
          feeBps: 100 // 1% fee
        }
      }
    }
  });
  
  return true;
}

/**
 * Main sync function: fetch top 5 Polymarket markets and create any new ones.
 * Runs every hour via scheduled job.
 */
export async function syncPolymarketMarkets(): Promise<SyncResult> {
  const result: SyncResult = {
    fetched: 0,
    created: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    console.log("[Polymarket Sync] Starting hourly sync...");
    
    // Fetch top markets from Polymarket
    const markets = await fetchTopPolymarketMarkets(5);
    result.fetched = markets.length;
    
    console.log(`[Polymarket Sync] Fetched ${markets.length} binary markets`);
    
    // Process each market
    for (const pmMarket of markets) {
      try {
        // Check if already exists
        const exists = await marketExists(pmMarket.id);
        if (exists) {
          console.log(`[Polymarket Sync] Skipping existing market: ${pmMarket.title.slice(0, 50)}...`);
          result.skipped++;
          continue;
        }
        
        // Create new market
        const created = await createMarketFromPolymarket(pmMarket);
        if (created) {
          console.log(`[Polymarket Sync] Created market: ${pmMarket.title.slice(0, 50)}...`);
          result.created++;
        } else {
          result.errors.push(`Failed to create market ${pmMarket.id}: invalid price data`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Error processing market ${pmMarket.id}: ${errorMsg}`);
        console.error(`[Polymarket Sync] Error processing market ${pmMarket.id}:`, errorMsg);
      }
    }
    
    console.log(`[Polymarket Sync] Complete. Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal error: ${errorMsg}`);
    console.error("[Polymarket Sync] Fatal error:", errorMsg);
  }
  
  return result;
}
