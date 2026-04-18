"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function TicketActions({
  ticketId,
  currentStatus,
  assignedTo,
  onSave,
}: {
  ticketId: number;
  currentStatus: string;
  assignedTo: string | null;
  onSave?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [agent, setAgent] = useState(assignedTo ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateTicket(ticketId, { status, assigned_to: agent || null });
      if (onSave) onSave(); else router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-48">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none"
      >
        {["open", "pending", "escalated", "resolved"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        value={agent}
        onChange={(e) => setAgent(e.target.value)}
        placeholder="Assign to @username"
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
