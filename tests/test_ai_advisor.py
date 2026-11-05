
import io
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = (
    Path(__file__).resolve().parents[1]
    / "backend"
)

sys.path.insert(
    0,
    str(BACKEND_DIR),
)

from ai_advisor import (
    AIAdvisorUnavailable,
    generate_ai_reply,
)


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self, *args):
        import json
        return json.dumps(self.payload).encode("utf-8")


def api_error(status):
    return urllib.error.HTTPError(
        url="https://example.invalid",
        code=status,
        msg="Simulated error",
        hdrs={},
        fp=io.BytesIO(b"{}"),
    )


class TestAIAdvisor(unittest.TestCase):

    def setUp(self):
        self.evidence = {
            "demo_account": {
                "display_name": "Alex Morgan",
                "synthetic": True,
            },
            "advice": {
                "status": "REVIEW_RECOMMENDED",
            },
        }

        self.key_patch = patch.dict(
            os.environ,
            {
                "GEMINI_API_KEY": "test-key-not-real",
                "INTENTRA_GEMINI_MODEL":
                    "gemini-3.5-flash-lite",
            },
        )
        self.key_patch.start()
        self.addCleanup(self.key_patch.stop)

    def call_advisor(self):
        return generate_ai_reply(
            message="What should I check?",
            evidence=self.evidence,
            conversation=[],
        )

    def test_successful_response(self):
        response = FakeResponse({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": "Check your funding source."
                    }]
                }
            }]
        })

        with patch(
            "ai_advisor.urllib.request.urlopen",
            return_value=response,
        ) as request_mock:
            result = self.call_advisor()

        self.assertEqual(
            result["reply"],
            "Check your funding source.",
        )
        self.assertEqual(
            request_mock.call_count,
            1,
        )

    def test_503_retries_once_then_succeeds(self):
        response = FakeResponse({
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": "Review your payment details."
                    }]
                }
            }]
        })

        with patch(
            "ai_advisor.urllib.request.urlopen",
            side_effect=[
                api_error(503),
                response,
            ],
        ) as request_mock, patch(
            "ai_advisor.time.sleep"
        ) as sleep_mock:

            result = self.call_advisor()

        self.assertEqual(
            request_mock.call_count,
            2,
        )
        sleep_mock.assert_called_once_with(2)

        self.assertEqual(
            result["reply"],
            "Review your payment details.",
        )

    def test_two_503_errors_stop(self):
        with patch(
            "ai_advisor.urllib.request.urlopen",
            side_effect=[
                api_error(503),
                api_error(503),
            ],
        ) as request_mock, patch(
            "ai_advisor.time.sleep"
        ):

            with self.assertRaises(
                AIAdvisorUnavailable
            ):
                self.call_advisor()

        self.assertEqual(
            request_mock.call_count,
            2,
        )

    def test_429_does_not_retry(self):
        with patch(
            "ai_advisor.urllib.request.urlopen",
            side_effect=api_error(429),
        ) as request_mock, patch(
            "ai_advisor.time.sleep"
        ) as sleep_mock:

            with self.assertRaises(
                AIAdvisorUnavailable
            ):
                self.call_advisor()

        self.assertEqual(
            request_mock.call_count,
            1,
        )
        sleep_mock.assert_not_called()

    def test_empty_response_is_rejected(self):
        response = FakeResponse({
            "candidates": [{
                "content": {
                    "parts": []
                }
            }]
        })

        with patch(
            "ai_advisor.urllib.request.urlopen",
            return_value=response,
        ):
            with self.assertRaises(
                AIAdvisorUnavailable
            ):
                self.call_advisor()


if __name__ == "__main__":
    unittest.main()
