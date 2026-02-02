import React from "react";

import { apiGet } from "../api";
import type { LeaderboardRow } from "../types";

export function useLeaderboard(params?: { sort?: "balance" | "roi"; type?: "all" | "agent" | "human" }) {
  const sort = params?.sort ?? "balance";
  const type = params?.type ?? "all";
  const [rows, setRows] = React.useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiGet<LeaderboardRow[]>(`/leaderboard?sort=${sort}&type=${type}`);
      setRows(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [sort, type]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
