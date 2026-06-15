# ⚡ OpenClaw Omega — Orchestrator Dashboard

A real-time control surface for the OpenClaw multi-agent fleet (the BOS-AURA
layout). Built with **Vite + React + TypeScript + Tailwind**.

## Layout

A unified **3-column** workspace (`src/components/layout/AppLayout.tsx`):

1. **Navigation rail** (`LeftPanel`) — one switcher per agent, with live
   status dots; selecting an agent drives the inspector + canvas highlight.
2. **Swarm workspace engine** — split into:
   - **Swarm Canvas** (`SwarmCanvas`) — the live agent graph: planner hub,
     `main` arbiter, seven specialists, animated `agentToAgent` relay edges.
   - **Context tabs** — `💬 Live Log Stream` (`ChatStream`) and
     `🌐 Steel Sandbox Browser` (`SteelBrowser`).
   - Top status bar with `SwarmStatusStrip` + `RelayIndicator`.
3. **Telemetry inspector** (`AgentInspector`) — model, status, token/cost
   telemetry, and recent activity for the selected agent. Toggleable.

## How it operates

A lightweight in-memory store (`src/lib/store.tsx`) simulates the running
swarm: every ~1.8s an agent emits an event (message / tool call / relay),
telemetry accrues, statuses flip, and a relay edge fires. The fleet model
(`src/lib/agents.ts`) mirrors `agents.yaml` at the repo root, so the UI maps
1:1 onto the real 9-agent configuration. Swap the simulation in `store.tsx`
for a websocket/SSE feed from the OpenClaw gateway to go live.

## Run

```bash
cd artifacts/openclaw
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Structure

```
src/
├── App.tsx                     # wraps AppLayout in SwarmProvider
├── lib/
│   ├── agents.ts               # fleet model + relays (mirrors agents.yaml)
│   ├── store.tsx               # live simulation store + hooks
│   └── utils.ts                # cn() class merge helper
└── components/
    ├── ui/                     # tabs · card · badge · separator
    ├── layout/                 # AppLayout · RelayIndicator
    └── dashboard/              # LeftPanel · SwarmCanvas · ChatStream
                                # SteelBrowser · AgentInspector · SwarmStatusStrip
```
