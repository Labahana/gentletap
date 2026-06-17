"""whatsapp embedded signup fields + inbound messages

Revision ID: 006
Revises: 005
Create Date: 2026-06-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("whatsapp_connections", sa.Column("waba_id", sa.String(64), nullable=True))
    op.add_column("whatsapp_connections", sa.Column("meta_phone_number_id", sa.String(64), nullable=True))
    op.add_column("whatsapp_connections", sa.Column("twilio_subaccount_sid", sa.String(64), nullable=True))
    op.add_column("whatsapp_connections", sa.Column("twilio_subaccount_token_enc", sa.Text(), nullable=True))

    op.create_table(
        "whatsapp_inbound_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reminder_message_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("from_phone", sa.String(50), nullable=False),
        sa.Column("to_phone", sa.String(50), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("external_sid", sa.String(64), nullable=True),
        sa.Column("routed_via", sa.String(30), nullable=False, server_default="shared_number"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_whatsapp_inbound_user_id", "whatsapp_inbound_messages", ["user_id"])
    op.create_index("ix_whatsapp_inbound_invoice_id", "whatsapp_inbound_messages", ["invoice_id"])
    op.create_index("ix_whatsapp_inbound_from_phone", "whatsapp_inbound_messages", ["from_phone"])


def downgrade() -> None:
    op.drop_index("ix_whatsapp_inbound_from_phone", table_name="whatsapp_inbound_messages")
    op.drop_index("ix_whatsapp_inbound_invoice_id", table_name="whatsapp_inbound_messages")
    op.drop_index("ix_whatsapp_inbound_user_id", table_name="whatsapp_inbound_messages")
    op.drop_table("whatsapp_inbound_messages")
    op.drop_column("whatsapp_connections", "twilio_subaccount_token_enc")
    op.drop_column("whatsapp_connections", "twilio_subaccount_sid")
    op.drop_column("whatsapp_connections", "meta_phone_number_id")
    op.drop_column("whatsapp_connections", "waba_id")
