"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

type Message = {
  id: number | string;
  role: string;
  content: string;
  message_type: string;
  created_at: string | null;
  pending?: boolean;
};

type TicketData = { messages: Message[] };

const ROLE_STYLES: Record<string, string> = {
  user:  "bg-gray-800 text-gray-100",
  bot:   "bg-blue-900 text-blue-100",
  agent: "bg-green-900 text-green-100",
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ChatBox({
  ticketId,
  initialMessages,
  ticketStatus,
}: {
  ticketId: number;
  initialMessages: Message[];
  ticketStatus: string;
}) {
  const { data, mutate } = useSWR<TicketData>(
    `ticket-${ticketId}`,
    () => api.ticket(ticketId),
    {
      fallbackData: { messages: initialMessages },
      refreshInterval: 6000,      // poll for incoming user replies
      revalidateOnFocus: false,
    }
  );

  const messages: Message[] = data?.messages ?? initialMessages;

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;

    setText("");
    setSending(true);

    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      role: "agent",
      content,
      message_type: "text",
      created_at: new Date().toISOString(),
      pending: true,
    };

    try {
      await mutate(
        async () => {
          await api.replyTicket(ticketId, content);
          // Return nothing — populateCache: false means SWR won't overwrite
          // the cache with this return value. It will only update via revalidate.
        },
        {
          optimisticData: (current: TicketData | undefined) => ({
            ...(current ?? {}),
            messages: [...(current?.messages ?? []), optimistic],
          }),
          populateCache: false,  // don't overwrite cache with mutation return value
          rollbackOnError: true,
          revalidate: true,
        }
      );
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === "agent" ? "items-end" : "items-start"}`}
          >
            <div
              className={`rounded-xl px-4 py-3 max-w-[85%] text-sm whitespace-pre-wrap ${
                ROLE_STYLES[m.role] ?? "bg-gray-800 text-gray-100"
              } ${m.pending ? "opacity-60" : ""}`}
            >
              {m.content}
            </div>
            <p className="text-xs text-gray-600 mt-1 px-1 flex items-center gap-1">
              <span>{m.role}</span>
              <span>·</span>
              {m.pending ? (
                <span className="text-gray-500">sending…</span>
              ) : (
                <>
                  <span>{timeAgo(m.created_at)}</span>
                  {m.role === "agent" && (
                    <span className="text-gray-500 ml-0.5">✓</span>
                  )}
                </>
              )}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {ticketStatus !== "resolved" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Reply to user
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={3}
            placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
            className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm resize-none border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">Shift+Enter for new line</p>
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
