import { NextRequest } from "next/server";
import { runCode, sandboxConfigured } from "@/lib/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!sandboxConfigured()) {
    return Response.json({ error: "Code execution not configured (set E2B_API_KEY)" }, { status: 400 });
  }
  const { code, language } = await req.json().catch(() => ({ code: "" }));
  if (!code) return Response.json({ error: "Missing code" }, { status: 400 });
  try {
    return Response.json(await runCode(String(code), language || "python"));
  } catch (e: any) {
    return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
