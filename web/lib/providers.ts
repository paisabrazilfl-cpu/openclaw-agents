// LLM provider routing. Everything speaks the OpenAI Chat Completions wire
// format, so a single fetch helper covers OpenRouter, OpenAI, Gemini (via its
// OpenAI-compatible endpoint) and NVIDIA NIM. Optionally routes through
// Helicone for observability when a Helicone key is present.

import { env } from "./env";

export type Provider = "openrouter" | "openai" | "gemini" | "nvidia";

export type ModelOption = {
  provider: Provider;
  model: string;
  label: string;
};

// Curated, sensible defaults. The model picker shows these; the user can also
// type any model id for the selected provider.
export const MODEL_CATALOG: ModelOption[] = [
  { provider: "openrouter", model: "openai/gpt-4o-mini", label: "GPT-4o mini · OpenRouter" },
  { provider: "openrouter", model: "openai/gpt-4o", label: "GPT-4o · OpenRouter" },
  { provider: "openrouter", model: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet · OpenRouter" },
  { provider: "openrouter", model: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash · OpenRouter" },
  { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B · OpenRouter" },
  { provider: "openrouter", model: "deepseek/deepseek-chat", label: "DeepSeek Chat · OpenRouter" },
  { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B · OpenRouter" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o mini · OpenAI" },
  { provider: "openai", model: "gpt-4o", label: "GPT-4o · OpenAI" },
  { provider: "gemini", model: "gemini-2.0-flash", label: "Gemini 2.0 Flash · Google" },
  { provider: "gemini", model: "gemini-1.5-pro", label: "Gemini 1.5 Pro · Google" },
  { provider: "nvidia", model: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B · NVIDIA NIM" },
];

type ProviderConfig = { baseURL: string; headers: Record<string, string> };

function heliconeWrap(
  base: ProviderConfig,
  heliconeBase: string,
): ProviderConfig {
  if (!env.helicone) return base;
  return {
    baseURL: heliconeBase,
    headers: { ...base.headers, "Helicone-Auth": `Bearer ${env.helicone}` },
  };
}

// Returns the chat-completions endpoint + auth headers for a provider, or null
// if that provider has no API key configured.
export function providerConfig(provider: Provider): ProviderConfig | null {
  switch (provider) {
    case "openrouter": {
      if (!env.openrouter) return null;
      const base: ProviderConfig = {
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          Authorization: `Bearer ${env.openrouter}`,
          "HTTP-Referer": "https://github.com/shenhao-stu/openclaw-agents",
          "X-Title": env.appName,
        },
      };
      return heliconeWrap(base, "https://openrouter.helicone.ai/api/v1");
    }
    case "openai": {
      if (!env.openai) return null;
      const base: ProviderConfig = {
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${env.openai}` },
      };
      return heliconeWrap(base, "https://oai.helicone.ai/v1");
    }
    case "gemini": {
      if (!env.gemini) return null;
      // Google's OpenAI-compatible surface.
      return {
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        headers: { Authorization: `Bearer ${env.gemini}` },
      };
    }
    case "nvidia": {
      if (!env.nvidia) return null;
      return {
        baseURL: "https://integrate.api.nvidia.com/v1",
        headers: { Authorization: `Bearer ${env.nvidia}` },
      };
    }
  }
}

// Pick a provider that actually has a key, preferring the requested one.
export function resolveProvider(requested?: Provider): Provider | null {
  const order: Provider[] = ["openrouter", "openai", "gemini", "nvidia"];
  if (requested && providerConfig(requested)) return requested;
  return order.find((p) => providerConfig(p)) ?? null;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};

// Low-level call to a provider's /chat/completions. Returns the raw Response so
// callers can stream or read JSON as needed.
export async function llmFetch(
  provider: Provider,
  body: Record<string, unknown>,
): Promise<Response> {
  const cfg = providerConfig(provider);
  if (!cfg) throw new Error(`Provider "${provider}" is not configured`);
  return fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cfg.headers },
    body: JSON.stringify(body),
  });
}
