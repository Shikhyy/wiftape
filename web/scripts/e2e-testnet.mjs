// End-to-end player test on Robinhood Chain testnet. TESTNET ONLY.
// Does exactly what a human does through the app, with a brand-new throwaway wallet, and checks every step:
//   1. fund the wallet with a little test ETH (from the deployer)   2. tWIF faucet()   3. approve   4. enter a round
//   5. wait for the round to finish   6. claim   7. verify balances, burn and streak
// Needs the bots running (npm run testnet) so rounds open and settle.
//
// Usage: DEPLOYER_PRIVATE_KEY=0x... node --env-file=.env.testnet scripts/e2e-testnet.mjs
// Prints PASS or FAIL per check and exits non-zero if anything fails. It prints addresses, never keys.
import { createPublicClient, createWalletClient, defineChain, http, maxUint256, parseAbi, parseEther, parseUnits, formatUnits, zeroAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var ${k}.`);
    process.exit(2);
  }
  return v;
};

const chain = defineChain({
  id: Number(need("NEXT_PUBLIC_CHAIN_ID")),
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [need("NEXT_PUBLIC_RPC_URL")] } },
});
const TAPE = need("NEXT_PUBLIC_TAPE_ADDRESS");
const WIF = need("NEXT_PUBLIC_WIF_ADDRESS");
const pub = createPublicClient({ chain, transport: http() });
const deployer = privateKeyToAccount(need("DEPLOYER_PRIVATE_KEY"));
const player = privateKeyToAccount(generatePrivateKey());
const asDeployer = createWalletClient({ account: deployer, chain, transport: http() });
const asPlayer = createWalletClient({ account: player, chain, transport: http() });

const tapeAbi = parseAbi([
  "struct Round { uint32 marketId; uint8 status; uint8 winner; uint64 openTime; uint64 lockTime; uint64 endTime; int256 openPrice; int256 closePrice; uint256 totalUp; uint256 totalDown; uint256 weightUp; uint256 weightDown; uint256 burned; }",
  "function marketsCount() view returns (uint256)",
  "function currentRound(uint256) view returns (uint256)",
  "function getRound(uint256) view returns (Round)",
  "function positions(uint256, address) view returns (uint8 side, bool claimed, uint256 amount, uint256 weight)",
  "function players(address) view returns (uint32 streak, uint32 bestStreak, uint32 wins, uint32 played, uint8 shields, bool joined, bool referralPaid, address referrer, uint256 pendingRound)",
  "function claimable(uint256, address) view returns (uint256)",
  "function totalBurned() view returns (uint256)",
  "function enter(uint256 roundId, uint8 side, uint256 amount, address referrer)",
  "function claim(uint256 roundId) returns (uint256)",
]);
const wifAbi = parseAbi([
  "function faucet()",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function totalSupply() view returns (uint256)",
]);

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wif = (n) => Number(formatUnits(n, 18));
const read = (address, abi, functionName, args = []) => pub.readContract({ address, abi, functionName, args });

async function tx(wallet, account, address, abi, functionName, args = []) {
  const { request } = await pub.simulateContract({ account, address, abi, functionName, args });
  const hash = await wallet.writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted on-chain`);
  return hash;
}

console.log(`player wallet ${player.address}`);

// 1. fund
const fundHash = await asDeployer.sendTransaction({ to: player.address, value: parseEther("0.0003") });
await pub.waitForTransactionReceipt({ hash: fundHash });
check("wallet funded with test ETH", (await pub.getBalance({ address: player.address })) > 0n);

// 2. faucet
await tx(asPlayer, player, WIF, wifAbi, "faucet");
const bal0 = await read(WIF, wifAbi, "balanceOf", [player.address]);
check("faucet() gave 1,000 tWIF", bal0 === parseUnits("1000", 18), `balance ${wif(bal0)}`);

// 3. approve
await tx(asPlayer, player, WIF, wifAbi, "approve", [TAPE, maxUint256]);
check("approve() set the allowance", true);

// 4. find a round with at least 25s of entry time left, on any market
const markets = Number(await read(TAPE, tapeAbi, "marketsCount"));
let roundId;
for (let attempt = 0; attempt < 40 && !roundId; attempt++) {
  const now = Math.floor(Date.now() / 1000);
  for (let m = 0; m < markets; m++) {
    const id = await read(TAPE, tapeAbi, "currentRound", [BigInt(m)]);
    if (id === 0n) continue;
    const r = await read(TAPE, tapeAbi, "getRound", [id]);
    if (r.status === 1 && Number(r.lockTime) - now > 25) {
      roundId = id;
      break;
    }
  }
  if (!roundId) {
    console.log("waiting for a round with entry time left…");
    await sleep(10_000);
  }
}
if (!roundId) {
  check("found an open round to enter", false, "is the keeper running? (npm run testnet)");
  process.exit(1);
}
const stake = parseUnits("100", 18);
const round = await read(TAPE, tapeAbi, "getRound", [roundId]);
await tx(asPlayer, player, TAPE, tapeAbi, "enter", [roundId, 1, stake, zeroAddress]);
const pos = await read(TAPE, tapeAbi, "positions", [roundId, player.address]);
check(`enter() staked 100 tWIF UP in round #${roundId}`, pos[0] === 1 && pos[2] === stake);
const bal1 = await read(WIF, wifAbi, "balanceOf", [player.address]);
check("stake left the wallet", bal1 === bal0 - stake, `balance ${wif(bal1)}`);

// 5. wait for the round to finish (settled or voided)
console.log(`waiting for round #${roundId} to end (about ${Math.max(0, Number(round.endTime) - Math.floor(Date.now() / 1000))}s)…`);
let final;
for (let i = 0; i < 90; i++) {
  final = await read(TAPE, tapeAbi, "getRound", [roundId]);
  if (final.status === 2 || final.status === 3) break;
  await sleep(10_000);
}
check("round reached a final state", final.status === 2 || final.status === 3, `status ${final.status === 2 ? "settled" : final.status === 3 ? "void" : "still open"}`);
if (final.status !== 2 && final.status !== 3) process.exit(1);

// 6. claim and verify the payout
const expected = await read(TAPE, tapeAbi, "claimable", [roundId, player.address]);
const burned0 = await read(TAPE, tapeAbi, "totalBurned");
const balBefore = await read(WIF, wifAbi, "balanceOf", [player.address]);
await tx(asPlayer, player, TAPE, tapeAbi, "claim", [roundId]);
const balAfter = await read(WIF, wifAbi, "balanceOf", [player.address]);
check("claim() paid exactly claimable()", balAfter - balBefore === expected, `paid ${wif(balAfter - balBefore)}, expected ${wif(expected)}`);

if (final.status === 2) {
  const won = final.winner === 1;
  check(won ? "winner got stake plus a share of the losing pool" : "loser got nothing back", won ? expected > stake : expected === 0n);
  check("burn equals 10% of the losing pool", final.burned === (((won ? final.totalDown : final.totalUp) * 1000n) / 10000n), `burned ${wif(final.burned)}`);
  check("totalBurned includes this round", burned0 >= final.burned);
} else {
  check("void round refunded the full stake", expected === stake);
}

// 7. streak bookkeeping
const p = await read(TAPE, tapeAbi, "players", [player.address]);
check("player record updated", final.status === 3 ? p[3] === 0 : p[3] === 1, `played=${p[3]} wins=${p[2]} streak=${p[0]}`);

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
