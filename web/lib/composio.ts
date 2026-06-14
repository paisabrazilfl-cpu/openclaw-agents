// Composio — gives agents access to 250+ external app actions (Gmail, Slack,
// GitHub, Notion, etc.) that you connect in the Composio dashboard. Uses the
// v3 REST API with the x-api-key header.
//
// Note: actions require the relevant app to be connected for an entity in your
// Composio account. This wiring lists available tools and executes one by slug;
// it gracefully surfaces API errors.

import { env } from "./env";

const BASE = process.env.COMPOSIO_BASE_URL || "https://backend.composio.dev/api/v3";

export function composioConfigured(): boolean {
  return Boolean(env.composio);
}

function headers(): Record<string, string> {
  return { "Content-Type": "application/json", "x-api-key": env.composio! };
}

export async function composioListTools(search?: string): Promise<string> {
  const url = new URL(`${BASE}/tools`);
  url.searchParams.set("limit", "30");
  if (search) url.searchParams.set("search", search);
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) return `Composio error ${r.status}: ${await r.text()}`;
  const d = await r.json();
  const items = d.items ?? d.data ?? d;
  if (!Array.isArray(items) || !items.length) return "(no tools found — connect apps in the Composio dashboard)";
  return items
    .slice(0, 30)
    .map((t: any) => `- ${t.slug ?? t.name}: ${t.description ?? ""}`.slice(0, 200))
    .join("\n");
}

export async function composioExecute(slug: string, args: any, entityId?: string): Promise<string> {
  const r = await fetch(`${BASE}/tools/execute/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      arguments: args ?? {},
      ...(entityId ? { entity_id: entityId } : {}),
    }),
  });
  if (!r.ok) return `Composio execute error ${r.status}: ${await r.text()}`;
  const d = await r.json();
  return JSON.stringify(d.data ?? d, null, 2).slice(0, 6000);
}

export async function composioCall(action: string, args: any): Promise<string> {
  if (action === "list") return composioListTools(args?.search);
  if (action === "execute") {
    if (!args?.tool_slug) return "Missing tool_slug for execute";
    return composioExecute(args.tool_slug, args.arguments, args.entity_id);
  }
  return `Unknown Composio action: ${action}`;
}
