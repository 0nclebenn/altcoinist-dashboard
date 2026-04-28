"use client";

import { useEffect, useState } from "react";
import { api, TicketView } from "@/lib/api";

interface Props {
  activeViewId: number | null;
  onSelect: (view: TicketView) => void;
  onNewView: () => void;
  onDeleted?: (deletedId: number, fallback: TicketView | null) => void;
  refreshSignal: number;
}

const PROTECTED_NAMES = new Set(["Open", "Escalated", "All"]);

export default function TicketViewsSidebar({ activeViewId, onSelect, onNewView, onDeleted, refreshSignal }: Props) {
  const [views, setViews] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    api.ticketViews()
      .then(setViews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshSignal]);

  async function handleDelete(view: TicketView, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmId !== view.id) {
      setConfirmId(view.id);
      return;
    }
    setBusyId(view.id);
    try {
      await api.deleteTicketView(view.id);
      const remaining = views.filter((v) => v.id !== view.id);
      setViews(remaining);
      if (activeViewId === view.id && onDeleted) {
        onDeleted(view.id, remaining[0] ?? null);
      }
    } catch {
      // Leave the view in place; user can retry
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="w-44 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Views</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading && <p className="px-4 py-2 text-xs text-gray-600">Loading…</p>}
        {views.map((view) => {
          const protectedView = PROTECTED_NAMES.has(view.name);
          const active = activeViewId === view.id;
          const confirming = confirmId === view.id;
          const busy = busyId === view.id;
          return (
            <div
              key={view.id}
              className={`group flex items-center text-sm transition-colors border-l-2 ${
                active
                  ? "bg-gray-800 border-indigo-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <button
                onClick={() => onSelect(view)}
                className="flex-1 text-left px-4 py-2 truncate"
              >
                {view.name}
              </button>
              {!protectedView && (
                <button
                  onClick={(e) => handleDelete(view, e)}
                  onMouseLeave={() => confirming && setConfirmId(null)}
                  disabled={busy}
                  title={confirming ? "Click again to confirm" : "Delete view"}
                  className={`flex-shrink-0 px-2 py-1 mr-1 rounded text-[10px] transition-all ${
                    confirming
                      ? "text-red-300 bg-red-900/40 opacity-100"
                      : "text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                  } disabled:opacity-50`}
                >
                  {busy ? "…" : confirming ? "Confirm?" : "×"}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={onNewView}
          className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          + New View
        </button>
      </div>
    </div>
  );
}
