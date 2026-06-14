// Declarative schema for the Settings UI. Contains only field metadata — never
// any secret value. Shared by the settings page (client) and API route (server).

export type Field = {
  name: string; // the env/keystore key
  label: string;
  secret?: boolean; // mask the value in the UI / GET response
  placeholder?: string;
  help?: string;
};

export type Group = {
  id: string;
  title: string;
  emoji: string;
  description?: string;
  fields: Field[];
};

export const SETTINGS_GROUPS: Group[] = [
  {
    id: "llm",
    title: "LLM Providers",
    emoji: "🤖",
    description: "At least one is required to chat. OpenRouter is the easiest single key.",
    fields: [
      { name: "OPENROUTER_API_KEY", label: "OpenRouter", secret: true, placeholder: "sk-or-v1-…" },
      { name: "OPENAI_API_KEY", label: "OpenAI", secret: true, placeholder: "sk-…" },
      { name: "GEMINI_API_KEY", label: "Google Gemini", secret: true, placeholder: "AIza… / AQ.…" },
      { name: "NVIDIA_API_KEY", label: "NVIDIA NIM", secret: true, placeholder: "nvapi-…" },
    ],
  },
  {
    id: "search",
    title: "Web Search",
    emoji: "🔎",
    description: "Used by Surveyor, Scout, and others. First configured provider wins.",
    fields: [
      { name: "TAVILY_API_KEY", label: "Tavily", secret: true, placeholder: "tvly-…" },
      { name: "EXA_API_KEY", label: "Exa", secret: true },
      { name: "SERPAPI_API_KEY", label: "SerpAPI", secret: true, help: "Google results via serpapi.com" },
    ],
  },
  {
    id: "crawl",
    title: "Web Crawl",
    emoji: "🕷️",
    description: "Read full page content as markdown (FreeCrawl / Firecrawl-compatible).",
    fields: [
      { name: "FREECRAWL_API_KEY", label: "FreeCrawl API key", secret: true },
      { name: "FREECRAWL_BASE_URL", label: "FreeCrawl base URL", placeholder: "https://api.freecrawl.dev" },
    ],
  },
  {
    id: "memory",
    title: "Vector Memory",
    emoji: "🧠",
    description: "Pinecone + embeddings. Create the index with dimension 1536.",
    fields: [
      { name: "PINECONE_API_KEY", label: "Pinecone API key", secret: true, placeholder: "pcsk_…" },
      { name: "PINECONE_INDEX_HOST", label: "Pinecone index host", placeholder: "my-index-xxx.svc.region.pinecone.io" },
      { name: "PINECONE_NAMESPACE", label: "Namespace", placeholder: "openclaw" },
      { name: "OPENAI_EMBEDDINGS_API_KEY", label: "Embeddings key", secret: true, help: "Falls back to OpenAI key" },
      { name: "EMBEDDINGS_MODEL", label: "Embeddings model", placeholder: "text-embedding-3-small" },
    ],
  },
  {
    id: "exec",
    title: "Code Execution",
    emoji: "⚡",
    description: "Sandboxed code runs for the Coder agent.",
    fields: [{ name: "E2B_API_KEY", label: "E2B", secret: true, placeholder: "e2b_…" }],
  },
  {
    id: "observability",
    title: "Observability",
    emoji: "📈",
    description: "Optional. Helicone proxies LLM traffic; LangSmith traces every chat run.",
    fields: [
      { name: "HELICONE_API_KEY", label: "Helicone", secret: true, placeholder: "sk-helicone-…" },
      { name: "LANGCHAIN_API_KEY", label: "LangSmith / LangChain", secret: true, placeholder: "lsv2_…" },
      { name: "LANGCHAIN_PROJECT", label: "LangSmith project", placeholder: "openclaw-console" },
    ],
  },
  {
    id: "developer",
    title: "Developer (GitHub)",
    emoji: "🐙",
    description: "Lets agents read repos, files, issues, and search code.",
    fields: [
      { name: "GITHUB_TOKEN", label: "GitHub token", secret: true, placeholder: "ghp_… / github_pat_…" },
    ],
  },
  {
    id: "automation",
    title: "Automation & Events",
    emoji: "🤝",
    description: "Composio gives agents external app actions; Inngest receives a completion event per chat.",
    fields: [
      { name: "COMPOSIO_API_KEY", label: "Composio", secret: true, placeholder: "ak_…" },
      { name: "INNGEST_EVENT_KEY", label: "Inngest event key", secret: true },
    ],
  },
  {
    id: "network",
    title: "Network (Proxy)",
    emoji: "🛰️",
    description: "Route crawl traffic through the Massive residential proxy network.",
    fields: [
      { name: "MASSIVE_API_KEY", label: "Massive API key", secret: true },
      { name: "MASSIVE_PROXY_URL", label: "Proxy URL", placeholder: "http://user:pass@network.joinmassive.com:65535" },
    ],
  },
  {
    id: "defaults",
    title: "Defaults",
    emoji: "⚙️",
    fields: [
      { name: "DEFAULT_MODEL", label: "Default model", placeholder: "openai/gpt-4o-mini" },
      { name: "MAX_TOKENS", label: "Max output tokens", placeholder: "2048" },
      { name: "APP_NAME", label: "App name", placeholder: "OpenClaw Console" },
    ],
  },
];

// Flat set of all field names known to the schema.
export const KNOWN_FIELDS = new Set(
  SETTINGS_GROUPS.flatMap((g) => g.fields.map((f) => f.name)),
);

export function isSecretField(name: string): boolean {
  for (const g of SETTINGS_GROUPS) {
    for (const f of g.fields) if (f.name === name) return Boolean(f.secret);
  }
  return true; // unknown / custom keys are treated as secret
}
