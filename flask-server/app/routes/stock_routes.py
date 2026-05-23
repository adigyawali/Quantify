"""
Stock + symbol HTTP routes.

Thin transport layer — all intelligence lives in app.ai.
"""
from __future__ import annotations

import os
from datetime import datetime

import requests
from flask import Blueprint, jsonify, request

from ..ai import analyze_ticker, search_symbols, get_company_name, list_trending
from ..ai.sources.finnhub import FinnhubSource


stock_routes = Blueprint("stocks", __name__)


# ────── Sentiment / news ─────────────────────────────────────────────

@stock_routes.route("/stock/<ticker>", methods=["GET"])
def get_stock_report(ticker: str):
    """
    Full sentiment report for a ticker.

    Query params:
      ?days=7       lookback window (1..30)
      ?refresh=1    bypass cache for a fresh pull
    """
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
        return jsonify({"error": f"Unable to reach news provider: {exc}"}), 502
    except Exception as exc:  # noqa: BLE001 — last-resort guard, real errors are above
        return jsonify({"error": "Sentiment pipeline failed", "detail": str(exc)}), 500

    payload = report.to_dict()

    # Backwards-compat: surface a flat `news` array for any legacy consumer.
    payload["news"] = [
        {
            "headline": a["headline"],
            "sentiment": a["sentiment_label"].capitalize(),
            "confidence": round(a["sentiment_confidence"], 3),
        }
        for a in payload["articles"]
    ]

    if not payload["articles"]:
        # Return 200 with an empty report so the frontend can render a clean
        # empty state instead of treating "no news this week" as an error.
        payload["message"] = "No analyzable headlines were found in the lookback window."
    return jsonify(payload)


# ────── Intraday history (unchanged) ─────────────────────────────────

@stock_routes.route("/stock/<ticker>/history", methods=["GET"])
def get_stock_history(ticker: str):
    # Try Alpha Vantage first, fallback to mock data
    alpha_key = os.environ.get("ALPHA_VANTAGE_KEY")
    
    if alpha_key:
        url = "https://www.alphavantage.co/query"
        params = {
            "function": "TIME_SERIES_INTRADAY",
            "symbol": ticker.upper(),
            "interval": "5min",
            "apikey": alpha_key,
        }
        try:
            r = requests.get(url, params=params, timeout=10)
            if r.status_code == 200:
                data = r.json() or {}
                time_series = data.get("Time Series (5min)")
                if time_series:
                    sorted_keys = sorted(time_series.keys())
                    history = [
                        {
                            "date": ts[5:16],   # "MM-DD HH:MM"
                            "price": float(time_series[ts]["4. close"]),
                        }
                        for ts in sorted_keys
                    ]
                    return jsonify(history)
        except Exception:
            pass

    # Fallback mock generator
    import math
    import random
    
    # Generate stable mock data based on ticker name
    seed = sum(ord(c) for c in ticker.upper())
    random.seed(seed)
    
    base_price = 100.0 + (seed % 900)
    volatility = base_price * 0.002
    
    history = []
    current_price = base_price
    
    # Generate 78 data points (typical 6.5 hour trading day at 5-min intervals)
    for i in range(78):
        hour = 9 + (i * 5) // 60
        minute = (30 + i * 5) % 60
        if minute < 30 and i * 5 < 30: # Adjust starting time from 9:30
             minute += 30
             if minute >= 60:
                 minute -= 60
                 hour += 1
        
        # Add random walk with slight momentum
        momentum = random.uniform(-0.1, 0.1)
        current_price = current_price + (random.uniform(-1, 1) + momentum) * volatility
        current_price = max(1.0, current_price) # Prevent negative prices
        
        history.append({
            "date": f"10-24 {hour:02d}:{minute:02d}", # Dummy date MM-DD HH:MM
            "price": round(current_price, 2)
        })
        
    return jsonify(history)


@stock_routes.route("/stock/<ticker>/quote", methods=["GET"])
def get_quote(ticker: str):
    """Live quote — used by buy modal to prefill price."""
    q = FinnhubSource.quote(ticker)
    if not q:
        return jsonify({"error": "Quote unavailable"}), 502
    return jsonify({
        "ticker": ticker.upper(),
        "price": q.get("c"),
        "open": q.get("o"),
        "high": q.get("h"),
        "low": q.get("l"),
        "previous_close": q.get("pc"),
        "as_of": q.get("t") or int(datetime.utcnow().timestamp()),
    })


# ────── Symbol search ────────────────────────────────────────────────

@stock_routes.route("/api/symbols/search", methods=["GET"])
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
