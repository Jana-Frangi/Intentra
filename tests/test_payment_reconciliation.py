
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from payment_reconciliation import reconcile_sandbox_order


class PaymentReconciliationTests(unittest.TestCase):

    def setUp(self):
        self.order_id = "TESTORDER12345"

        self.local_order = {
            "order_id": self.order_id,
            "expected_amount": "10.00",
            "currency": "EUR",
            "status": "RECONCILE",
        }

        self.remote_order = {
            "order_id": self.order_id,
            "status": "COMPLETED",
            "captures": [
                {
                    "capture_id": "CAPTURE12345",
                    "status": "COMPLETED",
                    "amount": {
                        "currency_code": "EUR",
                        "value": "10.00",
                    },
                }
            ],
        }

    @patch("payment_reconciliation.update_order_status")
    @patch("payment_reconciliation.get_sandbox_order_details")
    @patch("payment_reconciliation.get_order")
    def test_successful_reconciliation(
        self, mock_get, mock_paypal, mock_update
    ):
        mock_get.return_value = self.local_order
        mock_paypal.return_value = self.remote_order

        result = reconcile_sandbox_order(self.order_id)

        self.assertEqual(result["status"], "COMPLETED")
        self.assertEqual(result["capture_id"], "CAPTURE12345")
        mock_update.assert_called_once_with(
            self.order_id, "COMPLETED"
        )

    @patch("payment_reconciliation.get_sandbox_order_details")
    @patch("payment_reconciliation.get_order")
    def test_unknown_order_rejected(
        self, mock_get, mock_paypal
    ):
        mock_get.return_value = None

        with self.assertRaises(ValueError):
            reconcile_sandbox_order(self.order_id)

        mock_paypal.assert_not_called()

    @patch("payment_reconciliation.update_order_status")
    @patch("payment_reconciliation.get_sandbox_order_details")
    @patch("payment_reconciliation.get_order")
    def test_no_capture_remains_uncertain(
        self, mock_get, mock_paypal, mock_update
    ):
        mock_get.return_value = self.local_order
        mock_paypal.return_value = {
            "order_id": self.order_id,
            "status": "APPROVED",
            "captures": [],
        }

        result = reconcile_sandbox_order(self.order_id)

        self.assertEqual(result["status"], "RECONCILE")
        mock_update.assert_not_called()

    @patch("payment_reconciliation.update_order_status")
    @patch("payment_reconciliation.get_sandbox_order_details")
    @patch("payment_reconciliation.get_order")
    def test_wrong_amount_rejected(
        self, mock_get, mock_paypal, mock_update
    ):
        mock_get.return_value = self.local_order

        mock_paypal.return_value = {
            **self.remote_order,
            "captures": [
                {
                    "capture_id": "CAPTURE12345",
                    "status": "COMPLETED",
                    "amount": {
                        "currency_code": "EUR",
                        "value": "25.00",
                    },
                }
            ],
        }

        with self.assertRaises(RuntimeError):
            reconcile_sandbox_order(self.order_id)

        mock_update.assert_not_called()

    @patch("payment_reconciliation.update_order_status")
    @patch("payment_reconciliation.get_sandbox_order_details")
    @patch("payment_reconciliation.get_order")
    def test_mismatched_order_rejected(
        self, mock_get, mock_paypal, mock_update
    ):
        mock_get.return_value = self.local_order
        mock_paypal.return_value = {
            **self.remote_order,
            "order_id": "DIFFERENTORDER123",
        }

        with self.assertRaises(RuntimeError):
            reconcile_sandbox_order(self.order_id)

        mock_update.assert_not_called()


if __name__ == "__main__":
    unittest.main()
