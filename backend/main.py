
from decimal import Decimal, InvalidOperation

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from behavior_engine import analyze_behavior
from risk_engine import analyze_transaction
from paypal_client import create_sandbox_order, capture_sandbox_order
from payment_store import save_order


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
# PAYPAL SANDBOX — CREATE ORDER
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

        # Create an order in PayPal Sandbox.
        order = create_sandbox_order("10.00")

        # Store the order in our local SQLite database.
        save_order(
            order_id=order["order_id"],
            amount="10.00",
            currency="EUR",
        )

        return order

    except (ValueError, InvalidOperation):
        raise HTTPException(
            status_code=422,
            detail="This demo only supports a EUR 10.00 payment.",
        ) from None

    except RuntimeError:
        raise HTTPException(
            status_code=502,
            detail="PayPal Sandbox order creation failed.",
        ) from None


# --------------------------------------------------
# PAYPAL SANDBOX — CAPTURE ORDER
# --------------------------------------------------

@app.post("/paypal/capture-order")
def capture_paypal_order(request: PayPalCaptureRequest):
    # This route is not enabled until server-side
    # order verification and replay protection are ready.
    raise HTTPException(
        status_code=503,
        detail="Sandbox capture is not enabled yet.",
    )
