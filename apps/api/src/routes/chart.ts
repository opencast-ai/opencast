import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { quotePriceYes } from "../amm/fpmm.js";

const POLYMARKET_CLOB_API = "https://clob.polymarket.com";

// Types for chart data
interface ChartPoint {
  timestamp: number; // Unix timestamp in seconds
  priceYes: number; // 0-1 range
  volume?: number; // Optional volume data
}

interface ChartResponse {
  marketId: string;
  interval: string;
  data: ChartPoint[];
  source: "polymarket" | "local" | "hybrid";
}

/**
 * Fetch historical price data from Polymarket CLOB API
 */
async function fetchPolymarketHistory(
  externalId: string,
  interval: string = "1d"
): Promise<ChartPoint[]> {
  try {
    const url = new URL(`${POLYMARKET_CLOB_API}/prices-history`);
    url.searchParams.append("market", externalId);
    url.searchParams.append("interval", interval);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[Chart] Polymarket API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as { history?: Array<{ t: number; p: number }> };
    
    // Transform Polymarket format: { history: [{ t: timestamp, p: price }] }
    // Price is in cents (e.g., 1800.75 = $0.18)
    return (data.history || []).map((point) => ({
      timestamp: point.t,
      priceYes: point.p / 10000, // Convert cents to 0-1 probability
      volume: 0 // Polymarket doesn't provide volume in this endpoint
    }));
  } catch (err) {
    console.error("[Chart] Failed to fetch Polymarket history:", err);
    return [];
  }
}

/**
 * Aggregate local trades into price history buckets
 */
async function aggregateLocalTrades(
  marketId: string,
  startTime: Date,
  endTime: Date,
  bucketMinutes: number = 60
): Promise<ChartPoint[]> {
  // Fetch all trades for this market in the time range
  const trades = await prisma.trade.findMany({
    where: {
      marketId,
      createdAt: {
        gte: startTime,
        lte: endTime
      }
    },
    orderBy: { createdAt: "asc" }
  });
  
  if (trades.length === 0) {
    return [];
  }
  
  // Create time buckets
  const buckets = new Map<number, { prices: number[]; volume: number }>();
  
  for (const trade of trades) {
    // Calculate YES price from pool state after trade
    const priceYes = quotePriceYes({
      yesMicros: trade.poolYesSharesMicros,
      noMicros: trade.poolNoSharesMicros
    });
    
    // Round timestamp to bucket
    const timestamp = Math.floor(trade.createdAt.getTime() / 1000);
    const bucketTime = Math.floor(timestamp / (bucketMinutes * 60)) * (bucketMinutes * 60);
    
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, { prices: [], volume: 0 });
    }
    
    const bucket = buckets.get(bucketTime)!;
    bucket.prices.push(priceYes);
    bucket.volume += Number(trade.collateralInMicros) / 1e6; // Convert to coins
  }
  
  // Convert buckets to chart points (use average price per bucket)
  const points: ChartPoint[] = [];
  for (const [timestamp, data] of buckets) {
    const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
    points.push({
      timestamp,
      priceYes: avgPrice,
      volume: data.volume
    });
  }
  
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get the initial market price from pool state
 */
async function getMarketInitialPrice(marketId: string): Promise<number | null> {
  const pool = await prisma.marketPool.findUnique({
    where: { marketId }
  });
  
  if (!pool) return null;
  
  return quotePriceYes({
    yesMicros: pool.yesSharesMicros,
    noMicros: pool.noSharesMicros
  });
}

/**
 * Blend Polymarket history with local trades
 * - For markets with externalId: Start with Polymarket data, append local trades
 * - For local-only markets: Just return aggregated trades
 */
async function getChartData(
  marketId: string,
  interval: string = "1d"
): Promise<ChartResponse> {
  // Get market info
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: { pool: true }
  });
  
  if (!market) {
    throw new Error("Market not found");
  }
  
  // Calculate time range based on interval
  const now = new Date();
  const endTime = now;
  let startTime: Date;
  let bucketMinutes: number;
  
  switch (interval) {
    case "1d":
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketMinutes = 60; // 1 hour buckets
      break;
    case "1w":
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      bucketMinutes = 360; // 6 hour buckets
      break;
    case "1m":
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      bucketMinutes = 1440; // 1 day buckets
      break;
    case "all":
      startTime = new Date(market.createdAt);
      bucketMinutes = 1440; // 1 day buckets
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketMinutes = 60;
  }
  
  // If market was created after startTime, use market creation time
  if (market.createdAt > startTime) {
    startTime = new Date(market.createdAt);
  }
  
  let data: ChartPoint[] = [];
  let source: ChartResponse["source"] = "local";
  
  // For markets synced from Polymarket, fetch their historical data
  if (market.externalId) {
    const pmHistory = await fetchPolymarketHistory(market.externalId, interval);
    
    if (pmHistory.length > 0) {
      // Filter Polymarket data to only include points before our market creation
      const marketCreationTs = Math.floor(market.createdAt.getTime() / 1000);
      const historicalData = pmHistory.filter(p => p.timestamp < marketCreationTs);
      
      // Get local trades after market creation
      const localData = await aggregateLocalTrades(marketId, market.createdAt, endTime, bucketMinutes);
      
      // Blend: Polymarket history + local trades
      data = [...historicalData, ...localData];
      source = "hybrid";
    } else {
      // Fallback to local-only if Polymarket API fails
      data = await aggregateLocalTrades(marketId, startTime, endTime, bucketMinutes);
    }
  } else {
    // Local-only market: just aggregate our trades
    data = await aggregateLocalTrades(marketId, startTime, endTime, bucketMinutes);
  }
  
  // If no trades yet, return initial price point
  if (data.length === 0 && market.pool) {
    const initialPrice = quotePriceYes({
      yesMicros: market.pool.yesSharesMicros,
      noMicros: market.pool.noSharesMicros
    });
    
    data = [
      {
        timestamp: Math.floor(market.createdAt.getTime() / 1000),
        priceYes: initialPrice
      }
    ];
  }
  
  return {
    marketId,
    interval,
    data,
    source
  };
}

export async function registerChartRoutes(app: FastifyInstance) {
  app.get("/markets/:id/chart", async (req) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const query = z
      .object({
        interval: z.enum(["1d", "1w", "1m", "all"]).optional()
      })
      .parse(req.query);
    
    const interval = query.interval || "1d";
    
    const chartData = await getChartData(params.id, interval);
    
    return chartData;
  });
}
