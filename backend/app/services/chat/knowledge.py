"""Knowledge-pack loading + retrieval for the chatbot.

v1 uses lightweight lexical scoring (token overlap, title boost) over the
committed knowledge pack — right-sized for our small corpus and dependency-free.
The retrieval call is behind `retrieve()` so a pgvector/embedding backend can be
dropped in later without touching callers.
"""

from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

_PACK_PATH = Path(__file__).with_name("knowledge_pack.json")
_STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "for", "on", "is", "are", "it",
    "this", "that", "with", "how", "do", "does", "can", "i", "you", "my", "we", "our",
    "what", "when", "where", "why", "me", "be", "if", "from", "by", "as", "at", "so",
}
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set:
    return {t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1}


@lru_cache(maxsize=1)
def _load_pack() -> dict:
    try:
        data = json.loads(_PACK_PATH.read_text(encoding="utf-8"))
        if isinstance(data.get("docs"), list):
            return data
        logger.warning("chat knowledge pack malformed; running without grounding")
    except FileNotFoundError:
        logger.warning("chat knowledge pack missing at %s; running without grounding", _PACK_PATH)
    except Exception as exc:  # noqa: BLE001
        logger.warning("chat knowledge pack load failed: %s", exc)
    return {"docs": [], "product": "GentleTap", "site_url": "https://gentletap.co"}


def pack_meta() -> dict:
    pack = _load_pack()
    return {
        "generated_at": pack.get("generated_at"),
        "product": pack.get("product"),
        "site_url": pack.get("site_url"),
        "support_email": pack.get("support_email"),
        "doc_count": len(pack.get("docs", [])),
    }


def retrieve(query: str, *, k: int = 6, char_budget: int = 6000) -> List[dict]:
    """Return the top-k docs relevant to `query`, within `char_budget`, as
    {title, url, kind, text}. Falls back to the overview docs when nothing scores."""
    docs = _load_pack().get("docs", [])
    if not docs:
        return []
    q = _tokens(query)
    scored = []
    if q:
        for d in docs:
            dt = _tokens(d.get("text", ""))
            tt = _tokens(d.get("title", ""))
            if not dt:
                continue
            overlap = len(q & dt) + 3 * len(q & tt)
            if overlap:
                # Jaccard-ish normalization keeps long docs from dominating by size.
                score = overlap / (1 + len(q | dt) ** 0.5)
                scored.append((score, d))
        scored.sort(key=lambda x: x[0], reverse=True)
    selected = []
    used = 0
    seen = set()
    for _, d in scored:
        text = d["text"]
        if used + len(text) > char_budget and selected:
            continue
        key = d.get("id") or d["title"]
        if key in seen:
            continue
        seen.add(key)
        selected.append(d)
        used += len(text)
        if len(selected) >= k:
            break
    if not selected:
        # No lexical hit: give the model the always-useful overview/definition docs.
        fallback = [d for d in docs if d.get("kind") == "overview"][:2]
        selected = fallback or docs[:2]
    return [
        {"title": d["title"], "url": d.get("url", ""), "kind": d.get("kind", ""), "text": d["text"]}
        for d in selected
    ]


def format_grounding(chunks: List[dict]) -> str:
    if not chunks:
        return "(no reference material available)"
    parts = []
    for i, c in enumerate(chunks, 1):
        url = f" ({c['url']})" if c.get("url") else ""
        parts.append(f"[{i}] {c['title']}{url}\n{c['text']}")
    return "\n\n".join(parts)
