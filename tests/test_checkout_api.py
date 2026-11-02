
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from main import app


class CheckoutAPITests(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.order_id = "TESTORDER12345"

    @patch("main.verify_checkout_session", return_value=False)
    def test_invalid_session_returns_403(self, mock_verify):
        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "wrong-token",
            },
        )

        self.assertEqual(response.status_code, 403)
        mock_verify.assert_called_once_with(
            self.order_id, "wrong-token"
        )

    @patch("main.verify_checkout_session", return_value=True)
    def test_valid_session_capture_still_disabled(
        self, mock_verify
    ):
        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "valid-test-token",
            },
        )

        self.assertEqual(response.status_code, 503)
        mock_verify.assert_called_once()

    def test_missing_session_token_returns_422(self):
        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_empty_session_token_returns_422(self):
        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "",
            },
        )

        self.assertEqual(response.status_code, 422)

    @patch("main.process_sandbox_capture")
    @patch("main.verify_checkout_session", return_value=True)
    def test_capture_remains_disabled(
        self, mock_verify, mock_capture
    ):
        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "valid-test-token",
            },
        )

        self.assertEqual(response.status_code, 503)
        mock_verify.assert_called_once()
        mock_capture.assert_not_called()

    @patch("main.CAPTURE_ENABLED", True)
    @patch("main.process_sandbox_capture")
    @patch("main.verify_checkout_session", return_value=True)
    def test_authorized_capture_calls_coordinator(
        self, mock_verify, mock_capture
    ):
        mock_capture.return_value = {
            "order_id": self.order_id,
            "status": "COMPLETED",
            "capture_id": "MOCKCAPTURE123",
            "amount": "10.00",
            "currency": "EUR",
        }

        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "valid-test-token",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["status"],
            "COMPLETED",
        )

        mock_verify.assert_called_once()
        mock_capture.assert_called_once_with(
            self.order_id
        )

    @patch("main.CAPTURE_ENABLED", True)
    @patch("main.process_sandbox_capture")
    @patch("main.verify_checkout_session", return_value=True)
    def test_uncertain_capture_returns_502(
        self, mock_verify, mock_capture
    ):
        mock_capture.side_effect = RuntimeError(
            "Reconciliation required."
        )

        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "valid-test-token",
            },
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn(
            "Check order status",
            response.json()["detail"],
        )
        mock_capture.assert_called_once_with(self.order_id)

    @patch("main.CAPTURE_ENABLED", True)
    @patch("main.process_sandbox_capture")
    @patch("main.verify_checkout_session", return_value=True)
    def test_invalid_order_returns_409(
        self, mock_verify, mock_capture
    ):
        mock_capture.side_effect = ValueError(
            "Order already processed."
        )

        response = self.client.post(
            "/paypal/capture-order",
            json={
                "order_id": self.order_id,
                "session_token": "valid-test-token",
            },
        )

        self.assertEqual(response.status_code, 409)
        mock_capture.assert_called_once_with(self.order_id)


if __name__ == "__main__":
    unittest.main()
