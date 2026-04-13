"""phase12 billing tables

Revision ID: b9c8d7e6f5a4
Revises: e5f6a7b8c9d0
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b9c8d7e6f5a4"
down_revision: str = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Add columns to user_subscriptions ──────────────────────────────
    op.add_column(
        "user_subscriptions",
        sa.Column("interval", sa.String(20), nullable=False, server_default="monthly"),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("stripe_price_id", sa.String(100), nullable=True),
    )

    # ── 2. Create pricing_plan ─────────────────────────────────────────────
    op.create_table(
        "pricing_plan",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("interval", sa.String(20), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("stripe_price_id", sa.String(100), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("stripe_price_id", name="uq_pricing_plan_stripe_price_id"),
    )
    op.create_index("ix_pricing_plan_tier", "pricing_plan", ["tier"])
    op.create_index("ix_pricing_plan_active", "pricing_plan", ["active"])

    # ── 3. Create billing_event ────────────────────────────────────────────
    op.create_table(
        "billing_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("stripe_event_id", sa.String(200), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("stripe_event_id", name="uq_billing_event_stripe_event_id"),
    )
    op.create_index("ix_billing_event_stripe_event_id", "billing_event", ["stripe_event_id"])
    op.create_index("ix_billing_event_user_id", "billing_event", ["user_id"])

    # ── 4. Create usage_tracking ───────────────────────────────────────────
    op.create_table(
        "usage_tracking",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("feature", sa.String(100), nullable=False),
        sa.Column("period_key", sa.String(20), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_usage_tracking", "usage_tracking", ["user_id", "feature", "period_key"]
    )
    op.create_index("ix_usage_tracking_user_id", "usage_tracking", ["user_id"])

    # ── 5. Create coaching_session ─────────────────────────────────────────
    op.create_table(
        "coaching_session",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_key", sa.String(10), nullable=False),
        sa.Column("adherence_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("content", postgresql.JSONB(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_coaching_session", "coaching_session", ["user_id", "week_key"]
    )
    op.create_index("ix_coaching_session_user_id", "coaching_session", ["user_id"])

    # ── 6. Create weekly_report ────────────────────────────────────────────
    op.create_table(
        "weekly_report",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_key", sa.String(10), nullable=False),
        sa.Column("blob_url", sa.String(500), nullable=True),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_weekly_report", "weekly_report", ["user_id", "week_key"]
    )
    op.create_index("ix_weekly_report_user_id", "weekly_report", ["user_id"])
    op.create_index("ix_weekly_report_status", "weekly_report", ["status"])

    # ── 7. Seed pricing_plan ───────────────────────────────────────────────
    op.execute("""
    INSERT INTO pricing_plan (id, tier, interval, price_cents, stripe_price_id, display_name)
    VALUES
      (gen_random_uuid(), 'free', 'monthly', 0, 'price_free', 'Free'),
      (gen_random_uuid(), 'pro', 'monthly', 900, 'PLACEHOLDER_PRO_MONTHLY', 'Pro Monthly'),
      (gen_random_uuid(), 'pro', 'annual', 7900, 'PLACEHOLDER_PRO_ANNUAL', 'Pro Annual'),
      (gen_random_uuid(), 'pro_plus', 'monthly', 1900, 'PLACEHOLDER_PRO_PLUS_MONTHLY', 'Pro+ Monthly'),
      (gen_random_uuid(), 'pro_plus', 'annual', 9900, 'PLACEHOLDER_PRO_PLUS_ANNUAL', 'Pro+ Annual')
    """)


def downgrade() -> None:
    # Drop new tables
    op.drop_table("weekly_report")
    op.drop_table("coaching_session")
    op.drop_table("usage_tracking")
    op.drop_table("billing_event")
    op.drop_table("pricing_plan")

    # Remove columns from user_subscriptions
    op.drop_column("user_subscriptions", "stripe_price_id")
    op.drop_column("user_subscriptions", "cancelled_at")
    op.drop_column("user_subscriptions", "cancel_at_period_end")
    op.drop_column("user_subscriptions", "current_period_end")
    op.drop_column("user_subscriptions", "interval")
