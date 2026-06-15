import { useSwarm } from "@/lib/store";
import { RELAYS } from "@/lib/agents";

// Shows the agentToAgent relay bus health + the edge currently firing.
export default function RelayIndicator() {
  const { relayConnected, activeRelay } = useSwarm();
  const [from, to] = RELAYS[activeRelay] ?? ["—", "—"];

  return (
    <div className="flex items-center gap-2 text-zinc-400">
      <span className="relative flex h-2 w-2">
        {relayConnected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            relayConnected ? "bg-emerald-400" : "bg-red-500"
          }`}
        />
      </span>
      <span className="text-zinc-500">relay</span>
      <span className="text-zinc-300">
        {from} <span className="text-indigo-400">→</span> {to}
      </span>
    </div>
  );
}
