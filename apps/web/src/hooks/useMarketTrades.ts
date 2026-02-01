import React from "react";

import { apiGet } from "../api";
import type { MarketTrade } from "../types";

export function useMarketTrades(marketId: string, opts?: { limit?: number }) {
  const [trades, setTrades] = React.useState<MarketTrade[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const limit = opts?.limit ?? 25;

  const refresh = React.useCallback(async () => {
    if (!marketId) {
      setTrades([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await apiGet<MarketTrade[]>(`/markets/${marketId}/trades?limit=${limit}`);
      setTrades(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trades");
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [marketId, limit]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { trades, loading, error, refresh };
}
