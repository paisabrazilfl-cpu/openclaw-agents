// Browser automation via Steel (steel.dev). Uses the REST quick-action
// /v1/scrape endpoint to fetch fully-rendered pages (JS executed) as markdown,
// and to capture screenshots. Auth is the `steel-api-key` header (NOT Bearer).
// STEEL_BASE_URL is configurable so this also works against a self-hosted Steel
// (docker compose up) instance.

import { env } from "./env";

export function browserConfigured(): boolean {
  return Boolean(env.steel);
}

function headers(): Record<string, string> {
  return { "Content-Type": "application/json", "steel-api-key": env.steel! };
}

function base(): string {
  return env.steelBase.replace(/\/$/, "");
}

export type ScrapeResult = { url: string; title?: string; markdown: string };
export type ShotResult = { url: string; screenshotUrl?: string };

export async function browserScrape(url: string): Promise<ScrapeResult> {
  if (!env.steel) throw new Error("Browser not configured (set STEEL_API_KEY)");
  const res = await fetch(`${base()}/v1/scrape`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url, format: ["markdown"] }),
  });
  if (!res.ok) throw new Error(`Steel error ${res.status}: ${await res.text()}`);
  const d = await res.json();
  const content = d.content ?? d;
  return {
    url,
    title: d.metadata?.title ?? content.title,
    markdown: content.markdown ?? content.readability ?? content.cleaned_html ?? content.html ?? "",
  };
}

export async function browserScreenshot(url: string): Promise<ShotResult> {
  if (!env.steel) throw new Error("Browser not configured (set STEEL_API_KEY)");
  const res = await fetch(`${base()}/v1/scrape`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url, screenshot: true }),
  });
  if (!res.ok) throw new Error(`Steel error ${res.status}: ${await res.text()}`);
  const d = await res.json();
  // Steel returns a hosted screenshot URL; tolerate a couple of shapes.
  const shot = d.screenshot ?? d.screenshotUrl ?? d.links?.screenshot ?? d.metadata?.screenshot;
  return { url, screenshotUrl: typeof shot === "string" ? shot : shot?.url };
}

export async function browserCall(action: string, args: any): Promise<string> {
  const url = String(args?.url ?? "");
  if (!url) return "Missing url";
  if (action === "screenshot") {
    const r = await browserScreenshot(url);
    return r.screenshotUrl ? `Screenshot of ${url}:\n${r.screenshotUrl}` : `No screenshot returned for ${url}`;
  }
  // default: scrape
  const r = await browserScrape(url);
  const body = r.markdown.slice(0, 6000);
  return `# ${r.title ?? url}\n${url}\n\n${body}${r.markdown.length > 6000 ? "\n…[truncated]" : ""}`;
}
