
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Import the backend verification functions.
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from order_verification import (
    verify_order_ready_for_capture,
    verify_sandbox_order,
)


class OrderVerificationTests(unittest.TestCase):

    def setUp(self):
        # Example of a valid, buyer-approved Sandbox order.
        self.valid_order = {
            "order_id": "TEST_ORDER_001",
            "verified": True,
            "paypal_status": "APPROVED",
            "expected_amount": "10.00",
            "currency": "EUR",
        }

    @patch("order_verification.verify_sandbox_order")
    def test_approved_order_is_accepted(self, mock_verify):
        mock_verify.return_value = self.valid_order

        result = verify_order_ready_for_capture(
            "TEST_ORDER_001"
        )

        self.assertEqual(
            result["paypal_status"],
            "APPROVED",
        )

    @patch("order_verification.verify_sandbox_order")
    def test_created_order_is_rejected(self, mock_verify):
        mock_verify.return_value = {
            **self.valid_order,
            "paypal_status": "CREATED",
        }

        with self.assertRaises(ValueError):
            verify_order_ready_for_capture("TEST_ORDER_001")

    @patch("order_verification.verify_sandbox_order")
    def test_wrong_amount_is_rejected(self, mock_verify):
        mock_verify.return_value = {
            **self.valid_order,
            "expected_amount": "25.00",
        }

        with self.assertRaises(ValueError):
            verify_order_ready_for_capture("TEST_ORDER_001")

    @patch("order_verification.verify_sandbox_order")
    def test_wrong_currency_is_rejected(self, mock_verify):
        mock_verify.return_value = {
            **self.valid_order,
            "currency": "USD",
        }

        with self.assertRaises(ValueError):
            verify_order_ready_for_capture("TEST_ORDER_001")

    @patch("order_verification.get_order")
    def test_unknown_local_order_is_rejected(self, mock_get_order):
        mock_get_order.return_value = None

        with self.assertRaisesRegex(
            ValueError,
            "not created by Intentra",
        ):
            verify_sandbox_order("UNKNOWN_ORDER")


if __name__ == "__main__":
    unittest.main()
