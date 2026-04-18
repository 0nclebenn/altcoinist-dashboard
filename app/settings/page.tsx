"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import TeamManager from "@/components/TeamManager";
import KBEditor from "@/components/KBEditor";
import KBSuggestions from "@/components/KBSuggestions";

const TABS = ["Team", "Knowledge Base"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Team");

  // Team data
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);

  // KB data
  const [replies, setReplies] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [kbLoaded, setKbLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "Team" && !agentsLoaded) {
      api.agents()
        .then((d: any) => setAgents(d.agents ?? []))
        .catch(() => {})
        .finally(() => setAgentsLoaded(true));
    }
    if (activeTab === "Knowledge Base" && !kbLoaded) {
      Promise.all([api.scriptedReplies(), api.kbSuggestions()])
        .then(([r, s]: any[]) => {
          setReplies(r.replies ?? []);
          setSuggestions(s.suggestions ?? []);
        })
        .catch(() => {})
        .finally(() => setKbLoaded(true));
    }
  }, [activeTab, agentsLoaded, kbLoaded]);

  return (
    <div className="flex flex-col h-full p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-1 border-b border-gray-800 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Team" && (
        agentsLoaded
          ? <TeamManager initialAgents={agents} />
          : <p className="text-gray-500 text-sm">Loading…</p>
      )}

      {activeTab === "Knowledge Base" && (
        kbLoaded ? (
          <div>
            {suggestions.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-yellow-400">
                  ⚡ {suggestions.length} Pending Suggestion{suggestions.length !== 1 ? "s" : ""}
                </h2>
                <KBSuggestions suggestions={suggestions} />
              </div>
            )}
            <h2 className="text-lg font-semibold mb-4">Scripted Replies</h2>
            <div className="space-y-3">
              {replies.map((r: any) => (
                <KBEditor key={r.id} reply={r} />
              ))}
              {replies.length === 0 && (
                <p className="text-gray-500 text-sm">No scripted replies found.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading…</p>
        )
      )}
    </div>
  );
}
