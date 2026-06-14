import { NextRequest } from "next/server";
import { memorySave, memorySearch, memoryConfigured } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!memoryConfigured()) {
    return Response.json(
      { error: "Memory not configured (PINECONE_API_KEY + PINECONE_INDEX_HOST + embeddings key required)" },
      { status: 400 },
    );
  }
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "save") {
      if (!body.text) return Response.json({ error: "Missing text" }, { status: 400 });
      return Response.json(await memorySave(String(body.text), body.agent));
    }
    // default: search
    if (!body.query) return Response.json({ error: "Missing query" }, { status: 400 });
    return Response.json({ hits: await memorySearch(String(body.query)) });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
