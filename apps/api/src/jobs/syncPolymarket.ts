/**
 * Scheduled job for syncing Polymarket markets
 * Uses reusable service methods from services/polymarket.ts
 */

import {
  fetchTopPolymarketMarkets,
  transformAndValidateMarket,
  upsertForwardedMarket,
  type ForwardResult
} from "../services/polymarket.js";

/**
 * Main sync function: fetch top 5 Polymarket markets and create any new ones.
 * Runs every hour via scheduled job.
 * NOTE: For demo, manual forwarding via /admin/markets/forward is preferred.
 */
export async function syncPolymarketMarkets(): Promise<ForwardResult> {
  const result: ForwardResult = {
    forwarded: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log("[Polymarket Sync] Starting hourly sync...");

    // Fetch top markets from Polymarket
    const markets = await fetchTopPolymarketMarkets(5);
    console.log(`[Polymarket Sync] Fetched ${markets.length} binary markets`);

    // Process each market
    for (const pmMarket of markets) {
      try {
        // Transform and validate
        const marketData = transformAndValidateMarket(pmMarket);
        if (!marketData) {
          console.log(`[Polymarket Sync] Skipping invalid market: ${pmMarket.question.slice(0, 50)}...`);
          continue;
        }

        // Upsert (create if not exists)
        const { created, error } = await upsertForwardedMarket(marketData);
        if (error) {
          result.errors.push(`Failed to create ${pmMarket.slug}: ${error}`);
        } else if (created) {
          console.log(`[Polymarket Sync] Created market: ${pmMarket.question.slice(0, 50)}...`);
          result.forwarded++;
        } else {
          console.log(`[Polymarket Sync] Skipped existing market: ${pmMarket.question.slice(0, 50)}...`);
          result.skipped++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Error processing ${pmMarket.slug}: ${errorMsg}`);
        console.error(`[Polymarket Sync] Error processing market:`, errorMsg);
      }
    }

    console.log(`[Polymarket Sync] Complete. Forwarded: ${result.forwarded}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal error: ${errorMsg}`);
    console.error("[Polymarket Sync] Fatal error:", errorMsg);
  }

  return result;
}
