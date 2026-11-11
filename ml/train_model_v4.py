
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ==========================================
# INTENTRA AI - MODEL V4
# ==========================================

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "PS_20174392719_1491204439457_log.csv"
MODEL_PATH = ROOT / "ml" / "intentra_fraud_model_v4.joblib"
REPORT_PATH = ROOT / "ml" / "model_v4_metrics.json"

SEED = 42

FEATURES = [
    "type",
    "amount",
    "oldbalanceOrg",
    "amount_to_balance",
    "log_amount",
    "log_balance",
    "balance_is_zero",
    "exceeds_balance",
]

NUMERIC_FEATURES = [
    feature for feature in FEATURES if feature != "type"
]


def make_features(frame):
    frame = frame.copy()

    amount = frame["amount"]
    balance = frame["oldbalanceOrg"]

    frame["amount_to_balance"] = (
        amount / np.maximum(balance, 1.0)
    ).clip(0, 10)

    frame["log_amount"] = np.log1p(amount)
    frame["log_balance"] = np.log1p(balance.clip(lower=0))

    frame["balance_is_zero"] = (
        balance <= 0
    ).astype("int8")

    frame["exceeds_balance"] = (
        amount > balance
    ).astype("int8")

    frame["full_balance_transfer"] = (
        (balance > 0)
        & (amount >= balance * 0.99)
        & (amount <= balance * 1.01)
    ).astype("int8")

    return frame


def build_model(max_iter, max_leaf_nodes, learning_rate):
    preprocessing = ColumnTransformer(
        transformers=[
            (
                "type",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                ["type"],
            ),
            (
                "numeric",
                "passthrough",
                NUMERIC_FEATURES,
            ),
        ]
    )

    return Pipeline([
        ("preprocessing", preprocessing),
        (
            "classifier",
            HistGradientBoostingClassifier(
                max_iter=max_iter,
                max_leaf_nodes=max_leaf_nodes,
                learning_rate=learning_rate,
                l2_regularization=1.0,
                random_state=SEED,
            ),
        ),
    ])


def choose_threshold(y_true, scores):
    precision, recall, thresholds = precision_recall_curve(
        y_true, scores
    )

    f1 = (
        2 * precision[:-1] * recall[:-1]
        / np.maximum(
            precision[:-1] + recall[:-1], 1e-12
        )
    )

    best_index = int(np.argmax(f1))

    return (
        float(thresholds[best_index]),
        float(f1[best_index]),
    )


print("\nINTENTRA AI - MODEL V4")
print("=" * 50)
print("Loading PaySim dataset...")

df = pd.read_csv(
    DATA_PATH,
    usecols=[
        "step",
        "type",
        "amount",
        "oldbalanceOrg",
        "isFraud",
    ],
    dtype={
        "step": "int32",
        "type": "category",
        "amount": "float32",
        "oldbalanceOrg": "float32",
        "isFraud": "int8",
    },
)

print(f"Transactions loaded: {len(df):,}")

print("\nEngineering transaction features...")
df = make_features(df)

# Use chronological boundaries.
# Model selection happens on validation only.
# The later test period remains untouched.

train_boundary = df["step"].quantile(0.64)
test_boundary = df["step"].quantile(0.80)

train = df[df["step"] <= train_boundary]
validation = df[
    (df["step"] > train_boundary)
    & (df["step"] <= test_boundary)
]
test = df[df["step"] > test_boundary]

print(f"Training period: {len(train):,}")
print(f"Validation period: {len(validation):,}")
print(f"Test period: {len(test):,}")

for name, subset in [
    ("Training", train),
    ("Validation", validation),
    ("Test", test),
]:
    fraud_count = int(subset["isFraud"].sum())
    print(f"{name} fraud cases: {fraud_count:,}")

    if subset["isFraud"].nunique() != 2:
        raise ValueError(
            f"{name} must contain both classes."
        )

# Sample legitimate training records only.
fraud_train = train[train["isFraud"] == 1]
normal_train = train[train["isFraud"] == 0]

normal_sample = normal_train.sample(
    n=min(150000, len(normal_train)),
    random_state=SEED,
)

train_sample = pd.concat(
    [fraud_train, normal_sample],
    ignore_index=True,
).sample(
    frac=1,
    random_state=SEED,
)

print(f"\nTraining sample: {len(train_sample):,}")


# ==========================================
# COMPARE TWO MODEL CONFIGURATIONS
# ==========================================

candidates = {
    "Balanced complexity": {
        "max_iter": 180,
        "max_leaf_nodes": 23,
        "learning_rate": 0.06,
    },
    "Higher complexity": {
        "max_iter": 250,
        "max_leaf_nodes": 31,
        "learning_rate": 0.04,
    },
}

results = []

for name, config in candidates.items():
    print(f"\nTraining: {name}")

    model = build_model(**config)

    model.fit(
        train_sample[FEATURES],
        train_sample["isFraud"],
    )

    scores = model.predict_proba(
        validation[FEATURES]
    )[:, 1]

    threshold, validation_f1 = choose_threshold(
        validation["isFraud"], scores
    )

    validation_ap = average_precision_score(
        validation["isFraud"], scores
    )

    print(f"Validation F1: {validation_f1:.4f}")
    print(f"Validation AP: {validation_ap:.5f}")
    print(f"Selected threshold: {threshold:.5f}")

    results.append({
        "name": name,
        "model": model,
        "threshold": threshold,
        "validation_f1": validation_f1,
        "validation_ap": float(validation_ap),
    })


# Choose using validation F1.
# AP breaks a tie.
winner = max(
    results,
    key=lambda item: (
        item["validation_f1"],
        item["validation_ap"],
    ),
)

print("\n" + "=" * 50)
print("SELECTED MODEL:", winner["name"])
print("=" * 50)


# ==========================================
# ONE FINAL EVALUATION
# ==========================================

print("\nEvaluating untouched test period...")

test_scores = winner["model"].predict_proba(
    test[FEATURES]
)[:, 1]

predictions = (
    test_scores >= winner["threshold"]
).astype(int)

matrix = confusion_matrix(
    test["isFraud"],
    predictions,
    labels=[0, 1],
)

tn, fp, fn, tp = matrix.ravel()

print("\nCONFUSION MATRIX")
print(matrix)

print("\nCLASSIFICATION REPORT")
print(
    classification_report(
        test["isFraud"],
        predictions,
        digits=4,
        zero_division=0,
    )
)

test_ap = average_precision_score(
    test["isFraud"], test_scores
)

test_auc = roc_auc_score(
    test["isFraud"], test_scores
)

print(f"Test average precision: {test_ap:.5f}")
print(f"Test ROC AUC: {test_auc:.5f}")

print(f"\nCorrect fraud alerts: {tp:,}")
print(f"Missed fraud cases: {fn:,}")
print(f"False alerts: {fp:,}")
print(f"Correct legitimate cases: {tn:,}")

joblib.dump(
    {
        "model": winner["model"],
        "features": FEATURES,
        "threshold": winner["threshold"],
        "version": "4.0",
        "dataset": "PaySim",
        "score_calibrated": False,
    },
    MODEL_PATH,
)

report = {
    "model_version": "4.0",
    "selected_configuration": winner["name"],
    "validation_f1": winner["validation_f1"],
    "validation_average_precision": winner["validation_ap"],
    "threshold": winner["threshold"],
    "test_average_precision": float(test_ap),
    "test_roc_auc": float(test_auc),
    "true_positives": int(tp),
    "false_positives": int(fp),
    "false_negatives": int(fn),
    "true_negatives": int(tn),
}

REPORT_PATH.write_text(
    json.dumps(report, indent=2),
    encoding="utf-8",
)

print("\nMODEL V4 SAVED SUCCESSFULLY")
print(MODEL_PATH)
print("\nMetrics saved to:")
print(REPORT_PATH)
print("\nScores are NOT calibrated fraud probabilities.")
