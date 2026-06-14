import { NextRequest } from "next/server";
import { webSearch, searchConfigured } from "@/lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!searchConfigured()) {
    return Response.json({ error: "Search not configured (set TAVILY_API_KEY or EXA_API_KEY)" }, { status: 400 });
  }
  const { query } = await req.json().catch(() => ({ query: "" }));
  if (!query) return Response.json({ error: "Missing query" }, { status: 400 });
  try {
    return Response.json(await webSearch(String(query)));
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
