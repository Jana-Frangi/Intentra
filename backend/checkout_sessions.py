
import hashlib
import secrets
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone

from payment_store import DB_PATH


SESSION_LIFETIME = timedelta(minutes=30)


def initialize_checkout_sessions():
    """Create the checkout sessions table if needed."""

    with closing(sqlite3.connect(DB_PATH)) as connection:
        with connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS checkout_sessions (
                    order_id TEXT PRIMARY KEY,
                    token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (order_id)
                        REFERENCES paypal_orders(order_id)
                )
                """
            )


def create_checkout_session(order_id: str) -> str:
    """
    Create a temporary secret for an order.

    Only the token hash is stored in the database.
    The original token is returned to the caller.
    """

    token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    expires_at = (
        datetime.now(timezone.utc) + SESSION_LIFETIME
    ).isoformat()

    with closing(sqlite3.connect(DB_PATH)) as connection:
        with connection:
            connection.execute(
                """
                INSERT INTO checkout_sessions (
                    order_id,
                    token_hash,
                    expires_at
                )
                VALUES (?, ?, ?)
                """,
                (order_id, token_hash, expires_at),
            )

    return token


def verify_checkout_session(
    order_id: str,
    session_token: str,
) -> bool:
    """Verify the order token and its expiration."""

    if not order_id or not session_token:
        return False

    with closing(sqlite3.connect(DB_PATH)) as connection:
        row = connection.execute(
            """
            SELECT token_hash, expires_at
            FROM checkout_sessions
            WHERE order_id = ?
            """,
            (order_id,),
        ).fetchone()

    if row is None:
        return False

    stored_hash, expires_at = row

    try:
        expiration = datetime.fromisoformat(expires_at)
    except (TypeError, ValueError):
        return False

    if expiration.tzinfo is None:
        return False

    if datetime.now(timezone.utc) >= expiration:
        return False

    provided_hash = hashlib.sha256(
        session_token.encode("utf-8")
    ).hexdigest()

    return secrets.compare_digest(
        stored_hash,
        provided_hash,
    )


initialize_checkout_sessions()
