"use client";

import BurnChart from "@/components/BurnChart";
import Odometer from "@/components/Odometer";
import { Glass, IconBolt, IconFlame, IconTarget, IconWallet, Kpi } from "@/components/ui";
import { useArena } from "@/lib/arena";
import { CONFIG, explorerAddress, LIVE } from "@/lib/config";
import { fmtNum, fmtWif, shortAddr } from "@/lib/format";

function ago(sec: number): string {
  if (sec < 60) return `${Math.max(0, sec)}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export default function BurnPage() {
  const { ready, stats, results, burnPct, now, mode } = useArena();
  const events = results.filter((r) => r.burned > 0).slice(0, 8);
  const perRound = stats.roundsSettled ? stats.totalBurned / stats.roundsSettled : 0;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-32 pt-24 sm:px-6 sm:pt-28">
      <header>
        <p className="caps">The burn · {mode === "demo" ? "sample data until the contract is deployed" : "read live from the contract"}</p>
        <h1 className="mt-3 max-w-[14ch] font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[1] tracking-[-0.02em]">Every Round, A Little Less $WIF.</h1>
      </header>

      <Glass tone="ember" className="mt-8 p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-ink/70">Total $WIF burned by WIF Tape</p>
          <span className="pill"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-flame" /> {Math.round(burnPct * 100)}% of every losing pool</span>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <Odometer value={ready ? stats.totalBurned : 0} className="text-[clamp(2.8rem,9vw,8.5rem)]" />
        </div>
        <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-ink/60">The burn happens inside settle(), in the same transaction that picks the winner. Nothing waits on a person.</p>
      </Glass>

      <section className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Rounds settled" value={ready ? fmtNum(stats.roundsSettled) : "—"} sub="by Chainlink price" icon={<IconTarget />} />
        <Kpi label="Average burn per round" value={ready ? fmtWif(perRound) : "—"} sub="$WIF" icon={<IconFlame />} />
        <Kpi label="Unique players" value={ready ? fmtNum(stats.uniquePlayers) : "—"} sub="wallets" icon={<IconBolt />} />
        <Kpi label="$WIF staked" value={ready ? fmtWif(stats.totalStaked) : "—"} sub="all time" icon={<IconWallet />} />
      </section>

      <Glass tone="deep" className="mt-4 p-5 sm:p-6">
        <h2 className="mb-4 text-[1.05rem] font-medium tracking-tight">Burn over time</h2>
        <BurnChart values={stats.burnSeries} />
      </Glass>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Glass tone="deep" className="p-5">
          <h2 className="mb-3 text-[1.05rem] font-medium tracking-tight">Latest burns</h2>
          <div className="space-y-2">
            {events.length === 0 && <p className="text-sm text-ink/50">No burns yet.</p>}
            {events.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-[13px]">
                <span><b className="font-mono font-medium text-flame">−{fmtWif(r.burned)}</b> <span className="text-ink/55">$WIF · {r.symbol} #{r.id}</span></span>
                <span className="font-mono text-[11px] text-ink/40">{ago(now - r.endTime)}</span>
              </div>
            ))}
          </div>
        </Glass>

        <Glass tone="deep" className="p-5">
          <h2 className="mb-3 text-[1.05rem] font-medium tracking-tight">Verify it yourself</h2>
          <dl className="space-y-2 text-[13px]">
            {[
              ["WifTape contract", CONFIG.tape, "not deployed yet"],
              ["$WIF token", CONFIG.wif, "not configured"],
            ].map(([k, addr, none]) => (
              <div key={k as string} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                <dt className="text-ink/60">{k}</dt>
                <dd className="font-mono">{addr ? <a className="text-flame hover:underline" href={explorerAddress(addr as string)} target="_blank" rel="noreferrer">{shortAddr(addr as string)} ↗</a> : <span className="text-ink/40">{none}</span>}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3"><dt className="text-ink/60">Mode</dt><dd className="font-mono">{LIVE ? "live" : "demo"}</dd></div>
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-ink/55">
            The burn is a call to the token’s own <code className="font-mono text-flame">burn</code> or a send to the dead address, and each one emits a <code className="font-mono text-flame">Burned</code> event you can filter on the explorer.
          </p>
        </Glass>
      </section>
    </div>
  );
}
