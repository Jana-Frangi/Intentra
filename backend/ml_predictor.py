
from functools import lru_cache
from pathlib import Path
import math

import joblib
import pandas as pd

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "ml"
    / "intentra_fraud_model_v3.joblib"
)


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.is_file():
        raise RuntimeError(
            "Trained ML model is missing. "
            "Run ml/train_model_v3.py first."
        )

    return joblib.load(MODEL_PATH)


def predict_transaction(
    transaction_type: str,
    amount: float,
    old_balance: float,
):
    allowed_types = {
        "PAYMENT",
        "TRANSFER",
        "CASH_OUT",
        "CASH_IN",
        "DEBIT",
    }

    if transaction_type not in allowed_types:
        raise ValueError("Unsupported transaction type.")

    if not all(
        math.isfinite(value)
        for value in (amount, old_balance)
    ):
        raise ValueError("Inputs must be finite numbers.")

    if amount <= 0 or old_balance < 0:
        raise ValueError(
            "Amount must be positive and balance nonnegative."
        )

    ratio = min(
        amount / max(old_balance, 1.0),
        10.0,
    )

    row = pd.DataFrame([{
        "type": transaction_type,
        "amount": amount,
        "oldbalanceOrg": old_balance,
        "amount_to_balance": ratio,
        "log_amount": math.log1p(amount),
        "log_balance": math.log1p(old_balance),
        "balance_is_zero": int(old_balance <= 0),
        "exceeds_balance": int(amount > old_balance),
        "full_balance_transfer": int(
            old_balance > 0
            and old_balance * 0.99 <= amount
            <= old_balance * 1.01
        ),
    }])

    bundle = load_model()
    model = bundle["model"]
    threshold = float(bundle["threshold"])

    score = float(
        model.predict_proba(
            row[bundle["features"]]
        )[0, 1]
    )

    return {
        "model_version": bundle["version"],
        "model_score": round(score, 6),
        "decision_threshold": round(threshold, 6),
        "flagged_for_review": score >= threshold,
        "score_calibrated": False,
        "dataset": "PaySim",
        "warning": (
            "Experimental score from synthetic data. "
            "Not a calibrated probability of real-world fraud."
        ),
    }
