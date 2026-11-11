"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AskBar from "@/components/AskBar";
import Sparkline from "@/components/Sparkline";
import { Badge, Gauge, Glass, IconBolt, IconTarget, IconTrophy, IconWallet, Kpi } from "@/components/ui";
import { useArena } from "@/lib/arena";
import { ANALYSTS, fallbackPicks } from "@/lib/analysts";
import { COMPANY } from "@/lib/demo";
import { fmtCountdown, fmtNum, fmtPct, fmtPrice, greeting, shortAddr, streakMultiplier } from "@/lib/format";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Panel({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Glass tone="deep" className={`p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.05rem] font-medium tracking-tight">{title}</h2>
          {sub && <p className="text-[12px] text-ink/45">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </Glass>
  );
}

const row = "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3 transition hover:bg-white/[0.07]";

export default function Dashboard() {
  const { ready, active, results, player, mode, now, burnPct } = useArena();
  const [hello, setHello] = useState("Welcome");
  useEffect(() => setHello(greeting()), []);

  // "Active signals": every analyst's pick on every live market, most confident first.
  const signals = useMemo(() => {
    return active
      .flatMap((r) =>
        fallbackPicks({ symbol: r.symbol, openPrice: r.openPrice, price: r.price, spark: r.spark.slice(-40), poolUp: r.totalUp, poolDown: r.totalDown }).map((p) => ({ r, p })),
      )
      .sort((a, b) => b.p.confidence - a.p.confidence)
      .slice(0, 6);
    // recompute when rounds change or every ~8 ticks, so the list doesn't jitter each second
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.map((r) => r.id).join(","), Math.floor(now / 8)]);

  const totalUp = active.reduce((s, r) => s + r.totalUp, 0);
  const totalAll = active.reduce((s, r) => s + r.totalUp + r.totalDown, 0);
  const upShare = totalAll ? (totalUp / totalAll) * 100 : 50;
  const mood = upShare >= 58 ? "Bullish" : upShare <= 42 ? "Bearish" : "Neutral";

  const exposure = active.reduce((s, r) => s + (r.position?.amount ?? 0), 0) + results.reduce((s, r) => s + (r.position && !r.position.claimed ? r.position.claimable : 0), 0);
  const openPositions = active.filter((r) => r.position).length;
  const winRate = player.played ? (player.wins / player.played) * 100 : 0;
  const [whole, dec] = fmtNum(player.balance, 2).split(".");

  const schedule = [...active].sort((a, b) => (a.status === "open" ? a.lockTime : a.endTime) - (b.status === "open" ? b.lockTime : b.endTime));
  const bigPool = Math.max(1, ...active.map((r) => r.totalUp + r.totalDown));

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-48 pt-24 sm:px-6 sm:pt-28">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="caps mb-3">Dashboard</p>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,3.8rem)] font-normal leading-[1.02] tracking-[-0.02em]">
            {hello}, {player.address ? shortAddr(player.address) : "trader"}
          </h1>
          <p className="mt-2 text-ink/55">Here’s how your calls are performing today.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-ember" /> {mode === "demo" ? "Demo data" : "Live on-chain"}</span>
          <Link href="/trade" className="btn-ember">Open trading window</Link>
        </div>
      </header>

      {/* KPI row */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Staked in live rounds" value={fmtNum(Math.floor(exposure))} decimals={`.${fmtNum(exposure, 2).split(".")[1] ?? "00"}`} sub={`${openPositions} open position${openPositions === 1 ? "" : "s"}`} icon={<IconWallet />} />
        <Kpi label="Win streak" value={player.streak} sub={`${streakMultiplier(player.streak).toFixed(2)}x weight · best ${player.bestStreak}`} icon={<IconBolt />} tone="up" />
        <Kpi label="Win rate" value={winRate.toFixed(1)} decimals="%" sub={`${player.wins} of ${player.played} rounds`} icon={<IconTarget />} />
        <Kpi label="$WIF balance" value={whole} decimals={`.${dec ?? "00"}`} sub={player.address ? "in your wallet" : mode === "demo" ? "demo balance" : "connect a wallet"} icon={<IconTrophy />} />
      </section>

      {/* signals + sentiment */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Active signals" sub={`${signals.length} from ${ANALYSTS.length} analysts`} action={<Link href="/analysts" className="pill hover:bg-white/15">View signals</Link>}>
          {!ready ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-2xl bg-white/5" />)}</div>
          ) : (
            <div className="space-y-2">
              {signals.map(({ r, p }, i) => (
                <Link key={`${r.id}-${p.analyst}`} href={`/trade?round=${r.id}&side=${p.side}`} className={row} style={{ animation: "fadein .6s ease both", animationDelay: `${i * 60}ms` }}>
                  <Badge symbol={r.symbol} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{r.symbol}</p>
                    <p className="truncate text-[11.5px] text-ink/45">{cap(p.analyst)} · {ANALYSTS.find((a) => a.id === p.analyst)?.style}</p>
                  </div>
                  <span className="font-mono text-[13px] text-ink/80">{p.confidence}%</span>
                  <span className={`tag ${p.side === "up" ? "tag-up" : "tag-down"}`}>{p.side === "up" ? "Up" : "Down"}</span>
                  <span className="tag tag-ember hidden sm:inline-flex">
                    {r.status === "open" ? `+ ${fmtCountdown(r.lockTime - now)}` : r.status === "locked" ? `live ${fmtCountdown(r.endTime - now)}` : "settling"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Market sentiment" sub="Share of every live pool on UP">
          <div className="pt-2">
            <Gauge value={upShare} label={mood} caption={`${Math.round(totalUp ? upShare : 50)}% up · ${Math.round(100 - upShare)}% down`} />
          </div>
          <div className="mt-4 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
            <span>Bearish</span><span>Neutral</span><span>Bullish</span>
          </div>
        </Panel>
      </section>

      {/* schedule + trades + watchlist */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Round schedule" sub="What closes next" action={<span className="pill">Live</span>}>
          <div className="space-y-2">
            {schedule.map((r) => {
              const size = (r.totalUp + r.totalDown) / bigPool;
              return (
                <Link key={r.id} href={`/trade?round=${r.id}`} className={row}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink/45">{r.status === "open" ? "Entries close" : r.status === "locked" ? "Settles" : "Waiting"} · round #{r.id}</p>
                    <p className="text-[14px] font-medium">{r.symbol} <span className="text-ink/40">{COMPANY[r.symbol]}</span></p>
                  </div>
                  <span className="font-mono text-[13px]">{r.status === "open" ? fmtCountdown(r.lockTime - now) : fmtCountdown(r.endTime - now)}</span>
                  <span className={`tag ${size > 0.8 ? "tag-up" : "tag-neutral"}`}>{size > 0.8 ? "Deep" : "Thin"}</span>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel title="Recent trades" sub="Latest settled rounds" action={<Link href="/trade" className="pill hover:bg-white/15">View all</Link>}>
          <div className="space-y-2">
            {results.slice(0, 5).map((r) => {
              const move = r.openPrice ? ((r.closePrice - r.openPrice) / r.openPrice) * 100 : 0;
              return (
                <div key={r.id} className={row}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{r.symbol}</p>
                    <p className="font-mono text-[11px] text-ink/45">{fmtPrice(r.openPrice)} → {fmtPrice(r.closePrice)}</p>
                  </div>
                  <span className={`font-mono text-[12px] ${move >= 0 ? "text-up" : "text-down"}`}>{fmtPct(move)}</span>
                  <span className={`tag ${r.status === "void" ? "tag-neutral" : r.winner === "up" ? "tag-up" : "tag-down"}`}>{r.status === "void" ? "Void" : r.winner === "up" ? "Up" : "Down"}</span>
                </div>
              );
            })}
            {results.length === 0 && <p className="text-sm text-ink/45">No finished rounds yet.</p>}
          </div>
        </Panel>

        <Panel title="Watchlist" sub={`${Math.round(burnPct * 100)}% of every losing pool burns`} action={<span className="pill">Stock Tokens</span>}>
          <div className="space-y-2">
            {active.map((r) => {
              const move = r.openPrice ? ((r.price - r.openPrice) / r.openPrice) * 100 : 0;
              return (
                <Link key={r.id} href={`/trade?round=${r.id}`} className={row}>
                  <Badge symbol={r.symbol} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{r.symbol}</p>
                    <p className="text-[11px] text-ink/45">{COMPANY[r.symbol]}</p>
                  </div>
                  <div className="w-[64px]"><Sparkline values={r.spark.slice(-24)} tone={move >= 0 ? "up" : "down"} height={28} /></div>
                  <div className="text-right">
                    <p className="font-mono text-[13px]">{fmtPrice(r.price)}</p>
                    <p className={`font-mono text-[11px] ${move >= 0 ? "text-up" : "text-down"}`}>{fmtPct(move)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>
      </section>

      <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink/30">A game of skill · not financial advice · 18+</p>
      <AskBar />
    </div>
  );
}
