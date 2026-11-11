"use client";

/**
 * Mechanical counter in frosted glass: each digit is a glass tile with a 0-9 reel that rolls to its value.
 * Size comes from the parent's font-size, because everything is in em.
 */
function Digit({ d }: { d: number }) {
  return (
    <span
      className="relative inline-block h-[1.18em] w-[0.7em] overflow-hidden rounded-[0.16em] border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),inset_0_-14px_20px_-14px_rgb(0_0_0/0.6)] backdrop-blur-xl"
    >
      <span className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[1100ms] ease-[cubic-bezier(.2,.8,.2,1)]" style={{ transform: `translateY(${-d * 10}%)` }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex h-[1.18em] items-center justify-center font-medium tracking-[-0.04em]" style={{ lineHeight: "1.18em" }}>
            {i}
          </span>
        ))}
      </span>
      {/* glass sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent" />
    </span>
  );
}

export default function Odometer({ value, className = "" }: { value: number; className?: string }) {
  const str = Math.round(Math.max(0, value)).toLocaleString("en-US");
  const chars = str.split("");
  return (
    <div className={`flex items-end gap-[0.05em] ${className}`} role="img" aria-label={str}>
      {chars.map((ch, i) => {
        // Key by position from the right so existing digits keep rolling when a new digit is added on the left.
        const key = chars.length - i;
        return /\d/.test(ch) ? <Digit key={key} d={Number(ch)} /> : <span key={key} className="px-[0.03em] pb-[0.1em] leading-none text-ink/50">,</span>;
      })}
    </div>
  );
}
