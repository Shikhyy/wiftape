"use client";

import { useEffect, useRef } from "react";

/**
 * The blink.capital-style hero orb: a dark sphere with a thin iridescent rim. Three offset rings blended with `screen` give the
 * chromatic edge; a soft halo and a bright lower arc sell the glow. Colours come from the brand palette (ember, peach, teal) so
 * it matches the app's backdrop. Slowly turns, breathes, and leans toward the pointer. Pure CSS, no video.
 */
export default function Orb({ size = "min(118vh, 130vw)", interactive = true, className = "" }: { size?: string; interactive?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", String(e.clientX / window.innerWidth - 0.5));
        el.style.setProperty("--my", String(e.clientY / window.innerHeight - 0.5));
      });
    };
    window.addEventListener("pointermove", on);
    return () => {
      window.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  const ring = (a: string, b: string, c: string, d: string) =>
    `conic-gradient(from 200deg, rgb(${a}), rgb(${b}), rgb(${c}), rgb(${d}), rgb(${a}))`;
  const rimMask = "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1px))";
  const haloMask = "radial-gradient(farthest-side, transparent calc(100% - 9%), #000 calc(100% - 0.5%))";

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none relative animate-breathe will-change-transform ${className}`}
      style={{ width: size, height: size, ["--mx" as string]: 0, ["--my" as string]: 0, transform: "translate3d(calc(var(--mx) * -22px), calc(var(--my) * -16px), 0)" }}
    >
      {/* sphere body: deep teal fading to black, with a warm glow low down */}
      <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 50% 74%, rgb(255 99 33 / 0.22), rgb(30 66 78 / 0.5) 34%, rgb(8 16 20 / 0.75) 56%, rgb(4 3 5) 74%)" }} />
      {/* soft halo */}
      <div className="absolute inset-0 rounded-full opacity-80 blur-[28px]" style={{ background: ring("255,99,33", "244,185,163", "40,120,150", "255,150,70"), WebkitMask: haloMask, mask: haloMask }} />
      {/* chromatic rim: cool teal, warm peach, hot ember, each slightly different */}
      <div className="absolute inset-0 animate-spin_slow rounded-full" style={{ background: ring("120,200,220", "255,170,120", "255,99,33", "100,190,210"), WebkitMask: rimMask, mask: rimMask }} />
      <div className="absolute inset-[0.35%] animate-spin_rev rounded-full" style={{ background: ring("255,99,33", "255,210,160", "90,170,190", "255,99,33"), WebkitMask: rimMask, mask: rimMask, opacity: 0.85 }} />
      <div className="absolute inset-[0.8%] animate-spin_slow rounded-full" style={{ background: ring("90,180,200", "255,255,255", "255,140,70", "90,180,200"), WebkitMask: rimMask, mask: rimMask, opacity: 0.6 }} />
      {/* bright lower-left arc */}
      <div className="absolute inset-0 rounded-full blur-[6px]" style={{ background: "conic-gradient(from 110deg, transparent 0deg, rgb(255 190 140 / 0) 40deg, rgb(255 200 150 / 0.9) 90deg, rgb(130 205 225 / 0.9) 130deg, transparent 190deg)", WebkitMask: rimMask, mask: rimMask }} />
    </div>
  );
}
