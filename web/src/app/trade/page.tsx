"use client";

import { useEffect, useState } from "react";
import AskBar from "@/components/AskBar";
import ResultsTable from "@/components/ResultsTable";
import StakePanel from "@/components/StakePanel";
import TradeChart from "@/components/TradeChart";
import { Badge, Glass } from "@/components/ui";
import { useArena } from "@/lib/arena";
import { COMPANY } from "@/lib/demo";
import { fmtCountdown, fmtNum, fmtPct, fmtPrice, fmtWif } from "@/lib/format";
import type { Side } from "@/lib/types";

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-[12px] transition ${on ? "border-white/20 bg-white/[0.14] text-ink" : "border-white/10 bg-white/[0.04] text-ink/55 hover:text-ink"}`;

export default function TradePage() {
  const { ready, active, results, now, burnPct, claim, busy, mode } = useArena();
  const sampleSec = mode === "live" ? 10 : 1; // live mode samples the chain every 10s, demo mode ticks every second
  const [marketId, setMarketId] = useState(0);
  const [initialSide, setInitialSide] = useState<Side>();
  const [chartMode, setChartMode] = useState<"line" | "candles">("line");
  const [group, setGroup] = useState(3);
  const [tab, setTab] = useState<"positions" | "history" | "rules">("positions");

  // Deep link from the dashboard or signals page: /trade?round=ID&side=up
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const round = Number(q.get("round"));
    const side = q.get("side");
    if (side === "up" || side === "down") setInitialSide(side);
    if (round && active.length) {
      const hit = active.find((r) => r.id === round);
      if (hit) setMarketId(hit.marketId);
    }
    // only react to the first time active rounds arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length > 0]);

  const sel = active.find((r) => r.marketId === marketId) ?? active[0];
  const move = sel && sel.openPrice ? ((sel.price - sel.openPrice) / sel.openPrice) * 100 : 0;
  const hi = sel ? Math.max(sel.openPrice, ...sel.spark) : 0;
  const lo = sel ? Math.min(sel.openPrice, ...sel.spark) : 0;
  const total = sel ? sel.totalUp + sel.totalDown : 0;
  const upPct = sel && total ? (sel.totalUp / total) * 100 : 50;
  const clock = !sel ? "" : sel.status === "open" ? fmtCountdown(sel.lockTime - now) : sel.status === "locked" ? fmtCountdown(sel.endTime - now) : "--:--";
  const clockLabel = !sel ? "" : sel.status === "open" ? "Entries close" : sel.status === "locked" ? "Settles in" : "Settling";

  const positions = [...active, ...results].filter((r) => r.position);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-48 pt-24 sm:px-6 sm:pt-28">
      {/* market tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {active.map((r) => {
          const m = r.openPrice ? ((r.price - r.openPrice) / r.openPrice) * 100 : 0;
          const on = sel?.marketId === r.marketId;
          return (
            <button key={r.id} onClick={() => setMarketId(r.marketId)} aria-pressed={on} className={`glass !rounded-2xl flex shrink-0 items-center gap-3 px-4 py-2.5 text-left transition ${on ? "!border-ember/50 glass-ember" : "hover:bg-white/[0.06]"}`}>
              <Badge symbol={r.symbol} size={34} />
              <span>
                <span className="block text-[14px] font-medium">{r.symbol}</span>
                <span className="block font-mono text-[11px] text-ink/60">{fmtPrice(r.price)} <span className={m >= 0 ? "text-up" : "text-down"}>{fmtPct(m)}</span></span>
              </span>
            </button>
          );
        })}
        {!ready && [0, 1, 2].map((i) => <div key={i} className="h-[58px] w-[170px] shrink-0 animate-pulse rounded-2xl bg-white/5" />)}
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-4">
          {sel ? (
            <Glass tone="deep" className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Badge symbol={sel.symbol} size={46} />
                  <div>
                    <p className="text-[13px] text-ink/55">{COMPANY[sel.symbol] ?? "Stock Token"} · round #{sel.id}</p>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <p className="text-[clamp(2rem,4vw,3rem)] font-medium leading-none tracking-[-0.04em]">{fmtPrice(sel.price)}</p>
                      <span className={`tag ${move >= 0 ? "tag-up" : "tag-down"}`}>{move >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(move)).replace("+", "")}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-ink/50">{clockLabel}</p>
                  <p className="font-mono text-[2rem] font-medium leading-none">{clock}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1.5" role="group" aria-label="Chart type">
                  <button className={chip(chartMode === "line")} onClick={() => setChartMode("line")}>Line</button>
                  <button className={chip(chartMode === "candles")} onClick={() => setChartMode("candles")}>Candles</button>
                </div>
                <div className="flex gap-1.5" role="group" aria-label="Candle interval">
                  {[1, 3, 5].map((g) => (
                    <button key={g} className={`${chip(group === g)} ${chartMode === "line" ? "opacity-40" : ""}`} disabled={chartMode === "line"} onClick={() => setGroup(g)}>{g * sampleSec}s</button>
                  ))}
                </div>
              </div>

              <div className="-mx-1 mt-3">
                <TradeChart values={sel.spark} open={sel.openPrice} mode={chartMode} group={group} height={380} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-[12px] sm:grid-cols-5">
                {[
                  ["Open", fmtPrice(sel.openPrice)],
                  ["High", fmtPrice(hi)],
                  ["Low", fmtPrice(lo)],
                  ["Pool", fmtWif(total)],
                  ["Burn", `${Math.round(burnPct * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-ink/45">{k}</dt><dd className="mt-0.5 font-mono text-[14px]">{v}</dd></div>
                ))}
              </dl>
            </Glass>
          ) : (
            <Glass tone="deep" className="h-[560px] animate-pulse p-6"><span className="sr-only">Loading market</span></Glass>
          )}

          {/* positions / history / rules */}
          <Glass tone="deep">
            <div className="flex gap-1.5 border-b border-white/10 p-3">
              {(["positions", "history", "rules"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={chip(tab === t)}>{t[0].toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            {tab === "positions" && (
              <div className="overflow-x-auto">
                {positions.length === 0 ? (
                  <p className="p-6 text-sm text-ink/50">No positions yet. Pick a side and place an order.</p>
                ) : (
                  <table className="w-full min-w-[520px] text-left text-[13px]">
                    <thead><tr className="border-b border-white/10 text-[11px] text-ink/45"><th className="px-5 py-3 font-normal">Market</th><th className="px-3 py-3 font-normal">Side</th><th className="px-3 py-3 font-normal">Stake</th><th className="px-3 py-3 font-normal">Status</th><th className="px-5 py-3 text-right font-normal">Return</th></tr></thead>
                    <tbody>
                      {positions.map((r) => (
                        <tr key={r.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="px-5 py-3"><span className="flex items-center gap-2"><Badge symbol={r.symbol} size={26} />{r.symbol} <span className="text-ink/40">#{r.id}</span></span></td>
                          <td className="px-3 py-3"><span className={`tag ${r.position!.side === "up" ? "tag-up" : "tag-down"}`}>{r.position!.side === "up" ? "Up" : "Down"}</span></td>
                          <td className="px-3 py-3 font-mono">{fmtNum(r.position!.amount, 2)}</td>
                          <td className="px-3 py-3 text-ink/60">{r.status}</td>
                          <td className="px-5 py-3 text-right">
                            {r.position!.claimable > 0 && !r.position!.claimed ? (
                              <button disabled={busy} onClick={() => claim(r.id)} className="btn-ember !px-3 !py-1.5 !text-[12px]">Claim {fmtNum(r.position!.claimable, 2)}</button>
                            ) : (
                              <span className="font-mono text-ink/40">{r.position!.claimed ? "claimed" : "—"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {tab === "history" && <ResultsTable rows={results} />}
            {tab === "rules" && (
              <div className="grid gap-4 p-5 text-[13px] leading-relaxed text-ink/70 sm:grid-cols-3">
                <p><b className="text-ink">Call it.</b> Pick UP or DOWN before entries close. You can add to your side but not switch.</p>
                <p><b className="text-ink">Settle.</b> After the round ends, anyone can settle it with the Chainlink price. A tie, an empty side or a stale price voids the round and refunds everyone.</p>
                <p><b className="text-ink">Get paid.</b> Winners split the losing pool after {Math.round(burnPct * 100)}% is burned, weighted by win streak. You always get your own stake back.</p>
              </div>
            )}
          </Glass>
        </div>

        {/* right rail */}
        <div className="space-y-4 xl:sticky xl:top-24">
          <StakePanel round={sel} initialSide={initialSide} />
          {sel && (
            <Glass tone="deep" className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[1.05rem] font-medium tracking-tight">Pool depth</h2>
                <span className="pill">{fmtWif(total)} $WIF</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                <div className="bg-up/80 transition-all duration-700" style={{ width: `${upPct}%` }} />
                <div className="flex-1 bg-down/80" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <div><p className="text-up">▲ Up · {Math.round(upPct)}%</p><p className="font-mono text-[15px]">{fmtWif(sel.totalUp)}</p><p className="font-mono text-[11px] text-ink/45">pays {sel.totalUp ? (1 + (sel.totalDown * (1 - burnPct)) / sel.totalUp).toFixed(2) : "—"}x</p></div>
                <div className="text-right"><p className="text-down">Down · {Math.round(100 - upPct)}% ▼</p><p className="font-mono text-[15px]">{fmtWif(sel.totalDown)}</p><p className="font-mono text-[11px] text-ink/45">pays {sel.totalDown ? (1 + (sel.totalUp * (1 - burnPct)) / sel.totalDown).toFixed(2) : "—"}x</p></div>
              </div>
            </Glass>
          )}
        </div>
      </div>
      <AskBar />
    </div>
  );
}
