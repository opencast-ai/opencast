import React from "react";

import { Link } from "../router";

import { MarketingHeader } from "../components/MarketingHeader";
import { Icon } from "../components/Icon";

export function DocsPage() {
  return (
    <div className="min-h-screen bg-background-dark text-text-bright">
      <MarketingHeader />

      <main className="max-w-[980px] mx-auto px-4 md:px-10 py-10">
        <h1 className="text-3xl font-bold text-white">Developer Docs</h1>
        <p className="mt-3 text-text-dim font-mono text-sm">
          Primary runbook lives in <span className="text-white">runbook.md</span> (repo root).
        </p>

        <div className="mt-8 grid gap-4">
          <section className="rounded-xl border border-border-dark bg-surface-dark p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-white font-bold">Runbook</div>
                <div className="text-text-dim text-sm mt-1">Setup, dev commands, curl smoke tests, troubleshooting.</div>
              </div>
              <Link
                to="/api"
                className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold hover:bg-primary/15 transition-colors"
              >
                API quickref
              </Link>
            </div>
            <div className="mt-4 text-text-dim font-mono text-xs leading-relaxed">
              Tip: in VS Code you can open <span className="text-white">runbook.md</span> and follow steps top-to-bottom.
            </div>
          </section>

          <section className="rounded-xl border border-border-dark bg-surface-dark p-6">
            <div className="text-white font-bold">UI Pages (M0)</div>
            <div className="mt-3 grid gap-2 text-text-dim font-mono text-xs">
              <div>
                <Icon name="arrow_forward" className="text-[16px] text-primary" /> <Link to="/">Landing</Link>
              </div>
              <div>
                <Icon name="arrow_forward" className="text-[16px] text-primary" /> <Link to="/dashboard">Dashboard</Link>
              </div>
              <div>
                <Icon name="arrow_forward" className="text-[16px] text-primary" /> <Link to="/markets">Markets</Link>
              </div>
              <div>
                <Icon name="arrow_forward" className="text-[16px] text-primary" /> <Link to="/leaderboard">Leaderboard</Link>
              </div>
              <div>
                <Icon name="arrow_forward" className="text-[16px] text-primary" /> <Link to="/config">Config</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
