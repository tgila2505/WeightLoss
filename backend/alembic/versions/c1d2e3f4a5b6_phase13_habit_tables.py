"""phase13 habit engagement tables

Revision ID: c1d2e3f4a5b6
Revises: b9c8d7e6f5a4
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c1d2e3f4a5b6"
down_revision: str = "b9c8d7e6f5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── habit_log ──────────────────────────────────────────────────────────
    op.create_table(
        "habit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_date", sa.Date(), nullable=False),
        sa.Column("mood", sa.SmallInteger(), nullable=True),
        sa.Column("adherence", sa.String(20), nullable=True),
        sa.Column("weight_kg", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("ai_feedback", postgresql.JSONB(), nullable=True),
        sa.Column("ai_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("mood BETWEEN 1 AND 5", name="ck_habit_log_mood"),
        sa.CheckConstraint("adherence IN ('on_track', 'partial', 'off_track')", name="ck_habit_log_adherence"),
        sa.UniqueConstraint("user_id", "log_date", name="uq_habit_log_user_date"),
    )
    op.create_index("idx_habit_log_user_date", "habit_log", ["user_id", sa.text("log_date DESC")])

    # ── progress_entry ─────────────────────────────────────────────────────
    op.create_table(
        "progress_entry",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(5, 2), nullable=True),
        sa.Column("body_fat_pct", sa.Numeric(4, 1), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="checkin"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("source IN ('checkin', 'manual', 'device_sync')", name="ck_progress_entry_source"),
        sa.UniqueConstraint("user_id", "entry_date", name="uq_progress_entry_user_date"),
    )
    op.create_index("idx_progress_entry_user_date", "progress_entry", ["user_id", sa.text("entry_date DESC")])

    # ── streak_record ──────────────────────────────────────────────────────
    op.create_table(
        "streak_record",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_checkin_date", sa.Date(), nullable=True),
        sa.Column("streak_freeze_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("freeze_resets_at", sa.Date(), nullable=True),
        sa.Column("total_checkins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("badges_earned", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ── notification_preferences ───────────────────────────────────────────
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("preferred_push_time", sa.Time(), nullable=False, server_default="08:00"),
        sa.Column("user_timezone", sa.String(50), nullable=False, server_default="UTC"),
        sa.Column("daily_reminder_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("streak_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("goal_nudges_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("marketing_emails", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("push_subscription", postgresql.JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ── notification_event ─────────────────────────────────────────────────
    op.create_table(
        "notification_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("channel IN ('push', 'email', 'in_app')", name="ck_notification_event_channel"),
        sa.CheckConstraint("status IN ('pending', 'sent', 'failed', 'dismissed')", name="ck_notification_event_status"),
    )
    op.create_index("idx_notification_event_user", "notification_event", ["user_id", sa.text("created_at DESC")])
    op.create_index(
        "idx_notification_event_status",
        "notification_event",
        ["status"],
        postgresql_where=sa.text("status = 'pending'"),
    )

    # ── ai_report ──────────────────────────────────────────────────────────
    op.create_table(
        "ai_report",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_type", sa.String(30), nullable=False),
        sa.Column("period_key", sa.String(20), nullable=False),
        sa.Column("content", postgresql.JSONB(), nullable=False),
        sa.Column("adjustments", postgresql.JSONB(), nullable=True),
        sa.Column("adjustment_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("blob_url", sa.String(500), nullable=True),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("report_type IN ('weekly', 'behavioral_insights', 'plan_adjustment')", name="ck_ai_report_type"),
        sa.CheckConstraint("status IN ('pending', 'generating', 'ready', 'failed')", name="ck_ai_report_status"),
        sa.UniqueConstraint("user_id", "report_type", "period_key", name="uq_ai_report_user_type_period"),
    )
    op.create_index("idx_ai_report_user", "ai_report", ["user_id", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("idx_ai_report_user", table_name="ai_report")
    op.drop_table("ai_report")
    op.drop_index("idx_notification_event_status", table_name="notification_event")
    op.drop_index("idx_notification_event_user", table_name="notification_event")
    op.drop_table("notification_event")
    op.drop_table("notification_preferences")
    op.drop_table("streak_record")
    op.drop_index("idx_progress_entry_user_date", table_name="progress_entry")
    op.drop_table("progress_entry")
    op.drop_index("idx_habit_log_user_date", table_name="habit_log")
    op.drop_table("habit_log")
