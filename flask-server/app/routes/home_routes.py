from flask import Blueprint, request, jsonify

home_routes = Blueprint("home_routes", __name__)

@home_routes.route("/api/hello", methods=["POST"])
def say_hello():
    data = request.get_json()
    print("Data", data)
    ticker = data.get("ticker", "none")
    return jsonify({"tickerName": f"Ticker sent to the back end was, {ticker}"})



