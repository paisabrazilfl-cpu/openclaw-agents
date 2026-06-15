import { useSwarm } from "@/lib/store";
import { RELAYS, STATUS_COLOR } from "@/lib/agents";
import { cn } from "@/lib/utils";

// Fixed force-free layout: planner is the hub, main feeds it from the top,
// the seven specialists fan out around it.
const POS: Record<string, { x: number; y: number }> = {
  main: { x: 450, y: 56 },
  planner: { x: 450, y: 200 },
  ideator: { x: 180, y: 140 },
  critic: { x: 175, y: 290 },
  surveyor: { x: 720, y: 120 },
  coder: { x: 760, y: 235 },
  writer: { x: 690, y: 340 },
  reviewer: { x: 470, y: 358 },
  scout: { x: 250, y: 360 },
};

export default function SwarmCanvas() {
  const { agents, selectedId, setSelectedId, activeRelay } = useSwarm();
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <svg viewBox="0 0 900 400" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {/* Relay edges */}
      {RELAYS.map(([from, to], i) => {
        const a = POS[from];
        const b = POS[to];
        if (!a || !b) return null;
        const active = i === activeRelay;
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={active ? "#818cf8" : "#27272a"}
            strokeWidth={active ? 2 : 1}
            strokeDasharray={active ? "6 6" : undefined}
            className={active ? "animate-edge-flow" : undefined}
            opacity={active ? 0.9 : 0.55}
          />
        );
      })}

      {/* Agent nodes */}
      {agents.map((agent) => {
        const p = POS[agent.id];
        if (!p) return null;
        const a = byId[agent.id];
        const selected = agent.id === selectedId;
        const isHub = agent.id === "planner";
        const r = isHub ? 30 : 24;
        return (
          <g
            key={agent.id}
            transform={`translate(${p.x} ${p.y})`}
            className="cursor-pointer"
            onClick={() => setSelectedId(agent.id)}
          >
            {selected && (
              <circle r={r + 7} fill="none" stroke="#6366f1" strokeWidth={1.5} opacity={0.7} />
            )}
            <circle
              r={r}
              fill="#18181b"
              stroke={STATUS_COLOR[a.status]}
              strokeWidth={2.5}
            />
            {a.status === "running" && (
              <circle r={r} fill="none" stroke={STATUS_COLOR[a.status]} strokeWidth={2.5} opacity={0.4}>
                <animate attributeName="r" from={r} to={r + 8} dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <text textAnchor="middle" dy="0.35em" fontSize={isHub ? 22 : 18}>
              {agent.emoji}
            </text>
            <text
              textAnchor="middle"
              y={r + 14}
              fontSize={11}
              className={cn("font-mono", selected ? "fill-zinc-100" : "fill-zinc-500")}
            >
              {agent.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
