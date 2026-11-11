import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Shareable result card: /api/card?symbol=NVDA&side=up&result=win&streak=3&burned=120&move=0.84
 * Same language as the app: black, burnt-orange light, frosted glass chips, green for UP and red for DOWN.
 * Text only, no user data beyond the query values. Uses the default font (no custom font is bundled in the edge route).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const symbol = (q.get("symbol") || "NVDA").replace(/[^A-Z.]/g, "").slice(0, 8) || "NVDA";
  const side = q.get("side") === "down" ? "DOWN" : "UP";
  const result = q.get("result") === "loss" ? "loss" : q.get("result") === "void" ? "void" : "win";
  const streak = Math.max(0, Math.min(99, Number(q.get("streak")) || 0));
  const burned = Math.max(0, Number(q.get("burned")) || 0);
  const move = Number(q.get("move")) || 0;

  const headline = result === "win" ? "Called it." : result === "loss" ? "Missed the close." : "Round voided.";
  const accent = result === "win" ? "#60E09A" : result === "loss" ? "#FF5E4C" : "#F3EBE3";

  const chip = (text: string) => (
    <div style={{ display: "flex", padding: "14px 26px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", fontSize: 28, color: "#F3EBE3" }}>{text}</div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          color: "#F3EBE3",
          // Satori (the image renderer) only supports a single radius here: "circle at X Y", not "900px 560px at X Y".
          background: "radial-gradient(circle at 8% -10%, rgba(255,99,33,0.75), rgba(150,40,10,0.35) 45%, #060505 75%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>wif tape</div>
          <div style={{ display: "flex", fontSize: 28, color: "rgba(243,235,227,0.7)" }}>
            {symbol} · called {side} · {move >= 0 ? "+" : ""}
            {move.toFixed(2)}%
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 128, lineHeight: 1.02, letterSpacing: -4, color: accent }}>{headline}</div>
        <div style={{ display: "flex", gap: 20 }}>
          {chip(`${streak}-win streak`)}
          {chip(`${Math.round(burned)} $WIF burned`)}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
