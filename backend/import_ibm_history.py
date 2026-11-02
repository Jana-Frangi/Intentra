
import csv
import sqlite3
from collections import defaultdict
from contextlib import closing
from datetime import datetime
from pathlib import Path

from payment_store import DB_PATH

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = (
    ROOT
    / "data"
    / "ibm_tabformer"
    / "credit_card"
    / "card_transaction.v1.csv"
)

# A small set of demonstrator accounts.
DEMO_USERS = {0, 486, 396}

BATCH_SIZE = 1000


def initialize_table(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS ibm_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            card_id INTEGER NOT NULL,
            transaction_time TEXT NOT NULL,
            amount REAL NOT NULL,
            merchant_id TEXT NOT NULL,
            merchant_city TEXT,
            merchant_state TEXT,
            merchant_category INTEGER,
            is_fraud INTEGER NOT NULL
        )
        """
    )

    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_ibm_customer_time
        ON ibm_transactions(customer_id, transaction_time)
        """
    )


def parse_amount(value):
    return float(
        value.replace("$", "").replace(",", "").strip()
    )


def parse_timestamp(row):
    return datetime(
        int(row["Year"]),
        int(row["Month"]),
        int(row["Day"]),
        *map(int, row["Time"].split(":")),
    ).isoformat(timespec="minutes")


def import_transactions():
    if not CSV_PATH.is_file():
        raise FileNotFoundError(
            f"IBM dataset not found: {CSV_PATH}"
        )

    counts = defaultdict(int)

    with closing(sqlite3.connect(DB_PATH)) as connection:
        initialize_table(connection)

        # Safe to re-run for the selected demo accounts.
        placeholders = ",".join("?" for _ in DEMO_USERS)

        connection.execute(
            f"DELETE FROM ibm_transactions "
            f"WHERE customer_id IN ({placeholders})",
            tuple(sorted(DEMO_USERS)),
        )

        batch = []

        with CSV_PATH.open(
            "r",
            encoding="utf-8",
            newline="",
        ) as source:
            reader = csv.DictReader(source)

            for row in reader:
                customer_id = int(row["User"])

                if customer_id not in DEMO_USERS:
                    continue

                amount = parse_amount(row["Amount"])

                batch.append(
                    (
                        customer_id,
                        int(row["Card"]),
                        parse_timestamp(row),
                        amount,
                        str(row["Merchant Name"]),
                        row["Merchant City"],
                        row["Merchant State"],
                        int(row["MCC"]),
                        int(row["Is Fraud?"] == "Yes"),
                    )
                )

                counts[customer_id] += 1

                if len(batch) >= BATCH_SIZE:
                    connection.executemany(
                        """
                        INSERT INTO ibm_transactions (
                            customer_id,
                            card_id,
                            transaction_time,
                            amount,
                            merchant_id,
                            merchant_city,
                            merchant_state,
                            merchant_category,
                            is_fraud
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        batch,
                    )
                    batch.clear()

        if batch:
            connection.executemany(
                """
                INSERT INTO ibm_transactions (
                    customer_id,
                    card_id,
                    transaction_time,
                    amount,
                    merchant_id,
                    merchant_city,
                    merchant_state,
                    merchant_category,
                    is_fraud
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                batch,
            )

        connection.commit()

    print("\nINTENTRA - IBM HISTORY IMPORT COMPLETE")
    print("=" * 45)

    for user in sorted(DEMO_USERS):
        print(
            f"Customer {user}: "
            f"{counts[user]:,} transactions imported"
        )

    print(
        f"\nTotal imported: {sum(counts.values()):,}"
    )


if __name__ == "__main__":
    import_transactions()
