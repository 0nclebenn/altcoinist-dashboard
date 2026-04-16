/**
 * Server-side proxy for all backend API calls.
 *
 * Why this exists:
 *   The bot backend runs over plain HTTP (http://164.92.152.59:8080).
 *   The dashboard is served over HTTPS. Browsers block cross-origin HTTP
 *   requests from HTTPS pages (mixed content). This proxy lets client
 *   components call /api/proxy/api/... over HTTPS, and this route forwards
 *   the request to the backend server-side where HTTP is fine.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const backendUrl = `${BACKEND}/${path.join("/")}`;

  const isBodyMethod = !["GET", "HEAD"].includes(request.method);
  const body = isBodyMethod ? await request.text() : undefined;

  const res = await fetch(backendUrl, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
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
