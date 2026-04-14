import { api } from "@/lib/api";
import KBEditor from "@/components/KBEditor";
import KBSuggestions from "@/components/KBSuggestions";

export default async function KBPage() {
  let repliesData: any = { replies: [] };
  let suggestionsData: any = { suggestions: [] };
  try { repliesData = await api.scriptedReplies(); } catch {}
  try { suggestionsData = await (api as any).kbSuggestions(); } catch {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">KB Manager</h1>
      <p className="text-gray-400 text-sm mb-8">Edit scripted replies and review AI-suggested additions.</p>

      {/* Suggestions */}
      {suggestionsData.suggestions.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-yellow-400">
            ⚡ {suggestionsData.suggestions.length} Pending Suggestion{suggestionsData.suggestions.length > 1 ? "s" : ""}
          </h2>
          <KBSuggestions suggestions={suggestionsData.suggestions} />
        </div>
      )}

      {/* Scripted replies */}
      <h2 className="text-lg font-semibold mb-4">Scripted Replies</h2>
      <div className="space-y-3">
        {repliesData.replies.map((r: any) => (
          <KBEditor key={r.id} reply={r} />
        ))}
        {repliesData.replies.length === 0 && (
          <p className="text-gray-500 text-sm">No scripted replies found.</p>
        )}
      </div>
    </div>
  );
}
