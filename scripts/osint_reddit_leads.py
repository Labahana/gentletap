"""One-off OSINT: scrape public Reddit search JSON for GentleTap ICP signals."""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from datetime import UTC, datetime

QUERIES = [
    ("r/freelance", "unpaid invoice"),
    ("r/freelance", "client won't pay"),
    ("r/freelance", "quickbooks overdue"),
    ("r/smallbusiness", "chasing payment invoice"),
    ("r/consulting", "client won't pay"),
    ("r/graphic_design", "invoice overdue"),
    ("r/webdev", "client not paying"),
]

UA = "GentleTap-LeadResearch/1.0 (public OSINT; contact: gentletap.co)"


def fetch_subreddit(sub: str, q: str, limit: int = 10) -> list[dict]:
    sub_name = sub.removeprefix("r/")
    url = (
        f"https://www.reddit.com/r/{sub_name}/search.json"
        f"?q={urllib.parse.quote(q)}&restrict_sr=1&sort=new&limit={limit}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.load(resp)
    return [c["data"] for c in data.get("data", {}).get("children", [])]


def main() -> None:
    seen: set[str] = set()
    leads: list[dict] = []

    for sub, q in QUERIES:
        try:
            posts = fetch_subreddit(sub, q)
        except Exception as exc:
            print(f"ERROR {sub} '{q}': {exc}", file=sys.stderr)
            continue
        for p in posts:
            pid = p.get("id")
            if not pid or pid in seen:
                continue
            seen.add(pid)
            created = datetime.fromtimestamp(p["created_utc"], tz=UTC).strftime("%Y-%m-%d")
            leads.append(
                {
                    "date": created,
                    "subreddit": p.get("subreddit"),
                    "author": p.get("author"),
                    "title": p.get("title"),
                    "url": f"https://reddit.com{p.get('permalink', '')}",
                    "score": p.get("score"),
                    "num_comments": p.get("num_comments"),
                    "query": q,
                }
            )

    leads.sort(key=lambda x: x["date"], reverse=True)
    print(json.dumps(leads, indent=2))
    print(f"\n# Total unique posts: {len(leads)}", file=sys.stderr)


if __name__ == "__main__":
    main()
