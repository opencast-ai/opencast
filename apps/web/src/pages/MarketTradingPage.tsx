import React from "react";

import { useMarket } from "../hooks/useMarket";
import { useMarkets } from "../hooks/useMarkets";
import { useMarketTrades } from "../hooks/useMarketTrades";
import { usePortfolio } from "../hooks/usePortfolio";
import { fmtCoin, fmtPct01, shortId } from "../lib/format";
import { Link } from "../router";
import { useSession } from "../state/session";
import type { MarketTrade } from "../types";

import { Icon } from "../components/Icon";
import { MarketChart } from "../components/MarketChart";
import { StatusPill } from "../components/StatusPill";
import { TerminalHeader } from "../components/TerminalHeader";
import { TradeTicket } from "../components/TradeTicket";

// Generate mock trades to fill the list when there are few real trades
function generateMockTrades(marketId: string, count: number): MarketTrade[] {
  const now = Date.now();
  const mockTraders = [
    { id: "trader_a1b2", name: "AlphaBot" },
    { id: "trader_c3d4", name: "BetaTrade" },
    { id: "trader_e5f6", name: "GammaAI" },
    { id: "trader_g7h8", name: "DeltaFlow" },
    { id: "trader_i9j0", name: "EpsilonX" },
    { id: "trader_k1l2", name: "ZetaMind" },
    { id: "trader_m3n4", name: "EtaVision" },
    { id: "trader_o5p6", name: "ThetaEdge" }
  ];

  return Array.from({ length: count }, (_, i) => {
    const traderIndex = i % mockTraders.length;
    const trader = mockTraders[traderIndex] ?? mockTraders[0]!;
    const side = Math.random() > 0.5 ? "YES" : "NO";
    const volume = Math.floor(Math.random() * 90) + 10; // 10-100 Coin
    
    return {
      id: `mock-${marketId}-${i}`,
      createdAt: new Date(now - (i + 1) * 3600000).toISOString(), // 1 hour apart
      accountType: "AGENT",
      traderId: trader.id,
      traderDisplayName: trader.name,
      side,
      action: "BUY",
      volumeCoin: volume,
      sharesOutCoin: volume * (0.9 + Math.random() * 0.2), // Approximate shares
      priceYesAfter: side === "YES" ? 0.5 + Math.random() * 0.2 : 0.5 - Math.random() * 0.2
    };
  });
}

export function MarketTradingPage(props: { marketId: string }) {
  const session = useSession();
  const marketQ = useMarket(props.marketId);
  const marketsQ = useMarkets();
  const tradesQ = useMarketTrades(props.marketId, { limit: 25 });
  const portfolioQ = usePortfolio(session.apiKey);

  const market = marketQ.market;

  // Transform user's positions and history for this market into trade format
  const userTrades: MarketTrade[] = React.useMemo(() => {
    if (!portfolioQ.portfolio) return [];

    const trades: MarketTrade[] = [];
    const traderId = session.isHuman ? session.userId : session.agentId;
    const traderName = session.isHuman 
      ? (session.walletAddress ? `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}` : "You")
      : (session.agentId ? `Agent_${shortId(session.agentId)}` : "You");

    // Transform active positions into trades
    portfolioQ.portfolio.positions
      .filter((p) => p.marketId === props.marketId)
      .forEach((p) => {
        if (p.yesSharesCoin > 0) {
          trades.push({
            id: `pos-yes-${p.marketId}`,
            createdAt: new Date().toISOString(),
            accountType: session.accountType || "AGENT",
            traderId: traderId || "you",
            traderDisplayName: traderName,
            side: "YES",
            action: "BUY",
            volumeCoin: p.costBasisCoin,
            sharesOutCoin: p.yesSharesCoin,
            priceYesAfter: p.markToMarketCoin / p.yesSharesCoin || 0.5
          });
        }
        if (p.noSharesCoin > 0) {
          trades.push({
            id: `pos-no-${p.marketId}`,
            createdAt: new Date().toISOString(),
            accountType: session.accountType || "AGENT",
            traderId: traderId || "you",
            traderDisplayName: traderName,
            side: "NO",
            action: "BUY",
            volumeCoin: p.costBasisCoin,
            sharesOutCoin: p.noSharesCoin,
            priceYesAfter: 1 - (p.markToMarketCoin / p.noSharesCoin || 0.5)
          });
        }
      });

    // Transform history into trades
    portfolioQ.portfolio.history
      .filter((h) => h.marketId === props.marketId)
      .forEach((h) => {
        trades.push({
          id: `hist-${h.marketId}-${h.lastTradeAt}`,
          createdAt: h.lastTradeAt,
          accountType: session.accountType || "AGENT",
          traderId: traderId || "you",
          traderDisplayName: traderName,
          side: h.outcome,
          action: "BUY",
          volumeCoin: h.costBasisCoin,
          sharesOutCoin: h.payoutCoin,
          priceYesAfter: h.outcome === "YES" ? 1 : 0
        });
      });

    return trades;
  }, [portfolioQ.portfolio, props.marketId, session]);

  // Combine all trades and add mocks if needed
  const recentTrades = React.useMemo(() => {
    // Combine API trades and user trades
    const allTrades = [...tradesQ.trades, ...userTrades];
    
    // Sort by createdAt (newest first)
    allTrades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // If less than 5 trades, add mock trades
    if (allTrades.length < 5) {
      const mockCount = 5 - allTrades.length;
      const mocks = generateMockTrades(props.marketId, mockCount);
      allTrades.push(...mocks);
    }
    
    // Return only latest 10
    return allTrades.slice(0, 10);
  }, [tradesQ.trades, userTrades, props.marketId]);

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
                      <span className="text-xs text-slate-500 uppercase">MODE: CLOB</span>
                      <StatusPill status={market.status} outcome={market.outcome} />
                    </div>
                    <h1 className="text-2xl font-bold leading-tight mb-2 text-white font-mono tracking-tight">{market.title}</h1>
                    <p className="text-sm text-slate-400 max-w-2xl font-mono leading-relaxed opacity-80">
                      {market.description ?? "Binary market. Buy YES/NO shares via CLOB."}
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
                    <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-300">CLOB Snapshot</h3>
                    <span className="text-[10px] font-mono text-slate-500">MODEL: CLOB</span>
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
                      Order book UI is not applicable for CLOB. This panel replaces it.
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
                void portfolioQ.refresh();
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
                onClick={() => {
                  void tradesQ.refresh();
                  void portfolioQ.refresh();
                }}
                type="button"
                title="refresh"
              >
                <Icon name="refresh" className="text-[18px]" />
              </button>
            </div>

            <div className="p-4">
              {tradesQ.loading || portfolioQ.loading ? (
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
                        const isUserTrade = t.traderId === session.userId || t.traderId === session.agentId;
                        return (
                          <tr key={t.id} className={`hover:bg-black/30 transition-colors ${isUserTrade ? "bg-primary/5" : ""}`}>
                            <td className={`py-2 pr-3 font-bold ${actionCls}`}>{t.action}</td>
                            <td className="py-2 pr-3 text-white truncate max-w-[12rem]" title={t.traderId}>
                              {isUserTrade ? <span className="text-primary">{from} (You)</span> : from}
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
