import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.support import ApiTestCase

from app.models.funnel import UserSubscription


class PlansSubscriptionGuardTest(ApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = self.create_user()
        self.force_current_user(self.user)

    def _add_subscription(self, tier: str, status: str, trial_days: int | None = None) -> None:
        now = datetime.now(UTC)
        with self.session_factory() as session:
            sub = UserSubscription(
                user_id=self.user.id,
                stripe_customer_id="cus_test",
                stripe_subscription_id="sub_test",
                tier=tier,
                status=status,
                trial_started_at=now if trial_days is not None else None,
                trial_expires_at=now + timedelta(days=trial_days) if trial_days is not None else None,
            )
            session.add(sub)
            session.commit()

    def test_no_subscription_returns_403(self) -> None:
        resp = self.client.get("/api/v1/plans/today")
        self.assertEqual(resp.status_code, 403)
        self.assertIn("FEATURE_GATED", str(resp.json()))

    def test_free_tier_returns_403(self) -> None:
        # free tier shouldn't normally exist in UserSubscription, but guard against it
        self._add_subscription(tier="free", status="active")
        resp = self.client.get("/api/v1/plans/today")
        self.assertEqual(resp.status_code, 403)
        self.assertIn("FEATURE_GATED", str(resp.json()))

    def test_pro_trialing_allows_access(self) -> None:
        self._add_subscription(tier="pro", status="trialing", trial_days=7)
        # plan doesn't exist → 404, but auth guard passed
        resp = self.client.get("/api/v1/plans/today")
        self.assertEqual(resp.status_code, 404)

    def test_pro_active_allows_access(self) -> None:
        self._add_subscription(tier="pro", status="active")
        resp = self.client.get("/api/v1/plans/today")
        self.assertEqual(resp.status_code, 404)

    def test_pro_cancelled_returns_403(self) -> None:
        self._add_subscription(tier="pro", status="canceled")
        resp = self.client.get("/api/v1/plans/today")
        self.assertEqual(resp.status_code, 403)
        self.assertIn("FEATURE_GATED", str(resp.json()))
