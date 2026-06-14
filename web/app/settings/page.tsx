"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SETTINGS_GROUPS } from "@/lib/settings-schema";

type FieldStatus = {
  configured: boolean;
  masked?: string;
  value?: string;
  source?: "keystore" | "env" | null;
};
type CustomEntry = { name: string; masked?: string; value?: string; source?: string };

export default function SettingsPage() {
  const [status, setStatus] = useState<Record<string, FieldStatus>>({});
  const [custom, setCustom] = useState<CustomEntry[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [remove, setRemove] = useState<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<{ name: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const r = await fetch("/api/settings");
    const d = await r.json();
    setStatus(d.fields ?? {});
    setCustom(d.custom ?? []);
    // prefill non-secret configured values so they're editable
    const pre: Record<string, string> = {};
    for (const [name, f] of Object.entries(d.fields ?? {}) as [string, FieldStatus][]) {
      if (f.configured && f.value !== undefined) pre[name] = f.value;
    }
    setInputs(pre);
    setRemove(new Set());
  };

  useEffect(() => {
    load();
  }, []);

  const setInput = (name: string, v: string) =>
    setInputs((p) => ({ ...p, [name]: v }));

  const toggleRemove = (name: string) =>
    setRemove((p) => {
      const n = new Set(p);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const save = async () => {
    setSaving(true);
    const updates: Record<string, string | null> = {};
    // schema fields: send typed values; queue removals
    for (const g of SETTINGS_GROUPS) {
      for (const f of g.fields) {
        if (remove.has(f.name)) {
          updates[f.name] = "";
        } else {
          const typed = inputs[f.name];
          const cur = status[f.name];
          // For non-secret prefilled fields, only send if changed.
          if (typed != null && typed !== "" && typed !== cur?.value) {
            updates[f.name] = typed;
          } else if (typed === "" && cur?.value !== undefined && cur.configured) {
            updates[f.name] = ""; // cleared a non-secret value
          }
        }
      }
    }
    // custom existing removals
    for (const c of custom) if (remove.has(c.name)) updates[c.name] = "";
    // brand new custom keys
    for (const nk of newKeys) {
      if (nk.name.trim() && nk.value.trim()) updates[nk.name.trim()] = nk.value.trim();
    }

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    setNewKeys([]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-700 bg-ink-900/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚙️</span>
          <div>
            <div className="text-sm font-semibold">Settings · API Keys</div>
            <div className="text-[11px] text-slate-500">
              Saved to a git-ignored keystore. Takes effect immediately.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400">Saved ✓</span>}
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
          >
            ← Back to console
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-claw-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-claw-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90">
          🔒 Keys are stored locally in <code>web/.openclaw-secrets.json</code> (git-ignored) and
          never sent to the browser — only a masked preview is shown. For shared/production use,
          prefer real environment variables. If any key was ever exposed, rotate it.
        </div>

        {SETTINGS_GROUPS.map((g) => (
          <section key={g.id} className="rounded-xl border border-ink-700 bg-ink-900">
            <div className="border-b border-ink-700 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{g.emoji}</span> {g.title}
              </div>
              {g.description && (
                <p className="mt-0.5 text-[11px] text-slate-500">{g.description}</p>
              )}
            </div>
            <div className="divide-y divide-ink-800">
              {g.fields.map((f) => {
                const st = status[f.name];
                const removing = remove.has(f.name);
                return (
                  <div key={f.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-44 shrink-0">
                      <div className="text-xs font-medium text-slate-200">{f.label}</div>
                      <div className="font-mono text-[10px] text-slate-600">{f.name}</div>
                      {f.help && <div className="text-[10px] text-slate-600">{f.help}</div>}
                    </div>
                    <input
                      type={f.secret ? "password" : "text"}
                      value={removing ? "" : inputs[f.name] ?? ""}
                      disabled={removing}
                      onChange={(e) => setInput(f.name, e.target.value)}
                      placeholder={
                        removing
                          ? "(will be removed)"
                          : st?.configured && f.secret
                            ? `${st.masked} — saved${st.source === "env" ? " via env" : ""} (type to replace)`
                            : f.placeholder ?? ""
                      }
                      className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-claw-600 disabled:opacity-50"
                    />
                    <div className="w-24 shrink-0 text-right">
                      {st?.configured ? (
                        st.source === "env" ? (
                          <span className="text-[10px] text-slate-500">from .env</span>
                        ) : (
                          <button
                            onClick={() => toggleRemove(f.name)}
                            className={`text-[10px] ${removing ? "text-emerald-400" : "text-rose-400/80 hover:text-rose-400"}`}
                          >
                            {removing ? "undo" : "remove"}
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-600">not set</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Custom / arbitrary keys */}
        <section className="rounded-xl border border-ink-700 bg-ink-900">
          <div className="border-b border-ink-700 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">➕ Custom keys</div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Add any other service&apos;s key by name (e.g. a new provider). Stored alongside the rest.
            </p>
          </div>
          <div className="space-y-2 px-4 py-3">
            {custom.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-44 shrink-0 font-mono text-[11px] text-slate-300">{c.name}</div>
                <div className="flex-1 font-mono text-xs text-slate-500">{c.masked ?? c.value}</div>
                <button
                  onClick={() => toggleRemove(c.name)}
                  className={`w-24 text-right text-[10px] ${remove.has(c.name) ? "text-emerald-400" : "text-rose-400/80 hover:text-rose-400"}`}
                >
                  {remove.has(c.name) ? "undo" : "remove"}
                </button>
              </div>
            ))}
            {newKeys.map((nk, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  value={nk.name}
                  onChange={(e) =>
                    setNewKeys((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder="SERVICE_API_KEY"
                  className="w-44 shrink-0 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-[11px] uppercase outline-none focus:border-claw-600"
                />
                <input
                  value={nk.value}
                  onChange={(e) =>
                    setNewKeys((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                  }
                  placeholder="value"
                  className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-claw-600"
                />
                <button
                  onClick={() => setNewKeys((p) => p.filter((_, j) => j !== i))}
                  className="w-24 text-right text-[10px] text-slate-500 hover:text-slate-300"
                >
                  cancel
                </button>
              </div>
            ))}
            <button
              onClick={() => setNewKeys((p) => [...p, { name: "", value: "" }])}
              className="rounded-md border border-dashed border-ink-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-ink-800"
            >
              + Add a custom key
            </button>
          </div>
        </section>

        <div className="flex justify-end pb-10">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-claw-600 px-5 py-2 text-sm font-medium text-white hover:bg-claw-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
