"""Migration 008: Paddle billing (replace Stripe columns)

Revision ID: 008
Revises: 007
Create Date: 2026-06-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("profiles", "stripe_customer_id", new_column_name="paddle_customer_id")
    op.add_column("profiles", sa.Column("paddle_subscription_id", sa.String(255), nullable=True))
    op.create_table(
        "billing_webhook_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("billing_webhook_events")
    op.drop_column("profiles", "paddle_subscription_id")
    op.alter_column("profiles", "paddle_customer_id", new_column_name="stripe_customer_id")
