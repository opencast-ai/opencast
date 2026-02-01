import React from "react";

import { apiPost } from "../api";
import type { QuoteResponse } from "../types";

export function useQuote(params: {
  marketId: string | null;
  outcome: "YES" | "NO";
  collateralCoin: number;
  enabled: boolean;
}) {
  const { marketId, outcome, collateralCoin, enabled } = params;
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (!enabled || !marketId) {
      setQuote(null);
      setError("");
      setLoading(false);
      return;
    }

    const coin = Number.isFinite(collateralCoin) ? Math.max(1, Math.floor(collateralCoin)) : 0;
    if (coin <= 0) {
      setQuote(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const q = await apiPost<QuoteResponse>("/quote", {
          marketId,
          outcome,
          collateralCoin: coin
        });
        if (!cancelled) setQuote(q);
      } catch (e) {
        if (!cancelled) {
          setQuote(null);
          setError(e instanceof Error ? e.message : "Quote failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [enabled, marketId, outcome, collateralCoin]);

  return { quote, loading, error };
}
