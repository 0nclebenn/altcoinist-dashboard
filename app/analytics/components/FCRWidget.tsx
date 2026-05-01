"use client";

/**
 * FCRWidget — Live First Contact Resolution metric.
 *
 * Pick any date range (or preset). Backend computes:
 *   FCR% = confirmed / (confirmed + unconfirmed + missing_csat + auto_timeout)
 * where:
 *   confirmed   = resolution_type IN ('ai','scripted') AND csat_score = 'resolved'
 *   unconfirmed = resolution_type IN ('ai','scripted') AND csat_score IN ('partial','no_help')
 *   missing_csat= resolution_type IN ('ai','scripted') AND csat_score IS NULL
 *   auto_timeout= resolution_type = 'auto_timeout'
 *
 * Human-resolved tickets are excluded from both numerator and denominator.
 *
 * SWR fetches from /api/analytics/fcr (Next.js route → Python backend, 5-min cache).
 */
import { useState, useEffect, useRef, useMemo } from "react";
import useSWR from "swr";

import type { FCRResponse } from "@/lib/types/analytics";

// ---------------------------------------------------------------------------
// Q2 2026 cutover — bot replaced Mava on Apr 22 2026. Earlier data is from
// the legacy support system and shouldn't be conflated. The widget shows a
// banner when the user picks a range that crosses this date.
// ---------------------------------------------------------------------------
const CUTOVER_DATE = "2026-04-22";

// FCR target band
const FCR_TARGET = 85;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Preset = { label: string; resolve: () => { from: string; to: string } };

const PRESETS: Preset[] = [
  {
    label: "Last 7 days",
    resolve: () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from: formatISO(from), to: formatISO(today) };
    },
  },
  {
    label: "Last 30 days",
    resolve: () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { from: formatISO(from), to: formatISO(today) };
    },
  },
  {
    label: "Last 90 days",
    resolve: () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 89);
      return { from: formatISO(from), to: formatISO(today) };
    },
  },
  {
    label: "This month",
    resolve: () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatISO(from), to: formatISO(today) };
    },
  },
  {
    label: "Quarter to date",
    resolve: () => {
      const today = new Date();
      const q = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), q * 3, 1);
      return { from: formatISO(from), to: formatISO(today) };
    },
  },
];

// ---------------------------------------------------------------------------
// SWR fetcher
// ---------------------------------------------------------------------------

const fetcher = async (url: string): Promise<FCRResponse> => {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function fcrColor(pct: number | null): string {
  if (pct == null) return "text-white/40";
  if (pct >= 85) return "text-brand-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

function fcrBgGlow(pct: number | null): string {
  if (pct == null) return "bg-white/[0.03]";
  if (pct >= 85) return "bg-brand-400/10";
  if (pct >= 70) return "bg-amber-400/10";
  return "bg-red-400/10";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What is FCR?"
        className="w-5 h-5 rounded-full border border-white/15 text-white/60 hover:text-brand-400 hover:border-brand-400/40 text-[11px] flex items-center justify-center transition-colors"
      >
        i
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 panel border border-white/[0.08] rounded-lg p-3 w-72 text-xs text-white/70 leading-relaxed shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-400/80 mb-1.5">
            // first contact resolution
          </p>
          <p>
            % of bot-resolved tickets where the user explicitly tapped <span className="text-brand-400">✅ Resolved</span> on CSAT.
          </p>
          <p className="mt-2 text-white/50">
            Auto-timeout closures (silent, no CSAT fired) sit in the denominator only.
            Human-escalated tickets are excluded from both numerator and denominator.
          </p>
        </div>
      )}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-16 bg-white/[0.06] rounded-lg w-40 mb-3" />
      <div className="h-3 bg-white/[0.04] rounded w-24" />
    </div>
  );
}

function CompositionSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-3 bg-white/[0.04] rounded" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range picker (subset of analytics page picker — kept local to avoid
// coupling)
// ---------------------------------------------------------------------------

interface RangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

function RangePicker({ from, to, onChange }: RangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function applyPreset(p: Preset) {
    const { from: f, to: t } = p.resolve();
    onChange(f, t);
    setOpen(false);
  }

  function applyCustom() {
    if (draftFrom && draftTo && draftFrom <= draftTo) {
      onChange(draftFrom, draftTo);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 flex items-center gap-2 hover:border-brand-400/40 hover:bg-brand-400/[0.04] hover:text-white transition-colors"
      >
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
          {formatDisplay(from)} &ndash; {formatDisplay(to)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 panel border border-white/[0.08] rounded-xl shadow-2xl p-4 w-72">
          {/* Presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/70 bg-white/[0.03] hover:bg-brand-400/[0.06] hover:text-brand-400 border border-white/[0.06] hover:border-brand-400/30 rounded-lg px-3 py-2 transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-4" />

          {/* Custom range */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/90 focus:outline-none focus:border-brand-400/50"
              />
            </div>
            <div className="flex-1">
              <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/90 focus:outline-none focus:border-brand-400/50"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={applyCustom}
            disabled={!draftFrom || !draftTo || draftFrom > draftTo}
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
// Main widget
// ---------------------------------------------------------------------------

export default function FCRWidget() {
  // Default to "Last 30 days" per spec
  const initial = useMemo(() => PRESETS[1].resolve(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const { data, error, isLoading, mutate } = useSWR<FCRResponse>(
    `/api/analytics/fcr?from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const fcr = data?.fcr_percent ?? null;
  const comp = data?.composition;

  // Composition row counts as % of total_bot_resolved (denominator)
  const total = comp?.total_bot_resolved ?? 0;
  const pct = (n: number | undefined) =>
    total > 0 && n != null ? `${((n / total) * 100).toFixed(1)}%` : "0%";

  // Pre-cutover banner: any part of the range falls before Apr 22 2026
  const showLegacyBanner = from < CUTOVER_DATE;

  const heroDisplay = fcr == null ? "—" : `${fcr.toFixed(1)}%`;
  const heroColor = fcrColor(fcr);
  const heroBg = fcrBgGlow(fcr);

  return (
    <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
      {/* Watermark */}
      <div
        aria-hidden="true"
        className="absolute top-3 right-3 w-7 h-7 rounded-md bg-brand-400 flex items-center justify-center text-black font-bold text-xs opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        A
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-brand-400/40" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
              // first contact resolution
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-white tracking-tight">
              First Contact Resolution (FCR)
            </h3>
            <InfoTooltip />
          </div>
        </div>

        <RangePicker
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
        />
      </div>

      {/* Legacy data banner */}
      {showLegacyBanner && (
        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-3 py-2 text-xs text-amber-200/80">
          <span className="font-semibold">Note:</span>{" "}
          Some data in this range is from the legacy support system (pre-{CUTOVER_DATE}).
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200 flex items-center justify-between">
          <span>Failed to load FCR: {(error as Error).message}</span>
          <button
            type="button"
            onClick={() => mutate()}
            className="text-xs font-mono uppercase tracking-[0.12em] text-red-200 hover:text-white border border-red-400/40 hover:border-white/40 rounded px-2 py-1 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Body — stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row md:items-stretch gap-4">
        {/* Hero */}
        <div className={`flex-1 rounded-xl ${heroBg} border border-white/[0.06] p-5 flex flex-col justify-center`}>
          {isLoading && !data ? (
            <HeroSkeleton />
          ) : (
            <>
              <p className={`font-heading text-5xl md:text-6xl font-bold tracking-tight ${heroColor}`}>
                {heroDisplay}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50 mt-2">
                Q2 target: {FCR_TARGET}%
                {fcr != null && (
                  <span className={`ml-2 ${fcr >= FCR_TARGET ? "text-brand-400" : "text-amber-400"}`}>
                    ({fcr >= FCR_TARGET ? "on target" : `${(FCR_TARGET - fcr).toFixed(1)}pp below`})
                  </span>
                )}
              </p>
              {fcr == null && comp && comp.total_bot_resolved === 0 && (
                <p className="text-xs text-white/40 mt-3 leading-snug">
                  No bot-resolved tickets in this range. Pick a wider window or after the cutover date.
                </p>
              )}
            </>
          )}
        </div>

        {/* Composition strip */}
        <div className="flex-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3">
            // composition
          </p>

          {isLoading && !data ? (
            <CompositionSkeleton />
          ) : comp ? (
            <ul className="space-y-2 text-sm">
              <CompRow
                icon="✅"
                label="Confirmed"
                count={comp.confirmed_count}
                pct={pct(comp.confirmed_count)}
                tone="success"
              />
              <CompRow
                icon="🔄"
                label="Silent (auto-timeout)"
                count={comp.auto_timeout_count}
                pct={pct(comp.auto_timeout_count)}
                tone="muted"
              />
              <CompRow
                icon="⚠️"
                label="Unconfirmed (partial / no help)"
                count={comp.unconfirmed_count}
                pct={pct(comp.unconfirmed_count)}
                tone="warn"
              />
              {comp.missing_csat_count > 0 && (
                <CompRow
                  icon="❓"
                  label="Missing CSAT (data gap)"
                  count={comp.missing_csat_count}
                  pct={pct(comp.missing_csat_count)}
                  tone="muted"
                />
              )}
              <li className="border-t border-white/[0.06] pt-2 mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Bot-resolved total</span>
                  <span className="font-mono">{comp.total_bot_resolved}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Human-resolved (excluded)</span>
                  <span className="font-mono">{comp.human_resolved_excluded}</span>
                </div>
              </li>
            </ul>
          ) : null}
        </div>
      </div>

      {/* Footer — computed_at timestamp */}
      {data?.computed_at && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
          // computed {new Date(data.computed_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composition row
// ---------------------------------------------------------------------------

function CompRow({
  icon,
  label,
  count,
  pct,
  tone,
}: {
  icon: string;
  label: string;
  count: number;
  pct: string;
  tone: "success" | "warn" | "muted";
}) {
  const toneClass =
    tone === "success" ? "text-brand-400" : tone === "warn" ? "text-amber-400" : "text-white/50";
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-white/80">
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </span>
      <span className={`font-mono text-xs ${toneClass}`}>
        {count}
        <span className="text-white/30 ml-2">({pct})</span>
      </span>
    </li>
  );
}
