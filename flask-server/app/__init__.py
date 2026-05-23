import os
import logging
from dotenv import load_dotenv

# Load env as early as possible
load_dotenv()

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .routes.home_routes import home_routes
from .routes.auth import auth_routes
from .routes.stock_routes import stock_routes
from .routes.portfolio_routes import portfolio_routes
from .security import install_security_headers, allowed_origins


def _configure_logging():
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def create_app():
    _configure_logging()
    logger = logging.getLogger("tickr")

    # Boot-time sanity check on critical env vars.
    if not os.environ.get("FINNHUB_API_KEY"):
        logger.warning("FINNHUB_API_KEY not set — market data routes will degrade.")
    if not os.environ.get("SECRET_KEY"):
        logger.warning("SECRET_KEY not set — auth endpoints will refuse to issue tokens.")

    base_dir = os.path.abspath(os.path.dirname(__file__))
    static_dir = os.path.join(base_dir, "../../client/build")

    app = Flask(__name__, static_folder=static_dir, static_url_path="/")

    # CORS allowlist (env-driven). Prod must set ALLOWED_ORIGINS.
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins()}},
        supports_credentials=False,
        max_age=3600,
    )

    install_security_headers(app)

    # ── Static + SPA fallback ──
    @app.route("/")
    def serve_react():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/<path:path>")
    def serve_static(path):
        full = os.path.join(app.static_folder, path)
        if os.path.exists(full):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    # ── API routes ──
    app.register_blueprint(home_routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(stock_routes)
    app.register_blueprint(portfolio_routes)

    # ── Health check (used by load balancers / uptime monitors) ──
    @app.route("/healthz")
    def healthz():
        return jsonify({"status": "ok"}), 200

    # ── Unified error handler — never leak stack traces ──
    @app.errorhandler(Exception)
    def _on_error(err):
        from werkzeug.exceptions import HTTPException
        if isinstance(err, HTTPException):
            return jsonify({"message": err.description}), err.code
        logger.exception("Unhandled error: %s", err)
        return jsonify({"message": "Internal server error"}), 500

    return app
