
from decimal import Decimal, InvalidOperation

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from behavior_engine import analyze_behavior
from risk_engine import analyze_transaction
from paypal_client import create_sandbox_order
from payment_store import save_order, get_order
from checkout_sessions import (
    create_checkout_session,
    verify_checkout_session,
)
from payment_capture import process_sandbox_capture
from payment_capture import process_sandbox_capture
from ml_predictor import predict_transaction

# --------------------------------------------------
# PAYMENT CAPTURE FEATURE FLAG
# --------------------------------------------------

CAPTURE_ENABLED = False

app = FastAPI(
    title="Intentra API",
    description="Backend for the Intentra payment intelligence application",
    version="0.1.0",
)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class TransactionRequest(BaseModel):
    amount: str = Field(
        ...,
        description="Payment amount as a decimal string, e.g. 1200.00",
    )
    recent_transactions: int = Field(
        ...,
        ge=0,
        description="Number of recent transactions",
    )


class BehaviorRequest(BaseModel):
    amount: str = Field(
        ...,
        description="Current payment amount, e.g. 1200.00",
    )
    historical_amounts: list[str] = Field(
        ...,
        description="Previous payment amounts as decimal strings",
    )


class PayPalOrderRequest(BaseModel):
    amount: str = Field(
        ...,
        description="Sandbox payment amount in EUR, e.g. 10.00",
    )


class PayPalCaptureRequest(BaseModel):
    order_id: str = Field(
        ...,
        description="ID of a buyer-approved PayPal Sandbox order",
    )
    session_token: str = Field(
        ...,
        min_length=1,
        description="Temporary checkout authorization token",
    )


# --------------------------------------------------
# GENERAL ENDPOINTS
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to Intentra API!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Intentra Backend",
        "version": "0.1.0",
    }


# --------------------------------------------------
# TRANSACTION RISK ANALYSIS
# --------------------------------------------------

@app.post("/analyze")
def analyze_payment(request: TransactionRequest):
    try:
        return analyze_transaction(
            amount=request.amount,
            recent_transactions=request.recent_transactions,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error


# --------------------------------------------------
# BEHAVIORAL ANALYSIS
# --------------------------------------------------

@app.post("/analyze-behavior")
def analyze_payment_behavior(request: BehaviorRequest):
    try:
        return analyze_behavior(
            amount=request.amount,
            historical_amounts=request.historical_amounts,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error


# --------------------------------------------------
# PAYPAL SANDBOX - CREATE ORDER
# --------------------------------------------------

@app.post("/paypal/create-order")
def create_paypal_order(request: PayPalOrderRequest):
    try:
        requested_amount = Decimal(request.amount)

        if (
            not requested_amount.is_finite()
            or requested_amount != Decimal("10.00")
        ):
            raise ValueError("Invalid demo amount.")

    except (ValueError, InvalidOperation, TypeError):
        raise HTTPException(
            status_code=422,
            detail="This demo only supports a EUR 10.00 payment.",
        ) from None

    try:
        # Create a PayPal Sandbox order.
        order = create_sandbox_order("10.00")

        # Store the order in SQLite.
        save_order(
            order_id=order["order_id"],
            amount="10.00",
            currency="EUR",
        )

        # Associate the order with a temporary checkout token.
        token = create_checkout_session(order["order_id"])

        return {
            "order_id": order["order_id"],
            "status": order["status"],
            "session_token": token,
        }

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail="PayPal Sandbox order creation failed.",
        ) from None

    except (ValueError, KeyError):
        raise HTTPException(
            status_code=502,
            detail="Invalid PayPal Sandbox order response.",
        ) from None



# --------------------------------------------------
# PAYPAL SANDBOX - CAPTURE ORDER
# --------------------------------------------------

@app.post("/paypal/capture-order")
def capture_paypal_order(request: PayPalCaptureRequest):
    if not verify_checkout_session(
        request.order_id,
        request.session_token,
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired checkout session.",
        )

    # Integration remains disabled until API-level
    # capture tests and recovery checks are complete.
   
    if not CAPTURE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Sandbox capture is not enabled yet.",
        )

    try:
        return process_sandbox_capture(request.order_id)

    except ValueError:
        raise HTTPException(
            status_code=409,
            detail="Order cannot be captured.",
        ) from None

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail=(
                "Payment outcome could not be confirmed. "
                "Check order status before retrying."
            ),
        ) from None

# --------------------------------------------------
# PAYPAL SANDBOX - CHECK ORDER STATUS
# --------------------------------------------------

@app.post("/paypal/order-status")
def check_paypal_order_status(request: PayPalCaptureRequest):
    """
    Return the locally recorded status of an order.

    This endpoint does not contact PayPal or
    initiate a payment.
    """

    if not verify_checkout_session(
        request.order_id,
        request.session_token,
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired checkout session.",
        )

    order = get_order(request.order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    return {
        "order_id": order["order_id"],
        "status": order["status"],
        "amount": order["expected_amount"],
        "currency": order["currency"],
    }
# --------------------------------------------------
# INTENTRA AI - MACHINE LEARNING PREDICTION
# --------------------------------------------------

class MLPredictionRequest(BaseModel):
    transaction_type: str
    amount: float
    old_balance: float


@app.post("/ml/predict")
def predict_ml_risk(request: MLPredictionRequest):
    try:
        return predict_transaction(
            transaction_type=request.transaction_type,
            amount=request.amount,
            old_balance=request.old_balance,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from None

    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="Machine-learning model is unavailable.",
        ) from None