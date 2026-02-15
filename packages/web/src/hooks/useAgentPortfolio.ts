import React from "react";

import { apiGet } from "../api";
import type { PortfolioResponse } from "../types";

export function useAgentPortfolio(agentId: string) {
  const [portfolio, setPortfolio] = React.useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    if (!agentId) {
      setPortfolio(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const p = await apiGet<PortfolioResponse>(`/agents/${agentId}/portfolio`);
      setPortfolio(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { portfolio, loading, error, refresh };
}
