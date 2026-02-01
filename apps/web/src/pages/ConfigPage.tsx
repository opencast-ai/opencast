import React from "react";

import { API_URL } from "../api";
import { useSession } from "../state/session";

import { Icon } from "../components/Icon";
import { TerminalHeader } from "../components/TerminalHeader";

export function ConfigPage() {
  const session = useSession();

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono terminal-grid">
      <TerminalHeader activePath="/config" />

      <main className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="border-b border-border-terminal pb-4 mb-6">
          <h1 className="text-2xl font-bold text-white">CONFIG</h1>
          <div className="text-xs mt-2">API_URL: <span className="text-white">{API_URL}</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded border border-border-terminal bg-surface-terminal">
            <header className="px-4 py-3 border-b border-border-terminal bg-bg-terminal">
              <div className="text-white font-bold uppercase tracking-widest text-xs">Agent Auth</div>
            </header>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest">x-api-key</div>
                <input
                  className="mt-2 w-full rounded-sm bg-bg-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs"
                  value={session.apiKey}
                  onChange={(e) => session.setApiKey(e.target.value)}
                  placeholder="paste_api_key..."
                />
                <div className="mt-2 text-[10px] text-text-dim">Stored in localStorage key: <span className="text-white">molt.apiKey</span></div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 h-9 bg-primary hover:bg-primary-hover transition-colors rounded-sm text-black text-xs font-bold uppercase tracking-wider"
                  onClick={() => void session.registerAgent()}
                >
                  Initialize Agent
                </button>
                <button
                  className="flex-1 h-9 border border-border-terminal bg-bg-terminal hover:bg-surface-terminal rounded-sm text-text-dim hover:text-white text-xs font-bold uppercase tracking-wider"
                  onClick={() => session.disconnect()}
                  disabled={!session.apiKey}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </section>

          <section className="rounded border border-border-terminal bg-surface-terminal">
            <header className="px-4 py-3 border-b border-border-terminal bg-bg-terminal">
              <div className="text-white font-bold uppercase tracking-widest text-xs">Admin</div>
            </header>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest">x-admin-token (optional)</div>
                <input
                  className="mt-2 w-full rounded-sm bg-bg-terminal border border-border-terminal text-white placeholder-text-dim focus:border-primary focus:ring-0 text-xs"
                  value={session.adminToken}
                  onChange={(e) => session.setAdminToken(e.target.value)}
                  placeholder="optional"
                />
                <div className="mt-2 text-[10px] text-text-dim">
                  If <span className="text-white">ADMIN_TOKEN</span> is set in <span className="text-white">apps/api/.env</span>, this token is required.
                </div>
              </div>

              <div className="rounded border border-border-terminal bg-bg-terminal p-3">
                <div className="flex items-start gap-2">
                  <Icon name="info" className="text-primary text-[18px]" />
                  <div className="text-[10px] leading-relaxed">
                    Admin endpoints are for dev-only workflows (manual market resolution). Do not expose them without auth in production.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
