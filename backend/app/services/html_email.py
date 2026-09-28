"""Minimal plain-text → HTML email conversion (escape, line breaks, autolink).

Kept dependency-free so both the Gmail and Resend senders can share it without
a circular import.
"""

import re
from html import escape

_URL_RE = re.compile(r"(https?://[^\s<>\"]+)", re.IGNORECASE)


def text_to_html(text: str) -> str:
    """Wrap a plain-text body in a styled HTML block, turning URLs into links."""
    safe = escape(text or "")
    linked = _URL_RE.sub(r'<a href="\1">\1</a>', safe)
    body_html = linked.replace("\n", "<br/>")
    return (
        "<div style=\"font-family: -apple-system, 'Segoe UI', Roboto, Arial, "
        "sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6;\">"
        f"{body_html}"
        "</div>"
    )
