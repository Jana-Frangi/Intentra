
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from main import app


class OrderStatusAPITests(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.order_id = "TESTORDER12345"
        self.payload = {
            "order_id": self.order_id,
            "session_token": "test-session-token",
        }

        self.saved_order = {
            "order_id": self.order_id,
            "expected_amount": "10.00",
            "currency": "EUR",
            "status": "CREATED",
        }

    @patch("main.get_order")
    @patch("main.verify_checkout_session", return_value=True)
    def test_valid_session_returns_order_status(
        self, mock_verify, mock_get
    ):
        mock_get.return_value = self.saved_order

        response = self.client.post(
            "/paypal/order-status",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "CREATED")
        self.assertEqual(response.json()["amount"], "10.00")
        mock_verify.assert_called_once()
        mock_get.assert_called_once_with(self.order_id)

    @patch("main.get_order")
    @patch("main.verify_checkout_session", return_value=False)
    def test_invalid_session_returns_403(
        self, mock_verify, mock_get
    ):
        response = self.client.post(
            "/paypal/order-status",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 403)
        mock_get.assert_not_called()

    @patch("main.get_order", return_value=None)
    @patch("main.verify_checkout_session", return_value=True)
    def test_missing_order_returns_404(
        self, mock_verify, mock_get
    ):
        response = self.client.post(
            "/paypal/order-status",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 404)

    @patch("main.get_order")
    @patch("main.verify_checkout_session", return_value=True)
    def test_uncertain_status_is_reported(
        self, mock_verify, mock_get
    ):
        mock_get.return_value = {
            **self.saved_order,
            "status": "RECONCILE",
        }

        response = self.client.post(
            "/paypal/order-status",
            json=self.payload,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["status"],
            "RECONCILE",
        )


if __name__ == "__main__":
    unittest.main()
