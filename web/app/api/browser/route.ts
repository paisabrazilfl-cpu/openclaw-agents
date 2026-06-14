import { NextRequest } from "next/server";
import { browserScrape, browserScreenshot, browserConfigured } from "@/lib/browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!browserConfigured()) {
    return Response.json({ error: "Browser not configured (set STEEL_API_KEY)" }, { status: 400 });
  }
  const { url, action } = await req.json().catch(() => ({ url: "" }));
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });
  try {
    if (action === "screenshot") return Response.json(await browserScreenshot(String(url)));
    return Response.json(await browserScrape(String(url)));
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
