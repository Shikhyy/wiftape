"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades, rises and un-blurs its children the first time they scroll into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/**
 * Scroll-driven animation WITHOUT React state. Calls `apply(p)` on every animation frame while scrolling, where p runs 0 → 1 as the
 * element travels through the viewport (0 when its top reaches the bottom of the screen, 1 when its bottom leaves the top). With `pin`,
 * p runs 0 → 1 across the scroll distance of a tall section whose child is `position: sticky`.
 *
 * `apply` should write straight to the DOM (element.style / setAttribute through refs). Using setState here would re-render the whole
 * section 60 times a second, which is what made the first version feel sluggish.
 */
export function useScrollEffect<T extends HTMLElement>(apply: (p: number) => void, pin = false) {
  const ref = useRef<T>(null);
  const cb = useRef(apply);
  cb.current = apply;

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const calc = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const v = pin ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (r.height + vh);
      const p = Math.min(1, Math.max(0, v));
      if (Math.abs(p - last) > 0.0003) {
        last = p;
        cb.current(p);
      }
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pin]);

  return ref;
}
