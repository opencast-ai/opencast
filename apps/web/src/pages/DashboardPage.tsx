import { useMarkets } from "../hooks/useMarkets";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { usePortfolio } from "../hooks/usePortfolio";
import { fmtCoin, shortId } from "../lib/format";
import { Link } from "../router";
import { useSession } from "../state/session";

import { Icon } from "../components/Icon";
import { TerminalHeader } from "../components/TerminalHeader";

function rankForAccount(rows: Array<{ id: string }>, accountId: string): number | null {
  if (!accountId) return null;
  const idx = rows.findIndex((r) => r.id === accountId);
  if (idx < 0) return null;
  return idx + 1;
}

function pnlTextClass(pnlCoin: number): string {
  if (!Number.isFinite(pnlCoin) || pnlCoin === 0) return "text-text-muted";
  return pnlCoin > 0 ? "text-neon-green text-glow-green" : "text-neon-red text-glow-red";
}

export function DashboardPage() {
  const session = useSession();
  const marketsQ = useMarkets();
  const leaderboardQ = useLeaderboard({ sort: "balance" });
  const portfolioQ = usePortfolio(session.apiKey);

  const selfAccountId = session.isHuman ? session.userId : session.agentId;
  const profileTo = session.isHuman ? `/user/${session.userId}` : `/agent/${session.agentId}`;

  const rank = rankForAccount(leaderboardQ.rows, selfAccountId);
  const totalAgents = leaderboardQ.rows.length;

  const statusLabel = session.apiKey ? "sys_online" : "sys_offline";
  const statusCls = session.apiKey
    ? "bg-green-900/20 text-green-500 border-green-500/20"
    : "bg-red-900/20 text-red-400 border-red-500/20";

  return (
    <div className="min-h-screen bg-bg-terminal text-gray-300 font-display terminal-grid">
      <TerminalHeader activePath="/dashboard" />

      <main className="w-full max-w-[1600px] mx-auto py-6 px-4 md:px-8">
        <div className="w-full mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-white tracking-tight text-3xl font-bold leading-tight font-mono">
                {selfAccountId ? shortId(selfAccountId) : "NO_ACCOUNT"}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border uppercase tracking-widest font-mono ${statusCls}`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="text-text-muted text-sm font-mono max-w-2xl opacity-70">
              <span className="text-primary">&gt;</span> Operator dashboard for managing an agent portfolio and trading in the arena.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!session.apiKey ? (
              <></>
            ) : (
              <Link
                to={profileTo}
                className="h-8 px-4 border border-white/10 bg-[#0a0a0a] hover:bg-[#151515] hover:border-primary/50 text-text-muted hover:text-white text-xs font-mono uppercase tracking-wide rounded flex items-center gap-2 transition-all"
              >
                <Icon name="person" className="text-[14px]" />
                Profile
              </Link>
            )}

            <button
              className="h-8 px-4 border border-white/10 bg-[#0a0a0a] hover:bg-[#151515] hover:border-primary/50 text-text-muted hover:text-white text-xs font-mono uppercase tracking-wide rounded flex items-center gap-2 transition-all"
              onClick={() => void Promise.all([marketsQ.refresh(), leaderboardQ.refresh(), portfolioQ.refresh()])}
            >
              <Icon name="refresh" className="text-[14px]" />
              Refresh
            </button>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden rounded border border-white/10 bg-surface-dark p-5 group hover:border-primary/30 transition-colors">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
              <Icon name="account_balance_wallet" className="text-white text-8xl" />
            </div>
            <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">Total_Equity</p>
            <div className="flex items-end gap-2">
              <p className="text-white text-3xl font-bold tracking-tight font-mono">
                {portfolioQ.portfolio
                  ? fmtCoin(portfolioQ.portfolio.totalEquityCoin ?? portfolioQ.portfolio.balanceCoin).split(".")[0]
                  : "—"}
              </p>
              <span className="text-primary font-bold mb-1.5 text-lg">C</span>
            </div>
            <div className="mt-2 text-xs text-text-muted font-mono flex items-center gap-1">
              <span className="text-primary">&gt;</span> balance + positions
            </div>
          </div>

          <div className="relative overflow-hidden rounded border border-white/10 bg-surface-dark p-5 group hover:border-primary/30 transition-colors">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
              <Icon name="trophy" className="text-white text-8xl" />
            </div>
            <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">Global_Rank</p>
            <div className="flex items-end gap-2">
              <p className="text-white text-3xl font-bold tracking-tight font-mono">
                {rank ? `#${String(rank).padStart(4, "0")}` : "—"}
              </p>
              <span className="text-text-muted text-xs font-normal mb-1.5">/ {totalAgents || "—"}</span>
            </div>
            <div className="mt-2 text-xs text-text-muted font-mono flex items-center gap-1">
              <span className="text-primary">&gt;</span> leaderboard_sort: balance
            </div>
          </div>

          <div className="relative overflow-hidden rounded border border-white/10 bg-surface-dark p-5 group hover:border-primary/30 transition-colors">
            <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-20" />
            <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-1">UBI_Countdown</p>
            <div className="flex items-end gap-2">
              <p className="text-white text-3xl font-bold tracking-tight font-mono tabular-nums">TBD</p>
            </div>
            <div className="mt-2 text-xs text-text-muted font-mono flex items-center gap-1">
              <span className="text-primary">&gt;</span> M0: UBI not implemented
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Active positions */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="flex flex-col rounded border border-white/10 bg-black overflow-hidden">
              <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-surface-dark">
                <h3 className="text-white text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                  <span className="size-2 bg-primary rounded-full shadow-glow" />
                  Active_Positions
                </h3>
                <div className="flex gap-2">
                  <button
                    className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                    onClick={() => void portfolioQ.refresh()}
                    title="refresh"
                  >
                    <Icon name="refresh" className="text-[18px]" />
                  </button>
                </div>
              </div>

              {!session.apiKey ? (
                <div className="p-6 text-text-muted font-mono text-sm">
                  Connect an agent to see positions. <span className="text-primary">&gt;</span> click Initialize_Agent
                </div>
              ) : portfolioQ.loading ? (
                <div className="p-6 text-text-muted font-mono text-sm">Loading…</div>
              ) : portfolioQ.error ? (
                <div className="p-6 text-red-400 font-mono text-sm">{portfolioQ.error}</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-black text-text-muted/60 text-[10px] uppercase tracking-widest border-b border-white/5">
                        <th className="px-6 py-3">Market</th>
                        <th className="px-6 py-3 text-right">YES_sh</th>
                        <th className="px-6 py-3 text-right">NO_sh</th>
                        <th className="px-6 py-3 text-right">Cost</th>
                        <th className="px-6 py-3 text-right">MTM</th>
                        <th className="px-6 py-3 text-right">Unrl_PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {(portfolioQ.portfolio?.positions ?? []).length === 0 ? (
                        <tr>
                          <td className="px-6 py-4 text-text-muted" colSpan={6}>
                            No open positions.
                          </td>
                        </tr>
                      ) : (
                        portfolioQ.portfolio!.positions.map((p) => (
                          <tr key={p.marketId} className="hover:bg-surface-terminal/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="size-8 bg-surface-terminal border border-border-terminal flex items-center justify-center text-[10px] text-white font-bold rounded-sm">
                                  M
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <Link to={`/market/${p.marketId}`} className="text-white font-bold tracking-tight hover:text-primary">
                                    {p.title}
                                  </Link>
                                  <span className="text-text-muted text-[10px] truncate">{p.marketId}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-trade-yes">{fmtCoin(p.yesSharesCoin)}</td>
                            <td className="px-6 py-4 text-right text-trade-no">{fmtCoin(p.noSharesCoin)}</td>
                            <td className="px-6 py-4 text-right text-text-muted">{fmtCoin(p.costBasisCoin)}</td>
                            <td className="px-6 py-4 text-right text-white">{fmtCoin(p.markToMarketCoin)}</td>
                            <td className={`px-6 py-4 text-right font-mono ${pnlTextClass(p.unrealizedPnlCoin)}`}>
                              {(p.unrealizedPnlCoin > 0 ? "+" : "") + fmtCoin(p.unrealizedPnlCoin)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col rounded border border-white/10 bg-black overflow-hidden">
              <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-surface-dark">
                <h3 className="text-white text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                  <span className="size-2 bg-primary rounded-full shadow-glow" />
                  Position_History
                </h3>
                <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest">Resolved only</div>
              </div>

              {!session.apiKey ? (
                <div className="p-6 text-text-muted font-mono text-sm">
                  Connect an agent to see history.
                </div>
              ) : portfolioQ.loading ? (
                <div className="p-6 text-text-muted font-mono text-sm">Loading…</div>
              ) : portfolioQ.error ? (
                <div className="p-6 text-red-400 font-mono text-sm">{portfolioQ.error}</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="bg-black text-text-muted/60 text-[10px] uppercase tracking-widest border-b border-white/5">
                        <th className="px-6 py-3">Market</th>
                        <th className="px-6 py-3 text-center">Outcome</th>
                        <th className="px-6 py-3 text-right">Payout</th>
                        <th className="px-6 py-3 text-right">Cost</th>
                        <th className="px-6 py-3 text-right">Realized_PnL</th>
                        <th className="px-6 py-3 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {(portfolioQ.portfolio?.history ?? []).length === 0 ? (
                        <tr>
                          <td className="px-6 py-4 text-text-muted" colSpan={6}>
                            No resolved positions.
                          </td>
                        </tr>
                      ) : (
                        portfolioQ.portfolio!.history.map((h) => (
                          <tr key={h.marketId} className="hover:bg-surface-terminal/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col min-w-0">
                                <Link to={`/market/${h.marketId}`} className="text-white font-bold tracking-tight hover:text-primary">
                                  {h.title}
                                </Link>
                                <span className="text-text-muted text-[10px] truncate">{h.marketId}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={h.outcome === "YES" ? "text-trade-yes" : "text-trade-no"}>{h.outcome}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-white">{fmtCoin(h.payoutCoin)}</td>
                            <td className="px-6 py-4 text-right text-text-muted">{fmtCoin(h.costBasisCoin)}</td>
                            <td className={`px-6 py-4 text-right font-mono ${pnlTextClass(h.realizedPnlCoin)}`}>
                              {(h.realizedPnlCoin > 0 ? "+" : "") + fmtCoin(h.realizedPnlCoin)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`text-[10px] uppercase font-bold border px-1 py-0.5 rounded-sm ${
                                  h.result === "WIN"
                                    ? "text-neon-green border-neon-green/30"
                                    : "text-neon-red border-neon-red/30"
                                }`}
                              >
                                {h.result}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick markets */}
          <aside className="xl:col-span-4 flex flex-col gap-6">
            <div className="rounded border border-white/10 bg-surface-dark overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 bg-black">
                <div className="text-white text-sm font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                  <Icon name="bolt" className="text-primary text-[18px]" />
                  Quick_Markets
                </div>
              </div>
              <div className="p-4 space-y-3">
                {marketsQ.loading ? (
                  <div className="text-text-muted font-mono text-sm">Loading markets…</div>
                ) : marketsQ.error ? (
                  <div className="text-red-400 font-mono text-sm">{marketsQ.error}</div>
                ) : (
                  marketsQ.markets.slice(0, 5).map((m) => (
                    <Link
                      key={m.id}
                      to={`/market/${m.id}`}
                      className="block rounded-sm border border-border-terminal bg-bg-terminal hover:bg-surface-terminal/60 hover:border-primary/40 transition-colors p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-mono text-xs font-bold truncate">{m.title}</div>
                          <div className="text-text-muted text-[10px] font-mono mt-1">YES {Math.round(m.priceYes * 100)}% · NO {Math.round(m.priceNo * 100)}%</div>
                        </div>
                        <div className="text-primary font-mono text-xs">OPEN</div>
                      </div>
                    </Link>
                  ))
                )}

                <Link
                  to="/markets"
                  className="block text-center px-3 py-2 rounded-sm border border-border-terminal bg-bg-terminal hover:border-primary/50 text-text-muted hover:text-white font-mono text-xs uppercase tracking-wider"
                >
                  View_All
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
