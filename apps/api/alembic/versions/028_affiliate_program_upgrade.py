"""Affiliate program upgrade: partner type + payout method/details.

Supports the creator/accountant application split and Wise/bank payouts
alongside PayPal.

Revision ID: 028
Revises: 027
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "affiliates",
        sa.Column("partner_type", sa.String(length=30), server_default="creator", nullable=False),
    )
    op.add_column(
        "affiliates",
        sa.Column("payout_method", sa.String(length=30), server_default="paypal", nullable=False),
    )
    op.add_column(
        "affiliates",
        sa.Column("payout_details", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("affiliates", "payout_details")
    op.drop_column("affiliates", "payout_method")
    op.drop_column("affiliates", "partner_type")
