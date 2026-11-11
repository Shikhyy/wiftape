"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { useArena } from "@/lib/arena";
import { fmtNum, fmtWif, streakMultiplier } from "@/lib/format";
import type { RoundView, Side } from "@/lib/types";
import { EligibilityCheck, useEligibility } from "./EligibilityCheck";
import TestFaucet from "./TestFaucet";
import { Glass } from "./ui";

const PRESETS: [string, number][] = [["25%", 0.25], ["50%", 0.5], ["75%", 0.75], ["Max", 1]];

/** Order ticket: choose a side, set the amount, see the projected payout, place the order. */
export default function StakePanel({ round, initialSide }: { round?: RoundView; initialSide?: Side }) {
  const { player, minStake, burnPct, busy, error, mode, now, enter, claim, clearError } = useArena();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [side, setSide] = useState<Side>(initialSide ?? "up");
  const [amount, setAmount] = useState("50");
  const elig = useEligibility();

  useEffect(() => {
    if (initialSide) setSide(initialSide);
  }, [initialSide]);

  if (!round) {
    return (
      <Glass tone="deep" className="p-6">
        <p className="text-[13px] text-ink/60">Place order</p>
        <p className="mt-3 text-sm text-ink/50">Pick a market to trade.</p>
      </Glass>
    );
  }

  const amt = Number(amount) || 0;
  const mult = streakMultiplier(player.streak);
  const canEnter = round.status === "open" && now < round.lockTime;
  const myPos = round.position;
  const lockedToSide = myPos?.side;
  const activeSide = lockedToSide ?? side;

  // Projected payout if `activeSide` wins, using the same weighting rule as the contract.
  const mine = activeSide === "up" ? round.totalUp : round.totalDown;
  const other = activeSide === "up" ? round.totalDown : round.totalUp;
  const w = amt * mult;
  const projected = amt > 0 ? amt + ((other - other * burnPct) * w) / (mine + w || 1) : 0;
  const gain = projected - amt;
  const pays = (m: number, o: number) => (m > 0 ? 1 + (o * (1 - burnPct)) / m : 0);

  const needsWallet = mode === "live" && !isConnected;
  const tooLittle = amt < minStake;
  const tooMuch = amt > player.balance;
  const claimable = myPos && myPos.claimable > 0 && !myPos.claimed && (round.status === "settled" || round.status === "void");
  const statusLabel = round.status === "open" ? "Entries open" : round.status === "locked" ? "Locked" : round.status === "awaiting" ? "Settling" : round.status === "void" ? "Void" : "Settled";

  return (
    <Glass tone="deep" className="!rounded-[24px]">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div>
          <p className="text-[13px] text-ink/55">Place order</p>
          <p className="mt-0.5 text-[1.15rem] font-medium tracking-tight">{round.symbol} · round #{round.id}</p>
        </div>
        <span className={`tag ${canEnter ? "tag-up" : "tag-neutral"}`}>{statusLabel}</span>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.05] p-1">
          {(["up", "down"] as Side[]).map((s) => {
            const on = activeSide === s;
            const locked = lockedToSide && lockedToSide !== s;
            const m = s === "up" ? pays(round.totalUp, round.totalDown) : pays(round.totalDown, round.totalUp);
            return (
              <button
                key={s}
                disabled={Boolean(locked) || !canEnter}
                onClick={() => setSide(s)}
                aria-pressed={on}
                className={`rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  on ? (s === "up" ? "border-up/45 bg-up/20 text-up" : "border-down/45 bg-down/20 text-down") : "border-transparent text-ink/60 hover:bg-white/[0.06]"
                }`}
              >
                <span className="block text-[1.05rem] font-medium">{s === "up" ? "▲ Up" : "▼ Down"}</span>
                <span className="mt-0.5 block font-mono text-[11px] opacity-80">pays {m ? `${m.toFixed(2)}x` : "—"}</span>
              </button>
            );
          })}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-ink/55">
            <label htmlFor="stake-amount">Amount</label>
            <span>Balance {fmtWif(player.balance)} $WIF</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 focus-within:border-ember/60">
            <input
              id="stake-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-transparent font-mono text-[1.7rem] font-medium outline-none placeholder:text-ink/30"
              placeholder="0"
            />
            <span className="font-mono text-xs text-ink/50">$WIF</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map(([label, f]) => (
              <button key={label} onClick={() => setAmount(String(Math.floor(player.balance * f)))} className="rounded-lg border border-white/10 bg-white/[0.05] py-1.5 text-[12px] text-ink/75 transition hover:bg-white/15">
                {label}
              </button>
            ))}
          </div>
        </div>

        <dl className="space-y-2 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-ink/55">Streak weight</dt><dd className="font-mono">{mult.toFixed(2)}x</dd></div>
          <div className="flex justify-between"><dt className="text-ink/55">Burned from losing pool</dt><dd className="font-mono text-flame">{Math.round(burnPct * 100)}%</dd></div>
          <div className="flex justify-between"><dt className="text-ink/55">If {activeSide.toUpperCase()} wins</dt><dd className="font-mono text-up">{amt > 0 ? `+${fmtNum(gain, 2)}` : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/55">If it loses</dt><dd className="font-mono text-down">−{fmtNum(amt, 2)}</dd></div>
        </dl>

        <TestFaucet />
        <EligibilityCheck ok={elig.ok} set={elig.set} />

        {claimable ? (
          <button className="btn-ember w-full !py-3.5 !text-[15px]" disabled={busy} onClick={() => claim(round.id)}>
            Claim {fmtNum(myPos.claimable, 2)} $WIF
          </button>
        ) : needsWallet ? (
          <button className="btn-ember w-full !py-3.5 !text-[15px]" onClick={() => connect({ connector: connectors[0] })}>Connect wallet to trade</button>
        ) : (
          <button className="btn-ember w-full !py-3.5 !text-[15px]" disabled={busy || !canEnter || !elig.ok || tooLittle || tooMuch} onClick={() => enter(round.id, activeSide, amt)}>
            {busy
              ? "Confirm in wallet…"
              : !canEnter
                ? "Entries closed"
                : !elig.ok
                  ? "Confirm eligibility above"
                  : tooMuch
                    ? "Not enough $WIF"
                    : tooLittle
                      ? `Minimum ${minStake} $WIF`
                      : `Stake ${fmtNum(amt)} $WIF on ${activeSide.toUpperCase()}`}
          </button>
        )}

        {error && (
          <p role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-down/30 bg-down/15 p-3 text-xs text-down">
            <span>{error}</span>
            <button onClick={clearError} aria-label="Dismiss" className="font-bold">✕</button>
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-ink/40">
          {mode === "demo" ? "Demo mode: sample data, nothing is on-chain. " : ""}A game of skill. Not financial advice. 18+. $WIF has no promised value.
        </p>
      </div>
    </Glass>
  );
}
