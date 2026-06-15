import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

// Existing module imports from your structure
import LeftPanel from "../dashboard/LeftPanel";
import SwarmCanvas from "../dashboard/SwarmCanvas";
import ChatStream from "../dashboard/ChatStream";
import SteelBrowser from "../dashboard/SteelBrowser";
import AgentInspector from "../dashboard/AgentInspector";
import SwarmStatusStrip from "../dashboard/SwarmStatusStrip";
import RelayIndicator from "./RelayIndicator";

export default function AppLayout() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="grid grid-cols-[64px_1fr_auto] h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-50 font-sans antialiased">

      {/* COLUMN 1: UNIVERSAL NAVIGATION RAIL */}
      <aside className="flex flex-col items-center justify-between py-4 border-r border-[#27272a] bg-[#09090b] z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Main App Brand Mark */}
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20">
            <span className="font-bold text-sm text-white tracking-tighter">⚡</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
          </div>

          <Separator className="w-8 bg-[#27272a]" />

          {/* Main Workspace Switcher Links */}
          <LeftPanel />
        </div>

        {/* Global Security / Profile Action */}
        <div className="flex flex-col items-center gap-4">
          <button className="h-9 w-9 rounded-lg flex items-center justify-center border border-[#27272a] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all duration-200">
            🔒
          </button>
        </div>
      </aside>

      {/* COLUMN 2: THE SWARM WORKSPACE ENGINE */}
      <main className="flex flex-col h-full min-w-0 bg-[#09090b]">

        {/* Top Operational Status Bar */}
        <header className="flex h-14 items-center justify-between px-6 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-sm tracking-tight text-zinc-200">OpenClaw Engine</h1>
            <Badge variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-400 font-mono text-[10px] px-2 py-0.5">
              v1.4.2-alpha
            </Badge>
          </div>

          {/* Real-time Infrastructure Badges */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <SwarmStatusStrip />
            <Separator orientation="vertical" className="h-4 bg-[#27272a]" />
            <RelayIndicator />
            <Separator orientation="vertical" className="h-4 bg-[#27272a]" />
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Toggle Inspector Sidebar"
            >
              {rightPanelOpen ? "📂 Close Inspector" : "📁 Open Inspector"}
            </button>
          </div>
        </header>

        {/* Dynamic Nested Splitting Zones */}
        <div className="flex-1 grid grid-rows-[42%_58%] p-4 gap-4 overflow-hidden max-h-[calc(100vh-56px)]">

          {/* Top Layer: Visual Swarm Execution Grid */}
          <Card className="relative overflow-hidden border border-[#27272a]/60 bg-[#18181b]/30 shadow-inner rounded-xl">
            <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">Live Swarm Canvas Graph</span>
            </div>
            {/* Dots Grid Graphic Background overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
            <div className="w-full h-full p-2">
              <SwarmCanvas />
            </div>
          </Card>

          {/* Bottom Layer: Dynamic Context Switcher Tabs */}
          <Card className="flex flex-col overflow-hidden border border-[#27272a]/80 bg-[#18181b]/60 backdrop-blur-sm rounded-xl shadow-xl">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between px-4 border-b border-[#27272a] bg-zinc-900/30">
                <TabsList className="h-11 bg-transparent p-0 gap-4">
                  <TabsTrigger
                    value="chat"
                    className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent text-xs font-medium text-zinc-400 data-[state=active]:text-zinc-100 transition-all px-1"
                  >
                    💬 Live Log Stream
                  </TabsTrigger>
                  <TabsTrigger
                    value="browser"
                    className="h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent text-xs font-medium text-zinc-400 data-[state=active]:text-zinc-100 transition-all px-1"
                  >
                    🌐 Steel Sandbox Browser
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                  <span>SANDBOX_ID:</span>
                  <span className="text-zinc-400">oc-node-00-runtime</span>
                </div>
              </div>

              {/* View Pane 1: Agent Logs & Streams */}
              <TabsContent value="chat" className="flex-1 m-0 overflow-y-auto bg-gradient-to-b from-[#09090b]/10 to-[#09090b]/40">
                <div className="h-full p-4">
                  <ChatStream />
                </div>
              </TabsContent>

              {/* View Pane 2: Target Browser Capture */}
              <TabsContent value="browser" className="flex-1 m-0 overflow-hidden bg-[#09090b]">
                <div className="w-full h-full relative">
                  <SteelBrowser />
                </div>
              </TabsContent>
            </Tabs>
          </Card>

        </div>
      </main>

      {/* COLUMN 3: TELEMETRY & INSPECTOR SIDEBAR */}
      {rightPanelOpen && (
        <aside className="w-[340px] h-screen border-l border-[#27272a] bg-[#09090b] flex flex-col overflow-hidden z-10 transition-all duration-300 animate-in slide-in-from-right-4">
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#27272a] bg-zinc-900/10">
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Telemetry Inspector</span>
            <Badge variant="outline" className="border-emerald-800 bg-emerald-950/30 text-emerald-400 font-mono text-[9px]">
              ONLINE
            </Badge>
          </div>

          {/* Mount Target for selected agents, tokens, and active validations */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <AgentInspector />
          </div>
        </aside>
      )}

    </div>
  );
}
