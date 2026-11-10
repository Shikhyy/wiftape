import type { Config } from "tailwindcss";

// Tokens live in src/app/globals.css as CSS variables; Tailwind maps them to utilities.
// Palette is taken from the Crater reference: black, burnt orange light arcs, deep teal, cream and peach dots.
// See docs/04-DESIGN-SYSTEM.md.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        flame: "rgb(var(--flame) / <alpha-value>)",
        rust: "rgb(var(--rust) / <alpha-value>)",
        peach: "rgb(var(--peach) / <alpha-value>)",
        teal: "rgb(var(--teal) / <alpha-value>)",
        iris: "rgb(var(--iris) / <alpha-value>)",
        up: "rgb(var(--up) / <alpha-value>)",
        down: "rgb(var(--down) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Keyframes are defined in globals.css so inline animations can use them too.
      animation: {
        spin_slow: "spin_slow 60s linear infinite",
        spin_rev: "spin_slow 90s linear infinite reverse",
        drift: "drift 22s ease-in-out infinite",
        drift2: "drift2 28s ease-in-out infinite",
        breathe: "breathe 9s ease-in-out infinite",
        floaty: "floaty 7s ease-in-out infinite",
        blink: "blink 1.4s steps(2, jump-none) infinite",
        pulse_ring: "pulse_ring 2.4s ease-out infinite",
        marquee: "marquee 60s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
