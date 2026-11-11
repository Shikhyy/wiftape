"use client";

import { useState } from "react";
import { useArena } from "@/lib/arena";
import { answer, SUGGESTIONS } from "@/lib/ask";
import { Glass, IconSend, IconSpark } from "./ui";

/** Floating prompt bar at the bottom of the app pages (Signal-style): suggestion chips, an input and a send button. */
export default function AskBar() {
  const { active, results, player, stats, burnPct } = useArena();
  const [q, setQ] = useState("");
  const [a, setA] = useState<{ q: string; text: string } | null>(null);

  const ask = (text: string) => {
    if (!text.trim()) return;
    setA({ q: text, text: answer(text, { active, results, player, stats, burnPct }) });
    setQ("");
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="pointer-events-auto w-[min(94vw,580px)]">
        {a && (
          <Glass tone="deep" className="mb-2 !rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-[12px] text-ink/55">{a.q}</p>
              <button onClick={() => setA(null)} aria-label="Close" className="text-ink/50 hover:text-ink">✕</button>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed">{a.text}</p>
            <p className="caps mt-3 !text-[10px]">Built-in assistant · reads live app data</p>
          </Glass>
        )}
        <div className="glass glass-deep !rounded-2xl border-ember/40 p-2 shadow-[0_0_50px_-12px_rgb(255_99_33/0.65)]">
          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto px-1 pt-1">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] text-ink/80 transition hover:bg-white/15">
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(q);
            }}
            className="flex items-center gap-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: "linear-gradient(135deg, rgb(255 140 70), rgb(200 55 10))" }}>
              <IconSpark />
            </span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about the markets…" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/40" aria-label="Ask about the markets" />
            <button type="submit" aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-ink transition hover:bg-white/20">
              <IconSend />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
