import sqlite3
import os
import sys

# Add the current directory to sys.path to allow importing from app.config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_db_path

# Set up connection to the database
filename = get_db_path()

def init_db():
    # Set up connection to the database
    db_dir = os.path.dirname(filename)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir)
            print(f"Created database directory: {db_dir}")
        except OSError as e:
            print(f"Error creating database directory {db_dir}: {e}")

    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    # Create user table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user (
            userID TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    """)

    # Create holdings table if not exists
    # Added company_name and purchase_date to match portfolio_routes.py
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
    
    print("Database initialized (user and holdings tables created).")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
