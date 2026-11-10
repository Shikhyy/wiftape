import type { PlayerView, RoundStatus, RoundView, Side, StatsView } from "./types";
import { streakMultiplier } from "./format";

/**
 * Demo engine: a tiny in-browser simulation of WifTape rounds so the UI is fully usable
 * before contracts are deployed. It mirrors the contract rules (burn share, void on tie or
 * one-sided rounds, streak weights) but is NOT on-chain. Rounds are short so judges can see
 * a full cycle in about five minutes.
 */
export const DEMO_ENTRY = 120; // seconds entries stay open
export const DEMO_DURATION = 300; // seconds per round
export const BURN_PCT = 0.1;
export const MIN_STAKE = 1;

export const COMPANY: Record<string, string> = {
  NVDA: "NVIDIA",
  TSLA: "Tesla",
  AAPL: "Apple",
  SPY: "S&P 500 ETF",
};

const MARKETS = [
  { id: 0, symbol: "NVDA", price: 142.31, vol: 0.0035 },
  { id: 1, symbol: "TSLA", price: 248.12, vol: 0.005 },
  { id: 2, symbol: "AAPL", price: 231.44, vol: 0.0025 },
];

export interface DemoState {
  rounds: RoundView[];
  nextId: number;
  player: PlayerView;
  stats: StatsView;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function statusAt(r: Pick<RoundView, "lockTime" | "endTime">, now: number): RoundStatus {
  if (now < r.lockTime) return "open";
  if (now < r.endTime) return "locked";
  return "awaiting";
}

function walk(start: number, n: number, vol: number): number[] {
  const out: number[] = [start];
  for (let i = 1; i < n; i++) out.push(out[i - 1] * (1 + rand(-vol, vol)));
  return out;
}

function newRound(id: number, marketId: number, now: number, ageSec: number, price: number): RoundView {
  const m = MARKETS[marketId];
  const openTime = now - ageSec;
  const lockTime = openTime + DEMO_ENTRY;
  const endTime = openTime + DEMO_DURATION;
  const spark = walk(price, 24, m.vol);
  const cur = spark[spark.length - 1];
  return {
    id,
    marketId,
    symbol: m.symbol,
    status: statusAt({ lockTime, endTime }, now),
    openPrice: price,
    closePrice: 0,
    price: cur,
    openTime,
    lockTime,
    endTime,
    totalUp: Math.round(rand(900, 4200)),
    totalDown: Math.round(rand(900, 4200)),
    burned: 0,
    spark,
  };
}

export function seedDemo(now: number): DemoState {
  const rounds: RoundView[] = [];
  let id = 1;

  // A little history so the results table is not empty.
  for (let i = 0; i < 9; i++) {
    const m = MARKETS[i % MARKETS.length];
    const r = newRound(id++, m.id, now, DEMO_DURATION * (10 - i), m.price * rand(0.97, 1.03));
    const up = Math.random() > 0.45;
    r.closePrice = r.openPrice * (up ? rand(1.001, 1.012) : rand(0.988, 0.999));
    r.price = r.closePrice;
    r.winner = up ? "up" : "down";
    r.status = "settled";
    r.burned = Math.round((up ? r.totalDown : r.totalUp) * BURN_PCT);
    rounds.push(r);
  }

  // One live round per market, at different points in their lifecycle.
  const ages = [38, 160, 14];
  MARKETS.forEach((m, i) => rounds.push(newRound(id++, m.id, now, ages[i], m.price)));

  const burnSeries: number[] = [];
  let acc = 142_000;
  for (let i = 0; i < 28; i++) {
    acc += Math.round(rand(300, 2400));
    burnSeries.push(acc);
  }

  return {
    rounds,
    nextId: id,
    player: { streak: 2, bestStreak: 6, shields: 1, wins: 11, played: 17, balance: 2500, allowance: 0 },
    stats: {
      totalBurned: acc,
      totalStaked: 2_184_300,
      roundsSettled: 1_284,
      uniquePlayers: 412,
      burnSeries,
    },
  };
}

function settleRound(s: DemoState, r: RoundView): void {
  r.closePrice = r.price;
  const tie = r.closePrice === r.openPrice;
  if (tie || r.totalUp === 0 || r.totalDown === 0) {
    r.status = "void";
    if (r.position) r.position = { ...r.position, claimable: r.position.amount };
    return;
  }
  const winner: Side = r.closePrice > r.openPrice ? "up" : "down";
  const losers = winner === "up" ? r.totalDown : r.totalUp;
  const winners = winner === "up" ? r.totalUp : r.totalDown;
  r.winner = winner;
  r.burned = Math.round(losers * BURN_PCT);
  r.status = "settled";

  s.stats.totalBurned += r.burned;
  s.stats.roundsSettled += 1;
  s.stats.burnSeries = [...s.stats.burnSeries.slice(-39), s.stats.totalBurned];

  if (r.position) {
    const p = s.player;
    const won = r.position.side === winner;
    p.played += 1;
    if (won) {
      const w = r.position.amount * streakMultiplier(p.streak);
      const share = ((losers - r.burned) * w) / (winners + w - r.position.amount);
      r.position = { ...r.position, claimable: r.position.amount + share };
      p.wins += 1;
      p.streak += 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
    } else {
      r.position = { ...r.position, claimable: 0 };
      if (p.shields > 0) p.shields -= 1;
      else p.streak = 0;
    }
  }
}

/** Advance the simulation to `now`. Pure: returns a new state. */
export function stepDemo(prev: DemoState, now: number): DemoState {
  const s: DemoState = {
    ...prev,
    rounds: prev.rounds.map((r) => ({ ...r, spark: r.spark })),
    player: { ...prev.player },
    stats: { ...prev.stats },
  };
  const created: RoundView[] = [];

  for (const r of s.rounds) {
    if (r.status === "settled" || r.status === "void") continue;
    const vol = MARKETS[r.marketId].vol;
    r.price = Math.max(1, r.price * (1 + rand(-vol, vol) * 0.6));
    r.spark = [...r.spark.slice(-39), r.price];
    if (r.status === "open") {
      if (Math.random() < 0.5) r.totalUp += Math.round(rand(10, 80));
      if (Math.random() < 0.5) r.totalDown += Math.round(rand(10, 80));
    }
    if (now >= r.endTime) {
      settleRound(s, r);
      created.push(newRound(s.nextId++, r.marketId, now, 0, r.price));
    } else {
      r.status = statusAt(r, now);
    }
  }

  if (created.length) {
    s.rounds = [...s.rounds, ...created];
    if (s.rounds.length > 40) s.rounds = s.rounds.slice(-40);
  }
  return s;
}

/** Returns an error message, or undefined when the entry is valid. */
export function validateEnter(s: DemoState, roundId: number, side: Side, amount: number, now: number): string | undefined {
  const r = s.rounds.find((x) => x.id === roundId);
  if (!r || r.status !== "open" || now >= r.lockTime) return "Entries for this round are closed.";
  if (amount < MIN_STAKE) return `Minimum stake is ${MIN_STAKE} $WIF.`;
  if (amount > s.player.balance) return "Not enough $WIF.";
  if (r.position && r.position.side !== side) return "You can only add to the side you already picked.";
  const pending = s.rounds.find((x) => x.position && !x.position.claimed && (x.status === "open" || x.status === "locked" || x.status === "awaiting") && x.id !== roundId);
  if (pending) return `Wait for ${pending.symbol} to settle before joining another round.`;
  return undefined;
}

export function applyEnter(prev: DemoState, roundId: number, side: Side, amount: number): DemoState {
  const rounds = prev.rounds.map((r) => {
    if (r.id !== roundId) return r;
    const pos = r.position;
    return {
      ...r,
      totalUp: side === "up" ? r.totalUp + amount : r.totalUp,
      totalDown: side === "down" ? r.totalDown + amount : r.totalDown,
      position: { side, amount: (pos?.amount ?? 0) + amount, claimable: 0, claimed: false },
    };
  });
  return {
    ...prev,
    rounds,
    player: { ...prev.player, balance: prev.player.balance - amount },
    stats: { ...prev.stats, totalStaked: prev.stats.totalStaked + amount },
  };
}

export function applyClaim(prev: DemoState, roundId: number): DemoState {
  const r = prev.rounds.find((x) => x.id === roundId);
  if (!r?.position || r.position.claimed) return prev;
  const payout = r.position.claimable;
  return {
    ...prev,
    rounds: prev.rounds.map((x) => (x.id === roundId && x.position ? { ...x, position: { ...x.position, claimed: true, claimable: 0 } } : x)),
    player: { ...prev.player, balance: prev.player.balance + payout },
  };
}

export function demoActive(s: DemoState): RoundView[] {
  return MARKETS.map((m) => [...s.rounds].reverse().find((r) => r.marketId === m.id)).filter(Boolean) as RoundView[];
}

export function demoResults(s: DemoState): RoundView[] {
  return [...s.rounds].reverse().filter((r) => r.status === "settled" || r.status === "void").slice(0, 12);
}
