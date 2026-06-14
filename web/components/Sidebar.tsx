"use client";

import { AGENT_LIST, type AgentId } from "@/lib/agents";
import type { IntegrationStatus } from "@/lib/env";

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-400" : "bg-slate-600"}`}
      title={on ? "configured" : "not configured"}
    />
  );
}

export function Sidebar({
  activeAgent,
  onSelect,
  status,
}: {
  activeAgent: AgentId;
  onSelect: (id: AgentId) => void;
  status: IntegrationStatus | null;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-2xl">🐾</span>
        <div>
          <div className="font-semibold leading-tight">OpenClaw</div>
          <div className="text-xs text-slate-500">Console · MVP</div>
        </div>
      </div>

      <div className="px-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        Fleet
      </div>
      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {AGENT_LIST.map((a) => {
          const active = a.id === activeAgent;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                active ? "bg-claw-600/20 ring-1 ring-claw-600/40" : "hover:bg-ink-800"
              }`}
            >
              <span className="text-lg leading-none">{a.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-100">{a.name}</span>
                <span className="block truncate text-[11px] text-slate-500">{a.role}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-ink-700 px-4 py-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Integrations
        </div>
        <ul className="space-y-1.5 text-xs text-slate-400">
          <li className="flex items-center gap-2">
            <Dot on={!!status?.llm} /> LLM provider
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!status?.search} /> Web search
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!status?.crawl} /> Web crawl
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!status?.memory} /> Vector memory
          </li>
          <li className="flex items-center gap-2">
            <Dot on={!!status?.exec} /> Code execution
          </li>
        </ul>
        {status && !status.llm && (
          <p className="mt-2 text-[11px] leading-snug text-amber-400/80">
            No LLM key found. Add one to <code>web/.env.local</code> to start chatting.
          </p>
        )}
      </div>
    </aside>
  );
}
