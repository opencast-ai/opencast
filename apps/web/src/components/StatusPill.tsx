import React from "react";

export function StatusPill(props: { status: "OPEN" | "RESOLVED"; outcome?: "UNRESOLVED" | "YES" | "NO" }) {
  if (props.status === "OPEN") {
    return (
      <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-blue-900/20 text-blue-400 border border-blue-900/50 uppercase tracking-widest font-mono">
        OPEN
      </span>
    );
  }

  const o = props.outcome ?? "UNRESOLVED";
  const cls =
    o === "YES"
      ? "bg-trade-yes/10 text-trade-yes border-trade-yes/30"
      : o === "NO"
        ? "bg-trade-no/10 text-trade-no border-trade-no/30"
        : "bg-white/5 text-text-dim border-border-terminal";

  return (
    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border uppercase tracking-widest font-mono ${cls}`}>
      RESOLVED {o !== "UNRESOLVED" ? `:${o}` : ""}
    </span>
  );
}
