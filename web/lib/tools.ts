// Tool schemas (OpenAI function-calling format) + a dispatcher. The chat route
// advertises only the tools that are (a) configured and (b) relevant to the
// active agent, then routes the model's tool calls here.

import { webSearch, searchConfigured } from "./search";
import { crawlUrl, crawlConfigured } from "./crawl";
import { memorySave, memorySearch, memoryConfigured } from "./memory";
import { runCode, sandboxConfigured } from "./sandbox";
import type { Agent } from "./agents";

export type ToolName = "web_search" | "web_crawl" | "memory_search" | "memory_save" | "run_code";

const SCHEMAS: Record<ToolName, any> = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for current information, papers, or facts. Returns titles, URLs and snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query." },
        },
        required: ["query"],
      },
    },
  },
  web_crawl: {
    type: "function",
    function: {
      name: "web_crawl",
      description: "Fetch and read the full content of a specific web page (returned as clean markdown). Use to read an article or paper page found via web_search.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The page URL to read." },
        },
        required: ["url"],
      },
    },
  },
  memory_search: {
    type: "function",
    function: {
      name: "memory_search",
      description: "Retrieve relevant notes the team previously saved to long-term vector memory.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to recall." },
        },
        required: ["query"],
      },
    },
  },
  memory_save: {
    type: "function",
    function: {
      name: "memory_save",
      description: "Persist an important fact, decision, or finding to long-term vector memory for later recall.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The note to remember." },
        },
        required: ["text"],
      },
    },
  },
  run_code: {
    type: "function",
    function: {
      name: "run_code",
      description: "Execute code in a secure sandbox and return stdout/stderr. Use to verify results, not guess them.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Source code to run." },
          language: { type: "string", enum: ["python", "javascript"], description: "Language (default python)." },
        },
        required: ["code"],
      },
    },
  },
};

function toolAvailable(name: ToolName): boolean {
  switch (name) {
    case "web_search":
      return searchConfigured();
    case "web_crawl":
      return crawlConfigured();
    case "memory_search":
    case "memory_save":
      return memoryConfigured();
    case "run_code":
      return sandboxConfigured();
  }
}

// The tool schemas to send for a given agent: the agent's preferred tools,
// intersected with what's actually configured.
export function toolsForAgent(agent: Agent): any[] {
  return agent.tools.filter(toolAvailable).map((t) => SCHEMAS[t]);
}

// Run one tool call and return a string result for the model to read.
export async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "web_search": {
        const r = await webSearch(String(args.query));
        const lines = r.results
          .map((x, i) => `${i + 1}. ${x.title}\n   ${x.url}\n   ${x.snippet}`)
          .join("\n\n");
        return `[${r.provider}] results for "${r.query}":\n${r.answer ? `Answer: ${r.answer}\n\n` : ""}${lines || "(no results)"}`;
      }
      case "web_crawl": {
        const r = await crawlUrl(String(args.url));
        const body = r.markdown.slice(0, 6000);
        return `# ${r.title ?? r.url}\n${r.url}\n\n${body}${r.markdown.length > 6000 ? "\n…[truncated]" : ""}`;
      }
      case "memory_search": {
        const hits = await memorySearch(String(args.query));
        if (!hits.length) return "(no relevant memories found)";
        return hits.map((h, i) => `${i + 1}. (${h.score.toFixed(2)}) ${h.text}`).join("\n");
      }
      case "memory_save": {
        const { id } = await memorySave(String(args.text));
        return `Saved to memory (id: ${id}).`;
      }
      case "run_code": {
        const r = await runCode(String(args.code), args.language || "python");
        const parts = [];
        if (r.stdout) parts.push(`stdout:\n${r.stdout}`);
        if (r.stderr) parts.push(`stderr:\n${r.stderr}`);
        if (r.error) parts.push(`error:\n${r.error}`);
        if (r.text && !r.stdout) parts.push(`result:\n${r.text}`);
        return parts.join("\n\n") || "(no output)";
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `Tool "${name}" failed: ${e?.message ?? String(e)}`;
  }
}
