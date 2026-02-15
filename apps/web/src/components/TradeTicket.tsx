import React from "react";

import { apiPost, ApiError } from "../api";
import { useQuote } from "../hooks/useQuote";
import { fmtCoin, fmtPct01 } from "../lib/format";
import { useSession } from "../state/session";
import type { Market, TradeResponse } from "../types";

import { Icon } from "./Icon";

export function TradeTicket(props: {
  market: Market;
  onAfterTrade?: () => void;
  className?: string;
}) {
  const session = useSession();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [tradeResult, setTradeResult] = React.useState<TradeResponse | null>(null);

  const [outcome, setOutcome] = React.useState<"YES" | "NO">("YES");
  const [coin, setCoin] = React.useState<number>(10);

  const quoteQ = useQuote({
    marketId: props.market.status === "OPEN" ? props.market.id : null,
    outcome,
    collateralCoin: coin,
    enabled: props.market.status === "OPEN"
  });

  async function onTrade() {
    if (props.market.status !== "OPEN") return;
    if (!session.apiKey) {
      setError("Login first.");
      return;
    }

    const c = Number.isFinite(coin) ? Math.max(1, Math.floor(coin)) : 0;
    if (c <= 0) {
      setError("Trade amount must be >= 1 Coin.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await apiPost<TradeResponse>(
        "/trades",
        {
          marketId: props.market.id,
          outcome,
          collateralCoin: c
        },
        { apiKey: session.apiKey }
      );
      setTradeResult(result);
      setShowSuccessModal(true);
      props.onAfterTrade?.();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} (status ${e.status})` : e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  function closeModal() {
    setShowSuccessModal(false);
    setTradeResult(null);
  }

  return (
    <>
      <aside className={props.className}>
        <div className="rounded-sm border border-border-terminal bg-surface-dark overflow-hidden">
          <div className="px-4 py-3 border-b border-border-terminal bg-panel-dark flex items-center justify-between">
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">Trade Ticket</h3>
            <span className="text-[10px] font-mono text-slate-500">FEE: 1%</span>
          </div>

          <div className="p-4 space-y-4">
            {error ? <div className="text-red-400 text-xs font-mono">{error}</div> : null}

            {/* {!session.apiKey ? (
              <div className="space-y-3">
                <div className="text-text-dim text-xs font-mono">
                  Initialize an agent to receive <span className="text-white">100 Coin</span> + API key.
                </div>
                <button
                  className="w-full h-9 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider"
                  disabled={busy}
                  onClick={() => void session.registerAgent()}
                >
                  Initialize Agent
                </button>
                <input
                  className="w-full rounded-sm bg-surface-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs font-mono"
                  placeholder="paste_x-api-key..."
                  value={session.apiKey}
                  onChange={(e) => session.setApiKey(e.target.value)}
                />
              </div>
            ) : null} */}

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Outcome</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`h-9 rounded-sm border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    outcome === "YES"
                      ? "bg-trade-yes/10 border-trade-yes/40 text-trade-yes"
                      : "bg-surface-terminal border-border-terminal text-text-dim hover:text-white"
                  }`}
                  disabled={busy || props.market.status !== "OPEN"}
                  onClick={() => setOutcome("YES")}
                  type="button"
                >
                  BUY_YES
                </button>
                <button
                  className={`h-9 rounded-sm border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    outcome === "NO"
                      ? "bg-trade-no/10 border-trade-no/40 text-trade-no"
                      : "bg-surface-terminal border-border-terminal text-text-dim hover:text-white"
                  }`}
                  disabled={busy || props.market.status !== "OPEN"}
                  onClick={() => setOutcome("NO")}
                  type="button"
                >
                  BUY_NO
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Amount (Coin)</div>
              <input
                className="w-full rounded-sm bg-surface-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs font-mono"
                type="number"
                min={1}
                step={1}
                value={coin}
                onChange={(e) => setCoin(Number(e.target.value))}
                disabled={busy || props.market.status !== "OPEN"}
              />
            </div>

            <div className="rounded-sm border border-border-terminal bg-black/40 p-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <span>Quote</span>
                <span>{quoteQ.loading ? "LOADING" : quoteQ.quote ? "READY" : "—"}</span>
              </div>

              <div className="mt-3 space-y-2 text-xs font-mono">
                {quoteQ.error ? <div className="text-red-400">{quoteQ.error}</div> : null}
                {quoteQ.quote ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Est_shares</span>
                      <span className="text-white">{fmtCoin(quoteQ.quote.sharesOutCoin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Fee</span>
                      <span className="text-white">{fmtCoin(quoteQ.quote.feeCoin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">YES_px</span>
                      <span className="text-white">
                        {fmtPct01(quoteQ.quote.priceYesBefore)} → {fmtPct01(quoteQ.quote.priceYesAfter)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-text-dim">Quote preview requires an OPEN market.</div>
                )}
              </div>
            </div>

            <button
              className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider disabled:opacity-60"
              disabled={busy || props.market.status !== "OPEN"}
              onClick={() => void onTrade()}
            >
              {busy ? "Executing..." : "Execute Trade"}
            </button>
          </div>
        </div>
      </aside>

      {/* Success Modal */}
      {showSuccessModal && tradeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md rounded-lg border border-neon-green/40 bg-surface-terminal shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neon-green/20 bg-neon-green/10">
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-neon-green text-xl" />
                <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono">
                  Trade Executed
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-text-dim hover:text-white transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Trade ID */}
              <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Trade ID</div>
                <code className="text-xs text-white font-mono break-all">{tradeResult.tradeId}</code>
              </div>

              {/* Trade Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Outcome</div>
                  <div className={`text-sm font-bold font-mono ${outcome === "YES" ? "text-trade-yes" : "text-trade-no"}`}>
                    {outcome}
                  </div>
                </div>

                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Amount</div>
                  <div className="text-sm text-white font-bold font-mono">{fmtCoin(coin)} C</div>
                </div>

                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Shares Received</div>
                  <div className="text-sm text-white font-bold font-mono">{fmtCoin(tradeResult.sharesOutCoin)}</div>
                </div>

                <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim mb-1">Fee Paid</div>
                  <div className="text-sm text-neon-red font-bold font-mono">{fmtCoin(tradeResult.feeCoin)} C</div>
                </div>
              </div>

              {/* New Balance */}
              <div className="bg-neon-green/5 border border-neon-green/20 rounded-sm p-3">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] uppercase tracking-widest text-text-dim">New Balance</div>
                  <div className="text-lg text-neon-green font-bold font-mono">
                    {fmtCoin(tradeResult.balanceCoin)} <span className="text-sm">C</span>
                  </div>
                </div>
              </div>

              {/* Position Update */}
              <div className="bg-bg-terminal border border-border-terminal rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-text-dim mb-2">Position Update</div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-dim">YES Shares:</span>
                  <span className="text-white">{fmtCoin(tradeResult.position.yesSharesCoin)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono mt-1">
                  <span className="text-text-dim">NO Shares:</span>
                  <span className="text-white">{fmtCoin(tradeResult.position.noSharesCoin)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border-terminal bg-bg-terminal">
              <button
                onClick={closeModal}
                className="w-full h-10 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase font-mono tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
