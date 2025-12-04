#!/bin/bash

# Startup script for Azure App Service

# Navigate to the application directory
cd flask-server

# Run database initialization
# This will use the DATABASE_FILE_PATH environment variable if set
python init_db.py

# Start the Gunicorn server
# -w 4: Use 4 worker processes (adjust based on instance size)
# -b 0.0.0.0:8000: Bind to port 8000
# app:create_app(): Call the create_app factory function in app/__init__.py
gunicorn -w 1 -b 0.0.0.0:8000 "app:create_app()" --timeout 600
