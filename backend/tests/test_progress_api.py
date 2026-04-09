import unittest
from datetime import date, timedelta

from tests.support import ApiTestCase


class ProgressApiTest(ApiTestCase):
    def test_summary_new_user_returns_empty(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        response = self.client.get("/api/v1/progress/summary?days=90", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data["start_weight_kg"])
        self.assertIsNone(data["current_weight_kg"])
        self.assertEqual(data["chart_data"], [])
        self.assertFalse(data["plateau_detected"])

    def test_summary_requires_auth(self) -> None:
        response = self.client.get("/api/v1/progress/summary")
        self.assertEqual(response.status_code, 401)

    def test_create_entry_and_summary(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        today = date.today().isoformat()
        create_response = self.client.post(
            "/api/v1/progress/entries",
            headers=headers,
            json={"weight_kg": 85.0, "entry_date": today},
        )
        self.assertEqual(create_response.status_code, 201)
        entry = create_response.json()
        self.assertEqual(float(entry["weight_kg"]), 85.0)
        self.assertEqual(entry["source"], "manual")

        summary = self.client.get("/api/v1/progress/summary?days=30", headers=headers)
        self.assertEqual(summary.status_code, 200)
        data = summary.json()
        self.assertEqual(float(data["start_weight_kg"]), 85.0)
        self.assertEqual(float(data["current_weight_kg"]), 85.0)
        self.assertEqual(len(data["chart_data"]), 1)

    def test_duplicate_entry_date_upserts(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        today = date.today().isoformat()

        self.client.post(
            "/api/v1/progress/entries",
            headers=headers,
            json={"weight_kg": 85.0, "entry_date": today},
        )
        update = self.client.post(
            "/api/v1/progress/entries",
            headers=headers,
            json={"weight_kg": 84.5, "entry_date": today},
        )
        self.assertEqual(update.status_code, 201)
        self.assertEqual(float(update.json()["weight_kg"]), 84.5)

        entries = self.client.get("/api/v1/progress/entries", headers=headers)
        self.assertEqual(entries.status_code, 200)
        self.assertEqual(len(entries.json()), 1)

    def test_summary_trend_slope_with_multiple_entries(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        for i, weight in enumerate([86.0, 85.5, 85.0, 84.5]):
            entry_date = (date.today() - timedelta(days=10 - i)).isoformat()
            self.client.post(
                "/api/v1/progress/entries",
                headers=headers,
                json={"weight_kg": weight, "entry_date": entry_date},
            )

        summary = self.client.get("/api/v1/progress/summary?days=30", headers=headers)
        self.assertEqual(summary.status_code, 200)
        data = summary.json()
        self.assertIsNotNone(data["trend_slope_14d"])
        self.assertLess(data["trend_slope_14d"], 0)  # losing weight
        self.assertEqual(float(data["total_lost_kg"]), 1.5)


if __name__ == "__main__":
    unittest.main()
