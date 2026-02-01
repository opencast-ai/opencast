#!/usr/bin/env node
/**
 * render_workgraph.mjs
 *
 * Generates a compact, ASCII-friendly view of `.agent-workflow/WorkGraph.json`.
 *
 * Usage:
 *   node .agent-workflow/tools/render_workgraph.mjs
 *   node .agent-workflow/tools/render_workgraph.mjs --input .agent-workflow/WorkGraph.json --output .agent-workflow/WorkGraph_visualize.md
 */

import fs from "fs";
import path from "path";

function parseArgs(argv) {
  const args = { input: ".agent-workflow/WorkGraph.json", output: ".agent-workflow/WorkGraph_visualize.md" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" && argv[i + 1]) args.input = argv[++i];
    else if (a === "--output" && argv[i + 1]) args.output = argv[++i];
  }
  return args;
}

function pad(s, n) {
  const str = String(s ?? "");
  return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
}

function nowIso() {
  return new Date().toISOString();
}

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function normalizeStatus(status) {
  const st = String(status || "unknown").toLowerCase().trim();
  if (["working_on", "working", "in_progress", "inprogress", "active"].includes(st)) return "working";
  if (["blocked", "stalled"].includes(st)) return "blocked";
  if (["planned", "ready", "queued", "todo", "backlog"].includes(st)) return "planned";
  if (["completed", "done", "finished", "merged"].includes(st)) return "done";
  if (["cancelled", "canceled", "dropped"].includes(st)) return "cancelled";
  return st || "unknown";
}

function statusBadge(status) {
  const st = normalizeStatus(status);
  switch (st) {
    case "planned": return "P";
    case "working": return "W";
    case "blocked": return "B";
    case "done": return "D";
    case "cancelled": return "X";
    default: return "?";
  }
}

function summarizeStatuses(tasks) {
  const counts = {};
  for (const t of tasks) {
    const st = normalizeStatus(t.status);
    counts[st] = (counts[st] || 0) + 1;
  }
  return counts;
}

function truncateTitle(title, maxLen) {
  const s = String(title ?? "");
  return s.length > maxLen ? s.slice(0, Math.max(0, maxLen - 1)) + "…" : s;
}

function main() {
  const { input, output } = parseArgs(process.argv);

  const inPath = path.resolve(process.cwd(), input);
  const outPath = path.resolve(process.cwd(), output);

  const wg = safeReadJson(inPath);
  const tasks = Array.isArray(wg.tasks) ? wg.tasks : [];

  const counts = summarizeStatuses(tasks);

  // Stable sort: working -> blocked -> planned -> done -> cancelled -> unknown, then id
  const order = { working: 0, blocked: 1, planned: 2, done: 3, cancelled: 4, unknown: 5 };
  const sorted = [...tasks].sort((a, b) => {
    const sa = normalizeStatus(a.status);
    const sb = normalizeStatus(b.status);
    const oa = order[sa] ?? 9;
    const ob = order[sb] ?? 9;
    if (oa !== ob) return oa - ob;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  const lines = [];
  lines.push(`# WorkGraph_visualize.md (auto-generated)`);
  lines.push("");
  lines.push(`Generated: ${nowIso()}`);
  if (wg.meta?.project) lines.push(`Project: ${wg.meta.project}`);
  if (wg.meta?.slice_lock_id) lines.push(`Slice: ${wg.meta.slice_lock_id}`);
  lines.push("");
  lines.push("Legend: [P]=planned [W]=working [B]=blocked [D]=done [X]=cancelled [?]=unknown");
  lines.push("");

  // Summary line
  const summaryParts = Object.entries(counts)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([k, v]) => `${k}:${v}`);
  lines.push(`Status counts: ${summaryParts.join(" | ") || "none"}`);
  lines.push("");

  const header = `${pad("ID", 10)} ${pad("S", 2)} ${pad("Agent", 14)} ${pad("Title", 64)} ${pad("Deps", 24)}`;
  const sep = "-".repeat(header.length);
  lines.push("```text");
  lines.push(header);
  lines.push(sep);
  for (const t of sorted) {
    const deps = Array.isArray(t.depends_on) ? t.depends_on.join(",") : "";
    const agent = t.owner_agent || t.agent || t.assigned_to || "";
    const row = `${pad(t.id, 10)} ${pad(statusBadge(t.status), 2)} ${pad(agent, 14)} ${pad(truncateTitle(t.title, 64), 64)} ${pad(deps, 24)}`;
    lines.push(row);
  }
  lines.push("```");
  lines.push("");

  lines.push("Notes:");
  lines.push("- Edit `.agent-workflow/WorkGraph.json` (source of truth).");
  lines.push("- Re-render with: `node .agent-workflow/tools/render_workgraph.mjs`");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  process.stdout.write(`Wrote ${output}\n`);
}

main();
