
from decimal import Decimal, InvalidOperation

from order_verification import verify_order_ready_for_capture
from payment_store import (
    get_order,
    reserve_order_for_capture,
    update_order_status,
)
from paypal_client import capture_sandbox_order


EXPECTED_AMOUNT = Decimal("10.00")
EXPECTED_CURRENCY = "EUR"


def validate_capture_result(
    order_id: str,
    result: dict,
) -> str:
    """
    Validate the PayPal response and return its capture ID.

    A completed payment must contain exactly one
    completed capture for the expected amount and currency.
    """

    if not isinstance(result, dict):
        raise ValueError("Invalid capture response.")

    if result.get("order_id") != order_id:
        raise ValueError("Capture order ID mismatch.")

    if result.get("status") != "COMPLETED":
        raise ValueError("PayPal order is not completed.")

    captures = result.get("captures")

    if not isinstance(captures, list) or len(captures) != 1:
        raise ValueError(
            "Expected exactly one PayPal capture."
        )

    capture = captures[0]

    if not isinstance(capture, dict):
        raise ValueError("Invalid capture record.")

    capture_id = capture.get("capture_id")

    if not isinstance(capture_id, str) or not capture_id:
        raise ValueError("Missing PayPal capture ID.")

    if capture.get("status") != "COMPLETED":
        raise ValueError("Capture is not completed.")

    amount = capture.get("amount")

    if not isinstance(amount, dict):
        raise ValueError("Invalid capture amount.")

    if amount.get("currency_code") != EXPECTED_CURRENCY:
        raise ValueError("Unexpected capture currency.")

    try:
        actual_amount = Decimal(amount["value"])
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise ValueError("Invalid capture amount value.") from None

    if (
        not actual_amount.is_finite()
        or actual_amount != EXPECTED_AMOUNT
    ):
        raise ValueError("Unexpected capture amount.")

    return capture_id


def process_sandbox_capture(order_id: str) -> dict:
    """
    Coordinate a buyer-approved PayPal Sandbox capture.

    The FastAPI endpoint must verify the checkout
    session before calling this function.

    Any uncertain result requires reconciliation.
    """

    # --------------------------------------------------
    # 1. VERIFY LOCAL ORDER
    # --------------------------------------------------

    saved = get_order(order_id)

    if saved is None:
        raise ValueError("Unknown Intentra order.")

    if saved["status"] != "CREATED":
        raise ValueError(
            "This order is already being processed or completed."
        )

    try:
        local_amount = Decimal(saved["expected_amount"])
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise ValueError("Invalid stored order amount.") from None

    if (
        not local_amount.is_finite()
        or local_amount != EXPECTED_AMOUNT
        or saved.get("currency") != EXPECTED_CURRENCY
    ):
        raise ValueError(
            "Stored order amount or currency is invalid."
        )

    # --------------------------------------------------
    # 2. VERIFY BUYER APPROVAL
    # --------------------------------------------------

    verification = verify_order_ready_for_capture(order_id)

    if (
        not isinstance(verification, dict)
        or verification.get("verified") is not True
        or verification.get("paypal_status") != "APPROVED"
        or verification.get("currency") != EXPECTED_CURRENCY
    ):
        raise ValueError(
            "PayPal buyer approval could not be verified."
        )

    try:
        verified_amount = Decimal(
            verification["expected_amount"]
        )
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise ValueError(
            "Invalid verified order amount."
        ) from None

    if (
        not verified_amount.is_finite()
        or verified_amount != EXPECTED_AMOUNT
    ):
        raise ValueError(
            "Unexpected verified order amount."
        )

    # --------------------------------------------------
    # 3. ATOMICALLY RESERVE ORDER
    # --------------------------------------------------

    if not reserve_order_for_capture(order_id):
        raise ValueError(
            "This order is already being processed."
        )

    # --------------------------------------------------
    # 4. CAPTURE AND VALIDATE PAYPAL RESPONSE
    # --------------------------------------------------

    try:
        result = capture_sandbox_order(order_id)

        capture_id = validate_capture_result(
            order_id,
            result,
        )

    except Exception:
        # PayPal may have processed the payment even if
        # its response was lost or malformed.
        #
        # Never reset this order to CREATED.
        # Never automatically retry the capture.
        update_order_status(order_id, "RECONCILE")

        raise RuntimeError(
            "Capture outcome uncertain. Reconciliation required."
        ) from None


    # --------------------------------------------------
    # 5. RECORD CONFIRMED COMPLETION
    # --------------------------------------------------

    try:
        update_order_status(order_id, "COMPLETED")

    except Exception:
        # PayPal has already confirmed the capture,
        # but Intentra could not record completion.
        #
        # The order remains reserved as CAPTURING.
        # Do not retry the PayPal capture.

        raise RuntimeError(
            "PayPal capture succeeded, but local recording failed. "
            "Reconciliation required."
        ) from None

    return {
        "order_id": order_id,
        "status": "COMPLETED",
        "capture_id": capture_id,
        "amount": "10.00",
        "currency": "EUR",
    }
