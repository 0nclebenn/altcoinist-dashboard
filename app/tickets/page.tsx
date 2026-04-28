"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TicketView } from "@/lib/api";
import TicketViewsSidebar from "@/components/TicketViewsSidebar";
import TicketList from "@/components/TicketList";
import TicketDetail from "@/components/TicketDetail";
import CreateViewModal from "@/components/CreateViewModal";

interface Ticket {
  id: number;
  username: string | null;
  status: string;
  priority: string;
  tags: string[];
  created_at: string;
}

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeView, setActiveView] = useState<TicketView | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(
    searchParams.get("ticket") ? parseInt(searchParams.get("ticket")!, 10) : null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewRefresh, setViewRefresh] = useState(0);
  const [listRefresh, setListRefresh] = useState(0);

  const pushURL = useCallback(
    (view: TicketView | null, ticketId: number | null) => {
      const p = new URLSearchParams();
      if (view) p.set("view", String(view.id));
      if (ticketId) p.set("ticket", String(ticketId));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [router, pathname]
  );

  const handleViewSelect = (view: TicketView) => {
    setActiveView(view);
    setActiveTicketId(null);
    pushURL(view, null);
  };

  const handleTicketSelect = (ticket: Ticket) => {
    setActiveTicketId(ticket.id);
    pushURL(activeView, ticket.id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <TicketViewsSidebar
        activeViewId={activeView?.id ?? null}
        onSelect={handleViewSelect}
        onNewView={() => setShowCreateModal(true)}
        onDeleted={(_deletedId, fallback) => {
          setActiveView(fallback);
          setActiveTicketId(null);
          pushURL(fallback, null);
        }}
        refreshSignal={viewRefresh}
      />

      <TicketList
        activeView={activeView}
        activeTicketId={activeTicketId}
        onSelect={handleTicketSelect}
        refreshSignal={listRefresh}
      />

      {activeTicketId ? (
        <TicketDetail
          ticketId={activeTicketId}
          onStatusChange={() => setListRefresh((n) => n + 1)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Select a ticket
        </div>
      )}

      {showCreateModal && (
        <CreateViewModal
          onCreated={() => setViewRefresh((n) => n + 1)}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Loading…</div>}>
        <TicketsContent />
      </Suspense>
    </div>
  );
}
