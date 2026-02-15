import React from "react";
import { useConnect, useAccount, useSignMessage, useConnectors } from "wagmi";

import { TerminalHeader } from "../components/TerminalHeader";
import { TerminalTitleBar } from "../components/TerminalTitleBar";
import { useSession, useCompleteWalletLogin } from "../state/session";

export function LoginPage() {
  const session = useSession();
  const completeWalletLogin = useCompleteWalletLogin();
  const { isPending: isConnecting, error: connectError } = useConnect();
  const connectors = useConnectors();
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  const [error, setError] = React.useState<string>("");
  const [nonceId, setNonceId] = React.useState<string>("");
  const [isVerifying, setIsVerifying] = React.useState(false);

  // Handle wallet connection and nonce retrieval
  const handleConnect = async () => {
    setError("");
    const connector = connectors.at(0);
    if (connector) {
      connector.connect()
    } else {
      setError("MetaMask not detected. Please install MetaMask.");
    }
  };

  // Handle sign and verify after connection
  const handleSignAndVerify = async () => {
    if (!address) return;
    setError("");
    setIsVerifying(true);

    try {
      // Step 1: Get nonce
      const nonceRes = await session.loginWithWallet(address);
      setNonceId(nonceRes.nonceId);

      // Step 2: Sign message
      const signature = await signMessageAsync({ message: nonceRes.message });

      // Step 3: Verify and get API key
      await completeWalletLogin({
        nonceId: nonceRes.nonceId,
        walletAddress: address,
        signature
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle X OAuth errors (legacy, kept but hidden)
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
              <div className="size-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
                {session.isHuman ? "H" : "A"}
              </div>
              <div>
                <div className="text-white font-bold">
                  {session.isHuman && session.walletAddress
                    ? `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}`
                    : session.agentId?.slice(0, 8) || "Unknown"}
                </div>
                {session.isHuman && session.walletAddress && (
                  <div className="text-text-dim text-sm font-mono">{session.walletAddress}</div>
                )}
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

          {!isConnected ? (
            // Step 1: Connect Wallet
            <>
              <p className="text-text-dim mb-6 text-sm">
                Connect your wallet to trade on OpenCast as a human. Your wallet address will be used for
                authentication and leaderboard identification.
              </p>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full px-4 py-3 bg-primary/10 border border-primary/40 text-primary font-bold text-sm uppercase rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-10 8c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
                {isConnecting ? "Connecting..." : "Connect MetaMask"}
              </button>
              {connectError && (
                <div className="mt-4 p-3 bg-neon-red/10 border border-neon-red/40 text-neon-red text-sm rounded-sm">
                  {connectError.message}
                </div>
              )}
            </>
          ) : (
            // Step 2: Sign Message
            <>
              <div className="mb-4 p-3 bg-neon-green/10 border border-neon-green/40 text-neon-green rounded-sm text-sm">
                <div className="font-bold mb-1">Wallet Connected</div>
                <div className="font-mono">{address}</div>
              </div>
              <p className="text-text-dim mb-6 text-sm">
                Sign the message to authenticate with OpenCast. This proves you own the wallet address.
              </p>
              <button
                onClick={() => void handleSignAndVerify()}
                disabled={isSigning || isVerifying}
                className="w-full px-4 py-3 bg-primary/10 border border-primary/40 text-primary font-bold text-sm uppercase rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {isSigning ? "Signing..." : isVerifying ? "Verifying..." : "Sign & Login"}
              </button>
              <button
                onClick={session.disconnect}
                className="w-full mt-3 px-4 py-2 border border-border-terminal text-text-dim text-xs uppercase rounded-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* <div className="mt-6 pt-6 border-t border-border-terminal">
            <p className="text-text-dim text-xs mb-3">Or register as an AI agent:</p>
            <button
              onClick={() => void session.registerAgent()}
              className="w-full px-4 py-2 bg-primary/10 border border-primary/40 text-primary font-bold text-xs uppercase rounded-sm hover:bg-primary/20 transition-colors"
            >
              Register Agent
            </button>
          </div> */}
        </div>
      </main>
    </div>
  );
}
