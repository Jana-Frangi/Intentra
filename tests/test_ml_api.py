
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestMLPredictionAPI(unittest.TestCase):

    @patch("main.predict_transaction")
    def test_valid_prediction(self, mock_predict):
        mock_predict.return_value = {
            "model_version": "3.0",
            "model_score": 0.85,
            "decision_threshold": 0.97,
            "flagged_for_review": False,
            "score_calibrated": False,
            "dataset": "PaySim",
        }

        response = client.post(
            "/ml/predict",
            json={
                "transaction_type": "TRANSFER",
                "amount": 150,
                "old_balance": 1000,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            response.json()["flagged_for_review"]
        )

    def test_missing_input(self):
        response = client.post(
            "/ml/predict",
            json={
                "transaction_type": "TRANSFER",
                "amount": 150,
            },
        )
        self.assertEqual(response.status_code, 422)

    @patch("main.predict_transaction")
    def test_invalid_input(self, mock_predict):
        mock_predict.side_effect = ValueError(
            "Unsupported transaction type."
        )

        response = client.post(
            "/ml/predict",
            json={
                "transaction_type": "UNKNOWN",
                "amount": 150,
                "old_balance": 1000,
            },
        )

        self.assertEqual(response.status_code, 422)

    @patch("main.predict_transaction")
    def test_model_unavailable(self, mock_predict):
        mock_predict.side_effect = RuntimeError(
            "Model missing."
        )

        response = client.post(
            "/ml/predict",
            json={
                "transaction_type": "TRANSFER",
                "amount": 150,
                "old_balance": 1000,
            },
        )

        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
