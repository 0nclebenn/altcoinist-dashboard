/**
 * Team invite orchestrator.
 *
 * Why this exists:
 *   The bot's Clerk app is in Restricted sign-up mode — only emails on
 *   Clerk's allowlist can register. Our backend doesn't have the Clerk
 *   secret (and shouldn't need it). This route is the bridge:
 *
 *     1. Add the invitee's email to Clerk's allowlist (so they can sign up)
 *     2. Forward the invite request to the FastAPI backend (which writes
 *        the invitation row, sends Brevo email, returns the invite link)
 *
 *   Both calls happen server-side; the Clerk secret never leaves Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";
const CLERK_SECRET = process.env.CLERK_SECRET_KEY || "";

async function addToClerkAllowlist(email: string): Promise<{ ok: boolean; warning?: string }> {
  if (!CLERK_SECRET) {
    return { ok: false, warning: "CLERK_SECRET_KEY missing on the server" };
  }
  try {
    const res = await fetch("https://api.clerk.com/v1/allowlist_identifiers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier: email, notify: false }),
    });
    if (res.ok) return { ok: true };
    // 422 is Clerk's "duplicate / already exists" — that's fine, treat as success
    if (res.status === 422) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, warning: `Clerk allowlist returned ${res.status}: ${body.slice(0, 200)}` };
  } catch (e: any) {
    return { ok: false, warning: `Clerk allowlist exception: ${e?.message ?? "unknown"}` };
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.role) {
    return NextResponse.json({ detail: "email and role are required" }, { status: 400 });
  }
  const email = String(body.email).trim().toLowerCase();
  const role = String(body.role).trim();
  if (!["admin", "moderator"].includes(role)) {
    return NextResponse.json({ detail: "role must be 'admin' or 'moderator'" }, { status: 400 });
  }

  // Resolve the requesting user's email (Clerk-authenticated)
  let requesterEmail = "";
  try {
    const user = await currentUser();
    requesterEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  } catch {
    /* not signed in — backend will reject with 401 */
  }

  // 1. Add to Clerk allowlist
  const allowlistResult = await addToClerkAllowlist(email);

  // 2. Call backend /api/invites
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
  if (requesterEmail) headers["X-Requesting-Email"] = requesterEmail;

  const backendRes = await fetch(`${BACKEND}/api/invites`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({ email, role }),
  });

  const backendData = await backendRes.json().catch(() => ({}));

  // Merge allowlist warning into response if any
  const responseBody = {
    ...backendData,
    clerk_allowlisted: allowlistResult.ok,
    ...(allowlistResult.warning ? { clerk_warning: allowlistResult.warning } : {}),
  };

  return NextResponse.json(responseBody, { status: backendRes.status });
}
