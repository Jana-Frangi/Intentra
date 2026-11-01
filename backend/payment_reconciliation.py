
from decimal import Decimal, InvalidOperation

from payment_store import get_order, update_order_status
from paypal_client import get_sandbox_order_details


def reconcile_sandbox_order(order_id: str) -> dict:
    """
    Inspect an uncertain PayPal Sandbox payment.

    Never initiates another capture.
    Only confirms completion when PayPal reports
    exactly one completed capture for the expected amount.
    """

    local_order = get_order(order_id)

    if local_order is None:
        raise ValueError("Unknown Intentra order.")

    if local_order["status"] != "RECONCILE":
        raise ValueError(
            "Order is not awaiting reconciliation."
        )

    remote_order = get_sandbox_order_details(order_id)

    if remote_order.get("order_id") != order_id:
        raise RuntimeError(
            "PayPal returned a mismatched order."
        )

    captures = remote_order.get("captures", [])

    # Be conservative: an incomplete or unexpected
    # response must not be treated as a failed payment.
    if not isinstance(captures, list):
        raise RuntimeError(
            "Invalid PayPal capture records."
        )

    if (
        remote_order.get("status") != "COMPLETED"
        or len(captures) != 1
    ):
        return {
            "order_id": order_id,
            "status": "RECONCILE",
            "message": (
                "Payment outcome remains uncertain. "
                "Do not retry capture automatically."
            ),
        }

    capture = captures[0]

    amount = capture.get("amount")
    if not isinstance(amount, dict):
        raise RuntimeError(
            "Invalid PayPal capture amount."
        )

    try:
        actual_amount = Decimal(amount["value"])
        expected_amount = Decimal(
            local_order["expected_amount"]
        )
    except (
        KeyError,
        TypeError,
        InvalidOperation,
    ):
        raise RuntimeError(
            "Invalid payment amount in reconciliation."
        ) from None

    valid_capture = (
        capture.get("capture_id")
        and capture.get("status") == "COMPLETED"
        and amount.get("currency_code") == local_order["currency"]
        and actual_amount.is_finite()
        and actual_amount == expected_amount
    )

    if not valid_capture:
        raise RuntimeError(
            "Capture does not match the original order."
        )

    update_order_status(order_id, "COMPLETED")

    return {
        "order_id": order_id,
        "status": "COMPLETED",
        "capture_id": capture["capture_id"],
        "amount": str(actual_amount),
        "currency": local_order["currency"],
    }
