"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Glass } from "@/components/ui";
import { useArena } from "@/lib/arena";
import { ANALYSTS, fallbackPicks, type AnalystInput, type AnalystPick } from "@/lib/analysts";
import { fmtPct, fmtPrice } from "@/lib/format";

// Each analyst is a glowing orb with its own colour.
const ORB: Record<string, string> = {
  ember: "radial-gradient(circle at 35% 30%, #ffd2b0, #ff6321 45%, #7a1f05)",
  quill: "radial-gradient(circle at 35% 30%, #cdeef5, #3a8aa0 45%, #0e2f3a)",
  vesper: "radial-gradient(circle at 35% 30%, #e1d9ff, #7b6cff 45%, #241a6b)",
};

function Ring({ value, side }: { value: number; side: "up" | "down" }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const col = side === "up" ? "rgb(96 224 154)" : "rgb(255 94 76)";
  return (
    <div className="relative grid h-[64px] w-[64px] place-items-center" role="img" aria-label={`Confidence ${value}%`}>
      <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} style={{ transition: "stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <span className="font-mono text-[13px] font-medium">{value}%</span>
    </div>
  );
}

export default function SignalsPage() {
  const { active, ready } = useArena();
  const [marketId, setMarketId] = useState(0);
  const [remote, setRemote] = useState<{ source: string; picks: AnalystPick[]; forRound: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const round = active.find((r) => r.marketId === marketId) ?? active[0];

  const input: AnalystInput | null = useMemo(
    () => (round ? { symbol: round.symbol, openPrice: round.openPrice, price: round.price, spark: round.spark.slice(-40), poolUp: round.totalUp, poolDown: round.totalDown } : null),
    // Recompute only when the round changes or every ~8 ticks of data, so the picks don't flicker each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round?.id, Math.floor((round?.spark.length ?? 0) / 8)],
  );

  // Until Claude answers, show the built-in picks so the page is never empty.
  const fromClaude = Boolean(remote && round && remote.forRound === round.id);
  const picks = fromClaude && remote ? remote.picks : input ? fallbackPicks(input) : [];
  const source = fromClaude && remote ? remote.source : "builtin";

  useEffect(() => setError(undefined), [round?.id]);

  async function ask() {
    if (!input || !round) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/analysts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error("The analysts are unavailable right now.");
      const data = (await res.json()) as { source: string; picks: AnalystPick[] };
      setRemote({ ...data, forRound: round.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const move = round ? ((round.price - round.openPrice) / round.openPrice) * 100 : 0;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-40 pt-24 sm:px-6 sm:pt-28">
      <header>
        <p className="caps">Signals</p>
        <h1 className="mt-3 max-w-[16ch] font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[1] tracking-[-0.02em]">Three Analysts. Three Opinions.</h1>
        <p className="mt-4 max-w-xl text-ink/55">Each analyst reads the same tape and calls the round their own way. Follow one, fade one, or ignore them all. For the game only, not financial advice.</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {active.map((r) => (
            <button
              key={r.marketId}
              onClick={() => setMarketId(r.marketId)}
              aria-pressed={round?.marketId === r.marketId}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition ${round?.marketId === r.marketId ? "border-white/20 bg-white/[0.14]" : "border-white/10 bg-white/[0.04] text-ink/60 hover:text-ink"}`}
            >
              <Badge symbol={r.symbol} size={22} /> {r.symbol}
            </button>
          ))}
        </div>
        {round && <span className="font-mono text-xs text-ink/55">{fmtPrice(round.price)} <span className={move >= 0 ? "text-up" : "text-down"}>{fmtPct(move)}</span> vs open · round #{round.id}</span>}
        <div className="ml-auto flex items-center gap-3">
          <span className={`tag ${source === "claude" ? "tag-ember" : "tag-neutral"}`}>{source === "claude" ? "Written by Claude" : "Built-in rules"}</span>
          <button className="btn-ember !py-2 text-[13px]" onClick={ask} disabled={loading || !round}>{loading ? "Thinking…" : "Ask Claude"}</button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-down/30 bg-down/15 p-3 text-sm text-down">{error}</p>}

      {!ready || !round ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-[26px] bg-white/5" />)}</div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ANALYSTS.map((a, i) => {
            const p = picks.find((x) => x.analyst === a.id);
            if (!p) return null;
            return (
              <Glass key={a.id} tone={p.side === "up" ? "teal" : "ember"} className="flex flex-col gap-5 p-6" >
                <div className="flex items-start justify-between">
                  <span className="relative block h-[60px] w-[60px] rounded-full" style={{ background: ORB[a.id], boxShadow: "0 0 40px -6px rgb(255 99 33 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.5)", animation: `floaty ${6 + i}s ease-in-out infinite` }} />
                  <Ring value={p.confidence} side={p.side} />
                </div>
                <div>
                  <h2 className="text-[1.7rem] font-medium leading-none tracking-[-0.03em]">{a.name}</h2>
                  <p className="mt-1.5 text-[12.5px] text-ink/55">{a.style} · {a.blurb}</p>
                </div>
                <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${p.side === "up" ? "border-up/35 bg-up/15" : "border-down/35 bg-down/15"}`}>
                  <span className="text-[12px] text-ink/60">Signal</span>
                  <span className={`text-[1.6rem] font-medium tracking-[-0.03em] ${p.side === "up" ? "text-up" : "text-down"}`}>{p.side === "up" ? "▲ Up" : "▼ Down"}</span>
                </div>
                <p className="flex-1 text-[14px] leading-relaxed text-ink/75">{p.reasoning}</p>
                <Link href={`/trade?round=${round.id}&side=${p.side}`} className="btn-glass w-full">Trade this signal →</Link>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}
