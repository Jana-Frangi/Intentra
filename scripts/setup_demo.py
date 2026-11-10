
"""Initialize a fresh, fully synthetic Intentra demo database."""

import argparse
import sqlite3
from pathlib import Path

from create_demo_db import create_database


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "backend" / "intentra.db"


def setup_demo(path: Path):
    path = path.resolve()

    if path.exists():
        raise FileExistsError(
            f"Database already exists: {path}\n"
            "Existing databases are never overwritten."
        )

    # Generate fictional transaction history.
    create_database(path)

    try:
        with sqlite3.connect(path) as connection:
            connection.execute("""
                CREATE TABLE paypal_orders (
                    order_id TEXT PRIMARY KEY,
                    expected_amount TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                        DEFAULT CURRENT_TIMESTAMP
                )
            """)

            connection.execute("""
                CREATE TABLE checkout_sessions (
                    order_id TEXT PRIMARY KEY,
                    token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (order_id)
                        REFERENCES paypal_orders(order_id)
                )
            """)

            connection.commit()

            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master "
                    "WHERE type = 'table'"
                )
            }

            required = {
                "ibm_transactions",
                "paypal_orders",
                "checkout_sessions",
            }

            if not required.issubset(tables):
                raise RuntimeError(
                    "Demo database setup is incomplete."
                )

        print("\nIntentra demo database ready!")
        print(f"Location: {path}")
        print("Synthetic transactions: 450")
        print("Demo customers: 3")
        print("Payment tables: initialized")
        print("Existing payment records: none")

    except Exception:
        # Only remove the newly generated database.
        path.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="New database path; must not already exist",
    )

    args = parser.parse_args()

    setup_demo(args.output)
