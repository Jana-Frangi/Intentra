
import sqlite3
from contextlib import closing
from datetime import datetime
from statistics import median

from payment_store import DB_PATH


DEMO_CUSTOMERS = {0, 396, 486}


def get_customer_history(
    customer_id: int,
    limit: int = 20,
    before: str = "2025-01-01T00:00",
):
    """
    Read historical transactions for a synthetic
    IBM TabFormer customer.

    This function never modifies payment records.
    """

    if customer_id not in DEMO_CUSTOMERS:
        raise ValueError("Unknown demo customer.")

    if not 1 <= limit <= 100:
        raise ValueError(
            "Transaction limit must be between 1 and 100."
        )

    try:
        cutoff = datetime.fromisoformat(before)
    except (ValueError, TypeError):
        raise ValueError(
            "Invalid transaction cutoff date."
        ) from None

    if cutoff.tzinfo is not None:
        raise ValueError(
            "Use a timezone-naive demo date."
        )

    cutoff_text = cutoff.isoformat(timespec="minutes")

    with closing(sqlite3.connect(DB_PATH)) as connection:
        connection.row_factory = sqlite3.Row

        # Latest transaction records
        rows = connection.execute(
            """
            SELECT
                id,
                transaction_time,
                amount,
                merchant_id,
                merchant_city,
                merchant_state,
                merchant_category,
                is_fraud
            FROM ibm_transactions
            WHERE customer_id = ?
              AND transaction_time < ?
            ORDER BY transaction_time DESC, id DESC
            LIMIT ?
            """,
            (customer_id, cutoff_text, limit),
        ).fetchall()

        # Match the most recent 100 historical transactions
        # used by the behavioral-intelligence module.
        recent_rows = connection.execute(
            """
            SELECT amount, merchant_id
            FROM ibm_transactions
            WHERE customer_id = ?
              AND transaction_time < ?
            ORDER BY transaction_time DESC, id DESC
            LIMIT 100
            """,
            (customer_id, cutoff_text),
        ).fetchall()

        # Overall transaction count for the selected customer.
        total_count = connection.execute(
            """
            SELECT COUNT(*)
            FROM ibm_transactions
            WHERE customer_id = ?
              AND transaction_time < ?
            """,
            (customer_id, cutoff_text),
        ).fetchone()[0]

    amounts = [
        abs(float(row["amount"]))
        for row in recent_rows
    ]

    typical_amount = (
        round(median(amounts), 2)
        if amounts
        else None
    )

    average_amount = (
        round(sum(amounts) / len(amounts), 2)
        if amounts
        else None
    )

    unique_merchants = len({
        row["merchant_id"]
        for row in recent_rows
    })

    transactions = []

    for row in rows:
        transactions.append({
            "id": row["id"],
            "date": row["transaction_time"],
            "amount": round(float(row["amount"]), 2),
            "merchant_id": row["merchant_id"],
            "city": row["merchant_city"],
            "state": row["merchant_state"],
            "merchant_category": row["merchant_category"],
            "fraud_label": bool(row["is_fraud"]),
        })

    return {
        "customer_id": customer_id,
        "dataset": "IBM TabFormer",
        "synthetic_data": True,
        "before": cutoff_text,
        "total_historical_transactions": total_count,
        "recent_sample_size": len(recent_rows),
        "average_recent_amount": average_amount,
        "median_recent_amount": typical_amount,
        "unique_recent_merchants": unique_merchants,
        "transactions": transactions,
        "note": (
            "Synthetic credit-card transaction history. "
            "Statistics use absolute transaction amounts "
            "from up to 100 prior transactions. "
            "These are not live PayPal account records."
        ),
    }
