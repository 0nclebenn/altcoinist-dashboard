"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function TeamManager({ initialAgents }: { initialAgents: any[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("agent");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!username.trim()) return;
    setAdding(true);
    setError("");
    try {
      await api.addAgent({ username: username.trim(), role });
      setAgents([...agents, { username: username.trim(), role }]);
      setUsername("");
    } catch {
      setError("Failed to add agent.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(u: string) {
    try {
      await api.removeAgent(u);
      setAgents(agents.filter((a) => a.username !== u));
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Agent list */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {agents.length === 0 ? (
          <p className="px-4 py-6 text-gray-500 text-sm">No agents added yet.</p>
        ) : (
          agents.map((a) => (
            <div key={a.username} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-white">@{a.username}</p>
                <p className="text-xs text-gray-500 capitalize">{a.role}</p>
              </div>
              <button
                onClick={() => remove(a.username)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add agent */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
        <p className="text-sm font-medium text-white">Add Agent</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Telegram username (without @)"
          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="agent">Agent</option>
          <option value="super_admin">Super Admin</option>
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={add}
          disabled={adding || !username.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {adding ? "Adding…" : "Add Agent"}
        </button>
      </div>
    </div>
  );
}
