
import sys
import unittest
from pathlib import Path

# Allow the tests to import the backend's risk engine.
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from risk_engine import analyze_transaction


class RiskEngineTests(unittest.TestCase):

    def test_normal_transaction(self):
        result = analyze_transaction("50.00", 1)
        self.assertEqual(result["risk_score"], 0)
        self.assertEqual(result["risk_level"], "low")

    def test_moderate_amount(self):
        result = analyze_transaction("600.00", 1)
        self.assertEqual(result["risk_score"], 20)
        self.assertEqual(result["risk_level"], "moderate")

    def test_high_transaction_frequency(self):
        result = analyze_transaction("50.00", 12)
        self.assertEqual(result["risk_score"], 40)
        self.assertEqual(result["risk_level"], "moderate")

    def test_combined_risk(self):
        result = analyze_transaction("1200.00", 6)
        self.assertEqual(result["risk_score"], 60)
        self.assertEqual(result["risk_level"], "high")

    def test_invalid_negative_amount(self):
        with self.assertRaises(ValueError):
            analyze_transaction("-50.00", 2)

    def test_invalid_transaction_count(self):
        with self.assertRaises(ValueError):
            analyze_transaction("50.00", -3)

    def test_rejects_excess_decimal_places(self):
        with self.assertRaises(ValueError):
            analyze_transaction("50.123", 1)

    def test_rejects_nonfinite_amount(self):
        with self.assertRaises(ValueError):
            analyze_transaction("NaN", 1)


if __name__ == "__main__":
    unittest.main()
