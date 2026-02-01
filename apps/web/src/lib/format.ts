export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function fmtPct01(v01: number): string {
  return `${(clamp01(v01) * 100).toFixed(1)}%`;
}

export function fmtCoin(v: number): string {
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(6).replace(/\.0+$/, "").replace(/(\.\d+?)0+$/, "$1");
}

export function shortId(id: string): string {
  if (!id) return "-";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
