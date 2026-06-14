// Vector memory backed by Pinecone + OpenAI embeddings, via REST.
//
// Set PINECONE_API_KEY, PINECONE_INDEX_HOST (the index's data-plane host, e.g.
// "my-index-abc123.svc.aped-4627-b74a.pinecone.io"), and an embeddings key.
// The default embedding model is text-embedding-3-small (1536 dims) — create
// your Pinecone index with that dimension.

import { env } from "./env";

export function memoryConfigured(): boolean {
  return Boolean(env.pinecone && env.pineconeIndexHost && env.embeddings);
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.embeddings}`,
    },
    body: JSON.stringify({ model: env.embeddingsModel, input: text }),
  });
  if (!res.ok) throw new Error(`Embeddings error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

function indexBase(): string {
  const host = env.pineconeIndexHost!;
  return host.startsWith("http") ? host : `https://${host}`;
}

export type MemoryHit = { id: string; score: number; text: string; agent?: string };

export async function memorySave(text: string, agent?: string): Promise<{ id: string }> {
  if (!memoryConfigured()) throw new Error("Memory not configured (Pinecone + embeddings required)");
  const values = await embed(text);
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${indexBase()}/vectors/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": env.pinecone! },
    body: JSON.stringify({
      namespace: env.pineconeNamespace,
      vectors: [{ id, values, metadata: { text, agent: agent ?? "", ts: Date.now() } }],
    }),
  });
  if (!res.ok) throw new Error(`Pinecone upsert error ${res.status}: ${await res.text()}`);
  return { id };
}

export async function memorySearch(query: string, topK = 5): Promise<MemoryHit[]> {
  if (!memoryConfigured()) throw new Error("Memory not configured (Pinecone + embeddings required)");
  const vector = await embed(query);
  const res = await fetch(`${indexBase()}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": env.pinecone! },
    body: JSON.stringify({
      namespace: env.pineconeNamespace,
      vector,
      topK,
      includeMetadata: true,
    }),
  });
  if (!res.ok) throw new Error(`Pinecone query error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.matches ?? []).map((m: any) => ({
    id: m.id,
    score: m.score,
    text: m.metadata?.text ?? "",
    agent: m.metadata?.agent || undefined,
  }));
}
