"use client";

import { useEffect, useState } from "react";
import { api, TicketView } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";

interface Props {
  activeViewId: number | null;
  onSelect: (view: TicketView) => void;
  onNewView: () => void;
  onDeleted?: (deletedId: number, fallback: TicketView | null) => void;
  refreshSignal: number;
}

const PROTECTED_NAMES = new Set(["Open", "Escalated", "All", "My Tickets"]);
const MY_TICKETS_VIEW_ID = -1;  // sentinel — virtual view not stored in DB

export default function TicketViewsSidebar({ activeViewId, onSelect, onNewView, onDeleted, refreshSignal }: Props) {
  const { currentAgent } = useRole();
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

  // Inject "My Tickets" at the top whenever we know the current agent's username.
  // This view filters /api/tickets by assigned_to=<my username>. Lives only in
  // the client; not stored in the DB (avoids per-agent seed bloat).
  const allViews: TicketView[] = currentAgent?.username
    ? [
        {
          id: MY_TICKETS_VIEW_ID,
          name: "My Tickets",
          filters: { assigned_to: currentAgent.username },
          position: -1,
          created_at: "",
        },
        ...views,
      ]
    : views;

  async function handleDelete(view: TicketView, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmId !== view.id) {
      setConfirmId(view.id);
      return;
    }
    setBusyId(view.id);
    let deleteError: unknown = null;
    try {
      await api.deleteTicketView(view.id);
    } catch (err) {
      deleteError = err;
      console.error("Failed to delete view", view.id, err);
    }

    // Refetch from server — source of truth. If the backend deleted but the
    // proxy mangled the response, the view is gone and refetch will reflect it.
    let latest: TicketView[] = views;
    try {
      latest = await api.ticketViews();
      setViews(latest);
    } catch (err) {
      console.error("Failed to refetch views after delete", err);
    }

    const stillPresent = latest.some((v) => v.id === view.id);
    if (!stillPresent && activeViewId === view.id && onDeleted) {
      onDeleted(view.id, latest[0] ?? null);
    } else if (stillPresent && deleteError) {
      // Backend kept the view AND we have an error — surface it
      alert("Could not delete view. Try again.");
    }

    setBusyId(null);
    setConfirmId(null);
  }

  return (
    <div className="w-44 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Views</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading && <p className="px-4 py-2 text-xs text-gray-600">Loading…</p>}
        {allViews.map((view) => {
          const protectedView = PROTECTED_NAMES.has(view.name) || view.id === MY_TICKETS_VIEW_ID;
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
