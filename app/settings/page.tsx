"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import AccountProfile from "@/components/AccountProfile";
import ManageTeam from "@/components/ManageTeam";
import KBEditor from "@/components/KBEditor";
import KBSuggestions from "@/components/KBSuggestions";
import DocUpdateSuggestions from "@/components/DocUpdateSuggestions";
import ButtonSuggestions from "@/components/ButtonSuggestions";

const TABS = ["Account", "Workspace", "Knowledge Base", "Bot Flow"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { currentRole, currentAgent, loading: roleLoading } = useRole();

  const visibleTabs: readonly Tab[] =
    currentRole === "moderator" ? (["Account"] as const) : TABS;

  const [activeTab, setActiveTab] = useState<Tab>("Account");

  // KB data
  const [replies, setReplies] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [docUpdates, setDocUpdates] = useState<any[]>([]);
  const [kbLoaded, setKbLoaded] = useState(false);

  // Bot flow data
  const [buttonSuggestions, setButtonSuggestions] = useState<any[]>([]);
  const [flowLoaded, setFlowLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "Knowledge Base" && !kbLoaded) {
      Promise.all([api.scriptedReplies(), api.kbSuggestions(), api.docUpdateSuggestions()])
        .then(([r, s, d]: any[]) => {
          setReplies(r.replies ?? []);
          setSuggestions(s.suggestions ?? []);
          setDocUpdates(d.suggestions ?? []);
        })
        .catch(() => {})
        .finally(() => setKbLoaded(true));
    }
    if (activeTab === "Bot Flow" && !flowLoaded) {
      api.buttonSuggestions()
        .then((d: any) => setButtonSuggestions(d.suggestions ?? []))
        .catch(() => {})
        .finally(() => setFlowLoaded(true));
    }
  }, [activeTab, kbLoaded, flowLoaded]);

  const reloadButtonSuggestions = useCallback(() => {
    api.buttonSuggestions()
      .then((d: any) => setButtonSuggestions(d.suggestions ?? []))
      .catch(() => {});
  }, []);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
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
                <DocUpdateSuggestions suggestions={docUpdates} />
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

      {activeTab === "Bot Flow" && (
        flowLoaded ? (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1">Bot Flow Suggestions</h2>
              <p className="text-sm text-gray-400">
                Weekly analysis scans conversations that hit "Something Else" and suggests new buttons
                to add. Approving a suggestion adds the button live to the bot and writes the scripted
                reply to the Google Doc — no code deploy needed.
              </p>
            </div>
            <ButtonSuggestions
              suggestions={buttonSuggestions}
              onRunAnalysis={reloadButtonSuggestions}
            />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading…</p>
        )
      )}
    </div>
  );
}
