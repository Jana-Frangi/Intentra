
from decimal import Decimal, InvalidOperation


def analyze_transaction(
    amount: str,
    recent_transactions: int
) -> dict:
    """
    Analyze a payment using deterministic business rules.

    Thresholds are illustrative and are not validated
    fraud-detection or compliance rules.
    """

    try:
        payment_amount = Decimal(amount)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("Invalid payment amount")

    if not payment_amount.is_finite():
        raise ValueError("Amount must be finite")

    if payment_amount <= 0:
        raise ValueError("Amount must be positive")

    if payment_amount.as_tuple().exponent < -2:
        raise ValueError("Amount cannot exceed two decimal places")

    if isinstance(recent_transactions, bool) or not isinstance(
        recent_transactions, int
    ):
        raise ValueError("Transaction count must be an integer")

    if recent_transactions < 0:
        raise ValueError("Transaction count cannot be negative")

    signals = []
    risk_score = 0

    if payment_amount >= Decimal("1000"):
        risk_score += 40
        signals.append("Large transaction amount")
    elif payment_amount >= Decimal("500"):
        risk_score += 20
        signals.append("Moderately large transaction")

    if recent_transactions >= 10:
        risk_score += 40
        signals.append("Very high transaction frequency")
    elif recent_transactions >= 5:
        risk_score += 20
        signals.append("Multiple recent transactions")

    risk_score = min(risk_score, 100)

    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 20:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "amount": str(payment_amount),
        "recent_transactions": recent_transactions,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "signals": signals,
        "disclaimer": (
            "Illustrative risk screening only. "
            "This does not establish fraud or compliance status."
        ),
    }
