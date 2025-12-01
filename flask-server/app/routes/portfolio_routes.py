import os
import sqlite3
from flask import Blueprint, jsonify, request
import requests
from dotenv import load_dotenv
import jwt
import time
from datetime import datetime, timedelta

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(ENV_PATH)

API_KEY = os.getenv("FINNHUB_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
DB_PATH = os.path.join(BASE_DIR, "..", "..", "userInfo.db")

portfolio_routes = Blueprint("portfolio", __name__)

def get_user_from_token():
    token = request.headers.get("Authorization")
    if not token:
        return None
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["username"]
    except:
        return None

def get_current_price(ticker):
    if not API_KEY:
        return None
    url = f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={API_KEY}"
    try:
        r = requests.get(url, headers={"Accept-Encoding": "identity"}, timeout=5)
        if r.status_code == 200:
            data = r.json()
            return data.get("c")
    except:
        pass
    return None

def get_company_name(ticker):
    if not API_KEY:
        return ticker
    url = "https://finnhub.io/api/v1/stock/profile2"
    params = {"symbol": ticker, "token": API_KEY}
    try:
        r = requests.get(url, params=params, headers={"Accept-Encoding": "identity"}, timeout=5)
        if r.status_code == 200:
            data = r.json()
            return data.get("name", ticker)
    except:
        pass
    return ticker

@portfolio_routes.route("/portfolio", methods=["GET"])
def get_portfolio():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Fetch holdings
    cursor.execute("SELECT ticker, quantity, avg_price, company_name, purchase_date FROM holdings WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    portfolio = []
    total_value = 0
    total_cost = 0

    for row in rows:
        ticker, quantity, avg_price, company_name, purchase_date = row
        current_price = get_current_price(ticker)
        
        if current_price is None:
            current_price = avg_price

        market_value = quantity * current_price
        cost_basis = quantity * avg_price
        
        total_value += market_value
        total_cost += cost_basis

        portfolio.append({
            "ticker": ticker,
            "name": company_name or ticker,
            "quantity": quantity,
            "avg_price": avg_price,
            "current_price": current_price,
            "market_value": market_value,
            "gain_loss": market_value - cost_basis,
            "gain_loss_percent": ((market_value - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0,
            "purchase_date": purchase_date
        })

    overall_gain_loss = total_value - total_cost
    overall_gain_loss_percent = (overall_gain_loss / total_cost * 100) if total_cost > 0 else 0

    return jsonify({
        "holdings": portfolio,
        "total_value": total_value,
        "total_cost": total_cost,
        "overall_gain_loss": overall_gain_loss,
        "overall_gain_loss_percent": overall_gain_loss_percent
    })

@portfolio_routes.route("/portfolio/add", methods=["POST"])
def add_stock():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    ticker = data.get("ticker").upper()
    quantity = int(data.get("quantity"))
    price = float(data.get("price"))
    purchase_date = data.get("date") # YYYY-MM-DD

    if quantity <= 0 or price <= 0:
        return jsonify({"message": "Invalid quantity or price"}), 400
        
    # Validate date
    if not purchase_date:
        purchase_date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        p_date = datetime.strptime(purchase_date, "%Y-%m-%d")
        if p_date > datetime.now():
             return jsonify({"message": "Purchase date cannot be in the future"}), 400
    except ValueError:
        return jsonify({"message": "Invalid date format"}), 400

    company_name = get_company_name(ticker)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # We insert a NEW record for every purchase to track history correctly
    # Instead of averaging immediately, which loses the date info needed for the graph.
    # However, the previous implementation aggregated them. 
    # To support "Overall PnL Graph" correctly with different dates, we should store separate lots.
    # But to keep it simple for this refactor without breaking everything:
    # We will insert a new row for every buy. The GET /portfolio endpoint will aggregate them for display if needed,
    # OR we just list them as separate lots.
    # Let's list them as separate lots or aggregate by ticker in the GET logic.
    # Actually, the prompt implies adding "more money" to a stock.
    # Let's stick to: ONE row per stock per user (AVG price), but update the DATE to the *latest* or keep original?
    # "if i put i bought apple at 230 the graph should reflect that"
    # If we overwrite the date, the graph history might look weird.
    # Ideally, we insert separate rows.
    # Let's change the schema logic slightly: Allow multiple rows for same ticker?
    # The current schema has (user_id, ticker) not necessarily unique unless we enforced it.
    # The previous code did `SELECT ... WHERE user_id=? AND ticker=?` and then UPDATE.
    # Let's switch to INSERTING new rows for every buy to track PnL over time accurately.
    # BUT, the `remove` logic needs to handle this (FIFO/LIFO).
    # Complexity Trade-off:
    # Simple: Update the existing row. Purchase date becomes the *average*? No, that doesn't make sense.
    # Simple 2: Update existing row, keep the *earliest* date? Or *latest*?
    # Let's just INSERT new rows. The frontend "Holdings" list can aggregate them visually.
    # Wait, the previous `init_db` didn't set unique constraint.
    
    cursor.execute(
        "INSERT INTO holdings (user_id, ticker, quantity, avg_price, company_name, purchase_date) VALUES (?, ?, ?, ?, ?, ?)", 
        (user_id, ticker, quantity, price, company_name, purchase_date)
    )

    conn.commit()
    conn.close()
    return jsonify({"message": f"Added {quantity} shares of {ticker}"})

@portfolio_routes.route("/portfolio/remove", methods=["POST"])
def remove_stock():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    ticker = data.get("ticker").upper()
    quantity = int(data.get("quantity"))

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch all lots for this ticker
    cursor.execute("SELECT id, quantity FROM holdings WHERE user_id = ? AND ticker = ? ORDER BY purchase_date ASC", (user_id, ticker))
    lots = cursor.fetchall() # FIFO

    if not lots:
        conn.close()
        return jsonify({"message": "Stock not found"}), 404

    total_owned = sum(l[1] for l in lots)
    if quantity > total_owned:
        conn.close()
        return jsonify({"message": "Insufficient shares"}), 400

    remaining_to_sell = quantity
    
    for lot_id, lot_qty in lots:
        if remaining_to_sell <= 0:
            break
        
        if lot_qty <= remaining_to_sell:
            # Sell entire lot
            cursor.execute("DELETE FROM holdings WHERE id = ?", (lot_id,))
            remaining_to_sell -= lot_qty
        else:
            # Partial sell
            new_qty = lot_qty - remaining_to_sell
            cursor.execute("UPDATE holdings SET quantity = ? WHERE id = ?", (new_qty, lot_id))
            remaining_to_sell = 0

    conn.commit()
    conn.close()
    return jsonify({"message": f"Sold {quantity} shares of {ticker}"})

@portfolio_routes.route("/portfolio/history", methods=["GET"])
def get_portfolio_history():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT ticker, quantity, avg_price, purchase_date FROM holdings WHERE user_id = ?", (user_id,))
    holdings = cursor.fetchall()
    conn.close()

    if not holdings:
        return jsonify([])

    # 1. Get unique tickers
    unique_tickers = list(set(h[0] for h in holdings))
    
    # 2. Fetch price history for all tickers (Last 30 days)
    # Finnhub candles 'D'
    ticker_histories = {}
    
    to_ts = int(time.time())
    from_ts = to_ts - (30 * 24 * 60 * 60) 

    for t in unique_tickers:
        if not API_KEY: break
        url = "https://finnhub.io/api/v1/stock/candle"
        params = {
            "symbol": t,
            "resolution": "D",
            "from": from_ts,
            "to": to_ts,
            "token": API_KEY
        }
        try:
            r = requests.get(url, params=params, headers={"Accept-Encoding": "identity"}, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data.get("s") == "ok":
                    # Map timestamp to price
                    # { 167...: 150.00, ... }
                    prices = {}
                    for i, ts in enumerate(data.get("t", [])):
                        # Normalize ts to midnight/date string to match easier
                        date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                        prices[date_str] = data["c"][i]
                    ticker_histories[t] = prices
        except:
            pass

    # 3. Construct Portfolio History
    # Generate list of dates for last 30 days
    history_graph = []
    start_date = datetime.now() - timedelta(days=30)
    
    for i in range(31):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")
        
        day_total_value = 0
        
        # Calculate value of portfolio on this day
        for h in holdings:
            ticker, qty, price, buy_date_str = h
            
            # Check if stock was owned on this date
            # buy_date_str is YYYY-MM-DD
            if buy_date_str <= date_str:
                # Get price on this date
                hist = ticker_histories.get(ticker, {})
                
                # If price exists for this date, use it. 
                # If not (weekend/holiday), use last known price? 
                # For simplicity, try direct match, else iterate back or use buy_price if missing
                current_stock_price = hist.get(date_str)
                
                if current_stock_price is None:
                    # Fallback: find closest previous date in history
                    # or just use the buy_price if we can't find history (bad assumption but prevents crash)
                    current_stock_price = price # Cost basis as fallback
                    
                    # Better fallback: most recent price in hist before date_str
                    sorted_dates = sorted([d for d in hist.keys() if d <= date_str])
                    if sorted_dates:
                        current_stock_price = hist[sorted_dates[-1]]

                day_total_value += qty * current_stock_price
        
        history_graph.append({
            "date": current_date.strftime("%m/%d"),
            "value": day_total_value
        })

    return jsonify(history_graph)