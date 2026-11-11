/**
 * Logo mark: a dot-matrix crater / tape reel. Four rings of dots around an empty centre,
 * dots shrinking and fading toward the right like the Crater reference. Rings turn at different speeds.
 */
const RINGS = [
  { r: 8.5, n: 7, d: 2.4, c: "244,185,163" },
  { r: 15.5, n: 13, d: 2.2, c: "246,160,130" },
  { r: 22.5, n: 19, d: 1.9, c: "250,130,90" },
  { r: 29.5, n: 25, d: 1.5, c: "255,99,33" },
];

export function LogoMark({ size = 34, spin = true, className = "" }: { size?: number; spin?: boolean; className?: string }) {
  return (
    <svg viewBox="-34 -34 68 68" width={size} height={size} aria-hidden className={className}>
      {RINGS.map((ring, ri) => (
        <g key={ri} style={{ transformOrigin: "0 0", animation: spin ? `spin_slow ${50 + ri * 22}s linear infinite ${ri % 2 ? "reverse" : ""}` : undefined }}>
          {Array.from({ length: ring.n }, (_, i) => {
            const a = (i / ring.n) * Math.PI * 2;
            if (ri >= 2 && (i * 3 + ri) % 7 === 0) return null; // a few gaps, like dispersing dust
            const k = 0.5 + 0.5 * Math.cos(a - Math.PI); // biggest on the left
            // Rounded so server and client render identical numbers (raw floats differ in the last digit and cause a hydration warning).
            const f = (n: number) => Number(n.toFixed(3));
            return <circle key={i} cx={f(Math.cos(a) * ring.r)} cy={f(Math.sin(a) * ring.r)} r={f(ring.d * (0.42 + 0.58 * k))} fill={`rgb(${ring.c})`} opacity={f(0.5 + 0.5 * k)} />;
          })}
        </g>
      ))}
    </svg>
  );
}

export function Wordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="WIF Tape">
      <LogoMark size={Math.round(size * 1.5)} />
      <span className="font-sans font-medium lowercase tracking-[-0.03em] text-ink" style={{ fontSize: size }}>
        wif tape
      </span>
    </span>
  );
}
