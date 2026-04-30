"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AgentRow {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  signature?: string | null;
}

interface Props {
  ticketId: number;
  currentStatus: string;
  currentPriority: string;
  currentCategory: string | null;
  assignedTo: string | null;
  onSave?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option lists
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "open",      label: "Open" },
  { value: "pending",   label: "Pending" },
  { value: "resolved",  label: "Resolved" },
  { value: "escalated", label: "Escalated" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "Customer Support",  label: "Customer Support" },
  { value: "Technical Support", label: "Technical Support" },
  { value: "Product",           label: "Product" },
  { value: "Bug Report",        label: "Bug Report" },
  { value: "Feedback",          label: "Feedback" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Avatar — colored circle with first letter
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-700", "bg-blue-700", "bg-emerald-700", "bg-amber-700",
  "bg-rose-700",   "bg-sky-700",  "bg-pink-700",    "bg-teal-700",
];

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function MiniAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const dim = size === "xs" ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]";
  return (
    <span
      className={`rounded-full inline-flex items-center justify-center text-white font-semibold flex-shrink-0 ${dim} ${avatarColor(name)}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill button with dropdown
// ─────────────────────────────────────────────────────────────────────────────

interface PillProps {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;          // dropdown content
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function Pill({ icon, label, loading, open, onToggle, children, containerRef }: PillProps) {
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs transition-colors ${
          open
            ? "bg-brand-400 border-brand-400 text-black"
            : "bg-white/[0.02] border-white/[0.08] text-white/85 hover:border-brand-400/40 hover:bg-white/[0.04]"
        } disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5 truncate max-w-[140px]">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 panel border border-white/[0.08] rounded-lg shadow-xl py-1 max-h-72 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
      className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DropdownItem({
  active,
  onClick,
  children,
  tone = "default",
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
        active ? "bg-brand-400/[0.08] text-white" : "text-white/80 hover:bg-white/[0.04]"
      } ${tone === "muted" ? "text-white/45 hover:text-white/70" : ""}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons (inline so we don't add a dep)
// ─────────────────────────────────────────────────────────────────────────────

function PriorityIcon({ value }: { value: string }) {
  const heights = value === "high" ? [3, 6, 9] : value === "medium" ? [2, 5, 8] : [3, 5, 7];
  const opacity = value === "high" ? [0.5, 0.75, 1] : value === "medium" ? [0.4, 0.7, 0.4] : [1, 0.4, 0.4];
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={1 + i * 3}
          y={10 - h}
          width="2"
          height={h}
          fill="currentColor"
          opacity={opacity[i]}
        />
      ))}
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0" fill="currentColor">
      <rect x="0" y="0" width="4" height="4" rx="0.5" />
      <rect x="6" y="0" width="4" height="4" rx="0.5" />
      <rect x="0" y="6" width="4" height="4" rx="0.5" />
      <rect x="6" y="6" width="4" height="4" rx="0.5" />
    </svg>
  );
}

function StatusDot({ value }: { value: string }) {
  const color =
    value === "open" ? "text-brand-400" :
    value === "escalated" ? "text-red-400" :
    value === "resolved" ? "text-brand-500" :
    value === "pending" ? "text-[#E8B34B]" :
    "text-white/40";
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={`flex-shrink-0 ${color}`}>
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CloseX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0 text-white/45">
      <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main control bar
// ─────────────────────────────────────────────────────────────────────────────

export default function TicketActions({
  ticketId,
  currentStatus,
  currentPriority,
  currentCategory,
  assignedTo,
  onSave,
}: Props) {
  // Optimistic local state — flips on click, syncs back from PATCH response
  const [status,   setStatus]   = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [category, setCategory] = useState(currentCategory);
  const [agent,    setAgent]    = useState(assignedTo);

  useEffect(() => setStatus(currentStatus),     [currentStatus]);
  useEffect(() => setPriority(currentPriority), [currentPriority]);
  useEffect(() => setCategory(currentCategory), [currentCategory]);
  useEffect(() => setAgent(assignedTo),         [assignedTo]);

  // Per-pill loading
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Open-dropdown tracking — only one open at a time
  const [openPill, setOpenPill] = useState<null | "agent" | "priority" | "category" | "status">(null);
  const togglePill = (p: "agent" | "priority" | "category" | "status") =>
    setOpenPill((prev) => (prev === p ? null : p));

  // Refs for outside-click
  const agentRef    = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPill) return;
    function onDoc(e: MouseEvent) {
      const refs = [agentRef, priorityRef, categoryRef, statusRef];
      const target = e.target as Node;
      const insideAny = refs.some((r) => r.current && r.current.contains(target));
      if (!insideAny) setOpenPill(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openPill]);

  // Agents fetched on mount
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.agents()
      .then((d) => {
        if (cancelled) return;
        const list = (d as { agents?: AgentRow[] })?.agents ?? [];
        setAgents(list);
      })
      .catch(() => { /* leave empty — pill still functional for clear */ });
    return () => { cancelled = true; };
  }, []);

  // ── PATCH helpers ──────────────────────────────────────────────────────────

  async function update(field: "status" | "priority" | "category" | "assigned_to", value: string | null) {
    setBusy((b) => ({ ...b, [field]: true }));
    setError(null);
    const prev = { status, priority, category, agent };
    // Optimistic
    if (field === "status")      setStatus(value ?? "open");
    if (field === "priority")    setPriority(value ?? "medium");
    if (field === "category")    setCategory(value);
    if (field === "assigned_to") setAgent(value);
    try {
      // assigned_to / category accept "" to clear; other fields must send a real value
      const body: Record<string, string | null> = {};
      body[field] = value ?? "";
      await api.updateTicket(ticketId, body);
      onSave?.();
    } catch (err: unknown) {
      // Rollback on error
      setStatus(prev.status);
      setPriority(prev.priority);
      setCategory(prev.category);
      setAgent(prev.agent);
      const msg = err instanceof Error ? err.message : "Update failed.";
      setError(msg);
    } finally {
      setBusy((b) => ({ ...b, [field]: false }));
      setOpenPill(null);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredAgents = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        (a.signature && a.signature.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [agents, agentSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return CATEGORY_OPTIONS;
    return CATEGORY_OPTIONS.filter((c) => c.label.toLowerCase().includes(q));
  }, [categorySearch]);

  const agentDisplay = useMemo(() => {
    if (!agent) return "Agent";
    const found = agents.find((a) => a.username === agent);
    return found?.signature || found?.username || agent;
  }, [agent, agents]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Agent */}
      <Pill
        containerRef={agentRef}
        icon={agent ? <MiniAvatar name={agentDisplay} size="xs" /> : <CategoryIcon />}
        label={agentDisplay}
        loading={busy["assigned_to"]}
        open={openPill === "agent"}
        onToggle={() => togglePill("agent")}
      >
        <div className="px-2 py-1.5 sticky top-0 bg-black/80 backdrop-blur border-b border-white/[0.06]">
          <input
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
            placeholder="Agent…"
            className="w-full bg-white/[0.02] border border-white/[0.08] text-white/90 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-400/40"
          />
        </div>
        {agent && (
          <DropdownItem onClick={() => update("assigned_to", null)} tone="muted">
            <CloseX />
            <span>Remove Agent</span>
          </DropdownItem>
        )}
        {filteredAgents.length === 0 && (
          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/35 italic">No agents found</p>
        )}
        {filteredAgents.map((a) => (
          <DropdownItem
            key={a.id}
            active={agent === a.username}
            onClick={() => update("assigned_to", a.username)}
          >
            <MiniAvatar name={a.signature || a.username} />
            <span className="flex-1 truncate">{a.signature || a.username}</span>
            {agent === a.username && <Check />}
          </DropdownItem>
        ))}
      </Pill>

      {/* Priority */}
      <Pill
        containerRef={priorityRef}
        icon={<PriorityIcon value={priority} />}
        label={priority.charAt(0).toUpperCase() + priority.slice(1)}
        loading={busy["priority"]}
        open={openPill === "priority"}
        onToggle={() => togglePill("priority")}
      >
        {PRIORITY_OPTIONS.map((p) => (
          <DropdownItem
            key={p.value}
            active={priority === p.value}
            onClick={() => update("priority", p.value)}
          >
            <PriorityIcon value={p.value} />
            <span className="flex-1">{p.label}</span>
            {priority === p.value && <Check />}
          </DropdownItem>
        ))}
      </Pill>

      {/* Category */}
      <Pill
        containerRef={categoryRef}
        icon={<CategoryIcon />}
        label={category || "Category"}
        loading={busy["category"]}
        open={openPill === "category"}
        onToggle={() => togglePill("category")}
      >
        <div className="px-2 py-1.5 sticky top-0 bg-black/80 backdrop-blur border-b border-white/[0.06]">
          <input
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Category…"
            className="w-full bg-white/[0.02] border border-white/[0.08] text-white/90 text-xs rounded px-2 py-1 focus:outline-none focus:border-brand-400/40"
          />
        </div>
        {category && (
          <DropdownItem onClick={() => update("category", null)} tone="muted">
            <CloseX />
            <span>Remove Category</span>
          </DropdownItem>
        )}
        {filteredCategories.map((c) => (
          <DropdownItem
            key={c.value}
            active={category === c.value}
            onClick={() => update("category", c.value)}
          >
            <CategoryIcon />
            <span className="flex-1">{c.label}</span>
            {category === c.value && <Check />}
          </DropdownItem>
        ))}
      </Pill>

      {/* Status */}
      <Pill
        containerRef={statusRef}
        icon={<StatusDot value={status} />}
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        loading={busy["status"]}
        open={openPill === "status"}
        onToggle={() => togglePill("status")}
      >
        {STATUS_OPTIONS.map((s) => (
          <DropdownItem
            key={s.value}
            active={status === s.value}
            onClick={() => update("status", s.value)}
          >
            <StatusDot value={s.value} />
            <span className="flex-1">{s.label}</span>
            {status === s.value && <Check />}
          </DropdownItem>
        ))}
      </Pill>

      {error && (
        <p className="basis-full text-right text-[11px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

function Check() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0 text-brand-400" aria-hidden="true">
      <path d="M2 5 L4 7 L8 3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
