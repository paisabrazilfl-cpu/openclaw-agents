import { useSwarm } from "@/lib/store";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/agents";
import { Separator } from "@/components/ui/separator";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#27272a] bg-zinc-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-zinc-100">{value}</div>
    </div>
  );
}

// Detail panel for the currently selected agent, plus its recent activity.
export default function AgentInspector() {
  const { agents, selectedId, log } = useSwarm();
  const agent = agents.find((a) => a.id === selectedId);
  if (!agent) return null;

  const recent = log.filter((e) => e.agentId === agent.id).slice(-8).reverse();

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#27272a] bg-zinc-900 text-2xl">
          {agent.emoji}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{agent.name}</div>
          <div className="truncate text-xs text-zinc-500">{agent.role}</div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[agent.status] }} />
        <span className="text-zinc-300">{STATUS_LABEL[agent.status]}</span>
        <span className="ml-auto rounded border border-[#27272a] bg-zinc-900/60 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {agent.id}
        </span>
      </div>

      <Separator />

      {/* Telemetry */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Model" value={agent.model} />
        <Stat label="Tasks" value={`${agent.tasks}`} />
        <Stat label="Tokens" value={agent.tokens.toLocaleString()} />
        <Stat label="Est. cost" value={`$${(agent.tokens * 0.000002).toFixed(3)}`} />
      </div>

      <Separator />

      {/* Recent activity */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">Recent activity</div>
        <div className="space-y-1.5">
          {recent.length === 0 && <div className="text-xs italic text-zinc-600">No recent events.</div>}
          {recent.map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-zinc-600">{e.ts}</span>
              <span className="text-zinc-300">{e.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
