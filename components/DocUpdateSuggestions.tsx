"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Suggestion {
  id: number;
  ticket_id: number;
  conversation_summary: string;
  suggested_addition: string;
  status: string;
  created_at: string;
}

interface Props {
  suggestions: Suggestion[];
}

export default function DocUpdateSuggestions({ suggestions: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  const handle = async (id: number, action: "approve" | "reject") => {
    setLoading(id);
    try {
      if (action === "approve") await api.approveDocUpdate(id);
      else await api.rejectDocUpdate(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Action failed. Try again.");
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">No pending doc updates.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <div key={s.id} className="card-base rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <span className="font-mono text-[10px] text-brand-400/60 mt-1 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/35 mb-2">
                  Ticket #{s.ticket_id}
                </p>
                <pre className="text-[13px] text-white/90 whitespace-pre-wrap font-body leading-relaxed">
                  {s.suggested_addition}
                </pre>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => handle(s.id, "approve")}
                disabled={loading === s.id}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider bg-brand-400 hover:bg-brand-300 text-black font-bold rounded-full disabled:opacity-40 transition-all"
              >
                {loading === s.id ? "…" : "Approve"}
              </button>
              <button
                onClick={() => handle(s.id, "reject")}
                disabled={loading === s.id}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border border-white/[0.08] hover:border-red-400/30 text-white/55 hover:text-red-400 rounded-full disabled:opacity-40 transition-all"
              >
                Reject
              </button>
            </div>
          </div>

          <button
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-brand-400 transition-colors"
          >
            {expanded === s.id ? "Hide conversation" : "Show conversation"}
          </button>

          {expanded === s.id && (
            <pre className="mt-3 text-[11px] text-white/55 whitespace-pre-wrap font-mono bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 max-h-48 overflow-y-auto">
              {s.conversation_summary}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
