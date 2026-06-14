"use client";

// Client-side conversation store (localStorage). No backend DB — history lives
// in the browser, ChatGPT-style. Per-device, survives reloads.

import type { AgentId } from "./agents";

export type Attachment = {
  id: string;
  kind: "image" | "text";
  name: string;
  mime: string;
  dataUrl?: string; // images
  text?: string; // text files
};

export type ToolEvent = { name: string; status: string; args?: any; result?: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  attachments?: Attachment[];
  tools?: ToolEvent[];
};

export type Conversation = {
  id: string;
  title: string;
  agentId: AgentId;
  model: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const KEY = "openclaw.conversations.v1";

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // localStorage quota (large image attachments) — drop oldest and retry once.
    try {
      const trimmed = list.slice(0, Math.max(1, list.length - 1));
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* give up silently */
    }
  }
}

export function newConversation(agentId: AgentId, model: string): Conversation {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    agentId,
    model,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Derive a short title from the first user message.
export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 40 ? t.slice(0, 40) + "…" : t || "New chat";
}
