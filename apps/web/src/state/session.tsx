import React from "react";

import { apiPost } from "../api";
import type { RegisterResponse } from "../types";

type SessionState = {
  apiKey: string;
  agentId: string;
  adminToken: string;

  setApiKey: (v: string) => void;
  setAdminToken: (v: string) => void;

  registerAgent: () => Promise<void>;
  disconnect: () => void;
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
    // ignore
  }
}

export function SessionProvider(props: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = React.useState<string>(() => loadLocal("molt.apiKey"));
  const [agentId, setAgentIdState] = React.useState<string>(() => loadLocal("molt.agentId"));
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

  const disconnect = React.useCallback(() => {
    setApiKey("");
    setAgentId("");
    setAdminToken("");
  }, [setApiKey, setAgentId]);

  const registerAgent = React.useCallback(async () => {
    const res = await apiPost<RegisterResponse>("/agents/register", { displayName: "web-agent" });
    setApiKey(res.apiKey);
    setAgentId(res.agentId);
  }, [setApiKey, setAgentId]);

  const value: SessionState = {
    apiKey,
    agentId,
    adminToken,
    setApiKey,
    setAdminToken,
    registerAgent,
    disconnect
  };

  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
