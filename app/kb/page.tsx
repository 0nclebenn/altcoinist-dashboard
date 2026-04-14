import { api } from "@/lib/api";
import KBEditor from "@/components/KBEditor";

export default async function KBPage() {
  let data: any = { replies: [] };
  try { data = await api.scriptedReplies(); } catch {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">KB Manager</h1>
      <p className="text-gray-400 text-sm mb-6">Edit scripted replies used by the bot. Changes take effect immediately.</p>

      <div className="space-y-4">
        {data.replies.map((r: any) => (
          <KBEditor key={r.id} reply={r} />
        ))}
        {data.replies.length === 0 && (
          <p className="text-gray-500">No scripted replies found. Make sure the bot server is running.</p>
        )}
      </div>
    </div>
  );
}
