import { integrationStatus } from "@/lib/env";
import { MODEL_CATALOG, providerConfig } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browser-safe: returns only which integrations are configured + the model
// catalog filtered to providers that actually have a key. No secrets.
export async function GET() {
  const status = integrationStatus();
  const models = MODEL_CATALOG.filter((m) => providerConfig(m.provider));
  return Response.json({ status, models });
}
