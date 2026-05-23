import sqlite3
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_db_path

filename = get_db_path()


def _column_names(cursor, table: str) -> set:
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def init_db():
    db_dir = os.path.dirname(filename)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
            print(f"Created database directory: {db_dir}")
        except OSError as e:
            print(f"Error creating database directory {db_dir}: {e}")
            # Don't crash app boot — the connect() below will surface the real issue.

    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    # user table (preserving existing rows if present)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user (
            userID TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            email TEXT
        )
    """)

    # Migrate existing installations that pre-date the profile columns.
    existing = _column_names(cursor, "user")
    for col in ("first_name", "last_name", "email"):
        if col not in existing:
            cursor.execute(f"ALTER TABLE user ADD COLUMN {col} TEXT")
            print(f"Migrated user table: added {col}")

    # holdings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            ticker TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            avg_price REAL NOT NULL,
            company_name TEXT,
            purchase_date TEXT,
            FOREIGN KEY(user_id) REFERENCES user(userID)
        )
    """)

    print("Database initialized.")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
