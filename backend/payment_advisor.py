
"""
Intentra - Payment Advice Evidence Engine

Creates structured, explainable findings from:
- Entered payment details
- Account-specific behavioral analysis
- Experimental PaySim ML screening

This module does not call an LLM, authorize payments,
detect fraud with certainty, or modify any database.

The structured result is designed to be used by
the future conversational AI advisor.
"""

import math
from typing import Any


SUPPORTED_TYPES = {
    "TRANSFER",
    "PAYMENT",
    "CASH_OUT",
    "CASH_IN",
    "DEBIT",
}

OUTGOING_TYPES = {
    "TRANSFER",
    "PAYMENT",
    "CASH_OUT",
    "DEBIT",
}

# PaySim's positive fraud examples are associated
# with these two synthetic transaction categories.
ML_RELEVANT_TYPES = {
    "TRANSFER",
    "CASH_OUT",
}


def create_payment_advice(
    transaction_type: str,
    amount: float,
    starting_balance: float,
    merchant_id: str,
    prediction: dict[str, Any] | None,
    behavior: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Produce grounded payment-advice evidence.

    prediction:
        Existing output of ml_predictor.predict_transaction()

    behavior:
        Existing output of
        behavioral_intelligence.analyze_customer_behavior()

    Both can be None if the corresponding service
    is unavailable.
    """

    if not isinstance(transaction_type, str):
        raise ValueError(
            "Transaction type must be text."
        )

    transaction_type = (
        transaction_type.strip().upper()
    )

    if transaction_type not in SUPPORTED_TYPES:
        raise ValueError(
            "Unsupported transaction type."
        )

    if (
        isinstance(amount, bool)
        or isinstance(starting_balance, bool)
        or not isinstance(amount, (int, float))
        or not isinstance(starting_balance, (int, float))
    ):
        raise ValueError(
            "Amount and balance must be numeric."
        )

    if not (
        math.isfinite(amount)
        and math.isfinite(starting_balance)
    ):
        raise ValueError(
            "Amount and balance must be finite."
        )

    if amount <= 0:
        raise ValueError(
            "Payment amount must be positive."
        )

    if starting_balance < 0:
        raise ValueError(
            "Starting balance cannot be negative."
        )

    if (
        not isinstance(merchant_id, str)
        or not merchant_id.strip()
    ):
        raise ValueError(
            "Recipient or merchant identifier is required."
        )

    findings = []
    recommendations = []
    limitations = []

    def add_finding(
        code: str,
        title: str,
        explanation: str,
        category: str,
    ):
        findings.append({
            "code": code,
            "title": title,
            "explanation": explanation,
            "category": category,
        })

    # ==========================================
    # 1. FUNDING FEASIBILITY
    # ==========================================

    funding_status = "NOT_APPLICABLE"

    if transaction_type in OUTGOING_TYPES:
        if amount > starting_balance:
            shortfall = amount - starting_balance

            funding_status = "VERIFY_FUNDING"

            add_finding(
                code="FUNDING_SHORTFALL",
                title="Check your funding source",
                explanation=(
                    "The proposed amount exceeds "
                    "the entered starting balance "
                    f"by {shortfall:,.2f} demo units. "
                    "If you are paying solely from "
                    "this balance, another funding "
                    "source or additional funds "
                    "may be necessary."
                ),
                category="funding",
            )

            recommendations.append(
                "Confirm which account or payment "
                "method will fund this transaction."
            )
        else:
            funding_status = (
                "WITHIN_ENTERED_BALANCE"
            )

    else:
        # CASH_IN represents incoming money in
        # our supported PaySim demonstration types.
        # A balance shortfall test does not apply.
        limitations.append(
            "For CASH_IN, the entered balance does "
            "not establish whether the incoming "
            "transfer can be completed."
        )

    # ==========================================
    # 2. ACCOUNT-SPECIFIC HISTORY
    # ==========================================

    history_available = False
    historical_median = None
    amount_ratio = None
    merchant_seen = None
    history_count = 0

    if isinstance(behavior, dict):
        raw_count = behavior.get(
            "history_count"
        )

        if (
            isinstance(raw_count, int)
            and not isinstance(raw_count, bool)
            and raw_count >= 0
        ):
            history_count = raw_count

        if (
            history_count >= 10
            and behavior.get("status")
            in {
                "REVIEW_SUGGESTED",
                "NO_BEHAVIORAL_ALERT",
            }
        ):
            history_available = True

    if history_available:
        raw_median = behavior.get(
            "median_previous_amount"
        )

        if (
            isinstance(raw_median, (int, float))
            and not isinstance(raw_median, bool)
            and math.isfinite(raw_median)
            and raw_median >= 0
        ):
            historical_median = float(
                raw_median
            )

        # Recompute the ratio from the proposed
        # payment and the validated median.
        if (
            historical_median is not None
            and historical_median > 0
        ):
            amount_ratio = (
                amount / historical_median
            )

            if amount_ratio >= 3:
                add_finding(
                    code="UNUSUAL_AMOUNT",
                    title=(
                        "Larger than your "
                        "recent transactions"
                    ),
                    explanation=(
                        "The proposed amount is "
                        f"approximately {amount_ratio:.1f} "
                        "times the median of your "
                        "recent synthetic transaction "
                        "history."
                    ),
                    category="behavior",
                )

                recommendations.append(
                    "Double-check the amount and "
                    "whether it matches your "
                    "intended purchase or transfer."
                )

        else:
            limitations.append(
                "The historical median could not "
                "be used for an amount comparison."
            )

        merchant_seen = behavior.get(
            "merchant_seen_in_recent_history"
        )

        if merchant_seen is False:
            add_finding(
                code="UNFAMILIAR_MERCHANT",
                title=(
                    "Merchant not found "
                    "in recent history"
                ),
                explanation=(
                    "The supplied merchant "
                    "identifier does not appear "
                    "in the recent transaction "
                    "sample. This alone does not "
                    "mean the merchant is unsafe."
                ),
                category="behavior",
            )

            recommendations.append(
                "Verify the recipient or merchant "
                "through a trusted channel."
            )

        elif merchant_seen is not True:
            limitations.append(
                "Merchant familiarity could not "
                "be determined."
            )

    else:
        limitations.append(
            "There is insufficient usable "
            "historical information for a "
            "personalized behavioral comparison."
        )

    # ==========================================
    # 3. EXPERIMENTAL MACHINE LEARNING
    # ==========================================

    ml_status = "UNAVAILABLE"

    if not isinstance(prediction, dict):
        limitations.append(
            "Experimental AI screening was "
            "unavailable for this assessment."
        )

    elif transaction_type not in ML_RELEVANT_TYPES:
        ml_status = "LIMITED_APPLICABILITY"

        limitations.append(
            "The PaySim dataset's labeled fraud "
            "examples are concentrated in "
            "TRANSFER and CASH_OUT. "
            f"A {transaction_type} screening "
            "result is not validated evidence "
            "that this payment is safe or unsafe."
        )

    elif (
        prediction.get(
            "flagged_for_review"
        ) is True
    ):
        ml_status = "FLAGGED"

        add_finding(
            code="ML_PATTERN_ALERT",
            title="AI pattern flagged for review",
            explanation=(
                "The experimental PaySim model "
                "flagged the supplied transaction "
                "features using its configured "
                "threshold. This is not proof "
                "of fraud."
            ),
            category="ai",
        )

        recommendations.append(
            "Review the transaction details "
            "and confirm the recipient before "
            "making your decision."
        )

    elif (
        prediction.get(
            "flagged_for_review"
        ) is False
    ):
        ml_status = "NOT_FLAGGED"

        limitations.append(
            "The experimental AI model did "
            "not trigger an alert. This does "
            "not guarantee payment safety."
        )

    else:
        limitations.append(
            "The AI screening response was "
            "incomplete or unrecognized."
        )

    # ==========================================
    # 4. STRUCTURED CONCLUSION
    # ==========================================

    if findings:
        status = "REVIEW_RECOMMENDED"
        headline = (
            "A few things deserve your attention"
        )

    elif (
        not history_available
        or ml_status in {
            "UNAVAILABLE",
            "LIMITED_APPLICABILITY",
        }
    ):
        status = "LIMITED_ASSESSMENT"
        headline = (
            "Some checks have limited information"
        )

    else:
        status = "NO_ADDITIONAL_ALERTS"
        headline = (
            "No additional alerts detected"
        )

    recommendations.append(
        "Confirm the payment details "
        "and recipient before proceeding."
    )

    # Remove repeated recommendations
    # without changing their order.
    recommendations = list(
        dict.fromkeys(recommendations)
    )

    return {
        "status": status,
        "headline": headline,
        "transaction": {
            "type": transaction_type,
            "amount": round(amount, 2),
            "starting_balance": round(
                starting_balance, 2
            ),
            "merchant_identifier": (
                merchant_id.strip()
            ),
        },
        "funding_status": funding_status,
        "history": {
            "available": history_available,
            "records_compared": history_count,
            "median_amount": historical_median,
            "amount_to_median_ratio": (
                round(amount_ratio, 2)
                if amount_ratio is not None
                else None
            ),
            "merchant_seen": merchant_seen,
        },
        "ml": {
            "status": ml_status,
            "experimental": True,
            "source": "PaySim",
        },
        "findings": findings,
        "recommendations": recommendations,
        "limitations": limitations,
        "disclaimer": (
            "Experimental payment advice using "
            "synthetic datasets. Results are "
            "not proof of fraud and do not "
            "guarantee safety. This system "
            "does not authorize, block, or "
            "capture payments."
        ),
    }
