import React from "react";

import { useSession } from "../state/session";

export function AuthCallbackPage() {
  const session = useSession();
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    const hashParts = window.location.hash.split("?");
    const params = new URLSearchParams(hashParts[1] || "");

    const apiKey = params.get("apiKey");
    const userId = params.get("userId");
    const xHandle = params.get("xHandle");
    const xName = params.get("xName");
    const xAvatar = params.get("xAvatar");
    const balanceCoin = params.get("balanceCoin");
    const err = params.get("error");

    if (err) {
      setError(err);
      return;
    }

    if (!apiKey || !userId || !xHandle || !xName) {
      setError("Missing required parameters");
      return;
    }

    session.handleAuthCallback({
      apiKey,
      userId,
      xHandle,
      xName,
      xAvatar: xAvatar || "",
      balanceCoin: balanceCoin || "100"
    });
    window.location.hash = "#/dashboard";
  }, [session]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex items-center justify-center">
        <div className="bg-surface-terminal border border-neon-red/40 p-6 rounded-sm max-w-md">
          <div className="text-neon-red font-bold mb-2">Authentication Failed</div>
          <div className="text-sm mb-4">{error}</div>
          <a
            href="#/login"
            className="block text-center px-4 py-2 bg-primary/10 border border-primary/40 text-primary font-bold text-sm uppercase rounded-sm hover:bg-primary/20 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-terminal text-text-dim font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="text-primary font-bold mb-2">Authenticating...</div>
        <div className="text-sm">Please wait</div>
      </div>
    </div>
  );
}
