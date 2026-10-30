
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from behavior_engine import analyze_behavior


class BehaviorEngineTests(unittest.TestCase):

    def test_student_unusual_payment(self):
        result = analyze_behavior(
            "1200.00",
            ["35.00", "45.00", "40.00", "50.00", "30.00"]
        )

        self.assertEqual(result["status"], "analyzed")
        self.assertEqual(result["historical_median"], "40.00")
        self.assertEqual(result["amount_ratio"], 30.0)
        self.assertTrue(result["is_unusual"])

    def test_business_owner_normal_payment(self):
        result = analyze_behavior(
            "1200.00",
            ["1000.00", "1400.00", "1500.00", "1600.00", "1800.00"]
        )

        self.assertEqual(result["historical_median"], "1500.00")
        self.assertEqual(result["amount_ratio"], 0.8)
        self.assertFalse(result["is_unusual"])

    def test_insufficient_history(self):
        result = analyze_behavior(
            "100.00",
            ["40.00", "50.00"]
        )

        self.assertEqual(result["status"], "insufficient_history")
        self.assertIsNone(result["amount_ratio"])

    def test_exact_threshold(self):
        result = analyze_behavior(
            "150.00",
            ["40.00", "50.00", "60.00"]
        )

        self.assertEqual(result["amount_ratio"], 3.0)
        self.assertTrue(result["is_unusual"])

    def test_negative_payment(self):
        with self.assertRaises(ValueError):
            analyze_behavior(
                "-100.00",
                ["40.00", "50.00", "60.00"]
            )

    def test_invalid_history_amount(self):
        with self.assertRaises(ValueError):
            analyze_behavior(
                "100.00",
                ["40.00", "invalid", "60.00"]
            )

    def test_excess_decimal_places(self):
        with self.assertRaises(ValueError):
            analyze_behavior(
                "100.123",
                ["40.00", "50.00", "60.00"]
            )

    def test_nonfinite_history(self):
        with self.assertRaises(ValueError):
            analyze_behavior(
                "100.00",
                ["40.00", "NaN", "60.00"]
            )


if __name__ == "__main__":
    unittest.main()
