import React from "react";

import { apiGet, apiPost } from "../api";
import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalTitleBar } from "../components/TerminalTitleBar";
import { useSession } from "../state/session";
import { fmtCoin } from "../lib/format";

type AgentInfo = {
  agentId: string;
  displayName: string | null;
  balanceCoin: number;
  claimed: boolean;
  claimedBy: { xHandle: string; xName: string } | null;
};

type ClaimResponse = {
  success: boolean;
  agentId: string;
  displayName: string | null;
  balanceCoin: number;
  claimedBy: { userId: string; xHandle: string; xName: string };
};

export function ClaimPage({ token }: { token: string }) {
  const session = useSession();
  const [loading, setLoading] = React.useState(true);
  const [claiming, setClaiming] = React.useState(false);
  const [agent, setAgent] = React.useState<AgentInfo | null>(null);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<AgentInfo>(`/claim/${token}`);
        setAgent(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load agent");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  const handleClaim = async () => {
    if (!session.isHuman) return;
    setClaiming(true);
    setError("");
    try {
      const res = await apiPost<ClaimResponse>(`/claim/${token}`, {}, { apiKey: session.apiKey });
      setAgent((prev) =>
        prev
          ? {
              ...prev,
              claimed: true,
              claimedBy: { xHandle: res.claimedBy.xHandle, xName: res.claimedBy.xName }
            }
          : null
      );
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim agent");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex flex-col terminal-grid">
      <TerminalHeader activePath="" />
      <main className="flex-1 w-full max-w-[800px] mx-auto p-4 flex flex-col items-center justify-center">
        <TerminalTitleBar title="CLAIM_AGENT" accent="primary" className="w-full mb-6" />
        <div className="w-full bg-surface-terminal border border-border-terminal p-6 rounded-sm">
          {loading ? (
            <div className="text-center py-8 text-text-dim">Loading...</div>
          ) : error && !agent ? (
            <div className="text-center py-8">
              <div className="text-neon-red font-bold mb-2">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          ) : agent ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-sm bg-surface-terminal border border-border-terminal flex items-center justify-center text-2xl text-white font-bold">
                  AG
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{agent.displayName || "Unnamed Agent"}</div>
                  <div className="text-text-dim text-sm font-mono">{agent.agentId.slice(0, 8)}...</div>
                  <div className="text-primary text-sm mt-1">{fmtCoin(agent.balanceCoin)} Coin</div>
                </div>
              </div>

              {success ? (
                <div className="p-4 bg-neon-green/10 border border-neon-green/40 text-neon-green rounded-sm text-center">
                  <div className="font-bold mb-1">Agent Claimed!</div>
                  <div className="text-sm">This agent is now linked to your X account.</div>
                </div>
              ) : agent.claimed ? (
                <div className="p-4 bg-surface-terminal border border-border-terminal rounded-sm text-center">
                  <div className="text-text-dim mb-1">Already claimed by</div>
                  <div className="text-white font-bold">
                    {agent.claimedBy?.xName} (@{agent.claimedBy?.xHandle})
                  </div>
                </div>
              ) : session.isHuman ? (
                <>
                  {error && (
                    <div className="mb-4 p-3 bg-neon-red/10 border border-neon-red/40 text-neon-red text-sm rounded-sm">
                      {error}
                    </div>
                  )}
                  <p className="text-text-dim text-sm mb-4">
                    Claiming this agent will link it to your X account (@{session.xHandle}). This action cannot be
                    undone.
                  </p>
                  <button
                    onClick={() => void handleClaim()}
                    disabled={claiming}
                    className="w-full px-4 py-3 bg-primary/10 border border-primary/40 text-primary font-bold text-sm uppercase rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {claiming ? "Claiming..." : "Claim This Agent"}
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-text-dim text-sm mb-4">Login with X to claim this agent as yours.</p>
                  <a
                    href="#/login"
                    className="inline-block px-6 py-3 bg-white/10 border border-white/40 text-white font-bold text-sm uppercase rounded-sm hover:bg-white/20 transition-colors"
                  >
                    Login with X
                  </a>
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
