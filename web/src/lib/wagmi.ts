import { createConfig, http, injected } from "wagmi";
import { appChain } from "./chain";
import { CONFIG } from "./config";

/** Wallet setup: any injected EIP-1193 wallet (MetaMask, Rabby, Robinhood Wallet, ...). */
export const wagmiConfig = createConfig({
  chains: [appChain],
  connectors: [injected()],
  // batch: true merges the many contract reads made in one poll into a single JSON-RPC request, which keeps a public RPC from rate-limiting us.
  transports: { [appChain.id]: http(CONFIG.rpcUrl || undefined, { batch: true }) },
  ssr: true,
});
