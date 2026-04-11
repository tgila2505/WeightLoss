import unittest

from tests.support import ApiTestCase
from app.models.seo import UserGeneratedPage


class SeoProfileApiTest(ApiTestCase):
    def _create_public_ugc_page(self, user, slug: str = "alice-lost-15kg-in-12-weeks") -> UserGeneratedPage:
        with self.session_factory() as session:
            page = UserGeneratedPage(
                user_id=user.id,
                slug=slug,
                title="How Alice Lost 15kg in 12 Weeks",
                kg_lost=15.0,
                weeks_taken=12,
                diet_type="keto",
                testimonial="It really worked!",
                is_public=True,
            )
            session.add(page)
            session.commit()
            session.refresh(page)
            session.expunge(page)
            return page

    def test_get_public_profile_returns_200(self) -> None:
        user = self.create_user()
        page = self._create_public_ugc_page(user)

        response = self.client.get(f"/api/v1/seo/profile/{page.slug}")

        self.assertEqual(response.status_code, 200)

    def test_get_public_profile_returns_correct_fields(self) -> None:
        user = self.create_user()
        page = self._create_public_ugc_page(user)

        data = self.client.get(f"/api/v1/seo/profile/{page.slug}").json()

        self.assertEqual(data["display_name"], "Alice")
        self.assertAlmostEqual(data["kg_lost"], 15.0, places=1)
        self.assertEqual(data["weeks_taken"], 12)
        self.assertEqual(data["diet_type"], "keto")
        self.assertEqual(data["slug"], page.slug)
        self.assertIn("member_since", data)
        self.assertEqual(data["title"], "How Alice Lost 15kg in 12 Weeks")

    def test_get_public_profile_404_for_private_page(self) -> None:
        user = self.create_user()
        with self.session_factory() as session:
            page = UserGeneratedPage(
                user_id=user.id,
                slug="private-lost-10kg-in-8-weeks",
                title="How Private Lost 10kg in 8 Weeks",
                kg_lost=10.0,
                weeks_taken=8,
                is_public=False,
            )
            session.add(page)
            session.commit()

        response = self.client.get("/api/v1/seo/profile/private-lost-10kg-in-8-weeks")
        self.assertEqual(response.status_code, 404)

    def test_get_public_profile_404_for_unknown_slug(self) -> None:
        response = self.client.get("/api/v1/seo/profile/does-not-exist")
        self.assertEqual(response.status_code, 404)

    def test_get_public_profile_display_name_falls_back_for_user_slug(self) -> None:
        user = self.create_user()
        with self.session_factory() as session:
            page = UserGeneratedPage(
                user_id=user.id,
                slug="user-lost-8kg-in-10-weeks",
                title="How User Lost 8kg in 10 Weeks",
                kg_lost=8.0,
                weeks_taken=10,
                is_public=True,
            )
            session.add(page)
            session.commit()

        data = self.client.get("/api/v1/seo/profile/user-lost-8kg-in-10-weeks").json()
        self.assertEqual(data["display_name"], "User")


if __name__ == "__main__":
    unittest.main()
