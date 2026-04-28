/**
 * Server-side proxy for all backend API calls.
 *
 * Why this exists:
 *   The bot backend runs over plain HTTP (http://164.92.152.59:8080).
 *   The dashboard is served over HTTPS. Browsers block cross-origin HTTP
 *   requests from HTTPS pages (mixed content). This proxy lets client
 *   components call /api/proxy/api/... over HTTPS, and this route forwards
 *   the request to the backend server-side where HTTP is fine.
 *
 *   It also forwards the Clerk-authenticated user's email as
 *   X-Requesting-Email so the backend can apply role-based permissions
 *   (e.g. only super_admin/admin can invite, only super_admin can transfer).
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const search = request.nextUrl.search;
  const backendUrl = `${BACKEND}/${path.join("/")}${search}`;

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const body = isBodyMethod ? await request.text() : undefined;

  // Resolve the requesting user's email from Clerk (if signed in)
  let requesterEmail = "";
  try {
    const user = await currentUser();
    requesterEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  } catch {
    // Public endpoints (e.g. accept-invite by token) may be hit pre-auth — ignore
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
  if (requesterEmail) {
    headers["X-Requesting-Email"] = requesterEmail;
  }

  const res = await fetch(backendUrl, {
    method: request.method,
    headers,
    cache: "no-store",
    ...(body ? { body } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
  handle as PUT,
};
