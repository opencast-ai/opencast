import React from "react";

import { apiPost } from "../api";
import { API_URL } from "../api";
import type { RegisterResponse, AccountType } from "../types";

type SessionState = {
  apiKey: string;
  agentId: string;
  userId: string;
  accountType: AccountType | null;
  xHandle: string;
  xName: string;
  xAvatar: string;
  adminToken: string;

  setApiKey: (v: string) => void;
  setAdminToken: (v: string) => void;

  registerAgent: () => Promise<void>;
  loginWithX: () => void;
  handleAuthCallback: (params: {
    apiKey: string;
    userId: string;
    xHandle: string;
    xName: string;
    xAvatar: string;
    balanceCoin: string;
  }) => void;
  disconnect: () => void;

  isLoggedIn: boolean;
  isHuman: boolean;
  isAgent: boolean;
};

const SessionContext = React.createContext<SessionState | null>(null);

function loadLocal(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function saveLocal(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
  }
}

export function SessionProvider(props: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = React.useState<string>(() => loadLocal("molt.apiKey"));
  const [agentId, setAgentIdState] = React.useState<string>(() => loadLocal("molt.agentId"));
  const [userId, setUserIdState] = React.useState<string>(() => loadLocal("molt.userId"));
  const [accountType, setAccountTypeState] = React.useState<AccountType | null>(() => {
    const stored = loadLocal("molt.accountType");
    return stored === "AGENT" || stored === "HUMAN" ? stored : null;
  });
  const [xHandle, setXHandleState] = React.useState<string>(() => loadLocal("molt.xHandle"));
  const [xName, setXNameState] = React.useState<string>(() => loadLocal("molt.xName"));
  const [xAvatar, setXAvatarState] = React.useState<string>(() => loadLocal("molt.xAvatar"));
  const [adminToken, setAdminToken] = React.useState<string>("");

  const setApiKey = React.useCallback((v: string) => {
    const next = v.trim();
    setApiKeyState(next);
    saveLocal("molt.apiKey", next);
  }, []);

  const setAgentId = React.useCallback((v: string) => {
    const next = v.trim();
    setAgentIdState(next);
    saveLocal("molt.agentId", next);
  }, []);

  const setUserId = React.useCallback((v: string) => {
    const next = v.trim();
    setUserIdState(next);
    saveLocal("molt.userId", next);
  }, []);

  const setAccountType = React.useCallback((v: AccountType | null) => {
    setAccountTypeState(v);
    saveLocal("molt.accountType", v ?? "");
  }, []);

  const setXHandle = React.useCallback((v: string) => {
    setXHandleState(v);
    saveLocal("molt.xHandle", v);
  }, []);

  const setXName = React.useCallback((v: string) => {
    setXNameState(v);
    saveLocal("molt.xName", v);
  }, []);

  const setXAvatar = React.useCallback((v: string) => {
    setXAvatarState(v);
    saveLocal("molt.xAvatar", v);
  }, []);

  const disconnect = React.useCallback(() => {
    setApiKey("");
    setAgentId("");
    setUserId("");
    setAccountType(null);
    setXHandle("");
    setXName("");
    setXAvatar("");
    setAdminToken("");
  }, [setApiKey, setAgentId, setUserId, setAccountType, setXHandle, setXName, setXAvatar]);

  const registerAgent = React.useCallback(async () => {
    const res = await apiPost<RegisterResponse>("/agents/register", { displayName: "web-agent" });
    setApiKey(res.apiKey);
    setAgentId(res.agentId);
    setAccountType("AGENT");
  }, [setApiKey, setAgentId, setAccountType]);

  const loginWithX = React.useCallback(() => {
    window.location.href = `${API_URL}/oauth/twitter`;
  }, []);

  const handleAuthCallback = React.useCallback(
    (params: { apiKey: string; userId: string; xHandle: string; xName: string; xAvatar: string; balanceCoin: string }) => {
      setApiKey(params.apiKey);
      setUserId(params.userId);
      setXHandle(params.xHandle);
      setXName(params.xName);
      setXAvatar(params.xAvatar);
      setAccountType("HUMAN");
    },
    [setApiKey, setUserId, setXHandle, setXName, setXAvatar, setAccountType]
  );

  const isLoggedIn = Boolean(apiKey);
  const isHuman = accountType === "HUMAN";
  const isAgent = accountType === "AGENT";

  const value: SessionState = {
    apiKey,
    agentId,
    userId,
    accountType,
    xHandle,
    xName,
    xAvatar,
    adminToken,
    setApiKey,
    setAdminToken,
    registerAgent,
    loginWithX,
    handleAuthCallback,
    disconnect,
    isLoggedIn,
    isHuman,
    isAgent
  };

  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
