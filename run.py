import sys
import os

# Add flask-server to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'flask-server'))

from app import create_app

# Initialize the database before starting the app
try:
    from init_db import init_db
    init_db()
except ImportError:
    # Fallback if running from a different context, though sys.path should handle it
    print("Warning: Could not import init_db. Database might not be initialized.")
except Exception as e:
    print(f"Error initializing database: {e}")

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
