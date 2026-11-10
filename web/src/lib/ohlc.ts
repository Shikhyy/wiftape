export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

/**
 * Group a price series into candles of `group` ticks. Each candle opens at the previous close so the chart is continuous.
 * (The app samples one tick per second in demo mode, so group=3 gives 3-second candles.)
 */
export function toCandles(values: number[], group: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < values.length; i += group) {
    const s = values.slice(i, i + group);
    if (!s.length) break;
    const prev = out[out.length - 1];
    out.push({ o: prev ? prev.c : s[0], h: Math.max(...s, prev ? prev.c : s[0]), l: Math.min(...s, prev ? prev.c : s[0]), c: s[s.length - 1] });
  }
  return out;
}
