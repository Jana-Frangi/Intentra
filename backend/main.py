
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from risk_engine import analyze_transaction


app = FastAPI(
    title="Intentra API",
    description="Backend for the Intentra payment intelligence application",
    version="0.1.0",
)


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


@app.post("/analyze")
def analyze_payment(request: TransactionRequest):
    try:
        result = analyze_transaction(
            amount=request.amount,
            recent_transactions=request.recent_transactions,
        )
        return result

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error
