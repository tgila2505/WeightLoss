from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.base import Base

if TYPE_CHECKING:
    from .user import User


class SeoPage(Base):
    __tablename__ = "seo_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    meta_description: Mapped[str | None] = mapped_column(String(300))
    h1: Mapped[str | None] = mapped_column(String(200))
    diet_type: Mapped[str | None] = mapped_column(String(80), index=True)
    goal_type: Mapped[str | None] = mapped_column(String(80), index=True)
    activity_level: Mapped[str | None] = mapped_column(String(80))
    age_range: Mapped[str | None] = mapped_column(String(40))
    content_json: Mapped[dict | None] = mapped_column(JSONB)
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    indexed: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BlogPost(Base):
    __tablename__ = "blog_post"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    excerpt: Mapped[str | None] = mapped_column(Text)
    content_mdx: Mapped[str | None] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(100))
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class UserGeneratedPage(Base):
    __tablename__ = "user_generated_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    kg_lost: Mapped[float | None] = mapped_column(Numeric(5, 2))
    weeks_taken: Mapped[int | None] = mapped_column(Integer)
    diet_type: Mapped[str | None] = mapped_column(String(80))
    testimonial: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="generated_pages")


class KeywordMapping(Base):
    __tablename__ = "keyword_mapping"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    keyword: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    target_slug: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    search_volume_est: Mapped[int | None] = mapped_column(Integer)
    difficulty_est: Mapped[int | None] = mapped_column(Integer)
    page_type: Mapped[str] = mapped_column(String(40), default="pseo", server_default="pseo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
