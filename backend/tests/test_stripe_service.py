import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.stripe_service import StripeService


class StripeServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.svc = StripeService(
            secret_key="sk_test_fake",
            pro_monthly_price_id="price_pro_monthly",
            pro_annual_price_id="price_pro_annual",
            pro_plus_monthly_price_id="price_pro_plus_monthly",
            pro_plus_annual_price_id="price_pro_plus_annual",
        )

    @patch("app.services.stripe_service.stripe")
    def test_create_subscription(self, mock_stripe: MagicMock) -> None:
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_abc123")
        mock_stripe.Subscription.create.return_value = MagicMock(
            id="sub_def456", status="trialing"
        )

        customer_id, subscription_id, price_id = self.svc.create_subscription(
            email="test@example.com",
            payment_method_id="pm_test123",
            tier="pro",
            interval="monthly",
        )

        self.assertEqual(customer_id, "cus_abc123")
        self.assertEqual(subscription_id, "sub_def456")
        self.assertEqual(price_id, "price_pro_monthly")
        mock_stripe.Customer.create.assert_called_once_with(
            email="test@example.com",
            payment_method="pm_test123",
            invoice_settings={"default_payment_method": "pm_test123"},
        )
        mock_stripe.Subscription.create.assert_called_once_with(
            customer="cus_abc123",
            items=[{"price": "price_pro_monthly"}],
            trial_period_days=7,
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )

    @patch("app.services.stripe_service.stripe")
    def test_validate_webhook_valid(self, mock_stripe: MagicMock) -> None:
        mock_stripe.Webhook.construct_event.return_value = {
            "type": "customer.subscription.updated"
        }
        event = self.svc.validate_webhook(b"payload", "sig_header", "whsec_test")
        self.assertEqual(event["type"], "customer.subscription.updated")

    @patch("app.services.stripe_service.stripe")
    def test_validate_webhook_invalid_raises(self, mock_stripe: MagicMock) -> None:
        from stripe import SignatureVerificationError

        mock_stripe.Webhook.construct_event.side_effect = SignatureVerificationError(
            "bad sig", "sig_header"
        )
        with self.assertRaises(ValueError):
            self.svc.validate_webhook(b"payload", "bad_sig", "whsec_test")
