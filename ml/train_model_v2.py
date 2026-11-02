
from pathlib import Path

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


# =========================================
# INTENTRA - FRAUD MODEL V2
# =========================================

ROOT = Path(__file__).resolve().parents[1]

DATA_PATH = (
    ROOT
    / "data"
    / "PS_20174392719_1491204439457_log.csv"
)

MODEL_PATH = ROOT / "ml" / "intentra_fraud_model_v2.joblib"

SEED = 42

FEATURES = [
    "type",
    "amount",
    "oldbalanceOrg",
    "amount_to_balance",
    "log_amount",
    "balance_is_zero",
]


# =========================================
# 1. LOAD DATA
# =========================================

print("\nINTENTRA AI - MODEL V2")
print("=" * 45)
print("Loading PaySim transactions...")

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
        "amount": "float64",
        "oldbalanceOrg": "float64",
        "isFraud": "int8",
    },
)

print(f"Loaded {len(df):,} transactions")


# =========================================
# 2. ENGINEER PRE-TRANSACTION FEATURES
# =========================================

print("Engineering new features...")

df["amount_to_balance"] = (
    df["amount"]
    / np.maximum(df["oldbalanceOrg"], 1.0)
).clip(0, 10)

df["log_amount"] = np.log1p(df["amount"])

df["balance_is_zero"] = (
    df["oldbalanceOrg"] <= 0
).astype("int8")


# =========================================
# 3. CHRONOLOGICAL DATA SPLIT
# =========================================

print("Creating chronological data splits...")

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

print(
    "Training fraud:",
    int(train["isFraud"].sum()),
)

print(
    "Validation fraud:",
    int(validation["isFraud"].sum()),
)

print(
    "Test fraud:",
    int(test["isFraud"].sum()),
)

if (
    train["isFraud"].nunique() < 2
    or validation["isFraud"].nunique() < 2
    or test["isFraud"].nunique() < 2
):
    raise ValueError(
        "Each split must contain fraud and legitimate cases."
    )


# =========================================
# 4. SAMPLE TRAINING DATA
# =========================================

print("\nPreparing training sample...")

fraud_train = train[train["isFraud"] == 1]
normal_train = train[train["isFraud"] == 0]

normal_sample = normal_train.sample(
    n=min(150000, len(normal_train)),
    random_state=SEED,
)

train_sample = pd.concat(
    [fraud_train, normal_sample]
).sample(
    frac=1,
    random_state=SEED,
)

print(f"Training examples: {len(train_sample):,}")


# =========================================
# 5. BUILD MODEL
# =========================================

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
            [
                "amount",
                "oldbalanceOrg",
                "amount_to_balance",
                "log_amount",
                "balance_is_zero",
            ],
        ),
    ]
)

model = Pipeline([
    ("preprocessing", preprocessing),
    (
        "classifier",
        HistGradientBoostingClassifier(
            max_iter=180,
            max_leaf_nodes=23,
            learning_rate=0.06,
            l2_regularization=1.0,
            random_state=SEED,
        ),
    ),
])


# =========================================
# 6. TRAIN MODEL
# =========================================

print("\nTraining Intentra Model v2...")

model.fit(
    train_sample[FEATURES],
    train_sample["isFraud"],
)

print("Model training completed.")


# =========================================
# 7. VALIDATION AND THRESHOLD SELECTION
# =========================================

print("\nEvaluating validation period...")

validation_scores = model.predict_proba(
    validation[FEATURES]
)[:, 1]

precision, recall, thresholds = precision_recall_curve(
    validation["isFraud"],
    validation_scores,
)

# Threshold selection based on validation F1.
# The final point in precision/recall has no threshold.
f1 = (
    2 * precision[:-1] * recall[:-1]
    / np.maximum(
        precision[:-1] + recall[:-1],
        1e-12,
    )
)

best_index = int(np.argmax(f1))
best_threshold = float(thresholds[best_index])

print(f"Selected threshold: {best_threshold:.5f}")
print(f"Validation F1: {f1[best_index]:.4f}")
print(
    "Validation average precision:",
    round(
        average_precision_score(
            validation["isFraud"],
            validation_scores,
        ),
        5,
    ),
)


# =========================================
# 8. FINAL TEST
# =========================================

print("\nEvaluating untouched test period...")

test_scores = model.predict_proba(
    test[FEATURES]
)[:, 1]

test_predictions = (
    test_scores >= best_threshold
).astype(int)

print("\nCONFUSION MATRIX")
print(
    confusion_matrix(
        test["isFraud"],
        test_predictions,
    )
)

print("\nCLASSIFICATION REPORT")
print(
    classification_report(
        test["isFraud"],
        test_predictions,
        digits=4,
        zero_division=0,
    )
)

print(
    "Test average precision:",
    round(
        average_precision_score(
            test["isFraud"],
            test_scores,
        ),
        5,
    ),
)

print(
    "Test ROC AUC:",
    round(
        roc_auc_score(
            test["isFraud"],
            test_scores,
        ),
        5,
    ),
)


# =========================================
# 9. SAVE MODEL
# =========================================

joblib.dump(
    {
        "model": model,
        "features": FEATURES,
        "threshold": best_threshold,
        "model_version": "2.0",
        "dataset": "PaySim",
        "score_calibrated": False,
    },
    MODEL_PATH,
)

print("\nMODEL V2 SAVED")
print(MODEL_PATH)
print("\nIMPORTANT: Scores are not calibrated fraud probabilities.")
