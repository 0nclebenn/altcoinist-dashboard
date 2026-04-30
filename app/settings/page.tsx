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
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-8 max-w-[1200px]">
      {/* Eyebrow + heading */}
      <div className="inline-flex items-center gap-2 mb-3">
        <span className="h-px w-6 bg-brand-400/40" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
          // configure your workspace
        </span>
      </div>
      <h1
        className="font-heading font-semibold gradient-heading leading-[1.05] mb-8"
        style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
      >
        Settings
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-8 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium font-heading transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-brand-400 text-white"
                : "border-transparent text-white/45 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Account" && <AccountProfile />}

      {activeTab === "Workspace" && (
        <ManageTeam currentRole={currentRole} currentAgent={currentAgent} />
      )}

      {activeTab === "Knowledge Base" && (
        kbLoaded ? (
          <div>
            {docUpdates.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-px w-6 bg-brand-400/40" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
                    // pending doc updates · {docUpdates.length}
                  </span>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <DocUpdateSuggestions suggestions={docUpdates as any} />
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-px w-6 bg-[#E8B34B]/40" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#E8B34B]/80">
                    // kb suggestions · {suggestions.length}
                  </span>
                </div>
                <KBSuggestions suggestions={suggestions} />
              </div>
            )}
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-6 bg-brand-400/40" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400/80">
                // scripted replies
              </span>
            </div>
            <div className="space-y-3">
              {replies.map((r) => {
                const reply = r as { id: number };
                return <KBEditor key={reply.id} reply={r} />;
              })}
              {replies.length === 0 && (
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  No scripted replies found.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Loading…</p>
        )
      )}

      {activeTab === "Bot Flow" && <BotFlowDiagram />}
    </div>
  );
}
