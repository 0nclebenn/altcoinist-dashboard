import { api } from "@/lib/api";
import TeamManager from "@/components/TeamManager";

export default async function TeamPage() {
  let data: any = { agents: [] };
  try { data = await api.agents(); } catch {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Team</h1>
      <p className="text-gray-400 text-sm mb-6">Manage support agents and their roles.</p>
      <TeamManager initialAgents={data.agents} />
    </div>
  );
}
