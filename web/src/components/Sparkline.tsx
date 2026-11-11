import { useId } from "react";

/** Small area sparkline with a gradient fill and an end dot. */
export default function Sparkline({ values, tone = "up", height = 36, className = "" }: { values: number[]; tone?: "up" | "down" | "ember"; height?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const w = 120;
  const pts = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const pad = 3;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (w - 4), height - pad - ((v - min) / span) * (height - pad * 2)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0]} ${height} L0 ${height} Z`;
  const [lx, ly] = xy[xy.length - 1];
  const rgb = { up: "96 224 154", down: "255 94 76", ember: "255 99 33" }[tone];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={className} style={{ width: "100%", height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity="0.35" />
          <stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={`rgb(${rgb})`} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.4" fill={`rgb(${rgb})`} />
    </svg>
  );
}
