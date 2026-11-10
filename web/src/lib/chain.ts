import { defineChain } from "viem";
import { CONFIG } from "./config";

/** The chain the app talks to. Falls back to a local placeholder when no chain is configured (demo mode). */
export const appChain = defineChain({
  id: CONFIG.chainId || 31337,
  name: CONFIG.chainId ? CONFIG.chainName : "Demo (no chain configured)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl || "http://127.0.0.1:8545"] } },
  blockExplorers: CONFIG.explorerUrl ? { default: { name: "Explorer", url: CONFIG.explorerUrl } } : undefined,
});
