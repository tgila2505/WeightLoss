import enum
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReferralEventType(str, enum.Enum):
    CLICK = "click"
    SIGNUP = "signup"
    PAID_CONVERSION = "paid_conversion"


class RewardType(str, enum.Enum):
    PREMIUM_DAYS = "premium_days"


class RewardStatus(str, enum.Enum):
    APPLIED = "applied"
    REVOKED = "revoked"


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    referrer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    referrer: Mapped["User"] = relationship(
        "User", back_populates="referral", foreign_keys=[referrer_user_id]
    )
    events: Mapped[list["ReferralEvent"]] = relationship(
        "ReferralEvent", back_populates="referral", cascade="all, delete-orphan"
    )


class ReferralEvent(Base):
    __tablename__ = "referral_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    referral_id: Mapped[int] = mapped_column(
        ForeignKey("referrals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[ReferralEventType] = mapped_column(
        SAEnum(ReferralEventType, native_enum=False), nullable=False
    )
    referred_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    referral: Mapped["Referral"] = relationship("Referral", back_populates="events")
    referred_user: Mapped["User | None"] = relationship(
        "User", foreign_keys=[referred_user_id]
    )


class RewardLog(Base):
    __tablename__ = "reward_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    referral_event_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("referral_events.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,  # one reward row per referral event — prevents double-reward
    )
    reward_type: Mapped[RewardType] = mapped_column(
        SAEnum(RewardType, native_enum=False), nullable=False
    )
    reward_value: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RewardStatus] = mapped_column(
        SAEnum(RewardStatus, native_enum=False),
        nullable=False,
        default=RewardStatus.APPLIED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
