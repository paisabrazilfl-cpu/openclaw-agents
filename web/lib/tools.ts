// Tool schemas (OpenAI function-calling format) + a dispatcher. The chat route
// advertises only the tools that are (a) configured and (b) relevant to the
// active agent, then routes the model's tool calls here.

import { webSearch, searchConfigured } from "./search";
import { crawlUrl, crawlConfigured } from "./crawl";
import { memorySave, memorySearch, memoryConfigured } from "./memory";
import { runCode, sandboxConfigured } from "./sandbox";
import { githubCall, githubConfigured } from "./github";
import { composioCall, composioConfigured } from "./composio";
import { browserCall, browserConfigured } from "./browser";
import type { Agent } from "./agents";

export type ToolName =
  | "web_search"
  | "web_crawl"
  | "browser"
  | "memory_search"
  | "memory_save"
  | "run_code"
  | "github"
  | "composio";

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
  browser: {
    type: "function",
    function: {
      name: "browser",
      description: "Open a URL in a real headless browser (Steel) — runs JavaScript, returns the rendered page as markdown, or captures a screenshot. Use for JS-heavy pages or when web_crawl returns little.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["scrape", "screenshot"], description: "scrape rendered text or screenshot the page." },
          url: { type: "string", description: "The page URL." },
        },
        required: ["action", "url"],
      },
    },
  },
  github: {
    type: "function",
    function: {
      name: "github",
      description: "Query GitHub: read a repo's metadata, read a file, list issues, or search code.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["get_repo", "get_file", "list_issues", "search_code"] },
          repo: { type: "string", description: 'owner/name, e.g. "shenhao-stu/openclaw-agents".' },
          path: { type: "string", description: "File path (for get_file)." },
          ref: { type: "string", description: "Branch/commit (optional, for get_file)." },
          state: { type: "string", description: "open|closed|all (for list_issues)." },
          query: { type: "string", description: "Search terms (for search_code)." },
        },
        required: ["action"],
      },
    },
  },
  composio: {
    type: "function",
    function: {
      name: "composio",
      description: "Use external app integrations via Composio (Gmail, Slack, Notion, etc.). 'list' to discover available tools, 'execute' to run one by slug.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "execute"] },
          search: { type: "string", description: "Filter when listing tools." },
          tool_slug: { type: "string", description: "The Composio tool slug to execute." },
          arguments: { type: "object", description: "Arguments object for the tool." },
          entity_id: { type: "string", description: "Composio entity/connection id (optional)." },
        },
        required: ["action"],
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
    case "browser":
      return browserConfigured();
    case "memory_search":
    case "memory_save":
      return memoryConfigured();
    case "run_code":
      return sandboxConfigured();
    case "github":
      return githubConfigured();
    case "composio":
      return composioConfigured();
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
      case "browser":
        return await browserCall(args.action, args);
      case "github":
        return await githubCall(args.action, args);
      case "composio":
        return await composioCall(args.action, args);
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e: any) {
    return `Tool "${name}" failed: ${e?.message ?? String(e)}`;
  }
}
