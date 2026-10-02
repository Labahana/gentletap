"""Chat orchestration: retrieve → generate → persist → (maybe) escalate.

One entry point, `respond()`, used by both the public and authenticated routes.
It owns session/message persistence and the escalation decision, and creates a
ChatHandoff with a full context package + notifies admins when the bot can't (or
shouldn't) handle a request. Callers pass org/user only for authenticated app
chat; anonymous visitors get product-only grounding with no account context.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.chat import ChatHandoff, ChatMessage, ChatSession
from app.models.notification import UserNotification
from app.models.organization import Organization
from app.models.user import User
from app.services.chat import escalation, knowledge, llm, prompts
from app.services.chat.context import build_account_summary

logger = logging.getLogger(__name__)

HISTORY_TURNS = 12  # messages folded into the prompt
LOW_CONF = escalation.LOW_CONFIDENCE_THRESHOLD

_ESCALATED_ACK = (
    "I've flagged this for a GentleTap teammate and shared the full context of our "
    "chat so you won't have to repeat yourself. Someone will follow up shortly."
)


def get_or_create_session(
    db: Session,
    *,
    surface: str,
    session_id: Optional[str],
    org: Optional[Organization] = None,
    user: Optional[User] = None,
    visitor_id: Optional[str] = None,
    visitor_email: Optional[str] = None,
    page: Optional[str] = None,
) -> ChatSession:
    if session_id:
        existing = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if existing is not None:
            # Only reuse a session the caller is allowed to see.
            if surface == "app":
                if existing.org_id == (org.id if org else None):
                    return _touch(existing, visitor_email, page)
            else:
                if existing.surface == "public" and existing.visitor_id == visitor_id:
                    # Bound an anonymous session's transcript (cost, memory and
                    # prompt-injection accumulation). Over the cap, start fresh
                    # instead of appending to an ever-growing thread.
                    if _message_count(db, existing.id) < get_settings().chat_public_max_messages:
                        return _touch(existing, visitor_email, page)
    sess = ChatSession(
        surface=surface,
        org_id=org.id if org else None,
        user_id=user.id if user else None,
        visitor_id=visitor_id,
        visitor_email=visitor_email,
        page=page,
    )
    db.add(sess)
    db.flush()
    return sess


def _message_count(db: Session, session_id: str) -> int:
    return (
        db.query(func.count(ChatMessage.id))
        .filter(ChatMessage.session_id == session_id)
        .scalar()
        or 0
    )


def _touch(sess: ChatSession, visitor_email: Optional[str], page: Optional[str]) -> ChatSession:
    if visitor_email and not sess.visitor_email:
        sess.visitor_email = visitor_email
    if page:
        sess.page = page
    sess.updated_at = datetime.now(timezone.utc)
    return sess


def _history(db: Session, session_id: str) -> List[dict]:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )
    return [{"role": r.role, "content": r.content, "meta": r.meta or {}} for r in rows]


def _trailing_low_confidence(history: List[dict]) -> int:
    count = 0
    for msg in reversed(history):
        if msg["role"] != "assistant":
            continue
        conf = msg.get("meta", {}).get("confidence")
        if conf is not None and conf < LOW_CONF:
            count += 1
        else:
            break
    return count


def respond(
    db: Session,
    *,
    session: ChatSession,
    message: str,
    org: Optional[Organization] = None,
    user: Optional[User] = None,
) -> dict:
    message = (message or "").strip()
    db.add(ChatMessage(session_id=session.id, role="user", content=message[:4000]))
    db.flush()

    history = _history(db, session.id)
    prior = history[:-1][-HISTORY_TURNS:]

    docs = knowledge.retrieve(message)
    account_summary = build_account_summary(db, org, user) if (org and session.surface == "app") else None

    control = llm.chat_completion(
        prompts.SYSTEM_PROMPT,
        prompts.build_user_prompt(
            history=prior,
            message=message,
            docs=docs,
            account_summary=account_summary,
            page=session.page,
        ),
        plan=getattr(org, "plan", None),
    )

    trigger = escalation.decide_escalation(
        user_text=message,
        model_escalate=bool(control.get("escalate")),
        confidence=control.get("confidence"),
        negative_sentiment=(control.get("sentiment") == "negative" or control.get("sentiment") == "frustrated"),
        consecutive_low_confidence=_trailing_low_confidence(prior),
    )

    handoff_id = None
    reply = (control.get("reply") or "").strip()
    if trigger:
        # One open handoff per session — don't spam admins every turn.
        existing_open = (
            db.query(ChatHandoff)
            .filter(ChatHandoff.session_id == session.id, ChatHandoff.status != "resolved")
            .order_by(ChatHandoff.created_at.desc())
            .first()
        )
        if existing_open is not None:
            handoff_id = existing_open.id
        else:
            handoff_id = _create_handoff(
                db,
                session=session,
                org=org,
                user=user,
                trigger=trigger,
                control=control,
                history=history,
                account_summary=account_summary,
            )
        reply = f"{reply}\n\n{_ESCALATED_ACK}".strip() or _ESCALATED_ACK

    meta = {
        "intent": control.get("intent"),
        "sentiment": control.get("sentiment"),
        "confidence": control.get("confidence"),
        "escalate": bool(trigger),
        "escalate_trigger": trigger,
        "handoff_id": handoff_id,
        "sources": (control.get("sources") or [])[:8],
        "retrieved": [d["title"] for d in docs][:8],
    }
    db.add(ChatMessage(session_id=session.id, role="assistant", content=reply[:4000], meta=meta))
    session.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "session_id": session.id,
        "reply": reply,
        "intent": control.get("intent"),
        "sentiment": control.get("sentiment"),
        "confidence": control.get("confidence"),
        "escalated": bool(trigger),
        "escalate_trigger": trigger,
        "handoff_id": handoff_id,
        "sources": meta["sources"],
    }


def _create_handoff(
    db: Session,
    *,
    session: ChatSession,
    org: Optional[Organization],
    user: Optional[User],
    trigger: str,
    control: dict,
    history: List[dict],
    account_summary: Optional[dict],
) -> str:
    package = escalation.build_context_package(
        narrative=_summarize(history),
        intent=control.get("intent"),
        sentiment=control.get("sentiment"),
        trigger=trigger,
        transcript=history,
        account_summary=account_summary,
        suggested_resolution=control.get("suggested_resolution"),
        sources=control.get("sources") or [],
    )
    handoff = ChatHandoff(
        session_id=session.id,
        org_id=org.id if org else session.org_id,
        user_id=user.id if user else session.user_id,
        visitor_email=(user.email if user else None) or session.visitor_email,
        surface=session.surface,
        trigger=trigger,
        intent=control.get("intent"),
        sentiment=control.get("sentiment"),
        narrative=package["narrative"],
        suggested_resolution=package["suggested_resolution"],
        context_package=package,
        status="open",
    )
    db.add(handoff)
    db.flush()
    _notify_admins(db, handoff, org, user)
    return handoff.id


def _summarize(history: List[dict]) -> str:
    user_lines = [m["content"] for m in history if m["role"] == "user"][-3:]
    joined = " | ".join(user_lines)
    return (joined[:280] + ("…" if len(joined) > 280 else "")) if joined else "User requested help."


def _admin_org_id(db: Session, admin_id: str) -> Optional[str]:
    """A public handoff has no org, but UserNotification.org_id is a NOT NULL FK —
    use an org the admin actually owns so the bell insert doesn't violate it."""
    owned = db.query(Organization.id).filter(Organization.owner_user_id == admin_id).first()
    return owned[0] if owned else None


def anonymize_chat_data(db: Session, org_id: str) -> int:
    """GDPR account-purge: blank every PII-bearing field on an org's chat records.

    Called from the delete-purge task. Rows are kept (so FKs stay intact and the
    audit trail of *that support happened* survives) but visitor identity, page,
    transcript content and the handoff context package are all wiped.
    Returns the number of sessions scrubbed.
    """
    sessions = db.query(ChatSession).filter(ChatSession.org_id == org_id).all()
    session_ids = [s.id for s in sessions]
    for s in sessions:
        s.visitor_email = None
        s.visitor_id = None
        s.page = None
    if session_ids:
        db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).update(
            {ChatMessage.content: "[purged]", ChatMessage.meta: None},
            synchronize_session=False,
        )
    handoffs = db.query(ChatHandoff).filter(ChatHandoff.org_id == org_id).all()
    for h in handoffs:
        h.visitor_email = None
        h.narrative = "[purged]"
        h.suggested_resolution = None
        h.context_package = None
    return len(session_ids)


def _notify_admins(db: Session, handoff: ChatHandoff, org: Optional[Organization], user: Optional[User]) -> None:
    """Tell every admin user a handoff needs them. Best-effort; never blocks a reply."""
    try:
        admin_emails = {e.strip().lower() for e in (get_settings().admin_emails or []) if e.strip()}
        if not admin_emails:
            handoff.notified = False
            return
        admins = db.query(User).filter(func.lower(User.email).in_(admin_emails)).all()
        label = org.name if org else (handoff.visitor_email or "a visitor")
        notified = 0
        for admin in admins:
            org_id = (org.id if org else None) or _admin_org_id(db, admin.id)
            if not org_id:
                logger.warning("chat handoff: admin %s has no org to attach notification to", admin.id)
                continue
            db.add(
                UserNotification(
                    user_id=admin.id,
                    org_id=org_id,
                    type="support_handoff",
                    title=f"Chat handoff — needs a human ({label})",
                    body=(
                        f"{handoff.narrative or 'A user asked for help the assistant could not resolve.'} "
                        f"Reason: {handoff.trigger}."
                    ),
                    link=f"/admin?tab=support&handoff={handoff.id}",
                )
            )
            notified += 1
        handoff.notified = notified > 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("chat handoff admin notify failed: %s", exc)
        handoff.notified = False
