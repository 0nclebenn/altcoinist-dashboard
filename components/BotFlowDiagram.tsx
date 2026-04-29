"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FlowButton {
  label: string;
  target: string;
}

interface FlowNode {
  state: string;
  message: string;
  buttons: FlowButton[][];
  tags: string[];
  ai?: boolean;
  escalate?: boolean;
  terminal?: boolean;
  scripted_reply?: boolean;
  collect_text?: boolean;
  trigger_key?: string;
  scripted_title?: string;
  scripted_content?: string;
  back_to?: string;
}

interface FlowTree {
  root: string;
  nodes: Record<string, FlowNode>;
}

interface Suggestion {
  id: number;
  parent_node: string;
  button_label: string;
  trigger_key: string;
  title: string;
  scripted_reply_content: string;
  occurrence_count: number;
  sample_queries: string | null;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function BotFlowDiagram() {
  const [tree, setTree] = useState<FlowTree | null>(null);
  const [treeError, setTreeError] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  const [running, setRunning] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);

  // Track which state nodes are expanded. Root is always shown.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.flowTree().catch(() => null),
      api.buttonSuggestions().catch(() => ({ suggestions: [] })),
    ]).then(([t, s]: [unknown, unknown]) => {
      if (cancelled) return;
      if (!t) {
        setTreeError(true);
      } else {
        setTree(t as FlowTree);
      }
      const sList = (s as { suggestions?: Suggestion[] })?.suggestions ?? [];
      setSuggestions(sList);
    });
    return () => { cancelled = true; };
  }, []);

  // Suggestions indexed by parent_node for fast lookup
  const suggestionsByParent = useMemo(() => {
    const map: Record<string, Suggestion[]> = {};
    for (const s of suggestions) {
      if (!map[s.parent_node]) map[s.parent_node] = [];
      map[s.parent_node].push(s);
    }
    return map;
  }, [suggestions]);

  function toggleExpanded(state: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  async function handleRunAnalysis() {
    setRunning(true);
    setAnalysisMsg(null);
    try {
      await api.runButtonAnalysis();
      // Backend runs analysis in background — give it a moment, then reload
      setAnalysisMsg("Running… this can take ~30 seconds. Reloading suggestions in 30s.");
      setTimeout(async () => {
        try {
          const fresh = await api.buttonSuggestions() as { suggestions?: Suggestion[] };
          const list = fresh.suggestions ?? [];
          setSuggestions(list);
          if (list.length === 0) {
            setAnalysisMsg("No suggestions at the moment. Try again later.");
          } else {
            setAnalysisMsg(`${list.length} suggestion${list.length === 1 ? "" : "s"} ready to review — highlighted in red below.`);
            // Auto-expand parent nodes that have suggestions so they're visible
            setExpanded((prev) => {
              const next = new Set(prev);
              for (const s of list) next.add(s.parent_node);
              return next;
            });
          }
        } catch {
          setAnalysisMsg("Could not fetch suggestions after analysis.");
        } finally {
          setRunning(false);
        }
      }, 30000);
    } catch {
      setAnalysisMsg("Failed to trigger analysis.");
      setRunning(false);
    }
  }

  async function handleApprove(suggestionId: number) {
    setPendingActionId(suggestionId);
    try {
      await api.approveButton(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch {
      alert("Could not approve. Try again.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject(suggestionId: number) {
    setPendingActionId(suggestionId);
    try {
      await api.rejectButton(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch {
      alert("Could not remove. Try again.");
    } finally {
      setPendingActionId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (treeError) {
    return (
      <p className="text-yellow-400 text-sm">
        Could not load the bot flow. Make sure the backend is reachable.
      </p>
    );
  }

  if (!tree) {
    return <p className="text-gray-500 text-sm">Loading flow…</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">Bot Flow</h2>
          <p className="text-sm text-gray-400">
            Click any button to expand its branch. Scripted replies show inline.
            Run analysis to surface gaps where users hit &quot;Something Else&quot;.
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          className="flex-shrink-0 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {running ? "Running…" : "Run analysis now"}
        </button>
      </div>

      {analysisMsg && (
        <div className="mb-4 px-3 py-2 text-xs text-indigo-200 bg-indigo-900/40 border border-indigo-800/60 rounded">
          {analysisMsg}
        </div>
      )}

      {/* Tree */}
      <div className="space-y-3">
        <FlowStateNode
          state={tree.root}
          tree={tree}
          expanded={expanded}
          onToggle={toggleExpanded}
          suggestionsByParent={suggestionsByParent}
          onApprove={handleApprove}
          onReject={handleReject}
          pendingActionId={pendingActionId}
          depth={0}
          ancestors={new Set([tree.root])}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowStateNode — recursive renderer for one state in the flow
// ─────────────────────────────────────────────────────────────────────────────

interface FlowStateNodeProps {
  state: string;
  tree: FlowTree;
  expanded: Set<string>;
  onToggle: (state: string) => void;
  suggestionsByParent: Record<string, Suggestion[]>;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  pendingActionId: number | null;
  depth: number;
  ancestors: Set<string>; // prevents cycles via ⬅️ Back buttons
}

function FlowStateNode({
  state,
  tree,
  expanded,
  onToggle,
  suggestionsByParent,
  onApprove,
  onReject,
  pendingActionId,
  depth,
  ancestors,
}: FlowStateNodeProps) {
  const node = tree.nodes[state];
  if (!node) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500 italic border border-gray-800 rounded">
        (missing state: {state})
      </div>
    );
  }

  const isLeaf = !node.buttons || node.buttons.length === 0;
  const nodeSuggestions = suggestionsByParent[state] ?? [];
  const hasSuggestions = nodeSuggestions.length > 0;

  // Tone the card by node type
  const cardTone = node.ai
    ? "border-purple-700/50 bg-purple-900/10"
    : node.escalate
    ? "border-orange-700/50 bg-orange-900/10"
    : node.scripted_reply
    ? "border-emerald-700/50 bg-emerald-900/10"
    : hasSuggestions
    ? "border-red-700/60 bg-red-900/10"
    : "border-gray-700 bg-gray-900";

  return (
    <div
      className={`rounded-xl border ${cardTone} overflow-hidden`}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth, 4) * 12}px` : 0 }}
    >
      {/* Header row */}
      <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-gray-500 truncate">{state}</span>
          {node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {node.tags.map((t) => (
                <span key={t} className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
          {node.ai && <NodeBadge color="purple">AI handoff</NodeBadge>}
          {node.escalate && <NodeBadge color="orange">Escalate</NodeBadge>}
          {node.terminal && <NodeBadge color="gray">Terminal</NodeBadge>}
          {node.collect_text && <NodeBadge color="blue">Collects text</NodeBadge>}
        </div>
      </div>

      {/* Bot message */}
      {node.message && (
        <div className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">
          {node.message}
        </div>
      )}

      {/* Scripted reply content */}
      {node.scripted_reply && node.scripted_content && (
        <div className="mx-4 mb-3 px-3 py-2 bg-emerald-900/20 border border-emerald-800/40 rounded">
          {node.scripted_title && (
            <p className="text-[10px] uppercase tracking-wide text-emerald-400 mb-1 font-semibold">
              {node.scripted_title}
            </p>
          )}
          <p className="text-xs text-emerald-100 whitespace-pre-wrap">{node.scripted_content}</p>
        </div>
      )}

      {/* Buttons */}
      {!isLeaf && (
        <div className="px-4 pb-3 space-y-1.5">
          {node.buttons.map((row, ri) => (
            <div key={ri} className="flex flex-wrap gap-1.5">
              {row.map((b) => (
                <FlowButtonChip
                  key={`${b.target}-${b.label}`}
                  button={b}
                  isExpanded={expanded.has(b.target)}
                  isCycleTarget={ancestors.has(b.target)}
                  targetExists={Boolean(tree.nodes[b.target])}
                  onClick={() => onToggle(b.target)}
                />
              ))}
            </div>
          ))}

          {/* Suggested buttons hanging off this parent */}
          {nodeSuggestions.map((s) => (
            <SuggestionChip
              key={s.id}
              suggestion={s}
              busy={pendingActionId === s.id}
              onApprove={() => onApprove(s.id)}
              onReject={() => onReject(s.id)}
            />
          ))}
        </div>
      )}

      {/* Children (rendered when expanded) */}
      {!isLeaf && (
        <div className="border-t border-gray-800/40 bg-black/20">
          {node.buttons.flatMap((row) =>
            row
              .filter((b) => expanded.has(b.target) && tree.nodes[b.target] && !ancestors.has(b.target))
              .map((b) => (
                <div key={`child-${b.target}`} className="px-3 py-3">
                  <FlowStateNode
                    state={b.target}
                    tree={tree}
                    expanded={expanded}
                    onToggle={onToggle}
                    suggestionsByParent={suggestionsByParent}
                    onApprove={onApprove}
                    onReject={onReject}
                    pendingActionId={pendingActionId}
                    depth={depth + 1}
                    ancestors={new Set([...ancestors, b.target])}
                  />
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowButtonChip — clickable button in the bot flow
// ─────────────────────────────────────────────────────────────────────────────

function FlowButtonChip({
  button,
  isExpanded,
  isCycleTarget,
  targetExists,
  onClick,
}: {
  button: FlowButton;
  isExpanded: boolean;
  isCycleTarget: boolean;
  targetExists: boolean;
  onClick: () => void;
}) {
  // Back/cycle buttons are visually muted and not clickable
  if (isCycleTarget || !targetExists) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-800 rounded-lg">
        {button.label}
        <span className="text-[9px] text-gray-600">→ {button.target}</span>
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors ${
        isExpanded
          ? "bg-indigo-600/30 border border-indigo-500 text-white"
          : "bg-gray-800 border border-gray-700 text-gray-200 hover:border-gray-500 hover:bg-gray-700"
      }`}
    >
      <span aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
      {button.label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuggestionChip — pending button suggestion, hanging off its parent
// ─────────────────────────────────────────────────────────────────────────────

function SuggestionChip({
  suggestion,
  busy,
  onApprove,
  onReject,
}: {
  suggestion: Suggestion;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const samples = (() => {
    try { return JSON.parse(suggestion.sample_queries || "[]") as string[]; }
    catch { return []; }
  })();

  return (
    <div className="mt-2 rounded-lg border border-red-700/70 bg-red-900/20 overflow-hidden animate-pulse-once">
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">
          Suggested
        </span>
        <span className="text-xs text-red-100 font-medium">&ldquo;{suggestion.button_label}&rdquo;</span>
        <span className="text-[10px] text-red-300/70">
          {suggestion.occurrence_count} occurrences
        </span>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-[10px] text-red-300 hover:text-red-100 underline ml-auto"
        >
          {showDetails ? "Hide" : "Preview"}
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="px-2 py-0.5 text-[10px] bg-green-700 hover:bg-green-600 text-white rounded disabled:opacity-50 transition-colors"
        >
          {busy ? "…" : "Approve"}
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="px-2 py-0.5 text-[10px] bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 transition-colors"
        >
          Remove
        </button>
      </div>
      {showDetails && (
        <div className="px-3 pb-3 border-t border-red-800/50 bg-black/20">
          <p className="text-[10px] uppercase tracking-wide text-red-300 mt-2 mb-1 font-semibold">
            Scripted reply that will be added
          </p>
          <p className="text-xs text-red-50 whitespace-pre-wrap">
            {suggestion.scripted_reply_content}
          </p>
          {samples.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wide text-red-300 mt-3 mb-1 font-semibold">
                Sample user queries
              </p>
              <ul className="space-y-1">
                {samples.map((q, i) => (
                  <li key={i} className="text-xs text-red-100/80 bg-black/30 rounded px-2 py-1">
                    &ldquo;{q}&rdquo;
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-[10px] text-red-300/60 mt-3">
            trigger: <span className="font-mono">{suggestion.trigger_key}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeBadge — small colored pill for node type
// ─────────────────────────────────────────────────────────────────────────────

function NodeBadge({ color, children }: { color: "purple" | "orange" | "gray" | "blue"; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    purple: "bg-purple-900/60 text-purple-300 border-purple-700/50",
    orange: "bg-orange-900/60 text-orange-300 border-orange-700/50",
    gray:   "bg-gray-800 text-gray-400 border-gray-700",
    blue:   "bg-blue-900/60 text-blue-300 border-blue-700/50",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[color]}`}>
      {children}
    </span>
  );
}
