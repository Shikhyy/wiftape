"use client";

import { useRef } from "react";
import { LogoMark } from "./Logo";
import { Reveal, useScrollEffect } from "./Reveal";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const CARDS = [
  { from: "Somebody from the internet", when: "Now", text: "It doesn’t look like a casino.", tone: "dark" as const },
  { from: "From: WIF Tape", when: "Now", text: "Because it isn’t.", tone: "dark" as const },
  { from: "From: WIF Tape", when: "Always", text: "There’s a price. There’s a close. No house. No edge. Just a call.", tone: "ember" as const },
];

/**
 * blink.capital-style stack of messages that fall into place as you scroll (a pinned, scroll-driven section).
 * The motion is written straight to the cards through refs on every frame, with no React state, so it stays smooth.
 * The section is short (about two screens of scroll) and has a heading, so the pinned stage is never mostly empty.
 */
export default function MessageStack() {
  const cards = useRef<(HTMLDivElement | null)[]>([]);

  const ref = useScrollEffect<HTMLDivElement>((p) => {
    const t = CARDS.map((_, i) => ease(clamp((p - 0.03 - i * 0.24) / 0.22)));
    CARDS.forEach((_, i) => {
      const el = cards.current[i];
      if (!el) return;
      let later = 0;
      for (let j = i + 1; j < CARDS.length; j++) later += t[j];
      el.style.transform = `translate3d(0, ${(1 - t[i]) * 380 - later * 64}px, 0) scale(${1 - later * 0.05})`;
      // Reach full opacity in the first third of the slide, so a card sliding over the others is solid, not see-through.
      el.style.opacity = String(Math.min(1, t[i] * 3) * (1 - later * 0.3));
    });
  }, true);

  return (
    <div ref={ref} className="relative h-[175vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4 pt-16">
        <Reveal className="text-center">
          <p className="caps">The honest part</p>
          <h3 className="mt-4 max-w-[18ch] font-serif text-[clamp(2rem,4.2vw,3.6rem)] leading-[1.04] tracking-[-0.015em]">Trust, In Plain Words.</h3>
        </Reveal>

        <div className="relative h-[400px] w-[min(92vw,540px)]">
          {CARDS.map((c, i) => {
            const big = i === CARDS.length - 1;
            return (
              <div
                key={i}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className={`glass absolute inset-x-0 bottom-0 !rounded-[18px] p-4 will-change-transform ${c.tone === "ember" ? "glass-ember" : "glass-deep"}`}
                style={{ transformOrigin: "50% 100%", opacity: 0, zIndex: i, height: big ? 330 : 120 }}
              >
                {/* opaque base under the glass, so the cards behind do not show their text through the front card */}
                <div aria-hidden className="absolute inset-0" style={{ background: "rgb(10 8 8 / 0.92)" }} />
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">
                  <span>{c.from}</span>
                  <span>{c.when}</span>
                </div>
                <p className={`mt-4 font-mono uppercase leading-[1.6] tracking-[0.03em] ${big ? "text-[15px]" : "text-[13px] text-ink/70"}`}>{c.text}</p>
                {big && (
                  <div className="relative mt-4 h-[170px] overflow-hidden rounded-xl" style={{ background: "linear-gradient(160deg, rgb(20 8 6), rgb(70 22 8) 60%, rgb(255 99 33 / 0.8))" }}>
                    <div className="absolute -bottom-24 left-1/2 aspect-square w-[130%] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle at 50% 30%, rgb(255 200 150 / 0.9), rgb(255 99 33 / 0.5) 35%, transparent 62%)" }} />
                    <LogoMark size={110} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
