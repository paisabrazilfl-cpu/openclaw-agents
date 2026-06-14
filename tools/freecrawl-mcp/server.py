"""
FreeCrawl MCP server for OpenClaw Agents.

Exposes the FreeCrawl REST API (https://github.com/paisabrazilfl-cpu/freecrawl)
as MCP tools so agents — especially 📚 Surveyor and 📰 Scout — can scrape,
crawl, map, and extract from the web instead of only using the raw `browser`
tool.

Configuration (env vars):
    FREECRAWL_API_URL   Base URL of a running FreeCrawl API (default
                        http://localhost:8000).
    FREECRAWL_TIMEOUT   Per-request timeout in seconds (default 60).

Run:
    pip install -r requirements.txt
    FREECRAWL_API_URL=https://your-freecrawl.onrender.com python server.py

OpenClaw registers this via the `mcpServers` block in openclaw.json — see
the examples in this repo and tools/freecrawl-mcp/README.md.
"""
import os

import httpx
from mcp.server.fastmcp import FastMCP

API_URL = os.environ.get("FREECRAWL_API_URL", "http://localhost:8000").rstrip("/")
TIMEOUT = float(os.environ.get("FREECRAWL_TIMEOUT", "60"))

mcp = FastMCP("freecrawl")


def _post(path: str, payload: dict) -> dict:
    resp = httpx.post(f"{API_URL}{path}", json=payload, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _get(path: str, params: dict | None = None) -> dict:
    resp = httpx.get(f"{API_URL}{path}", params=params or {}, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def scrape(
    url: str,
    formats: list[str] | None = None,
    use_browser: bool = False,
    wait_for: int | None = None,
    include_links: bool = False,
) -> dict:
    """Scrape a single URL and return its content.

    Args:
        url: The page to scrape.
        formats: Any of "markdown", "html", "text", "links" (default ["markdown"]).
        use_browser: Render with a headless browser (slower, handles JS).
        wait_for: Milliseconds to wait after load when use_browser is true.
        include_links: Also return the page's links.
    """
    return _post(
        "/scrape",
        {
            "url": url,
            "formats": formats or ["markdown"],
            "use_browser": use_browser,
            "wait_for": wait_for,
            "include_links": include_links,
        },
    )


@mcp.tool()
def crawl(
    url: str,
    max_pages: int = 50,
    max_depth: int = 3,
    include_patterns: list[str] | None = None,
    exclude_patterns: list[str] | None = None,
) -> dict:
    """Start a recursive crawl of a site. Returns a job_id immediately.

    Poll progress and results with crawl_status(job_id, include_pages=True).

    Args:
        url: Start URL for the crawl.
        max_pages: Max pages to fetch (server cap: 500).
        max_depth: Max link depth to follow (server cap: 5).
        include_patterns: Only crawl URLs matching these regexes.
        exclude_patterns: Skip URLs matching these regexes.
    """
    return _post(
        "/crawl",
        {
            "url": url,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "include_patterns": include_patterns or [],
            "exclude_patterns": exclude_patterns or [],
        },
    )


@mcp.tool()
def crawl_status(job_id: str, include_pages: bool = False) -> dict:
    """Check a crawl job's status and, optionally, its scraped pages.

    Args:
        job_id: The id returned by crawl().
        include_pages: If true, include the crawled pages (url/title/markdown).
    """
    return _get(f"/crawl/{job_id}", {"include_pages": include_pages})


@mcp.tool()
def map_site(url: str, max_urls: int = 200) -> dict:
    """Discover URLs on a domain via sitemap.xml + link discovery.

    Args:
        url: Any URL on the target domain.
        max_urls: Max URLs to return (server cap: 1000).
    """
    return _post("/map", {"url": url, "max_urls": max_urls})


@mcp.tool()
def extract(url: str, fields: dict, use_browser: bool = False) -> dict:
    """Scrape a URL and extract structured JSON for the requested fields.

    Args:
        url: The page to extract from.
        fields: Mapping of field name -> type ("string" | "number" | "list").
        use_browser: Render with a headless browser before extracting.
    """
    return _post("/extract", {"url": url, "fields": fields, "use_browser": use_browser})


if __name__ == "__main__":
    mcp.run()
