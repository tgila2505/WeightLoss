import unittest

from backend.tests.support import ApiTestCase


class AdherenceApiTest(ApiTestCase):
    def test_adherence_flow_returns_filtered_records_and_summary(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        first_response = self.client.post(
            "/api/v1/adherence",
            headers=headers,
            json={
                "item_type": "meal",
                "item_name": "Breakfast",
                "completed": True,
                "adherence_date": "2026-04-01",
                "score": 100,
            },
        )
        self.assertEqual(first_response.status_code, 201)

        second_response = self.client.post(
            "/api/v1/adherence",
            headers=headers,
            json={
                "item_type": "activity",
                "item_name": "Walk",
                "completed": False,
                "adherence_date": "2026-04-02",
                "score": 0,
            },
        )
        self.assertEqual(second_response.status_code, 201)

        list_response = self.client.get(
            "/api/v1/adherence?start_date=2026-04-02&end_date=2026-04-02",
            headers=headers,
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)
        self.assertEqual(list_response.json()[0]["item_name"], "Walk")

        summary_response = self.client.get("/api/v1/adherence/summary", headers=headers)
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.json()["total_records"], 2)
        self.assertIn(summary_response.json()["consistency_level"], {"moderate", "low", "high"})

    def test_adherence_requires_authentication(self) -> None:
        response = self.client.get("/api/v1/adherence")

        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
