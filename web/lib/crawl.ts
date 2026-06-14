// Web crawl / scrape via FreeCrawl. FreeCrawl exposes a Firecrawl-compatible
// /scrape endpoint that returns a page's content as markdown. The base URL is
// configurable (FREECRAWL_BASE_URL) so this also works against self-hosted or
// compatible instances.

import { env } from "./env";

export function crawlConfigured(): boolean {
  return Boolean(env.freecrawl);
}

export type CrawlResult = {
  url: string;
  title?: string;
  markdown: string;
};

export async function crawlUrl(url: string): Promise<CrawlResult> {
  if (!env.freecrawl) throw new Error("Crawl not configured (set FREECRAWL_API_KEY)");
  const base = env.freecrawlBase.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.freecrawl}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  if (!res.ok) throw new Error(`FreeCrawl error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Tolerate a couple of common response shapes.
  const doc = data.data ?? data;
  return {
    url,
    title: doc.metadata?.title ?? doc.title,
    markdown: doc.markdown ?? doc.content ?? doc.text ?? "",
  };
}
