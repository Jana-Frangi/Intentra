
"""Generate a standalone synthetic database for the Intentra demo.

Requires only Python's standard library.
Does not read or redistribute the original research datasets.
Never overwrites an existing database.
"""

import argparse
import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "backend" / "intentra.db"

CUSTOMERS = {
    0: {"typical_amount": 75, "card_id": 100},
    396: {"typical_amount": 185, "card_id": 396},
    486: {"typical_amount": 48, "card_id": 486},
}

MERCHANTS = [
    ("CAMPUS_CAFE", "Torino", "TO", 5812),
    ("GROCERY_MARKET", "Torino", "TO", 5411),
    ("CITY_TRANSPORT", "Torino", "TO", 4111),
    ("BOOKS_AND_MORE", "Torino", "TO", 5942),
    ("LOCAL_RESTAURANT", "Torino", "TO", 5812),
    ("ELECTRONICS_STORE", "Milano", "MI", 5732),
]


def create_database(path: Path) -> None:
    if path.exists():
        raise FileExistsError(
            f"Database already exists: {path}\n"
            "Refusing to overwrite existing data."
        )

    path.parent.mkdir(parents=True, exist_ok=True)

    rng = random.Random(20261110)
    connection = sqlite3.connect(path)

    try:
        with connection:
            connection.execute("""
                CREATE TABLE ibm_transactions (
                    id INTEGER PRIMARY KEY,
                    customer_id INTEGER NOT NULL,
                    card_id INTEGER,
                    transaction_time TEXT NOT NULL,
                    amount REAL NOT NULL,
                    merchant_id TEXT,
                    merchant_city TEXT,
                    merchant_state TEXT,
                    merchant_category INTEGER,
                    is_fraud INTEGER NOT NULL DEFAULT 0
                )
            """)

            rows = []
            transaction_id = 1

            for customer_id, profile in CUSTOMERS.items():
                for i in range(150):
                    merchant = rng.choice(MERCHANTS)

                    typical = profile["typical_amount"]

                    amount = round(
                        max(
                            3.0,
                            rng.lognormvariate(
                                0,
                                0.45
                            ) * typical * 0.85
                        ),
                        2
                    )

                    timestamp = (
                        datetime(2024, 9, 1)
                        + timedelta(
                            days=i,
                            hours=rng.randrange(0, 24),
                            minutes=rng.randrange(0, 60),
                        )
                    ).isoformat(timespec="minutes")

                    rows.append((
                        transaction_id,
                        customer_id,
                        profile["card_id"],
                        timestamp,
                        amount,
                        merchant[0],
                        merchant[1],
                        merchant[2],
                        merchant[3],
                        0,
                    ))

                    transaction_id += 1

            connection.executemany("""
                INSERT INTO ibm_transactions (
                    id, customer_id, card_id,
                    transaction_time, amount,
                    merchant_id, merchant_city,
                    merchant_state, merchant_category,
                    is_fraud
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, rows)

            connection.execute("""
                CREATE INDEX idx_demo_customer_history
                ON ibm_transactions (
                    customer_id,
                    transaction_time DESC,
                    id DESC
                )
            """)

        print(f"Created synthetic demo database: {path}")
        print(f"Transactions: {len(rows)}")
        print(f"Customers: {len(CUSTOMERS)}")
        print("All generated records are fictional.")

    except Exception:
        connection.close()
        path.unlink(missing_ok=True)
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DB,
        help="SQLite output path (must not exist)",
    )
    arguments = parser.parse_args()

    create_database(arguments.output.resolve())
