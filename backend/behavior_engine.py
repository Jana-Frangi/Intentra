
from decimal import Decimal, InvalidOperation
from statistics import median


def analyze_behavior(
    amount: str,
    historical_amounts: list[str]
) -> dict:
    """
    Compare a new payment against synthetic transaction history.
    This is illustrative behavior analysis, not fraud detection.
    """

    try:
        current_amount = Decimal(amount)

        history = [
            Decimal(value)
            for value in historical_amounts
        ]
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError("Invalid transaction amount.")

    values = [current_amount, *history]

    if any(
        not value.is_finite() or value <= 0
        for value in values
    ):
        raise ValueError(
            "All transaction amounts must be finite and positive."
        )

    if any(
        value.as_tuple().exponent < -2
        for value in values
    ):
        raise ValueError(
            "Amounts cannot have more than two decimal places."
        )

    if len(history) < 3:
        return {
            "status": "insufficient_history",
            "historical_median": None,
            "amount_ratio": None,
            "is_unusual": False,
            "message": "At least 3 historical transactions are required."
        }

    historical_median = median(history)
    amount_ratio = current_amount / historical_median

    is_unusual = amount_ratio >= Decimal("3")

    return {
        "status": "analyzed",
        "historical_median": str(historical_median),
        "amount_ratio": round(float(amount_ratio), 2),
        "is_unusual": is_unusual,
        "message": (
            "Payment is unusually large compared with past activity."
            if is_unusual
            else "Payment is within the illustrative behavior threshold."
        ),
    }
