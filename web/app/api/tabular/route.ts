import { NextRequest } from "next/server";
import { runTabular, tabularConfigured } from "@/lib/tabular";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Standalone TabPFN-3 endpoint (the agents reach it via the tabular_predict tool).
export async function POST(req: NextRequest) {
  if (!tabularConfigured()) {
    return Response.json({ error: "Tabular ML not configured (needs E2B_API_KEY for the sandbox)" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.csv) return Response.json({ error: "Missing csv" }, { status: 400 });
  try {
    const result = await runTabular(body);
    return Response.json({ result });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
