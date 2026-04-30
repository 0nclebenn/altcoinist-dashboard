"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FlowButton { label: string; target: string; }

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

interface FlowTree { root: string; nodes: Record<string, FlowNode>; }

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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BACK_LABEL_RX = /^⬅️/;

/** Forward buttons only — strip "Back" navigation, which would be cycles. */
function forwardButtons(node: FlowNode): FlowButton[] {
  const out: FlowButton[] = [];
  for (const row of node.buttons) {
    for (const btn of row) {
      if (BACK_LABEL_RX.test(btn.label)) continue;
      out.push(btn);
    }
  }
  return out;
}

/** Title-case a state name like "prob_alt_deposits" → "Prob Alt Deposits". */
function titleizeState(state: string): string {
  return state
    .replace(/^sr_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function BotFlowDiagram() {
  const [tree, setTree] = useState<FlowTree | null>(null);
  const [treeError, setTreeError] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [path, setPath] = useState<string[]>([]);   // states from root → current selected leaf
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);

  // ── Load tree + suggestions ────────────────────────────────────────────────
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
        const tt = t as FlowTree;
        setTree(tt);
        setPath([tt.root]);
      }
      const sList = (s as { suggestions?: Suggestion[] })?.suggestions ?? [];
      setSuggestions(sList);
    });
    return () => { cancelled = true; };
  }, []);

  const suggestionsByParent = useMemo(() => {
    const map: Record<string, Suggestion[]> = {};
    for (const s of suggestions) {
      if (!map[s.parent_node]) map[s.parent_node] = [];
      map[s.parent_node].push(s);
    }
    return map;
  }, [suggestions]);

  // ── Path navigation ────────────────────────────────────────────────────────

  function handleButtonClick(parentIndex: number, target: string) {
    if (!tree?.nodes[target]) return;          // skip dangling targets (shouldn't happen)
    setPath((prev) => {
      // Toggle: if this target is already the next state, collapse
      if (prev[parentIndex + 1] === target) {
        return prev.slice(0, parentIndex + 1);
      }
      return [...prev.slice(0, parentIndex + 1), target];
    });
  }

  // ── Run analysis ───────────────────────────────────────────────────────────

  async function handleRunAnalysis() {
    setRunning(true);
    setAnalysisMsg(null);
    try {
      await api.runButtonAnalysis();
      setAnalysisMsg("Running… this can take ~30 seconds. Reloading suggestions in 30s.");
      setTimeout(async () => {
        try {
          const fresh = await api.buttonSuggestions() as { suggestions?: Suggestion[] };
          const list = fresh.suggestions ?? [];
          setSuggestions(list);
          if (list.length === 0) {
            setAnalysisMsg("No suggestions at the moment. Try again later.");
          } else {
            setAnalysisMsg(`${list.length} suggestion${list.length === 1 ? "" : "s"} ready — open the parent in red to review.`);
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
  if (!tree || path.length === 0) {
    return <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">Loading flow…</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 max-w-3xl mx-auto">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">Bot Flow</h2>
          <p className="text-sm text-white/55">
            Click a button to drill into the next step. Click again to collapse.
            Run analysis to surface gaps where users hit &quot;Something Else&quot;.
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          className="flex-shrink-0 px-3 py-1.5 text-xs bg-brand-400 hover:bg-brand-300 text-black font-bold rounded-lg disabled:opacity-50 transition-colors"
        >
          {running ? "Running…" : "Run analysis now"}
        </button>
      </div>

      {analysisMsg && (
        <div className="max-w-3xl mx-auto mb-4 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-brand-300 bg-brand-400/[0.06] border border-brand-400/20 rounded">
          {analysisMsg}
        </div>
      )}

      {/* Diagram */}
      <div className="flex flex-col items-center w-full pb-16">
        {path.map((state, i) => {
          const node = tree.nodes[state];
          if (!node) return null;
          const fwd = forwardButtons(node);
          const selectedNext = path[i + 1];
          const isLastInPath = i === path.length - 1;
          const isFirst = i === 0;
          const sugForParent = suggestionsByParent[state] ?? [];
          const hasButtons = fwd.length > 0;

          // Title for non-root cards = full button label that led here, emoji included.
          let title: string | undefined;
          if (!isFirst) {
            const parent = tree.nodes[path[i - 1]];
            const incomingBtn = parent
              ? parent.buttons.flat().find((b) => b.target === state)
              : undefined;
            if (incomingBtn) title = incomingBtn.label.trim();
          }

          return (
            <Fragment key={state}>
              <StateCard node={node} isRoot={isFirst} title={title} />

              {hasButtons && (
                <>
                  {/* Plain line into the rail — chevron would float in space */}
                  <Arrow chevron={false} />
                  <ButtonRow
                    buttons={fwd}
                    selected={selectedNext}
                    onClick={(target) => handleButtonClick(i, target)}
                    suggestions={sugForParent}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    pendingActionId={pendingActionId}
                  />
                  {/* Chevron arrow into the next card only when one is selected */}
                  {!isLastInPath && <Arrow />}
                </>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StateCard — Mava-style card with title, message, metadata strip
// ─────────────────────────────────────────────────────────────────────────────

function StateCard({ node, isRoot, title: titleOverride }: { node: FlowNode; isRoot: boolean; title?: string }) {
  const cardTone = node.ai
    ? "border-purple-700/50"
    : node.escalate
    ? "border-orange-700/50"
    : node.scripted_reply
    ? "border-emerald-700/50"
    : "border-white/[0.08]";

  const title = isRoot
    ? "Initial Message"
    : (titleOverride && titleOverride.length > 0)
    ? titleOverride
    : titleizeState(node.state);
  const dotColor =
    node.ai ? "bg-purple-500" :
    node.escalate ? "bg-orange-500" :
    node.scripted_reply ? "bg-emerald-500" :
    isRoot ? "bg-brand-400" :
    "bg-gray-400";

  return (
    <div className={`w-full max-w-2xl rounded-2xl border ${cardTone} card-base p-5 group relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {node.ai && <NodeBadge color="purple">AI handoff</NodeBadge>}
        {node.escalate && <NodeBadge color="orange">Escalate</NodeBadge>}
        {node.terminal && <NodeBadge color="gray">Terminal</NodeBadge>}
        {node.collect_text && <NodeBadge color="blue">Collects text</NodeBadge>}
        <span className="ml-auto text-[10px] font-mono text-white/40">{node.state}</span>
      </div>

      {/* Bot message */}
      {node.message && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 mb-3">
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{node.message}</p>
        </div>
      )}

      {/* Scripted reply content */}
      {node.scripted_reply && node.scripted_content && (
        <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/15 px-3 py-2.5 mb-3">
          {node.scripted_title && (
            <p className="text-[10px] uppercase tracking-wide text-emerald-400 mb-1 font-semibold">
              {node.scripted_title}
            </p>
          )}
          <p className="text-xs text-emerald-100 whitespace-pre-wrap">{node.scripted_content}</p>
        </div>
      )}

      {/* AI handoff hint */}
      {node.ai && !node.scripted_reply && (
        <div className="rounded-lg border border-purple-800/40 bg-purple-900/15 px-3 py-2.5 mb-3">
          <p className="text-xs text-purple-200">
            From here Claude takes over and answers the user&apos;s free-text question.
            Up to 2 attempts before the ticket escalates to a human.
          </p>
        </div>
      )}

      {/* Escalation hint */}
      {node.escalate && (
        <div className="rounded-lg border border-orange-800/40 bg-orange-900/15 px-3 py-2.5 mb-3">
          <p className="text-xs text-orange-200">
            Immediate escalation to a human. The user is told to message the support team directly.
          </p>
        </div>
      )}

      {/* Metadata strip — Mava-style pills */}
      <div className="flex items-center gap-3 text-[10px] text-white/40">
        <MetaPill label="Category" value={node.tags[0]} />
        <MetaPill label="Tag"      value={node.tags[1]} />
        <MetaPill label="Priority" value={node.escalate ? "high" : node.ai ? "medium" : "low"} />
        <MetaPill
          label="Status"
          value={
            node.terminal     ? "closed"   :
            node.scripted_reply ? "resolved" :
            node.escalate     ? "escalated" :
            node.ai           ? "ai"        :
            "open"
          }
        />
      </div>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-white/40">{label}</span>
      <span className="text-gray-300 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
        {value || "—"}
      </span>
    </span>
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Arrow — vertical line + chevron
// ─────────────────────────────────────────────────────────────────────────────

function Arrow({ chevron = true }: { chevron?: boolean }) {
  return (
    <div className="flex flex-col items-center my-1.5" aria-hidden="true">
      <span className="block w-px h-5 bg-gray-700" />
      {chevron && (
        <svg width="10" height="6" viewBox="0 0 10 6" className="text-gray-700 -mt-px">
          <path d="M0 0 L5 6 L10 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ButtonRow — horizontal row of clickable button pills + suggestions
// ─────────────────────────────────────────────────────────────────────────────

function ButtonRow({
  buttons,
  selected,
  onClick,
  suggestions,
  onApprove,
  onReject,
  pendingActionId,
}: {
  buttons: FlowButton[];
  selected?: string;
  onClick: (target: string) => void;
  suggestions: Suggestion[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  pendingActionId: number | null;
}) {
  // Above each button we draw a half-rail on the left, a vertical drop, and a
  // half-rail on the right. The first column hides its left half, the last
  // hides its right — together they form a continuous horizontal rail with
  // drops to each button head.
  return (
    <div className="w-full max-w-2xl flex flex-col items-center">
      {/* Branching connector + button heads */}
      <div className="flex items-stretch justify-center">
        {buttons.map((b, i) => {
          const isFirst = i === 0;
          const isLast = i === buttons.length - 1;
          return (
            <div key={`${b.target}-${b.label}`} className="flex flex-col items-center px-1.5">
              <div className="flex items-start self-stretch">
                <div className={`flex-1 h-px ${isFirst ? "bg-transparent" : "bg-gray-700"}`} />
                <div className="w-px h-4 bg-gray-700" />
                <div className={`flex-1 h-px ${isLast ? "bg-transparent" : "bg-gray-700"}`} />
              </div>
              <button
                onClick={() => onClick(b.target)}
                className={`inline-flex items-center gap-2 px-3 h-8 text-xs rounded-lg border transition-colors ${
                  selected === b.target
                    ? "bg-brand-400 border-brand-400 text-black"
                    : "bg-white/[0.02] border-white/[0.08] text-white/85 hover:border-brand-400/40 hover:bg-white/[0.04]"
                }`}
              >
                <DragHandle />
                <span className="truncate max-w-[200px]">{b.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Pending suggestions below the row, also rail-connected to the parent */}
      {suggestions.length > 0 && (
        <div className="mt-2 flex items-stretch justify-center">
          {suggestions.map((s, i) => {
            const isFirst = i === 0;
            const isLast = i === suggestions.length - 1;
            return (
              <div key={s.id} className="flex flex-col items-center px-1.5">
                <div className="flex items-start self-stretch">
                  <div className={`flex-1 h-px ${isFirst ? "bg-transparent" : "bg-red-700/70"}`} />
                  <div className="w-px h-4 bg-red-700/70" />
                  <div className={`flex-1 h-px ${isLast ? "bg-transparent" : "bg-red-700/70"}`} />
                </div>
                <SuggestionChip
                  suggestion={s}
                  busy={pendingActionId === s.id}
                  onApprove={() => onApprove(s.id)}
                  onReject={() => onReject(s.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DragHandle() {
  return (
    <span className="text-white/40 select-none" aria-hidden="true">⋮⋮</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuggestionChip — pending button suggestion, hanging off its parent row
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
    <div className="rounded-lg border border-red-700/70 bg-red-900/20 overflow-hidden">
      <div className="px-3 h-8 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">
          Suggested
        </span>
        <span className="text-xs text-red-100 font-medium truncate max-w-[160px]">
          &ldquo;{suggestion.button_label}&rdquo;
        </span>
        <span className="text-[10px] text-red-300/70">
          {suggestion.occurrence_count}×
        </span>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-[10px] text-red-300 hover:text-red-100 underline"
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
