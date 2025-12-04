"""
Handles login/signup/authentication

Aditya Gyawali
"""
import os
from dotenv import load_dotenv
import jwt
import datetime
from flask import Blueprint, jsonify, request
import sqlite3
from flask_cors import cross_origin
from ..config import get_db_path



# Set up connection to the database
filename = get_db_path()

#Get the Key for the JWT token
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")

auth_routes = Blueprint("auth", __name__)


#Signup user
def registerUser(username, password):
    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    # Check if username already exists
    cursor.execute("SELECT userID FROM user WHERE userID = ?", (username,))
    if cursor.fetchone():
        conn.close()
        return 0  # Already exists

    # Else insert user
    cursor.execute("INSERT INTO user (userID, password) VALUES (?, ?)", (username, password))
    conn.commit()
    conn.close()
    return 1


@auth_routes.route("/signup", methods=["POST"])

def signup():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    #Call function to register username and password
    result = registerUser(username, password)

    # 1 means succesfull
    if result == 1:
        return jsonify({"message": "Successful Signup"}), 201
    
    # 0 means username already exists
    elif (result == 0):
        return jsonify({"message": "Username Already Exists"}), 409
    
    #Anything else something went wrong
    else:
        return jsonify({"message": "Signup Error"}), 400


#Login
def verifyUser(username, password):
    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    #Check if the Username Exists
    cursor.execute("SELECT userID FROM user WHERE userID = ? AND password = ?", (username,password))
    user = cursor.fetchone()
    conn.close()

    return user is not None


@auth_routes.route("/login", methods=["POST"])

def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    result = verifyUser(username, password)

    if result:
        # Establish a connection between the app and the user

        #Create the payload with the username and time stamp (valid until UTC +2)
        payload = {
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }

        #Create the token
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        
        print(200, "OK")
        return(jsonify({"token": token})), 200


    else:
        return jsonify({"Message": "Invalid credentials"}), 401
    



# Validate users to ensure users with a valid token can view dashboard
@auth_routes.route("/dashboard", methods=["GET"])

def dashboard():
    token = request.headers.get("Authorization")

    if not token:
        return jsonify({"message": "Missing token"}), 401

    try:
        # If your token comes like: "Bearer <token>", remove the Bearer part
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username = decoded["username"]  # Or whatever key you stored
        return jsonify({"message": f"Welcome, {username}!"})

    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token expired"}), 401

    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 401
