
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
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "PS_20174392719_1491204439457_log.csv"
MODEL_PATH = ROOT / "ml" / "intentra_fraud_model.joblib"

COLUMNS = [
    "step",
    "type",
    "amount",
    "oldbalanceOrg",
    "isFraud",
]

FEATURES = [
    "type",
    "amount",
    "oldbalanceOrg",
]

RANDOM_SEED = 42

print("Reading transaction data...")
df = pd.read_csv(DATA_PATH, usecols=COLUMNS)

# Later simulated hours are reserved for testing.
split_hour = df["step"].quantile(0.80)

train = df.loc[df["step"] <= split_hour].copy()
test = df.loc[df["step"] > split_hour].copy()

# Sample legitimate transactions only in training.
fraud_train = train[train["isFraud"] == 1]
normal_train = train[train["isFraud"] == 0]

sample_size = min(len(normal_train), 150_000)
sampled_normal = normal_train.sample(
    n=sample_size,
    random_state=RANDOM_SEED,
)

train_sample = pd.concat(
    [fraud_train, sampled_normal],
    ignore_index=True,
).sample(frac=1, random_state=RANDOM_SEED)

print(f"Train sample: {len(train_sample):,}")
print(f"Test transactions: {len(test):,}")
print(f"Training fraud cases: {len(fraud_train):,}")
print(f"Test fraud cases: {int(test['isFraud'].sum()):,}")

preprocessing = ColumnTransformer(
    transformers=[
        (
            "transaction_type",
            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            ["type"],
        ),
        (
            "numeric",
            "passthrough",
            ["amount", "oldbalanceOrg"],
        ),
    ]
)

model = Pipeline(
    steps=[
        ("preprocessing", preprocessing),
        (
            "classifier",
            HistGradientBoostingClassifier(
                max_iter=120,
                max_leaf_nodes=15,
                learning_rate=0.08,
                random_state=RANDOM_SEED,
            ),
        ),
    ]
)

print("\nTraining Intentra ML model...")
model.fit(
    train_sample[FEATURES],
    train_sample["isFraud"],
)

print("\nEvaluating on untouched future-period data...")
probabilities = model.predict_proba(test[FEATURES])[:, 1]

# Fixed demonstration threshold, not optimized on test.
predictions = (probabilities >= 0.5).astype(int)

print("\nConfusion matrix:")
print(confusion_matrix(test["isFraud"], predictions))

print("\nClassification report:")
print(
    classification_report(
        test["isFraud"],
        predictions,
        zero_division=0,
    )
)

print(
    "Average precision:",
    round(
        average_precision_score(
            test["isFraud"], probabilities
        ),
        5,
    ),
)

print(
    "ROC AUC:",
    round(
        roc_auc_score(test["isFraud"], probabilities),
        5,
    ),
)

joblib.dump(
    {
        "model": model,
        "features": FEATURES,
        "training_dataset": "PaySim",
        "decision_threshold": 0.5,
    },
    MODEL_PATH,
)

print(f"\nModel saved to: {MODEL_PATH}")
