import { parseAbi } from "viem";

/** Human-readable ABI for the parts of WifTape.sol the frontend and keeper use. Keep in sync with contracts/src/WifTape.sol. */
export const tapeAbi = parseAbi([
  "struct Round { uint32 marketId; uint8 status; uint8 winner; uint64 openTime; uint64 lockTime; uint64 endTime; int256 openPrice; int256 closePrice; uint256 totalUp; uint256 totalDown; uint256 weightUp; uint256 weightDown; uint256 burned; }",
  "function marketsCount() view returns (uint256)",
  "function markets(uint256) view returns (address feed, uint32 entryWindow, uint32 duration, uint32 maxStaleness, uint32 maxSettleLag, bool active, string symbol, address stockToken)",
  "function openMultiplier(uint256 roundId) view returns (uint256)",
  "function currentRound(uint256 marketId) view returns (uint256)",
  "function roundCount() view returns (uint256)",
  "function getRound(uint256 roundId) view returns (Round)",
  "function players(address) view returns (uint32 streak, uint32 bestStreak, uint32 wins, uint32 played, uint8 shields, bool joined, bool referralPaid, address referrer, uint256 pendingRound)",
  "function positions(uint256 roundId, address user) view returns (uint8 side, bool claimed, uint256 amount, uint256 weight)",
  "function claimable(uint256 roundId, address user) view returns (uint256)",
  "function totalBurned() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function roundsSettled() view returns (uint256)",
  "function uniquePlayers() view returns (uint256)",
  "function minStake() view returns (uint256)",
  "function burnBps() view returns (uint16)",
  "function openRound(uint256 marketId) returns (uint256)",
  "function enter(uint256 roundId, uint8 side, uint256 amount, address referrer)",
  "function settle(uint256 roundId)",
  "function voidRound(uint256 roundId)",
  "function claim(uint256 roundId) returns (uint256)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

/** TestWif (testnet only): the free faucet. */
export const testWifAbi = parseAbi(["function faucet()", "function lastClaim(address) view returns (uint256)"]);

export const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80)",
]);

/** On-chain Status enum: 0 None, 1 Open, 2 Settled, 3 Void. Side enum: 0 None, 1 Up, 2 Down. */
export const STATUS = { None: 0, Open: 1, Settled: 2, Void: 3 } as const;
export const SIDE = { None: 0, Up: 1, Down: 2 } as const;
