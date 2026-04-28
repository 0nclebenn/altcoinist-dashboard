"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Role, AgentMember, Invite } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManageTeamProps {
  currentRole: Role;
  currentAgent: AgentMember | null;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-700",
  "bg-blue-700",
  "bg-emerald-700",
  "bg-amber-700",
  "bg-rose-700",
  "bg-sky-700",
  "bg-pink-700",
  "bg-teal-700",
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ member }: { member: AgentMember }) {
  const initial = (member.display_name ?? member.username).charAt(0).toUpperCase();
  if (member.avatar) {
    return (
      <img
        src={member.avatar}
        alt={member.username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${avatarColor(member.username)}`}
    >
      {initial}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role | "ownership_transfer" }) {
  const styles: Record<string, string> = {
    super_admin: "bg-violet-900 text-violet-200 border border-violet-700",
    admin: "bg-blue-900 text-blue-200 border border-blue-700",
    moderator: "bg-gray-700 text-gray-200 border border-gray-600",
    ownership_transfer: "bg-amber-900 text-amber-200 border border-amber-700",
  };
  const labels: Record<string, string> = {
    super_admin: "Owner",
    admin: "Admin",
    moderator: "Moderator",
    ownership_transfer: "Ownership Transfer",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[role] ?? styles.moderator}`}>
      {labels[role] ?? role}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-800 last:border-0 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 bg-gray-700 rounded" />
        <div className="h-3 w-48 bg-gray-800 rounded" />
      </div>
      <div className="h-3 w-16 bg-gray-700 rounded" />
    </div>
  );
}

// ─── Inline form card ─────────────────────────────────────────────────────────

function FormCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManageTeam({ currentRole, currentAgent }: ManageTeamProps) {
  const { refetchAgents } = useRole();

  // Data state
  const [members, setMembers] = useState<AgentMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(false);

  // UI state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "moderator">("moderator");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailDelivered, setInviteEmailDelivered] = useState<boolean | null>(null);

  // Transfer ownership form state
  const [transferEmail, setTransferEmail] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  // Role update in-flight tracking
  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({});
  const [roleError, setRoleError] = useState<Record<string, string>>({});

  // Cancel invite in-flight tracking
  const [cancelingInvite, setCancelingInvite] = useState<Record<string, boolean>>({});

  // Delete in-flight tracking
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(false);
    try {
      const data = await api.agents();
      setMembers(data.agents ?? []);
    } catch {
      setMembersError(true);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await api.listInvites();
      setInvites((data.invites ?? data ?? []).filter((i: Invite) => i.status === "pending"));
    } catch {
      // Backend may not have this endpoint yet — silent fail
      setInvites([]);
    }
  }, []);

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchMembers(), fetchInvites()]);
    await refetchAgents();
  }, [fetchMembers, fetchInvites, refetchAgents]);

  useEffect(() => {
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  // ── Invite submit ──────────────────────────────────────────────────────────

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    setInviteLink("");
    setInviteEmailDelivered(null);
    try {
      const res: any = await api.sendInvite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteSuccess(`Invitation created for ${inviteEmail.trim()}`);
      setInviteLink(res?.invite_link ?? "");
      setInviteEmailDelivered(res?.email_sent ?? null);
      setInviteEmail("");
      setInviteRole("moderator");
      await fetchInvites();
    } catch (err: any) {
      setInviteError(err?.message ?? "Failed to send invite. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  function resetInviteForm() {
    setShowInviteForm(false);
    setInviteEmail("");
    setInviteRole("moderator");
    setInviteError("");
    setInviteSuccess("");
    setInviteLink("");
    setInviteEmailDelivered(null);
  }

  // ── Transfer ownership submit ──────────────────────────────────────────────

  async function handleTransferOwnership(e: React.FormEvent) {
    e.preventDefault();
    if (!transferEmail.trim()) return;
    setTransferLoading(true);
    setTransferError("");
    setTransferSuccess("");
    try {
      await api.transferOwnership(transferEmail.trim());
      setTransferSuccess(`Ownership transfer request sent to ${transferEmail.trim()}.`);
      setTransferEmail("");
      await fetchInvites();
    } catch (err: any) {
      setTransferError(err?.message ?? "Failed to send transfer request. Please try again.");
    } finally {
      setTransferLoading(false);
    }
  }

  function resetTransferForm() {
    setShowTransferForm(false);
    setTransferEmail("");
    setTransferError("");
    setTransferSuccess("");
  }

  // ── Role change ────────────────────────────────────────────────────────────

  async function handleRoleChange(username: string, newRole: Role) {
    setRoleUpdating((prev) => ({ ...prev, [username]: true }));
    setRoleError((prev) => ({ ...prev, [username]: "" }));
    try {
      await api.updateAgentRole(username, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.username === username ? { ...m, role: newRole } : m))
      );
      await refetchAgents();
    } catch {
      setRoleError((prev) => ({ ...prev, [username]: "Failed to update role." }));
    } finally {
      setRoleUpdating((prev) => ({ ...prev, [username]: false }));
    }
  }

  // ── Delete member ─────────────────────────────────────────────────────────

  async function handleDeleteMember(username: string) {
    if (!window.confirm(`Remove @${username} from the team?`)) return;
    setDeleting((prev) => ({ ...prev, [username]: true }));
    try {
      await api.removeAgent(username);
      setMembers((prev) => prev.filter((m) => m.username !== username));
      await refetchAgents();
    } catch {
      // Silently ignore — member stays in list
    } finally {
      setDeleting((prev) => ({ ...prev, [username]: false }));
    }
  }

  // ── Cancel invite ─────────────────────────────────────────────────────────

  async function handleCancelInvite(invite: Invite) {
    setCancelingInvite((prev) => ({ ...prev, [invite.id]: true }));
    try {
      if (invite.type === "ownership_transfer") {
        await api.cancelOwnershipTransfer(invite.id);
      } else {
        await api.cancelInvite(invite.id);
      }
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch {
      // Keep in list on error
    } finally {
      setCancelingInvite((prev) => ({ ...prev, [invite.id]: false }));
    }
  }

  // ── Permission helpers ─────────────────────────────────────────────────────

  function canEditMember(target: AgentMember): boolean {
    if (currentRole === "super_admin") {
      // Can edit everyone except themselves (they get Transfer Ownership instead)
      return target.username !== currentAgent?.username;
    }
    if (currentRole === "admin") {
      // Can edit admins and moderators, but NOT super_admin and NOT themselves
      return target.role !== "super_admin" && target.username !== currentAgent?.username;
    }
    return false;
  }

  function isSelf(target: AgentMember): boolean {
    return target.username === currentAgent?.username;
  }

  function isOwnSuperAdmin(target: AgentMember): boolean {
    return currentRole === "super_admin" && isSelf(target);
  }

  // Admins who can receive an ownership transfer (existing admins, not self)
  const eligibleAdmins = members.filter(
    (m) => m.role === "admin" && m.username !== currentAgent?.username
  );

  // Only show pending invites (not ownership transfers mixed together for clarity)
  const pendingInvites = invites.filter((i) => i.type === "invite");
  const pendingTransfers = invites.filter((i) => i.type === "ownership_transfer");
  const hasPendingItems = invites.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Team</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage your support team members and their roles.
          </p>
        </div>
        {(currentRole === "super_admin" || currentRole === "admin") && (
          <button
            onClick={() => {
              setShowInviteForm((v) => !v);
              setShowTransferForm(false);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Invite People
          </button>
        )}
      </div>

      {/* ── Invite form ── */}
      {showInviteForm && (
        <FormCard>
          <h3 className="text-sm font-semibold text-white mb-4">Invite a team member</h3>
          <form onSubmit={handleSendInvite} className="space-y-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "moderator")}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
            {inviteError && (
              <p className="text-xs text-red-400">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-xs text-emerald-400">{inviteSuccess}</p>
            )}
            {inviteLink && (
              <div className="mt-2 p-3 bg-gray-800 border border-gray-700 rounded-md space-y-2">
                {inviteEmailDelivered === false && (
                  <p className="text-xs text-amber-400">
                    Email could not be delivered automatically. Copy the link below and share it directly:
                  </p>
                )}
                {inviteEmailDelivered === true && (
                  <p className="text-xs text-gray-400">
                    Email sent. You can also share this link directly:
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 font-mono"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {inviteLoading ? "Sending…" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={resetInviteForm}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </FormCard>
      )}

      {/* ── Transfer Ownership form (super_admin only) ── */}
      {showTransferForm && currentRole === "super_admin" && (
        <FormCard className="border-amber-800">
          <h3 className="text-sm font-semibold text-white mb-1">Transfer Workspace Ownership</h3>
          <p className="text-xs text-gray-400 mb-4">
            The new owner will receive an email to accept or decline. Once accepted, you will become an Admin.
          </p>
          <form onSubmit={handleTransferOwnership} className="space-y-3">
            {eligibleAdmins.length > 0 ? (
              <select
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select an admin to transfer to…</option>
                {eligibleAdmins.map((a) => (
                  <option key={a.username} value={a.email ?? a.username}>
                    {a.display_name ?? a.username}
                    {a.email ? ` (${a.email})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="email"
                required
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="Admin's email address"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-gray-500"
              />
            )}
            {eligibleAdmins.length === 0 && (
              <p className="text-xs text-gray-500">
                No admins found. Enter an email manually — they must already be a team admin.
              </p>
            )}
            {transferError && (
              <p className="text-xs text-red-400">{transferError}</p>
            )}
            {transferSuccess && (
              <p className="text-xs text-emerald-400">{transferSuccess}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={transferLoading || !transferEmail.trim()}
                className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {transferLoading ? "Sending…" : "Send Transfer Request"}
              </button>
              <button
                type="button"
                onClick={resetTransferForm}
                className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-700 hover:border-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </FormCard>
      )}

      {/* ── Active members ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Active members
        </h3>
        <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
          {membersLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : membersError ? (
            <p className="px-4 py-6 text-sm text-red-400">Failed to load team members.</p>
          ) : members.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No team members yet.</p>
          ) : (
            members.map((member) => {
              const isEditable = canEditMember(member);
              const isMeSuperAdmin = isOwnSuperAdmin(member);
              const updatingRole = roleUpdating[member.username] ?? false;
              const roleErr = roleError[member.username] ?? "";
              const isDeleting = deleting[member.username] ?? false;

              return (
                <div
                  key={member.username}
                  className="flex items-center gap-3 border-b border-gray-800 last:border-0 px-4 py-4"
                >
                  {/* Avatar */}
                  <Avatar member={member} />

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">
                        {member.display_name ?? `@${member.username}`}
                      </span>
                      <RoleBadge role={member.role} />
                      {isSelf(member) && (
                        <span className="text-xs text-gray-500">(you)</span>
                      )}
                    </div>
                    {member.email && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{member.email}</p>
                    )}
                    {roleErr && (
                      <p className="text-xs text-red-400 mt-0.5">{roleErr}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Super admin's own row: Transfer Ownership button */}
                    {isMeSuperAdmin && (
                      <button
                        onClick={() => {
                          setShowTransferForm((v) => !v);
                          setShowInviteForm(false);
                        }}
                        className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md px-2 py-1 transition-colors"
                      >
                        Transfer Ownership
                      </button>
                    )}

                    {/* Editable member: role dropdown */}
                    {isEditable && member.role !== "super_admin" && (
                      <select
                        value={member.role}
                        disabled={updatingRole}
                        onChange={(e) => handleRoleChange(member.username, e.target.value as Role)}
                        className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    )}

                    {/* Editable member: delete button — never on owner */}
                    {isEditable && member.role !== "super_admin" && (
                      <button
                        onClick={() => handleDeleteMember(member.username)}
                        disabled={isDeleting}
                        className="text-red-400 hover:text-red-300 text-xs disabled:opacity-40 transition-colors"
                      >
                        {isDeleting ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Pending invites ── */}
      {hasPendingItems && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Invites pending
          </h3>
          <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
            {[...pendingInvites, ...pendingTransfers].map((invite) => {
              const isCanceling = cancelingInvite[invite.id] ?? false;
              const isTransfer = invite.type === "ownership_transfer";

              return (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 border-b border-gray-800 last:border-0 px-4 py-4"
                >
                  {/* Initials avatar for invitee */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${avatarColor(invite.email)}`}
                  >
                    {invite.email.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{invite.email}</span>
                      {isTransfer ? (
                        <RoleBadge role="ownership_transfer" />
                      ) : (
                        <RoleBadge role={invite.role} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isTransfer ? "Requested by" : "Invited by"}: {invite.invited_by}
                      {invite.created_at && (
                        <span className="ml-2">
                          &middot;{" "}
                          {new Date(invite.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Cancel (super_admin only) */}
                  {currentRole === "super_admin" && (
                    <button
                      onClick={() => handleCancelInvite(invite)}
                      disabled={isCanceling}
                      className="text-gray-400 hover:text-red-400 text-xs disabled:opacity-40 transition-colors flex-shrink-0"
                    >
                      {isCanceling ? "Canceling…" : "Cancel"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
