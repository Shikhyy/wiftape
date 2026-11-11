// WIF Tape testnet seeder bots. TESTNET ONLY.
// Keeps the demo alive: for every market it runs two wallets, one that stakes UP and one that stakes DOWN, with random
// small amounts, during each round's entry window. That way pools are never empty and rounds do not void. It also claims
// finished rounds. These are bots, and the docs say so: the stakes are test tokens with no value.
//
// A wallet can only be in one unresolved round at a time (a contract rule), so each market gets its own pair of wallets.
//
// Usage: node --env-file=.env.testnet scripts/seeder.mjs
// Env:   NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_TAPE_ADDRESS, NEXT_PUBLIC_WIF_ADDRESS,
//        SEEDER_<i>_UP_PRIVATE_KEY and SEEDER_<i>_DOWN_PRIVATE_KEY for each market index i (0, 1, 2)
import { createPublicClient, createWalletClient, defineChain, http, maxUint256, parseAbi, parseUnits, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var ${k}. See docs/11-TESTNET-GUIDE.md.`);
    process.exit(1);
  }
  return v;
};

const chain = defineChain({
  id: Number(need("NEXT_PUBLIC_CHAIN_ID")),
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [need("NEXT_PUBLIC_RPC_URL")] } },
});
const tape = need("NEXT_PUBLIC_TAPE_ADDRESS");
const wif = need("NEXT_PUBLIC_WIF_ADDRESS");
const MARKETS = Number(process.env.SEEDER_MARKETS || 3);
const INTERVAL_MS = Number(process.env.SEEDER_INTERVAL_MS || 8_000);

const abi = parseAbi([
  "struct Round { uint32 marketId; uint8 status; uint8 winner; uint64 openTime; uint64 lockTime; uint64 endTime; int256 openPrice; int256 closePrice; uint256 totalUp; uint256 totalDown; uint256 weightUp; uint256 weightDown; uint256 burned; }",
  "function currentRound(uint256) view returns (uint256)",
  "function getRound(uint256) view returns (Round)",
  "function positions(uint256 roundId, address user) view returns (uint8 side, bool claimed, uint256 amount, uint256 weight)",
  "function players(address) view returns (uint32 streak, uint32 bestStreak, uint32 wins, uint32 played, uint8 shields, bool joined, bool referralPaid, address referrer, uint256 pendingRound)",
  "function claimable(uint256 roundId, address user) view returns (uint256)",
  "function enter(uint256 roundId, uint8 side, uint256 amount, address referrer)",
  "function claim(uint256 roundId) returns (uint256)",
]);
const erc20 = parseAbi([
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

const pub = createPublicClient({ chain, transport: http() });
const log = (...a) => console.log(new Date().toISOString(), ...a);
const short = (e) => (e.shortMessage || e.message || "").split("\n")[0];

const bots = [];
for (let i = 0; i < MARKETS; i++) {
  for (const side of ["UP", "DOWN"]) {
    const key = process.env[`SEEDER_${i}_${side}_PRIVATE_KEY`];
    if (!key) continue;
    const account = privateKeyToAccount(key);
    bots.push({ market: i, side: side === "UP" ? 1 : 2, name: `m${i}-${side}`, account, wallet: createWalletClient({ account, chain, transport: http() }) });
  }
}
if (!bots.length) {
  console.error("No SEEDER_*_PRIVATE_KEY variables found. Run scripts/testnet-setup.mjs first.");
  process.exit(1);
}

async function send(bot, address, functionName, args, label) {
  try {
    const { request } = await pub.simulateContract({ account: bot.account, address, abi: address === wif ? erc20 : abi, functionName, args });
    const hash = await bot.wallet.writeContract(request);
    await pub.waitForTransactionReceipt({ hash });
    log(`${bot.name} ${label} tx=${hash.slice(0, 12)}…`);
  } catch (e) {
    log(`${bot.name} skip ${label}: ${short(e)}`);
  }
}

async function ensureApproved(bot) {
  const a = await pub.readContract({ address: wif, abi: erc20, functionName: "allowance", args: [bot.account.address, tape] });
  if (a < parseUnits("1000000", 18)) await send(bot, wif, "approve", [tape, maxUint256], "approve");
}

async function tickBot(bot) {
  const now = Math.floor(Date.now() / 1000);

  // 1. Claim a finished round, if one is waiting.
  const p = await pub.readContract({ address: tape, abi, functionName: "players", args: [bot.account.address] });
  const pending = p[8];
  if (pending !== 0n) {
    const pr = await pub.readContract({ address: tape, abi, functionName: "getRound", args: [pending] });
    if (pr.status === 2 || pr.status === 3) {
      const c = await pub.readContract({ address: tape, abi, functionName: "claimable", args: [pending, bot.account.address] });
      if (c > 0n) await send(bot, tape, "claim", [pending], `claim #${pending}`);
    }
  }

  // 2. Enter the current round of this bot's market during the entry window.
  const id = await pub.readContract({ address: tape, abi, functionName: "currentRound", args: [BigInt(bot.market)] });
  if (id === 0n) return;
  const r = await pub.readContract({ address: tape, abi, functionName: "getRound", args: [id] });
  if (r.status !== 1 || now >= Number(r.lockTime) - 10) return;
  const pos = await pub.readContract({ address: tape, abi, functionName: "positions", args: [id, bot.account.address] });
  if (pos[2] > 0n) return; // already in
  const amount = parseUnits(String(20 + Math.floor(Math.random() * 130)), 18);
  const bal = await pub.readContract({ address: wif, abi: erc20, functionName: "balanceOf", args: [bot.account.address] });
  if (bal < amount) return log(`${bot.name} out of tWIF`);
  await send(bot, tape, "enter", [id, bot.side, amount, zeroAddress], `enter #${id} ${bot.side === 1 ? "UP" : "DOWN"}`);
}

log(`seeder started with ${bots.length} bots`);
for (const b of bots) await ensureApproved(b);
for (;;) {
  for (const b of bots) {
    try {
      await tickBot(b);
    } catch (e) {
      log(`${b.name} tick failed: ${short(e)}`);
    }
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}
