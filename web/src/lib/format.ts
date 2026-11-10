export const streakMultiplier = (streak: number) => 1 + Math.min(streak, 10) * 0.05;

export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Compact $WIF amounts: 1.2K, 3.4M. */
export function fmtWif(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return fmtNum(n, n % 1 === 0 ? 0 : 2);
}

export const fmtPrice = (n: number) => `$${fmtNum(n, 2)}`;

export function fmtPct(n: number, digits = 2): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}%`;
}

export function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

/** 83 -> "01:23", 3725 -> "1:02:05". */
export function fmtCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const rr = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Night shift";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
