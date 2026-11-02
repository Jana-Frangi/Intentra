
import math
import sqlite3
from contextlib import closing

from payment_store import DB_PATH


def analyze_customer_behavior(
    customer_id: int,
    amount: float,
    merchant_id: str,
    transaction_time: str,
):
    """
    Compare a proposed payment with earlier
    transactions from the same synthetic customer.

    This does not predict fraud or modify payments.
    """

    if not math.isfinite(amount) or amount <= 0:
        raise ValueError("Payment amount must be positive.")

    if not merchant_id.strip():
        raise ValueError("Merchant ID is required.")

    with closing(sqlite3.connect(DB_PATH)) as connection:
        history = connection.execute(
            """
            SELECT amount, merchant_id
            FROM ibm_transactions
            WHERE customer_id = ?
              AND transaction_time < ?
            ORDER BY transaction_time DESC, id DESC
            LIMIT 100
            """,
            (customer_id, transaction_time),
        ).fetchall()

    if not history:
        return {
            "customer_id": customer_id,
            "history_count": 0,
            "status": "INSUFFICIENT_HISTORY",
            "message": (
                "Not enough previous transactions "
                "to evaluate spending behavior."
            ),
        }

    historical_amounts = [
        abs(float(row[0]))
        for row in history
    ]

    avg_amount = sum(historical_amounts) / len(
        historical_amounts
    )

    sorted_amounts = sorted(historical_amounts)
    middle = len(sorted_amounts) // 2

    if len(sorted_amounts) % 2:
        median_amount = sorted_amounts[middle]
    else:
        median_amount = (
            sorted_amounts[middle - 1]
            + sorted_amounts[middle]
        ) / 2

    merchant_seen = any(
        row[1] == merchant_id
        for row in history
    )

    amount_ratio = (
        amount / median_amount
        if median_amount > 0
        else None
    )

    unusually_large = (
        len(history) >= 10
        and amount_ratio is not None
        and amount_ratio >= 3
    )

    signals = []

    if unusually_large:
        signals.append({
            "code": "UNUSUAL_AMOUNT",
            "message": (
                "This amount is at least three times "
                "the median of the customer's recent "
                "100 transactions."
            ),
        })

    if len(history) >= 10 and not merchant_seen:
        signals.append({
            "code": "UNFAMILIAR_MERCHANT",
            "message": (
                "This merchant does not appear in "
                "the customer's 100 most recent "
                "transactions."
            ),
        })

    return {
        "customer_id": customer_id,
        "history_count": len(history),
        "status": (
            "REVIEW_SUGGESTED"
            if signals
            else "NO_BEHAVIORAL_ALERT"
        ),
        "average_previous_amount": round(
            avg_amount, 2
        ),
        "median_previous_amount": round(
            median_amount, 2
        ),
        "amount_to_median_ratio": (
            round(amount_ratio, 2)
            if amount_ratio is not None
            else None
        ),
        "merchant_seen_in_recent_history": merchant_seen,
        "signals": signals,
        "dataset": "IBM TabFormer",
        "note": (
            "Experimental behavioral comparison "
            "using synthetic historical transactions. "
            "Not proof of fraud."
        ),
    }

