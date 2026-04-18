"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Suggestion {
  id: number;
  parent_node: string;
  button_label: string;
  trigger_key: string;
  title: string;
  scripted_reply_content: string;
  occurrence_count: number;
  sample_queries: string | null;
  status: string;
  created_at: string;
}

interface Props {
  suggestions: Suggestion[];
  onRunAnalysis: () => void;
}

const PARENT_LABELS: Record<string, string> = {
  prob_altcoinist: "Altcoinist Bot → Problems",
  prob_gating: "Gating Bot → Problems",
  q_altcoinist: "Altcoinist Bot → Questions",
  q_gating: "Gating Bot → Questions",
};

export default function ButtonSuggestions({ suggestions: initial, onRunAnalysis }: Props) {
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const handle = async (id: number, action: "approve" | "reject") => {
    setLoading(id);
    try {
      if (action === "approve") await api.approveButton(id);
      else await api.rejectButton(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Action failed. Try again.");
    } finally {
      setLoading(null);
    }
  };

  const runAnalysis = async () => {
    setRunning(true);
    try {
      await api.runButtonAnalysis();
      onRunAnalysis();
    } catch {
      alert("Failed to trigger analysis.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {items.length === 0
            ? "No pending button suggestions."
            : `${items.length} pending — approve to add the button live to the bot.`}
        </p>
        <button
          onClick={runAnalysis}
          disabled={running}
          className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {running ? "Running…" : "Run analysis now"}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((s) => {
          const samples = (() => {
            try { return JSON.parse(s.sample_queries || "[]"); } catch { return []; }
          })();

          return (
            <div key={s.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">
                      {PARENT_LABELS[s.parent_node] ?? s.parent_node}
                    </span>
                    <span className="text-xs text-gray-500">{s.occurrence_count} occurrences</span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    Button: "{s.button_label}"
                  </p>
                  <p className="text-xs text-gray-500 mb-3">trigger: {s.trigger_key}</p>
                  <div className="bg-gray-800 rounded-lg p-3 mb-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Scripted reply</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{s.scripted_reply_content}</p>
                  </div>
                  {samples.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {expanded === s.id ? "Hide examples" : `Show ${samples.length} example queries`}
                    </button>
                  )}
                  {expanded === s.id && (
                    <ul className="mt-2 space-y-1">
                      {samples.map((q: string, i: number) => (
                        <li key={i} className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
                          "{q}"
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handle(s.id, "approve")}
                    disabled={loading === s.id}
                    className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {loading === s.id ? "…" : "Add button"}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
