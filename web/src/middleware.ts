import { NextResponse, type NextRequest } from "next/server";
import { isRestricted } from "@/lib/restricted";

/**
 * Blocks visitors in restricted jurisdictions, using the country header your host adds
 * (Vercel: x-vercel-ip-country, Cloudflare: cf-ipcountry). With no header (for example local dev,
 * or a host that does not add one) nothing is blocked.
 *
 * To test locally, set GEO_TEST_COUNTRY=US in .env.local and restart. This override is ignored in production.
 *
 * Limits, stated plainly: IP location can be wrong and can be bypassed with a VPN. This is one layer.
 * The other is the eligibility confirmation in the stake panel. See docs/07-SUBMISSION-CHECKLIST.md.
 */
export function middleware(req: NextRequest) {
  const override = process.env.NODE_ENV !== "production" ? process.env.GEO_TEST_COUNTRY : undefined;
  const country = override || req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || undefined;

  if (!isRestricted(country)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not available in your region." }, { status: 451 });
  }
  return NextResponse.rewrite(new URL("/restricted", req.url), { status: 451 });
}

export const config = {
  // Everything except static assets and the block page itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|restricted).*)"],
};
