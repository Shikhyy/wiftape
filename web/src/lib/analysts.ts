export type AnalystId = "ember" | "quill" | "vesper";

export interface AnalystInput {
  symbol: string;
  openPrice: number;
  price: number;
  spark: number[];
  poolUp: number;
  poolDown: number;
}

export interface AnalystPick {
  analyst: AnalystId;
  side: "up" | "down";
  confidence: number; // 50-95
  reasoning: string;
}

export const ANALYSTS: { id: AnalystId; name: string; style: string; blurb: string }[] = [
  { id: "ember", name: "Ember", style: "Momentum", blurb: "Rides what the tape is already doing." },
  { id: "quill", name: "Quill", style: "Mean reversion", blurb: "Fades stretched moves, trusts the average." },
  { id: "vesper", name: "Vesper", style: "Contrarian", blurb: "Leans against a crowded pool." },
];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

/** Deterministic picks used when no API key is set or the model call fails. */
export function fallbackPicks(i: AnalystInput): AnalystPick[] {
  const sinceOpen = pct(i.price, i.openPrice);
  const recent = i.spark.length > 4 ? pct(i.spark[i.spark.length - 1], i.spark[i.spark.length - 5]) : sinceOpen;
  const total = i.poolUp + i.poolDown || 1;
  const upShare = (i.poolUp / total) * 100;

  const ember: AnalystPick = {
    analyst: "ember",
    side: recent >= 0 ? "up" : "down",
    confidence: Math.round(clamp(56 + Math.abs(recent) * 40, 52, 90)),
    reasoning: `${i.symbol} is ${recent >= 0 ? "pressing higher" : "sliding"} (${recent.toFixed(2)}% over the last few ticks). Momentum tends to persist over short windows, so I follow it.`,
  };

  const stretched = Math.abs(sinceOpen) > 0.3;
  const quill: AnalystPick = {
    analyst: "quill",
    side: stretched ? (sinceOpen > 0 ? "down" : "up") : recent >= 0 ? "up" : "down",
    confidence: Math.round(clamp(54 + Math.abs(sinceOpen) * 30, 52, 85)),
    reasoning: stretched
      ? `${i.symbol} is ${sinceOpen.toFixed(2)}% from the open, which is stretched for this window. I expect a pull back toward the open.`
      : `${i.symbol} is close to its open, so there is no stretch to fade. I keep a small lean with the latest drift.`,
  };

  const crowdUp = upShare >= 50;
  const vesper: AnalystPick = {
    analyst: "vesper",
    side: crowdUp ? "down" : "up",
    confidence: Math.round(clamp(52 + Math.abs(upShare - 50) * 0.8, 52, 82)),
    reasoning: `${Math.round(crowdUp ? upShare : 100 - upShare)}% of the pool is on ${crowdUp ? "UP" : "DOWN"}. A crowded side pays less, so I take the thinner side for the better payout.`,
  };

  return [ember, quill, vesper];
}
