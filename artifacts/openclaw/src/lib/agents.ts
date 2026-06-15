// The OpenClaw agent fleet — mirrors agents.yaml at the repo root.

export type AgentStatus = "idle" | "thinking" | "running" | "blocked";

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  status: AgentStatus;
  tokens: number; // tokens consumed this session
  tasks: number; // tasks handled this session
}

export const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#52525b", // zinc-600
  thinking: "#818cf8", // indigo-400
  running: "#34d399", // emerald-400
  blocked: "#f87171", // red-400
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  running: "Running",
  blocked: "Blocked",
};

// Source of truth for the fleet. The hub is `planner`; `main` is the
// orchestrator/arbiter. Roles/models match agents.yaml.
export const FLEET: Agent[] = [
  { id: "main", name: "OpenClaw", emoji: "🐾", role: "Orchestrator · Audit · Arbiter", model: "zai/glm-5", status: "running", tokens: 0, tasks: 0 },
  { id: "planner", name: "Planner", emoji: "🧠", role: "Task decomposition & coordination", model: "zai/glm-5", status: "running", tokens: 0, tasks: 0 },
  { id: "ideator", name: "Ideator", emoji: "💡", role: "Idea generation & novelty", model: "zai/glm-5", status: "thinking", tokens: 0, tasks: 0 },
  { id: "critic", name: "Critic", emoji: "🎯", role: "SHARP taste evaluation", model: "zai/glm-5", status: "thinking", tokens: 0, tasks: 0 },
  { id: "surveyor", name: "Surveyor", emoji: "📚", role: "Literature search & analysis", model: "zai/glm-5", status: "running", tokens: 0, tasks: 0 },
  { id: "coder", name: "Coder", emoji: "💻", role: "Implementation & experiments", model: "zai/glm-5", status: "idle", tokens: 0, tasks: 0 },
  { id: "writer", name: "Writer", emoji: "✍️", role: "Paper writing & LaTeX", model: "zai/glm-5", status: "idle", tokens: 0, tasks: 0 },
  { id: "reviewer", name: "Reviewer", emoji: "🔍", role: "Internal peer review", model: "zai/glm-5", status: "idle", tokens: 0, tasks: 0 },
  { id: "scout", name: "Scout", emoji: "📰", role: "Daily digest & intel", model: "zai/glm-5", status: "blocked", tokens: 0, tasks: 0 },
];

// Directed relay edges (from → to), mirroring agentToAgent allow-rules:
// everything routes through the planner; ideator↔critic and writer↔reviewer peer.
export const RELAYS: Array<[string, string]> = [
  ["main", "planner"],
  ["planner", "ideator"],
  ["planner", "critic"],
  ["planner", "surveyor"],
  ["planner", "coder"],
  ["planner", "writer"],
  ["planner", "reviewer"],
  ["planner", "scout"],
  ["ideator", "critic"],
  ["writer", "reviewer"],
  ["scout", "surveyor"],
];
