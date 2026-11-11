"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { appChain } from "@/lib/chain";
import { CONFIG, LIVE } from "@/lib/config";

/**
 * Shows a banner when a wallet is connected but sitting on a different chain than the app's. Signing from the wrong chain is the most
 * common reason a wallet's "Failed to simulate" warning appears: the contract does not exist on the chain the wallet is on.
 */
export default function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [msg, setMsg] = useState<string>();

  if (!LIVE || !isConnected || chainId === appChain.id) return null;

  async function fix() {
    setMsg(undefined);
    try {
      await switchChainAsync({ chainId: appChain.id });
    } catch {
      setMsg(`Your wallet did not switch. Open its network list and choose ${CONFIG.chainName} (chain ${appChain.id}). Some wallets only show testnets when Testnet Mode is on.`);
    }
  }

  return (
    <div role="alert" className="fixed inset-x-0 top-[68px] z-40 flex justify-center px-3 sm:top-[76px]">
      <div className="glass glass-ember flex max-w-[780px] flex-wrap items-center gap-x-4 gap-y-2 !rounded-2xl px-4 py-3 text-[13px]">
        <span>
          Your wallet is on chain <b className="font-mono">{chainId}</b>. WIF Tape runs on {CONFIG.chainName} (chain <b className="font-mono">{appChain.id}</b>).
        </span>
        <button onClick={fix} disabled={isPending} className="btn-ember !px-4 !py-1.5 !text-[12px]">
          {isPending ? "Switching…" : "Switch network"}
        </button>
        {msg && <span className="basis-full text-[12px] text-ink/75">{msg}</span>}
      </div>
    </div>
  );
}
