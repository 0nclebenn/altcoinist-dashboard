// Server components fetch directly; client components go through the proxy
// to avoid mixed content (HTTPS page → HTTP backend blocked by browsers).
const isClient = typeof window !== "undefined";
const DIRECT_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = isClient ? "/api/proxy" : DIRECT_BASE;
const KEY  = isClient ? "" : (process.env.API_KEY || "");

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      // Proxy route handles auth server-side; include key anyway for direct calls
      "Content-Type": "application/json",
      "X-API-Key": KEY,
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  if (res.status === 204) return;
  return res.json();
}

export type TicketView = {
  id: number;
  name: string;
  filters: Record<string, string>;
  position: number;
  created_at: string;
};

export type TicketFilters = {
  status?: string;
  priority?: string;
  resolution_type?: string;
  assigned_to?: string;
  tag?: string;
  page?: number;
  limit?: number;
};

export type Role = "super_admin" | "admin" | "moderator";

export interface AgentMember {
  id?: string;
  username: string;
  email?: string;
  display_name?: string;
  role: Role;
  avatar?: string;
}

export interface Invite {
  id: string;
  email: string;
  role: "admin" | "moderator";
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  type: "invite" | "ownership_transfer";
}

export const api = {
  stats:          (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return apiFetch(`/api/stats${qs ? `?${qs}` : ""}`);
  },
  tickets:        (filters: TicketFilters = {}) => {
    const q = new URLSearchParams();
    if (filters.status)          q.set("status",          filters.status);
    if (filters.priority)        q.set("priority",        filters.priority);
    if (filters.resolution_type) q.set("resolution_type", filters.resolution_type);
    if (filters.assigned_to)     q.set("assigned_to",     filters.assigned_to);
    if (filters.tag)         q.set("tag",         filters.tag);
    if (filters.page)        q.set("page",        String(filters.page));
    if (filters.limit)       q.set("limit",       String(filters.limit));
    const qs = q.toString();
    return apiFetch(`/api/tickets${qs ? `?${qs}` : ""}`);
  },
  ticket:         (id: number)               => apiFetch(`/api/tickets/${id}`),
  updateTicket:   (id: number, body: object) => apiFetch(`/api/tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  replyTicket:    (id: number, text: string) => apiFetch(`/api/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) }),
  scriptedReplies:()                         => apiFetch("/api/scripted-replies"),
  updateReply:    (id: number, body: object) => apiFetch(`/api/scripted-replies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  analytics:      (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return apiFetch(`/api/analytics${qs ? `?${qs}` : ""}`);
  },
  agents:           ()                         => apiFetch("/api/agents"),
  addAgent:         (body: object)             => apiFetch("/api/agents", { method: "POST", body: JSON.stringify(body) }),
  removeAgent:      (username: string)         => apiFetch(`/api/agents/${username}`, { method: "DELETE" }),
  kbSuggestions:    ()                         => apiFetch("/api/kb-suggestions"),
  approveSuggestion:(id: number)               => apiFetch(`/api/kb-suggestions/${id}/approve`, { method: "POST" }),
  rejectSuggestion: (id: number)               => apiFetch(`/api/kb-suggestions/${id}/reject`,  { method: "POST" }),
  runClustering:    ()                         => apiFetch("/api/admin/run-clustering", { method: "POST" }),
  ticketViews:      ()                         => apiFetch("/api/ticket-views") as Promise<TicketView[]>,
  createTicketView: (body: { name: string; filters: Record<string, string>; position?: number }) =>
    apiFetch("/api/ticket-views", { method: "POST", body: JSON.stringify(body) }) as Promise<TicketView>,
  updateTicketView: (id: number, body: { name?: string; filters?: Record<string, string>; position?: number }) =>
    apiFetch(`/api/ticket-views/${id}`, { method: "PUT", body: JSON.stringify(body) }) as Promise<TicketView>,
  deleteTicketView: (id: number) =>
    apiFetch(`/api/ticket-views/${id}`, { method: "DELETE" }),
  docUpdateSuggestions: ()         => apiFetch("/api/doc-update-suggestions"),
  approveDocUpdate:     (id: number) => apiFetch(`/api/doc-update-suggestions/${id}/approve`, { method: "POST" }),
  rejectDocUpdate:      (id: number) => apiFetch(`/api/doc-update-suggestions/${id}/reject`,  { method: "POST" }),
  buttonSuggestions:    ()           => apiFetch("/api/button-suggestions"),
  approveButton:        (id: number) => apiFetch(`/api/button-suggestions/${id}/approve`, { method: "POST" }),
  rejectButton:         (id: number) => apiFetch(`/api/button-suggestions/${id}/reject`,  { method: "POST" }),
  runButtonAnalysis:    ()           => apiFetch("/api/admin/run-button-analysis", { method: "POST" }),
  flowTree:             ()           => apiFetch("/api/flow-tree"),

  // Profile — Clerk owns email + username. Backend owns telegram_handle (mapped to agent.username).
  // Signature is stored client-side in localStorage.
  getProfile: () => apiFetch("/api/profile"),
  updateProfile: (body: { telegram_handle?: string }) =>
    apiFetch("/api/profile", { method: "PUT", body: JSON.stringify(body) }),

  // Invites
  listInvites: () => apiFetch("/api/invites"),
  // sendInvite hits the orchestrator route (adds to Clerk allowlist + creates DB invitation + Brevo email)
  sendInvite: async (body: { email: string; role: "admin" | "moderator" }) => {
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail ?? `API error ${res.status}: /api/team/invite`);
    }
    if (res.status === 204) return;
    return res.json();
  },
  cancelInvite: (id: string) => apiFetch(`/api/invites/${id}`, { method: "DELETE" }),

  // Ownership transfer
  transferOwnership: (toEmail: string) =>
    apiFetch("/api/invites/transfer-ownership", { method: "POST", body: JSON.stringify({ email: toEmail }) }),
  cancelOwnershipTransfer: (id: string) =>
    apiFetch(`/api/invites/transfer-ownership/${id}`, { method: "DELETE" }),

  // Agent role management
  updateAgentRole: (username: string, role: Role) =>
    apiFetch(`/api/agents/${username}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
};
