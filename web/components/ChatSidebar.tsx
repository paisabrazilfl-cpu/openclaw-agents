"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENT_LIST, type AgentId } from "@/lib/agents";
import type { Conversation } from "@/lib/store";
import type { IntegrationStatus } from "@/lib/env";

export function ChatSidebar({
  conversations,
  activeId,
  status,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onClearAll,
  onClose,
}: {
  conversations: Conversation[];
  activeId: string | null;
  status: IntegrationStatus | null;
  onSelect: (id: string) => void;
  onNew: (agentId?: AgentId) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
}) {
  const [showFleet, setShowFleet] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (editId) onRename(editId, draft.trim() || "Untitled");
    setEditId(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-ink-900">
      {/* Brand + new chat */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <span className="text-sm font-semibold">OpenClaw</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md px-2 py-1 text-stone-400 hover:bg-ink-800 lg:hidden">
            ✕
          </button>
        )}
      </div>
      <div className="px-3">
        <button
          onClick={() => onNew()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-claw-600 px-3 py-2 text-sm font-medium text-white hover:bg-claw-500"
        >
          ＋ New chat
        </button>
        <button
          onClick={() => setShowFleet((s) => !s)}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-stone-400 hover:bg-ink-800"
        >
          <span>🤖 New chat with agent…</span>
          <span>{showFleet ? "▴" : "▾"}</span>
        </button>
        {showFleet && (
          <div className="mt-1 space-y-0.5 rounded-lg border border-ink-700 p-1">
            {AGENT_LIST.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onNew(a.id);
                  setShowFleet(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-ink-800"
              >
                <span>{a.emoji}</span>
                <span className="truncate text-stone-200">{a.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-3 flex items-center justify-between px-4 text-[11px] font-medium uppercase tracking-wider text-stone-500">
        <span>Chats</span>
        {conversations.length > 0 && (
          <button onClick={onClearAll} className="text-stone-600 hover:text-rose-400">
            clear all
          </button>
        )}
      </div>
      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-xs text-stone-600">No chats yet.</p>
        )}
        {conversations.map((c) => {
          const active = c.id === activeId;
          const agent = AGENT_LIST.find((a) => a.id === c.agentId);
          return (
            <div
              key={c.id}
              className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 ${
                active ? "bg-claw-600/20 ring-1 ring-claw-600/40" : "hover:bg-ink-800"
              }`}
            >
              <span className="text-base leading-none">{agent?.emoji ?? "🐾"}</span>
              {editId === c.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") setEditId(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-ink-600 bg-ink-950 px-1.5 py-0.5 text-xs outline-none"
                />
              ) : (
                <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 truncate text-left text-sm text-stone-200">
                  {c.title}
                </button>
              )}
              <button
                onClick={() => {
                  setEditId(c.id);
                  setDraft(c.title);
                }}
                title="Rename"
                className="shrink-0 text-stone-600 opacity-0 hover:text-stone-300 group-hover:opacity-100"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(c.id)}
                title="Delete"
                className="shrink-0 text-stone-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"
              >
                🗑
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer status + settings */}
      <div className="border-t border-ink-700 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Integrations</span>
          <Link href="/settings" className="text-xs text-claw-400 hover:text-claw-500">
            ⚙️ Settings
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-stone-400">
          <Stat on={!!status?.llm} label="LLM" />
          <Stat on={!!status?.search} label="Search" />
          <Stat on={!!status?.memory} label="Memory" />
          <Stat on={!!status?.exec} label="Code" />
          <Stat on={!!status?.github} label="GitHub" />
          <Stat on={!!status?.composio} label="Composio" />
        </div>
      </div>
    </div>
  );
}

function Stat({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-stone-600"}`} />
      {label}
    </span>
  );
}
