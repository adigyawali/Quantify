import os
import logging
import threading
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


def _prewarm_finbert():
    """Load FinBERT weights off the request path so the first user request
    doesn't pay the 30-60s cold-start cost."""
    logger = logging.getLogger("tickr.warmup")
    try:
        from .ai.sentiment import _ensure_loaded
        _ensure_loaded()
        logger.info("FinBERT pre-warmed.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("FinBERT pre-warm failed (will retry on first request): %s", exc)


def create_app():
    _configure_logging()
    logger = logging.getLogger("tickr")

    # Boot-time sanity check on critical env vars.
    if not os.environ.get("FINNHUB_API_KEY"):
        logger.warning("FINNHUB_API_KEY not set — market data routes will degrade.")
    if not os.environ.get("SECRET_KEY"):
        logger.warning("SECRET_KEY not set — auth endpoints will refuse to issue tokens.")

    base_dir = os.path.abspath(os.path.dirname(__file__))
    build_dir = os.path.join(base_dir, "../../client/build")
    # CRA emits hashed JS/CSS to build/static/. Point Flask's built-in static
    # handler at exactly that folder so /static/js/main.<hash>.js resolves to
    # build/static/js/main.<hash>.js — and so the handler ONLY answers /static/*.
    # Every other root path (/, /favicon.ico, /privacy, /login, etc.) falls
    # through to the SPA fallback below so deep-linking and refresh work.
    static_dir = os.path.join(build_dir, "static")

    app = Flask(__name__, static_folder=static_dir, static_url_path="/static")
    app.config["BUILD_DIR"] = os.path.abspath(build_dir)

    # CORS allowlist (env-driven). Prod must set ALLOWED_ORIGINS.
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins()}},
        supports_credentials=False,
        max_age=3600,
    )

    install_security_headers(app)

    # ── Static + SPA fallback ──
    # Serves index.html for /, top-level CRA assets (favicon.ico, manifest.json,
    # robots.txt, etc.) from build/, and falls back to index.html for any
    # client-side route (/privacy, /login, /dashboard, …). The hashed bundles
    # under /static/* are handled by Flask's built-in static endpoint above.
    @app.route("/")
    def serve_react():
        return send_from_directory(app.config["BUILD_DIR"], "index.html")

    @app.route("/<path:path>")
    def serve_root_or_spa(path):
        build_dir = app.config["BUILD_DIR"]
        candidate = os.path.normpath(os.path.join(build_dir, path))
        # Guard against path traversal — only serve files inside build_dir.
        if candidate.startswith(build_dir) and os.path.isfile(candidate):
            return send_from_directory(build_dir, path)
        return send_from_directory(build_dir, "index.html")

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

    # Pre-warm FinBERT in a background thread so it doesn't block boot but
    # is ready before the first /stock/<ticker> request lands.
    threading.Thread(target=_prewarm_finbert, name="finbert-warmup", daemon=True).start()

    return app
