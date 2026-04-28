"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Charts from "@/components/Charts";

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
// StatCard
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{String(value)}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse">
      <div className="h-3 bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-8 bg-gray-700 rounded w-1/2" />
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
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 flex items-center gap-2 hover:bg-gray-750 hover:border-gray-600 transition-colors"
        >
          {/* Calendar icon */}
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
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
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-750 transition-colors leading-none"
          title="Reset to last 14 days"
        >
          &times;
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-72">
          {/* Quick selects */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {quickOptions.map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors text-left"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 mb-4" />

          {/* Custom date inputs */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Apply */}
          <button
            onClick={applyCustom}
            disabled={!draftFrom || !draftTo}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
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

  const statCards = [
    { label: "Open Tickets",          value: stats?.open_tickets            ?? "—" },
    { label: "Escalated",             value: stats?.escalated_tickets       ?? "—" },
    { label: "Tickets This Week",     value: stats?.tickets_this_week       ?? "—" },
    { label: "AI Resolution Rate",    value: stats?.ai_resolution_rate     != null ? `${stats.ai_resolution_rate}%`    : "—" },
    { label: "Human Resolution Rate", value: stats?.human_resolution_rate  != null ? `${stats.human_resolution_rate}%` : "—" },
    { label: "CSAT Score",            value: stats?.csat_score_pct         != null ? `${stats.csat_score_pct}%`        : "—" },
    { label: "CSAT Response Rate",    value: stats?.csat_response_rate     != null ? `${stats.csat_response_rate}%`    : "—" },
  ];

  const weekDelta = stats ? stats.tickets_this_week - stats.tickets_prev_week : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => { setFromDate(from); setToDate(to); }}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ label, value }) => (
              <StatCard key={label} label={label} value={value} />
            ))}
      </div>

      {/* Week delta */}
      {!loading && weekDelta !== null && (
        <p className="text-sm text-gray-400 mb-8">
          {weekDelta >= 0
            ? `▲ ${weekDelta} more tickets than last week`
            : `▼ ${Math.abs(weekDelta)} fewer tickets than last week`}
        </p>
      )}

      {/* Charts / error */}
      {!loading && error && (
        <p className="text-yellow-400 text-sm mt-4">&#9888;&#65039; Could not reach the backend.</p>
      )}
      {!loading && !error && data && <Charts data={data} />}
    </div>
  );
}
