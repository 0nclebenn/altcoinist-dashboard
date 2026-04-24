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

export const api = {
  stats:          ()                          => apiFetch("/api/stats"),
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
  analytics:      ()                         => apiFetch("/api/analytics"),
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
};
