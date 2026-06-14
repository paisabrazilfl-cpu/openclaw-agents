// GitHub access for the agents (and a Settings-configured token). Works
// unauthenticated at a low rate limit, but a GITHUB_TOKEN raises limits and
// allows private repos. Uses the public REST API via fetch.

import { env } from "./env";

export function githubConfigured(): boolean {
  // The tool is offered whenever a token is present; without one it would hit
  // strict anonymous rate limits, so we gate on the token.
  return Boolean(env.github);
}

function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "openclaw-console",
  };
  if (env.github) headers.Authorization = `Bearer ${env.github}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

export type GitHubAction = "get_repo" | "get_file" | "list_issues" | "search_code";

export async function githubCall(action: GitHubAction, args: any): Promise<string> {
  switch (action) {
    case "get_repo": {
      const r = await gh(`/repos/${args.repo}`);
      if (!r.ok) return `GitHub error ${r.status}: ${await r.text()}`;
      const d = await r.json();
      return JSON.stringify(
        {
          full_name: d.full_name,
          description: d.description,
          stars: d.stargazers_count,
          language: d.language,
          topics: d.topics,
          default_branch: d.default_branch,
          url: d.html_url,
        },
        null,
        2,
      );
    }
    case "get_file": {
      const ref = args.ref ? `?ref=${encodeURIComponent(args.ref)}` : "";
      const r = await gh(`/repos/${args.repo}/contents/${args.path}${ref}`);
      if (!r.ok) return `GitHub error ${r.status}: ${await r.text()}`;
      const d = await r.json();
      const content = d.content ? Buffer.from(d.content, "base64").toString("utf8") : "";
      return `# ${args.repo}/${args.path}\n\n${content.slice(0, 6000)}${content.length > 6000 ? "\n…[truncated]" : ""}`;
    }
    case "list_issues": {
      const state = args.state || "open";
      const r = await gh(`/repos/${args.repo}/issues?state=${state}&per_page=15`);
      if (!r.ok) return `GitHub error ${r.status}: ${await r.text()}`;
      const items = await r.json();
      if (!Array.isArray(items) || !items.length) return "(no issues)";
      return items
        .filter((i: any) => !i.pull_request)
        .map((i: any) => `#${i.number} [${i.state}] ${i.title}\n   ${i.html_url}`)
        .join("\n");
    }
    case "search_code": {
      const q = encodeURIComponent(args.query + (args.repo ? ` repo:${args.repo}` : ""));
      const r = await gh(`/search/code?q=${q}&per_page=10`);
      if (!r.ok) return `GitHub error ${r.status}: ${await r.text()}`;
      const d = await r.json();
      if (!d.items?.length) return "(no code matches)";
      return d.items
        .map((it: any) => `${it.repository?.full_name}: ${it.path}\n   ${it.html_url}`)
        .join("\n");
    }
    default:
      return `Unknown GitHub action: ${action}`;
  }
}
