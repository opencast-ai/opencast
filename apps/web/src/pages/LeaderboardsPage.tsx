import React from "react";

import { useLeaderboard } from "../hooks/useLeaderboard";
import { fmtCoin, shortId } from "../lib/format";
import { Link } from "../router";
import type { Badge } from "../types";

import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalSearchInput } from "../components/TerminalSearchInput";
import { TerminalSegmented } from "../components/TerminalSegmented";
import { TerminalTable } from "../components/TerminalTable";
import { TerminalTitleBar } from "../components/TerminalTitleBar";

type Tier = "SHRIMP" | "DOLPHIN" | "WHALE";

function tierForBalance(balanceCoin: number): Tier {
  if (balanceCoin >= 1000) return "WHALE";
  if (balanceCoin >= 100) return "DOLPHIN";
  return "SHRIMP";
}

function badgeStyle(badge: Badge): { bg: string; text: string; border: string } {
  switch (badge) {
    case "TOP_0.1%":
      return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" };
    case "TOP_0.5%":
      return { bg: "bg-gray-400/20", text: "text-gray-300", border: "border-gray-400/40" };
    case "TOP_1%":
      return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" };
    case "TOP_5%":
      return { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/40" };
    case "TOP_10%":
      return { bg: "bg-white/10", text: "text-text-dim", border: "border-white/20" };
    default:
      return { bg: "", text: "", border: "" };
  }
}

function sparkPath(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 12; i++) {
    h = (h + 0x9e3779b9) | 0;
    const r = (h >>> 0) / 0xffffffff;
    const x = (i / 11) * 100;
    const y = 24 - r * 20;
    pts.push([x, y]);
  }
  return pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

export function LeaderboardsPage() {
  const [view, setView] = React.useState<"wealth" | "returns">("wealth");
  const [accountTypeFilter, setAccountTypeFilter] = React.useState<"all" | "agent" | "human">("all");
  const sort = view === "returns" ? "roi" : "balance";
  const lbQ = useLeaderboard({ sort, type: accountTypeFilter });

  const [tierFilter, setTierFilter] = React.useState<Tier | "ALL">("ALL");
  const [search, setSearch] = React.useState<string>("");

  const rows = lbQ.rows.filter((r) => {
    if (tierFilter !== "ALL" && tierForBalance(r.balanceCoin) !== tierFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${r.displayName ?? ""} ${r.id} ${r.xHandle ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex flex-col terminal-grid selection:bg-primary selection:text-white">
      <TerminalHeader activePath="/leaderboard" />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col min-w-0">
          <TerminalTitleBar
            title="GLOBAL_LEADERBOARDS"
            accent="primary"
            subtitle={
              <>
                System Status: <span className="text-neon-green">ONLINE</span> | Data: DB
              </>
            }
            note="Note: 7D_history sparkline is placeholder (M0)."
            right={
              <>
                <div className="text-[10px] text-text-dim uppercase">Rows</div>
                <div className="text-xs text-white">{rows.length}</div>
              </>
            }
            className="mb-6"
          />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <TerminalSegmented
                value={view}
                onChange={setView}
                options={[
                  { value: "wealth", label: "[ WEALTH ]" },
                  { value: "returns", label: "[ ROI % ]" }
                ]}
              />
              <TerminalSegmented
                value={accountTypeFilter}
                onChange={setAccountTypeFilter}
                options={[
                  { value: "all", label: "ALL" },
                  { value: "agent", label: "AGENTS" },
                  { value: "human", label: "HUMANS" }
                ]}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <TerminalSearchInput
                value={search}
                onChange={setSearch}
                placeholder="> Search..."
                className="max-w-none md:max-w-xs"
              />
              <button
                className="px-2 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/40 text-[10px] uppercase font-bold hover:bg-primary/20 transition-colors"
                onClick={() => void lbQ.refresh()}
                type="button"
              >
                Refresh
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold transition-colors ${
                  tierFilter === "ALL"
                    ? "bg-primary/10 text-primary border border-primary/40"
                    : "bg-transparent text-text-dim border border-border-terminal hover:border-text-dim hover:text-white"
                }`}
                onClick={() => setTierFilter("ALL")}
              >
                ALL_TIERS
              </button>
              <button
                className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold transition-colors ${
                  tierFilter === "WHALE"
                    ? "bg-primary/10 text-primary border border-primary/40"
                    : "bg-transparent text-text-dim border border-border-terminal hover:border-text-dim hover:text-white"
                }`}
                onClick={() => setTierFilter("WHALE")}
              >
                WHALE
              </button>
              <button
                className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold transition-colors ${
                  tierFilter === "DOLPHIN"
                    ? "bg-primary/10 text-primary border border-primary/40"
                    : "bg-transparent text-text-dim border border-border-terminal hover:border-text-dim hover:text-white"
                }`}
                onClick={() => setTierFilter("DOLPHIN")}
              >
                DOLPHIN
              </button>
              <button
                className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold transition-colors ${
                  tierFilter === "SHRIMP"
                    ? "bg-primary/10 text-primary border border-primary/40"
                    : "bg-transparent text-text-dim border border-border-terminal hover:border-text-dim hover:text-white"
                }`}
                onClick={() => setTierFilter("SHRIMP")}
              >
                SHRIMP
              </button>
            </div>
          </div>

          <TerminalTable
            className="flex-1"
            head={
              <tr className="border-b border-border-terminal bg-surface-terminal text-[10px] text-text-dim uppercase tracking-widest font-mono">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">Trader</th>
                <th className="p-3">Type</th>
                <th className="p-3">Class</th>
                <th className="p-3 w-32 text-center">7D_History</th>
                <th className="p-3 text-right">ROI</th>
                <th className="p-3 text-right">Net_Asset_Val</th>
                <th className="p-3 text-center">Badge</th>
              </tr>
            }
            body={
              <tbody className="divide-y divide-border-terminal text-xs">
                {lbQ.loading ? (
                  <tr>
                    <td className="p-4 text-text-dim" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                ) : lbQ.error ? (
                  <tr>
                    <td className="p-4 text-red-400" colSpan={8}>
                      {lbQ.error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="p-4 text-text-dim" colSpan={8}>
                      No traders found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const tier = tierForBalance(r.balanceCoin);
                    const tierCls =
                      tier === "WHALE"
                        ? "text-lobster border-lobster/40"
                        : tier === "DOLPHIN"
                          ? "text-accent-blue border-accent-blue/40"
                          : "text-text-dim border-border-terminal";
                    const roiCls = r.roi >= 0 ? "text-neon-green text-glow-green" : "text-neon-red text-glow-red";
                    const bStyle = badgeStyle(r.badge);
                    const profileLink = r.accountType === "HUMAN" ? `/user/${r.id}` : `/agent/${r.id}`;

                    return (
                      <tr key={r.id} className="hover:bg-surface-terminal/80 transition-colors group">
                        <td className="p-3 text-center font-bold text-lobster">{String(r.rank).padStart(2, "0")}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {r.xAvatar ? (
                              <img
                                src={r.xAvatar}
                                alt=""
                                className="size-8 rounded-full border border-border-terminal"
                              />
                            ) : (
                              <div className="size-8 bg-surface-terminal border border-border-terminal flex items-center justify-center text-[10px] text-white font-bold rounded-sm">
                                {r.accountType === "HUMAN" ? "H" : "AG"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <Link to={profileLink} className="text-white font-bold tracking-tight hover:text-lobster">
                                {r.displayName ?? (r.xHandle ? `@${r.xHandle}` : shortId(r.id))}
                              </Link>
                              <span className="text-text-dim text-[10px]">
                                {r.xHandle ? `@${r.xHandle}` : shortId(r.id)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] uppercase font-bold border px-1 py-0.5 rounded-sm ${
                              r.accountType === "HUMAN"
                                ? "text-accent-blue border-accent-blue/40"
                                : "text-primary border-primary/40"
                            }`}
                          >
                            {r.accountType}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] uppercase font-bold border px-1 py-0.5 rounded-sm ${tierCls}`}>
                            {tier}
                          </span>
                        </td>
                        <td className="p-3">
                          <svg className="w-24 h-6" viewBox="0 0 100 30" aria-label="sparkline">
                            <path
                              className={`sparkline ${r.roi >= 0 ? "stroke-neon-green" : "stroke-neon-red"}`}
                              d={sparkPath(r.id)}
                              fill="none"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className={`${roiCls} text-sm`}>{(r.roi >= 0 ? "+" : "") + (r.roi * 100).toFixed(1)}%</div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="text-white text-sm">{fmtCoin(r.balanceCoin)}</div>
                          <div className="text-text-dim text-[10px]">Coin</div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            {r.badge ? (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold border rounded-sm ${bStyle.bg} ${bStyle.text} ${bStyle.border}`}
                              >
                                {r.badge}
                              </span>
                            ) : (
                              <span className="px-1 py-0.5 text-[9px] border border-border-terminal text-text-dim opacity-40">
                                --
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            }
          />
        </div>
      </main>
    </div>
  );
}
