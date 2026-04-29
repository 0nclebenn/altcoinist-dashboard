"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ imageUrl, initials }: { imageUrl?: string; initials: string }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt="Profile avatar"
        onError={() => setImgError(true)}
        className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-700"
      />
    );
  }

  return (
    <div className="h-20 w-20 rounded-full bg-blue-900 ring-2 ring-gray-700 flex items-center justify-center flex-shrink-0">
      <span className="text-xl font-semibold text-blue-200 select-none">
        {initials}
      </span>
    </div>
  );
}

// ── Verified Badge ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 border border-green-700/50 px-2 py-0.5 text-xs font-medium text-green-400">
      <svg
        className="h-3 w-3"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2 6l3 3 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-white mb-4">{children}</h2>
  );
}

// ── Small action button ──────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  children,
  variant = "default",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        variant === "primary"
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ProfileResponse {
  agent: {
    email?: string;
    telegram_handle?: string;
    telegram_verified?: boolean;
    signature?: string | null;
  } | null;
}

export default function AccountProfile() {
  const { user, isLoaded } = useUser();

  // ── Telegram handle state (backed by agent.username on the support bot) ───
  const [tgValue, setTgValue] = useState("");
  const [tgDraft, setTgDraft] = useState("");
  const [tgEditing, setTgEditing] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgVerified, setTgVerified] = useState(false);
  const tgInputRef = useRef<HTMLInputElement>(null);

  // ── Signature state (backed by agent.signature on the support bot) ────────
  const [sigValue, setSigValue] = useState("");
  const [sigDraft, setSigDraft] = useState("");
  const [sigEditing, setSigEditing] = useState(false);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigSaved, setSigSaved] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const [profileLoaded, setProfileLoaded] = useState(false);

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    api.getProfile()
      .then((data) => {
        const agent = (data as ProfileResponse)?.agent;
        if (agent) {
          const handle = agent.telegram_handle ?? "";
          setTgValue(handle);
          setTgDraft(handle);
          setTgVerified(Boolean(agent.telegram_verified));

          const sig = agent.signature ?? "";
          setSigValue(sig);
          setSigDraft(sig);
        }
      })
      .catch(() => { /* user may not be an agent yet — leave defaults */ })
      .finally(() => setProfileLoaded(true));
  }, [user]);

  useEffect(() => { if (tgEditing)  tgInputRef.current?.focus();  }, [tgEditing]);
  useEffect(() => { if (sigEditing) sigInputRef.current?.focus(); }, [sigEditing]);

  // ── Telegram handle handlers ───────────────────────────────────────────────

  function handleTgEdit() {
    setTgDraft(tgValue);
    setTgError(null);
    setTgSaved(false);
    setTgEditing(true);
  }

  function handleTgCancel() {
    setTgEditing(false);
    setTgError(null);
    setTgDraft(tgValue);
  }

  async function handleTgSave() {
    const cleaned = tgDraft.trim().replace(/^@+/, "");
    if (!cleaned) { setTgError("Telegram handle cannot be empty."); return; }
    if (!/^[A-Za-z0-9_]{5,32}$/.test(cleaned)) {
      setTgError("Use 5–32 letters, numbers, or underscores (no @).");
      return;
    }

    setTgSaving(true);
    setTgError(null);
    try {
      const data = await api.updateProfile({ telegram_handle: cleaned }) as ProfileResponse;
      const newHandle = data.agent?.telegram_handle ?? cleaned;
      setTgValue(newHandle);
      setTgDraft(newHandle);
      setTgVerified(Boolean(data.agent?.telegram_verified));
      setTgEditing(false);
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save Telegram handle.";
      const friendly = message.includes("API error 409")
        ? "That Telegram handle is already taken by another team member."
        : message.includes("API error 403")
        ? "You're not a team member yet — accept your invite first."
        : message.includes("API error 400")
        ? "Invalid Telegram handle. Use 5–32 letters, numbers, or underscores."
        : message;
      setTgError(friendly);
    } finally {
      setTgSaving(false);
    }
  }

  // ── Signature handlers ─────────────────────────────────────────────────────

  function handleSigEdit() {
    setSigDraft(sigValue);
    setSigError(null);
    setSigSaved(false);
    setSigEditing(true);
  }

  function handleSigCancel() {
    setSigEditing(false);
    setSigError(null);
    setSigDraft(sigValue);
  }

  async function handleSigSave() {
    const cleaned = sigDraft.trim();
    if (cleaned.length > 0 && (cleaned.length < 2 || cleaned.length > 50)) {
      setSigError("Signature must be 2–50 characters.");
      return;
    }

    setSigSaving(true);
    setSigError(null);
    try {
      const data = await api.updateProfile({ signature: cleaned }) as ProfileResponse;
      const newSig = data.agent?.signature ?? "";
      setSigValue(newSig);
      setSigDraft(newSig);
      setSigEditing(false);
      setSigSaved(true);
      setTimeout(() => setSigSaved(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save signature.";
      const friendly = message.includes("API error 409")
        ? "Signature already exists. Choose a different one."
        : message.includes("API error 403")
        ? "You're not a team member yet — accept your invite first."
        : message.includes("API error 400")
        ? "Signature must be 2–50 characters."
        : message;
      setSigError(friendly);
    } finally {
      setSigSaving(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="max-w-2xl space-y-6">
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 rounded bg-gray-800" />
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-3 w-48 rounded bg-gray-800" />
                <div className="h-3 w-64 rounded bg-gray-800" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl">
        <Card>
          <p className="text-sm text-gray-400">No user session found. Please sign in.</p>
        </Card>
      </div>
    );
  }

  const displayName =
    user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? "?";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Account & Login ────────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Account &amp; Login</CardTitle>

        <div className="flex items-center gap-5 mb-6">
          <Avatar imageUrl={user.imageUrl} initials={initials} />
          <div>
            <p className="text-sm text-gray-300 font-medium">Profile photo</p>
            <p className="mt-0.5 text-xs text-gray-500">
              JPEG or PNG, square dimensions, maximum 2 MB.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="text-sm text-gray-400 flex-shrink-0 w-32">Email address</span>
            <div className="flex flex-1 items-center gap-2 justify-end">
              <span className="text-sm text-white truncate">{email}</span>
              <VerifiedBadge />
            </div>
          </div>

          {/* Telegram handle */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="text-sm text-gray-400 flex-shrink-0 w-32">Telegram handle</span>

            {tgEditing ? (
              <div className="flex flex-1 items-center gap-2 justify-end">
                <div className="flex flex-1 items-center min-w-0 rounded-lg border border-gray-700 bg-gray-950 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="pl-3 pr-1 text-sm text-gray-500 select-none">@</span>
                  <input
                    ref={tgInputRef}
                    type="text"
                    value={tgDraft}
                    onChange={(e) => setTgDraft(e.target.value.replace(/^@+/, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTgSave();
                      if (e.key === "Escape") handleTgCancel();
                    }}
                    placeholder="your_handle"
                    className="flex-1 min-w-0 bg-transparent py-1.5 pr-3 text-sm text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <ActionButton onClick={handleTgSave} disabled={tgSaving} variant="primary">
                  {tgSaving ? "Saving…" : "Save"}
                </ActionButton>
                <ActionButton onClick={handleTgCancel} disabled={tgSaving}>Cancel</ActionButton>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-2 justify-end">
                {tgSaved ? (
                  <span className="text-sm text-green-400">Saved!</span>
                ) : tgValue ? (
                  <>
                    <span className="text-sm text-white truncate">@{tgValue}</span>
                    {tgVerified && <VerifiedBadge />}
                  </>
                ) : (
                  <span className="text-sm text-gray-500 italic">
                    {profileLoaded ? "Not set" : "Loading…"}
                  </span>
                )}
                <ActionButton onClick={handleTgEdit} disabled={!profileLoaded}>Edit</ActionButton>
              </div>
            )}
          </div>

          {tgError && (
            <p className="text-xs text-red-400 text-right -mt-2">{tgError}</p>
          )}
        </div>
      </Card>

      {/* ── Custom Signature ──────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Custom Signature</CardTitle>
        <p className="text-xs text-gray-500 mb-5">
          Shown to users when you reply to their tickets. They&apos;ll see
          &ldquo;Support team ({sigValue || "your_signature"}): …&rdquo; on every message you send.
          Must be unique across the team.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="text-sm text-gray-400 flex-shrink-0 w-32">Signature</span>

            {sigEditing ? (
              <div className="flex flex-1 items-center gap-2 justify-end">
                <input
                  ref={sigInputRef}
                  type="text"
                  value={sigDraft}
                  onChange={(e) => setSigDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSigSave();
                    if (e.key === "Escape") handleSigCancel();
                  }}
                  placeholder="e.g. 0ncleben"
                  maxLength={50}
                  className="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <ActionButton onClick={handleSigSave} disabled={sigSaving} variant="primary">
                  {sigSaving ? "Saving…" : "Save"}
                </ActionButton>
                <ActionButton onClick={handleSigCancel} disabled={sigSaving}>Cancel</ActionButton>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-2 justify-end">
                {sigSaved ? (
                  <span className="text-sm text-green-400">Saved!</span>
                ) : sigValue ? (
                  <span className="text-sm text-white truncate">{sigValue}</span>
                ) : (
                  <span className="text-sm text-gray-500 italic">
                    {profileLoaded ? "Not set" : "Loading…"}
                  </span>
                )}
                <ActionButton onClick={handleSigEdit} disabled={!profileLoaded}>Edit</ActionButton>
              </div>
            )}
          </div>

          {sigError && (
            <p className="text-xs text-red-400 text-right -mt-2">{sigError}</p>
          )}

          {sigValue && !sigEditing && (
            <p className="text-xs text-gray-500 mt-3">
              Preview: <span className="text-gray-300">💬 Support team ({sigValue}): &lt;your message&gt;</span>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
