import { useSwarm } from "@/lib/store";
import { STATUS_COLOR } from "@/lib/agents";
import { cn } from "@/lib/utils";

// Workspace switcher rail — one button per agent in the fleet. Selecting an
// agent drives the AgentInspector and highlights it on the SwarmCanvas.
export default function LeftPanel() {
  const { agents, selectedId, setSelectedId } = useSwarm();

  return (
    <nav className="flex flex-col items-center gap-2 w-full">
      {agents.map((a) => {
        const active = a.id === selectedId;
        return (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            title={`${a.name} — ${a.role}`}
            className={cn(
              "relative h-9 w-9 rounded-lg flex items-center justify-center text-base transition-all duration-200 border",
              active
                ? "border-indigo-500/60 bg-indigo-500/10"
                : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            )}
          >
            <span>{a.emoji}</span>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#09090b]"
              style={{ backgroundColor: STATUS_COLOR[a.status] }}
            />
          </button>
        );
      })}
    </nav>
  );
}
