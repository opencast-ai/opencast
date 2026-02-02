import { useMarket } from "../hooks/useMarket";
import { useMarkets } from "../hooks/useMarkets";
import { useMarketTrades } from "../hooks/useMarketTrades";
import { fmtCoin, fmtPct01, shortId } from "../lib/format";
import { Link } from "../router";
import { useSession } from "../state/session";

import { Icon } from "../components/Icon";
import { MarketChart } from "../components/MarketChart";
import { StatusPill } from "../components/StatusPill";
import { TerminalHeader } from "../components/TerminalHeader";
import { TradeTicket } from "../components/TradeTicket";

export function MarketTradingPage(props: { marketId: string }) {
  const session = useSession();
  const marketQ = useMarket(props.marketId);
  const marketsQ = useMarkets();
  const tradesQ = useMarketTrades(props.marketId, { limit: 25 });

  const market = marketQ.market;

  const selfTraderId = session.isHuman ? session.userId : session.agentId;
  const recentTrades = tradesQ.trades.filter((t) => !selfTraderId || t.traderId !== selfTraderId).slice(0, 12);

  return (
    <div className="min-h-screen bg-background-dark text-slate-300 font-display antialiased">
      <TerminalHeader activePath="/markets" />

      <main className="max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {marketQ.loading ? (
            <div className="rounded-sm border border-border-dark bg-surface-dark p-6 font-mono">Loading market…</div>
          ) : marketQ.error ? (
            <div className="rounded-sm border border-border-dark bg-surface-dark p-6 font-mono text-red-400">{marketQ.error}</div>
          ) : !market ? (
            <div className="rounded-sm border border-border-dark bg-surface-dark p-6 font-mono">Market not found.</div>
          ) : (
            <>
              {/* Market header (stitch: advanced_market_analytics_&_trading) */}
              <header className="flex items-start justify-between border-b border-border-dark pb-6">
                <div className="flex gap-5">
                  <div className="w-16 h-16 rounded-sm bg-surface-dark border border-border-dark flex items-center justify-center shrink-0">
                    <span className="text-3xl filter grayscale opacity-80">🤖</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-mono">
                      <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-blue-900/20 text-blue-400 border border-blue-900/50">
                        M0_SEEDED
                      </span>
                      <span className="text-xs text-slate-500 uppercase">MODE: AMM</span>
                      <StatusPill status={market.status} outcome={market.outcome} />
                    </div>
                    <h1 className="text-2xl font-bold leading-tight mb-2 text-white font-mono tracking-tight">{market.title}</h1>
                    <p className="text-sm text-slate-400 max-w-2xl font-mono leading-relaxed opacity-80">
                      {market.description ?? "Binary market. Buy YES/NO shares via AMM."}
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-4xl font-mono font-bold text-primary tracking-tighter mb-1">
                    {Math.round(market.priceYes * 100)}
                    <span className="text-lg align-top opacity-60">¢</span>
                  </div>
                  <div className="text-xs font-mono text-trade-yes font-medium flex items-center justify-end gap-1">
                    <Icon name="trending_up" className="text-xs" />
                    IMPLIED_YES
                  </div>
                </div>
              </header>

              {/* Chart */}
              <MarketChart marketId={market.id} />

              {/* Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-dark rounded-sm border border-border-dark overflow-hidden">
                  <div className="px-4 py-2 border-b border-border-dark flex justify-between items-center bg-panel-dark">
                    <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-300">AMM Snapshot</h3>
                    <span className="text-[10px] font-mono text-slate-500">MODEL: FPMM</span>
                  </div>
                  <div className="p-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">YES</span>
                      <span className="text-trade-yes">{fmtPct01(market.priceYes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">NO</span>
                      <span className="text-trade-no">{fmtPct01(market.priceNo)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fee</span>
                      <span className="text-white">1%</span>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-600">
                      Order book UI is not applicable for AMM. This panel replaces it.
                    </div>
                  </div>
                </div>

                <div className="bg-surface-dark rounded-sm border border-border-dark overflow-hidden">
                  <div className="px-4 py-2 border-b border-border-dark flex justify-between items-center bg-panel-dark">
                    <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-300">Markets</h3>
                    <span className="text-[10px] font-mono text-slate-500">NAV</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {marketsQ.loading ? (
                      <div className="text-text-dim font-mono text-xs">Loading…</div>
                    ) : marketsQ.error ? (
                      <div className="text-red-400 font-mono text-xs">{marketsQ.error}</div>
                    ) : (
                      marketsQ.markets.slice(0, 6).map((m) => (
                        <Link
                          key={m.id}
                          to={`/market/${m.id}`}
                          className={`block px-3 py-2 rounded-sm border transition-colors ${
                            m.id === market.id
                              ? "border-primary/40 bg-primary/10"
                              : "border-border-dark bg-black/30 hover:bg-black/50 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white font-mono text-[11px] font-bold truncate">{m.title}</div>
                              <div className="text-slate-600 font-mono text-[10px]">
                                YES {Math.round(m.priceYes * 100)}% · NO {Math.round(m.priceNo * 100)}%
                              </div>
                            </div>
                            <span className="text-primary font-mono text-[10px]">OPEN</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          {market ? (
            <TradeTicket
              market={market}
              onAfterTrade={() => {
                void marketQ.refresh();
                void marketsQ.refresh();
                void tradesQ.refresh();
              }}
            />
          ) : (
            <div className="rounded-sm border border-border-dark bg-surface-dark p-6 font-mono">Select a market.</div>
          )}

          <div className="rounded-sm border border-border-dark bg-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-border-dark bg-panel-dark flex items-center justify-between">
              <div className="text-white font-mono text-xs font-bold uppercase tracking-wider">Recent Trades</div>
              <button
                className="text-text-dim hover:text-white transition-colors"
                onClick={() => void tradesQ.refresh()}
                type="button"
                title="refresh"
              >
                <Icon name="refresh" className="text-[18px]" />
              </button>
            </div>

            <div className="p-4">
              {tradesQ.loading ? (
                <div className="text-text-dim font-mono text-xs">Loading…</div>
              ) : tradesQ.error ? (
                <div className="text-red-400 font-mono text-xs">{tradesQ.error}</div>
              ) : recentTrades.length === 0 ? (
                <div className="text-text-dim font-mono text-xs">No recent trades.</div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-text-dim border-b border-border-dark">
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">From</th>
                        <th className="py-2 pr-3 text-right">Vol</th>
                        <th className="py-2 text-right">YES_px</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-border-dark">
                      {recentTrades.map((t) => {
                        const actionCls = t.action === "BUY" ? "text-trade-yes" : "text-trade-no";
                        const from = t.traderDisplayName ?? (t.accountType === "HUMAN" && t.xHandle ? `@${t.xHandle}` : shortId(t.traderId));
                        return (
                          <tr key={t.id} className="hover:bg-black/30 transition-colors">
                            <td className={`py-2 pr-3 font-bold ${actionCls}`}>{t.action}</td>
                            <td className="py-2 pr-3 text-white truncate max-w-[12rem]" title={t.traderId}>
                              {from}
                            </td>
                            <td className="py-2 pr-3 text-right text-text-dim">{fmtCoin(t.volumeCoin)}</td>
                            <td className="py-2 text-right text-white">{fmtPct01(t.priceYesAfter)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-border-dark bg-surface-dark p-4">
            <div className="text-white font-mono text-xs font-bold uppercase tracking-wider">Quick Links</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/markets"
                className="px-2 py-1 rounded-sm bg-primary/10 text-primary border border-primary/40 text-[10px] uppercase font-bold hover:bg-primary/20 transition-colors"
              >
                Markets
              </Link>
              <Link
                to="/leaderboard"
                className="px-2 py-1 rounded-sm bg-white/5 text-text-dim border border-border-dark text-[10px] uppercase font-bold hover:border-text-dim hover:text-white transition-colors"
              >
                Leaderboard
              </Link>
              <button
                className="px-2 py-1 rounded-sm bg-white/5 text-text-dim border border-border-dark text-[10px] uppercase font-bold hover:border-text-dim hover:text-white transition-colors"
                onClick={() => void marketQ.refresh()}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
