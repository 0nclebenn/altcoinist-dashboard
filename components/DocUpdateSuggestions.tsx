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
    return <p className="text-gray-500 text-sm">No pending doc updates.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((s) => (
        <div key={s.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-2">Ticket #{s.ticket_id}</p>
              <pre className="text-sm text-white whitespace-pre-wrap font-sans leading-relaxed">
                {s.suggested_addition}
              </pre>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => handle(s.id, "approve")}
                disabled={loading === s.id}
                className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading === s.id ? "…" : "Approve"}
              </button>
              <button
                onClick={() => handle(s.id, "reject")}
                disabled={loading === s.id}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>

          <button
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded === s.id ? "Hide conversation" : "Show conversation"}
          </button>

          {expanded === s.id && (
            <pre className="mt-3 text-xs text-gray-400 whitespace-pre-wrap font-mono bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
              {s.conversation_summary}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
