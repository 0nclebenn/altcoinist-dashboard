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
        className="h-20 w-20 rounded-full object-cover border-2 border-brand-400/30"
      />
    );
  }

  return (
    <div className="h-20 w-20 rounded-full bg-brand-400/10 border-2 border-brand-400/30 flex items-center justify-center flex-shrink-0">
      <span className="font-heading text-xl font-bold text-brand-400 select-none">
        {initials}
      </span>
    </div>
  );
}

// ── Verified Badge ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-400/[0.08] border border-brand-400/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-brand-400">
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

function Card({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
      {/* Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-4 w-7 h-7 rounded-md bg-brand-400 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity flex items-center justify-center text-black font-bold font-heading text-xs"
      >A</div>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-px w-6 bg-brand-400/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">{eyebrow}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-base font-semibold text-white mb-5">{children}</h2>
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
      className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        variant === "primary"
          ? "bg-brand-400 hover:bg-brand-300 text-black font-bold"
          : "border border-white/[0.08] text-white/55 hover:text-brand-400 hover:border-brand-400/30"
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

  // ── Profile photo state (Clerk-managed via user.setProfileImage) ──────────
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  // ── Profile photo handlers ────────────────────────────────────────────────

  const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

  function pickPhoto() {
    setPhotoError(null);
    photoInputRef.current?.click();
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected after an error
    if (e.target) e.target.value = "";
    if (!file || !user) return;

    if (!/^image\/(jpeg|png|jpg)$/i.test(file.type)) {
      setPhotoError("Please choose a JPEG or PNG image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(`Image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max is 2 MB.`);
      return;
    }

    setPhotoUploading(true);
    setPhotoError(null);
    try {
      await user.setProfileImage({ file });
      await user.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload photo.";
      setPhotoError(message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handlePhotoDelete() {
    if (!user) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove photo.";
      setPhotoError(message);
    } finally {
      setPhotoUploading(false);
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
            <div className="h-4 w-32 rounded bg-white/[0.04]" />
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-full bg-white/[0.04]" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-3 w-48 rounded bg-white/[0.04]" />
                <div className="h-3 w-64 rounded bg-white/[0.04]" />
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
          <p className="text-sm text-white/55">No user session found. Please sign in.</p>
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
      <Card eyebrow="// account">
        <CardTitle>Account &amp; Login</CardTitle>

        <div className="flex items-center gap-5 mb-6">
          <Avatar imageUrl={user.imageUrl} initials={initials} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/85 font-heading font-medium">Profile photo</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
              JPEG or PNG · max 2 MB
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <ActionButton onClick={pickPhoto} disabled={photoUploading} variant="primary">
                {photoUploading ? "Uploading…" : user.hasImage ? "Change" : "Upload"}
              </ActionButton>
              {user.hasImage && (
                <ActionButton onClick={handlePhotoDelete} disabled={photoUploading}>
                  Remove
                </ActionButton>
              )}
            </div>
            {photoError && (
              <p className="mt-2 text-xs text-red-400">{photoError}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 flex-shrink-0 w-32">Email address</span>
            <div className="flex flex-1 items-center gap-2 justify-end">
              <span className="text-sm text-white truncate">{email}</span>
              <VerifiedBadge />
            </div>
          </div>

          {/* Telegram handle */}
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 flex-shrink-0 w-32">Telegram handle</span>

            {tgEditing ? (
              <div className="flex flex-1 items-center gap-2 justify-end">
                <div className="flex flex-1 items-center min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] focus-within:border-brand-400/40">
                  <span className="pl-3 pr-1 text-sm text-white/40 select-none">@</span>
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
                    className="flex-1 min-w-0 bg-transparent py-1.5 pr-3 text-sm text-white placeholder-white/30 focus:outline-none"
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
                  <span className="font-mono text-[10px] uppercase tracking-wider text-brand-400">Saved!</span>
                ) : tgValue ? (
                  <>
                    <span className="text-sm text-white truncate">@{tgValue}</span>
                    {tgVerified && <VerifiedBadge />}
                  </>
                ) : (
                  <span className="text-sm text-white/40 italic">
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
      <Card eyebrow="// signature">
        <CardTitle>Custom Signature</CardTitle>
        <p className="text-xs text-white/55 mb-5 leading-relaxed">
          Shown to users when you reply to their tickets. They&apos;ll see
          &ldquo;Support team ({sigValue || "your_signature"}): …&rdquo; on every message you send.
          Must be unique across the team.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 min-h-[36px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 flex-shrink-0 w-32">Signature</span>

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
                  className="flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-sm text-white placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
                />
                <ActionButton onClick={handleSigSave} disabled={sigSaving} variant="primary">
                  {sigSaving ? "Saving…" : "Save"}
                </ActionButton>
                <ActionButton onClick={handleSigCancel} disabled={sigSaving}>Cancel</ActionButton>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-2 justify-end">
                {sigSaved ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-brand-400">Saved!</span>
                ) : sigValue ? (
                  <span className="text-sm text-white truncate">{sigValue}</span>
                ) : (
                  <span className="text-sm text-white/40 italic">
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
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/35 mt-3">
              Preview: <span className="text-white/70 normal-case tracking-normal">Support team ({sigValue}): &lt;your message&gt;</span>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
