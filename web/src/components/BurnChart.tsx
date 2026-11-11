import { useId } from "react";
import { fmtWif } from "@/lib/format";

/** Cumulative burn as a glowing ember area chart, with a dot on each settled round. */
export default function BurnChart({ values, height = 300 }: { values: number[]; height?: number }) {
  const id = useId().replace(/:/g, "");
  const w = 1000;
  const padT = 20;
  const padB = 26;
  const pts = values.length > 1 ? values.slice(-40) : [0, values[0] ?? 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, padT + (1 - (v - min) / span) * (height - padT - padB)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${height - padB} L0 ${height - padB} Z`;
  const [lx, ly] = xy[xy.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Cumulative $WIF burned">
        <defs>
          <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(255 99 33)" stopOpacity="0.5" />
            <stop offset="1" stopColor="rgb(255 99 33)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}l`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgb(255 150 70)" stopOpacity="0.5" />
            <stop offset="1" stopColor="rgb(255 225 195)" />
          </linearGradient>
          <filter id={`${id}g`}><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={padT + g * (height - padT - padB)} y2={padT + g * (height - padT - padB)} stroke="rgb(255 255 255 / 0.07)" strokeDasharray="3 7" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${id}a)`} />
        <path d={line} fill="none" stroke="rgb(255 99 33)" strokeWidth="8" opacity="0.5" filter={`url(#${id}g)`} vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={lx} cy={ly} r="5" fill="rgb(255 235 215)" />
        <circle cx={lx} cy={ly} r="12" fill="rgb(255 99 33 / 0.3)" />
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-ink/45">
        <span>{fmtWif(min)}</span>
        <span>cumulative $WIF burned</span>
        <span>{fmtWif(max)}</span>
      </div>
    </div>
  );
}
