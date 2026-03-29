from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255))
    adherence_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    consistency_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    plan_refresh_needed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    health_metrics: Mapped[list["HealthMetrics"]] = relationship(back_populates="user")
    lab_records: Mapped[list["LabRecord"]] = relationship(back_populates="user")
    plans: Mapped[list["Plan"]] = relationship(back_populates="user")
    reminders: Mapped[list["Reminder"]] = relationship(back_populates="user")
    adherence_records: Mapped[list["AdherenceRecord"]] = relationship(back_populates="user")
    behavior_tracking_entries: Mapped[list["BehaviorTracking"]] = relationship(
        back_populates="user"
    )
    profile: Mapped["Profile | None"] = relationship(back_populates="user")
