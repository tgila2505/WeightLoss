"""SEO service — pSEO page lookup, UGC page management, blog slug listing."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from ..models.profile import Profile
from ..models.seo import BlogPost, SeoPage, UserGeneratedPage
from ..models.user import User


@dataclass
class UgcUserProfile:
    name: str | None
    kg_lost: float
    weeks_taken: int
    diet_type: str | None


def get_base_url() -> str:
    return os.environ.get("NEXT_PUBLIC_BASE_URL", "https://weightloss.app")


def get_user_profile_for_ugc(session: Session, user_id: int) -> UgcUserProfile | None:
    profile = session.query(Profile).filter_by(user_id=user_id).first()
    if not profile:
        return None
    start = float(profile.weight_kg or 0)
    goal = float(profile.goal_target_weight_kg or 0)
    kg_lost = max(0.5, start - goal) if start and goal else 1.0
    weeks = int(profile.goal_timeline_weeks or 12)
    return UgcUserProfile(
        name=profile.name,
        kg_lost=kg_lost,
        weeks_taken=weeks,
        diet_type=profile.diet_pattern,
    )


def get_seo_page(session: Session, slug: str) -> SeoPage | None:
    page = session.query(SeoPage).filter_by(slug=slug).first()
    if page:
        # Increment view counter (fire-and-forget; ignore race conditions)
        page.view_count = (page.view_count or 0) + 1
        try:
            session.commit()
        except Exception:
            session.rollback()
    return page


def list_seo_slugs(session: Session) -> list[str]:
    rows = session.query(SeoPage.slug).filter_by(indexed=True).all()
    return [r.slug for r in rows]


def list_blog_slugs(session: Session) -> list[str]:
    rows = session.query(BlogPost.slug).filter_by(published=True).all()
    return [r.slug for r in rows]


def list_blog_posts(session: Session) -> list[BlogPost]:
    return (
        session.query(BlogPost)
        .filter_by(published=True)
        .order_by(BlogPost.published_at.desc())
        .all()
    )


def get_blog_post(session: Session, slug: str) -> BlogPost | None:
    post = session.query(BlogPost).filter_by(slug=slug, published=True).first()
    if post:
        post.view_count = (post.view_count or 0) + 1
        try:
            session.commit()
        except Exception:
            session.rollback()
    return post


def list_ugc_slugs(session: Session) -> list[str]:
    rows = session.query(UserGeneratedPage.slug).filter_by(is_public=True).all()
    return [r.slug for r in rows]


def get_ugc_page(session: Session, slug: str) -> UserGeneratedPage | None:
    page = session.query(UserGeneratedPage).filter_by(slug=slug, is_public=True).first()
    if page:
        page.view_count = (page.view_count or 0) + 1
        try:
            session.commit()
        except Exception:
            session.rollback()
    return page


def _slugify(name: str) -> str:
    name = name.lower().strip()
    return re.sub(r'[^a-z0-9]+', '', name)


def _build_ugc_slug(display_name: str, kg_lost: float, weeks_taken: int) -> str:
    name_part = _slugify(display_name) if display_name else 'user'
    kg_part = round(kg_lost)
    return f"{name_part}-lost-{kg_part}kg-in-{weeks_taken}-weeks"


def _resolve_slug_collision(session: Session, base_slug: str) -> str:
    slug = base_slug
    counter = 2
    while session.query(UserGeneratedPage).filter_by(slug=slug).first() is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def share_ugc_page(
    session: Session,
    user_id: int,
    display_name: str | None,
    user_quote: str | None,
    display_name_visible: bool,
    kg_lost: float,
    weeks_taken: int,
    diet_type: str | None,
) -> UserGeneratedPage:
    # Check if user already has a page
    existing = session.query(UserGeneratedPage).filter_by(user_id=user_id).first()

    effective_name = display_name if display_name_visible and display_name else 'user'
    base_slug = _build_ugc_slug(effective_name, kg_lost, weeks_taken)

    if existing:
        existing.is_public = True
        existing.testimonial = user_quote
        existing.title = f"How {effective_name.capitalize()} Lost {round(kg_lost)}kg in {weeks_taken} Weeks"
        session.commit()
        return existing

    slug = _resolve_slug_collision(session, base_slug)
    page = UserGeneratedPage(
        user_id=user_id,
        slug=slug,
        title=f"How {effective_name.capitalize()} Lost {round(kg_lost)}kg in {weeks_taken} Weeks",
        kg_lost=kg_lost,
        weeks_taken=weeks_taken,
        diet_type=diet_type,
        testimonial=user_quote,
        is_public=True,
    )
    session.add(page)
    session.commit()
    session.refresh(page)
    return page


def unshare_ugc_page(session: Session, user_id: int) -> bool:
    page = session.query(UserGeneratedPage).filter_by(user_id=user_id).first()
    if not page:
        return False
    page.is_public = False
    session.commit()
    return True


def get_public_profile(session: Session, ugc_slug: str) -> dict | None:
    """Return public-safe profile data for the given UGC slug."""
    page = session.query(UserGeneratedPage).filter_by(slug=ugc_slug, is_public=True).first()
    if not page:
        return None
    user = session.get(User, page.user_id)
    match = re.match(r"How (\w+) Lost", page.title or "")
    display_name = match.group(1).capitalize() if match else "User"
    member_since = user.created_at.strftime("%Y") if user else "2024"
    return {
        "display_name": display_name,
        "kg_lost": float(page.kg_lost) if page.kg_lost is not None else None,
        "weeks_taken": page.weeks_taken,
        "diet_type": page.diet_type,
        "member_since": member_since,
        "title": page.title,
        "testimonial": page.testimonial,
        "slug": page.slug,
    }


def get_ugc_preview(
    session: Session,
    user_id: int,
    display_name: str | None,
    kg_lost: float,
    weeks_taken: int,
    diet_type: str | None,
) -> dict[str, Any]:
    effective_name = display_name or 'you'
    return {
        'title': f"How {effective_name.capitalize()} Lost {round(kg_lost)}kg in {weeks_taken} Weeks",
        'kg_lost': kg_lost,
        'weeks_taken': weeks_taken,
        'diet_type': diet_type,
        'preview_slug': _build_ugc_slug(effective_name, kg_lost, weeks_taken),
    }
