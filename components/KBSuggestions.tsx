"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function KBSuggestions({ suggestions }: { suggestions: any[] }) {
  const [items, setItems] = useState(suggestions);
  const [loading, setLoading] = useState<number | null>(null);

  async function approve(id: number) {
    setLoading(id);
    try {
      await (api as any).approveSuggestion(id);
      setItems(items.filter((s) => s.id !== id));
    } finally {
      setLoading(null);
    }
  }

  async function reject(id: number) {
    setLoading(id);
    try {
      await (api as any).rejectSuggestion(id);
      setItems(items.filter((s) => s.id !== id));
    } finally {
      setLoading(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {items.map((s) => (
        <div key={s.id} className="bg-gray-900 rounded-xl border border-yellow-800 p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="font-medium text-white">{s.suggested_title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.suggested_trigger_key} · {s.occurrence_count} occurrences
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => approve(s.id)}
                disabled={loading === s.id}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => reject(s.id)}
                disabled={loading === s.id}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 text-xs rounded-lg transition-colors"
              >
                Reject
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 whitespace-pre-wrap mb-3">
            {s.suggested_content}
          </div>

          {s.query_cluster && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-400">Sample queries</summary>
              <p className="mt-2 whitespace-pre-wrap">{s.query_cluster}</p>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
