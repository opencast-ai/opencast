import React from "react";

import { apiGet } from "../api";
import type { Market } from "../types";

export function useMarket(marketId: string) {
  const [market, setMarket] = React.useState<Market | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    if (!marketId) return;
    setLoading(true);
    setError("");
    try {
      const m = await apiGet<Market>(`/markets/${marketId}`);
      setMarket(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market");
      setMarket(null);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { market, loading, error, refresh };
}
