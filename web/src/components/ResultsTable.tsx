import { fmtPct, fmtPrice, fmtWif } from "@/lib/format";
import type { RoundView } from "@/lib/types";
import { Badge } from "./ui";

/** Finished rounds as a trade history: symbol, open → close, move, result tag, burn. Newest first. */
export default function ResultsTable({ rows }: { rows: RoundView[] }) {
  if (!rows.length) return <p className="p-6 text-sm text-ink/50">No finished rounds yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/10 text-[11px] text-ink/45">
            <th className="px-5 py-3 font-normal">Market</th>
            <th className="px-3 py-3 font-normal">Open → close</th>
            <th className="px-3 py-3 font-normal">Move</th>
            <th className="px-3 py-3 font-normal">Result</th>
            <th className="px-5 py-3 text-right font-normal">Burned</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const move = r.openPrice ? ((r.closePrice - r.openPrice) / r.openPrice) * 100 : 0;
            return (
              <tr key={r.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3"><Badge symbol={r.symbol} size={28} /><span><b className="font-medium">{r.symbol}</b> <span className="text-ink/40">#{r.id}</span></span></span>
                </td>
                <td className="px-3 py-3 font-mono text-[12px] text-ink/60">{fmtPrice(r.openPrice)} → {fmtPrice(r.closePrice)}</td>
                <td className={`px-3 py-3 font-mono ${move >= 0 ? "text-up" : "text-down"}`}>{fmtPct(move)}</td>
                <td className="px-3 py-3">
                  {r.status === "void" ? <span className="tag tag-neutral">Void</span> : r.winner === "up" ? <span className="tag tag-up">▲ Up</span> : <span className="tag tag-down">▼ Down</span>}
                </td>
                <td className="px-5 py-3 text-right font-mono text-flame">{r.burned ? `−${fmtWif(r.burned)}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
