// File-backed secret store so keys can be managed from the Settings UI without
// editing .env or restarting the server. Values are read live on each request
// (with a tiny mtime cache) and take precedence over process.env.
//
// SECURITY: the file is written with 0600 perms and is git-ignored. It still
// holds plaintext keys — only use this on a machine you trust. Production
// deployments should prefer real env vars / a secret manager.

import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".openclaw-secrets.json");

let cache: { mtimeMs: number; data: Record<string, string> } | null = null;

export function readKeystore(): Record<string, string> {
  try {
    const st = fs.statSync(FILE);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.data;
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    return {};
  }
}

function writeKeystore(data: Record<string, string>): void {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  cache = null; // invalidate
}

// Apply updates: empty/null value deletes the key. Returns the new key list.
export function setKeys(updates: Record<string, string | null>): string[] {
  const cur = readKeystore();
  for (const [k, v] of Object.entries(updates)) {
    const key = k.trim();
    if (!key) continue;
    if (v == null || String(v).trim() === "") delete cur[key];
    else cur[key] = String(v).trim();
  }
  writeKeystore(cur);
  return Object.keys(cur);
}

// Resolve a single secret: keystore wins, then process.env.
export function resolveSecret(name: string): string | undefined {
  const ks = readKeystore();
  return ks[name] || process.env[name] || undefined;
}

// Where a configured value comes from (for the Settings UI).
export function secretSource(name: string): "keystore" | "env" | null {
  if (readKeystore()[name]) return "keystore";
  if (process.env[name]) return "env";
  return null;
}
