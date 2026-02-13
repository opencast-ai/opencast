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
  interval: string = "1d",
  startTs: number,
  endTs: number
): Promise<ChartPoint[]> {
  try {
    const url = new URL(`${POLYMARKET_CLOB_API}/prices-history`);
    url.searchParams.append("market", externalId);
    url.searchParams.append("interval", interval);
    url.searchParams.append("startTs", startTs.toString());
    url.searchParams.append("endTs", endTs.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[Chart] Polymarket API error: ${JSON.stringify(response)}`);
      return [];
    }
    
    const data = await response.json() as { history?: Array<{ t: number; p: number }> };
    
    // Transform Polymarket format: { history: [{ t: timestamp, p: price }] }
    // `p` is already a probability in [0,1].
    return (data.history || []).map((point) => ({
      timestamp: point.t,
      priceYes: point.p,
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
  let externalInterval: string;
  
  switch (interval) {
    case "5m":
      startTime = new Date(now.getTime() - 5 * 60 * 1000);
      bucketMinutes = 1; // 1 minute buckets
      externalInterval = "1h";
      break;
    case "15m":
      startTime = new Date(now.getTime() - 15 * 60 * 1000);
      bucketMinutes = 1; // 1 minute buckets
      externalInterval = "1h";
      break;
    case "1h":
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      bucketMinutes = 2; // 2 minute buckets
      externalInterval = "1h";
      break;
    case "4h":
      startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      bucketMinutes = 10; // 10 minute buckets
      externalInterval = "6h";
      break;
    case "1d":
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketMinutes = 60; // 1 hour buckets
      externalInterval = "1d";
      break;
    case "1w":
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      bucketMinutes = 360; // 6 hour buckets
      externalInterval = "1w";
      break;
    case "1m":
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      bucketMinutes = 1440; // 1 day buckets
      externalInterval = "1m";
      break;
    case "all":
      startTime = new Date(market.createdAt);
      bucketMinutes = 1440; // 1 day buckets
      externalInterval = "max";
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucketMinutes = 60;
      externalInterval = "1d";
  }
  
  // Do NOT clamp to market.createdAt.
  // For Polymarket-synced markets, createdAt is when we synced locally and can be *after*
  // the requested window, which would wrongly filter out all external history.
  
  let data: ChartPoint[] = [];
  let source: ChartResponse["source"] = "local";
  
  // For markets synced from Polymarket, fetch their historical data
  if (market.externalId) {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - bucketMinutes * 60;
    const pmHistory = await fetchPolymarketHistory(market.externalId, externalInterval, startTs, endTs);
    
    if (pmHistory.length > 0) {
      // Filter Polymarket data to the requested window.
      // Our DB market.createdAt is when we synced/created locally, not necessarily the true market start.
      // For short intervals, we want the most recent data regardless of local creation time.
      const startTs = Math.floor(startTime.getTime() / 1000);
      const endTs = Math.floor(endTime.getTime() / 1000);
      const historicalData = pmHistory.filter((p) => p.timestamp >= startTs && p.timestamp <= endTs);
      
      // Get local trades for the same window
      const localData = await aggregateLocalTrades(marketId, startTime, endTime, bucketMinutes);
      
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
        interval: z.enum(["5m", "15m", "1h", "4h", "1d", "1w", "1m", "all"]).optional()
      })
      .parse(req.query);
    
    const interval = query.interval || "1d";
    
    const chartData = await getChartData(params.id, interval);
    
    return chartData;
  });
}
