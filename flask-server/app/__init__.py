import os
from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS
from .routes.home_routes import home_routes
from .routes.auth import auth_routes 
from .models.stockRoute import stock_routes
from .routes.portfolio_routes import portfolio_routes
from dotenv import load_dotenv
load_dotenv()

def create_app():
        app = Flask(__name__, static_folder="../client/build", static_url_path="/")

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