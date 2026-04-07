import unittest

from backend.tests.support import ApiTestCase


class ProfileApiTest(ApiTestCase):
    def test_profile_crud_flow(self) -> None:
        user = self.create_user()
        self.create_pro_subscription(user)
        headers = self.auth_headers_for_user(user)

        create_response = self.client.post(
            "/api/v1/profile",
            headers=headers,
            json={
                "name": "Test User",
                "age": 32,
                "height_cm": 170,
                "weight_kg": 80,
                "goal_target_weight_kg": 72,
                "goal_timeline_weeks": 12,
                "activity_level": "moderate",
                "sleep_hours": 7,
                "diet_pattern": "balanced",
            },
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["name"], "Test User")

        get_response = self.client.get("/api/v1/profile", headers=headers)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()["goal_timeline_weeks"], 12)

        update_response = self.client.put(
            "/api/v1/profile",
            headers=headers,
            json={"goal_timeline_weeks": 16, "activity_level": "high"},
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["goal_timeline_weeks"], 16)
        self.assertEqual(update_response.json()["activity_level"], "high")

        delete_response = self.client.delete("/api/v1/profile", headers=headers)
        self.assertEqual(delete_response.status_code, 204)

        missing_response = self.client.get("/api/v1/profile", headers=headers)
        self.assertEqual(missing_response.status_code, 404)

    def test_profile_requires_valid_token(self) -> None:
        response = self.client.get(
            "/api/v1/profile",
            headers={"Authorization": "Bearer invalid-token"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["message"],
            "Invalid authentication credentials",
        )


if __name__ == "__main__":
    unittest.main()
