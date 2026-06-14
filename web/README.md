# 🐾 OpenClaw Console

A minimal **web UI** for the [OpenClaw multi-agent fleet](../README.md). Chat with
the 9 specialized agents (Planner, Ideator, Critic, Surveyor, Coder, Writer,
Reviewer, Scout, and the Main orchestrator), each with its own system prompt
distilled from the `.agents/*/soul.md` definitions — wired to real LLM providers
and tools.

> This is an **MVP**. It runs entirely from a single Next.js app; the agents'
> personalities come straight from this repo's `agents.yaml` + souls.

## ✨ What's wired in

| Capability | Backed by | Enable with |
|---|---|---|
| **LLM chat** (streaming, tool-calling) | OpenRouter · OpenAI · Gemini · NVIDIA NIM | `OPENROUTER_API_KEY` (or any one) |
| **Web search** (Surveyor/Scout/etc.) | Tavily → Exa → SerpAPI | `TAVILY_API_KEY` / `EXA_API_KEY` / `SERPAPI_API_KEY` |
| **Web crawl** (read full pages) | FreeCrawl (Firecrawl-compatible) | `FREECRAWL_API_KEY` |
| **Browser** (JS pages + screenshots) | Steel (`browser` tool) | `STEEL_API_KEY` — see [docs/browser-automation.md](docs/browser-automation.md) |
| **Vector memory** (save/recall) | Pinecone + OpenAI embeddings | `PINECONE_API_KEY` + `PINECONE_INDEX_HOST` |
| **Code execution** (Coder) | E2B sandbox | `E2B_API_KEY` |
| **GitHub tool** (repos/files/issues/code) | GitHub REST API | `GITHUB_TOKEN` |
| **App integrations** (Gmail, Slack, …) | Composio | `COMPOSIO_API_KEY` |
| **Tracing** (every chat run) | LangSmith | `LANGCHAIN_API_KEY` |
| **Events** (chat.completed) | Inngest | `INNGEST_EVENT_KEY` |
| **Outbound proxy** (for crawl) | Massive residential network | `MASSIVE_PROXY_URL` |
| **LLM proxy** (optional) | Helicone | `HELICONE_API_KEY` |
| **Markdown rendering** | react-markdown + remark-gfm (GFM tables, code, lists) | — |

Every integration is **fully wired** (no stubs): tools (`web_search`, `web_crawl`,
`memory_*`, `run_code`, `github`, `composio`) are advertised to each agent only
when configured, while telemetry (LangSmith trace + Inngest event) fires
automatically on every chat turn and the Massive proxy transparently wraps crawl
requests.

### Managing keys

Keys can be set in **`.env.local`** *or* added live from the in-app **Settings**
page (⚙️ in the header, or `/settings`). Settings writes to a git-ignored
keystore (`web/.openclaw-secrets.json`) that's read on every request, so changes
take effect immediately — no restart. The page covers every known service
(including SerpAPI and FreeCrawl) plus a **custom-keys** section for adding any
new provider by name. Only masked previews are ever sent to the browser.

Each agent only advertises the tools it should use *and* that you've configured.
The model picker decides when to call them; the chat shows each tool call inline.

## 🚀 Run it

```bash
cd web
cp .env.example .env.local      # then add at least one LLM key
npm install
npm run dev                      # http://localhost:3000
```

The sidebar shows green dots for whatever you've configured. With just an LLM key
you get full chat; add the other keys to light up search / memory / code.

## 🔌 Architecture

```
app/
  page.tsx            # the console (agent picker, streaming chat, tool panel)
  api/
    chat/route.ts     # streaming tool-calling loop (NDJSON events)
    search|memory|exec/route.ts   # standalone tool endpoints (right-hand panel)
    health/route.ts   # which integrations are configured (booleans only)
lib/
  agents.ts           # the 9 agents + system prompts (from agents.yaml + souls)
  providers.ts        # LLM routing: OpenRouter/OpenAI/Gemini/NVIDIA (+Helicone)
  tools.ts            # tool schemas + dispatch
  search.ts memory.ts sandbox.ts   # Tavily/Exa · Pinecone · E2B
  env.ts              # server-only credential access + status
```

**How chat works:** the browser POSTs the conversation to `/api/chat`, which runs
a tool-calling loop against the chosen provider. Assistant tokens stream back as
newline-delimited JSON (`{type:"token"}`), and each tool invocation is surfaced
live (`{type:"tool"}`) before the model continues.

## 🔐 Security

- **Secrets live only in `.env.local`**, which is git-ignored. They are read
  server-side (`lib/env.ts`) and never sent to the browser — the client only ever
  receives the boolean "configured?" status.
- If you ever pasted keys into a chat or shared them, **rotate them.**

## 🧩 Provider notes

- **OpenRouter** is the easiest single key — it exposes most models. The picker
  lists a curated set; you can extend `MODEL_CATALOG` in `lib/providers.ts`.
- **Gemini** is reached via Google's OpenAI-compatible endpoint.
- **Pinecone**: create a serverless index with dimension **1536** (matches
  `text-embedding-3-small`) and paste its data-plane host into `PINECONE_INDEX_HOST`.
- **E2B**: the `@e2b/code-interpreter` SDK is imported lazily; runs default to Python.
