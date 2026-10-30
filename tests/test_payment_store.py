
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Import the real payment store from the backend folder.
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import payment_store


class PaymentStoreTests(unittest.TestCase):

    def setUp(self):
        # Create a fresh temporary database for each test.
        self.temp_dir = tempfile.TemporaryDirectory()

        self.db_path = (
            Path(self.temp_dir.name) / "test_orders.db"
        )

        # Redirect database operations to the test database.
        self.db_patch = patch.object(
            payment_store,
            "DB_PATH",
            self.db_path,
        )

        self.db_patch.start()

        # Cleanup runs in reverse order.
        self.addCleanup(self.temp_dir.cleanup)
        self.addCleanup(self.db_patch.stop)

        payment_store.initialize_payment_store()

    def test_order_can_only_be_reserved_once(self):
        order_id = "TEST_ORDER_001"

        payment_store.save_order(
            order_id=order_id,
            amount="10.00",
            currency="EUR",
        )

        first_attempt = (
            payment_store.reserve_order_for_capture(order_id)
        )

        second_attempt = (
            payment_store.reserve_order_for_capture(order_id)
        )

        saved_order = payment_store.get_order(order_id)

        self.assertTrue(first_attempt)
        self.assertFalse(second_attempt)
        self.assertEqual(
            saved_order["status"],
            "CAPTURING",
        )

    def test_unknown_order_cannot_be_reserved(self):
        result = payment_store.reserve_order_for_capture(
            "UNKNOWN_ORDER"
        )

        self.assertFalse(result)

    def test_completed_order_cannot_be_reserved(self):
        order_id = "TEST_ORDER_002"

        payment_store.save_order(
            order_id=order_id,
            amount="10.00",
            currency="EUR",
        )

        payment_store.update_order_status(
            order_id,
            "COMPLETED",
        )

        result = payment_store.reserve_order_for_capture(
            order_id
        )

        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
