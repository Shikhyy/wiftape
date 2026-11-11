"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";

type Story = { tag: string; title: string; body: string; tone: "ember" | "orb" | "teal" | "peach" };

const STORIES: Story[] = [
  { tag: "The round", title: "It Starts With One Simple Question: Up Or Down By The Close?", body: "PICK A STOCK TOKEN. CALL IT BEFORE ENTRIES CLOSE. NO CHARTS TO LEARN, NO ORDER TYPES.", tone: "ember" },
  { tag: "The stake", title: "Stake $WIF On Your Call.", body: "WINNERS SPLIT THE LOSING POOL. NO HOUSE. NO EDGE. A WIN STREAK ADDS WEIGHT TO YOUR SHARE.", tone: "orb" },
  { tag: "The settle", title: "Chainlink Settles It, In Public.", body: "ANYONE CAN SETTLE. A TIE, AN EMPTY SIDE OR A STALE PRICE VOIDS THE ROUND AND REFUNDS EVERYONE.", tone: "teal" },
  { tag: "The burn", title: "Then A Tenth Of The Losing Pool Is Burned.", body: "THE BURN HAPPENS INSIDE THE SETTLE TRANSACTION. USING THE APP IS THE BURN.", tone: "peach" },
];

function Card({ s, i }: { s: Story; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.55 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const bg: Record<Story["tone"], string> = {
    ember: "linear-gradient(165deg, #ff8a4c 0%, #f0561a 48%, #a52e07 100%)",
    orb: "linear-gradient(165deg, rgb(26 20 22), rgb(8 6 7))",
    teal: "linear-gradient(165deg, #2c6070 0%, #153944 55%, #0a1c22 100%)",
    peach: "linear-gradient(165deg, #f6c3ad 0%, #f0794a 50%, #8e2a0a 100%)",
  };
  const dark = s.tone === "peach";

  return (
    <div
      ref={ref}
      className="glass relative flex h-[min(74vh,540px)] w-[min(80vw,360px)] shrink-0 snap-center flex-col !rounded-[22px] p-4"
      style={{ background: bg[s.tone], borderColor: "rgb(255 255 255 / 0.14)", color: dark ? "#1a0a04" : undefined }}
    >
      {/* progress segments, like a story */}
      <div className="flex gap-1.5">
        {STORIES.map((_, j) => (
          <span key={j} className="h-[2px] flex-1 overflow-hidden rounded-full" style={{ background: dark ? "rgb(0 0 0 / 0.2)" : "rgb(255 255 255 / 0.22)" }}>
            <span
              className="block h-full origin-left rounded-full"
              style={{
                background: dark ? "#1a0a04" : "#fff",
                transform: j < i ? "scaleX(1)" : "scaleX(0)",
                animation: j === i && seen ? "fill 6s linear forwards" : undefined,
              }}
            />
          </span>
        ))}
      </div>

      <span className="mt-4 w-fit rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ background: dark ? "rgb(0 0 0 / 0.12)" : "rgb(255 255 255 / 0.18)" }}>
        {s.tag}
      </span>
      <h3 className="mt-4 font-serif text-[2.15rem] leading-[1.02]">{s.title}</h3>

      {/* art */}
      <div className="relative my-4 flex flex-1 items-center justify-center overflow-hidden">
        {s.tone === "ember" && <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(115deg, transparent 0 16px, rgb(0 0 0 / 0.14) 16px 17px)", maskImage: "linear-gradient(to top, #000, transparent 85%)", WebkitMaskImage: "linear-gradient(to top, #000, transparent 85%)" }} />}
        {s.tone === "orb" && (
          <div className="aspect-square w-[62%] animate-breathe rounded-full" style={{ background: "radial-gradient(circle at 38% 36%, #f4b9a3, #ff6321 34%, #2c6070 68%, #0a1c22 100%)", boxShadow: "0 0 90px -10px rgb(255 99 33 / 0.55)" }} />
        )}
        {s.tone === "teal" && (
          <svg viewBox="0 0 200 120" className="w-[88%]" aria-hidden>
            <path d="M0 100 C 50 100 60 30 110 40 S 170 90 200 20" fill="none" stroke="rgb(243 235 227)" strokeWidth="1.6" />
            <path d="M0 100 C 50 100 60 30 110 40 S 170 90 200 20 V120 H0Z" fill="rgb(243 235 227 / 0.08)" />
            <circle cx="200" cy="20" r="4" fill="rgb(255 99 33)" />
          </svg>
        )}
        {s.tone === "peach" && <LogoMark size={190} className="opacity-80 mix-blend-multiply" />}
      </div>

      <p className="font-mono text-[11px] leading-[1.65] tracking-[0.04em]">{s.body}</p>
    </div>
  );
}

/** blink.capital-style row of story cards: snap scroll, progress segments that fill when a card comes into view. */
export default function Stories() {
  const rail = useRef<HTMLDivElement>(null);
  const go = (d: number) => rail.current?.scrollBy({ left: d * 390, behavior: "smooth" });

  return (
    <div>
      <div ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-1400px)/2+2rem))] pb-6 pt-2">
        {STORIES.map((s, i) => (
          <Card key={s.tag} s={s} i={i} />
        ))}
        <div className="w-[1px] shrink-0" />
      </div>
      <div className="mx-auto mt-2 flex max-w-[1400px] justify-end gap-2 px-4 sm:px-8">
        <button onClick={() => go(-1)} className="btn-glass !h-10 !w-10 !p-0" aria-label="Previous">←</button>
        <button onClick={() => go(1)} className="btn-glass !h-10 !w-10 !p-0" aria-label="Next">→</button>
      </div>
    </div>
  );
}
