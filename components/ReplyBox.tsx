"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ReplyBox({ ticketId, onSent }: { ticketId: number; onSent?: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      await api.replyTicket(ticketId, text.trim());
      setSent(true);
      setText("");
      if (onSent) onSent(); else router.refresh();
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError("Failed to send. Is the bot server running?");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="panel rounded-2xl border border-white/[0.06] p-4">
      <div className="inline-flex items-center gap-2 mb-2">
        <span className="h-px w-6 bg-brand-400/40" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">// reply to user</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="Type your reply..."
        className="w-full bg-white/[0.02] text-white/90 rounded-lg px-3 py-2 text-sm resize-none border border-white/[0.06] focus:outline-none focus:border-brand-400/40 font-body"
      />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            ⌘+enter to send
          </span>
          {error && <span className="font-mono text-[10px] uppercase tracking-wider text-red-400">{error}</span>}
        </div>
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-brand-400 hover:bg-brand-300 disabled:bg-white/[0.04] disabled:text-white/30 text-black text-sm font-bold rounded-full px-5 py-2 transition-all font-heading"
        >
          {sending ? "Sending…" : sent ? "✓ Sent" : "Send"}
        </button>
      </div>
    </div>
  );
}
