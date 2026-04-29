/**
 * Team agent removal orchestrator.
 *
 * Mirrors /api/team/invite. Deletes the agent from FastAPI first (which also
 * cancels any pending invitations for their email and returns the email back),
 * then deletes the corresponding Clerk user so they can't sign back in.
 *
 * Permission checks happen on the FastAPI side via X-Requesting-Email +
 * _require_role. The Clerk secret never leaves Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";
const CLERK_SECRET = process.env.CLERK_SECRET_KEY || "";

async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  if (!CLERK_SECRET) return null;
  try {
    const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteClerkUser(userId: string): Promise<{ ok: boolean; warning?: string }> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, warning: `Clerk user delete returned ${res.status}: ${body.slice(0, 200)}` };
  } catch (e: any) {
    return { ok: false, warning: `Clerk user delete exception: ${e?.message ?? "unknown"}` };
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ detail: "username is required" }, { status: 400 });
  }

  // Resolve requester email so backend permission check works
  let requesterEmail = "";
  try {
    const user = await currentUser();
    requesterEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  } catch {
    /* not signed in — backend will reject */
  }

  const headers: Record<string, string> = {
    "X-API-Key": API_KEY,
  };
  if (requesterEmail) headers["X-Requesting-Email"] = requesterEmail;

  // 1. Backend delete — also returns the deleted agent's email and cancels pending invites
  const backendRes = await fetch(`${BACKEND}/api/agents/${encodeURIComponent(username)}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  const backendData = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(backendData, { status: backendRes.status });
  }

  // 2. Delete Clerk user (best effort — backend deletion is the source of truth)
  let clerkDeleted = false;
  let clerkWarning: string | undefined;
  const email: string | undefined = backendData?.email;
  if (email) {
    const userId = await findClerkUserIdByEmail(email);
    if (userId) {
      const res = await deleteClerkUser(userId);
      clerkDeleted = res.ok;
      clerkWarning = res.warning;
    } else {
      clerkWarning = `No Clerk user found for ${email} — likely already gone.`;
    }
  } else {
    clerkWarning = "Backend did not return an email; Clerk user not deleted.";
  }

  return NextResponse.json(
    { ...backendData, clerk_deleted: clerkDeleted, ...(clerkWarning ? { clerk_warning: clerkWarning } : {}) },
    { status: 200 }
  );
}
