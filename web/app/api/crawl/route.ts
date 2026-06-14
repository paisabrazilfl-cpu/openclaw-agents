import { NextRequest } from "next/server";
import { crawlUrl, crawlConfigured } from "@/lib/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!crawlConfigured()) {
    return Response.json({ error: "Crawl not configured (set FREECRAWL_API_KEY)" }, { status: 400 });
  }
  const { url } = await req.json().catch(() => ({ url: "" }));
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });
  try {
    return Response.json(await crawlUrl(String(url)));
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
