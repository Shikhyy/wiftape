"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtPrice } from "@/lib/format";
import { toCandles } from "@/lib/ohlc";

/**
 * Trading chart: line with an ember gradient area, or candlesticks, with a dashed open-price line,
 * price grid, a last-price tag and a hover crosshair. SVG only.
 */
export default function TradeChart({
  values,
  open,
  mode = "line",
  group = 3,
  height = 360,
  compact = false,
}: {
  values: number[];
  open: number;
  mode?: "line" | "candles";
  group?: number;
  height?: number;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the container's real pixel width so text and strokes keep their size on phones (a fixed 1000px viewBox shrinks everything).
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const padR = compact ? 54 : 78;
  const padT = 16;
  const padB = compact ? 10 : 24;
  const plotW = w - padR;
  const series = values.length > 1 ? values : [open, values[0] ?? open];
  const candles = mode === "candles" ? toCandles(series, Math.max(1, group)) : [];
  const pts = mode === "candles" ? candles.map((c) => c.c) : series;
  const lo = Math.min(open, ...(mode === "candles" ? candles.map((c) => c.l) : series));
  const hi = Math.max(open, ...(mode === "candles" ? candles.map((c) => c.h) : series));
  const pad = (hi - lo || 1) * 0.12;
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const n = pts.length;
  const x = (i: number) => (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW * (mode === "candles" ? 0.97 : 1) + (mode === "candles" ? plotW * 0.015 : 0));

  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${height - padB} L${x(0).toFixed(1)} ${height - padB} Z`;
  const last = pts[n - 1];
  const rising = last >= open;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((g) => ({ y: padT + g * (height - padT - padB), v: max - g * (max - min) }));
  const cw = Math.max(3, (plotW / Math.max(1, n)) * 0.58);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * w;
    if (px > plotW) return setHover(null);
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / plotW) * (n - 1)))));
  };

  const hv = hover != null ? pts[hover] : null;
  const accent = rising ? "var(--up)" : "var(--down)";

  return (
    <div ref={box} className="w-full">
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${height}`}
      width={w}
      height={height}
      className="block select-none"
      role="img"
      aria-label={`Price ${fmtPrice(last)}, open ${fmtPrice(open)}`}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(255 99 33)" stopOpacity="0.42" />
          <stop offset="1" stopColor="rgb(255 99 33)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgb(255 150 70)" stopOpacity="0.55" />
          <stop offset="1" stopColor="rgb(255 215 175)" />
        </linearGradient>
        <filter id={`${id}g`}><feGaussianBlur stdDeviation="5" /></filter>
      </defs>

      {grid.map((g, i) => (
        <g key={i}>
          <line x1="0" x2={plotW} y1={g.y} y2={g.y} stroke="rgb(255 255 255 / 0.06)" />
          <text x={plotW + 8} y={g.y + 4} fontSize="12" fontFamily="var(--font-mono)" fill="rgb(243 235 227 / 0.42)">{g.v.toFixed(2)}</text>
        </g>
      ))}

      {mode === "line" ? (
        <>
          <path d={area} fill={`url(#${id}a)`} />
          <path d={line} fill="none" stroke="rgb(255 99 33)" strokeWidth="6" opacity="0.55" filter={`url(#${id}g)`} />
          <path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        candles.map((c, i) => {
          const up = c.c >= c.o;
          const col = up ? "rgb(96 224 154)" : "rgb(255 94 76)";
          const cx = x(i);
          const top = y(Math.max(c.o, c.c));
          const bh = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth="1.5" opacity="0.9" />
              <rect x={cx - cw / 2} y={top} width={cw} height={bh} rx="1.5" fill={col} opacity={up ? 0.85 : 0.9} />
            </g>
          );
        })
      )}

      {/* open price */}
      <line x1="0" x2={plotW} y1={y(open)} y2={y(open)} stroke="rgb(243 235 227 / 0.5)" strokeDasharray="5 6" />
      <g transform={`translate(8 ${y(open) - 22})`}>
        <rect width="86" height="18" rx="9" fill="rgb(255 255 255 / 0.1)" />
        <text x="43" y="13" textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="rgb(243 235 227 / 0.8)">open {open.toFixed(2)}</text>
      </g>

      {/* last price tag */}
      <line x1={x(n - 1)} x2={plotW} y1={y(last)} y2={y(last)} stroke={`rgb(${accent})`} strokeDasharray="2 4" opacity="0.7" />
      <g transform={`translate(${plotW + 4} ${y(last) - 12})`}>
        <rect width={padR - 4} height="24" rx="7" fill={`rgb(${accent})`} />
        <text x={(padR - 4) / 2} y="16" textAnchor="middle" fontSize="12.5" fontWeight="700" fontFamily="var(--font-mono)" fill="#0a0707">{last.toFixed(2)}</text>
      </g>
      <circle cx={x(n - 1)} cy={y(last)} r="4.5" fill={`rgb(${accent})`} />
      <circle cx={x(n - 1)} cy={y(last)} r="4.5" fill="none" stroke={`rgb(${accent})`} opacity="0.6">
        <animate attributeName="r" values="4;14" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* crosshair */}
      {hover != null && hv != null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={height - padB} stroke="rgb(255 255 255 / 0.3)" strokeDasharray="3 4" />
          <line x1="0" x2={plotW} y1={y(hv)} y2={y(hv)} stroke="rgb(255 255 255 / 0.3)" strokeDasharray="3 4" />
          <g transform={`translate(${Math.min(x(hover) + 10, plotW - 150)} ${padT + 6})`}>
            <rect width="140" height="24" rx="8" fill="rgb(20 14 12 / 0.9)" stroke="rgb(255 255 255 / 0.15)" />
            <text x="70" y="16" textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill="rgb(243 235 227)">{fmtPrice(hv)} · {(((hv - open) / open) * 100).toFixed(2)}%</text>
          </g>
          <circle cx={x(hover)} cy={y(hv)} r="4" fill="rgb(243 235 227)" />
        </g>
      )}
    </svg>
    </div>
  );
}
