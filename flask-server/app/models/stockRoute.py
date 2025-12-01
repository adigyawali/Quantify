import os, requests
from flask import Blueprint, jsonify
from datetime import date, timedelta
from dotenv import load_dotenv
from .sentiment_analysis import analyzeSentiment  # import the FinBERT helper

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(ENV_PATH)
API_KEY = os.getenv("FINNHUB_API_KEY")

# Flask Blueprint for stock routes
stock_routes = Blueprint("stocks", __name__)

@stock_routes.route("/stock/<ticker>", methods=["GET"])
def get_stock_news(ticker):
    """
    Fetch news for a given stock ticker from Finnhub,
    run sentiment analysis with FinBERT, and return JSON.
    """

    if not API_KEY:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 500

    # Date range for the last 7 days
    range_to = date.today()
    range_from = range_to - timedelta(days=7)

    # Call Finnhub API
    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": ticker,
        "from": range_from.strftime("%Y-%m-%d"),
        "to": range_to.strftime("%Y-%m-%d"),
        "token": API_KEY
    }
    headers = {
        "Accept-Encoding": "identity"  # Force no compression to see if that helps
    }
    try:
        r = requests.get(url, params=params, headers=headers, timeout=10)
    except requests.exceptions.RequestException as exc:
        # Return a clean error instead of letting the request fail client-side
        return jsonify({"error": f"Unable to reach Finnhub: {exc}"}), 502

    # If Finnhub errors
    if r.status_code != 200:
        return jsonify({"message": "Error fetching news", "error": r.text}), 500

    news_data = r.json()

    # Extract up to 20 headlines with full metadata
    articles = []
    headlines = []
    for item in news_data[:20]:
        if "headline" in item:
            headlines.append(item["headline"])
            articles.append({
                "headline": item["headline"],
                "url": item.get("url", ""),
                "source": item.get("source", ""),
                "publishedAt": item.get("datetime", 0),  # timestamp in seconds
                "summary": item.get("summary", "")
            })

    if not headlines:
        return jsonify({"message": "No recent news found"}), 404

    # Run sentiment analysis on headlines
    try:
        analyzed = analyzeSentiment(headlines)
    except Exception as exc:
        return jsonify({"error": f"Sentiment analysis failed: {exc}"}), 500

    # Merge sentiment results into articles
    for i in range(len(articles)):
        articles[i]["sentiment"] = analyzed[i]["sentiment"]
        articles[i]["confidence"] = analyzed[i]["confidence"]

    # Return structured response
    return jsonify({
        "ticker": ticker.upper(),
        "news": articles
    })

@stock_routes.route("/stock/<ticker>/history", methods=["GET"])
def get_stock_history(ticker):
    """
    Fetch historical candle data for a stock from Alpha Vantage (Intraday).
    """
    alpha_key = os.getenv("ALPHA_VANTAGE_KEY")
    if not alpha_key:
        return jsonify({"error": "API Key missing"}), 500

    url = "https://www.alphavantage.co/query"
    params = {
        "function": "TIME_SERIES_INTRADAY",
        "symbol": ticker.upper(),
        "interval": "5min",
        "apikey": alpha_key
    }

    try:
        r = requests.get(url, params=params, timeout=10)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    if r.status_code != 200:
        return jsonify({"error": "Alpha Vantage error", "details": r.text}), r.status_code

    data = r.json()
    
    # Alpha Vantage returns 'Time Series (5min)' for success
    time_series = data.get("Time Series (5min)")
    if not time_series:
        return jsonify({"message": "No data found or rate limit reached", "data": data}), 404

    # Format for frontend
    # Data comes as { "YYYY-MM-DD HH:MM:SS": { "1. open": "...", "4. close": "..." }, ... }
    # We need to sort it by time ascending for the graph
    
    sorted_keys = sorted(time_series.keys())
    history = []
    
    for timestamp in sorted_keys:
        # Parse timestamp "2025-11-28 16:55:00" -> "11-28 16:55"
        # Simple string slicing is fastest
        # timestamp is "YYYY-MM-DD HH:MM:SS"
        #               0123456789012345678
        date_str = timestamp[5:16] # "MM-DD HH:MM"
        
        price = float(time_series[timestamp]["4. close"])
        
        history.append({
            "date": date_str,
            "price": price
        })

    return jsonify(history)
