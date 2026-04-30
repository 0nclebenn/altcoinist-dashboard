"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function KBEditor({ reply }: { reply: any }) {
  const [content, setContent] = useState(reply.content);
  const [title, setTitle] = useState(reply.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateReply(reply.id, { title, content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-base rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/60 mb-1">// trigger</p>
          <p className="font-heading text-[15px] font-semibold text-white truncate">{title}</p>
          <p className="font-mono text-[10px] text-white/35 mt-0.5">{reply.trigger_key}</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider flex-shrink-0">
          <span className="text-brand-400">+{reply.helpful_count}</span>
          <span className="text-red-400/70">-{reply.not_helpful_count}</span>
          <span className="text-white/30">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400/40"
            placeholder="Title"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full bg-white/[0.02] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-brand-400/40 font-body leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 text-black font-bold text-sm rounded-full transition-all"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
