// WIF Tape keeper: opens, settles and voids rounds on a timer. Anyone can run it; it only pays gas.
// The contract's functions are permissionless, so this bot holds no special power and no funds beyond gas.
//
// Usage (Node 20.6+):  node --env-file=.env.local scripts/keeper.mjs
// Required env:  NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_TAPE_ADDRESS, KEEPER_PRIVATE_KEY
// Use a dedicated throwaway wallet with a little gas. Never reuse a wallet that holds real funds.
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var ${k}. See web/.env.example.`);
    process.exit(1);
  }
  return v;
};

const rpc = need("NEXT_PUBLIC_RPC_URL");
const chain = defineChain({
  id: Number(need("NEXT_PUBLIC_CHAIN_ID")),
  name: "WIF Tape chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
const tape = need("NEXT_PUBLIC_TAPE_ADDRESS");
const account = privateKeyToAccount(need("KEEPER_PRIVATE_KEY"));
const INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS || 20_000);
const VOID_GRACE = 3600; // must match WifTape.VOID_GRACE

const abi = parseAbi([
  "struct Round { uint32 marketId; uint8 status; uint8 winner; uint64 openTime; uint64 lockTime; uint64 endTime; int256 openPrice; int256 closePrice; uint256 totalUp; uint256 totalDown; uint256 weightUp; uint256 weightDown; uint256 burned; }",
  "function marketsCount() view returns (uint256)",
  "function markets(uint256) view returns (address feed, uint32 entryWindow, uint32 duration, uint32 maxStaleness, uint32 maxSettleLag, bool active, string symbol, address stockToken)",
  "function currentRound(uint256) view returns (uint256)",
  "function getRound(uint256) view returns (Round)",
  "function openRound(uint256) returns (uint256)",
  "function settle(uint256)",
  "function voidRound(uint256)",
]);

const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });

const log = (...a) => console.log(new Date().toISOString(), ...a);

/** Simulate first so a revert (stale price, market closed, too early) costs no gas. */
async function send(functionName, args, label) {
  try {
    const { request } = await pub.simulateContract({ account, address: tape, abi, functionName, args });
    const hash = await wallet.writeContract(request);
    await pub.waitForTransactionReceipt({ hash });
    log(`OK   ${label}  tx=${hash}`);
  } catch (e) {
    log(`skip ${label}: ${(e.shortMessage || e.message || "").split("\n")[0]}`);
  }
}

async function tick() {
  const now = Math.floor(Date.now() / 1000);
  const count = Number(await pub.readContract({ address: tape, abi, functionName: "marketsCount" }));
  for (let id = 0; id < count; id++) {
    const m = await pub.readContract({ address: tape, abi, functionName: "markets", args: [BigInt(id)] });
    const [, , , , maxSettleLag, active, symbol] = m;
    if (!active) continue;
    const cur = await pub.readContract({ address: tape, abi, functionName: "currentRound", args: [BigInt(id)] });

    if (cur === 0n) {
      await send("openRound", [BigInt(id)], `open ${symbol}`);
      continue;
    }
    const r = await pub.readContract({ address: tape, abi, functionName: "getRound", args: [cur] });
    if (r.status === 1) {
      const end = Number(r.endTime);
      if (now >= end + Number(maxSettleLag) + VOID_GRACE) await send("voidRound", [cur], `void ${symbol} #${cur}`);
      else if (now >= end) await send("settle", [cur], `settle ${symbol} #${cur}`);
    } else {
      await send("openRound", [BigInt(id)], `open ${symbol}`);
    }
  }
}

log(`keeper started as ${account.address} -> ${tape}`);
for (;;) {
  try {
    await tick();
  } catch (e) {
    log("tick failed:", (e.shortMessage || e.message || "").split("\n")[0]);
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
