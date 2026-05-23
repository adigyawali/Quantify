"""
Stock + symbol HTTP routes.

Thin transport layer — all market intelligence lives in app.services.
"""
from __future__ import annotations

import logging

import requests
from flask import Blueprint, jsonify, request

from ..ai import analyze_ticker, search_symbols, get_company_name, list_trending
from ..ai.market import market_state
from ..security import rate_limit
from ..services import market_data


log = logging.getLogger("tickr.stocks")
stock_routes = Blueprint("stocks", __name__)


# ────── Sentiment / news ─────────────────────────────────────────────

@stock_routes.route("/stock/<ticker>", methods=["GET"])
@rate_limit(limit=30, window=60, scope="news")
def get_stock_report(ticker: str):
    try:
        days = max(1, min(30, int(request.args.get("days", 7))))
    except (TypeError, ValueError):
        days = 7

    if request.args.get("refresh") in ("1", "true", "yes"):
        from ..ai.cache import news_cache, report_cache
        news_cache.clear()
        report_cache.clear()

    try:
        report = analyze_ticker(ticker, days=days)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 502
        if status == 429:
            return jsonify({"error": "Rate limited by news provider — try again shortly."}), 429
        if status in (401, 403):
            return jsonify({"error": "News provider authentication failed."}), 502
        return jsonify({"error": f"News provider returned {status}."}), 502
    except requests.RequestException as exc:
        log.warning("News provider unreachable: %s", exc)
        return jsonify({"error": "Unable to reach news provider."}), 502
    except Exception:  # noqa: BLE001
        log.exception("Sentiment pipeline crash")
        return jsonify({"error": "Sentiment pipeline failed"}), 500

    payload = report.to_dict()
    payload["news"] = [
        {
            "headline": a["headline"],
            "sentiment": a["sentiment_label"].capitalize(),
            "confidence": round(a["sentiment_confidence"], 3),
        }
        for a in payload["articles"]
    ]
    if not payload["articles"]:
        payload["message"] = "No analyzable headlines were found in the lookback window."
    return jsonify(payload)


# ────── Intraday history ─────────────────────────────────────────────

@stock_routes.route("/stock/<ticker>/history", methods=["GET"])
@rate_limit(limit=60, window=60, scope="history")
def get_stock_history(ticker: str):
    return jsonify(market_data.get_intraday(ticker))


@stock_routes.route("/stock/<ticker>/quote", methods=["GET"])
@rate_limit(limit=120, window=60, scope="quote")
def get_quote(ticker: str):
    quote = market_data.get_quote(ticker)
    if not quote:
        return jsonify({"error": "Quote unavailable for this ticker."}), 502
    return jsonify({**quote, "market": market_state()})


# ────── Symbol search ────────────────────────────────────────────────

@stock_routes.route("/api/symbols/search", methods=["GET"])
@rate_limit(limit=60, window=60, scope="search")
def symbols_search():
    q = (request.args.get("q") or "").strip()
    try:
        limit = max(1, min(20, int(request.args.get("limit", 8))))
    except (TypeError, ValueError):
        limit = 8

    if not q:
        return jsonify({"results": list_trending(), "query": "", "trending": True})

    results = search_symbols(q, limit=limit)
    return jsonify({"results": results, "query": q, "trending": False})


@stock_routes.route("/api/symbols/trending", methods=["GET"])
def symbols_trending():
    return jsonify({"results": list_trending(), "trending": True})


@stock_routes.route("/api/symbols/<ticker>", methods=["GET"])
def symbol_lookup(ticker: str):
    name = get_company_name(ticker)
    if not name:
        return jsonify({"ticker": ticker.upper(), "name": None}), 404
    return jsonify({"ticker": ticker.upper(), "name": name})


# ────── Market state & movers (server-cached, shared across users) ───

@stock_routes.route("/api/market/state", methods=["GET"])
def market_state_route():
    return jsonify(market_state())


@stock_routes.route("/api/market/movers", methods=["GET"])
@rate_limit(limit=60, window=60, scope="movers")
def market_movers():
    try:
        limit = max(3, min(15, int(request.args.get("limit", 6))))
    except (TypeError, ValueError):
        limit = 6
    return jsonify(market_data.list_movers(limit=limit))


@stock_routes.route("/api/market/sparkline/<ticker>", methods=["GET"])
@rate_limit(limit=120, window=60, scope="sparkline")
def market_sparkline(ticker: str):
    try:
        points = max(8, min(48, int(request.args.get("points", 24))))
    except (TypeError, ValueError):
        points = 24
    series = market_data.get_sparkline(ticker, points=points)
    return jsonify({"ticker": ticker.upper(), "points": series or []})
