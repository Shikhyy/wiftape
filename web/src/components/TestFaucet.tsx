"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { appChain } from "@/lib/chain";
import { CONFIG } from "@/lib/config";
import { testWifAbi } from "@/lib/tapeAbi";

/** Testnet only: a one-click "Get 1,000 test $WIF" button, plus a network switch when the wallet is on the wrong chain. */
export default function TestFaucet() {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  if (!CONFIG.testFaucet || !CONFIG.wif || !isConnected) return null;

  const wrongChain = chainId !== appChain.id;

  async function run() {
    setMsg(undefined);
    setBusy(true);
    try {
      if (wrongChain) {
        await switchChainAsync({ chainId: appChain.id });
        return;
      }
      const hash = await writeContractAsync({ address: CONFIG.wif!, abi: testWifAbi, functionName: "faucet", chainId: appChain.id });
      await client?.waitForTransactionReceipt({ hash });
      setMsg("Sent 1,000 test $WIF to your wallet.");
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "";
      setMsg(m.includes("FAUCET_COOLDOWN") ? "The faucet allows one claim every 10 minutes." : m.split("\n")[0] || "Could not complete that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ember/30 bg-ember/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] leading-snug text-ink/75">{wrongChain ? "Your wallet is on another network." : "Testnet: free test tokens, no value."}</p>
        <button onClick={run} disabled={busy} className="btn-ember !px-3.5 !py-1.5 !text-[12px] whitespace-nowrap">
          {busy ? "Working…" : wrongChain ? "Switch network" : "Get 1,000 tWIF"}
        </button>
      </div>
      {msg && <p className="mt-2 text-[12px] text-ink/70">{msg}</p>}
    </div>
  );
}
