"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AGENTS, AGENT_LIST, type AgentId } from "@/lib/agents";
import type { ModelOption } from "@/lib/providers";
import type { IntegrationStatus } from "@/lib/env";
import {
  loadConversations,
  saveConversations,
  newConversation,
  titleFrom,
  uid,
  type Attachment,
  type ChatMessage,
  type Conversation,
} from "@/lib/store";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Composer } from "@/components/Composer";
import { MessageList } from "@/components/MessageList";
import { ModelPicker } from "@/components/ModelPicker";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load persisted chats + integration status ──────────────────
  useEffect(() => {
    setMounted(true);
    const convs = loadConversations().sort((a, b) => b.updatedAt - a.updatedAt);
    setConversations(convs);
    if (convs.length) setActiveId(convs[0].id);

    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status);
        setModels(d.models ?? []);
        const firstModel = d.models?.[0]?.model ?? "openai/gpt-4o-mini";
        setConversations((prev) => {
          if (prev.length) return prev;
          const c = newConversation("main", firstModel);
          setActiveId(c.id);
          return [c];
        });
      })
      .catch(() => setStatus(null));
  }, []);

  // ── Persist on change ──────────────────────────────────────────
  useEffect(() => {
    if (mounted) saveConversations(conversations);
  }, [conversations, mounted]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, busy]);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );
  const agent = active ? AGENTS[active.agentId] : AGENTS.main;
  const selectedModel = models.find((m) => m.model === active?.model);

  // ── Conversation actions ───────────────────────────────────────
  const createChat = useCallback(
    (agentId: AgentId = "main") => {
      const model = active?.model || models[0]?.model || "openai/gpt-4o-mini";
      const c = newConversation(agentId, model);
      setConversations((p) => [c, ...p]);
      setActiveId(c.id);
      setDrawer(false);
    },
    [active?.model, models],
  );

  const deleteChat = (id: string) =>
    setConversations((p) => {
      const next = p.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });

  const renameChat = (id: string, title: string) =>
    setConversations((p) => p.map((c) => (c.id === id ? { ...c, title } : c)));

  const clearAll = () => {
    setConversations([]);
    setActiveId(null);
  };

  const patchActive = (fn: (c: Conversation) => Conversation) =>
    setConversations((p) => p.map((c) => (c.id === activeId ? fn(c) : c)));

  const patchMessage = (msgId: string, fn: (m: ChatMessage) => ChatMessage) =>
    setConversations((p) =>
      p.map((c) =>
        c.id === activeId
          ? { ...c, updatedAt: Date.now(), messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) }
          : c,
      ),
    );

  // ── Send ───────────────────────────────────────────────────────
  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (busy || !active) return;
      setBusy(true);

      const userMsg: ChatMessage = { id: uid(), role: "user", content: text, attachments };
      const assistantId = uid();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", agentId: active.agentId, tools: [] };
      const priorMessages = [...active.messages, userMsg];

      patchActive((c) => ({
        ...c,
        title: c.messages.length === 0 ? titleFrom(text || attachments[0]?.name || "New chat") : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, userMsg, assistantMsg],
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: active.agentId,
            provider: selectedModel?.provider,
            model: active.model,
            messages: priorMessages.map(toApiMessage),
          }),
        });

        if (!res.ok || !res.body) {
          const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          patchMessage(assistantId, (m) => ({ ...m, content: `⚠️ ${e.error ?? "Request failed"}` }));
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
              patchMessage(assistantId, (m) => ({ ...m, content: m.content + ev.value }));
            } else if (ev.type === "tool") {
              patchMessage(assistantId, (m) => {
                const tools = [...(m.tools ?? [])];
                if (ev.status === "running") tools.push({ name: ev.name, status: "running", args: ev.args });
                else
                  for (let i = tools.length - 1; i >= 0; i--)
                    if (tools[i].name === ev.name && tools[i].status === "running") {
                      tools[i] = { ...tools[i], status: "done", result: ev.result };
                      break;
                    }
                return { ...m, tools };
              });
            } else if (ev.type === "error") {
              patchMessage(assistantId, (m) => ({ ...m, content: (m.content ? m.content + "\n\n" : "") + `⚠️ ${ev.error}` }));
            }
          }
        }
      } catch (e: any) {
        patchMessage(assistantId, (m) => ({ ...m, content: `⚠️ ${e?.message ?? String(e)}` }));
      } finally {
        setBusy(false);
      }
    },
    [busy, active, selectedModel],
  );

  if (!mounted) return <div className="h-[100dvh] bg-ink-950" />;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-ink-950">
      {/* Sidebar: static on desktop, drawer on mobile/tablet */}
      <aside className="hidden w-72 shrink-0 border-r border-ink-700 lg:block">
        <ChatSidebar
          conversations={sorted}
          activeId={activeId}
          status={status}
          onSelect={(id) => setActiveId(id)}
          onNew={createChat}
          onDelete={deleteChat}
          onRename={renameChat}
          onClearAll={clearAll}
        />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] border-r border-ink-700 shadow-xl">
            <ChatSidebar
              conversations={sorted}
              activeId={activeId}
              status={status}
              onSelect={(id) => {
                setActiveId(id);
                setDrawer(false);
              }}
              onNew={createChat}
              onDelete={deleteChat}
              onRename={renameChat}
              onClearAll={clearAll}
              onClose={() => setDrawer(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-ink-700 bg-ink-900 px-3 py-2.5 sm:px-4">
          <button
            onClick={() => setDrawer(true)}
            className="rounded-md p-1.5 text-stone-400 hover:bg-ink-800 lg:hidden"
            aria-label="Menu"
          >
            ☰
          </button>
          <span className="text-lg sm:text-xl">{agent.emoji}</span>
          <select
            value={active?.agentId ?? "main"}
            onChange={(e) => patchActive((c) => ({ ...c, agentId: e.target.value as AgentId, updatedAt: Date.now() }))}
            className="max-w-[40vw] truncate rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-stone-200 outline-none focus:border-claw-600 sm:max-w-none"
          >
            {AGENT_LIST.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
          <div className="ml-auto min-w-0 max-w-[45vw] sm:max-w-xs">
            <ModelPicker
              models={models}
              value={active?.model ?? ""}
              onChange={(m) => patchActive((c) => ({ ...c, model: m, updatedAt: Date.now() }))}
            />
          </div>
          <Link href="/settings" title="Settings" className="shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-ink-800">
            ⚙️
          </Link>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">
          {!active || active.messages.length === 0 ? (
            <EmptyState agent={agent} status={status} />
          ) : (
            <MessageList messages={active.messages} busy={busy} />
          )}
        </div>

        <Composer disabled={busy || !active} agentName={agent.name} onSend={send} />
      </main>
    </div>
  );
}

// Convert a stored message to the API wire format, inlining attachments.
function toApiMessage(m: ChatMessage) {
  if (m.role === "user" && m.attachments?.length) {
    const textFiles = m.attachments.filter((a) => a.kind === "text");
    const images = m.attachments.filter((a) => a.kind === "image" && a.dataUrl);
    let text = m.content || "";
    for (const tf of textFiles) text += `\n\n--- File: ${tf.name} ---\n${tf.text ?? ""}`;
    const parts: any[] = [{ type: "text", text: text.trim() || "(see attached files)" }];
    for (const im of images) parts.push({ type: "image_url", image_url: { url: im.dataUrl } });
    return { role: m.role, content: parts };
  }
  return { role: m.role, content: m.content };
}

function EmptyState({ agent, status }: { agent: { emoji: string; name: string; role: string }; status: IntegrationStatus | null }) {
  return (
    <div className="mx-auto mt-8 max-w-md text-center sm:mt-16">
      <div className="text-5xl">{agent.emoji}</div>
      <h2 className="mt-3 text-lg font-semibold text-stone-200">{agent.name}</h2>
      <p className="mt-1 text-sm text-stone-500">{agent.role}</p>
      {status && !status.llm ? (
        <p className="mx-auto mt-5 max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          No LLM provider is configured. Add a key in <Link href="/settings" className="underline">Settings</Link> to start chatting.
        </p>
      ) : (
        <p className="mt-5 text-xs text-stone-600">Type below, attach files with 📎, or pick another agent.</p>
      )}
    </div>
  );
}
