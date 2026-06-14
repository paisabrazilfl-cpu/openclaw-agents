import { NextRequest } from "next/server";
import { readKeystore, setKeys, secretSource } from "@/lib/keystore";
import { KNOWN_FIELDS, isSecretField } from "@/lib/settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mask a value for display. Secrets become ••••1234; non-secrets are returned
// in full so they can be edited (host, model name, namespace, etc.).
function present(name: string, value: string) {
  if (isSecretField(name)) {
    const tail = value.slice(-4);
    return { configured: true, masked: `••••${tail}` };
  }
  return { configured: true, value };
}

// GET: report which fields are set, where they come from, and a masked preview.
// Never returns full secret values.
export async function GET() {
  const ks = readKeystore();
  const fields: Record<string, any> = {};

  for (const name of KNOWN_FIELDS) {
    const fromEnv = process.env[name];
    const fromKs = ks[name];
    const value = fromKs || fromEnv;
    if (value) {
      fields[name] = { ...present(name, value), source: secretSource(name) };
    } else {
      fields[name] = { configured: false };
    }
  }

  // Custom (non-schema) keys the user added via the "Other" free-form section.
  const custom = Object.keys(ks)
    .filter((k) => !KNOWN_FIELDS.has(k))
    .map((k) => ({ name: k, ...present(k, ks[k]), source: "keystore" as const }));

  return Response.json({ fields, custom });
}

// POST { updates: { NAME: value } } — empty value deletes. Saves to the
// git-ignored keystore; takes effect immediately (no restart).
export async function POST(req: NextRequest) {
  let body: { updates?: Record<string, string | null> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.updates || typeof body.updates !== "object") {
    return Response.json({ error: "Missing updates" }, { status: 400 });
  }
  // Ignore obviously bad key names.
  const clean: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(body.updates)) {
    if (/^[A-Za-z0-9_.-]{1,128}$/.test(k)) clean[k] = v;
  }
  const keys = setKeys(clean);
  return Response.json({ ok: true, count: keys.length });
}
