from typing import Any

import stripe
from stripe import SignatureVerificationError


class StripeService:
    def __init__(self, secret_key: str, pro_price_id: str) -> None:
        self._pro_price_id = pro_price_id
        stripe.api_key = secret_key

    def create_subscription(
        self,
        email: str,
        payment_method_id: str,
    ) -> tuple[str, str]:
        """Create a Stripe customer + 7-day trial subscription.

        Returns (stripe_customer_id, stripe_subscription_id).
        """
        customer = stripe.Customer.create(
            email=email,
            payment_method=payment_method_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": self._pro_price_id}],
            trial_period_days=7,
            payment_settings={"save_default_payment_method": "on_subscription"},
        )
        return customer.id, subscription.id

    def validate_webhook(
        self,
        payload: bytes,
        sig_header: str,
        webhook_secret: str,
    ) -> dict[str, Any]:
        """Validate Stripe webhook signature and return the event dict.

        Raises ValueError if the signature is invalid.
        """
        try:
            return stripe.Webhook.construct_event(  # type: ignore[return-value]
                payload, sig_header, webhook_secret
            )
        except SignatureVerificationError as exc:
            raise ValueError("Invalid Stripe webhook signature") from exc
