"""add_user_adoption_tables

Revision ID: d9e8f7a6b5c4
Revises: e457f5743fa7
Create Date: 2026-04-06 14:00:00.000000
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d9e8f7a6b5c4"
down_revision = "e457f5743fa7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # onboarding_states — one row per user, tracks partial wizard progress
    op.create_table(
        "onboarding_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "form_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
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
        op.f("ix_onboarding_states_user_id"),
        "onboarding_states",
        ["user_id"],
        unique=True,
    )

    # feedback_entries — user-submitted ratings and text feedback
    op.create_table(
        "feedback_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("feedback_type", sa.String(length=50), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("context", sa.String(length=100), nullable=True),
        sa.Column(
            "metadata",
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
        op.f("ix_feedback_entries_user_id"), "feedback_entries", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_feedback_entries_session_id"),
        "feedback_entries",
        ["session_id"],
        unique=False,
    )

    # behavior_signals — passive UX signals (rage clicks, drop-offs, etc.)
    op.create_table(
        "behavior_signals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(length=100), nullable=False),
        sa.Column("signal_type", sa.String(length=50), nullable=False),
        sa.Column("context", sa.String(length=200), nullable=True),
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
        op.f("ix_behavior_signals_user_id"), "behavior_signals", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_behavior_signals_session_id"),
        "behavior_signals",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_behavior_signals_signal_type"),
        "behavior_signals",
        ["signal_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_behavior_signals_signal_type"), table_name="behavior_signals")
    op.drop_index(op.f("ix_behavior_signals_session_id"), table_name="behavior_signals")
    op.drop_index(op.f("ix_behavior_signals_user_id"), table_name="behavior_signals")
    op.drop_table("behavior_signals")

    op.drop_index(op.f("ix_feedback_entries_session_id"), table_name="feedback_entries")
    op.drop_index(op.f("ix_feedback_entries_user_id"), table_name="feedback_entries")
    op.drop_table("feedback_entries")

    op.drop_index(op.f("ix_onboarding_states_user_id"), table_name="onboarding_states")
    op.drop_table("onboarding_states")
