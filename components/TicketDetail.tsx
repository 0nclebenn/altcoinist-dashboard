"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import ReplyBox from "@/components/ReplyBox";
import TicketActions from "@/components/TicketActions";

interface Message {
  id: number;
  role: string;
  content: string;
  message_type: string | null;
  created_at: string;
}

interface TicketData {
  ticket: {
    id: number;
    status: string;
    priority: string;
    category: string | null;
    tags: string[];
    assigned_to: string | null;
    resolution_type: string | null;
    resolution_summary: string | null;
    csat_score: string | null;
    created_at: string;
    resolved_at: string | null;
  };
  conversation: {
    id: number | null;
    username: string | null;
    chat_id: number | null;
    status: string | null;
  };
  messages: Message[];
}

interface Props {
  ticketId: number;
  onStatusChange?: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  open: "text-brand-400",
  escalated: "text-red-400",
  resolved: "text-brand-500",
  pending: "text-[#E8B34B]",
};

const RESOLUTION_BADGE: Record<string, string> = {
  ai:           "border-brand-400/20 bg-brand-400/[0.06] text-brand-400",
  scripted:     "border-purple-400/20 bg-purple-400/[0.06] text-purple-300",
  human:        "border-brand-300/20 bg-brand-300/[0.06] text-brand-300",
  auto_timeout: "border-white/10 bg-white/[0.03] text-white/40",
};

const RESOLUTION_LABEL: Record<string, string> = {
  ai:           "AI resolved",
  scripted:     "Scripted reply",
  human:        "Human resolved",
  auto_timeout: "Timed out",
};

const CSAT_DISPLAY: Record<string, { glyph: string; label: string; color: string }> = {
  resolved: { glyph: "✓", label: "Resolved",         color: "text-brand-400" },
  partial:  { glyph: "~", label: "Partially helped", color: "text-[#E8B34B]" },
  no_help:  { glyph: "✕", label: "Didn't help",      color: "text-red-400" },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TicketDetail({ ticketId, onStatusChange }: Props) {
  const [data, setData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.ticket(ticketId);
      setData(res as TicketData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = () => {
    load();
    onStatusChange?.();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-white/30">
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-white/30">
        Ticket not found.
      </div>
    );
  }

  const { ticket, conversation, messages } = data;
  const csat = ticket.csat_score ? CSAT_DISPLAY[ticket.csat_score] : null;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4 flex-shrink-0">
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/60">
            // ticket #{ticket.id}
          </span>
          <h2 className="font-heading text-lg font-semibold gradient-heading leading-tight mt-1">
            @{conversation.username ?? "unknown"}
          </h2>
          <div className="font-mono text-[11px] text-white/45 mt-2 flex items-center gap-2 flex-wrap">
            <span>
              {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-white/20">·</span>
            <span className={`uppercase tracking-wider ${STATUS_COLOR[ticket.status] ?? "text-white/40"}`}>
              {ticket.status}
            </span>
            {ticket.priority === "high" && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-red-400 bg-red-400/[0.06] border border-red-400/20 px-1.5 py-0.5 rounded">
                high priority
              </span>
            )}
            {ticket.resolution_type && RESOLUTION_BADGE[ticket.resolution_type] && (
              <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${RESOLUTION_BADGE[ticket.resolution_type]}`}>
                {RESOLUTION_LABEL[ticket.resolution_type]}
              </span>
            )}
            {csat && (
              <span className={`flex items-center gap-1 ${csat.color}`}>
                <span className="text-[13px] leading-none">{csat.glyph}</span>
                <span className="uppercase tracking-wider">{csat.label}</span>
              </span>
            )}
          </div>
        </div>
        <TicketActions
          ticketId={ticket.id}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          currentCategory={ticket.category}
          assignedTo={ticket.assigned_to}
          onSave={handleSave}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const fromAgent = msg.role === "agent" || msg.role === "bot";
          const caption =
            (fromAgent ? (msg.role === "bot" ? "bot" : "agent") : `@${conversation.username ?? "user"}`)
            + " · " + timeAgo(msg.created_at);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${fromAgent ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2.5 text-[13px] leading-relaxed ${
                  fromAgent
                    ? "bg-brand-400/[0.08] border border-brand-400/20 text-white rounded-2xl rounded-br-md"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/85 rounded-2xl rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-white/30 mt-1 px-1">
                {caption}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      <div className="px-6 py-4 border-t border-white/[0.06] flex-shrink-0">
        <ReplyBox ticketId={ticket.id} onSent={load} />
      </div>
    </div>
  );
}
