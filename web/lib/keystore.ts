// File-backed secret store so keys can be managed from the Settings UI without
// editing .env or restarting the server. Values are read live on each request
// (with a tiny mtime cache) and take precedence over process.env. Each entry
// can carry an optional description (shown in the vault UI).
//
// SECURITY: the file is written with 0600 perms and is git-ignored. It still
// holds plaintext keys — only use this on a machine you trust. Production
// deployments should prefer real env vars / a secret manager.

import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".openclaw-secrets.json");

type Entry = { v: string; d?: string };
type Raw = Record<string, string | Entry>;

let cache: { mtimeMs: number; data: Record<string, Entry> } | null = null;

function normalize(raw: Raw): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  for (const [k, val] of Object.entries(raw)) {
    out[k] = typeof val === "string" ? { v: val } : { v: val.v, d: val.d };
  }
  return out;
}

function readAll(): Record<string, Entry> {
  try {
    const st = fs.statSync(FILE);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.data;
    const data = normalize(JSON.parse(fs.readFileSync(FILE, "utf8")));
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Entry>): void {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  cache = null; // invalidate
}

export type SecretUpdate = { value: string | null; description?: string };

// Apply updates: a null/empty value deletes the key. Returns the new key list.
export function setKeys(updates: Record<string, string | null | SecretUpdate>): string[] {
  const cur = readAll();
  for (const [k, raw] of Object.entries(updates)) {
    const key = k.trim();
    if (!key) continue;
    const upd: SecretUpdate = typeof raw === "object" && raw !== null ? raw : { value: raw as string | null };
    if (upd.value == null || String(upd.value).trim() === "") {
      delete cur[key];
    } else {
      cur[key] = { v: String(upd.value).trim(), d: upd.description?.trim() || cur[key]?.d };
    }
  }
  writeAll(cur);
  return Object.keys(cur);
}

// Resolve a single secret value: keystore wins, then process.env.
export function resolveSecret(name: string): string | undefined {
  const e = readAll()[name];
  return (e && e.v) || process.env[name] || undefined;
}

// Where a configured value comes from (for the Settings UI).
export function secretSource(name: string): "keystore" | "env" | null {
  if (readAll()[name]?.v) return "keystore";
  if (process.env[name]) return "env";
  return null;
}

// List stored secrets (keystore only) without exposing values.
export function listSecrets(): { name: string; description?: string }[] {
  return Object.entries(readAll())
    .map(([name, e]) => ({ name, description: e.d }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDescription(name: string): string | undefined {
  return readAll()[name]?.d;
}
