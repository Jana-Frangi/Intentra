
from decimal import Decimal, InvalidOperation

from payment_store import get_order
from paypal_client import get_sandbox_order_details


def verify_sandbox_order(order_id: str) -> dict:
    """
    Verify a PayPal order against Intentra's local record.

    This is read-only. It does not capture a payment.
    """

    local_order = get_order(order_id)

    if local_order is None:
        raise ValueError(
            "This PayPal order was not created by Intentra."
        )

    if local_order["status"] != "CREATED":
        raise ValueError(
            "This order is not available for checkout."
        )

    paypal_order = get_sandbox_order_details(order_id)

    if paypal_order["order_id"] != order_id:
        raise ValueError("PayPal order ID mismatch.")

    if paypal_order["intent"] != "CAPTURE":
        raise ValueError("Unexpected PayPal payment intent.")

    if paypal_order["status"] not in ("CREATED", "APPROVED"):
        raise ValueError(
            "This PayPal order is not in an expected state."
        )

    purchase_units = paypal_order["purchase_units"]

    if len(purchase_units) != 1:
        raise ValueError(
            "Unexpected number of purchase units."
        )

    amount_details = purchase_units[0]["amount"]

    if amount_details.get("currency_code") != local_order["currency"]:
        raise ValueError("PayPal currency mismatch.")

    try:
        paypal_amount = Decimal(amount_details["value"])
        expected_amount = Decimal(local_order["expected_amount"])
    except (InvalidOperation, KeyError, TypeError):
        raise ValueError("Invalid PayPal amount.") from None

    if (
        not paypal_amount.is_finite()
        or paypal_amount != expected_amount
    ):
        raise ValueError("PayPal amount mismatch.")

    return {
        "order_id": order_id,
        "verified": True,
        "paypal_status": paypal_order["status"],
        "expected_amount": local_order["expected_amount"],
        "currency": local_order["currency"],
    }

def verify_order_ready_for_capture(order_id: str) -> dict:
    """
    Check that an Intentra order has been approved by
    the PayPal Sandbox buyer.

    This function does not capture the payment.
    """

    result = verify_sandbox_order(order_id)

    if result["paypal_status"] != "APPROVED":
        raise ValueError(
            "Buyer approval is required before payment capture."
        )

    if (
        result["expected_amount"] != "10.00"
        or result["currency"] != "EUR"
    ):
        raise ValueError(
            "Unexpected payment amount or currency."
        )

    return result
