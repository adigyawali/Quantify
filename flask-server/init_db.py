import sqlite3
import os

# Set up connection to the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
filename = os.path.join(BASE_DIR, "userInfo.db")

def init_db():
    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    # Create holdings table if not exists
    # id: unique id for the holding entry
    # user_id: the user who owns the stock (foreign key to user.userID)
    # ticker: stock symbol
    # quantity: number of shares
    # avg_price: average purchase price per share
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            ticker TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            avg_price REAL NOT NULL
        )
    """)
    
    print("Created holdings table.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
