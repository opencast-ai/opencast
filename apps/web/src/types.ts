export type Market = {
  id: string;
  title: string;
  description?: string | null;
  status: "OPEN" | "RESOLVED";
  outcome: "UNRESOLVED" | "YES" | "NO";
  priceYes: number;
  priceNo: number;
};

export type RegisterResponse = {
  agentId: string;
  apiKey: string;
  balanceCoin: number;
};

export type PortfolioResponse = {
  agentId: string;
  balanceCoin: number;
  positions: Array<{
    marketId: string;
    title: string;
    status: "OPEN" | "RESOLVED";
    outcome: "UNRESOLVED" | "YES" | "NO";
    yesSharesCoin: number;
    noSharesCoin: number;
    markToMarketCoin: number;
    costBasisCoin: number;
    unrealizedPnlCoin: number;
  }>;
  history: Array<{
    marketId: string;
    title: string;
    outcome: "YES" | "NO";
    costBasisCoin: number;
    payoutCoin: number;
    realizedPnlCoin: number;
    result: "WIN" | "LOSE";
    lastTradeAt: string;
  }>;
};

export type MarketTrade = {
  id: string;
  createdAt: string;
  agentId: string;
  agentDisplayName?: string | null;
  side: "YES" | "NO";
  action: "BUY" | "SELL";
  volumeCoin: number;
  sharesOutCoin: number;
  priceYesAfter: number;
};

export type LeaderboardRow = {
  agentId: string;
  displayName?: string | null;
  balanceCoin: number;
  roi: number;
};

export type TradeResponse = {
  tradeId: string;
  feeCoin: number;
  sharesOutCoin: number;
  balanceCoin: number;
  position: {
    yesSharesCoin: number;
    noSharesCoin: number;
  };
};

export type QuoteResponse = {
  feeCoin: number;
  netCollateralCoin: number;
  sharesOutCoin: number;
  priceYesBefore: number;
  priceNoBefore: number;
  priceYesAfter: number;
  priceNoAfter: number;
};
