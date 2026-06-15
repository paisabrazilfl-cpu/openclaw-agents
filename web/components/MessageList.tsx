"use client";

import { Markdown } from "@/components/Markdown";
import { AGENTS } from "@/lib/agents";
import type { ChatMessage, ToolEvent } from "@/lib/store";

export function MessageList({ messages, busy }: { messages: ChatMessage[]; busy: boolean }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {messages.map((m) => (
        <Bubble key={m.id} m={m} busy={busy} />
      ))}
    </div>
  );
}

function Bubble({ m, busy }: { m: ChatMessage; busy: boolean }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.attachments && m.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {m.attachments.map((a) =>
              a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.id} src={a.dataUrl} alt={a.name} className="max-h-48 rounded-lg border border-ink-600" />
              ) : (
                <span key={a.id} className="flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-[11px] text-slate-300">
                  📄 {a.name}
                </span>
              ),
            )}
          </div>
        )}
        {m.content && (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-claw-600 px-4 py-2.5 text-sm text-white">
            {m.content}
          </div>
        )}
      </div>
    );
  }

  const agent = m.agentId ? AGENTS[m.agentId] : AGENTS.main;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-xl leading-none">{agent.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-medium text-slate-500">{agent.name}</div>
        {m.tools?.map((t, i) => <ToolChip key={i} t={t} />)}
        {m.content ? (
          <Markdown>{m.content}</Markdown>
        ) : busy ? (
          <div className="cursor-blink text-slate-500" />
        ) : null}
      </div>
    </div>
  );
}

function ToolChip({ t }: { t: ToolEvent }) {
  const label =
    t.name === "web_search"
      ? `🔎 Searching: ${t.args?.query ?? ""}`
      : t.name === "memory_search"
        ? `🧠 Recalling: ${t.args?.query ?? ""}`
        : t.name === "memory_save"
          ? "🧠 Saving to memory"
          : t.name === "run_code"
            ? "⚡ Running code"
            : t.name === "tabular_predict"
            ? `📊 TabPFN: ${t.args?.task ?? "classification"}`
            : t.name === "web_crawl"
              ? `🕷️ Reading: ${t.args?.url ?? ""}`
              : t.name === "browser"
                ? `🧭 Browsing: ${t.args?.url ?? ""}`
                : t.name === "github"
                ? `🐙 GitHub: ${t.args?.action ?? ""} ${t.args?.repo ?? ""}`
                : t.name === "composio"
                  ? `🤝 Composio: ${t.args?.action ?? ""}`
                  : t.name;
  return (
    <details className="mb-1.5 rounded-lg border border-ink-700 bg-ink-800/60 text-xs">
      <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-slate-400">
        <span className={t.status === "running" ? "animate-pulse" : ""}>{label}</span>
        <span className="ml-auto text-[10px] text-slate-600">{t.status}</span>
      </summary>
      {t.result && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-ink-700 p-2.5 text-[11px] text-slate-400">
          {t.result}
        </pre>
      )}
    </details>
  );
}
