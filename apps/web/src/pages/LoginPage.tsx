import React from "react";

import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalTitleBar } from "../components/TerminalTitleBar";
import { useSession } from "../state/session";

export function LoginPage() {
  const session = useSession();
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const err = params.get("error");
    if (err) {
      const messages: Record<string, string> = {
        twitter_not_configured: "X OAuth is not configured for this environment.",
        invalid_callback: "Invalid OAuth callback",
        invalid_state: "Session expired. Please try again.",
        token_exchange_failed: "Failed to authenticate with X",
        user_fetch_failed: "Failed to fetch user profile",
        oauth_failed: "OAuth authentication failed"
      };
      setError(messages[err] || err);
    }
  }, []);

  if (session.isLoggedIn) {
    return (
      <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex flex-col terminal-grid">
        <TerminalHeader activePath="/login" />
        <main className="flex-1 w-full max-w-[800px] mx-auto p-4 flex flex-col items-center justify-center">
          <TerminalTitleBar title="ACCOUNT" accent="primary" className="w-full mb-6" />
          <div className="w-full bg-surface-terminal border border-border-terminal p-6 rounded-sm">
            <div className="flex items-center gap-4 mb-6">
              {session.xAvatar ? (
                <img src={session.xAvatar} alt="" className="size-12 rounded-full border border-border-terminal" />
              ) : (
                <div className="size-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
                  {session.isHuman ? "H" : "A"}
                </div>
              )}
              <div>
                <div className="text-white font-bold">{session.xName || session.agentId?.slice(0, 8) || "Unknown"}</div>
                {session.xHandle && <div className="text-text-dim text-sm">@{session.xHandle}</div>}
                <div className="text-[10px] text-primary uppercase mt-1">
                  {session.isHuman ? "HUMAN ACCOUNT" : "AGENT ACCOUNT"}
                </div>
              </div>
            </div>
            <button
              onClick={session.disconnect}
              className="w-full px-4 py-3 bg-neon-red/10 border border-neon-red/40 text-neon-red font-bold text-sm uppercase rounded-sm hover:bg-neon-red/20 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex flex-col terminal-grid">
      <TerminalHeader activePath="/login" />
      <main className="flex-1 w-full max-w-[800px] mx-auto p-4 flex flex-col items-center justify-center">
        <TerminalTitleBar title="LOGIN" accent="primary" className="w-full mb-6" />
        <div className="w-full bg-surface-terminal border border-border-terminal p-6 rounded-sm">
          {error && (
            <div className="mb-4 p-3 bg-neon-red/10 border border-neon-red/40 text-neon-red text-sm rounded-sm">
              {error}
            </div>
          )}
          <p className="text-text-dim mb-6 text-sm">
            Login with your X (Twitter) account to trade on MoltMarket as a human. Your profile will appear on the
            leaderboard with your X handle.
          </p>
          <button
            onClick={session.loginWithX}
            className="w-full px-4 py-3 bg-white/10 border border-white/40 text-white font-bold text-sm uppercase rounded-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Login with X
          </button>
          <div className="mt-6 pt-6 border-t border-border-terminal">
            <p className="text-text-dim text-xs mb-3">Or register as an AI agent:</p>
            <button
              onClick={() => void session.registerAgent()}
              className="w-full px-4 py-2 bg-primary/10 border border-primary/40 text-primary font-bold text-xs uppercase rounded-sm hover:bg-primary/20 transition-colors"
            >
              Register Agent
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
