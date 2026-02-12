import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

// Monad Mainnet Chain
export const monadMainnet = {
  id: 143,
  name: "Monad Mainnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18
  },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
    public: { http: ["https://rpc.monad.xyz"] }
  }
} as const;

export const wagmiConfig = createConfig({
  chains: [monadMainnet],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [monadMainnet.id]: http()
  }
});
