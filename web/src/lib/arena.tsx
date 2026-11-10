"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { parseUnits, zeroAddress, type Address, type PublicClient } from "viem";
import { appChain } from "./chain";
import { CONFIG, LIVE } from "./config";
import { applyClaim, applyEnter, BURN_PCT, demoActive, demoResults, MIN_STAKE, seedDemo, stepDemo, validateEnter, type DemoState } from "./demo";
import { liveStatus, readLive, type LiveData } from "./live";
import { erc20Abi, SIDE, tapeAbi } from "./tapeAbi";
import type { ArenaState, PlayerView, RoundView, Side, StatsView } from "./types";

const EMPTY_PLAYER: PlayerView = { streak: 0, bestStreak: 0, shields: 0, wins: 0, played: 0, balance: 0, allowance: 0 };
const EMPTY_STATS: StatsView = { totalBurned: 0, totalStaked: 0, roundsSettled: 0, uniquePlayers: 0, burnSeries: [] };

const Ctx = createContext<ArenaState | null>(null);

export function useArena(): ArenaState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useArena must be used inside <ArenaProvider>");
  return c;
}

const nowSec = () => Math.floor(Date.now() / 1000);

function friendly(e: unknown): string {
  const m = e as { shortMessage?: string; message?: string };
  return m?.shortMessage ?? m?.message ?? "Something went wrong.";
}

function getRef(): Address {
  try {
    const v = localStorage.getItem("wiftape_ref");
    return v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : zeroAddress;
  } catch {
    return zeroAddress;
  }
}

/** Keeps round statuses moving between polls by recomputing them from the clock. */
function withClock(rounds: RoundView[], now: number): RoundView[] {
  return rounds.map((r) => (r.status === "settled" || r.status === "void" ? r : { ...r, status: liveStatus(1, r.lockTime, r.endTime, now) }));
}

export function ArenaProvider({ children }: { children: ReactNode }) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [now, setNow] = useState(nowSec);
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const demoRef = useRef<DemoState | null>(null);
  const hist = useRef<Record<number, number[]>>({}); // live mode: price history per round id
  demoRef.current = demo;

  // One clock for the whole app.
  useEffect(() => {
    const t = setInterval(() => setNow(nowSec()), 1000);
    return () => clearInterval(t);
  }, []);

  // Remember a referrer from ?ref=0x... so the first entry can credit them.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^0x[0-9a-fA-F]{40}$/.test(ref)) localStorage.setItem("wiftape_ref", ref);
    } catch {
      /* storage may be blocked; referrals just won't be remembered */
    }
  }, []);

  // Demo mode: seed once on the client (Math.random must not run during SSR), then step every second.
  useEffect(() => {
    if (!LIVE) setDemo(seedDemo(nowSec()));
  }, []);
  useEffect(() => {
    if (!LIVE) setDemo((d) => (d ? stepDemo(d, now) : d));
  }, [now]);

  // Live mode: poll the contract.
  const refresh = useCallback(async () => {
    if (!LIVE || !client) return;
    try {
      const data = await readLive(client as PublicClient, address, nowSec());
      // The contract only exposes the latest price, so build each round's chart by remembering every poll's price.
      data.active = data.active.map((r) => {
        const next = [...(hist.current[r.id] ?? [r.openPrice]), r.price].slice(-80);
        hist.current[r.id] = next;
        return { ...r, spark: next };
      });
      setLive(data);
    } catch (e) {
      setError(`Could not read the contract: ${friendly(e)}`);
    }
  }, [client, address]);

  useEffect(() => {
    if (!LIVE) return;
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  /**
   * Make sure the wallet is on the app's chain before any transaction. Without this, a wallet left on another chain (for example
   * mainnet while the contracts are on testnet) is asked to sign a call to an address with no contract there, and its simulation fails.
   */
  const ensureChain = useCallback(async (): Promise<boolean> => {
    if (chainId === appChain.id) return true;
    try {
      await switchChainAsync({ chainId: appChain.id });
      return true;
    } catch {
      setError(`Switch your wallet to ${CONFIG.chainName} (chain ${appChain.id}) to continue. Some wallets only show testnets when Testnet Mode is on.`);
      return false;
    }
  }, [chainId, switchChainAsync]);

  const enter = useCallback(
    async (roundId: number, side: Side, amount: number) => {
      setError(undefined);
      if (!LIVE) {
        const d = demoRef.current;
        if (!d) return;
        const problem = validateEnter(d, roundId, side, amount, nowSec());
        if (problem) return setError(problem);
        setDemo((cur) => (cur ? applyEnter(cur, roundId, side, amount) : cur));
        return;
      }
      if (!client || !address) return setError("Connect a wallet first.");
      if (!(await ensureChain())) return;
      setBusy(true);
      try {
        const amt = parseUnits(String(amount), CONFIG.wifDecimals);
        const wif = CONFIG.wif as Address;
        const tape = CONFIG.tape as Address;
        const allowance = await client.readContract({ address: wif, abi: erc20Abi, functionName: "allowance", args: [address, tape] });
        if (allowance < amt) {
          const approveHash = await writeContractAsync({ address: wif, abi: erc20Abi, functionName: "approve", args: [tape, amt], chainId: appChain.id });
          await client.waitForTransactionReceipt({ hash: approveHash });
        }
        const hash = await writeContractAsync({
          address: tape,
          abi: tapeAbi,
          functionName: "enter",
          args: [BigInt(roundId), side === "up" ? SIDE.Up : SIDE.Down, amt, getRef()],
          chainId: appChain.id,
        });
        await client.waitForTransactionReceipt({ hash });
        await refresh();
      } catch (e) {
        setError(friendly(e));
      } finally {
        setBusy(false);
      }
    },
    [client, address, writeContractAsync, refresh, ensureChain],
  );

  const claim = useCallback(
    async (roundId: number) => {
      setError(undefined);
      if (!LIVE) {
        setDemo((cur) => (cur ? applyClaim(cur, roundId) : cur));
        return;
      }
      if (!client || !address) return setError("Connect a wallet first.");
      if (!(await ensureChain())) return;
      setBusy(true);
      try {
        const hash = await writeContractAsync({ address: CONFIG.tape as Address, abi: tapeAbi, functionName: "claim", args: [BigInt(roundId)], chainId: appChain.id });
        await client.waitForTransactionReceipt({ hash });
        await refresh();
      } catch (e) {
        setError(friendly(e));
      } finally {
        setBusy(false);
      }
    },
    [client, address, writeContractAsync, refresh, ensureChain],
  );

  const clearError = useCallback(() => setError(undefined), []);

  const state: ArenaState = useMemo(() => {
    if (LIVE) {
      return {
        mode: "live",
        ready: Boolean(live),
        now,
        active: live ? withClock(live.active, now) : [],
        results: live?.results ?? [],
        player: live?.player ?? EMPTY_PLAYER,
        stats: live?.stats ?? EMPTY_STATS,
        minStake: live?.minStake ?? 1,
        burnPct: live?.burnPct ?? 0.1,
        busy,
        error,
        enter,
        claim,
        clearError,
      };
    }
    return {
      mode: "demo",
      ready: Boolean(demo),
      now,
      active: demo ? demoActive(demo) : [],
      results: demo ? demoResults(demo) : [],
      player: demo ? { ...demo.player, address } : EMPTY_PLAYER,
      stats: demo?.stats ?? EMPTY_STATS,
      minStake: MIN_STAKE,
      burnPct: BURN_PCT,
      busy,
      error,
      enter,
      claim,
      clearError,
    };
  }, [demo, live, now, busy, error, address, enter, claim, clearError]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
