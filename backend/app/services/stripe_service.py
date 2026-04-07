from typing import Any

import stripe
from stripe import SignatureVerificationError


class StripeService:
    def __init__(
        self,
        secret_key: str,
        pro_monthly_price_id: str = "",
        pro_annual_price_id: str = "",
        pro_plus_monthly_price_id: str = "",
        pro_plus_annual_price_id: str = "",
    ) -> None:
        stripe.api_key = secret_key
        self._price_ids = {
            ("pro", "monthly"): pro_monthly_price_id,
            ("pro", "annual"): pro_annual_price_id,
            ("pro_plus", "monthly"): pro_plus_monthly_price_id,
            ("pro_plus", "annual"): pro_plus_annual_price_id,
        }

    def get_price_id(self, tier: str, interval: str) -> str:
        price_id = self._price_ids.get((tier, interval), "")
        if not price_id:
            raise ValueError(f"No price configured for {tier}/{interval}")
        return price_id

    def create_customer(self, email: str, payment_method_id: str) -> str:
        customer = stripe.Customer.create(
            email=email,
            payment_method=payment_method_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        return customer.id

    def create_subscription(
        self,
        email: str,
        payment_method_id: str,
        tier: str = "pro",
        interval: str = "monthly",
        trial_period_days: int = 7,
    ) -> tuple[str, str, str]:
        """Create Stripe customer + subscription. Returns (customer_id, subscription_id, price_id)."""
        price_id = self.get_price_id(tier, interval)
        customer = stripe.Customer.create(
            email=email,
            payment_method=payment_method_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": price_id}],
            trial_period_days=trial_period_days,
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )
        return customer.id, subscription.id, price_id

    def create_subscription_for_customer(
        self,
        customer_id: str,
        payment_method_id: str,
        tier: str,
        interval: str,
    ) -> tuple[str, str]:
        """Attach payment method to existing customer and create subscription. Returns (subscription_id, price_id)."""
        price_id = self.get_price_id(tier, interval)
        stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_settings={"save_default_payment_method": "on_subscription"},
        )
        return subscription.id, price_id

    def cancel_subscription(self, subscription_id: str) -> None:
        """Cancel at period end."""
        stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)

    def cancel_subscription_immediately(self, subscription_id: str) -> None:
        stripe.Subscription.cancel(subscription_id)

    def reactivate_subscription(self, subscription_id: str) -> None:
        """Undo cancel_at_period_end."""
        stripe.Subscription.modify(subscription_id, cancel_at_period_end=False)

    def update_subscription_price(self, subscription_id: str, tier: str, interval: str) -> str:
        """Upgrade/downgrade by swapping price. Returns new price_id."""
        price_id = self.get_price_id(tier, interval)
        sub = stripe.Subscription.retrieve(subscription_id)
        stripe.Subscription.modify(
            subscription_id,
            items=[{"id": sub["items"]["data"][0]["id"], "price": price_id}],
            proration_behavior="create_prorations",
        )
        return price_id

    def update_payment_method(self, customer_id: str, payment_method_id: str) -> None:
        stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )

    def create_billing_portal_session(self, customer_id: str, return_url: str) -> str:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url

    def validate_webhook(self, payload: bytes, sig_header: str, webhook_secret: str) -> dict[str, Any]:
        try:
            return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)  # type: ignore[return-value]
        except SignatureVerificationError as exc:
            raise ValueError("Invalid Stripe webhook signature") from exc
