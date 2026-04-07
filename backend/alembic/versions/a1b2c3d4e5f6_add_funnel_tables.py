"""add_funnel_tables

Revision ID: a1b2c3d4e5f6
Revises: d9e8f7a6b5c4
Create Date: 2026-04-06 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "d9e8f7a6b5c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "anonymous_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_token", sa.UUID(), nullable=False),
        sa.Column(
            "profile_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_anonymous_sessions_session_token"),
        "anonymous_sessions",
        ["session_token"],
        unique=True,
    )

    op.create_table(
        "conversion_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_token", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column(
            "properties",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_conversion_events_session_token"),
        "conversion_events",
        ["session_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversion_events_user_id"),
        "conversion_events",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversion_events_event_name"),
        "conversion_events",
        ["event_name"],
        unique=False,
    )

    op.create_table(
        "user_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=100), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(length=100), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_subscriptions_user_id"),
        "user_subscriptions",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_subscriptions_user_id"), table_name="user_subscriptions")
    op.drop_table("user_subscriptions")

    op.drop_index(op.f("ix_conversion_events_event_name"), table_name="conversion_events")
    op.drop_index(op.f("ix_conversion_events_user_id"), table_name="conversion_events")
    op.drop_index(op.f("ix_conversion_events_session_token"), table_name="conversion_events")
    op.drop_table("conversion_events")

    op.drop_index(op.f("ix_anonymous_sessions_session_token"), table_name="anonymous_sessions")
    op.drop_table("anonymous_sessions")
