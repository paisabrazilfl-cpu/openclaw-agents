import { useState } from "react";

// Mock of the "Steel" sandbox browser pane — the surface where browser/scrape
// tools (e.g. freecrawl) render captured targets inside an isolated node.
export default function SteelBrowser() {
  const [url, setUrl] = useState("https://arxiv.org/list/cs.LG/recent");

  return (
    <div className="flex h-full w-full flex-col bg-[#09090b]">
      {/* Chrome / URL bar */}
      <div className="flex items-center gap-2 border-b border-[#27272a] px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="ml-2 flex flex-1 items-center gap-2 rounded-md border border-[#27272a] bg-zinc-900/60 px-3 py-1">
          <span className="text-emerald-400 text-xs">🔒</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-transparent text-xs text-zinc-300 outline-none"
            spellCheck={false}
          />
        </div>
        <span className="rounded border border-[#27272a] bg-zinc-900/60 px-2 py-1 font-mono text-[10px] text-zinc-500">
          steel · oc-node-00
        </span>
      </div>

      {/* Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:18px_18px] opacity-50" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3 text-center">
          <div className="text-4xl opacity-60">🌐</div>
          <div className="font-mono text-xs text-zinc-500">
            Sandbox viewport — rendered capture of
          </div>
          <div className="max-w-md truncate font-mono text-xs text-zinc-300">{url}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            headless chromium · isolated egress
          </div>
        </div>
      </div>
    </div>
  );
}
