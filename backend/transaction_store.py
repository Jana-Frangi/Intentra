
import sqlite3
from contextlib import closing

from payment_store import DB_PATH


def initialize_transaction_store():
    """
    Create a separate table for synthetic
    PaySim transaction histories.

    Existing PayPal tables are not modified.
    """

    with closing(sqlite3.connect(DB_PATH)) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS paysim_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step INTEGER NOT NULL,
                transaction_type TEXT NOT NULL,
                amount REAL NOT NULL,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                old_balance REAL NOT NULL,
                new_balance REAL NOT NULL,
                is_fraud INTEGER NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_paysim_sender_step
            ON paysim_transactions(sender_id, step)
            """
        )

        connection.commit()


if __name__ == "__main__":
    initialize_transaction_store()
    print("PaySim transaction-history table initialized.")
