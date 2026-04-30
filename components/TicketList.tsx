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
  open: "bg-brand-400",
  escalated: "bg-red-400",
  resolved: "bg-brand-500",
  pending: "bg-[#E8B34B]",
};

const RESOLUTION_BADGE: Record<string, string> = {
  ai:           "border-brand-400/20 bg-brand-400/[0.06] text-brand-400",
  scripted:     "border-purple-400/20 bg-purple-400/[0.06] text-purple-300",
  human:        "border-brand-300/20 bg-brand-300/[0.06] text-brand-300",
  auto_timeout: "border-white/10 bg-white/[0.03] text-white/40",
};

const RESOLUTION_LABEL: Record<string, string> = {
  ai:           "AI",
  scripted:     "Scripted",
  human:        "Human",
  auto_timeout: "Timed out",
};

const CSAT_DISPLAY: Record<string, { glyph: string; color: string }> = {
  resolved: { glyph: "✓", color: "text-brand-400" },
  partial:  { glyph: "~", color: "text-[#E8B34B]" },
  no_help:  { glyph: "✕", color: "text-red-400" },
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
      <div className="w-72 flex-shrink-0 panel border-r border-white/[0.06] flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-white/30">
        Select a view
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 panel border-r border-white/[0.06] flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <p className="text-xs truncate flex items-center gap-2">
          <span className="text-white font-heading">{activeView.name}</span>
          <span className="text-white/30">·</span>
          <span className="font-mono text-[11px] text-brand-400/80">{total} ticket{total !== 1 ? "s" : ""}</span>
        </p>
        <button
          onClick={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/45 hover:text-brand-400 transition-all flex-shrink-0 border border-white/[0.08] hover:border-brand-400/30 rounded px-2 py-0.5"
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
        {loading && <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-white/30">Loading…</p>}
        {!loading && tickets.length === 0 && (
          <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-white/30">No tickets in this view.</p>
        )}
        {sorted.map((t) => {
          const isActive = activeTicketId === t.id;
          const csat = t.csat_score ? CSAT_DISPLAY[t.csat_score] : null;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-all ${
                isActive
                  ? "bg-brand-400/[0.05] border-l-2 border-l-brand-400"
                  : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? "bg-white/30"}`} />
                  <span className="text-[13px] text-white font-medium truncate font-heading">
                    @{t.username ?? "unknown"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/35 flex-shrink-0 ml-2">{timeAgo(t.created_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3.5 flex-wrap">
                {t.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[9px] uppercase tracking-wider text-white/55 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {t.priority === "high" && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-red-400 bg-red-400/[0.06] border border-red-400/20 px-1.5 py-0.5 rounded">
                    high
                  </span>
                )}
                {t.resolution_type && RESOLUTION_BADGE[t.resolution_type] && (
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${RESOLUTION_BADGE[t.resolution_type]}`}>
                    {RESOLUTION_LABEL[t.resolution_type]}
                  </span>
                )}
                {csat && (
                  <span className={`font-mono text-[11px] leading-none ${csat.color}`}>{csat.glyph}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
