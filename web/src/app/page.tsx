"use client";

import Link from "next/link";
import { useState } from "react";
import Horizon from "@/components/Horizon";
import MessageStack from "@/components/MessageStack";
import Orb from "@/components/Orb";
import { Reveal } from "@/components/Reveal";
import Stories from "@/components/Stories";
import TradeChart from "@/components/TradeChart";
import { Badge, Glass } from "@/components/ui";
import { useArena } from "@/lib/arena";
import { CONFIG } from "@/lib/config";
import { fmtCountdown, fmtNum, fmtPct, fmtPrice, fmtWif } from "@/lib/format";

const TRUST = [
  { t: "No key can touch your stake", d: "THE OWNER CAN ONLY ADD MARKETS. THERE IS NO WITHDRAW FUNCTION TO CALL, AND A TEST PROVES IT." },
  { t: "Anyone can run a round", d: "OPENING, SETTLING AND VOIDING ARE OPEN TO EVERYONE. IF OUR KEEPER STOPS, THE PRODUCT KEEPS WORKING." },
  { t: "Refunds by default", d: "STALE PRICE, TIE, EMPTY SIDE, PAUSED ORACLE OR A CHANGED MULTIPLIER: THE ROUND VOIDS AND YOU GET YOUR STAKE BACK." },
];

export default function Home() {
  const { ready, active, stats, burnPct, now, mode } = useArena();
  const [tab, setTab] = useState(0);
  const r = active[tab] ?? active[0];
  const move = r && r.openPrice ? ((r.price - r.openPrice) / r.openPrice) * 100 : 0;
  const hero = active[0];

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section id="home" className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="translate-y-[6%]">
            <Orb />
          </div>
        </div>

        {/* The shared header (logo + pill) sits here; this spacer keeps the hero's three-row layout. */}
        <div aria-hidden className="h-20" />

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 sm:px-8">
          <Reveal>
            <h1 className="max-w-[16ch] font-serif text-[clamp(3.1rem,8.2vw,7.6rem)] leading-[0.95] tracking-[-0.02em]">
              Call The Close.
              <br />
              <span className="text-ink/55">Burn The Rest.</span>
            </h1>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-wrap items-end justify-between gap-6 px-5 pb-28 sm:px-8">
          <Reveal delay={200}>
            <Glass tone="deep" className="w-[min(92vw,420px)] !rounded-xl p-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
                <span>From: WIF Tape</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-ember" /> Now</span>
              </div>
              <p className="mt-3 font-mono text-[12px] uppercase leading-[1.75] tracking-[0.04em]">
                WIF Tape is a market built to pay those who read the close, and to burn $WIF every time they do.
              </p>
            </Glass>
          </Reveal>

          <Reveal delay={350} className="flex flex-col items-end gap-4">
            {hero && (
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/70">
                {hero.symbol} {fmtPrice(hero.price)}{" "}
                <span className={hero.price >= hero.openPrice ? "text-up" : "text-down"}>
                  {hero.price >= hero.openPrice ? "▲" : "▼"} {fmtPct(Math.abs(((hero.price - hero.openPrice) / hero.openPrice) * 100)).replace("+", "")}
                </span>
              </p>
            )}
            <div className="flex gap-3">
              <Link href="/trade" className="btn-ember">Open the trading window</Link>
              <Link href="/arena" className="btn-glass">Dashboard</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── THE ROUND ───────── */}
      <section id="round" className="relative pt-[12vh]">
        <Reveal>
          <p className="caps text-center">The round</p>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="mx-auto mt-6 max-w-[18ch] px-4 text-center font-serif text-[clamp(2.4rem,5.6vw,5.2rem)] leading-[1.02] tracking-[-0.015em]">
            A Round Doesn’t Begin With A Bold Idea.
          </h2>
        </Reveal>
        <div className="mt-[6vh]">
          <Stories />
        </div>
      </section>

      {/* ───────── THE ENGINE ───────── */}
      <section id="engine" className="relative mt-[2vh]">
        <Horizon
          title="Multi-Market Coverage"
          sub="NVDA · TSLA · AAPL"
          body="EVERY STOCK TOKEN RUNS ITS OWN SHORT ROUNDS, PRICED BY A CHAINLINK FEED THAT IS CHECKED FOR FRESHNESS BEFORE A ROUND EVER OPENS."
          accent="255 99 33"
        />
        <Horizon
          title="Settlement Core"
          sub="Chainlink"
          body="REMOVES THE REFEREE. THE CONTRACT READS THE PRICE, PAYS THE WINNERS AND BURNS $WIF IN ONE TRANSACTION. ANYONE CAN CALL IT."
          accent="90 180 200"
        />
      </section>

      {/* ───────── THE TAPE (live window) ───────── */}
      <section id="tape" className="relative mx-auto max-w-[1400px] px-4 pt-[8vh] sm:px-8">
        <Reveal>
          <p className="caps text-center">The tape</p>
          <h2 className="mx-auto mt-5 max-w-[20ch] text-center font-serif text-[clamp(2.2rem,4.8vw,4.4rem)] leading-[1.04]">
            The Market, Live. Right Here.
          </h2>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-14 max-w-[1100px]">
          <div style={{ perspective: "1800px" }}>
            <Glass tone="deep" className="p-4 sm:p-6 [transform:rotateX(6deg)] transition-transform duration-700 hover:[transform:rotateX(0deg)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {active.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => setTab(i)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition ${i === tab ? "border-white/20 bg-white/[0.13]" : "border-white/10 bg-white/[0.04] text-ink/60 hover:text-ink"}`}
                    >
                      <Badge symbol={a.symbol} size={20} /> {a.symbol}
                    </button>
                  ))}
                </div>
                {r && (
                  <p className="font-mono text-xs text-ink/70">
                    {r.status === "open" ? `Entries close in ${fmtCountdown(r.lockTime - now)}` : r.status === "locked" ? `Settles in ${fmtCountdown(r.endTime - now)}` : "Settling…"}
                  </p>
                )}
              </div>
              {r ? (
                <>
                  <div className="mt-5 flex items-end gap-4">
                    <p className="text-5xl font-medium tracking-[-0.04em] sm:text-6xl">{fmtPrice(r.price)}</p>
                    <span className={`tag mb-2 ${move >= 0 ? "tag-up" : "tag-down"}`}>{move >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(move)).replace("+", "")}</span>
                  </div>
                  <TradeChart values={r.spark} open={r.openPrice} height={300} />
                  <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink/60">
                    <span>▲ Up pool <b className="block text-base font-medium normal-case tracking-normal text-ink">{fmtWif(r.totalUp)}</b></span>
                    <span className="text-center">Burn <b className="block text-base font-medium normal-case tracking-normal text-flame">{Math.round(burnPct * 100)}%</b></span>
                    <span className="text-right">▼ Down pool <b className="block text-base font-medium normal-case tracking-normal text-ink">{fmtWif(r.totalDown)}</b></span>
                  </div>
                </>
              ) : (
                <div className="mt-6 h-[300px] animate-pulse rounded-2xl bg-white/5" />
              )}
            </Glass>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-12 text-center">
            <Link href="/trade" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/80 transition hover:text-ink">→ Enter the trading window</Link>
            {mode === "demo" && <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/35">Sample rounds, simulated in your browser until the contract is live</p>}
          </div>
        </Reveal>
      </section>

      {/* ───────── TRUST ───────── */}
      <section id="trust" className="relative">
        <MessageStack />

        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {TRUST.map((x, i) => (
              <Reveal key={x.t} delay={i * 120}>
                <Glass className="h-full min-h-[240px] p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50">0{i + 1}</p>
                  <h3 className="mt-10 font-serif text-[1.9rem] leading-[1.05]">{x.t}</h3>
                  <p className="mt-6 font-mono text-[11px] uppercase leading-[1.75] tracking-[0.04em] text-ink/70">{x.d}</p>
                </Glass>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 lg:grid-cols-4">
              {[
                ["$WIF burned", ready ? fmtWif(stats.totalBurned) : "—"],
                ["Rounds settled", ready ? fmtNum(stats.roundsSettled) : "—"],
                ["Players", ready ? fmtNum(stats.uniquePlayers) : "—"],
                ["$WIF staked", ready ? fmtWif(stats.totalStaked) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg/70 p-6 backdrop-blur-xl">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50">{k}</p>
                  <p className="mt-6 text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-none tracking-[-0.04em]">{v}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── CLOSING ───────── */}
      <section className="relative mt-[6vh] min-h-[78vh] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid place-items-center">
          <div className="translate-y-[62%]">
            <Orb size="min(95vw, 1300px)" interactive={false} />
          </div>
        </div>
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 sm:px-8 md:grid-cols-[auto_1fr]">
          <Reveal>
            <p className="font-serif text-[4.5rem] leading-none text-ink/70">/*</p>
          </Reveal>
          <div>
            <Reveal>
              <p className="max-w-[24ch] font-serif text-[clamp(2rem,4vw,3.6rem)] leading-[1.08]">
                WIF Tape Exists For Those Who Read The Close, And Trust The Chain To Settle It.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link href="/arena" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/85 transition hover:text-ink">→ Enter the dashboard</Link>
                <a href={CONFIG.voteUrl} target="_blank" rel="noreferrer" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/85 transition hover:text-ink">→ Vote in the hackathon ↗</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
