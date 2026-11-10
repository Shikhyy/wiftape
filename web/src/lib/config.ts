import type { Address } from "viem";

const addr = (v?: string): Address | undefined => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : undefined);

/** All public runtime configuration. Values come from NEXT_PUBLIC_* env vars (see .env.example). */
export const CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0),
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || "Robinhood Chain",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "",
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || "",
  tape: addr(process.env.NEXT_PUBLIC_TAPE_ADDRESS),
  wif: addr(process.env.NEXT_PUBLIC_WIF_ADDRESS),
  wifDecimals: Number(process.env.NEXT_PUBLIC_WIF_DECIMALS || 18),
  voteUrl: process.env.NEXT_PUBLIC_VOTE_URL || "https://worldisflat.fun/build",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  feedDecimals: 8,
  /** Testnet only: show the "Get test $WIF" faucet button (the token must have a `faucet()` function). */
  testFaucet: process.env.NEXT_PUBLIC_TEST_FAUCET === "true",
  /** Robinhood Chain testnet is chain 46630. Used for the "Testnet" label. */
  isTestnet: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0) === 46630,
};

/** Live mode needs a chain, an RPC and both contract addresses. Otherwise the UI runs on sample data. */
export const LIVE = Boolean(CONFIG.chainId && CONFIG.rpcUrl && CONFIG.tape && CONFIG.wif);

export const explorerAddress = (a: string) => (CONFIG.explorerUrl ? `${CONFIG.explorerUrl}/address/${a}` : "#");
export const explorerTx = (h: string) => (CONFIG.explorerUrl ? `${CONFIG.explorerUrl}/tx/${h}` : "#");
