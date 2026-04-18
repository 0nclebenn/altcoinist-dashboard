"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const STATUS_OPTIONS = ["open", "pending", "escalated", "resolved"];
const PRIORITY_OPTIONS = ["high", "medium", "low"];

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateViewModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("View name is required."); return; }
    setSaving(true);
    setError("");
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    try {
      await api.createTicketView({ name: name.trim(), filters });
      onCreated();
      onClose();
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white mb-5">New View</h3>

        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="e.g. High Priority"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-indigo-500"
        />

        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 mb-4 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Any status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 mb-5 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Any priority</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save View"}
          </button>
        </div>
      </div>
    </div>
  );
}
