"use client";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ---------------------------------------------------------------------------
// Brand chart tokens
// ---------------------------------------------------------------------------

const BRAND_400 = "#38FF93";
const BRAND_300 = "#6DFFB3";
const BRAND_500 = "#2ADB7A";
const CSAT_AMBER = "#E8B34B";
const GRID_STROKE = "rgba(255,255,255,0.06)";
const AXIS_COLOR = "rgba(255,255,255,0.45)";

const AXIS_TICK = {
  fill: AXIS_COLOR,
  fontSize: 10,
  fontFamily: "JetBrains Mono, ui-monospace, monospace",
};

const TOOLTIP_STYLE = {
  background: "rgba(8,8,8,0.95)",
  border: "1px solid rgba(56,255,147,0.4)",
  borderRadius: "8px",
  fontSize: 11,
  fontFamily: "JetBrains Mono, ui-monospace, monospace",
  color: "#fff",
};

const TOOLTIP_LABEL_STYLE = {
  color: "rgba(255,255,255,0.6)",
  fontSize: 10,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};

const TOOLTIP_ITEM_STYLE = {
  color: "#fff",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardWatermark() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-3 right-3 w-7 h-7 rounded-md bg-brand-400 flex items-center justify-center text-black font-bold text-xs opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      A
    </div>
  );
}

function ChartHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2 mb-5">
      <div className="flex items-center gap-2">
        <span className="h-px w-6 bg-brand-400/40" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
          {eyebrow}
        </span>
      </div>
      <p className="font-heading text-base font-semibold text-white tracking-tight">
        {title}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export default function Charts({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* Ticket volume */}
      <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
        <CardWatermark />
        <ChartHeader eyebrow="// volume" title="Ticket Volume (14 days)" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.volume} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND_400} stopOpacity={0.95} />
                <stop offset="100%" stopColor={BRAND_500} stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} />
            <YAxis tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ fill: "rgba(56,255,147,0.06)" }}
            />
            <Bar dataKey="tickets" fill="url(#barFill)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top tags */}
      <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
        <CardWatermark />
        <ChartHeader eyebrow="// tags" title="Top Tags" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.top_tags} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="barFillH" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={BRAND_500} stopOpacity={0.7} />
                <stop offset="100%" stopColor={BRAND_300} stopOpacity={0.95} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="tag"
              type="category"
              width={140}
              tick={AXIS_TICK}
              stroke={GRID_STROKE}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ fill: "rgba(56,255,147,0.06)" }}
            />
            <Bar dataKey="count" fill="url(#barFillH)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI resolution trend */}
      <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
        <CardWatermark />
        <ChartHeader eyebrow="// ai performance" title="AI Resolution Rate (8 weeks)" />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.ai_resolution_trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="lineFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={BRAND_500} stopOpacity={1} />
                <stop offset="50%" stopColor={BRAND_400} stopOpacity={1} />
                <stop offset="100%" stopColor={BRAND_300} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="week" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} />
            <YAxis unit="%" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ stroke: "rgba(56,255,147,0.2)", strokeWidth: 1 }}
              formatter={(v) => [`${v}%`, "AI Rate"]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="url(#lineFill)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: BRAND_400, stroke: "#000", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CSAT trend */}
      <div className="card-base rounded-2xl p-6 group relative overflow-hidden">
        <CardWatermark />
        <ChartHeader eyebrow="// satisfaction" title="CSAT Trend (8 weeks)" />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.csat_trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="week" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} />
            <YAxis domain={[0, 100]} unit="%" tick={AXIS_TICK} stroke={GRID_STROKE} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              cursor={{ stroke: "rgba(232,179,75,0.2)", strokeWidth: 1 }}
              formatter={(v) => [`${v}%`, "CSAT Score"]}
            />
            <Line
              type="monotone"
              dataKey="csat_score_pct"
              stroke={CSAT_AMBER}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: CSAT_AMBER, stroke: "#000", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
