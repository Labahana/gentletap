"""User Control Center: automation settings, cadences, notifications, team.

Adds per-user control surfaces for sequences, send windows, guardrails,
notification preferences, escalation rules, and team membership.

Revision ID: 029
Revises: 028
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "automation_settings",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cadence", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("autopilot", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="America/New_York", nullable=False),
        sa.Column("send_window", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("skip_weekends", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("skip_holidays", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("holidays_country", sa.String(length=2), nullable=True),
        sa.Column("pause_all", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("pause_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pause_reason", sa.String(length=120), nullable=True),
        sa.Column("min_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("suppress_disputed", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("suppress_on_reply", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("stop_on_payment", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("stop_on_claim", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("whatsapp_delay_hours", sa.Integer(), server_default="3", nullable=False),
        sa.Column("whatsapp_quiet_hours", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("signature_block", sa.Text(), nullable=True),
        sa.Column("escalation_sender", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("cc_late_steps", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("retention_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "notification_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("prefs", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "escalation_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_escalation_rules_user_id", "escalation_rules", ["user_id"])

    op.create_table(
        "team_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), index=True, nullable=False),
        sa.Column("email", sa.String(length=320), index=True, nullable=False),
        sa.Column("role", sa.String(length=20), server_default="member", nullable=False),
        sa.Column("token_hash", sa.String(length=64), unique=True, nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("accepted_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_team_invites_account_id", "team_invites", ["account_id"])
    op.create_index("ix_team_invites_email", "team_invites", ["email"])

    op.create_table(
        "team_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), index=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), index=True, nullable=False),
        sa.Column("role", sa.String(length=20), server_default="member", nullable=False),
        sa.Column("invited_via", sa.String(length=20), server_default="owner", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("account_id", "user_id", name="uq_team_members_account_user"),
    )
    op.create_index("ix_team_members_account_id", "team_members", ["account_id"])
    op.create_index("ix_team_members_user_id", "team_members", ["user_id"])

    op.create_table(
        "account_audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), index=True, nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )
    op.create_index("ix_account_audit_events_account_id", "account_audit_events", ["account_id"])
    op.create_index("ix_account_audit_events_actor_user_id", "account_audit_events", ["actor_user_id"])
    op.create_index("ix_account_audit_events_created_at", "account_audit_events", ["created_at"])

    op.add_column("profiles", sa.Column("account_owner_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("profiles", sa.Column("account_role", sa.String(length=20), server_default="owner", nullable=False))
    op.create_index("ix_profiles_account_owner_id", "profiles", ["account_owner_id"])

    op.add_column("clients", sa.Column("do_not_contact", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("clients", sa.Column("timezone", sa.String(length=64), nullable=True))
    op.add_column("clients", sa.Column("cadence_override", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("clients", sa.Column("channel_override", sa.String(length=20), nullable=True))

    op.add_column("invoices", sa.Column("expected_payment_date", sa.Date(), nullable=True))
    op.add_column("invoices", sa.Column("cadence_override", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "cadence_override")
    op.drop_column("invoices", "expected_payment_date")
    op.drop_column("clients", "channel_override")
    op.drop_column("clients", "cadence_override")
    op.drop_column("clients", "timezone")
    op.drop_column("clients", "do_not_contact")
    op.drop_index("ix_profiles_account_owner_id", table_name="profiles")
    op.drop_column("profiles", "account_role")
    op.drop_column("profiles", "account_owner_id")
    op.drop_table("account_audit_events")
    op.drop_table("team_members")
    op.drop_table("team_invites")
    op.drop_table("escalation_rules")
    op.drop_table("notification_preferences")
    op.drop_table("automation_settings")
