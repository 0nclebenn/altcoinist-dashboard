export const dynamic = "force-dynamic";

import { api } from "@/lib/api";
import Link from "next/link";
import ReplyBox from "@/components/ReplyBox";
import TicketActions from "@/components/TicketActions";

const ROLE_STYLES: Record<string, string> = {
  user:      "bg-gray-800 text-gray-100 self-start",
  bot:       "bg-blue-900 text-blue-100 self-start",
  agent:     "bg-green-900 text-green-100 self-start",
};

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: any = null;
  try { data = await api.ticket(Number(id)); } catch {}

  if (!data) {
    return (
      <div>
        <Link href="/tickets" className="text-gray-400 hover:text-white text-sm">← Back</Link>
        <p className="mt-4 text-red-400">Ticket not found or backend unreachable.</p>
      </div>
    );
  }

  const { ticket, conversation, messages } = data;

  return (
    <div className="max-w-3xl">
      <Link href="/tickets" className="text-gray-400 hover:text-white text-sm">← Back to tickets</Link>

      {/* Header */}
      <div className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Ticket #{ticket.id}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {conversation.username ? `@${conversation.username}` : `User #${conversation.chat_id}`}
            {" · "}
            {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ""}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(ticket.tags ?? []).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <TicketActions ticketId={ticket.id} currentStatus={ticket.status} assignedTo={ticket.assigned_to} />
      </div>

      {/* Conversation */}
      <div className="space-y-3 mb-6">
        {messages.map((m: any) => (
          <div key={m.id} className="flex flex-col">
            <div className={`rounded-xl px-4 py-3 max-w-[85%] text-sm whitespace-pre-wrap ${ROLE_STYLES[m.role] ?? "bg-gray-800"}`}>
              {m.content}
            </div>
            <p className="text-xs text-gray-600 mt-1 px-1">
              {m.role} · {m.message_type} · {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Reply */}
      {ticket.status !== "resolved" && (
        <ReplyBox ticketId={ticket.id} />
      )}
    </div>
  );
}
