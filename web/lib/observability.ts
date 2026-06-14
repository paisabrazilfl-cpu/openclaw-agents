// Telemetry: traces each chat run to LangSmith and emits an event to Inngest.
// Both are best-effort and fire-and-forget — a failure here never affects the
// user's chat. No-ops when the corresponding key isn't configured.

import { env } from "./env";

const LANGSMITH_BASE =
  process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";

async function langsmithStart(name: string, inputs: unknown): Promise<string | null> {
  if (!env.langchain) return null;
  const id = crypto.randomUUID();
  try {
    await fetch(`${LANGSMITH_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.langchain },
      body: JSON.stringify({
        id,
        name,
        run_type: "llm",
        inputs,
        start_time: new Date().toISOString(),
        session_name: env.langchainProject,
      }),
    });
    return id;
  } catch {
    return null;
  }
}

async function langsmithEnd(id: string, outputs: unknown, error?: string): Promise<void> {
  if (!env.langchain) return;
  try {
    await fetch(`${LANGSMITH_BASE}/runs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": env.langchain },
      body: JSON.stringify({
        outputs,
        error,
        end_time: new Date().toISOString(),
      }),
    });
  } catch {
    /* ignore */
  }
}

// Emit an event to Inngest's event API (https://inn.gs/e/<eventKey>).
export async function inngestSend(name: string, data: Record<string, unknown>): Promise<void> {
  if (!env.inngestEventKey) return;
  try {
    await fetch(`https://inn.gs/e/${env.inngestEventKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data, ts: Date.now() }),
    });
  } catch {
    /* ignore */
  }
}

export type RunMeta = {
  agent: string;
  model: string;
  provider: string;
  input: string;
};

// One trace per chat turn. start() is fire-and-forget; finish() patches the
// LangSmith run and emits an Inngest completion event.
export class RunTrace {
  private idPromise: Promise<string | null>;
  private meta: RunMeta;
  private startedAt = Date.now();

  constructor(meta: RunMeta) {
    this.meta = meta;
    this.idPromise = langsmithStart(`openclaw:${meta.agent}`, {
      input: meta.input,
      model: meta.model,
      provider: meta.provider,
    });
  }

  async finish(output: string, error?: string, toolsUsed: string[] = []): Promise<void> {
    const id = await this.idPromise;
    const durationMs = Date.now() - this.startedAt;
    await Promise.allSettled([
      id ? langsmithEnd(id, { output, toolsUsed }, error) : Promise.resolve(),
      inngestSend("openclaw/chat.completed", {
        agent: this.meta.agent,
        model: this.meta.model,
        provider: this.meta.provider,
        toolsUsed,
        durationMs,
        ok: !error,
        error,
      }),
    ]);
  }
}
