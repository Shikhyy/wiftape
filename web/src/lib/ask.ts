import { fallbackPicks } from "./analysts";
import { fmtWif, streakMultiplier } from "./format";
import type { PlayerView, RoundView, StatsView } from "./types";

export interface AskCtx {
  active: RoundView[];
  results: RoundView[];
  player: PlayerView;
  stats: StatsView;
  burnPct: number;
}

export const SUGGESTIONS = ["Why is NVDA UP?", "Which side pays more?", "How is my streak?", "How much has burned?"];

const pays = (mine: number, other: number, burn: number) => (mine > 0 ? 1 + (other * (1 - burn)) / mine : 0);

/**
 * The prompt bar's brain. This is a small built-in assistant that reads the same live numbers as the rest of the app
 * (it does not call a language model). It answers about picks, payouts, your streak and the burn.
 */
export function answer(question: string, c: AskCtx): string {
  const s = question.toLowerCase();
  const round = c.active.find((r) => s.includes(r.symbol.toLowerCase()));

  if (round && /why|pick|call|signal|up|down|bull|bear/.test(s)) {
    const picks = fallbackPicks({ symbol: round.symbol, openPrice: round.openPrice, price: round.price, spark: round.spark.slice(-40), poolUp: round.totalUp, poolDown: round.totalDown });
    const ups = picks.filter((p) => p.side === "up").length;
    const lead = picks.slice().sort((a, b) => b.confidence - a.confidence)[0];
    return `${round.symbol}: ${ups} of 3 analysts lean UP and ${3 - ups} lean DOWN. Most confident is ${lead.analyst[0].toUpperCase() + lead.analyst.slice(1)} (${lead.side.toUpperCase()}, ${lead.confidence}%): ${lead.reasoning} Picks are for the game, not financial advice.`;
  }

  if (/pay|side|better|odds/.test(s)) {
    if (!c.active.length) return "No rounds are open right now.";
    return c.active
      .map((r) => {
        const up = pays(r.totalUp, r.totalDown, c.burnPct);
        const down = pays(r.totalDown, r.totalUp, c.burnPct);
        return `${r.symbol}: UP pays ${up ? up.toFixed(2) + "x" : "n/a"}, DOWN pays ${down ? down.toFixed(2) + "x" : "n/a"} (${up >= down ? "UP" : "DOWN"} is the better price).`;
      })
      .join(" ");
  }

  if (/streak|shield|win rate|record/.test(s)) {
    const p = c.player;
    return `Your streak is ${p.streak} (best ${p.bestStreak}), which gives a ${streakMultiplier(p.streak).toFixed(2)}x payout weight. You hold ${p.shields} shield${p.shields === 1 ? "" : "s"} and have won ${p.wins} of ${p.played} rounds.`;
  }

  if (/burn|supply|destroy/.test(s)) {
    return `${fmtWif(c.stats.totalBurned)} $WIF has been burned across ${c.stats.roundsSettled.toLocaleString()} settled rounds. ${Math.round(c.burnPct * 100)}% of every losing pool is burned inside settle().`;
  }

  if (round) {
    const move = ((round.price - round.openPrice) / round.openPrice) * 100;
    return `${round.symbol} is ${move >= 0 ? "up" : "down"} ${Math.abs(move).toFixed(2)}% from its open. The UP pool is ${fmtWif(round.totalUp)} and the DOWN pool is ${fmtWif(round.totalDown)}.`;
  }

  return "I can explain a market (try “Why is NVDA UP?”), compare what each side pays, summarise your streak, or report the burn.";
}
