import { useSwarm } from "@/lib/store";

// Compact real-time infrastructure readout shown in the top status bar.
export default function SwarmStatusStrip() {
  const { agents } = useSwarm();
  const online = agents.filter((a) => a.status !== "idle").length;
  const running = agents.filter((a) => a.status === "running").length;
  const blocked = agents.filter((a) => a.status === "blocked").length;
  const tokens = agents.reduce((sum, a) => sum + a.tokens, 0);

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  return (
    <div className="flex items-center gap-4 text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {online}/{agents.length} active
      </span>
      <span className="text-zinc-500">
        ▶ <span className="text-emerald-400">{running}</span> running
      </span>
      {blocked > 0 && (
        <span className="text-zinc-500">
          ✦ <span className="text-red-400">{blocked}</span> blocked
        </span>
      )}
      <span className="text-zinc-500">
        Σ <span className="text-zinc-300">{fmt(tokens)}</span> tok
      </span>
    </div>
  );
}
