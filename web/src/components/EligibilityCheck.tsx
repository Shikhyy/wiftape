"use client";

import { useCallback, useEffect, useState } from "react";
import { ELIGIBILITY_KEY } from "@/lib/restricted";

/** Remembers the visitor's eligibility confirmation in this browser. Storage can be blocked, so it falls back to per-session state. */
export function useEligibility() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    try {
      setOk(localStorage.getItem(ELIGIBILITY_KEY) === "yes");
    } catch {
      /* storage blocked: the box just starts unticked each visit */
    }
  }, []);

  const set = useCallback((v: boolean) => {
    setOk(v);
    try {
      if (v) localStorage.setItem(ELIGIBILITY_KEY, "yes");
      else localStorage.removeItem(ELIGIBILITY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { ok, set };
}

/** Required confirmation before staking. The stake button stays disabled until it is ticked. */
export function EligibilityCheck({ ok, set }: { ok: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[12px] leading-snug text-ink/70">
      <input type="checkbox" checked={ok} onChange={(e) => set(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border border-white/25 bg-white/[0.06] text-[11px] font-bold leading-none text-white peer-checked:border-ember peer-checked:bg-ember peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flame"
      >
        {ok ? "✓" : ""}
      </span>
      <span>
        I am 18 or older, I am not a US person, and I am not in Canada, the UK, Switzerland or a sanctioned jurisdiction. I understand $WIF has no promised
        value and I can lose what I stake.
      </span>
    </label>
  );
}
