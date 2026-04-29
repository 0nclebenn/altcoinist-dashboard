"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SignUp, useUser } from "@clerk/nextjs";

type InviteInfo = {
  email: string;
  role: "admin" | "moderator";
  expires_at: string;
  clerk_ticket_url?: string | null;
};

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clerkTicket = searchParams?.get("__clerk_ticket") ?? null;
  const { user, isLoaded: userLoaded } = useUser();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Post-auth state
  const [telegramUsername, setTelegramUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-redirect unauthenticated visitors with no ticket query to Clerk's
  // invitation URL. Eliminates the manual "Continue to sign up" click.
  useEffect(() => {
    if (!userLoaded) return;
    if (user) return;
    if (clerkTicket) return; // already on the SignUp branch
    if (!invite?.clerk_ticket_url) return;
    window.location.href = invite.clerk_ticket_url;
  }, [userLoaded, user, clerkTicket, invite?.clerk_ticket_url]);

  // 1. Validate the token
  useEffect(() => {
    if (!params?.token) return;
    (async () => {
      try {
        const res = await fetch(`/api/proxy/api/invites/by-token/${params.token}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || "Invitation is invalid or expired.");
        } else {
          const data: InviteInfo = await res.json();
          setInvite(data);
        }
      } catch (e) {
        setError("Could not load invitation.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.token]);

  // 2. After Clerk auth, prompt for Telegram username & accept
  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!telegramUsername.trim()) {
      setError("Please enter your Telegram username.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/api/invites/by-token/${params.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_username: telegramUsername.trim().replace(/^@/, "") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Could not accept invitation.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/tickets"), 1500);
    } catch (e) {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
        <p>Loading invitation…</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Invitation unavailable</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold text-white mb-2">You're in! 🎉</h1>
          <p className="text-gray-400">Redirecting to the dashboard…</p>
        </div>
      </div>
    );
  }

  // 3a. Not authenticated.
  // Clerk's invitation URL is `/invite/[token]?__clerk_ticket=xyz` — visiting
  // it lands us back here, but with the ticket as a query param. When the
  // ticket is present, render <SignUp> which auto-detects it and bypasses
  // Restricted mode. When it's absent, auto-redirect to the stored Clerk
  // ticket URL (no manual button click needed).
  if (userLoaded && !user) {
    if (clerkTicket) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-gray-300 p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full mb-6 text-center">
            <h1 className="text-xl font-semibold text-white mb-2">
              You've been invited to Altcoinist Support
            </h1>
            <p className="text-gray-400">
              Create your account with <strong className="text-white">{invite.email}</strong> to
              join as <strong className="text-white">{invite.role}</strong>.
            </p>
          </div>
          <SignUp
            forceRedirectUrl={`/invite/${params.token}`}
            signInForceRedirectUrl={`/invite/${params.token}`}
          />
        </div>
      );
    }

    if (!invite.clerk_ticket_url) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300 p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
            <h1 className="text-xl font-semibold text-white mb-2">Invitation incomplete</h1>
            <p className="text-gray-400 mb-2">
              This invitation is missing its sign-up ticket. Ask the admin to cancel and resend it.
            </p>
          </div>
        </div>
      );
    }

    // The redirect is fired by the useEffect at the top of the component.
    // This UI is what the user briefly sees before the navigation happens,
    // plus a manual fallback link if the auto-redirect is blocked.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-gray-300 p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-2">
            You've been invited to Altcoinist Support
          </h1>
          <p className="text-gray-400 mb-4">
            Joining as <strong className="text-white">{invite.role}</strong> with{" "}
            <strong className="text-white">{invite.email}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-4">Redirecting to sign-up…</p>
          <a
            href={invite.clerk_ticket_url}
            className="text-violet-400 hover:text-violet-300 text-xs underline"
          >
            Click here if it doesn't redirect automatically
          </a>
        </div>
      </div>
    );
  }

  // 3b. Authenticated but with a different email → block & ask to sign out
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  if (userEmail && userEmail !== invite.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300 p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Wrong account</h1>
          <p className="text-gray-400 mb-4">
            This invitation is for <strong className="text-white">{invite.email}</strong>, but you're
            signed in as <strong className="text-white">{userEmail}</strong>.
          </p>
          <p className="text-gray-500 text-sm">
            Sign out and reopen this link with the correct account.
          </p>
        </div>
      </div>
    );
  }

  // 3c. Authenticated with the correct email → ask for Telegram username
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300 p-6">
      <form
        onSubmit={handleAccept}
        className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full"
      >
        <h1 className="text-xl font-semibold text-white mb-2">Almost done</h1>
        <p className="text-gray-400 mb-4 text-sm">
          You're joining as <strong className="text-white">{invite.role}</strong>. Enter your Telegram
          username so the support bot can recognize your replies in the support group.
        </p>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Telegram username
        </label>
        <input
          type="text"
          value={telegramUsername}
          onChange={(e) => setTelegramUsername(e.target.value)}
          placeholder="@yourhandle"
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 mb-3 focus:outline-none focus:border-violet-500"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 text-white font-medium px-4 py-2 rounded transition"
        >
          {submitting ? "Joining…" : "Accept invitation"}
        </button>
      </form>
    </div>
  );
}
