"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import BrandSelect from "@/components/BrandSelect";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Any priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const RESOLUTION_TYPE_OPTIONS = [
  { value: "", label: "Any resolution" },
  { value: "ai", label: "AI" },
  { value: "scripted", label: "Scripted" },
  { value: "human", label: "Human" },
  { value: "auto_timeout", label: "Auto-timeout" },
];

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateViewModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [resolutionType, setResolutionType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("View name is required."); return; }
    setSaving(true);
    setError("");
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (resolutionType) filters.resolution_type = resolutionType;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card-base rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-px w-6 bg-brand-400/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">// new view</span>
        </div>
        <h3 className="font-heading text-base font-semibold text-white mb-5">Create a saved view</h3>

        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1.5">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="e.g. High Priority"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-brand-400/40 placeholder-white/30"
        />

        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1.5">Status</label>
        <div className="mb-4">
          <BrandSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        </div>

        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1.5">Priority</label>
        <div className="mb-4">
          <BrandSelect value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} ariaLabel="Filter by priority" />
        </div>

        <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1.5">Resolution type</label>
        <div className="mb-5">
          <BrandSelect value={resolutionType} onChange={setResolutionType} options={RESOLUTION_TYPE_OPTIONS} ariaLabel="Filter by resolution type" />
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-wider text-white/55 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-full px-4 py-2 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-brand-400 hover:bg-brand-300 text-black font-bold rounded-full disabled:opacity-50 transition-all"
          >
            {saving ? "Saving…" : "Save View"}
          </button>
        </div>
      </div>
    </div>
  );
}
