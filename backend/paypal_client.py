
import base64
import json
import os
import re
import uuid

from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


# --------------------------------------------------
# PAYPAL SANDBOX CONFIGURATION
# --------------------------------------------------

load_dotenv(Path(__file__).resolve().parent / ".env")

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_ENVIRONMENT = os.getenv(
    "PAYPAL_ENVIRONMENT",
    "sandbox",
)

PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"


def validate_sandbox_configuration():
    """Prevent accidental use of live PayPal credentials."""

    if PAYPAL_ENVIRONMENT != "sandbox":
        raise RuntimeError(
            "Only PayPal Sandbox is supported."
        )

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError(
            "Missing PayPal credentials in backend/.env."
        )


# --------------------------------------------------
# PAYPAL AUTHENTICATION
# --------------------------------------------------

def get_sandbox_access_token() -> str:
    """
    Obtain a temporary PayPal Sandbox OAuth token.

    Never print or expose the access token.
    """

    validate_sandbox_configuration()

    credentials = (
        f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}"
    ).encode("utf-8")

    encoded_credentials = base64.b64encode(
        credentials
    ).decode("ascii")

    request = Request(
        f"{PAYPAL_BASE_URL}/v1/oauth2/token",
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

        return result["access_token"]

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal authentication failed (HTTP {error.code})."
        ) from None

    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not connect to PayPal Sandbox."
        ) from None

    except (KeyError, ValueError):
        raise RuntimeError(
            "PayPal returned an invalid authentication response."
        ) from None


def check_paypal_connection() -> bool:
    """Check whether Sandbox authentication succeeds."""

    token = get_sandbox_access_token()
    return bool(token)


# --------------------------------------------------
# CREATE SANDBOX ORDER
# --------------------------------------------------

def create_sandbox_order(amount: str = "10.00") -> dict:
    """
    Create a PayPal Sandbox order.

    This does not approve or capture a payment.
    """

    try:
        value = Decimal(amount)

        if (
            not value.is_finite()
            or value <= 0
            or value.as_tuple().exponent < -2
        ):
            raise ValueError()

    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(
            "Enter a valid positive payment amount."
        ) from None

    access_token = get_sandbox_access_token()

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

    request = Request(
        f"{PAYPAL_BASE_URL}/v2/checkout/orders",
        data=json.dumps(order_data).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "PayPal-Request-Id": uuid.uuid4().hex,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            result = json.load(response)

        return {
            "order_id": result["id"],
            "status": result["status"],
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal order creation failed (HTTP {error.code})."
        ) from None

    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None

    except (KeyError, ValueError):
        raise RuntimeError(
            "PayPal returned an invalid order response."
        ) from None


# --------------------------------------------------
# GET SANDBOX ORDER DETAILS
# --------------------------------------------------

def get_sandbox_order_details(order_id: str) -> dict:
    """
    Retrieve PayPal order details.

    This operation is read-only.
    """

    if not re.fullmatch(r"[A-Za-z0-9]{10,30}", order_id):
        raise ValueError("Invalid PayPal order ID.")

    access_token = get_sandbox_access_token()

    request = Request(
        f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=15) as response:
            details = json.load(response)

        return {
            "order_id": details.get("id"),
            "status": details.get("status"),
            "intent": details.get("intent"),
            "purchase_units": [
                {
                    "amount": unit.get("amount", {})
                }
                for unit in details.get("purchase_units", [])
            ],
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal order lookup failed (HTTP {error.code})."
        ) from None

    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None

    except (KeyError, TypeError, ValueError):
        raise RuntimeError(
            "PayPal returned invalid order details."
        ) from None


# --------------------------------------------------
# CAPTURE SANDBOX ORDER
# --------------------------------------------------

def capture_sandbox_order(order_id: str) -> dict:
    """
    Capture a PayPal Sandbox order.

    Only call after the buyer has approved the order
    and the backend has completed its verification.

    The same order always uses the same idempotency key.
    """

    if not re.fullmatch(r"[A-Za-z0-9]{10,30}", order_id):
        raise ValueError("Invalid PayPal order ID.")

    access_token = get_sandbox_access_token()

    # Stable identifier for this specific order's capture.
    # Do not generate a fresh UUID on every retry.
    capture_request_id = str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"intentra-sandbox-capture:{order_id}",
        )
    )

    request = Request(
        (
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/"
            f"{order_id}/capture"
        ),
        data=b"{}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "PayPal-Request-Id": capture_request_id,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            result = json.load(response)

        captures = [
            capture
            for unit in result.get("purchase_units", [])
            for capture in unit.get("payments", {}).get(
                "captures", []
            )
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

    except (KeyError, TypeError, ValueError):
        raise RuntimeError(
            "PayPal returned an invalid capture response."
        ) from None
