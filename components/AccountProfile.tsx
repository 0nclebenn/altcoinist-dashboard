"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? "bg-blue-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ imageUrl, initials }: { imageUrl?: string; initials: string }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
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

export default function AccountProfile() {
  const { user, isLoaded } = useUser();

  // ── Username state ─────────────────────────────────────────────────────────
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [usernameValue, setUsernameValue] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // ── Telegram handle state (backed by agent.username on the support bot) ───
  const [tgValue, setTgValue] = useState("");           // saved value from backend
  const [tgDraft, setTgDraft] = useState("");           // current input
  const [tgEditing, setTgEditing] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgVerified, setTgVerified] = useState(false);
  const [tgLoaded, setTgLoaded] = useState(false);
  const tgInputRef = useRef<HTMLInputElement>(null);

  // ── Signature state ────────────────────────────────────────────────────────
  const [sigEnabled, setSigEnabled] = useState(false);
  const [sigEditing, setSigEditing] = useState(false);
  const [sigValue, setSigValue] = useState("");
  const [sigDraft, setSigDraft] = useState("");
  const [sigSaved, setSigSaved] = useState(false);
  const sigTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load from Clerk + localStorage + backend on mount ──────────────────────
  useEffect(() => {
    if (!user) return;

    setUsernameValue(user.username ?? "");

    const storedSig = localStorage.getItem(`altcoinist_signature_${user.id}`) ?? "";
    const storedEnabled =
      localStorage.getItem(`altcoinist_signature_enabled_${user.id}`) === "true";

    setSigValue(storedSig);
    setSigDraft(storedSig);
    setSigEnabled(storedEnabled);

    // Fetch agent profile (telegram handle) from the support-bot backend
    api.getProfile()
      .then((data: { agent: { telegram_handle?: string; telegram_verified?: boolean } | null }) => {
        const handle = data?.agent?.telegram_handle ?? "";
        setTgValue(handle);
        setTgDraft(handle);
        setTgVerified(Boolean(data?.agent?.telegram_verified));
      })
      .catch(() => {
        // If the user isn't yet an agent, the endpoint returns {agent: null}.
        // apiFetch only throws on non-2xx, so failure here means the proxy or
        // backend is unreachable — fall back to empty state.
      })
      .finally(() => setTgLoaded(true));
  }, [user]);

  // Auto-focus username input when editing starts
  useEffect(() => {
    if (usernameEditing) {
      usernameInputRef.current?.focus();
    }
  }, [usernameEditing]);

  // Auto-focus signature textarea when editing starts
  useEffect(() => {
    if (sigEditing) {
      sigTextareaRef.current?.focus();
    }
  }, [sigEditing]);

  // Auto-focus telegram input when editing starts
  useEffect(() => {
    if (tgEditing) {
      tgInputRef.current?.focus();
    }
  }, [tgEditing]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleUsernameEdit() {
    setUsernameValue(user?.username ?? "");
    setUsernameError(null);
    setUsernameSuccess(false);
    setUsernameEditing(true);
  }

  function handleUsernameCancel() {
    setUsernameEditing(false);
    setUsernameError(null);
  }

  async function handleUsernameSave() {
    if (!user) return;
    setUsernameSaving(true);
    setUsernameError(null);
    setUsernameSuccess(false);
    try {
      await user.update({ username: usernameValue.trim() });
      setUsernameEditing(false);
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update username.";
      setUsernameError(message);
    } finally {
      setUsernameSaving(false);
    }
  }

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
    if (!cleaned) {
      setTgError("Telegram handle cannot be empty.");
      return;
    }
    if (!/^[A-Za-z0-9_]{5,32}$/.test(cleaned)) {
      setTgError("Use 5–32 letters, numbers, or underscores (no @).");
      return;
    }

    setTgSaving(true);
    setTgError(null);
    try {
      const data = await api.updateProfile({ telegram_handle: cleaned }) as {
        agent: { telegram_handle: string; telegram_verified: boolean };
      };
      const newHandle = data.agent.telegram_handle ?? cleaned;
      setTgValue(newHandle);
      setTgDraft(newHandle);
      setTgVerified(Boolean(data.agent.telegram_verified));
      setTgEditing(false);
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save Telegram handle.";
      // Try to extract a friendlier message if the API response had detail
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

  function handleSigToggle(v: boolean) {
    setSigEnabled(v);
    if (user) {
      localStorage.setItem(`altcoinist_signature_enabled_${user.id}`, String(v));
    }
  }

  function handleSigEdit() {
    setSigDraft(sigValue);
    setSigEditing(true);
    setSigSaved(false);
  }

  function handleSigSave() {
    if (!user) return;
    setSigValue(sigDraft);
    localStorage.setItem(`altcoinist_signature_${user.id}`, sigDraft);
    setSigEditing(false);
    setSigSaved(true);
    setTimeout(() => setSigSaved(false), 3000);
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

  // ── Derive initials ────────────────────────────────────────────────────────
  const displayName =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "?";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const currentUsername = user.username ?? null;
  const email = user.primaryEmailAddress?.emailAddress ?? "";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Account & Login ───────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Account &amp; Login</CardTitle>

        {/* Avatar + upload hint */}
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
          {/* ── Username row ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="text-sm text-gray-400 flex-shrink-0 w-32">Username</span>

            {usernameEditing ? (
              <div className="flex flex-1 items-center gap-2 justify-end">
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={usernameValue}
                  onChange={(e) => setUsernameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUsernameSave();
                    if (e.key === "Escape") handleUsernameCancel();
                  }}
                  placeholder="Enter username"
                  className="flex-1 min-w-0 rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <ActionButton
                  onClick={handleUsernameSave}
                  disabled={usernameSaving}
                  variant="primary"
                >
                  {usernameSaving ? "Saving…" : "Save"}
                </ActionButton>
                <ActionButton onClick={handleUsernameCancel} disabled={usernameSaving}>
                  Cancel
                </ActionButton>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-3 justify-end">
                <span className="text-sm text-white truncate">
                  {usernameSuccess ? (
                    <span className="text-green-400">Saved!</span>
                  ) : (
                    currentUsername ?? (
                      <span className="text-gray-500 italic">Not set</span>
                    )
                  )}
                </span>
                <ActionButton onClick={handleUsernameEdit}>Edit</ActionButton>
              </div>
            )}
          </div>

          {/* Username error */}
          {usernameError && (
            <p className="text-xs text-red-400 text-right -mt-2">{usernameError}</p>
          )}

          {/* ── Email row ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="text-sm text-gray-400 flex-shrink-0 w-32">Email address</span>
            <div className="flex flex-1 items-center gap-2 justify-end">
              <span className="text-sm text-white truncate">{email}</span>
              <VerifiedBadge />
            </div>
          </div>

          {/* ── Telegram handle row ───────────────────────────────────────── */}
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
                <ActionButton
                  onClick={handleTgSave}
                  disabled={tgSaving}
                  variant="primary"
                >
                  {tgSaving ? "Saving…" : "Save"}
                </ActionButton>
                <ActionButton onClick={handleTgCancel} disabled={tgSaving}>
                  Cancel
                </ActionButton>
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
                    {tgLoaded ? "Not set" : "Loading…"}
                  </span>
                )}
                <ActionButton onClick={handleTgEdit} disabled={!tgLoaded}>Edit</ActionButton>
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
        <div className="flex items-start justify-between gap-4 mb-1">
          <CardTitle>Custom Signature</CardTitle>
          <ToggleSwitch enabled={sigEnabled} onChange={handleSigToggle} />
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Enabling custom signatures helps users identify who they&apos;re speaking with.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-400">Signature</span>
            {!sigEditing && (
              <div className="flex items-center gap-2">
                {sigSaved && (
                  <span className="text-xs text-green-400">Saved!</span>
                )}
                <ActionButton onClick={handleSigEdit}>Edit</ActionButton>
              </div>
            )}
          </div>

          {sigEditing ? (
            <>
              <textarea
                ref={sigTextareaRef}
                rows={2}
                value={sigDraft}
                onChange={(e) => setSigDraft(e.target.value)}
                placeholder="e.g. Ben — Altcoinist Support"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end">
                <ActionButton variant="primary" onClick={handleSigSave}>
                  Save
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setSigEditing(false);
                    setSigDraft(sigValue);
                  }}
                >
                  Cancel
                </ActionButton>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 min-h-[56px]">
              {sigValue ? (
                <p className="text-sm text-white whitespace-pre-wrap">{sigValue}</p>
              ) : (
                <p className="text-sm text-gray-600 italic">No signature set</p>
              )}
            </div>
          )}

          <p className="text-xs text-orange-400">
            This is how your signature will appear in messages
          </p>
        </div>
      </Card>
    </div>
  );
}
