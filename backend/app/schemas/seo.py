from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator


class SeoPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    meta_description: str | None = None
    h1: str | None = None
    diet_type: str | None = None
    goal_type: str | None = None
    activity_level: str | None = None
    age_range: str | None = None
    content_json: dict[str, Any] | None = None
    view_count: int = 0
    indexed: bool = True


class SeoPageListResponse(BaseModel):
    slugs: list[str]
    total: int


class BlogSlugListResponse(BaseModel):
    slugs: list[str]


class UgcSlugListResponse(BaseModel):
    slugs: list[str]


_TITLE_AUTHOR_RE = re.compile(r'^How (.+?) Lost \d')


class UgcPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str | None = None
    kg_lost: float | None = None
    weeks_taken: int | None = None
    diet_type: str | None = None
    testimonial: str | None = None
    view_count: int = 0
    display_name: str | None = None

    @model_validator(mode='after')
    def derive_display_name(self) -> 'UgcPageResponse':
        if self.display_name is None and self.title:
            m = _TITLE_AUTHOR_RE.match(self.title)
            if m:
                self.display_name = m.group(1)
        return self


class UgcShareRequest(BaseModel):
    display_name_visible: bool = True
    user_quote: str | None = None


class UgcShareResponse(BaseModel):
    slug: str
    url: str
    is_public: bool


class UgcPreviewResponse(BaseModel):
    title: str
    kg_lost: float
    weeks_taken: int
    diet_type: str | None = None
    preview_slug: str


class BlogPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    excerpt: str | None = None
    author: str | None = None
    tags: list[str] | None = None
    published: bool
    published_at: Any | None = None
    view_count: int = 0


class PublicProfileResponse(BaseModel):
    display_name: str
    kg_lost: float | None = None
    weeks_taken: int | None = None
    diet_type: str | None = None
    member_since: str
    title: str | None = None
    testimonial: str | None = None
    slug: str
