// Web search. Prefers Tavily, falls back to Exa. Both via REST — no SDK.

import { env } from "./env";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchResponse = {
  provider: "tavily" | "exa" | "serpapi";
  query: string;
  answer?: string;
  results: SearchResult[];
};

export function searchConfigured(): boolean {
  return Boolean(env.tavily || env.exa || env.serpapi);
}

export async function webSearch(query: string, maxResults = 6): Promise<SearchResponse> {
  if (env.tavily) return tavily(query, maxResults);
  if (env.exa) return exa(query, maxResults);
  if (env.serpapi) return serpapi(query, maxResults);
  throw new Error("No web-search provider configured (set TAVILY_API_KEY, EXA_API_KEY, or SERPAPI_API_KEY)");
}

async function serpapi(query: string, maxResults: number): Promise<SearchResponse> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(maxResults));
  url.searchParams.set("api_key", env.serpapi!);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    provider: "serpapi",
    query,
    answer: data.answer_box?.answer || data.answer_box?.snippet,
    results: (data.organic_results ?? []).slice(0, maxResults).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet ?? "",
    })),
  };
}

async function tavily(query: string, maxResults: number): Promise<SearchResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.tavily,
      query,
      max_results: maxResults,
      include_answer: true,
      search_depth: "advanced",
    }),
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    provider: "tavily",
    query,
    answer: data.answer,
    results: (data.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    })),
  };
}

async function exa(query: string, maxResults: number): Promise<SearchResponse> {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env.exa! },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: { maxCharacters: 600 } },
    }),
  });
  if (!res.ok) throw new Error(`Exa error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    provider: "exa",
    query,
    results: (data.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.text ?? "",
    })),
  };
}
