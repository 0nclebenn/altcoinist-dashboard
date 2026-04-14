import { api } from "@/lib/api";

export default async function DashboardPage() {
  let stats: any = null;
  try { stats = await api.stats(); } catch {}

  const cards = [
    { label: "Open Tickets",       value: stats?.open_tickets       ?? "—" },
    { label: "Escalated",          value: stats?.escalated_tickets  ?? "—" },
    { label: "Tickets This Week",  value: stats?.tickets_this_week  ?? "—" },
    { label: "AI Resolution Rate", value: stats?.ai_resolution_rate != null ? `${stats.ai_resolution_rate}%` : "—" },
    { label: "Avg CSAT",           value: stats?.avg_csat           != null ? `${stats.avg_csat} / 5` : "—" },
  ];

  const weekDelta = stats ? stats.tickets_this_week - stats.tickets_prev_week : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {cards.map(({ label, value }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{String(value)}</p>
          </div>
        ))}
      </div>

      {weekDelta !== null && (
        <p className="text-sm text-gray-400">
          {weekDelta >= 0
            ? `▲ ${weekDelta} more tickets than last week`
            : `▼ ${Math.abs(weekDelta)} fewer tickets than last week`}
        </p>
      )}

      {!stats && (
        <p className="text-yellow-400 text-sm mt-4">
          ⚠️ Could not reach the backend — make sure the bot server is running.
        </p>
      )}
    </div>
  );
}
