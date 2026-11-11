"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CONFIG, LIVE } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { LogoMark } from "./Logo";
import { IconCandles, IconFlame, IconGrid, IconSignal } from "./ui";

const APP_ITEMS = [
  { href: "/arena", label: "Dashboard", icon: <IconGrid /> },
  { href: "/trade", label: "Trade", icon: <IconCandles /> },
  { href: "/analysts", label: "Signals", icon: <IconSignal /> },
  { href: "/burn", label: "Burn", icon: <IconFlame /> },
];

// The landing page's sections, shown in the same glass pill so the header looks identical on every page.
const SECTIONS = [
  ["home", "Home"],
  ["round", "The round"],
  ["engine", "Engine"],
  ["tape", "The tape"],
  ["trust", "Trust"],
] as const;

/** Which landing section is in view (drives the active pill). */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string>("home");
  useEffect(() => {
    if (!enabled) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return active;
}

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button onClick={() => disconnect()} className="btn-glass !px-3.5 !py-2 font-mono text-xs" title="Disconnect">
        <span className="h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_8px_rgb(var(--up))]" /> {shortAddr(address)}
      </button>
    );
  }
  return (
    <button onClick={() => connect({ connector: connectors[0] })} disabled={isPending || connectors.length === 0} className="btn-ember !py-2 text-[13px]">
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

const pillItem = (active: boolean) =>
  `flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] transition sm:px-4 ${
    active ? "border-white/15 bg-white/[0.13] text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]" : "border-transparent text-ink/60 hover:text-ink"
  }`;

/**
 * The one header for the whole site: dot-matrix logo on the left, a glass pill in the middle, an action on the right.
 * It stays mounted across navigation, so going from the landing page to the app only changes the pill's contents and the action.
 * Landing: the pill lists the page's sections and the action is "Enter app". App: the pill lists the pages and the action is the wallet.
 */
export default function Nav() {
  const path = usePathname();
  const landing = path === "/";
  const section = useActiveSection(landing);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="WIF Tape home">
          <LogoMark size={34} />
          <span className="hidden text-[21px] font-medium lowercase tracking-[-0.03em] sm:inline">wif tape</span>
        </Link>

        <nav aria-label={landing ? "Sections" : "Main"} className={`glass !rounded-full items-center gap-0.5 p-1 ${landing ? "hidden md:flex" : "flex"}`}>
          <div key={landing ? "landing" : "app"} className="flex items-center gap-0.5" style={{ animation: "fadein 0.5s ease both" }}>
            {landing
              ? SECTIONS.map(([id, label]) => (
                  <a key={id} href={`#${id}`} aria-current={section === id ? "location" : undefined} className={pillItem(section === id)}>
                    {label}
                  </a>
                ))
              : APP_ITEMS.map((it) => {
                  const active = path === it.href;
                  return (
                    <Link key={it.href} href={it.href} aria-label={it.label} aria-current={active ? "page" : undefined} className={pillItem(active)}>
                      {it.icon}
                      <span className={active ? "inline" : "hidden md:inline"}>{it.label}</span>
                    </Link>
                  );
                })}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          {landing ? (
            <Link href="/arena" className="btn-ember !py-2 text-[13px]">
              Enter app →
            </Link>
          ) : (
            <>
              {!LIVE && <span className="pill hidden lg:inline-flex"><span className="h-1.5 w-1.5 animate-blink rounded-full bg-ember" /> Demo data</span>}
              {LIVE && CONFIG.isTestnet && <span className="pill hidden border-ember/40 text-flame lg:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-up" /> Testnet · live</span>}
              <ConnectButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
