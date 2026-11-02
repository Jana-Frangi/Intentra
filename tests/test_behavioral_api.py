
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app


class TestBehavioralAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.payload = {
            "customer_id": 0,
            "amount": 1500,
            "merchant_id": "DEMO_NEW_MERCHANT",
            "transaction_time": "2025-01-01T00:00",
        }

    @patch("main.analyze_customer_behavior")
    def test_success(self, mock_analyze):
        mock_analyze.return_value = {
            "customer_id": 0,
            "history_count": 100,
            "status": "REVIEW_SUGGESTED",
            "signals": [
                {"code": "UNUSUAL_AMOUNT", "message": "Unusual amount"}
            ],
        }

        response = self.client.post(
            "/behavior/analyze-history",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["status"],
            "REVIEW_SUGGESTED",
        )

    def test_missing_amount(self):
        payload = dict(self.payload)
        del payload["amount"]

        response = self.client.post(
            "/behavior/analyze-history",
            json=payload,
        )

        self.assertEqual(response.status_code, 422)

    @patch("main.analyze_customer_behavior")
    def test_invalid_amount(self, mock_analyze):
        mock_analyze.side_effect = ValueError(
            "Payment amount must be positive."
        )

        payload = dict(self.payload)
        payload["amount"] = -100

        response = self.client.post(
            "/behavior/analyze-history",
            json=payload,
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
