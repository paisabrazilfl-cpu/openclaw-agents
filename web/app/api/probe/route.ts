import { NextRequest } from "next/server";
import { llmFetch, resolveProvider, type Provider } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIMEOUT_MS = 25_000;

// Liveness probe: send a tiny (1-token) completion and report whether the model
// answered. Used by the model picker to show alive/down dots.
export async function POST(req: NextRequest) {
  let body: { provider?: Provider; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const provider = resolveProvider(body.provider);
  if (!provider) return Response.json({ ok: false, error: "provider not configured" });
  if (!body.model) return Response.json({ ok: false, error: "missing model" });

  const t0 = Date.now();
  try {
    const res = await Promise.race([
      llmFetch(provider, {
        model: body.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
      new Promise<Response>((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)),
    ]);
    const ms = Date.now() - t0;
    if (res.ok) return Response.json({ ok: true, ms });
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    return Response.json({ ok: false, ms, status: res.status, error: detail || `HTTP ${res.status}` });
  } catch (e: any) {
    return Response.json({ ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) });
  }
}
