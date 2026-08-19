"""user notifications and preferences

Revision ID: phase3_001_notifications
Revises: phase2_001
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase3_001_notifications"
down_revision: Union[str, None] = "phase2_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("email_on_payment", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_on_escalation", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_on_sync_error", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("daily_digest", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_table("user_notifications")
