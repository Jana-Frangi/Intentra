
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app


class TestCustomerHistoryAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("main.get_customer_history")
    def test_success(self, mock_history):
        mock_history.return_value = {
            "customer_id": 0,
            "dataset": "IBM TabFormer",
            "synthetic_data": True,
            "total_historical_transactions": 19963,
            "recent_sample_size": 100,
            "average_recent_amount": 89.76,
            "median_recent_amount": 73.26,
            "unique_recent_merchants": 35,
            "transactions": [
                {
                    "id": 1,
                    "date": "2020-02-28T07:36",
                    "amount": 41.05,
                    "merchant_id": "TEST_MERCHANT",
                    "city": "La Verne",
                    "state": "CA",
                    "merchant_category": 5912,
                    "fraud_label": False,
                }
            ],
        }

        response = self.client.get(
            "/history/customer/0?limit=5"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["customer_id"], 0
        )
        self.assertEqual(
            len(response.json()["transactions"]), 1
        )

    @patch("main.get_customer_history")
    def test_invalid_limit(self, mock_history):
        mock_history.side_effect = ValueError(
            "Transaction limit must be between 1 and 100."
        )

        response = self.client.get(
            "/history/customer/0?limit=200"
        )

        self.assertEqual(response.status_code, 422)

    @patch("main.get_customer_history")
    def test_unknown_customer(self, mock_history):
        mock_history.side_effect = ValueError(
            "Unknown demo customer."
        )

        response = self.client.get(
            "/history/customer/9999"
        )

        self.assertEqual(response.status_code, 422)

    def test_invalid_parameter_type(self):
        response = self.client.get(
            "/history/customer/not-a-number"
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
