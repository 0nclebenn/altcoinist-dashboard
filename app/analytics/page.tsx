export const dynamic = "force-dynamic";

import { api } from "@/lib/api";
import Charts from "@/components/Charts";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{String(value)}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  let stats: any = null;
  let data: any = null;
  try { stats = await api.stats(); } catch {}
  try { data = await api.analytics(); } catch {}

  const statCards = [
    { label: "Open Tickets",       value: stats?.open_tickets       ?? "—" },
    { label: "Escalated",          value: stats?.escalated_tickets  ?? "—" },
    { label: "Tickets This Week",  value: stats?.tickets_this_week  ?? "—" },
    { label: "AI Resolution Rate", value: stats?.ai_resolution_rate != null ? `${stats.ai_resolution_rate}%` : "—" },
    { label: "Avg CSAT",           value: stats?.avg_csat           != null ? `${stats.avg_csat} / 5` : "—" },
  ];

  const weekDelta = stats ? stats.tickets_this_week - stats.tickets_prev_week : null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
        {statCards.map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      {weekDelta !== null && (
        <p className="text-sm text-gray-400 mb-8">
          {weekDelta >= 0
            ? `▲ ${weekDelta} more tickets than last week`
            : `▼ ${Math.abs(weekDelta)} fewer tickets than last week`}
        </p>
      )}

      {data ? (
        <Charts data={data} />
      ) : (
        <p className="text-yellow-400 text-sm mt-4">⚠️ Could not reach the backend.</p>
      )}
    </div>
  );
}
