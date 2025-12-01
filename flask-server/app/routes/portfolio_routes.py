import os
import sqlite3
from flask import Blueprint, jsonify, request
import requests
from dotenv import load_dotenv
import jwt

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
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            data = r.json()
            return data.get("c") # 'c' is the current price in Finnhub
    except:
        pass
    return None

@portfolio_routes.route("/portfolio", methods=["GET"])
def get_portfolio():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Fetch holdings
    cursor.execute("SELECT ticker, quantity, avg_price FROM holdings WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    portfolio = []
    total_value = 0
    total_cost = 0

    for row in rows:
        ticker, quantity, avg_price = row
        current_price = get_current_price(ticker)
        
        if current_price is None:
            current_price = avg_price # Fallback if API fails

        market_value = quantity * current_price
        cost_basis = quantity * avg_price
        
        total_value += market_value
        total_cost += cost_basis

        portfolio.append({
            "ticker": ticker,
            "quantity": quantity,
            "avg_price": avg_price,
            "current_price": current_price,
            "market_value": market_value,
            "gain_loss": market_value - cost_basis,
            "gain_loss_percent": ((market_value - cost_basis) / cost_basis * 100) if cost_basis > 0 else 0
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
    price = float(data.get("price")) # User provided price or fetched from FE

    if quantity <= 0 or price <= 0:
        return jsonify({"message": "Invalid quantity or price"}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if stock already exists
    cursor.execute("SELECT quantity, avg_price FROM holdings WHERE user_id = ? AND ticker = ?", (user_id, ticker))
    existing = cursor.fetchone()

    if existing:
        old_qty, old_avg = existing
        new_qty = old_qty + quantity
        # Calculate new weighted average price
        new_avg = ((old_qty * old_avg) + (quantity * price)) / new_qty
        cursor.execute("UPDATE holdings SET quantity = ?, avg_price = ? WHERE user_id = ? AND ticker = ?", (new_qty, new_avg, user_id, ticker))
    else:
        cursor.execute("INSERT INTO holdings (user_id, ticker, quantity, avg_price) VALUES (?, ?, ?, ?)", (user_id, ticker, quantity, price))

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
    price = float(data.get("price")) # Sell price

    if quantity <= 0:
        return jsonify({"message": "Invalid quantity"}), 400

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT quantity, avg_price FROM holdings WHERE user_id = ? AND ticker = ?", (user_id, ticker))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return jsonify({"message": "Stock not found in portfolio"}), 404

    old_qty, old_avg = existing
    
    if quantity > old_qty:
        conn.close()
        return jsonify({"message": "Insufficient shares"}), 400

    new_qty = old_qty - quantity

    if new_qty == 0:
        cursor.execute("DELETE FROM holdings WHERE user_id = ? AND ticker = ?", (user_id, ticker))
    else:
        # Average price doesn't change on sell, only quantity
        cursor.execute("UPDATE holdings SET quantity = ? WHERE user_id = ? AND ticker = ?", (new_qty, user_id, ticker))

    conn.commit()
    conn.close()
    return jsonify({"message": f"Sold {quantity} shares of {ticker}"})
