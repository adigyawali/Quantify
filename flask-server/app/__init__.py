import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file (if present)
# This should happen as early as possible
load_dotenv()

from flask import Flask, send_from_directory
from flask_cors import CORS
from .routes.home_routes import home_routes
from .routes.auth import auth_routes 
from .models.stockRoute import stock_routes
from .routes.portfolio_routes import portfolio_routes

def create_app():
        # Debugging: Print status of critical environment variables
        print(f"Starting app. FINNHUB_API_KEY present: {'Yes' if os.environ.get('FINNHUB_API_KEY') else 'No'}")
        print(f"Starting app. SECRET_KEY present: {'Yes' if os.environ.get('SECRET_KEY') else 'No'}")

        # Construct absolute path to client/build (relative to this file)
        base_dir = os.path.abspath(os.path.dirname(__file__))
        static_dir = os.path.join(base_dir, '../../client/build')

        app = Flask(__name__, static_folder=static_dir, static_url_path="/")

        # Serve React build
        @app.route("/")
        def serve_react():
            return send_from_directory(app.static_folder, "index.html")

        # Static files (JS, CSS, images)
        @app.route("/<path:path>")
        def serve_static(path):
            file_path = os.path.join(app.static_folder, path)
            if os.path.exists(file_path):
                return send_from_directory(app.static_folder, path)
            return send_from_directory(app.static_folder, "index.html")

        # Your API routes
        CORS(app)
        app.register_blueprint(home_routes)
        app.register_blueprint(auth_routes)
        app.register_blueprint(stock_routes)
        app.register_blueprint(portfolio_routes)

        return app