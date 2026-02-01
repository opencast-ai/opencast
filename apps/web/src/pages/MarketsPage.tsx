import React from "react";

import { useMarkets } from "../hooks/useMarkets";
import { fmtPct01 } from "../lib/format";

import { StatusPill } from "../components/StatusPill";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalSearchInput } from "../components/TerminalSearchInput";
import { TerminalSegmented } from "../components/TerminalSegmented";
import { TerminalTable } from "../components/TerminalTable";
import { TerminalTitleBar } from "../components/TerminalTitleBar";

export function MarketsPage() {
  const marketsQ = useMarkets();
  const [q, setQ] = React.useState<string>("");
  const [status, setStatus] = React.useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");

  const filtered = marketsQ.markets.filter((m) => {
    if (status !== "ALL" && m.status !== status) return false;
    const qq = q.trim().toLowerCase();
    if (!qq) return true;
    return `${m.title} ${m.description ?? ""}`.toLowerCase().includes(qq);
  });

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono terminal-grid">
      <TerminalHeader activePath="/markets" />

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 flex flex-col gap-4">
        <TerminalTitleBar
          title="MARKETS_ARENA"
          accent="primary"
          subtitle={
            <>
              System Status: <span className="text-neon-green">ONLINE</span> | Trading: AMM | Mode: M0
            </>
          }
          right={
            <>
              <div className="text-[10px] text-text-dim uppercase">Loaded</div>
              <div className="text-xs text-white">{marketsQ.markets.length} markets</div>
            </>
          }
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TerminalSegmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "OPEN", label: "[ OPEN ]" },
              { value: "RESOLVED", label: "[ RESOLVED ]" },
              { value: "ALL", label: "[ ALL ]" }
            ]}
          />

          <div className="flex items-center gap-3">
            <TerminalSearchInput value={q} onChange={setQ} placeholder="> Search markets..." accent="primary" />
            <button
              className="px-2 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/40 text-[10px] uppercase font-bold hover:bg-primary/20 transition-colors"
              onClick={() => void marketsQ.refresh()}
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <TerminalTable
          className="flex-1"
          head={
            <tr className="border-b border-border-terminal bg-surface-terminal text-[10px] text-text-dim uppercase tracking-widest font-mono">
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">Question</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">YES</th>
              <th className="p-3 text-right">NO</th>
            </tr>
          }
          body={
            <tbody className="divide-y divide-border-terminal text-xs">
              {marketsQ.loading ? (
                <tr>
                  <td className="p-4 text-text-dim" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : marketsQ.error ? (
                <tr>
                  <td className="p-4 text-red-400" colSpan={5}>
                    {marketsQ.error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-text-dim" colSpan={5}>
                    No markets.
                  </td>
                </tr>
              ) : (
                filtered.map((m, idx) => (
                  <tr
                    key={m.id}
                    className="hover:bg-surface-terminal/60 transition-colors cursor-pointer"
                    role="link"
                    tabIndex={0}
                    onClick={() => {
                      window.location.hash = `#/market/${m.id}`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.location.hash = `#/market/${m.id}`;
                      }
                    }}
                  >
                    <td className="p-3 text-center font-bold text-primary">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <div className="text-white font-bold tracking-tight">{m.title}</div>
                        <div className="text-[10px] text-text-dim font-mono mt-1 truncate">{m.description ?? ""}</div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <StatusPill status={m.status} outcome={m.outcome} />
                    </td>
                    <td className="p-3 text-right text-trade-yes font-mono">{fmtPct01(m.priceYes)}</td>
                    <td className="p-3 text-right text-trade-no font-mono">{fmtPct01(m.priceNo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          }
        />
      </main>
    </div>
  );
}
