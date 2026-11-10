
# Intentra Experimental ML Model

Model artifact: `intentra_fraud_model_v3.joblib`

This experimental fraud-screening model was trained using
the synthetic PaySim financial transaction dataset.

## Dataset attribution

Dataset: Synthetic Financial Datasets For Fraud Detection
Creator: Edgar Alonso Lopez-Rojas
Source: https://www.kaggle.com/datasets/ealaxi/paysim1
Dataset license: CC BY-SA 4.0
License: https://creativecommons.org/licenses/by-sa/4.0/

Reference:
Lopez-Rojas, E. A., Elmir, A., and Axelsson, S.
"PaySim: A Financial Mobile Money Simulator for Fraud
Detection." EMSS, 2016.

The model artifact is shared under CC BY-SA 4.0,
with attribution to the underlying dataset.

## Important limitations

- Trained on synthetic financial transactions.
- Not validated for real-world payment fraud detection.
- Model scores are not calibrated probabilities.
- Results are advisory only and do not block payments.
- A trained model may behave differently outside its
  training distribution.

Only load the model from a trusted source.
The joblib format relies on Python pickle serialization.
