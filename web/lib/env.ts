// Centralized, server-only access to integration credentials.
//
// SECURITY: every value is resolved live from the keystore (Settings UI) or
// process.env — nothing is hard-coded. These helpers are only imported by
// server-side code (API routes). The browser only ever sees the booleans from
// `integrationStatus()`, never a key value.

import { resolveSecret } from "./keystore";

const s = resolveSecret;

// Getter-based so values reflect the current keystore on every access.
export const env = {
  // ── LLM providers ──────────────────────────────────────────────
  get openrouter() { return s("OPENROUTER_API_KEY"); },
  get openai() { return s("OPENAI_API_KEY"); },
  get gemini() { return s("GEMINI_API_KEY"); },
  get nvidia() { return s("NVIDIA_API_KEY"); },

  // ── Observability (optional LLM proxy) ─────────────────────────
  get helicone() { return s("HELICONE_API_KEY"); },
  get langchain() { return s("LANGCHAIN_API_KEY"); },
  get langchainProject() { return s("LANGCHAIN_PROJECT") || "openclaw-console"; },

  // ── Embeddings + vector memory ─────────────────────────────────
  get embeddings() { return s("OPENAI_EMBEDDINGS_API_KEY") || s("OPENAI_API_KEY"); },
  get embeddingsModel() { return s("EMBEDDINGS_MODEL") || "text-embedding-3-small"; },
  get pinecone() { return s("PINECONE_API_KEY"); },
  get pineconeIndexHost() { return s("PINECONE_INDEX_HOST"); },
  get pineconeNamespace() { return s("PINECONE_NAMESPACE") || "openclaw"; },

  // ── Web search ─────────────────────────────────────────────────
  get tavily() { return s("TAVILY_API_KEY"); },
  get exa() { return s("EXA_API_KEY"); },
  get serpapi() { return s("SERPAPI_API_KEY"); },

  // ── Web crawl / scrape ─────────────────────────────────────────
  get freecrawl() { return s("FREECRAWL_API_KEY"); },
  get freecrawlBase() { return s("FREECRAWL_BASE_URL") || "https://api.freecrawl.dev"; },

  // ── Browser automation (Steel) ─────────────────────────────────
  get steel() { return s("STEEL_API_KEY"); },
  get steelBase() { return s("STEEL_BASE_URL") || "https://api.steel.dev"; },

  // ── Code execution ─────────────────────────────────────────────
  get e2b() { return s("E2B_API_KEY"); },

  // ── Automation / events / dev ──────────────────────────────────
  get composio() { return s("COMPOSIO_API_KEY"); },
  get inngestEventKey() { return s("INNGEST_EVENT_KEY"); },
  get github() { return s("GITHUB_TOKEN"); },

  // ── Outbound proxy (Massive residential network) ───────────────
  get massive() { return s("MASSIVE_API_KEY"); },
  // Full proxy URL, e.g. http://user:pass@network.joinmassive.com:65535
  get massiveProxyUrl() { return s("MASSIVE_PROXY_URL"); },

  // ── Defaults ───────────────────────────────────────────────────
  get defaultModel() { return s("DEFAULT_MODEL") || "openai/gpt-4o-mini"; },
  get maxTokens() { return Number(s("MAX_TOKENS")) || 2048; },
  get appName() { return s("APP_NAME") || "OpenClaw Console"; },
};

export type IntegrationStatus = {
  llm: boolean;
  search: boolean;
  crawl: boolean;
  browser: boolean;
  memory: boolean;
  exec: boolean;
  github: boolean;
  composio: boolean;
  events: boolean;
  proxy: boolean;
  providers: { openrouter: boolean; openai: boolean; gemini: boolean; nvidia: boolean };
  observability: { helicone: boolean; langchain: boolean };
};

// A browser-safe summary of what's configured. Booleans only — never values.
export function integrationStatus(): IntegrationStatus {
  return {
    llm: Boolean(env.openrouter || env.openai || env.gemini || env.nvidia),
    search: Boolean(env.tavily || env.exa || env.serpapi),
    crawl: Boolean(env.freecrawl),
    browser: Boolean(env.steel),
    memory: Boolean(env.pinecone && env.pineconeIndexHost && env.embeddings),
    exec: Boolean(env.e2b),
    github: Boolean(env.github),
    composio: Boolean(env.composio),
    events: Boolean(env.inngestEventKey),
    proxy: Boolean(env.massiveProxyUrl),
    providers: {
      openrouter: Boolean(env.openrouter),
      openai: Boolean(env.openai),
      gemini: Boolean(env.gemini),
      nvidia: Boolean(env.nvidia),
    },
    observability: {
      helicone: Boolean(env.helicone),
      langchain: Boolean(env.langchain),
    },
  };
}
