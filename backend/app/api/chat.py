"""Chat endpoints — public (marketing visitors) and authenticated (in-app).

Both share one brain (app.services.chat.service.respond); the difference is that
the authenticated route carries the caller's org/user so the assistant can see
account context. The public route is IP-rate-limited and never sees any account
data. Non-streaming v1: each turn is one request/response.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_and_org
from app.config import get_settings
from app.database import get_db
from app.models.chat import ChatMessage, ChatSession
from app.services.chat import service
from app.services.rate_limit import rate_limit

router = APIRouter(prefix="/chat", tags=["Chat"])

_MAX_MESSAGE = 2000

# Public turns cost provider money and thread time, so cap both burst (per
# minute) and total spend (per IP per day). The daily cap fails CLOSED: if Redis
# is down we would otherwise bill unlimited anonymous LLM calls.
_public_daily_budget = rate_limit(
    f"{get_settings().chat_public_daily_limit}/86400", key_extra="chat_daily", fail_closed=True
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=_MAX_MESSAGE)
    session_id: Optional[str] = Field(None, max_length=36)
    page: Optional[str] = Field(None, max_length=500)


class PublicChatRequest(ChatRequest):
    visitor_id: Optional[str] = Field(None, max_length=64)
    email: Optional[str] = Field(None, max_length=255)


@router.post("/public", dependencies=[Depends(rate_limit("20/60")), Depends(_public_daily_budget)])
def chat_public(req: PublicChatRequest, request: Request, db: Session = Depends(get_db)):
    """Anonymous marketing-site assistant. Product-only grounding, no account data."""
    visitor_id = req.visitor_id or request.headers.get("x-gentletap-visitor")
    session = service.get_or_create_session(
        db,
        surface="public",
        session_id=req.session_id,
        visitor_id=visitor_id,
        visitor_email=(req.email or "").strip() or None,
        page=req.page,
    )
    result = service.respond(db, session=session, message=req.message)
    return result


@router.post("", dependencies=[Depends(rate_limit("40/60"))])
def chat_app(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user_and_org=Depends(get_current_user_and_org),
):
    """Signed-in in-app assistant with the caller's account context."""
    user, org = user_and_org
    session = service.get_or_create_session(
        db, surface="app", session_id=req.session_id, org=org, user=user, page=req.page
    )
    result = service.respond(db, session=session, message=req.message, org=org, user=user)
    return result


@router.get("/history/{session_id}")
def chat_history(
    session_id: str,
    db: Session = Depends(get_db),
    user_and_org=Depends(get_current_user_and_org),
):
    """Return a session's transcript. Org-scoped: you can only read your own."""
    user, org = user_and_org
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session is None or session.org_id != org.id:
        raise HTTPException(status_code=404, detail="Session not found")
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )
    return {
        "session_id": session_id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": (m.meta or {}).get("sources", []),
                "escalated": (m.meta or {}).get("escalate", False),
                "handoff_id": (m.meta or {}).get("handoff_id"),
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in rows
        ],
    }
