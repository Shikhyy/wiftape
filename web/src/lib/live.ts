import { formatUnits, type Address, type PublicClient } from "viem";
import { CONFIG } from "./config";
import { erc20Abi, feedAbi, SIDE, STATUS, tapeAbi } from "./tapeAbi";
import type { PlayerView, RoundStatus, RoundView, Side, StatsView } from "./types";

export interface LiveData {
  active: RoundView[];
  results: RoundView[];
  player: PlayerView;
  stats: StatsView;
  minStake: number;
  burnPct: number;
}

type RawRound = {
  marketId: number;
  status: number;
  winner: number;
  openTime: bigint;
  lockTime: bigint;
  endTime: bigint;
  openPrice: bigint;
  closePrice: bigint;
  totalUp: bigint;
  totalDown: bigint;
  weightUp: bigint;
  weightDown: bigint;
  burned: bigint;
};

const wifNum = (x: bigint) => Number(formatUnits(x, CONFIG.wifDecimals));
const priceNum = (x: bigint) => Number(formatUnits(x, CONFIG.feedDecimals));

export function liveStatus(onchain: number, lock: number, end: number, now: number): RoundStatus {
  if (onchain === STATUS.Settled) return "settled";
  if (onchain === STATUS.Void) return "void";
  if (now < lock) return "open";
  if (now < end) return "locked";
  return "awaiting";
}

/** Read everything the UI needs in one pass. Used for polling in live mode. */
export async function readLive(client: PublicClient, user: Address | undefined, now: number): Promise<LiveData> {
  const tape = CONFIG.tape as Address;
  const wif = CONFIG.wif as Address;
  // The generic typing of viem's readContract is heavy; a thin cast keeps this file readable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const read = <T,>(functionName: string, args: unknown[] = []) => client.readContract({ address: tape, abi: tapeAbi, functionName, args } as any) as Promise<T>;

  const [count, roundCount, burned, staked, settled, uniq, minStake, burnBps] = await Promise.all([
    read<bigint>("marketsCount"),
    read<bigint>("roundCount"),
    read<bigint>("totalBurned"),
    read<bigint>("totalStaked"),
    read<bigint>("roundsSettled"),
    read<bigint>("uniquePlayers"),
    read<bigint>("minStake"),
    read<number>("burnBps"),
  ]);

  const markets = await Promise.all(
    Array.from({ length: Number(count) }, async (_, i) => {
      const m = await read<readonly [Address, number, number, number, number, boolean, string, Address]>("markets", [BigInt(i)]);
      const [cur, feed] = await Promise.all([
        read<bigint>("currentRound", [BigInt(i)]),
        client.readContract({ address: m[0], abi: feedAbi, functionName: "latestRoundData" }),
      ]);
      return { id: i, symbol: m[6], price: priceNum(feed[1]), cur };
    }),
  );
  const symbolOf = (marketId: number) => markets[marketId]?.symbol ?? "—";
  const priceOf = (marketId: number) => markets[marketId]?.price ?? 0;

  const build = async (id: bigint): Promise<RoundView> => {
    const r = await read<RawRound>("getRound", [id]);
    const lock = Number(r.lockTime);
    const end = Number(r.endTime);
    const status = liveStatus(r.status, lock, end, now);
    const open = priceNum(r.openPrice);
    // A round voided for "no price" never stored a closing price on-chain (it reads as 0). Fall back to the open price
    // for display so it shows as flat instead of -100%, and use the live feed price as the "current" price.
    const close = priceNum(r.closePrice) || open;
    const price = status === "settled" || (status === "void" && priceNum(r.closePrice) > 0) ? close : priceOf(r.marketId) || open;
    let position: RoundView["position"];
    if (user) {
      const pos = await read<readonly [number, boolean, bigint, bigint]>("positions", [id, user]);
      if (pos[2] > 0n) {
        const claimable = await read<bigint>("claimable", [id, user]);
        position = { side: pos[0] === SIDE.Up ? "up" : "down", amount: wifNum(pos[2]), claimable: wifNum(claimable), claimed: pos[1] };
      }
    }
    const winner: Side | undefined = r.winner === SIDE.Up ? "up" : r.winner === SIDE.Down ? "down" : undefined;
    return {
      id: Number(id),
      marketId: r.marketId,
      symbol: symbolOf(r.marketId),
      status,
      openPrice: open,
      closePrice: close,
      price,
      openTime: Number(r.openTime),
      lockTime: lock,
      endTime: end,
      totalUp: wifNum(r.totalUp),
      totalDown: wifNum(r.totalDown),
      burned: wifNum(r.burned),
      winner,
      position,
      spark: [open, price],
    };
  };

  const active = (await Promise.all(markets.filter((m) => m.cur > 0n).map((m) => build(m.cur)))).sort((a, b) => a.marketId - b.marketId);

  const lastIds: bigint[] = [];
  for (let i = roundCount; i > 0n && lastIds.length < 12; i--) lastIds.push(i);
  const recent = await Promise.all(lastIds.map(build));
  const results = recent.filter((r) => r.status === "settled" || r.status === "void");

  let player: PlayerView = { streak: 0, bestStreak: 0, shields: 0, wins: 0, played: 0, balance: 0, allowance: 0 };
  if (user) {
    const [p, bal, allow] = await Promise.all([
      read<readonly [number, number, number, number, number, boolean, boolean, Address, bigint]>("players", [user]),
      client.readContract({ address: wif, abi: erc20Abi, functionName: "balanceOf", args: [user] }),
      client.readContract({ address: wif, abi: erc20Abi, functionName: "allowance", args: [user, tape] }),
    ]);
    player = { address: user, streak: p[0], bestStreak: p[1], wins: p[2], played: p[3], shields: p[4], balance: wifNum(bal), allowance: wifNum(allow) };
  }

  // Without an indexer we approximate the burn curve from the most recent rounds.
  const totalBurned = wifNum(burned);
  const newestFirst = results.map((r) => r.burned);
  const series: number[] = [];
  let running = totalBurned;
  for (const b of newestFirst) {
    series.unshift(running);
    running = Math.max(0, running - b);
  }
  series.unshift(running);

  return {
    active,
    results,
    player,
    stats: { totalBurned, totalStaked: wifNum(staked), roundsSettled: Number(settled), uniquePlayers: Number(uniq), burnSeries: series },
    minStake: wifNum(minStake),
    burnPct: burnBps / 10_000,
  };
}
