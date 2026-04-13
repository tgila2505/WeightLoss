import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HabitLog(Base):
    __tablename__ = "habit_log"
    __table_args__ = (
        UniqueConstraint("user_id", "log_date", name="uq_habit_log_user_date"),
        CheckConstraint("mood BETWEEN 1 AND 5", name="ck_habit_log_mood"),
        CheckConstraint("adherence IN ('on_track', 'partial', 'off_track')", name="ck_habit_log_adherence"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date: Mapped[date] = mapped_column(Date(), nullable=False)
    mood: Mapped[int | None] = mapped_column(SmallInteger(), nullable=True)
    adherence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ai_feedback: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    ai_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="habit_logs")


class ProgressEntry(Base):
    __tablename__ = "progress_entry"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_progress_entry_user_date"),
        CheckConstraint("source IN ('checkin', 'manual', 'device_sync')", name="ck_progress_entry_source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date(), nullable=False)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    body_fat_pct: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="checkin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="progress_entries")


class StreakRecord(Base):
    __tablename__ = "streak_record"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_streak: Mapped[int] = mapped_column(nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(nullable=False, default=0)
    last_checkin_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    streak_freeze_used: Mapped[bool] = mapped_column(nullable=False, default=False)
    freeze_resets_at: Mapped[date | None] = mapped_column(Date(), nullable=True)
    total_checkins: Mapped[int] = mapped_column(nullable=False, default=0)
    badges_earned: Mapped[list] = mapped_column(JSONB(), nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="streak_record")


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    push_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    email_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    preferred_push_time: Mapped[str] = mapped_column(String(8), nullable=False, default="08:00:00")
    user_timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    daily_reminder_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    streak_alerts_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    goal_nudges_enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    marketing_emails: Mapped[bool] = mapped_column(nullable=False, default=False)
    push_subscription: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="notification_preferences")
