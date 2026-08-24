"""whatsapp inbound message log

Revision ID: phase5_002_whatsapp_inbound
Revises: phase5_001_affiliates
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase5_002_whatsapp_inbound"
down_revision: Union[str, None] = "phase5_001_affiliates"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    if _has_table("whatsapp_inbound_messages"):
        return
    op.create_table(
        "whatsapp_inbound_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("client_id", sa.String(36), sa.ForeignKey("clients.id"), nullable=True, index=True),
        sa.Column("from_number", sa.String(50), nullable=False, index=True),
        sa.Column("profile_name", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("message_sid", sa.String(64), nullable=False, unique=True),
        sa.Column("opt_out", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
            index=True,
        ),
    )


def downgrade() -> None:
    if _has_table("whatsapp_inbound_messages"):
        op.drop_table("whatsapp_inbound_messages")
