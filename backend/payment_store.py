
import sqlite3
from contextlib import closing
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "intentra.db"


def initialize_payment_store():
    """Create the PayPal orders table if it does not exist."""
    with closing(sqlite3.connect(DB_PATH)) as connection:
        with connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS paypal_orders (
                    order_id TEXT PRIMARY KEY,
                    expected_amount TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)


def save_order(order_id: str, amount: str, currency: str):
    """Record a newly created PayPal Sandbox order."""
    with closing(sqlite3.connect(DB_PATH)) as connection:
        with connection:
            connection.execute(
                """
                INSERT INTO paypal_orders
                    (order_id, expected_amount, currency, status)
                VALUES (?, ?, ?, ?)
                """,
                (order_id, amount, currency, "CREATED"),
            )


def get_order(order_id: str):
    """Retrieve an order from the database."""
    with closing(sqlite3.connect(DB_PATH)) as connection:
        connection.row_factory = sqlite3.Row

        row = connection.execute(
            """
            SELECT order_id, expected_amount, currency, status
            FROM paypal_orders
            WHERE order_id = ?
            """,
            (order_id,),
        ).fetchone()

        return dict(row) if row else None


def update_order_status(order_id: str, status: str):
    """Update the status of a saved order."""
    with closing(sqlite3.connect(DB_PATH)) as connection:
        with connection:
            connection.execute(
                """
                UPDATE paypal_orders
                SET status = ?
                WHERE order_id = ?
                """,
                (status, order_id),
            )


def reserve_order_for_capture(order_id: str) -> bool:
    """
    Atomically reserve a CREATED order for capture.

    Only one reservation attempt can succeed.
    """
    with closing(
        sqlite3.connect(DB_PATH, timeout=10)
    ) as connection:
        with connection:
            cursor = connection.execute(
                """
                UPDATE paypal_orders
                SET status = 'CAPTURING'
                WHERE order_id = ?
                  AND status = 'CREATED'
                """,
                (order_id,),
            )

            return cursor.rowcount == 1


initialize_payment_store()
