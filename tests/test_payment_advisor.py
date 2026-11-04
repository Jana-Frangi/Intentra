
import unittest

from payment_advisor import create_payment_advice


class TestPaymentAdvisor(unittest.TestCase):

    def make_behavior(
        self,
        median=100.0,
        merchant_seen=True,
        history_count=100,
    ):
        return {
            "status": "NO_BEHAVIORAL_ALERT",
            "history_count": history_count,
            "median_previous_amount": median,
            "merchant_seen_in_recent_history": merchant_seen,
        }

    def make_prediction(self, flagged=False):
        return {
            "flagged_for_review": flagged,
            "model_version": "v3",
        }

    def advise(
        self,
        transaction_type="TRANSFER",
        amount=100.0,
        balance=500.0,
        merchant="KNOWN_MERCHANT",
        prediction=None,
        behavior=None,
    ):
        return create_payment_advice(
            transaction_type=transaction_type,
            amount=amount,
            starting_balance=balance,
            merchant_id=merchant,
            prediction=(
                prediction
                if prediction is not None
                else self.make_prediction()
            ),
            behavior=(
                behavior
                if behavior is not None
                else self.make_behavior()
            ),
        )

    def test_normal_transfer(self):
        result = self.advise()

        self.assertEqual(
            result["funding_status"],
            "WITHIN_ENTERED_BALANCE",
        )
        self.assertEqual(
            result["ml"]["status"],
            "NOT_FLAGGED",
        )
        self.assertEqual(
            result["findings"],
            [],
        )

    def test_insufficient_funding(self):
        result = self.advise(
            amount=1000,
            balance=100,
            behavior=self.make_behavior(
                median=1000,
            ),
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertIn(
            "FUNDING_SHORTFALL",
            codes,
        )

        self.assertEqual(
            result["funding_status"],
            "VERIFY_FUNDING",
        )

    def test_unusual_amount(self):
        result = self.advise(
            amount=1500,
            balance=2000,
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertIn(
            "UNUSUAL_AMOUNT",
            codes,
        )

    def test_unfamiliar_merchant(self):
        result = self.advise(
            behavior=self.make_behavior(
                merchant_seen=False,
            ),
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertIn(
            "UNFAMILIAR_MERCHANT",
            codes,
        )

    def test_ml_flagged_transfer(self):
        result = self.advise(
            prediction=self.make_prediction(
                flagged=True,
            ),
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertIn(
            "ML_PATTERN_ALERT",
            codes,
        )

        self.assertEqual(
            result["ml"]["status"],
            "FLAGGED",
        )

    def test_debit_model_limitation(self):
        result = self.advise(
            transaction_type="DEBIT",
        )

        self.assertEqual(
            result["ml"]["status"],
            "LIMITED_APPLICABILITY",
        )

    def test_cash_in_has_no_funding_shortfall(self):
        result = self.advise(
            transaction_type="CASH_IN",
            amount=3000,
            balance=200,
            behavior=self.make_behavior(
                median=3000,
            ),
        )

        self.assertEqual(
            result["funding_status"],
            "NOT_APPLICABLE",
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertNotIn(
            "FUNDING_SHORTFALL",
            codes,
        )

    def test_insufficient_history(self):
        result = self.advise(
            behavior={
                "status": "INSUFFICIENT_HISTORY",
                "history_count": 0,
            },
        )

        self.assertFalse(
            result["history"]["available"]
        )

        self.assertEqual(
            result["status"],
            "LIMITED_ASSESSMENT",
        )

    def test_invalid_amount(self):
        with self.assertRaises(ValueError):
            self.advise(
                amount=-100,
            )

    def test_nonfinite_amount(self):
        with self.assertRaises(ValueError):
            self.advise(
                amount=float("nan"),
            )

    def test_unsupported_transaction_type(self):
        with self.assertRaises(ValueError):
            self.advise(
                transaction_type="UNKNOWN",
            )

    def test_original_problem_scenario(self):
        result = self.advise(
            transaction_type="DEBIT",
            amount=3000,
            balance=200,
            merchant="DEMO_NEW_MERCHANT",
            behavior=self.make_behavior(
                median=73.26,
                merchant_seen=False,
            ),
        )

        codes = {
            finding["code"]
            for finding in result["findings"]
        }

        self.assertEqual(
            result["status"],
            "REVIEW_RECOMMENDED",
        )

        self.assertEqual(
            codes,
            {
                "FUNDING_SHORTFALL",
                "UNUSUAL_AMOUNT",
                "UNFAMILIAR_MERCHANT",
            },
        )

        self.assertEqual(
            result["ml"]["status"],
            "LIMITED_APPLICABILITY",
        )


if __name__ == "__main__":
    unittest.main()
