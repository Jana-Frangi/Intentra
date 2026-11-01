
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from payment_capture import process_sandbox_capture


class PaymentCaptureTests(unittest.TestCase):

    def setUp(self):
        self.order_id = "TESTORDER12345"

        self.saved_order = {
            "order_id": self.order_id,
            "expected_amount": "10.00",
            "currency": "EUR",
            "status": "CREATED",
        }

        self.verification = {
            "order_id": self.order_id,
            "verified": True,
            "paypal_status": "APPROVED",
            "expected_amount": "10.00",
            "currency": "EUR",
        }

        self.capture_result = {
            "order_id": self.order_id,
            "status": "COMPLETED",
            "captures": [
                {
                    "capture_id": "TESTCAPTURE123",
                    "status": "COMPLETED",
                    "amount": {
                        "currency_code": "EUR",
                        "value": "10.00",
                    },
                }
            ],
        }

    @patch("payment_capture.update_order_status")
    @patch("payment_capture.capture_sandbox_order")
    @patch("payment_capture.reserve_order_for_capture")
    @patch("payment_capture.verify_order_ready_for_capture")
    @patch("payment_capture.get_order")
    def test_successful_capture(
        self, mock_get, mock_verify, mock_reserve,
        mock_capture, mock_update
    ):
        mock_get.return_value = self.saved_order
        mock_verify.return_value = self.verification
        mock_reserve.return_value = True
        mock_capture.return_value = self.capture_result

        result = process_sandbox_capture(self.order_id)

        self.assertEqual(result["status"], "COMPLETED")
        self.assertEqual(result["amount"], "10.00")
        mock_capture.assert_called_once_with(self.order_id)
        mock_update.assert_called_once_with(
            self.order_id, "COMPLETED"
        )

    @patch("payment_capture.get_order")
    @patch("payment_capture.capture_sandbox_order")
    def test_unknown_order_rejected(
        self, mock_capture, mock_get
    ):
        mock_get.return_value = None

        with self.assertRaises(ValueError):
            process_sandbox_capture(self.order_id)

        mock_capture.assert_not_called()

    @patch("payment_capture.get_order")
    @patch("payment_capture.capture_sandbox_order")
    def test_already_completed_order_rejected(
        self, mock_capture, mock_get
    ):
        mock_get.return_value = {
            **self.saved_order,
            "status": "COMPLETED",
        }

        with self.assertRaises(ValueError):
            process_sandbox_capture(self.order_id)

        mock_capture.assert_not_called()

    @patch("payment_capture.update_order_status")
    @patch("payment_capture.capture_sandbox_order")
    @patch("payment_capture.reserve_order_for_capture")
    @patch("payment_capture.verify_order_ready_for_capture")
    @patch("payment_capture.get_order")
    def test_capture_error_requires_reconciliation(
        self, mock_get, mock_verify, mock_reserve,
        mock_capture, mock_update
    ):
        mock_get.return_value = self.saved_order
        mock_verify.return_value = self.verification
        mock_reserve.return_value = True
        mock_capture.side_effect = RuntimeError(
            "Network failure"
        )

        with self.assertRaisesRegex(
            RuntimeError, "Reconciliation required"
        ):
            process_sandbox_capture(self.order_id)

        mock_update.assert_called_once_with(
            self.order_id, "RECONCILE"
        )

    @patch("payment_capture.update_order_status")
    @patch("payment_capture.capture_sandbox_order")
    @patch("payment_capture.reserve_order_for_capture")
    @patch("payment_capture.verify_order_ready_for_capture")
    @patch("payment_capture.get_order")
    def test_wrong_capture_amount_requires_reconciliation(
        self, mock_get, mock_verify, mock_reserve,
        mock_capture, mock_update
    ):
        mock_get.return_value = self.saved_order
        mock_verify.return_value = self.verification
        mock_reserve.return_value = True

        mock_capture.return_value = {
            **self.capture_result,
            "captures": [
                {
                    **self.capture_result["captures"][0],
                    "amount": {
                        "currency_code": "EUR",
                        "value": "25.00",
                    },
                }
            ],
        }

        with self.assertRaisesRegex(
            RuntimeError, "Reconciliation required"
        ):
            process_sandbox_capture(self.order_id)

        mock_update.assert_called_once_with(
            self.order_id, "RECONCILE"
        )

    @patch("payment_capture.update_order_status")
    @patch("payment_capture.capture_sandbox_order")
    @patch("payment_capture.reserve_order_for_capture")
    @patch("payment_capture.verify_order_ready_for_capture")
    @patch("payment_capture.get_order")
    def test_multiple_captures_require_reconciliation(
        self, mock_get, mock_verify, mock_reserve,
        mock_capture, mock_update
    ):
        mock_get.return_value = self.saved_order
        mock_verify.return_value = self.verification
        mock_reserve.return_value = True

        mock_capture.return_value = {
            **self.capture_result,
            "captures": self.capture_result["captures"] * 2,
        }

        with self.assertRaisesRegex(
            RuntimeError, "Reconciliation required"
        ):
            process_sandbox_capture(self.order_id)

        mock_update.assert_called_once_with(
            self.order_id, "RECONCILE"
        )

    @patch("payment_capture.update_order_status")
    @patch("payment_capture.capture_sandbox_order")
    @patch("payment_capture.reserve_order_for_capture")
    @patch("payment_capture.verify_order_ready_for_capture")
    @patch("payment_capture.get_order")
    def test_malformed_capture_requires_reconciliation(
        self, mock_get, mock_verify, mock_reserve,
        mock_capture, mock_update
    ):
        mock_get.return_value = self.saved_order
        mock_verify.return_value = self.verification
        mock_reserve.return_value = True

        mock_capture.return_value = {
            "order_id": self.order_id,
            "status": "COMPLETED",
            "captures": None,
        }

        with self.assertRaisesRegex(
            RuntimeError, "Reconciliation required"
        ):
            process_sandbox_capture(self.order_id)

        mock_update.assert_called_once_with(
            self.order_id, "RECONCILE"
        )


if __name__ == "__main__":
    unittest.main()
