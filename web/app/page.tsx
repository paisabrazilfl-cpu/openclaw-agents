"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AGENTS, type Agent, type AgentId } from "@/lib/agents";
import type { ModelOption } from "@/lib/providers";
import type { IntegrationStatus } from "@/lib/env";
import { Sidebar } from "@/components/Sidebar";
import { ToolsPanel } from "@/components/ToolsPanel";
import { Markdown } from "@/components/Markdown";

type ToolEvent = { name: string; status: string; args?: any; result?: string };
type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: Agent;
  tools: ToolEvent[];
};

const uid = () => Math.random().toString(36).slice(2);

export default function Page() {
  const [agentId, setAgentId] = useState<AgentId>("main");
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [model, setModel] = useState<string>("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[agentId];

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status);
        setModels(d.models ?? []);
        if (d.models?.length) setModel(d.models[0].model);
      })
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selectedModel = models.find((m) => m.model === model);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: UiMessage = { id: uid(), role: "user", content: text, tools: [] };
    const assistantId = uid();
    const history = [...messages, userMsg];
    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "", agent, tools: [] },
    ]);

    const update = (fn: (m: UiMessage) => UiMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          provider: selectedModel?.provider,
          model,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        update((m) => ({ ...m, content: `⚠️ ${e.error ?? "Request failed"}` }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: any;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "token") {
            update((m) => ({ ...m, content: m.content + ev.value }));
          } else if (ev.type === "tool") {
            update((m) => {
              const tools = [...m.tools];
              if (ev.status === "running") {
                tools.push({ name: ev.name, status: "running", args: ev.args });
              } else {
                // mark the latest matching running tool as done
                for (let i = tools.length - 1; i >= 0; i--) {
                  if (tools[i].name === ev.name && tools[i].status === "running") {
                    tools[i] = { ...tools[i], status: "done", result: ev.result };
                    break;
                  }
                }
              }
              return { ...m, tools };
            });
          } else if (ev.type === "error") {
            update((m) => ({ ...m, content: (m.content ? m.content + "\n\n" : "") + `⚠️ ${ev.error}` }));
          }
        }
      }
    } catch (e: any) {
      update((m) => ({ ...m, content: `⚠️ ${e?.message ?? String(e)}` }));
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages, agent, agentId, model, selectedModel]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activeAgent={agentId} onSelect={(id) => setAgentId(id)} status={status} />

      {/* Main column */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 bg-ink-900 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{agent.emoji}</span>
            <div>
              <div className="text-sm font-semibold">{agent.name}</div>
              <div className="text-[11px] text-slate-500">{agent.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-claw-600"
            >
              {models.length === 0 && <option>no models</option>}
              {models.map((m) => (
                <option key={`${m.provider}:${m.model}`} value={m.model}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setMessages([])}
              className="rounded-md border border-ink-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-ink-800"
            >
              Clear
            </button>
            <Link
              href="/settings"
              title="Settings · API keys"
              className="rounded-md border border-ink-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-ink-800"
            >
              ⚙️
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 && <EmptyState agent={agent} status={status} />}
            {messages.map((m) => (
              <MessageBubble key={m.id} m={m} busy={busy} />
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-ink-700 bg-ink-900 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Message ${agent.name}…  (Enter to send, Shift+Enter for newline)`}
              className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-ink-700 bg-ink-950 px-3.5 py-2.5 text-sm outline-none focus:border-claw-600"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="h-[44px] rounded-xl bg-claw-600 px-4 text-sm font-medium text-white transition hover:bg-claw-500 disabled:opacity-40"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>
      </main>

      {/* Tools panel */}
      <aside className="hidden w-80 shrink-0 border-l border-ink-700 bg-ink-900 lg:block">
        <ToolsPanel status={status} />
      </aside>
    </div>
  );
}

function EmptyState({ agent, status }: { agent: Agent; status: IntegrationStatus | null }) {
  return (
    <div className="mt-10 text-center">
      <div className="text-5xl">{agent.emoji}</div>
      <h2 className="mt-3 text-lg font-semibold text-slate-200">{agent.name}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{agent.role}</p>
      {status && !status.llm ? (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          No LLM provider is configured. Copy <code>web/.env.example</code> to{" "}
          <code>web/.env.local</code>, add a key (e.g. <code>OPENROUTER_API_KEY</code>), and restart.
        </p>
      ) : (
        <p className="mt-4 text-xs text-slate-600">Pick an agent on the left and start chatting.</p>
      )}
    </div>
  );
}

function MessageBubble({ m, busy }: { m: UiMessage; busy: boolean }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-claw-600 px-4 py-2.5 text-sm text-white">
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-xl leading-none">{m.agent?.emoji ?? "🐾"}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-medium text-slate-500">{m.agent?.name ?? "OpenClaw"}</div>
        {m.tools.map((t, i) => (
          <ToolChip key={i} t={t} />
        ))}
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
            : t.name === "web_crawl"
              ? `🕷️ Reading: ${t.args?.url ?? ""}`
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
