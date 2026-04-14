const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const KEY  = process.env.NEXT_PUBLIC_API_KEY  || "";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": KEY,
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  stats:          ()                          => apiFetch("/api/stats"),
  tickets:        (params = "")              => apiFetch(`/api/tickets${params}`),
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
};
