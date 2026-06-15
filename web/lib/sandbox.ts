// Sandboxed code execution via E2B. The SDK is imported dynamically so the app
// still builds/runs if E2B isn't installed — calls just fail with a clear error.

import { env } from "./env";

export function sandboxConfigured(): boolean {
  return Boolean(env.e2b);
}

export type CodeResult = {
  stdout: string;
  stderr: string;
  text?: string;
  error?: string;
};

export async function runCode(
  code: string,
  language = "python",
  opts?: { timeoutMs?: number },
): Promise<CodeResult> {
  if (!env.e2b) throw new Error("Code execution not configured (set E2B_API_KEY)");

  let Sandbox: any;
  try {
    ({ Sandbox } = await import("@e2b/code-interpreter"));
  } catch {
    throw new Error(
      "E2B SDK not installed. Run `npm install @e2b/code-interpreter` in web/.",
    );
  }

  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const sbx = await Sandbox.create({ apiKey: env.e2b, timeoutMs });
  try {
    const execution = await sbx.runCode(code, { language, timeoutMs });
    return {
      stdout: (execution.logs?.stdout ?? []).join(""),
      stderr: (execution.logs?.stderr ?? []).join(""),
      text: execution.text,
      error: execution.error
        ? `${execution.error.name}: ${execution.error.value}`
        : undefined,
    };
  } finally {
    await sbx.kill?.();
  }
}
