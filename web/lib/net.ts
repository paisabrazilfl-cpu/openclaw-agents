// Outbound fetch that optionally routes through the Massive residential proxy
// network (useful for crawling sites that block datacenter IPs). When no proxy
// is configured it's a plain global fetch. When configured, it uses undici's
// fetch + ProxyAgent (same library that backs Node's global fetch) so the
// dispatcher is compatible.

import { env } from "./env";

export async function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!env.massiveProxyUrl) return fetch(url, init);
  const undici = await import("undici");
  const dispatcher = new undici.ProxyAgent(env.massiveProxyUrl);
  // undici's fetch mirrors the WHATWG Response surface we use (.ok/.status/.text/.json).
  return undici.fetch(url as any, { ...(init as any), dispatcher }) as unknown as Promise<Response>;
}
