import unittest

from backend.tests.support import ApiTestCase


class ExperimentsApiTest(ApiTestCase):
    def test_get_assignment_returns_valid_variant(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/experiments/pricing-variant/assignment", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["experiment_key"], "pricing-variant")
        self.assertIn(data["variant"], ["9", "12", "19"])

    def test_same_user_always_gets_same_variant(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        r1 = self.client.get("/api/v1/experiments/headline-copy/assignment", headers=headers)
        r2 = self.client.get("/api/v1/experiments/headline-copy/assignment", headers=headers)
        self.assertEqual(r1.json()["variant"], r2.json()["variant"])

    def test_different_users_may_get_different_variants(self) -> None:
        variants = set()
        for i in range(20):
            user = self.create_user(email=f"user{i}@test.com")
            headers = self.auth_headers_for_user(user)
            r = self.client.get("/api/v1/experiments/pricing-variant/assignment", headers=headers)
            variants.add(r.json()["variant"])
        self.assertGreater(len(variants), 1)

    def test_unknown_experiment_returns_404(self) -> None:
        user = self.create_user(email="z@test.com")
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/experiments/nonexistent/assignment", headers=headers)
        self.assertEqual(resp.status_code, 404)

    def test_unauthenticated_returns_401(self) -> None:
        resp = self.client.get("/api/v1/experiments/pricing-variant/assignment")
        self.assertEqual(resp.status_code, 401)
