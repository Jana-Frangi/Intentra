
import sys
import unittest
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))


class PayPalClientTests(unittest.TestCase):

    def test_stable_capture_request_id(self):
        order_id = "TESTORDER12345"

        first_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"intentra-sandbox-capture:{order_id}",
            )
        )

        second_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"intentra-sandbox-capture:{order_id}",
            )
        )

        self.assertEqual(first_id, second_id)

    def test_different_orders_have_different_request_ids(self):
        first_order = "TESTORDER12345"
        second_order = "TESTORDER67890"

        first_id = uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"intentra-sandbox-capture:{first_order}",
        )

        second_id = uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"intentra-sandbox-capture:{second_order}",
        )

        self.assertNotEqual(first_id, second_id)


if __name__ == "__main__":
    unittest.main()
