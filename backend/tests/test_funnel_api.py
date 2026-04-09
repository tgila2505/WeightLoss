import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints.funnel import _get_stripe_service
from tests.support import ApiTestCase

_PROFILE_PAYLOAD = {
    "name": "Alex",
    "age": 30,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 90,
    "goal_weight_kg": 75,
    "timeline_weeks": 20,
    "health_conditions": "",
    "activity_level": "moderate",
    "diet_pattern": "balanced",
}


class FunnelSessionApiTest(ApiTestCase):
    def test_create_session_returns_201_and_sets_cookie(self) -> None:
        resp = self.client.post("/api/v1/funnel/session", json=_PROFILE_PAYLOAD)
        self.assertEqual(resp.status_code, 201)
        self.assertIn("session_id", resp.json())
        self.assertIn("funnel_session", resp.cookies)

    def test_create_session_stores_profile(self) -> None:
        resp = self.client.post("/api/v1/funnel/session", json=_PROFILE_PAYLOAD)
        self.assertEqual(resp.status_code, 201)
        # session_id is a valid UUID
        session_id = resp.json()["session_id"]
        uuid.UUID(session_id)  # raises if invalid


class FunnelPreviewApiTest(ApiTestCase):
    def _create_session(self) -> None:
        self.client.post("/api/v1/funnel/session", json=_PROFILE_PAYLOAD)

    def test_preview_requires_cookie(self) -> None:
        resp = self.client.get("/api/v1/funnel/preview", cookies={})
        self.assertEqual(resp.status_code, 401)

    def test_preview_returns_calorie_data(self) -> None:
        self._create_session()
        resp = self.client.get("/api/v1/funnel/preview")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("calories", body)
        self.assertGreater(body["calories"], 0)
        self.assertIn("protein_g", body)
        self.assertIn("weekly_loss_kg_estimate", body)

    def test_preview_invalid_cookie_returns_400(self) -> None:
        resp = self.client.get(
            "/api/v1/funnel/preview",
            cookies={"funnel_session": "not-a-uuid"},
        )
        self.assertEqual(resp.status_code, 400)

    def test_preview_unknown_session_returns_404(self) -> None:
        resp = self.client.get(
            "/api/v1/funnel/preview",
            cookies={"funnel_session": str(uuid.uuid4())},
        )
        self.assertEqual(resp.status_code, 404)


class FunnelConvertApiTest(ApiTestCase):
    def _create_session(self) -> None:
        self.client.post("/api/v1/funnel/session", json=_PROFILE_PAYLOAD)

    def test_convert_creates_user_and_returns_token(self) -> None:
        mock_svc = MagicMock()
        mock_svc.create_subscription.return_value = ("cus_abc", "sub_xyz", "price_pro_monthly")
        self.app.dependency_overrides[_get_stripe_service] = lambda: mock_svc

        self._create_session()
        resp = self.client.post(
            "/api/v1/funnel/convert",
            json={
                "email": "new@example.com",
                "password": "secure123",
                "payment_method_id": "pm_test",
            },
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("access_token", body)
        self.assertEqual(body["token_type"], "bearer")

    def test_convert_duplicate_email_returns_400(self) -> None:
        mock_svc = MagicMock()
        mock_svc.create_subscription.return_value = ("cus_abc", "sub_xyz", "price_pro_monthly")
        self.app.dependency_overrides[_get_stripe_service] = lambda: mock_svc

        self.create_user(email="dup@example.com")
        resp = self.client.post(
            "/api/v1/funnel/convert",
            json={
                "email": "dup@example.com",
                "password": "secure123",
                "payment_method_id": "pm_test",
            },
        )
        self.assertEqual(resp.status_code, 400)

    def test_convert_stripe_failure_returns_402(self) -> None:
        mock_svc = MagicMock()
        mock_svc.create_subscription.side_effect = Exception("card declined")
        self.app.dependency_overrides[_get_stripe_service] = lambda: mock_svc

        resp = self.client.post(
            "/api/v1/funnel/convert",
            json={
                "email": "pay@example.com",
                "password": "secure123",
                "payment_method_id": "pm_bad",
            },
        )
        self.assertEqual(resp.status_code, 402)


class FunnelEventsApiTest(ApiTestCase):
    def test_track_event_returns_204(self) -> None:
        resp = self.client.post(
            "/api/v1/funnel/events",
            json={"event_name": "landing_viewed", "properties": {}},
        )
        self.assertEqual(resp.status_code, 204)

    def test_track_event_with_session_token(self) -> None:
        resp = self.client.post(
            "/api/v1/funnel/events",
            json={
                "event_name": "onboarding_started",
                "session_token": str(uuid.uuid4()),
                "properties": {"step": 1},
            },
        )
        self.assertEqual(resp.status_code, 204)


class FunnelStatsApiTest(ApiTestCase):
    def test_stats_returns_expected_keys(self) -> None:
        resp = self.client.get("/api/v1/funnel/stats")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        for key in (
            "landing_views",
            "onboarding_starts",
            "onboarding_completions",
            "preview_views",
            "upgrade_clicks",
            "conversions",
            "plans_generated",
        ):
            self.assertIn(key, body)
        self.assertGreaterEqual(body["plans_generated"], 14280)


class FunnelStripeWebhookApiTest(ApiTestCase):
    def test_webhook_invalid_signature_returns_400(self) -> None:
        mock_svc = MagicMock()
        mock_svc.validate_webhook.side_effect = ValueError("Invalid Stripe webhook signature")
        self.app.dependency_overrides[_get_stripe_service] = lambda: mock_svc

        resp = self.client.post(
            "/api/v1/funnel/webhook/stripe",
            content=b"{}",
            headers={"stripe-signature": "bad"},
        )
        self.assertEqual(resp.status_code, 400)

    def test_webhook_unhandled_event_returns_200(self) -> None:
        mock_svc = MagicMock()
        mock_svc.validate_webhook.return_value = {
            "type": "payment_intent.succeeded",
            "data": {"object": {}},
        }
        self.app.dependency_overrides[_get_stripe_service] = lambda: mock_svc

        resp = self.client.post(
            "/api/v1/funnel/webhook/stripe",
            content=b"{}",
            headers={"stripe-signature": "t=123,v1=abc"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["received"])
