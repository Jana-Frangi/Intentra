
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
    """Only allow PayPal Sandbox connections."""

    if PAYPAL_ENVIRONMENT != "sandbox":
        raise RuntimeError(
            "Only PayPal Sandbox is supported."
        )

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError(
            "Missing PayPal credentials in backend/.env."
        )


def validate_order_id(order_id: str):
    """Validate the format of a PayPal order ID."""

    if (
        not isinstance(order_id, str)
        or not re.fullmatch(r"[A-Za-z0-9]{10,30}", order_id)
    ):
        raise ValueError("Invalid PayPal order ID.")


# --------------------------------------------------
# PAYPAL AUTHENTICATION
# --------------------------------------------------

def get_sandbox_access_token() -> str:
    """Obtain a temporary PayPal Sandbox access token."""

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

    except (KeyError, ValueError, TypeError):
        raise RuntimeError(
            "Invalid PayPal authentication response."
        ) from None


def check_paypal_connection() -> bool:
    """Check whether Sandbox authentication works."""

    return bool(get_sandbox_access_token())


# --------------------------------------------------
# CAPTURE RESPONSE PARSING
# --------------------------------------------------

def extract_captures(order_data: dict) -> list[dict]:
    """
    Extract capture records from a PayPal order response.

    Do not infer a successful capture from the order
    status alone.
    """

    captures = []

    for unit in order_data.get("purchase_units", []):
        payments = unit.get("payments") or {}

        for capture in payments.get("captures", []):
            captures.append(
                {
                    "capture_id": capture.get("id"),
                    "status": capture.get("status"),
                    "amount": capture.get("amount"),
                }
            )

    return captures


# --------------------------------------------------
# CREATE SANDBOX ORDER
# --------------------------------------------------

def create_sandbox_order(amount: str = "10.00") -> dict:
    """Create a PayPal Sandbox order without capturing it."""

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

    except (KeyError, ValueError, TypeError):
        raise RuntimeError(
            "Invalid PayPal order response."
        ) from None


# --------------------------------------------------
# GET SANDBOX ORDER DETAILS
# --------------------------------------------------

def get_sandbox_order_details(order_id: str) -> dict:
    """
    Read the current PayPal order status and any
    returned capture records.

    This function never captures a payment.
    """

    validate_order_id(order_id)

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
            "captures": extract_captures(details),
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal order lookup failed (HTTP {error.code})."
        ) from None

    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None

    except (KeyError, TypeError, ValueError, AttributeError):
        raise RuntimeError(
            "PayPal returned invalid order details."
        ) from None


# --------------------------------------------------
# CAPTURE SANDBOX ORDER
# --------------------------------------------------

def capture_sandbox_order(order_id: str) -> dict:
    """
    Capture a buyer-approved PayPal Sandbox order.

    Must only be called by the verified backend
    workflow after all authorization checks pass.
    """

    validate_order_id(order_id)

    access_token = get_sandbox_access_token()

    # Stable idempotency key for this order.
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

        return {
            "order_id": result.get("id"),
            "status": result.get("status"),
            "captures": extract_captures(result),
        }

    except HTTPError as error:
        raise RuntimeError(
            f"PayPal capture failed (HTTP {error.code})."
        ) from None

    except (URLError, TimeoutError):
        raise RuntimeError(
            "Could not reach PayPal Sandbox."
        ) from None

    except (KeyError, TypeError, ValueError, AttributeError):
        raise RuntimeError(
            "PayPal returned an invalid capture response."
        ) from None
