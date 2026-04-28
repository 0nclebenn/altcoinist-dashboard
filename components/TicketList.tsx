"use client";

import { useEffect, useState } from "react";
import { api, TicketView } from "@/lib/api";

interface Ticket {
  id: number;
  username: string | null;
  status: string;
  priority: string;
  tags: string[];
  resolution_type: string | null;
  csat_score: string | null;
  created_at: string;
}

interface Props {
  activeView: TicketView | null;
  activeTicketId: number | null;
  onSelect: (ticket: Ticket) => void;
  refreshSignal: number;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const STATUS_DOT: Record<string, string> = {
  open: "bg-blue-400",
  escalated: "bg-red-400",
  resolved: "bg-green-400",
  pending: "bg-yellow-400",
};

const RESOLUTION_BADGE: Record<string, string> = {
  ai:           "bg-blue-900/60 text-blue-400",
  scripted:     "bg-purple-900/60 text-purple-400",
  human:        "bg-green-900/60 text-green-400",
  auto_timeout: "bg-gray-800 text-gray-500",
};

const RESOLUTION_LABEL: Record<string, string> = {
  ai:           "AI",
  scripted:     "Scripted",
  human:        "Human",
  auto_timeout: "Timed out",
};

const CSAT_DISPLAY: Record<string, string> = {
  resolved: "✅",
  partial:  "🔄",
  no_help:  "❌",
};

export default function TicketList({ activeView, activeTicketId, onSelect, refreshSignal }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    if (!activeView) return;
    setLoading(true);
    api.tickets(activeView.filters)
      .then((data: any) => {
        setTickets(data.tickets ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeView, refreshSignal]);

  const sorted = [...tickets].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return sortOrder === "newest" ? diff : -diff;
  });

  if (!activeView) {
    return (
      <div className="w-72 flex-shrink-0 border-r border-gray-800 flex items-center justify-center text-gray-600 text-sm bg-gray-900/50">
        Select a view
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col h-full bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500 truncate">
          {activeView.name} · <span className="text-gray-400">{total} ticket{total !== 1 ? "s" : ""}</span>
        </p>
        <button
          onClick={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 border border-gray-700 hover:border-gray-500 rounded px-1.5 py-0.5"
          title={sortOrder === "newest" ? "Sorted: newest first" : "Sorted: oldest first"}
        >
          {sortOrder === "newest" ? (
            <>↓ Newest</>
          ) : (
            <>↑ Oldest</>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-4 py-3 text-xs text-gray-600">Loading…</p>}
        {!loading && tickets.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-600">No tickets in this view.</p>
        )}
        {sorted.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`w-full text-left px-4 py-3 border-b border-gray-800/60 transition-colors ${
              activeTicketId === t.id ? "bg-indigo-600/20" : "hover:bg-gray-800/60"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? "bg-gray-400"}`} />
                <span className="text-sm text-gray-200 font-medium truncate">
                  @{t.username ?? "unknown"}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{timeAgo(t.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-3.5 flex-wrap">
              {t.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {t.priority === "high" && (
                <span className="text-[9px] bg-red-900/60 text-red-400 px-1.5 py-0.5 rounded">high</span>
              )}
              {t.resolution_type && RESOLUTION_BADGE[t.resolution_type] && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${RESOLUTION_BADGE[t.resolution_type]}`}>
                  {RESOLUTION_LABEL[t.resolution_type]}
                </span>
              )}
              {t.csat_score && CSAT_DISPLAY[t.csat_score] && (
                <span className="text-[10px]">{CSAT_DISPLAY[t.csat_score]}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
