import unittest

from backend.tests.support import ApiTestCase


class PlanApiTest(ApiTestCase):
    def test_plan_create_and_get_today(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        missing_response = self.client.get("/api/v1/plans/today", headers=headers)
        self.assertEqual(missing_response.status_code, 404)

        create_response = self.client.post(
            "/api/v1/plans",
            headers=headers,
            json={
                "title": "Latest plan",
                "status": "active",
                "plan": {
                    "intent": "meal_plan",
                    "meals": [{"meal": "breakfast", "name": "Oats"}],
                    "activity": [{"title": "Walk", "frequency": "Daily"}],
                    "behavioral_actions": ["Hydrate"],
                    "lab_insights": [],
                    "risks": [],
                    "recommendations": ["Keep it simple"],
                    "adherence_signals": [{"name": "Hydrate", "completed": False}],
                    "constraints_applied": [],
                    "biomarker_adjustments": [],
                },
            },
        )

        self.assertEqual(create_response.status_code, 201)

        today_response = self.client.get("/api/v1/plans/today", headers=headers)
        self.assertEqual(today_response.status_code, 200)
        self.assertEqual(today_response.json()["title"], "Latest plan")
        self.assertEqual(today_response.json()["plan"]["intent"], "meal_plan")

    def test_plan_validation_rejects_missing_title(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)

        response = self.client.post(
            "/api/v1/plans",
            headers=headers,
            json={"title": "", "status": "active", "plan": {"intent": "meal_plan"}},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
