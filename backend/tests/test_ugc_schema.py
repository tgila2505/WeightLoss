"""Tests for UgcPageResponse — specifically display_name derivation from title."""
import pytest
from app.schemas.seo import UgcPageResponse


class TestUgcPageResponseDisplayName:
    def test_derives_single_word_name_from_title(self) -> None:
        r = UgcPageResponse(
            slug="john-lost-10kg-in-12-weeks",
            title="How John Lost 10kg in 12 Weeks",
            kg_lost=10.0,
            weeks_taken=12,
        )
        assert r.display_name == "John"

    def test_derives_multi_word_name_from_title(self) -> None:
        r = UgcPageResponse(
            slug="janedoe-lost-8kg-in-10-weeks",
            title="How Jane Doe Lost 8kg in 10 Weeks",
            kg_lost=8.0,
            weeks_taken=10,
        )
        assert r.display_name == "Jane Doe"

    def test_returns_none_when_title_is_none(self) -> None:
        r = UgcPageResponse(slug="user-lost-5kg-in-8-weeks", title=None)
        assert r.display_name is None

    def test_returns_none_when_title_does_not_match_pattern(self) -> None:
        r = UgcPageResponse(slug="x", title="Some unrelated title")
        assert r.display_name is None

    def test_does_not_override_explicit_display_name(self) -> None:
        r = UgcPageResponse(
            slug="x",
            title="How John Lost 10kg in 12 Weeks",
            display_name="Explicit Name",
        )
        assert r.display_name == "Explicit Name"
