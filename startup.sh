#!/bin/bash

# Startup script for Azure App Service

echo "Starting deployment script..."

# Navigate to the application directory
cd flask-server

# Run database initialization
echo "Initializing database..."
python init_db.py

# Start the Gunicorn server
echo "Starting Gunicorn..."
gunicorn -w 1 -b 0.0.0.0:8000 "app:create_app()" --timeout 600
