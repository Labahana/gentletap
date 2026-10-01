"""chat tables: sessions, messages, admin handoffs

Support/guidance chatbot persistence. Public sessions have null org/user;
app sessions are org-scoped. ChatHandoff carries the structured context package.

Revision ID: phase11_001_chat_tables
Revises: phase10_001_invoice_phone
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase11_001_chat_tables"
down_revision: Union[str, None] = "phase10_001_invoice_phone"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table)


def upgrade() -> None:
    if not _has_table("chat_sessions"):
        op.create_table(
            "chat_sessions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("surface", sa.String(10), nullable=False, server_default="public"),
            sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("visitor_id", sa.String(64), nullable=True),
            sa.Column("visitor_email", sa.String(255), nullable=True),
            sa.Column("page", sa.String(500), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="open"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_chat_sessions_org_id", "chat_sessions", ["org_id"])
        op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"])
        op.create_index("ix_chat_sessions_visitor_id", "chat_sessions", ["visitor_id"])

    if not _has_table("chat_messages"):
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("session_id", sa.String(36), sa.ForeignKey("chat_sessions.id"), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("meta", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])

    if not _has_table("chat_handoffs"):
        op.create_table(
            "chat_handoffs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("session_id", sa.String(36), sa.ForeignKey("chat_sessions.id"), nullable=False),
            sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("visitor_email", sa.String(255), nullable=True),
            sa.Column("surface", sa.String(10), nullable=False, server_default="public"),
            sa.Column("trigger", sa.String(40), nullable=False),
            sa.Column("intent", sa.String(80), nullable=True),
            sa.Column("sentiment", sa.String(20), nullable=True),
            sa.Column("narrative", sa.Text(), nullable=True),
            sa.Column("suggested_resolution", sa.Text(), nullable=True),
            sa.Column("context_package", sa.JSON(), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="open"),
            sa.Column("notified", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("admin_response", sa.Text(), nullable=True),
            sa.Column("resolved_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_chat_handoffs_session_id", "chat_handoffs", ["session_id"])
        op.create_index("ix_chat_handoffs_org_id", "chat_handoffs", ["org_id"])
        op.create_index("ix_chat_handoffs_status", "chat_handoffs", ["status"])


def downgrade() -> None:
    for table in ("chat_handoffs", "chat_messages", "chat_sessions"):
        if _has_table(table):
            op.drop_table(table)
