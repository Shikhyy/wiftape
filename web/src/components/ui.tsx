import type { ReactNode } from "react";

/** Frosted glass panel. tone: default, ember (orange tint), teal (deep teal tint), deep (dense data panel). */
export function Glass({ children, className = "", tone = "default" }: { children: ReactNode; className?: string; tone?: "default" | "ember" | "teal" | "deep" }) {
  const t = tone === "ember" ? "glass-ember" : tone === "teal" ? "glass-teal" : tone === "deep" ? "glass-deep" : "";
  return <div className={`glass ${t} ${className}`}>{children}</div>;
}

/* ---------- icons (20px, stroke) ---------- */
const svg = (d: ReactNode, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
export const IconGrid = () => svg(<><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>);
export const IconCandles = () => svg(<><path d="M7 4v16M17 4v16" /><rect x="4.5" y="8" width="5" height="7" rx="1.2" /><rect x="14.5" y="6" width="5" height="9" rx="1.2" /></>);
export const IconSignal = () => svg(<><path d="M4 18l5-6 4 3 7-9" /><circle cx="20" cy="6" r="1.4" /></>);
export const IconFlame = () => svg(<path d="M12 3c1 3.2 4.5 5 4.5 9.3A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.7c0-1.6.8-2.8 1.8-3.8.2 1.4 1 2 1.7 2.3C11 7.7 11 5.2 12 3z" />);
export const IconWallet = () => svg(<><path d="M4 8a3 3 0 0 1 3-3h11v14H7a3 3 0 0 1-3-3V8z" /><path d="M18 9h2v6h-2" /></>);
export const IconTarget = () => svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>);
export const IconBolt = () => svg(<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" />);
export const IconTrophy = () => svg(<><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6" /></>);
export const IconArrowUpRight = () => svg(<path d="M7 17L17 7M9 7h8v8" />, 15);
export const IconSend = () => svg(<path d="M5 12h13M13 6l6 6-6 6" />, 17);
export const IconSpark = () => svg(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />, 18);

/** Round icon button used in the corners of cards. */
export function IconDot({ children }: { children: ReactNode }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-ink/80 backdrop-blur">{children}</span>;
}

/** KPI card in the Signal style: small label, round icon, big figure with dimmed decimals, a chip footer. */
export function Kpi({
  label,
  value,
  decimals,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  decimals?: string;
  sub: ReactNode;
  icon: ReactNode;
  tone?: "default" | "up" | "down";
}) {
  const chip = tone === "up" ? "tag-up" : tone === "down" ? "tag-down" : "tag-neutral";
  return (
    <Glass className="flex min-h-[158px] flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-ink/65">{label}</p>
        <IconDot>{icon}</IconDot>
      </div>
      <p className="mt-4 text-[2.4rem] font-medium leading-none tracking-[-0.035em]">
        {value}
        {decimals && <span className="text-ink/35">{decimals}</span>}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className={`tag ${chip}`}>{sub}</span>
        <span className="text-ink/40"><IconArrowUpRight /></span>
      </div>
    </Glass>
  );
}

/** Radial gauge like the Signal "Market Sentiment" ring. value is 0-100. */
export function Gauge({ value, label, caption }: { value: number; label: string; caption: string }) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const arc = c * 0.78; // 280 degrees of ring
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[250px] place-items-center">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-[230deg]">
        <defs>
          <linearGradient id="gaugeG" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="rgb(200 55 10)" />
            <stop offset="0.5" stopColor="rgb(255 99 33)" />
            <stop offset="1" stopColor="rgb(255 190 120)" />
          </linearGradient>
          <filter id="gaugeGlow"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#gaugeG)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(arc * v) / 100} ${c}`} filter="url(#gaugeGlow)" opacity="0.7" style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }} />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#gaugeG)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(arc * v) / 100} ${c}`} style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="text-center">
        <p className="text-6xl font-medium tracking-[-0.05em]">{Math.round(v)}</p>
        <p className="mt-1 text-[13px] text-ink/60">{label}</p>
        <p className="caps mt-2">{caption}</p>
      </div>
    </div>
  );
}

/** Round badge with a symbol's first letter, tinted per market. */
export function Badge({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const tints: Record<string, string> = {
    NVDA: "linear-gradient(135deg, #8ee58a, #2f9d4a)",
    TSLA: "linear-gradient(135deg, #ff8a6a, #c43a1f)",
    AAPL: "linear-gradient(135deg, #c9d3dc, #6f7f8c)",
    SPY: "linear-gradient(135deg, #8fb3ff, #3a58b8)",
  };
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-mono text-[13px] font-bold text-black/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]" style={{ width: size, height: size, background: tints[symbol] ?? "linear-gradient(135deg,#f4b9a3,#ff6321)" }}>
      {symbol.slice(0, 1)}
    </span>
  );
}
