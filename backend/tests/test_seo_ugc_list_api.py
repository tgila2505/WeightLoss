import unittest

from tests.support import ApiTestCase

from app.models.seo import UserGeneratedPage


class SeoUgcListApiTest(ApiTestCase):
    def _create_page(
        self,
        user,
        slug: str,
        diet_type: str | None = None,
        is_public: bool = True,
    ) -> UserGeneratedPage:
        with self.session_factory() as session:
            page = UserGeneratedPage(
                user_id=user.id,
                slug=slug,
                title="How User Lost 10kg in 8 Weeks",
                kg_lost=10.0,
                weeks_taken=8,
                diet_type=diet_type,
                is_public=is_public,
            )
            session.add(page)
            session.commit()
            session.refresh(page)
            session.expunge(page)
            return page

    def test_list_returns_only_public_pages(self) -> None:
        user = self.create_user()
        self._create_page(user, slug="public-lost-10kg-in-8-weeks", is_public=True)
        self._create_page(user, slug="private-lost-5kg-in-4-weeks", is_public=False)

        data = self.client.get("/api/v1/seo/ugc/list").json()

        slugs = [p["slug"] for p in data["pages"]]
        self.assertIn("public-lost-10kg-in-8-weeks", slugs)
        self.assertNotIn("private-lost-5kg-in-4-weeks", slugs)

    def test_list_returns_correct_fields(self) -> None:
        user = self.create_user()
        self._create_page(user, slug="alice-lost-10kg-in-8-weeks", diet_type="keto")

        data = self.client.get("/api/v1/seo/ugc/list").json()
        page = next(p for p in data["pages"] if p["slug"] == "alice-lost-10kg-in-8-weeks")

        self.assertEqual(page["slug"], "alice-lost-10kg-in-8-weeks")
        self.assertAlmostEqual(page["kg_lost"], 10.0, places=1)
        self.assertEqual(page["weeks_taken"], 8)
        self.assertEqual(page["diet_type"], "keto")
        self.assertIn("title", page)

    def test_list_empty_state(self) -> None:
        data = self.client.get("/api/v1/seo/ugc/list").json()
        self.assertIsInstance(data["pages"], list)
        self.assertIsInstance(data["total"], int)

    def test_list_respects_limit(self) -> None:
        user = self.create_user()
        for i in range(5):
            self._create_page(user, slug=f"user-lost-{i}kg-in-{i + 4}-weeks")

        data = self.client.get("/api/v1/seo/ugc/list?limit=2").json()
        self.assertLessEqual(len(data["pages"]), 2)


if __name__ == "__main__":
    unittest.main()
