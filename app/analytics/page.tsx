"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Charts from "@/components/Charts";
import FCRWidget from "./components/FCRWidget";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 13);
  return { from: formatDate(twoWeeksAgo), to: formatDate(today) };
}

// ---------------------------------------------------------------------------
// Eyebrow — reusable section label
// ---------------------------------------------------------------------------

function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px w-6 bg-brand-400/40" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watermark — top-right brand letter on cards
// ---------------------------------------------------------------------------

function CardWatermark() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-3 right-3 w-7 h-7 rounded-md bg-brand-400 flex items-center justify-center text-black font-heading font-bold text-xs opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
    >
      A
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string | number;
  primary?: boolean;
}) {
  return (
    <div className="card-base rounded-xl p-5 group relative overflow-hidden">
      <CardWatermark />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2">
        {label}
      </p>
      <p
        className={`font-heading text-3xl font-bold tracking-tight ${
          primary ? "text-brand-400" : "text-white"
        }`}
      >
        {String(value)}
      </p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card-base rounded-xl p-5 relative overflow-hidden">
      <div className="animate-pulse">
        <div className="h-2.5 bg-white/10 rounded w-3/4 mb-3" />
        <div className="h-7 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateRangePicker
// ---------------------------------------------------------------------------

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
}

function DateRangePicker({ fromDate, toDate, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync drafts when parent changes (e.g. reset)
  useEffect(() => {
    setDraftFrom(fromDate);
    setDraftTo(toDate);
  }, [fromDate, toDate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function applyQuick(days: number) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
    const f = formatDate(from);
    const t = formatDate(today);
    onChange(f, t);
    setOpen(false);
  }

  function applyToday() {
    const t = formatDate(new Date());
    onChange(t, t);
    setOpen(false);
  }

  function applyCustom() {
    if (draftFrom && draftTo) {
      onChange(draftFrom, draftTo);
      setOpen(false);
    }
  }

  function reset() {
    const { from, to } = defaultRange();
    onChange(from, to);
  }

  const quickOptions = [
    { label: "Today",       action: applyToday },
    { label: "Last 7 days", action: () => applyQuick(7) },
    { label: "Last 14 days", action: () => applyQuick(14) },
    { label: "Last 30 days", action: () => applyQuick(30) },
  ];

  return (
    <div className="relative" ref={containerRef}>
      {/* Pill button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 flex items-center gap-2 hover:border-brand-400/40 hover:bg-brand-400/[0.04] hover:text-white transition-colors"
        >
          {/* Calendar icon */}
          <svg
            className="w-3.5 h-3.5 text-brand-400/70 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>
            {formatDisplay(fromDate)} &ndash; {formatDisplay(toDate)}
          </span>
        </button>
        {/* Reset × */}
        <button
          onClick={reset}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] w-8 h-8 flex items-center justify-center text-sm text-white/50 hover:text-brand-400 hover:border-brand-400/40 transition-colors leading-none"
          title="Reset to last 14 days"
        >
          &times;
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 panel border border-white/[0.08] rounded-xl shadow-2xl p-4 w-72">
          {/* Quick selects */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {quickOptions.map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/70 bg-white/[0.03] hover:bg-brand-400/[0.06] hover:text-brand-400 border border-white/[0.06] hover:border-brand-400/30 rounded-lg px-3 py-2 transition-colors text-left"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-4" />

          {/* Custom date inputs */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">From</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/90 focus:outline-none focus:border-brand-400/50"
              />
            </div>
            <div className="flex-1">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">To</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/90 focus:outline-none focus:border-brand-400/50"
              />
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={applyCustom}
            disabled={!draftFrom || !draftTo}
            className="w-full bg-brand-400 hover:bg-brand-300 disabled:bg-white/10 disabled:text-white/30 text-black font-heading text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section divider — gradient line + eyebrow
// ---------------------------------------------------------------------------

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80 whitespace-nowrap">
        {label}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-brand-400/20 via-white/[0.06] to-transparent" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { from: defaultFrom, to: defaultTo } = defaultRange();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const [stats, setStats] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      api.stats({ from: fromDate, to: toDate }).catch(() => null),
      api.analytics({ from: fromDate, to: toDate }).catch(() => null),
    ]).then(([s, d]) => {
      if (cancelled) return;
      setStats(s);
      setData(d);
      setLoading(false);
      if (!s && !d) setError(true);
    });

    return () => { cancelled = true; };
  }, [fromDate, toDate]);

  const statCards: { label: string; value: string | number; primary?: boolean }[] = [
    { label: "Open Tickets",          value: stats?.open_tickets            ?? "—" },
    { label: "Escalated",             value: stats?.escalated_tickets       ?? "—" },
    { label: "Tickets This Week",     value: stats?.tickets_this_week       ?? "—" },
    { label: "AI Resolution Rate",    value: stats?.ai_resolution_rate     != null ? `${stats.ai_resolution_rate}%`    : "—", primary: true },
    { label: "Human Resolution Rate", value: stats?.human_resolution_rate  != null ? `${stats.human_resolution_rate}%` : "—" },
    { label: "CSAT Score",            value: stats?.csat_score_pct         != null ? `${stats.csat_score_pct}%`        : "—", primary: true },
    { label: "CSAT Response Rate",    value: stats?.csat_response_rate     != null ? `${stats.csat_response_rate}%`    : "—" },
  ];

  const weekDelta = stats ? stats.tickets_this_week - stats.tickets_prev_week : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex flex-col gap-3">
          <Eyebrow label="// support / analytics" />
          <h1 className="gradient-heading font-heading text-4xl font-bold tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-white/50 max-w-xl">
            Live performance pulse across the Altcoinist Groupbot support pipeline.
          </p>
        </div>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => { setFromDate(from); setToDate(to); }}
        />
      </div>

      {/* Section 00 — Live FCR */}
      <SectionDivider label="// 00 / fcr" />
      <FCRWidget />

      {/* Section 01 — Overview */}
      <SectionDivider label="// 01 / overview" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ label, value, primary }) => (
              <StatCard key={label} label={label} value={value} primary={primary} />
            ))}
      </div>

      {/* Week delta */}
      {!loading && weekDelta !== null && (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50 mb-2">
          {weekDelta >= 0
            ? <><span className="text-brand-400">&#9650;</span> {weekDelta} more tickets than last week</>
            : <><span className="text-amber-400">&#9660;</span> {Math.abs(weekDelta)} fewer tickets than last week</>}
        </p>
      )}

      {/* Section 02 — Trends */}
      <SectionDivider label="// 02 / trends" />

      {/* Charts / error */}
      {!loading && error && (
        <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
          <CardWatermark />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber-400">
            &#9888;&#65039; Could not reach the backend.
          </p>
        </div>
      )}
      {!loading && !error && data && <Charts data={data} />}
    </div>
  );
}
