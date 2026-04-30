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
    <div className="space-y-3">
      {items.map((s, i) => (
        <div key={s.id} className="card-base rounded-xl p-5 border-[#E8B34B]/20">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="font-mono text-[10px] text-[#E8B34B]/70 mt-1 flex-shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-heading text-[15px] font-semibold text-white">{s.suggested_title}</p>
                <p className="font-mono text-[10px] text-white/35 mt-0.5">
                  {s.suggested_trigger_key} · {s.occurrence_count} occurrences
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => approve(s.id)}
                disabled={loading === s.id}
                className="px-3 py-1.5 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-black font-bold rounded-full font-mono text-[10px] uppercase tracking-wider transition-all"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => reject(s.id)}
                disabled={loading === s.id}
                className="px-3 py-1.5 border border-white/[0.08] hover:border-red-400/30 text-white/55 hover:text-red-400 disabled:opacity-40 font-mono text-[10px] uppercase tracking-wider rounded-full transition-all"
              >
                Reject
              </button>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-sm text-white/80 whitespace-pre-wrap mb-3 leading-relaxed">
            {s.suggested_content}
          </div>

          {s.query_cluster && (
            <details className="font-mono text-[10px] uppercase tracking-wider text-white/35">
              <summary className="cursor-pointer hover:text-brand-400 transition-colors">Sample queries</summary>
              <p className="mt-2 whitespace-pre-wrap normal-case tracking-normal text-white/55 font-body text-xs">{s.query_cluster}</p>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
