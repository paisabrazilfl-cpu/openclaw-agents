import { NextRequest } from "next/server";
import { getAgent } from "@/lib/agents";
import {
  llmFetch,
  resolveProvider,
  type ChatMessage,
  type ContentPart,
  type Provider,
} from "@/lib/providers";
import { toolsForAgent, executeTool } from "@/lib/tools";
import { RunTrace } from "@/lib/observability";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOOL_ROUNDS = 5;
const encoder = new TextEncoder();

type ClientMessage = { role: "user" | "assistant"; content: string | ContentPart[] };

// Flatten a (possibly multimodal) content value to plain text for tracing/titles.
function asText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map((p) => (p.type === "text" ? p.text : "[image]"))
    .join(" ");
}

// Accumulate streamed tool_call deltas keyed by their index.
type PartialToolCall = { id: string; name: string; args: string };

export async function POST(req: NextRequest) {
  let payload: {
    agentId?: string;
    provider?: Provider;
    model?: string;
    messages?: ClientMessage[];
  };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agent = getAgent(payload.agentId ?? "main");
  const provider = resolveProvider(payload.provider);
  if (!provider) {
    return Response.json(
      { error: "No LLM provider configured. Set OPENROUTER_API_KEY (or OPENAI/GEMINI/NVIDIA) in .env." },
      { status: 400 },
    );
  }
  const model = payload.model || env.defaultModel;
  const tools = toolsForAgent(agent);

  const messages: ChatMessage[] = [
    { role: "system", content: agent.system },
    ...(payload.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const lastUser = [...(payload.messages ?? [])].reverse().find((m) => m.role === "user");
  const trace = new RunTrace({
    agent: agent.id,
    model,
    provider,
    input: lastUser ? asText(lastUser.content) : "",
  });
  const toolsUsed: string[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const body: Record<string, unknown> = {
            model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: env.maxTokens,
          };
          if (tools.length) {
            body.tools = tools;
            body.tool_choice = "auto";
          }

          const res = await llmFetch(provider, body);
          if (!res.ok || !res.body) {
            const detail = await res.text().catch(() => "");
            const error = `LLM error ${res.status}: ${detail.slice(0, 500)}`;
            send({ type: "error", error });
            void trace.finish("", error, toolsUsed);
            controller.close();
            return;
          }

          const { content, toolCalls } = await consumeSSE(res.body, (token) =>
            send({ type: "token", value: token }),
          );

          // No tool calls → this was the final answer.
          if (!toolCalls.length) {
            send({ type: "done" });
            void trace.finish(content, undefined, toolsUsed);
            controller.close();
            return;
          }
          for (const c of toolCalls) toolsUsed.push(c.name);

          // Record the assistant turn that requested the tools.
          messages.push({
            role: "assistant",
            content: content || null,
            tool_calls: toolCalls.map((t) => ({
              id: t.id,
              type: "function",
              function: { name: t.name, arguments: t.args },
            })),
          });

          // Execute each tool and feed results back.
          for (const call of toolCalls) {
            let parsed: any = {};
            try {
              parsed = call.args ? JSON.parse(call.args) : {};
            } catch {
              /* leave as {} on malformed args */
            }
            send({ type: "tool", name: call.name, args: parsed, status: "running" });
            const result = await executeTool(call.name, parsed);
            send({ type: "tool", name: call.name, status: "done", result });
            messages.push({ role: "tool", tool_call_id: call.id, content: result });
          }
        }

        const capped = `Stopped after ${MAX_TOOL_ROUNDS} tool rounds.`;
        send({ type: "error", error: capped });
        void trace.finish("", capped, toolsUsed);
        controller.close();
      } catch (e: any) {
        const error = e?.message ?? String(e);
        send({ type: "error", error });
        void trace.finish("", error, toolsUsed);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// Parse an OpenAI-style SSE stream, emitting content tokens via onToken and
// accumulating any tool calls. Returns the final content + tool calls.
async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onToken: (t: string) => void,
): Promise<{ content: string; toolCalls: PartialToolCall[] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const partials: Record<number, PartialToolCall> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;

      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;

      if (typeof delta.content === "string" && delta.content) {
        content += delta.content;
        onToken(delta.content);
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const p = (partials[idx] ??= { id: "", name: "", args: "" });
          if (tc.id) p.id = tc.id;
          if (tc.function?.name) p.name = tc.function.name;
          if (tc.function?.arguments) p.args += tc.function.arguments;
        }
      }
    }
  }

  return { content, toolCalls: Object.values(partials).filter((t) => t.name) };
}
