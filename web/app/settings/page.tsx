"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Integration = { name: string; category: string; on: boolean };
type Secret = { name: string; description?: string; source: "keystore" | "env" };
type Data = {
  integrations: Integration[];
  active: number;
  total: number;
  secrets: Secret[];
  knownFields: string[];
};

const CAT_COLOR: Record<string, string> = {
  llm: "bg-violet-500/15 text-violet-300",
  observability: "bg-sky-500/15 text-sky-300",
  memory: "bg-amber-500/15 text-amber-300",
  search: "bg-emerald-500/15 text-emerald-300",
  crawl: "bg-teal-500/15 text-teal-300",
  events: "bg-pink-500/15 text-pink-300",
  sandbox: "bg-orange-500/15 text-orange-300",
  tabular: "bg-lime-500/15 text-lime-300",
  tools: "bg-indigo-500/15 text-indigo-300",
  network: "bg-rose-500/15 text-rose-300",
};

export default function SettingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const r = await fetch("/api/settings");
    setData(await r.json());
  };
  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const store = async () => {
    if (!name.trim() || !value.trim()) return;
    setBusy(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upserts: [{ name: name.trim(), value: value.trim(), description: desc.trim() }] }),
    });
    setName("");
    setDesc("");
    setValue("");
    setBusy(false);
    flash("Encrypted & stored ✓");
    load();
  };

  const remove = async (n: string) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletes: [n] }),
    });
    flash(`Removed ${n}`);
    load();
  };

  const copyRef = (n: string) => {
    navigator.clipboard?.writeText(`{{secret:${n}}}`);
    flash(`Copied {{secret:${n}}}`);
  };

  return (
    <div className="min-h-[100dvh] bg-ink-950">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">⚙️ Settings</div>
          <div className="truncate text-[11px] text-stone-500">
            Encrypted at rest · write-only — values are never displayed back.
          </div>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-ink-800"
        >
          ← Console
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {/* Integrations */}
        <section className="rounded-xl border border-ink-700 bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <div className="text-sm font-semibold">Integrations</div>
            {data && (
              <span className="rounded-full bg-ink-700 px-2.5 py-0.5 text-[11px] font-medium text-stone-300">
                {data.active}/{data.total} active
              </span>
            )}
          </div>
          <ul className="divide-y divide-ink-800">
            {data?.integrations.map((i) => (
              <li key={i.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 truncate text-sm text-stone-200">{i.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CAT_COLOR[i.category] ?? "bg-ink-700 text-stone-400"}`}>
                  {i.category}
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium ${i.on ? "text-emerald-400" : "text-stone-600"}`}
                >
                  <span className={`h-2 w-2 rounded-full ${i.on ? "bg-emerald-400" : "bg-stone-600"}`} />
                  {i.on ? "On" : "Off"}
                </span>
              </li>
            ))}
            {!data && <li className="px-4 py-6 text-center text-xs text-stone-500">Loading…</li>}
          </ul>
        </section>

        {/* Add / Update secret */}
        <section className="rounded-xl border border-ink-700 bg-ink-900">
          <div className="border-b border-ink-700 px-4 py-3">
            <div className="text-sm font-semibold">Add / Update Secret</div>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Store API keys and other secrets. Values are encrypted and never shown again. Reference
              them anywhere with <code className="text-stone-400">{"{{secret:NAME}}"}</code>.
            </p>
          </div>
          <div className="space-y-2.5 p-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-stone-500">Name</span>
                <input
                  list="known-fields"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="OPENAI_API_KEY"
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-xs uppercase outline-none focus:border-claw-600"
                />
                <datalist id="known-fields">
                  {data?.knownFields.map((f) => <option key={f} value={f} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-stone-500">Description (optional)</span>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Used by Coder for API access"
                  className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-xs outline-none focus:border-claw-600"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] text-stone-500">Value</span>
              <input
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-xs outline-none focus:border-claw-600"
              />
            </label>
            <button
              onClick={store}
              disabled={busy || !name.trim() || !value.trim()}
              className="rounded-md bg-claw-600 px-4 py-2 text-xs font-medium text-white hover:bg-claw-500 disabled:opacity-40"
            >
              {busy ? "Storing…" : "Encrypt & Store"}
            </button>
          </div>
        </section>

        {/* Stored secrets */}
        <section className="rounded-xl border border-ink-700 bg-ink-900">
          <div className="border-b border-ink-700 px-4 py-3 text-sm font-semibold">
            Stored Secrets ({data?.secrets.length ?? 0})
          </div>
          <ul className="divide-y divide-ink-800">
            {data?.secrets.map((s) => (
              <li key={s.name} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs text-stone-200">{s.name}</span>
                    <span className="font-mono text-[11px] text-stone-600">••••••••</span>
                    {s.source === "env" && (
                      <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-stone-400">env</span>
                    )}
                  </div>
                  {s.description && <div className="truncate text-[11px] text-stone-500">{s.description}</div>}
                </div>
                <button
                  onClick={() => copyRef(s.name)}
                  title="Copy reference"
                  className="shrink-0 rounded border border-ink-700 px-2 py-1 font-mono text-[10px] text-stone-400 hover:bg-ink-800"
                >
                  {"{{secret:…}}"}
                </button>
                {s.source === "keystore" ? (
                  <button
                    onClick={() => remove(s.name)}
                    className="shrink-0 text-[11px] text-rose-400/80 hover:text-rose-400"
                  >
                    remove
                  </button>
                ) : (
                  <span className="w-12 shrink-0" />
                )}
              </li>
            ))}
            {data && data.secrets.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-stone-500">No secrets stored yet.</li>
            )}
          </ul>
        </section>

        <p className="pb-8 text-center text-[11px] text-amber-400/70">
          Never paste secrets into chat. If a key was ever exposed, rotate it.
        </p>
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-20 -transtone-x-1/2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
