/**
 * GET /api/analytics/fcr?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Live First Contact Resolution metric.
 *
 * This route proxies to the Python backend's /api/analytics/fcr (where the SQL
 * runs against Postgres), and applies a 5-minute Next.js fetch cache keyed on
 * the (from, to) tuple via tags. A second request for the same window inside
 * the window hits the cache and returns instantly.
 *
 * Auth: validates the user is signed in via Clerk. The DASHBOARD_API_KEY for
 *       the upstream is injected server-side — never exposed to the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

import type { FCRResponse } from "@/lib/types/analytics";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";

const CACHE_TTL_SECONDS = 300; // 5 minutes — matches spec
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  // Auth — dashboard pages are Clerk-protected; this route should only be
  // hit by authenticated browsers. Reject anonymous calls outright.
  const user = await currentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both `from` and `to` query params are required (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!ISO_DATE_RE.test(from) || !ISO_DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "Dates must be in YYYY-MM-DD format." },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: "`from` must be on or before `to`." },
      { status: 400 },
    );
  }

  const upstreamUrl = `${BACKEND}/api/analytics/fcr?from=${from}&to=${to}`;
  const cacheTag = `fcr:${from}:${to}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { "X-API-Key": API_KEY },
      // Native Next caching keyed by URL — same (from, to) within 5 min reuses
      next: { revalidate: CACHE_TTL_SECONDS, tags: [cacheTag] },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err) },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Upstream ${upstream.status}`, detail },
      { status: upstream.status },
    );
  }

  const data = (await upstream.json()) as FCRResponse;
  return NextResponse.json(data);
}
