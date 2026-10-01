"""Support/guidance chatbot persistence: sessions, transcripts, and admin handoffs.

Public (marketing-site) sessions carry no org/user; app (logged-in) sessions are
org-scoped. ChatHandoff is the structured context package an escalation hands to
an admin — never a raw log dump (handoff is a context problem, not a routing one).
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # surface: 'public' (anonymous marketing visitor) | 'app' (authenticated user)
    surface: Mapped[str] = mapped_column(String(10), default="public", nullable=False)
    # Both null for anonymous public sessions; org-scoped for authenticated app chats.
    org_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    visitor_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    visitor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    page: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # current route, for context
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)  # open|closed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user|assistant|system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # assistant-only: {intent, sentiment, confidence, escalate, sources: [...], handoff_id}
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ChatHandoff(Base):
    __tablename__ = "chat_handoffs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id"), index=True, nullable=False)
    org_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    visitor_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    surface: Mapped[str] = mapped_column(String(10), default="public", nullable=False)
    # why the bot escalated: explicit_request|low_confidence|sensitive_topic|repeated_failure|negative_sentiment
    trigger: Mapped[str] = mapped_column(String(40), nullable=False)
    intent: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    narrative: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 2-3 sentence issue summary
    suggested_resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # AI's proposed path
    # account snapshot + transcript excerpt the admin needs to act without re-asking
    context_package: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)  # open|in_progress|resolved
    notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    admin_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
