"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function ReplyBox({ ticketId }: { ticketId: number }) {
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
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError("Failed to send. Is the bot server running?");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Reply to user</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type your reply..."
        className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm resize-none border border-gray-700 focus:outline-none focus:border-blue-500"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-red-400">{error}</p>
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {sending ? "Sending…" : sent ? "✓ Sent" : "Send"}
        </button>
      </div>
    </div>
  );
}
