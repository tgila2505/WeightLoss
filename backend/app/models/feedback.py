from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeedbackEntry(Base):
    __tablename__ = "feedback_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(String(100), index=True)
    feedback_type: Mapped[str] = mapped_column(String(50))  # "rating" | "text" | "mixed"
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1–5
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    context: Mapped[str | None] = mapped_column(String(100), nullable=True)  # page/feature
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSON, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BehaviorSignal(Base):
    __tablename__ = "behavior_signals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(String(100), index=True)
    # rage_click | drop_off | hesitation | repeated_action | abandonment
    signal_type: Mapped[str] = mapped_column(String(50), index=True)
    context: Mapped[str | None] = mapped_column(String(200), nullable=True)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
