import Link from "next/link";
import { CONFIG, explorerAddress } from "@/lib/config";

export default function Footer({ landing = false }: { landing?: boolean }) {
  return (
    <footer className={`relative mx-auto max-w-[1400px] px-4 pt-16 sm:px-8 ${landing ? "pb-28" : "pb-32"}`}>
      <div className="grid gap-8 border-t border-white/10 pt-8 md:grid-cols-[1.6fr_1fr]">
        <p className="max-w-3xl font-mono text-[10.5px] uppercase leading-[1.7] tracking-[0.06em] text-ink/45">
          WIF Tape is a game of skill. $WIF is used to stake and is partly burned every round. $WIF comes with no promise of value or return. Nothing here is financial
          advice. You must be 18 or older. Not available to US persons, or in Canada, the UK, Switzerland or any sanctioned jurisdiction. WIF Tape is not affiliated
          with, endorsed by, or connected to Robinhood Markets, Inc.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/60 md:justify-end">
          <Link className="hover:text-ink" href="/arena">Dashboard</Link>
          <Link className="hover:text-ink" href="/trade">Trade</Link>
          <Link className="hover:text-ink" href="/analysts">Signals</Link>
          <Link className="hover:text-ink" href="/burn">Burn</Link>
          <a className="hover:text-ink" href={CONFIG.voteUrl} target="_blank" rel="noreferrer">Vote ↗</a>
          {CONFIG.tape && <a className="hover:text-ink" href={explorerAddress(CONFIG.tape)} target="_blank" rel="noreferrer">Contract ↗</a>}
        </div>
      </div>
      <p className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/30">© WIF Tape 2026</p>
    </footer>
  );
}
