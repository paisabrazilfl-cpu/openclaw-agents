import { NextRequest } from "next/server";
import { listSecrets, setKeys, type SecretUpdate } from "@/lib/keystore";
import { env } from "@/lib/env";
import { KNOWN_FIELDS } from "@/lib/settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Integration catalog — derived live from env. Browser-safe (booleans only).
function integrations() {
  return [
    { name: "OpenRouter", category: "llm", on: Boolean(env.openrouter) },
    { name: "OpenAI", category: "llm", on: Boolean(env.openai) },
    { name: "Google Gemini", category: "llm", on: Boolean(env.gemini) },
    { name: "NVIDIA NIM", category: "llm", on: Boolean(env.nvidia) },
    { name: "Bitdeer", category: "llm", on: Boolean(env.bitdeer) },
    { name: "Helicone", category: "observability", on: Boolean(env.helicone) },
    { name: "LangSmith (LangChain)", category: "observability", on: Boolean(env.langchain) },
    { name: "Embeddings", category: "memory", on: Boolean(env.embeddings) },
    { name: "Pinecone (vector memory)", category: "memory", on: Boolean(env.pinecone && env.pineconeIndexHost) },
    { name: "Tavily", category: "search", on: Boolean(env.tavily) },
    { name: "Exa", category: "search", on: Boolean(env.exa) },
    { name: "SerpAPI", category: "search", on: Boolean(env.serpapi) },
    { name: "FreeCrawl", category: "crawl", on: Boolean(env.freecrawl) },
    { name: "Steel (browser)", category: "browser", on: Boolean(env.steel) },
    { name: "Inngest", category: "events", on: Boolean(env.inngestEventKey) },
    { name: "E2B", category: "sandbox", on: Boolean(env.e2b) },
    { name: "TabPFN-3 (tabular ML)", category: "tabular", on: Boolean(env.e2b) },
    { name: "Composio", category: "tools", on: Boolean(env.composio) },
    { name: "GitHub", category: "tools", on: Boolean(env.github) },
    { name: "Massive (proxy)", category: "network", on: Boolean(env.massiveProxyUrl) },
  ];
}

// GET: integration status + stored-secret names (no values, ever).
export async function GET() {
  const ints = integrations();
  const stored = listSecrets(); // keystore entries (name + description)
  const storedNames = new Set(stored.map((s) => s.name));

  // Known fields present via process.env (e.g. Render env) but not in keystore.
  const envSecrets = [...KNOWN_FIELDS]
    .filter((n) => !storedNames.has(n) && process.env[n])
    .map((name) => ({ name, source: "env" as const }));

  const secrets = [
    ...stored.map((s) => ({ name: s.name, description: s.description, source: "keystore" as const })),
    ...envSecrets,
  ].sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({
    integrations: ints,
    active: ints.filter((i) => i.on).length,
    total: ints.length,
    secrets,
    knownFields: [...KNOWN_FIELDS].sort(),
  });
}

// POST { upserts:[{name,value,description}], deletes:[name] } — write-only.
export async function POST(req: NextRequest) {
  let body: {
    upserts?: { name: string; value: string; description?: string }[];
    deletes?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, SecretUpdate> = {};
  for (const u of body.upserts ?? []) {
    if (u?.name && /^[A-Za-z0-9_.-]{1,128}$/.test(u.name) && u.value) {
      updates[u.name] = { value: u.value, description: u.description };
    }
  }
  for (const name of body.deletes ?? []) {
    if (name) updates[name] = { value: null };
  }
  const keys = setKeys(updates);
  return Response.json({ ok: true, count: keys.length });
}
