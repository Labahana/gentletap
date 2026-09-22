"""control center: org guardrails, invoice expected payment date, client cadence override

Revision ID: phase6_002_control_center
Revises: phase6_001_safety_hardening
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase6_002_control_center"
down_revision: Union[str, None] = "phase6_001_safety_hardening"
branch_labels = None
depends_on = None


def _columns(table: str):
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(table):
        return {}
    return {c["name"] for c in insp.get_columns(table)}


def _add(table: str, name: str, col: sa.Column) -> None:
    cols = _columns(table)
    if not cols or name in cols:
        return
    op.add_column(table, col)


def upgrade() -> None:
    _add(
        "org_settings",
        "pause_all",
        sa.Column("pause_all", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    _add(
        "org_settings",
        "pause_until",
        sa.Column("pause_until", sa.DateTime(timezone=True), nullable=True),
    )
    _add(
        "org_settings",
        "pause_reason",
        sa.Column("pause_reason", sa.String(255), nullable=True),
    )
    _add(
        "org_settings",
        "min_amount",
        sa.Column("min_amount", sa.Numeric(12, 2), nullable=True),
    )
    _add(
        "org_settings",
        "suppress_on_reply",
        sa.Column("suppress_on_reply", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    _add(
        "org_settings",
        "approval_mode",
        sa.Column("approval_mode", sa.String(20), nullable=False, server_default="off"),
    )
    _add(
        "org_settings",
        "approval_threshold_amount",
        sa.Column("approval_threshold_amount", sa.Numeric(12, 2), nullable=True),
    )
    _add(
        "org_settings",
        "whatsapp_delay_hours",
        sa.Column("whatsapp_delay_hours", sa.Integer(), nullable=False, server_default="3"),
    )
    _add(
        "org_settings",
        "whatsapp_quiet_hours",
        sa.Column("whatsapp_quiet_hours", sa.JSON(), nullable=True),
    )
    _add(
        "org_settings",
        "send_window_days",
        sa.Column("send_window_days", sa.JSON(), nullable=True),
    )
    _add(
        "org_settings",
        "skip_weekends",
        sa.Column("skip_weekends", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    _add(
        "invoices",
        "expected_payment_date",
        sa.Column("expected_payment_date", sa.Date(), nullable=True),
    )
    _add(
        "clients",
        "cadence_override",
        sa.Column("cadence_override", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    for table, name in [
        ("clients", "cadence_override"),
        ("invoices", "expected_payment_date"),
        ("org_settings", "skip_weekends"),
        ("org_settings", "send_window_days"),
        ("org_settings", "whatsapp_quiet_hours"),
        ("org_settings", "whatsapp_delay_hours"),
        ("org_settings", "approval_threshold_amount"),
        ("org_settings", "approval_mode"),
        ("org_settings", "suppress_on_reply"),
        ("org_settings", "min_amount"),
        ("org_settings", "pause_reason"),
        ("org_settings", "pause_until"),
        ("org_settings", "pause_all"),
    ]:
        cols = _columns(table)
        if cols and name in cols:
            op.drop_column(table, name)
