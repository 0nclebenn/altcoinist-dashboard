"use client";

import { useEffect, useState } from "react";
import { api, TicketView } from "@/lib/api";

interface Props {
  activeViewId: number | null;
  onSelect: (view: TicketView) => void;
  onNewView: () => void;
  refreshSignal: number;
}

export default function TicketViewsSidebar({ activeViewId, onSelect, onNewView, refreshSignal }: Props) {
  const [views, setViews] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ticketViews()
      .then(setViews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshSignal]);

  return (
    <div className="w-44 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Views</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {loading && <p className="px-4 py-2 text-xs text-gray-600">Loading…</p>}
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onSelect(view)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors border-l-2 ${
              activeViewId === view.id
                ? "bg-gray-800 border-indigo-500 text-white"
                : "border-transparent text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {view.name}
          </button>
        ))}
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
