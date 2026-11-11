/**
 * Fixed full-screen light behind everything, shared by every page: a burnt-orange glow from the top-left, a rust glow top-right,
 * deep teal rising from the bottom, two thin glowing light arcs, and film grain (the Crater reference).
 *
 * The same layers are always mounted. `variant` only changes their intensity, and the change is animated, so moving between the
 * landing page (quiet, because the hero orb is the main light) and the app (full strength) is a slow crossfade, not a swap.
 */
export default function Backdrop({ variant = "app" }: { variant?: "app" | "landing" }) {
  const quiet = variant === "landing";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="absolute inset-0" style={{ opacity: quiet ? 0.32 : 1, transition: "opacity 1.4s ease" }}>
        <div
          className="absolute -left-[18%] -top-[38%] h-[95vh] w-[95vw] animate-drift will-change-transform rounded-full blur-[80px]"
          style={{ background: "radial-gradient(closest-side, rgb(255 99 33 / 0.8), rgb(150 40 10 / 0.38) 55%, transparent 78%)" }}
        />
        <div
          className="absolute -right-[22%] -top-[28%] h-[70vh] w-[70vw] animate-drift2 will-change-transform rounded-full blur-[90px]"
          style={{ background: "radial-gradient(closest-side, rgb(190 60 20 / 0.42), transparent 75%)" }}
        />
        <div
          className="absolute -bottom-[48%] left-[0%] h-[85vh] w-[110vw] animate-drift2 will-change-transform rounded-full blur-[110px]"
          style={{ background: "radial-gradient(closest-side, rgb(30 66 78 / 0.95), rgb(14 36 44 / 0.55) 60%, transparent 80%)" }}
        />
        {/* glowing light arcs */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="arc1" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="rgb(255 99 33)" stopOpacity="0" />
              <stop offset="0.55" stopColor="rgb(255 140 70)" stopOpacity="0.9" />
              <stop offset="1" stopColor="rgb(255 235 220)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="arc2" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="rgb(255 99 33)" stopOpacity="0" />
              <stop offset="0.6" stopColor="rgb(255 120 50)" stopOpacity="0.75" />
              <stop offset="1" stopColor="rgb(255 170 100)" stopOpacity="0.9" />
            </linearGradient>
            <filter id="blur8"><feGaussianBlur stdDeviation="9" /></filter>
          </defs>
          {/* static on purpose: animating an SVG group that contains blur filters repaints the whole layer every frame */}
          <g>
            <path d="M -80 470 C 260 300 760 110 1160 -60" stroke="url(#arc1)" strokeWidth="14" fill="none" filter="url(#blur8)" opacity="0.7" />
            <path d="M -80 470 C 260 300 760 110 1160 -60" stroke="url(#arc1)" strokeWidth="1.6" fill="none" />
            <path d="M -120 960 C 360 760 980 660 1560 690" stroke="url(#arc2)" strokeWidth="12" fill="none" filter="url(#blur8)" opacity="0.6" />
            <path d="M -120 960 C 360 760 980 660 1560 690" stroke="url(#arc2)" strokeWidth="1.4" fill="none" />
          </g>
        </svg>
      </div>
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.2 -0.1'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
