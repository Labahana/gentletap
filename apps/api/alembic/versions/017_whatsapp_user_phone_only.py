"""Migration 017: WhatsApp only uses user-added invoice numbers

Revision ID: 017
Revises: 016
"""

from typing import Sequence, Union

from alembic import op

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear numbers copied from QuickBooks clients (migration 016 backfill).
    # WhatsApp follow-ups use only reminder_phone set per invoice by the user.
    op.execute(
        """
        UPDATE invoices i
        SET reminder_phone = NULL
        FROM clients c
        WHERE i.client_id = c.id
          AND i.reminder_phone IS NOT NULL
          AND c.phone IS NOT NULL
          AND (
            i.reminder_phone = c.phone
            OR regexp_replace(i.reminder_phone, '[^0-9]', '', 'g')
               = regexp_replace(c.phone, '[^0-9]', '', 'g')
          )
        """
    )


def downgrade() -> None:
    pass
