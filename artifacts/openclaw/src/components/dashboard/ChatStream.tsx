import { useEffect, useRef } from "react";
import { useSwarm } from "@/lib/store";
import { FLEET } from "@/lib/agents";

const EMOJI = Object.fromEntries(FLEET.map((a) => [a.id, a.emoji]));

const KIND_STYLE: Record<string, string> = {
  msg: "text-zinc-300",
  tool: "text-amber-300",
  relay: "text-indigo-300",
  system: "text-zinc-500",
};

const KIND_TAG: Record<string, string> = {
  msg: "MSG",
  tool: "TOOL",
  relay: "RELAY",
  system: "SYS",
};

// Live, append-only log of fleet activity (auto-scrolls to the newest line).
export default function ChatStream() {
  const { log } = useSwarm();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed">
      {log.length === 0 && (
        <div className="text-zinc-600 italic">Awaiting swarm activity…</div>
      )}
      {log.map((e) => (
        <div key={e.id} className="flex items-start gap-2 py-0.5">
          <span className="text-zinc-600 tabular-nums">{e.ts}</span>
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
            {KIND_TAG[e.kind]}
          </span>
          <span className="shrink-0">{EMOJI[e.agentId] ?? "•"}</span>
          <span className="shrink-0 text-zinc-500">{e.agentId}</span>
          <span className="text-zinc-700">›</span>
          <span className={KIND_STYLE[e.kind]}>{e.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
