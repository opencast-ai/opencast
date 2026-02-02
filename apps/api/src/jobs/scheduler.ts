import { schedule } from "node-cron";
import { syncPolymarketMarkets } from "./syncPolymarket.js";
import { runBotCountMarketCycle } from "./botCountMarket.js";
import { runBotTraderCycle } from "./botTrader.js";

/**
 * Global flag to track if scheduled jobs are running.
 */
let jobsStarted = false;

/**
 * Start all scheduled background jobs.
 * 
 * Job Schedule:
 * - Polymarket Sync: Every hour at minute 0 (0 * * * *)
 * - Bot Count Market Cycle: Every hour at minute 0 (0 * * * *)
 * 
 * Both jobs run at the top of the hour for predictable scheduling.
 */
export function startScheduledJobs(): void {
  if (jobsStarted) {
    console.log("[Scheduler] Jobs already started, skipping");
    return;
  }

  console.log("[Scheduler] Starting scheduled jobs...");

  // Polymarket sync: Every hour at minute 0
  schedule("0 * * * *", async () => {
    console.log("[Scheduler] Triggering Polymarket sync job");
    try {
      const result = await syncPolymarketMarkets();
      console.log(`[Scheduler] Polymarket sync complete: ${result.created} created, ${result.skipped} skipped`);
    } catch (err) {
      console.error("[Scheduler] Polymarket sync failed:", err instanceof Error ? err.message : String(err));
    }
  });

  // Bot count market cycle: Every hour at minute 0
  schedule("0 * * * *", async () => {
    console.log("[Scheduler] Triggering bot count market cycle");
    try {
      const results = await runBotCountMarketCycle();
      for (const result of results) {
        console.log(`[Scheduler] BotCount cycle result: ${result.action} - ${result.message}`);
      }
    } catch (err) {
      console.error("[Scheduler] Bot count cycle failed:", err instanceof Error ? err.message : String(err));
    }
  });

  // Bot trader simulator: every 5 seconds (env-gated in runBotTraderCycle)
  schedule("*/5 * * * * *", async () => {
    try {
      await runBotTraderCycle();
    } catch (err) {
      console.error("[Scheduler] Bot trader cycle failed:", err instanceof Error ? err.message : String(err));
    }
  });

  jobsStarted = true;
  console.log("[Scheduler] Jobs scheduled successfully");
  console.log("  - Polymarket sync: 0 * * * * (hourly at :00)");
  console.log("  - Bot count cycle: 0 * * * * (hourly at :00)");
  console.log("  - Bot trader: */5 * * * * * (every 5 seconds; BOT_TRADER_ENABLED=true)");
}

/**
 * Check if scheduled jobs are currently running.
 */
export function areJobsRunning(): boolean {
  return jobsStarted;
}
