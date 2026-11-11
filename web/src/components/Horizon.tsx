"use client";

import { useRef } from "react";
import { Reveal, useScrollEffect } from "./Reveal";

// A big shallow arc whose apex sits at (720, 195) in a 1440x560 box.
const ARC = "M -300 560 Q 720 -170 1740 560";
const APEX_TOP = (195 / 560) * 100;

/**
 * blink.capital "System Architecture" section: a centred serif title, a thin horizon arc that draws itself as you scroll,
 * a glowing node on the apex joined to the title by a dashed line, and mono caps copy beneath.
 * The arc, node and line are updated through refs on every frame (no React state), so scrolling stays smooth.
 */
export default function Horizon({ title, sub, body, accent = "255 99 33" }: { title: string; sub: string; body: string; accent?: string }) {
  const glow = useRef<SVGPathElement>(null);
  const line = useRef<SVGPathElement>(null);
  const dash = useRef<HTMLDivElement>(null);
  const node = useRef<HTMLDivElement>(null);

  const ref = useScrollEffect<HTMLDivElement>((p) => {
    const draw = Math.min(1, Math.max(0, (p - 0.1) / 0.36));
    glow.current?.setAttribute("stroke-dashoffset", String(1 - draw));
    line.current?.setAttribute("stroke-dashoffset", String(1 - draw));
    if (dash.current) dash.current.style.opacity = String(draw);
    if (node.current) {
      node.current.style.opacity = String(draw);
      node.current.style.transform = `translate(-50%, -50%) scale(${0.4 + draw * 0.6})`;
    }
  });

  return (
    <div ref={ref} className="relative mx-auto flex min-h-[82vh] max-w-[1700px] flex-col items-center pt-[10vh]">
      <Reveal>
        <h3 className="text-center font-serif text-[clamp(1.7rem,2.8vw,2.6rem)] leading-[1.08]">
          {title}
          <br />
          <span className="text-ink/60">{sub}</span>
        </h3>
      </Reveal>

      <div className="relative mt-[5vh] w-full" style={{ aspectRatio: "1440 / 560" }}>
        <svg viewBox="0 0 1440 560" className="absolute inset-0 h-full w-full" aria-hidden>
          <path ref={glow} d={ARC} pathLength={1} fill="none" stroke={`rgb(${accent} / 0.35)`} strokeWidth="9" strokeDasharray="1" strokeDashoffset={1} />
          <path ref={line} d={ARC} pathLength={1} fill="none" stroke="rgb(243 235 227 / 0.9)" strokeWidth="1.4" strokeDasharray="1" strokeDashoffset={1} />
        </svg>

        {/* dashed line from the title down to the node */}
        <div
          ref={dash}
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 border-l border-dashed border-ink/35"
          style={{ top: "-8vh", height: `calc(8vh + ${APEX_TOP}%)`, opacity: 0 }}
        />
        {/* node */}
        <div
          ref={node}
          aria-hidden
          className="absolute left-1/2 h-3.5 w-3.5 will-change-transform"
          style={{ top: `${APEX_TOP}%`, background: `rgb(${accent})`, boxShadow: `0 0 24px 4px rgb(${accent} / 0.65)`, transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 }}
        >
          <span className="absolute inset-0 animate-pulse_ring" style={{ border: `1px solid rgb(${accent})` }} />
        </div>

        <div className="absolute inset-x-0 flex justify-center px-6" style={{ top: `${APEX_TOP + 12}%` }}>
          <Reveal delay={120}>
            <p className="max-w-[440px] text-center font-mono text-[11px] uppercase leading-[1.85] tracking-[0.07em] text-ink/85">{body}</p>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
