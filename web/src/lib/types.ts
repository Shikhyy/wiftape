export type Side = "up" | "down";

/**
 * open      entries are open
 * locked    entries closed, waiting for the end time
 * awaiting  ended, waiting for someone to call settle()
 * settled   winner decided, burn done
 * void      tie / one-sided / no price: everyone is refunded
 */
export type RoundStatus = "open" | "locked" | "awaiting" | "settled" | "void";

export interface Position {
  side: Side;
  amount: number;
  claimable: number;
  claimed: boolean;
}

export interface RoundView {
  id: number;
  marketId: number;
  symbol: string;
  status: RoundStatus;
  openPrice: number;
  closePrice: number;
  price: number; // latest known price (used for the live sparkline head)
  openTime: number; // unix seconds
  lockTime: number;
  endTime: number;
  totalUp: number; // WIF
  totalDown: number;
  burned: number;
  winner?: Side;
  position?: Position;
  spark: number[];
}

export interface PlayerView {
  address?: string;
  streak: number;
  bestStreak: number;
  shields: number;
  wins: number;
  played: number;
  balance: number;
  allowance: number;
}

export interface StatsView {
  totalBurned: number;
  totalStaked: number;
  roundsSettled: number;
  uniquePlayers: number;
  burnSeries: number[]; // cumulative burn, oldest first
}

export interface ArenaState {
  mode: "demo" | "live";
  ready: boolean;
  now: number;
  /** The current round of each market, one per market. */
  active: RoundView[];
  /** Recently finished rounds, newest first. */
  results: RoundView[];
  player: PlayerView;
  stats: StatsView;
  minStake: number;
  burnPct: number;
  busy: boolean;
  error?: string;
  enter: (roundId: number, side: Side, amount: number) => Promise<void>;
  claim: (roundId: number) => Promise<void>;
  clearError: () => void;
}
