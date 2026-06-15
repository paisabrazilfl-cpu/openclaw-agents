import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FLEET, RELAYS, type Agent, type AgentStatus } from "./agents";

export interface LogEntry {
  id: number;
  ts: string;
  agentId: string;
  kind: "msg" | "tool" | "relay" | "system";
  text: string;
}

interface SwarmStore {
  agents: Agent[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  log: LogEntry[];
  activeRelay: number; // index into RELAYS that is currently "firing"
  relayConnected: boolean;
}

const SwarmContext = createContext<SwarmStore | null>(null);

const STATUSES: AgentStatus[] = ["idle", "thinking", "running", "blocked"];

const SAMPLE_ACTIONS: Record<string, string[]> = {
  planner: ["Decomposed task into 4 subtasks", "Routed work to surveyor", "Updated progress tracker"],
  ideator: ["Generated 3 candidate directions", "Refined contribution framing", "Pinged critic for taste check"],
  critic: ["Flagged anti-pattern in idea #2", "Approved framing via SHARP gate", "Requested novelty evidence"],
  surveyor: ["Crawled 12 papers via freecrawl", "Built citation cluster", "Found 2 research gaps"],
  coder: ["Ran experiment batch 03", "Optimized inner loop", "Committed reproduction script"],
  writer: ["Drafted Related Work", "Tightened abstract", "Synced LaTeX figures"],
  reviewer: ["Diagnosed weakness in §4", "Drafted rebuttal points", "Scored soundness 6/10"],
  scout: ["Queued daily digest", "Detected competitor preprint", "Flagged collision alert"],
  main: ["Audited fleet output", "Arbitrated writer/reviewer conflict", "Approved milestone"],
};

let seq = 1;

export function SwarmProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(() => FLEET.map((a) => ({ ...a })));
  const [selectedId, setSelectedId] = useState<string>("planner");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeRelay, setActiveRelay] = useState(0);
  const [relayConnected] = useState(true);
  const tick = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      tick.current += 1;

      // Pick a random active agent and emit an event.
      const pool = FLEET.filter((a) => a.id !== "main");
      const agent = pool[Math.floor(Math.random() * pool.length)];
      const actions = SAMPLE_ACTIONS[agent.id] ?? ["Working…"];
      const text = actions[Math.floor(Math.random() * actions.length)];
      const kind: LogEntry["kind"] = Math.random() < 0.25 ? "relay" : Math.random() < 0.4 ? "tool" : "msg";

      setLog((prev) => {
        const entry: LogEntry = {
          id: seq++,
          ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agentId: agent.id,
          kind,
          text,
        };
        return [...prev.slice(-80), entry];
      });

      // Nudge agent telemetry + occasionally flip statuses.
      setAgents((prev) =>
        prev.map((a) => {
          if (a.id !== agent.id) return a;
          const status =
            Math.random() < 0.3 ? STATUSES[Math.floor(Math.random() * STATUSES.length)] : a.status;
          return {
            ...a,
            status,
            tokens: a.tokens + Math.floor(Math.random() * 900) + 50,
            tasks: a.tasks + (kind === "msg" ? 1 : 0),
          };
        })
      );

      setActiveRelay(Math.floor(Math.random() * RELAYS.length));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const value = useMemo<SwarmStore>(
    () => ({ agents, selectedId, setSelectedId, log, activeRelay, relayConnected }),
    [agents, selectedId, log, activeRelay, relayConnected]
  );

  return <SwarmContext.Provider value={value}>{children}</SwarmContext.Provider>;
}

export function useSwarm() {
  const ctx = useContext(SwarmContext);
  if (!ctx) throw new Error("useSwarm must be used within SwarmProvider");
  return ctx;
}
