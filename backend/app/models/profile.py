from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    goal_target_weight_kg: Mapped[float | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    goal_timeline_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    health_conditions: Mapped[str | None] = mapped_column(String(500), nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sleep_hours: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    diet_pattern: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="profile")
