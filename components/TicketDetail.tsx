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
  open: "text-blue-400",
  escalated: "text-red-400",
  resolved: "text-green-400",
  pending: "text-yellow-400",
};

const RESOLUTION_BADGE: Record<string, string> = {
  ai:           "bg-blue-900/60 text-blue-400",
  scripted:     "bg-purple-900/60 text-purple-400",
  human:        "bg-green-900/60 text-green-400",
  auto_timeout: "bg-gray-800 text-gray-500",
};

const RESOLUTION_LABEL: Record<string, string> = {
  ai:           "AI resolved",
  scripted:     "Scripted reply",
  human:        "Human resolved",
  auto_timeout: "Timed out",
};

const CSAT_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  resolved: { icon: "✅", label: "Resolved",        color: "text-green-400" },
  partial:  { icon: "🔄", label: "Partially helped", color: "text-yellow-400" },
  no_help:  { icon: "❌", label: "Didn't help",      color: "text-red-400" },
};

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
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Ticket not found.
      </div>
    );
  }

  const { ticket, conversation, messages } = data;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white">
            #{ticket.id} — @{conversation.username ?? "unknown"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}
            <span className={STATUS_COLOR[ticket.status] ?? "text-gray-400"}>{ticket.status}</span>
            {ticket.priority === "high" && (
              <span className="ml-2 text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded">high priority</span>
            )}
            {ticket.resolution_type && RESOLUTION_BADGE[ticket.resolution_type] && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${RESOLUTION_BADGE[ticket.resolution_type]}`}>
                {RESOLUTION_LABEL[ticket.resolution_type]}
              </span>
            )}
            {ticket.csat_score && CSAT_DISPLAY[ticket.csat_score] && (
              <span className={`ml-2 text-[10px] ${CSAT_DISPLAY[ticket.csat_score].color}`}>
                {CSAT_DISPLAY[ticket.csat_score].icon} {CSAT_DISPLAY[ticket.csat_score].label}
              </span>
            )}
          </p>
        </div>
        <TicketActions
          ticketId={ticket.id}
          currentStatus={ticket.status}
          assignedTo={ticket.assigned_to}
          onSave={handleSave}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "agent" || msg.role === "bot" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "agent" || msg.role === "bot"
                  ? "bg-blue-900/60 text-gray-200"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Reply */}
      <div className="px-5 py-3 border-t border-gray-800 flex-shrink-0">
        <ReplyBox ticketId={ticket.id} onSent={load} />
      </div>
    </div>
  );
}
