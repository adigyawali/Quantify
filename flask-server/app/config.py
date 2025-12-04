import os

def get_db_path():
    """
    Returns the path to the SQLite database.
    Prioritizes the 'DATABASE_FILE_PATH' environment variable for production/Azure.
    Falls back to 'userInfo.db' in the flask-server directory for local development.
    """
    path = os.environ.get('DATABASE_FILE_PATH')
    if path:
        return path
    
    # Fallback to default location: flask-server/userInfo.db
    # This file is located in flask-server/app/config.py
    # So we go up two levels to reach flask-server/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "userInfo.db")
