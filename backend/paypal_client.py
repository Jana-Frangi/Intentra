
import os
import base64
import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv


# Load credentials from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_ENVIRONMENT = os.getenv("PAYPAL_ENVIRONMENT", "sandbox")


def check_paypal_connection() -> bool:
    """
    Verify PayPal Sandbox authentication.
    Never print credentials or access tokens.
    """

    if PAYPAL_ENVIRONMENT != "sandbox":
        raise RuntimeError(
            "Only PayPal Sandbox is supported in this prototype."
        )

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError(
            "Missing PayPal credentials in backend/.env."
        )

    credentials = (
        f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}"
    ).encode("utf-8")

    encoded_credentials = base64.b64encode(
        credentials
    ).decode("ascii")

    request = Request(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            result = json.load(response)

        return (
            isinstance(result.get("access_token"), str)
            and bool(result["access_token"])
        )

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal authentication failed (HTTP {error.code})."
        ) from None

    except URLError:
        raise RuntimeError(
            "Could not connect to PayPal Sandbox."
        ) from None

def create_sandbox_order(amount: str = "10.00") -> dict:
    """
    Create a PayPal Sandbox order.
    This does not approve or capture a payment.
    """

    if PAYPAL_ENVIRONMENT != "sandbox":
        raise RuntimeError("Only Sandbox is supported.")

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError("PayPal credentials are missing.")

    from decimal import Decimal, InvalidOperation

    try:
        value = Decimal(amount)
        if (
            not value.is_finite()
            or value <= 0
            or value.as_tuple().exponent < -2
        ):
            raise ValueError()
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError("Enter a valid positive amount.")

    credentials = base64.b64encode(
        f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode()
    ).decode()

    token_request = Request(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(token_request, timeout=15) as response:
            access_token = json.load(response)["access_token"]

        order_data = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": "EUR",
                        "value": format(value, ".2f"),
                    }
                }
            ],
        }

        order_request = Request(
            "https://api-m.sandbox.paypal.com/v2/checkout/orders",
            data=json.dumps(order_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "PayPal-Request-Id": __import__("uuid").uuid4().hex,
            },
            method="POST",
        )

        with urlopen(order_request, timeout=15) as response:
            result = json.load(response)

        return {
            "order_id": result["id"],
            "status": result["status"],
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal request failed (HTTP {error.code})."
        ) from None
    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None

def capture_sandbox_order(order_id: str) -> dict:
    """
    Capture a buyer-approved PayPal Sandbox order.
    Never use this function for unapproved orders.
    """
    import re
    import uuid

    if PAYPAL_ENVIRONMENT != "sandbox":
        raise RuntimeError("Only Sandbox is supported.")

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError("PayPal credentials are missing.")

    if not re.fullmatch(r"[A-Za-z0-9]{10,30}", order_id):
        raise ValueError("Invalid PayPal order ID.")

    credentials = base64.b64encode(
        f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode("utf-8")
    ).decode("ascii")

    token_request = Request(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urlopen(token_request, timeout=15) as response:
            access_token = json.load(response)["access_token"]

        capture_request = Request(
            f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture",
            data=b"{}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "PayPal-Request-Id": uuid.uuid4().hex,
            },
            method="POST",
        )

        with urlopen(capture_request, timeout=15) as response:
            result = json.load(response)

        captures = [
            capture
            for unit in result.get("purchase_units", [])
            for payment in [unit.get("payments", {})]
            for capture in payment.get("captures", [])
        ]

        return {
            "order_id": result.get("id"),
            "status": result.get("status"),
            "captures": [
                {
                    "capture_id": item.get("id"),
                    "status": item.get("status"),
                    "amount": item.get("amount"),
                }
                for item in captures
            ],
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal capture failed (HTTP {error.code})."
        ) from None
    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None
