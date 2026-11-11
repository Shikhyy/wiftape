// WIF Tape testnet price bot.
// Writes prices into the TestFeed contracts every ~15 seconds. TESTNET ONLY.
//
// Prices: each cycle it reads the REAL Chainlink price for the stock from Robinhood Chain mainnet (read-only, no wallet),
// then adds a small mean-reverting random move (a few tenths of a percent). Real feeds update only every few minutes,
// so without the jitter most 5-minute rounds would end in a tie. The jitter is simulated and labelled as such in the docs.
//
// Usage: node --env-file=.env.testnet scripts/pricer.mjs
// Env:   NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID, PUSHER_PRIVATE_KEY, FEED_NVDA, FEED_TSLA, FEED_AAPL
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var ${k}. See docs/11-TESTNET-GUIDE.md.`);
    process.exit(1);
  }
  return v;
};

const MAINNET_RPC = process.env.MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const INTERVAL_MS = Number(process.env.PRICER_INTERVAL_MS || 15_000);

const testnet = defineChain({
  id: Number(need("NEXT_PUBLIC_CHAIN_ID")),
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [need("NEXT_PUBLIC_RPC_URL")] } },
});
const mainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [MAINNET_RPC] } },
});

const account = privateKeyToAccount(need("PUSHER_PRIVATE_KEY"));
const pub = createPublicClient({ chain: testnet, transport: http() });
const main = createPublicClient({ chain: mainnet, transport: http() });
const wallet = createWalletClient({ account, chain: testnet, transport: http() });

// Real mainnet Chainlink feeds (verified on 10 Nov 2026, see docs/08-CHAIN-VERIFICATION.md). Prefer the 24/7 feeds.
const SOURCES = [
  { symbol: "NVDA", real: "0x321A36e441DfBadA01Aa6f9884F14a344E133D1F", feed: need("FEED_NVDA") },
  { symbol: "TSLA", real: "0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37", feed: need("FEED_TSLA") },
  { symbol: "AAPL", real: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0", feed: need("FEED_AAPL") },
].map((s) => ({ ...s, jitter: 0, lastReal: undefined }));

const feedAbi = parseAbi(["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"]);
const pushAbi = parseAbi(["function push(int256 answer)"]);
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Box-Muller normal sample.
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

async function realPrice(s) {
  try {
    const r = await main.readContract({ address: s.real, abi: feedAbi, functionName: "latestRoundData" });
    s.lastReal = r[1]; // int256, 8 decimals
  } catch (e) {
    log(`real price read failed for ${s.symbol}, reusing last value:`, (e.shortMessage || e.message || "").split("\n")[0]);
  }
  return s.lastReal;
}

async function tick() {
  for (const s of SOURCES) {
    const real = await realPrice(s);
    if (real === undefined) continue; // nothing to anchor to yet
    // Ornstein-Uhlenbeck style jitter: pulled back toward 0, kicked by noise.
    s.jitter = s.jitter * 0.85 + gauss() * 0.0006;
    const price = BigInt(Math.round(Number(real) * (1 + s.jitter)));
    try {
      const { request } = await pub.simulateContract({ account, address: s.feed, abi: pushAbi, functionName: "push", args: [price] });
      const hash = await wallet.writeContract(request);
      await pub.waitForTransactionReceipt({ hash });
      log(`${s.symbol} real=${(Number(real) / 1e8).toFixed(2)} pushed=${(Number(price) / 1e8).toFixed(2)} (${(s.jitter * 100).toFixed(2)}%) tx=${hash.slice(0, 12)}…`);
    } catch (e) {
      log(`push failed for ${s.symbol}:`, (e.shortMessage || e.message || "").split("\n")[0]);
    }
  }
}

log(`price bot started as ${account.address}`);
for (;;) {
  await tick();
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
