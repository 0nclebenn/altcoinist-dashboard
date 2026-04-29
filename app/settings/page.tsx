"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import AccountProfile from "@/components/AccountProfile";
import ManageTeam from "@/components/ManageTeam";
import KBEditor from "@/components/KBEditor";
import KBSuggestions from "@/components/KBSuggestions";
import DocUpdateSuggestions from "@/components/DocUpdateSuggestions";
import BotFlowDiagram from "@/components/BotFlowDiagram";

const TABS = ["Account", "Workspace", "Knowledge Base", "Bot Flow"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { currentRole, currentAgent, loading: roleLoading } = useRole();

  const visibleTabs: readonly Tab[] =
    currentRole === "moderator" ? (["Account"] as const) : TABS;

  const [activeTab, setActiveTab] = useState<Tab>("Account");

  // KB data — downstream components (KBEditor, KBSuggestions, DocUpdateSuggestions)
  // accept loose row shapes, so we use unknown[] here and let them pin their own props.
  const [replies, setReplies] = useState<unknown[]>([]);
  const [suggestions, setSuggestions] = useState<unknown[]>([]);
  const [docUpdates, setDocUpdates] = useState<unknown[]>([]);
  const [kbLoaded, setKbLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "Knowledge Base" && !kbLoaded) {
      Promise.all([api.scriptedReplies(), api.kbSuggestions(), api.docUpdateSuggestions()])
        .then(([r, s, d]) => {
          setReplies(((r as { replies?: unknown[] })?.replies) ?? []);
          setSuggestions(((s as { suggestions?: unknown[] })?.suggestions) ?? []);
          setDocUpdates(((d as { suggestions?: unknown[] })?.suggestions) ?? []);
        })
        .catch(() => {})
        .finally(() => setKbLoaded(true));
    }
  }, [activeTab, kbLoaded]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-1 border-b border-gray-800 mb-8">
        {visibleTabs.map((tab) => (
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

      {activeTab === "Account" && <AccountProfile />}

      {activeTab === "Workspace" && (
        <ManageTeam
          currentRole={currentRole}
          currentAgent={currentAgent}
        />
      )}

      {activeTab === "Knowledge Base" && (
        kbLoaded ? (
          <div>
            {docUpdates.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4 text-green-400">
                  📝 {docUpdates.length} Pending Doc Update{docUpdates.length !== 1 ? "s" : ""}
                </h2>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <DocUpdateSuggestions suggestions={docUpdates as any} />
              </div>
            )}
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
              {replies.map((r) => {
                const reply = r as { id: number };
                return <KBEditor key={reply.id} reply={r} />;
              })}
              {replies.length === 0 && (
                <p className="text-gray-500 text-sm">No scripted replies found.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading…</p>
        )
      )}

      {activeTab === "Bot Flow" && <BotFlowDiagram />}
    </div>
  );
}
