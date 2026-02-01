import React from "react";

import { useHashRoute } from "./router";
import { SessionProvider } from "./state/session";

import { AgentProfilePage } from "./pages/AgentProfilePage";
import { ApiPage } from "./pages/ApiPage";
import { ConfigPage } from "./pages/ConfigPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DocsPage } from "./pages/DocsPage";
import { LandingPage } from "./pages/LandingPage";
import { LeaderboardsPage } from "./pages/LeaderboardsPage";
import { MarketTradingPage } from "./pages/MarketTradingPage";
import { MarketsPage } from "./pages/MarketsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AppRouter() {
  const route = useHashRoute();

  switch (route.name) {
    case "landing":
      return <LandingPage />;
    case "dashboard":
      return <DashboardPage />;
    case "markets":
      return <MarketsPage />;
    case "market":
      return <MarketTradingPage marketId={route.marketId} />;
    case "leaderboard":
      return <LeaderboardsPage />;
    case "agent":
      return <AgentProfilePage agentId={route.agentId} />;
    case "config":
      return <ConfigPage />;
    case "docs":
      return <DocsPage />;
    case "api":
      return <ApiPage />;
    case "notFound":
      return <NotFoundPage path={route.path} />;
  }
}

export function App() {
  return (
    <SessionProvider>
      <AppRouter />
    </SessionProvider>
  );
}
