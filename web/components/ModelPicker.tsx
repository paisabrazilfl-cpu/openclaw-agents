"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelOption, Provider } from "@/lib/providers";

type State = "unknown" | "checking" | "alive" | "down";
type Status = { state: State; ms?: number; error?: string; ts?: number };

const KEY = "openclaw.modelStatus.v1";
const PROVIDER_LABEL: Record<Provider, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  gemini: "Google Gemini",
  nvidia: "NVIDIA NIM",
  bitdeer: "Bitdeer",
};

const keyOf = (m: { provider: Provider; model: string }) => `${m.provider}:${m.model}`;

function loadStatuses(): Record<string, Status> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function Dot({ s }: { s?: Status }) {
  const state = s?.state ?? "unknown";
  const cls =
    state === "alive"
      ? "bg-emerald-400"
      : state === "down"
        ? "bg-rose-500"
        : state === "checking"
          ? "bg-amber-400 animate-pulse"
          : "bg-stone-600";
  const title =
    state === "alive"
      ? `alive${s?.ms ? ` · ${s.ms}ms` : ""}`
      : state === "down"
        ? `down${s?.error ? ` · ${s.error}` : ""}`
        : state === "checking"
          ? "checking…"
          : "not checked";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} title={title} />;
}

export function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: ModelOption[];
  value: string;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [checkingAll, setCheckingAll] = useState(false);
  const persist = useRef<Record<string, Status>>({});

  useEffect(() => {
    const s = loadStatuses();
    persist.current = s;
    setStatuses(s);
  }, []);

  const current = models.find((m) => m.model === value);

  const setStatus = useCallback((k: string, st: Status) => {
    setStatuses((prev) => {
      const next = { ...prev, [k]: st };
      if (st.state === "alive" || st.state === "down") {
        persist.current = { ...persist.current, [k]: { ...st, ts: Date.now() } };
        try {
          localStorage.setItem(KEY, JSON.stringify(persist.current));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  const probe = useCallback(
    async (m: ModelOption) => {
      const k = keyOf(m);
      setStatus(k, { state: "checking" });
      try {
        const r = await fetch("/api/probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: m.provider, model: m.model }),
        });
        const d = await r.json();
        setStatus(k, d.ok ? { state: "alive", ms: d.ms } : { state: "down", ms: d.ms, error: d.error });
      } catch (e: any) {
        setStatus(k, { state: "down", error: e?.message ?? "error" });
      }
    },
    [setStatus],
  );

  // Auto-probe the active model if we have no recent status for it.
  useEffect(() => {
    if (!current) return;
    const k = keyOf(current);
    const s = persist.current[k];
    if (!s || !s.ts || Date.now() - s.ts > 10 * 60_000) probe(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, models.length]);

  const checkAll = useCallback(async () => {
    setCheckingAll(true);
    const queue = [...models];
    const workers = Array.from({ length: 5 }, async () => {
      while (queue.length) {
        const m = queue.shift();
        if (m) await probe(m);
      }
    });
    await Promise.all(workers);
    setCheckingAll(false);
  }, [models, probe]);

  // Group by provider for display.
  const groups: { provider: Provider; items: ModelOption[] }[] = [];
  for (const m of models) {
    let g = groups.find((x) => x.provider === m.provider);
    if (!g) groups.push((g = { provider: m.provider, items: [] }));
    g.items.push(m);
  }

  const aliveCount = Object.values(statuses).filter((s) => s.state === "alive").length;

  return (
    <div className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-1.5 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-stone-300 outline-none hover:border-claw-600"
      >
        <Dot s={current ? statuses[keyOf(current)] : undefined} />
        <span className="truncate">{current?.label ?? "Select model"}</span>
        <span className="text-stone-600">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 max-h-[70vh] w-[min(22rem,88vw)] overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 shadow-xl">
            <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-ink-700 bg-ink-900 px-3 py-2">
              <span className="text-[11px] text-stone-500">
                {aliveCount > 0 ? `${aliveCount} alive` : "live status"}
              </span>
              <button
                onClick={checkAll}
                disabled={checkingAll}
                className="rounded-md border border-ink-700 px-2 py-1 text-[11px] text-stone-300 hover:bg-ink-800 disabled:opacity-50"
              >
                {checkingAll ? "checking…" : "⟳ Check all"}
              </button>
            </div>
            {groups.map((g) => (
              <div key={g.provider}>
                <div className="px-3 pt-2 text-[10px] font-medium uppercase tracking-wider text-stone-600">
                  {PROVIDER_LABEL[g.provider]}
                </div>
                {g.items.map((m) => {
                  const st = statuses[keyOf(m)];
                  const active = m.model === value;
                  return (
                    <button
                      key={keyOf(m)}
                      onClick={() => {
                        onChange(m.model);
                        setOpen(false);
                      }}
                      onDoubleClick={() => probe(m)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-ink-800 ${
                        active ? "bg-claw-600/15" : ""
                      }`}
                    >
                      <Dot s={st} />
                      <span className="min-w-0 flex-1 truncate text-stone-200">
                        {m.label.replace(/ · .*$/, "")}
                      </span>
                      {st?.state === "alive" && st.ms != null && (
                        <span className="shrink-0 text-[10px] text-emerald-500/70">{st.ms}ms</span>
                      )}
                      {st?.state === "down" && <span className="shrink-0 text-[10px] text-rose-500/70">down</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="border-t border-ink-700 px-3 py-2 text-[10px] text-stone-600">
              🟢 alive · 🔴 down · ⚪ unchecked — double-tap a model to recheck it
            </div>
          </div>
        </>
      )}
    </div>
  );
}
