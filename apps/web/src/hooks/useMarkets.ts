import React from "react";

import { apiGet } from "../api";
import type { Market } from "../types";

export function useMarkets() {
  const [markets, setMarkets] = React.useState<Market[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const m = await apiGet<Market[]>("/markets");
      setMarkets(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { markets, loading, error, refresh };
}
