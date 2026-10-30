
from decimal import Decimal

from order_verification import verify_order_ready_for_capture
from payment_store import (
    get_order,
    reserve_order_for_capture,
    update_order_status,
)
from paypal_client import capture_sandbox_order


def process_sandbox_capture(order_id: str) -> dict:
    """
    Coordinate an approved PayPal Sandbox capture.

    Prototype only. Additional session authorization
    is required before exposing this in a public app.
    """

    saved = get_order(order_id)

    if saved is None:
        raise ValueError("Unknown Intentra order.")

    if saved["status"] != "CREATED":
        raise ValueError(
            "This order is already being processed or completed."
        )

    # PayPal must confirm buyer approval before capture.
    verification = verify_order_ready_for_capture(order_id)

    if (
        Decimal(verification["expected_amount"]) != Decimal("10.00")
        or verification["currency"] != "EUR"
    ):
        raise ValueError("Unexpected order amount or currency.")

    # Only one request may reserve the order.
    if not reserve_order_for_capture(order_id):
        raise ValueError("This order is already being processed.")

    try:
        result = capture_sandbox_order(order_id)
    except RuntimeError:
        # A timeout or error may occur after PayPal processes
        # the capture. Do not reset the order to CREATED.
        update_order_status(order_id, "RECONCILE")
        raise RuntimeError(
            "Capture outcome uncertain. Reconciliation required."
        ) from None

    completed_captures = [
        capture
        for capture in result.get("captures", [])
        if (
            capture.get("status") == "COMPLETED"
            and capture.get("amount", {}).get("currency_code") == "EUR"
            and Decimal(
                capture.get("amount", {}).get("value", "0")
            ) == Decimal("10.00")
        )
    ]

    if (
        result.get("order_id") != order_id
        or result.get("status") != "COMPLETED"
        or len(completed_captures) != 1
    ):
        update_order_status(order_id, "RECONCILE")
        raise RuntimeError(
            "Unexpected capture result. Reconciliation required."
        )

    update_order_status(order_id, "COMPLETED")

    return {
        "order_id": order_id,
        "status": "COMPLETED",
        "capture_id": completed_captures[0]["capture_id"],
        "amount": "10.00",
        "currency": "EUR",
    }
