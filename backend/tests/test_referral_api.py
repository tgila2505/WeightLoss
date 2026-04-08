import unittest

from tests.support import ApiTestCase


class ReferralApiTest(ApiTestCase):
    def test_get_or_create_referral_code(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        # First call creates the code
        response = self.client.get("/api/v1/referrals/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("code", data)
        self.assertTrue(len(data["code"]) == 8)
        self.assertTrue(data["is_active"])

        # Second call returns the same code (idempotent)
        response2 = self.client.get("/api/v1/referrals/me", headers=headers)
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(response2.json()["code"], data["code"])

    def test_get_or_create_requires_auth(self) -> None:
        response = self.client.get("/api/v1/referrals/me")
        self.assertEqual(response.status_code, 401)

    def test_stats_new_user_returns_zeroes(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        response = self.client.get("/api/v1/referrals/me/stats", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["clicks"], 0)
        self.assertEqual(data["signups"], 0)
        self.assertEqual(data["conversions"], 0)
        self.assertEqual(data["rewards_earned"], 0)
        self.assertIsNone(data["code"])  # no code yet before /me is called

    def test_stats_after_code_creation_shows_code(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        # Create the code first
        me_response = self.client.get("/api/v1/referrals/me", headers=headers)
        code = me_response.json()["code"]

        # Stats should now return the code
        stats = self.client.get("/api/v1/referrals/me/stats", headers=headers)
        self.assertEqual(stats.status_code, 200)
        self.assertEqual(stats.json()["code"], code)

    def test_two_users_get_distinct_codes(self) -> None:
        user1 = self.create_user(email="user1@example.com")
        user2 = self.create_user(email="user2@example.com")

        code1 = self.client.get(
            "/api/v1/referrals/me", headers=self.auth_headers_for_user(user1)
        ).json()["code"]
        code2 = self.client.get(
            "/api/v1/referrals/me", headers=self.auth_headers_for_user(user2)
        ).json()["code"]

        self.assertNotEqual(code1, code2)


if __name__ == "__main__":
    unittest.main()
