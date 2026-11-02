
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import payment_store


class PaymentRecoveryTests(unittest.TestCase):

    def test_interrupted_capture_requires_reconciliation(self):
        with tempfile.TemporaryDirectory() as directory:
            test_db = Path(directory) / "test_payments.db"

            with patch.object(payment_store, "DB_PATH", test_db):
                payment_store.initialize_payment_store()

                payment_store.save_order(
                    order_id="TESTORDER12345",
                    amount="10.00",
                    currency="EUR",
                )

                payment_store.update_order_status(
                    "TESTORDER12345",
                    "CAPTURING",
                )

                recovered = (
                    payment_store
                    .mark_interrupted_captures_for_reconciliation()
                )

                order = payment_store.get_order(
                    "TESTORDER12345"
                )

                self.assertEqual(recovered, 1)
                self.assertEqual(
                    order["status"],
                    "RECONCILE",
                )

    def test_created_order_is_not_modified(self):
        with tempfile.TemporaryDirectory() as directory:
            test_db = Path(directory) / "test_payments.db"

            with patch.object(payment_store, "DB_PATH", test_db):
                payment_store.initialize_payment_store()

                payment_store.save_order(
                    order_id="TESTORDER67890",
                    amount="10.00",
                    currency="EUR",
                )

                recovered = (
                    payment_store
                    .mark_interrupted_captures_for_reconciliation()
                )

                order = payment_store.get_order(
                    "TESTORDER67890"
                )

                self.assertEqual(recovered, 0)
                self.assertEqual(
                    order["status"],
                    "CREATED",
                )


if __name__ == "__main__":
    unittest.main()
