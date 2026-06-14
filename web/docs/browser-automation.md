# 🧭 Browser Automation

Three layers, each with a different home in this stack. Pick what you need.

| Layer | Tool | Where it runs | Status here |
|-------|------|---------------|-------------|
| Browser **API / remote sessions** | **Steel** | The web app (REST) | ✅ wired as the `browser` agent tool |
| **Agent** browser tool (MCP) | **Playwright MCP** | The OpenClaw agent runtime | ⚙️ config below |
| **AI** browser scripting | **Stagehand** | A separate worker (browser runtime) | 📋 advanced, recipe below |

---

## 1. Steel — wired into the app ✅

The `browser` tool lets agents (Scout, Surveyor, Coder, Main) open a URL in a
real headless browser — JavaScript runs, then the rendered page comes back as
markdown, or a screenshot is captured. It's the production-safe path because it's
just a REST call; no browser process runs inside the web service.

**Enable it:** add `STEEL_API_KEY` in the in-app **Settings → Secrets Vault**
(or as a Render env var). That's it — the `browser` tool lights up.

- Hosted: get a key at https://app.steel.dev/settings/api-keys
- Self-hosted (free): `git clone https://github.com/steel-dev/steel-browser && cd steel-browser && docker compose up`
  (needs Docker 20.10+, ~4GB RAM, ~10GB disk), then set `STEEL_BASE_URL` to your
  instance, e.g. `http://localhost:3000`.

Implementation: `lib/browser.ts` (calls `POST {STEEL_BASE_URL}/v1/scrape` with the
`steel-api-key` header). Also exposed directly at `POST /api/browser`
`{ url, action: "scrape" | "screenshot" }`.

> Captcha: Steel exposes a Captchas API, but design for **detection + human
> handoff**, not bypass — that keeps accounts safe and the stack production-ready.

---

## 2. Playwright MCP — for the OpenClaw agents

Microsoft's official MCP server gives the *agent runtime* (Claude, Cursor, VS
Code, OpenClaw) direct browser control over MCP. It belongs in the agent host's
MCP config, not the web app. Add to your OpenClaw / Claude MCP servers:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

- Repo: https://github.com/microsoft/playwright-mcp
- Docs: https://playwright.dev/docs/getting-started-mcp

---

## 3. Stagehand — AI + Playwright (advanced)

Stagehand drives a browser with natural language (`page.act("click login")`,
`page.extract(...)`). It needs a real browser runtime, so run it as a **separate
worker / service**, not inside the starter web service. The serverless-friendly
recipe is Stagehand-over-Steel (connect to a Steel session via CDP — no local
chromium):

```ts
import { Stagehand } from "@browserbasehq/stagehand";

// 1) create a Steel session → get its CDP/websocket URL
// 2) point Stagehand at it
const stagehand = new Stagehand({
  env: "LOCAL",
  modelName: "gpt-4o-mini",
  localBrowserLaunchOptions: { cdpUrl: steelSession.websocketUrl },
});
await stagehand.init();
await stagehand.page.goto("https://example.com");
await stagehand.page.act("click the login button");
const data = await stagehand.page.extract("extract the main headline");
await stagehand.close();
```

- Repo: https://github.com/browserbase/stagehand · Docs: https://docs.stagehand.dev

**Recommended build order:** Steel (sessions) → Playwright MCP (agent control) →
Stagehand (natural-language actions) where you need them.
