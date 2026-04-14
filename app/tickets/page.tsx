import { api } from "@/lib/api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  open:      "bg-blue-900 text-blue-300",
  escalated: "bg-red-900 text-red-300",
  resolved:  "bg-green-900 text-green-300",
  pending:   "bg-yellow-900 text-yellow-300",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; tag?: string; page?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.tag)    params.set("tag",    searchParams.tag);
  if (searchParams.page)   params.set("page",   searchParams.page);

  let data: any = { tickets: [], total: 0 };
  try { data = await api.tickets(params.toString() ? `?${params}` : ""); } catch {}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <p className="text-sm text-gray-400">{data.total} total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {["", "open", "escalated", "resolved", "pending"].map((s) => (
          <Link
            key={s}
            href={s ? `/tickets?status=${s}` : "/tickets"}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.status ?? "") === s
                ? "bg-white text-gray-900 border-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {s || "All"}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tags</th>
              <th className="text-left px-4 py-3">CSAT</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.tickets.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${t.id}`} className="text-blue-400 hover:underline">
                    #{t.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {t.username ? `@${t.username}` : `#${t.chat_id}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-800 text-gray-400"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{(t.tags ?? []).join(", ") || "—"}</td>
                <td className="px-4 py-3 text-gray-300">{t.csat_score ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {data.tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No tickets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
