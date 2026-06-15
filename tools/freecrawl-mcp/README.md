# 🕷️ FreeCrawl MCP Server

Bridges the [FreeCrawl](https://github.com/paisabrazilfl-cpu/freecrawl) REST API
into OpenClaw Agents as MCP tools, giving agents a fast, self-hosted web
scraping / crawling capability. The 📚 **Surveyor** (literature retrieval) and
📰 **Scout** (trend monitoring) agents are the primary consumers.

## Tools

| Tool | Description |
| --- | --- |
| `scrape` | Scrape a single URL → markdown / html / text / links |
| `crawl` | Start a recursive site crawl (returns a `job_id`) |
| `crawl_status` | Poll a crawl job + fetch the scraped pages |
| `map_site` | Discover URLs on a domain (sitemap + link discovery) |
| `extract` | Scrape a URL and extract structured JSON for given fields |

## Setup

1. Have a FreeCrawl API reachable (locally via `docker compose up`, or a
   deployed URL such as `https://your-freecrawl.onrender.com`).

2. Install deps:
   ```bash
   pip install -r tools/freecrawl-mcp/requirements.txt
   ```

3. Register it in `~/.openclaw/openclaw.json` under `mcpServers` (the
   examples in [`examples/`](../../examples) already include this block):
   ```json
   {
     "mcpServers": {
       "freecrawl": {
         "command": "python",
         "args": ["tools/freecrawl-mcp/server.py"],
         "env": { "FREECRAWL_API_URL": "http://localhost:8000" }
       }
     }
   }
   ```

   `setup.sh` injects this automatically — point it at your deployment with:
   ```bash
   ./setup.sh --freecrawl-url https://your-freecrawl.onrender.com
   ```

## Environment

| Var | Default | Description |
| --- | --- | --- |
| `FREECRAWL_API_URL` | `http://localhost:8000` | Base URL of the FreeCrawl API |
| `FREECRAWL_TIMEOUT` | `60` | Per-request timeout (seconds) |
