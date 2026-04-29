/**
 * Team invite orchestrator.
 *
 * Why this exists:
 *   The bot's Clerk app is in Restricted sign-up mode — only invited
 *   users can register. Clerk's *Invitations* API generates a one-time
 *   ticket that bypasses Restricted (allowlist alone doesn't on free tier).
 *
 *   Flow per invite:
 *     1. Generate our own token (used in Brevo email link → /invite/[token])
 *     2. Call POST https://api.clerk.com/v1/invitations to create a Clerk
 *        invitation. notify=false (we send our own branded Brevo email).
 *        redirect_url points back to /invite/[token] so after Clerk sign-up
 *        the user lands on our page to enter their Telegram username.
 *     3. Capture the Clerk URL (which contains __clerk_ticket=...).
 *     4. Call FastAPI POST /api/invites with {email, role, token,
 *        clerk_ticket_url, clerk_invitation_id} — backend persists, sends
 *        Brevo email with our /invite/[token] link, returns invite_link.
 *
 *   The Clerk secret never leaves Vercel. The bot droplet doesn't need it.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";
const CLERK_SECRET = process.env.CLERK_SECRET_KEY || "";

function generateToken(): string {
  // 32 bytes → 43 base64url chars, matches Python secrets.token_urlsafe(32) length range
  return randomBytes(32).toString("base64url");
}

function getDashboardOrigin(request: NextRequest): string {
  // Prefer the request's own origin so dev/preview/production all work
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

type ClerkInvite = {
  ok: boolean;
  ticket_url?: string;
  invitation_id?: string;
  warning?: string;
};

/**
 * Defensive cleanup: if a Clerk user already exists for this email (an "orphan"
 * left behind by a previous removal that didn't fully scrub Clerk, or by an
 * abandoned partial sign-up), delete it. Without this, re-inviting that email
 * lands the invitee on Clerk's "an account already exists, sign in instead"
 * page — which then loops because the (now removed) user has no agents row,
 * so RoleContext bounces them to /not-on-team forever.
 *
 * Safe because the FastAPI POST /api/invites endpoint upstream rejects with
 * 409 if the email is already an active team member, so by the time we get
 * here we know any existing Clerk user with this email is an orphan.
 */
async function deleteOrphanClerkUser(email: string): Promise<{ deleted: boolean; warning?: string }> {
  if (!CLERK_SECRET) return { deleted: false, warning: "CLERK_SECRET_KEY missing" };
  try {
    const lookupUrl = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`;
    const lookupRes = await fetch(lookupUrl, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    });
    if (!lookupRes.ok) {
      return { deleted: false, warning: `Clerk user lookup ${lookupRes.status}` };
    }
    const users = await lookupRes.json().catch(() => []);
    if (!Array.isArray(users) || users.length === 0) {
      return { deleted: false }; // no orphan — nothing to do
    }
    const userId = users[0]?.id;
    if (!userId) return { deleted: false, warning: "Clerk user lookup returned no id" };
    const delRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    });
    if (!delRes.ok) {
      const body = await delRes.text().catch(() => "");
      return { deleted: false, warning: `Clerk user delete ${delRes.status}: ${body.slice(0, 150)}` };
    }
    return { deleted: true };
  } catch (e: any) {
    return { deleted: false, warning: `Clerk orphan cleanup exception: ${e?.message ?? "unknown"}` };
  }
}

async function createClerkInvitation(
  email: string,
  role: string,
  redirectUrl: string,
): Promise<ClerkInvite> {
  if (!CLERK_SECRET) {
    return { ok: false, warning: "CLERK_SECRET_KEY missing on the server" };
  }
  try {
    const res = await fetch("https://api.clerk.com/v1/invitations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        public_metadata: { role },
        redirect_url: redirectUrl,
        notify: false,
        ignore_existing: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        ok: true,
        ticket_url: data.url,
        invitation_id: data.id,
      };
    }
    return {
      ok: false,
      warning: `Clerk invitations returned ${res.status}: ${JSON.stringify(data).slice(0, 300)}`,
    };
  } catch (e: any) {
    return { ok: false, warning: `Clerk invitations exception: ${e?.message ?? "unknown"}` };
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

  // Resolve the requesting user's email (for backend permission check)
  let requesterEmail = "";
  try {
    const user = await currentUser();
    requesterEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  } catch {
    /* not signed in — backend will reject with 401 */
  }

  // 1. Pre-generate our token so the Clerk redirect_url can include it
  const token = generateToken();
  const dashboardOrigin = getDashboardOrigin(request);
  const redirectUrl = `${dashboardOrigin}/invite/${token}`;

  // 2. Defensive: clean up any orphan Clerk user with this email so the
  // Invitations API doesn't return "user already exists" on re-invites.
  const orphan = await deleteOrphanClerkUser(email);

  // 3. Create Clerk Invitation (this is what unlocks sign-up in Restricted mode)
  const clerk = await createClerkInvitation(email, role, redirectUrl);

  // 4. Forward to backend with everything pre-baked
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
  if (requesterEmail) headers["X-Requesting-Email"] = requesterEmail;

  const backendRes = await fetch(`${BACKEND}/api/invites`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      email,
      role,
      token,
      clerk_ticket_url: clerk.ticket_url,
      clerk_invitation_id: clerk.invitation_id,
    }),
  });

  const backendData = await backendRes.json().catch(() => ({}));

  const responseBody = {
    ...backendData,
    clerk_invited: clerk.ok,
    ...(clerk.warning ? { clerk_warning: clerk.warning } : {}),
    ...(orphan.deleted ? { clerk_orphan_cleaned: true } : {}),
    ...(orphan.warning ? { clerk_orphan_warning: orphan.warning } : {}),
  };

  return NextResponse.json(responseBody, { status: backendRes.status });
}
