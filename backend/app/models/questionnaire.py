from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("user_id", "node_id", name="uq_questionnaire_user_node"),)

    user: Mapped["User"] = relationship(back_populates="questionnaire_responses")


class MasterUserProfile(Base):
    __tablename__ = "master_user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    profile_text: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="master_profile")
