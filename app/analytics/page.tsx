import { api } from "@/lib/api";
import Charts from "@/components/Charts";

export default async function AnalyticsPage() {
  let data: any = null;
  try { data = await api.analytics(); } catch {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      {data ? (
        <Charts data={data} />
      ) : (
        <p className="text-yellow-400 text-sm">⚠️ Could not reach the backend.</p>
      )}
    </div>
  );
}
