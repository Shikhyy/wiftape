import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Shell from "@/components/Shell";

// Inter Tight is the closest free match to the Crater wordmark's clean grotesk. Instrument Serif is for
// landing headlines (the blink.capital serif role), JetBrains Mono for captions and numbers.
// All three are variable or single-weight faces, which load reliably through next/font.
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "WIF Tape — call the close, burn the rest",
  description:
    "A daily Stock Token prediction market played in $WIF. Every round burns $WIF. Streaks keep you coming back. Settled by Chainlink on Robinhood Chain.",
};

export const viewport: Viewport = { themeColor: "#060505" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: wallet extensions (Phantom, MetaMask...) add data-* attributes to <html> before React hydrates,
    // which triggers a harmless "Extra attributes from the server" warning. This silences only that one element.
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
