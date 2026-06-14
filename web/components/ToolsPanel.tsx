"use client";

import { useState } from "react";
import type { IntegrationStatus } from "@/lib/env";

type Tab = "search" | "memory" | "exec";

export function ToolsPanel({ status }: { status: IntegrationStatus | null }) {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-ink-700 p-2">
        <TabBtn active={tab === "search"} onClick={() => setTab("search")} on={!!status?.search}>
          🔎 Search
        </TabBtn>
        <TabBtn active={tab === "memory"} onClick={() => setTab("memory")} on={!!status?.memory}>
          🧠 Memory
        </TabBtn>
        <TabBtn active={tab === "exec"} onClick={() => setTab("exec")} on={!!status?.exec}>
          ⚡ Run
        </TabBtn>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "search" && <SearchTool enabled={!!status?.search} />}
        {tab === "memory" && <MemoryTool enabled={!!status?.memory} />}
        {tab === "exec" && <ExecTool enabled={!!status?.exec} />}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  on,
  onClick,
  children,
}: {
  active: boolean;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
        active ? "bg-ink-700 text-slate-100" : "text-slate-400 hover:bg-ink-800"
      }`}
    >
      {children} <span className={on ? "text-emerald-400" : "text-slate-600"}>●</span>
    </button>
  );
}

function Disabled({ label }: { label: string }) {
  return (
    <p className="text-xs leading-snug text-slate-500">
      {label} is not configured. Add the relevant key to <code>web/.env.local</code> and restart.
    </p>
  );
}

function SearchTool({ enabled }: { enabled: boolean }) {
  const [q, setQ] = useState("");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  if (!enabled) return <Disabled label="Web search" />;
  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setOut(null);
    const r = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    setOut(await r.json());
    setLoading(false);
  };
  return (
    <div className="space-y-2">
      <Row value={q} onChange={setQ} onRun={run} placeholder="Search the web…" loading={loading} />
      {out?.error && <p className="text-xs text-rose-400">{out.error}</p>}
      {out?.answer && <p className="rounded bg-ink-800 p-2 text-xs text-slate-300">{out.answer}</p>}
      {out?.results?.map((r: any, i: number) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border border-ink-700 p-2 hover:border-claw-600/50"
        >
          <div className="text-xs font-medium text-claw-400">{r.title}</div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{r.snippet}</div>
        </a>
      ))}
    </div>
  );
}

function MemoryTool({ enabled }: { enabled: boolean }) {
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  if (!enabled) return <Disabled label="Vector memory" />;
  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const r = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: q }),
    });
    setOut(await r.json());
    setLoading(false);
  };
  const save = async () => {
    if (!note.trim()) return;
    setLoading(true);
    const r = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", text: note }),
    });
    const j = await r.json();
    setOut(j.error ? j : { saved: j.id });
    setNote("");
    setLoading(false);
  };
  return (
    <div className="space-y-3">
      <Row value={q} onChange={setQ} onRun={search} placeholder="Recall from memory…" loading={loading} />
      <div className="space-y-1.5">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Save a note to memory…"
          rows={2}
          className="w-full resize-none rounded-md border border-ink-700 bg-ink-950 p-2 text-xs outline-none focus:border-claw-600"
        />
        <button onClick={save} className="rounded-md bg-ink-700 px-2.5 py-1 text-xs hover:bg-ink-600">
          Save note
        </button>
      </div>
      {out?.error && <p className="text-xs text-rose-400">{out.error}</p>}
      {out?.saved && <p className="text-xs text-emerald-400">Saved ({out.saved})</p>}
      {out?.hits?.map((h: any, i: number) => (
        <div key={i} className="rounded-md border border-ink-700 p-2 text-[11px]">
          <span className="text-slate-500">{h.score?.toFixed(2)}</span>{" "}
          <span className="text-slate-300">{h.text}</span>
        </div>
      ))}
    </div>
  );
}

function ExecTool({ enabled }: { enabled: boolean }) {
  const [code, setCode] = useState("print('hello from E2B')");
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  if (!enabled) return <Disabled label="Code execution" />;
  const run = async () => {
    setLoading(true);
    setOut(null);
    const r = await fetch("/api/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: "python" }),
    });
    setOut(await r.json());
    setLoading(false);
  };
  return (
    <div className="space-y-2">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={6}
        spellCheck={false}
        className="w-full resize-none rounded-md border border-ink-700 bg-ink-950 p-2 font-mono text-xs outline-none focus:border-claw-600"
      />
      <button
        onClick={run}
        disabled={loading}
        className="rounded-md bg-claw-600 px-3 py-1 text-xs font-medium text-white hover:bg-claw-500 disabled:opacity-50"
      >
        {loading ? "Running…" : "Run (Python)"}
      </button>
      {out?.error && <pre className="whitespace-pre-wrap rounded bg-ink-950 p-2 text-[11px] text-rose-400">{out.error}</pre>}
      {out?.stdout && <pre className="whitespace-pre-wrap rounded bg-ink-950 p-2 text-[11px] text-emerald-300">{out.stdout}</pre>}
      {out?.stderr && <pre className="whitespace-pre-wrap rounded bg-ink-950 p-2 text-[11px] text-amber-300">{out.stderr}</pre>}
    </div>
  );
}

function Row({
  value,
  onChange,
  onRun,
  placeholder,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  placeholder: string;
  loading: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onRun()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs outline-none focus:border-claw-600"
      />
      <button
        onClick={onRun}
        disabled={loading}
        className="rounded-md bg-ink-700 px-2.5 py-1 text-xs hover:bg-ink-600 disabled:opacity-50"
      >
        {loading ? "…" : "Go"}
      </button>
    </div>
  );
}
