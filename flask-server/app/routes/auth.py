"""
Auth: signup, login, profile.

- Passwords are stored as Werkzeug pbkdf2:sha256:600000 hashes.
- Legacy cleartext rows are accepted on login and transparently re-hashed.
- Auth endpoints are rate-limited per client IP.
- All inputs are validated before touching the database.
"""
from __future__ import annotations

import os
import sqlite3
import datetime

import jwt
from flask import Blueprint, jsonify, request

from ..config import get_db_path
from ..security import (
    hash_password, verify_password, rate_limit,
    valid_username, valid_email, valid_name,
)


SECRET_KEY = os.environ.get("SECRET_KEY")
TOKEN_TTL_HOURS = int(os.environ.get("JWT_TTL_HOURS", "12"))

auth_routes = Blueprint("auth", __name__)


def _require_secret():
    if not SECRET_KEY or len(SECRET_KEY) < 16:
        raise RuntimeError(
            "SECRET_KEY environment variable is missing or too short (<16 chars). "
            "Refusing to issue auth tokens with an insecure key."
        )


def _conn():
    conn = sqlite3.connect(get_db_path())
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _user_columns(cursor) -> set:
    cursor.execute("PRAGMA table_info(user)")
    return {r[1] for r in cursor.fetchall()}


def _ensure_profile_columns(cursor):
    cols = _user_columns(cursor)
    for col in ("first_name", "last_name", "email"):
        if col not in cols:
            cursor.execute(f"ALTER TABLE user ADD COLUMN {col} TEXT")


def _row_to_profile(row) -> dict:
    username, first_name, last_name, email = row
    return {
        "username": username,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "email": email or "",
        "name": (f"{first_name or ''} {last_name or ''}").strip() or username,
    }


def _decode_token(raw: str | None):
    if not raw:
        return None
    if raw.startswith("Bearer "):
        raw = raw.split(" ", 1)[1]
    try:
        return jwt.decode(raw, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def _issue_token(username: str) -> str:
    _require_secret()
    payload = {
        "sub": username,
        "username": username,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


# ────── Signup ───────────────────────────────────────────────────────

@auth_routes.route("/signup", methods=["POST"])
@rate_limit(limit=5, window=600, scope="signup")
def signup():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not valid_username(username):
        return jsonify({"message": "Username must be 3–32 chars (letters, numbers, _ . -)."}), 400
    if not valid_name(first_name) or not valid_name(last_name):
        return jsonify({"message": "First and last name look invalid."}), 400
    if not valid_email(email):
        return jsonify({"message": "Please enter a valid email."}), 400
    if not password or len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters."}), 400
    if len(password) > 128:
        return jsonify({"message": "Password is too long."}), 400

    try:
        pw_hash = hash_password(password)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    conn = _conn()
    cursor = conn.cursor()
    try:
        _ensure_profile_columns(cursor)
        cursor.execute("SELECT userID FROM user WHERE userID = ?", (username,))
        if cursor.fetchone():
            return jsonify({"message": "That username is already taken."}), 409
        cursor.execute(
            "SELECT userID FROM user WHERE LOWER(email) = LOWER(?) AND email IS NOT NULL AND email != ''",
            (email,),
        )
        if cursor.fetchone():
            return jsonify({"message": "An account with that email already exists."}), 409

        cursor.execute(
            "INSERT INTO user (userID, password, first_name, last_name, email) VALUES (?, ?, ?, ?, ?)",
            (username, pw_hash, first_name, last_name, email),
        )
        conn.commit()
    finally:
        conn.close()

    token = _issue_token(username)
    return jsonify({
        "token": token,
        "user": {
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "name": f"{first_name} {last_name}".strip(),
        },
        "message": "Successful signup",
    }), 201


# ────── Login ────────────────────────────────────────────────────────

@auth_routes.route("/login", methods=["POST"])
@rate_limit(limit=8, window=300, scope="login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"message": "Username and password are required."}), 400

    conn = _conn()
    cursor = conn.cursor()
    try:
        _ensure_profile_columns(cursor)
        cursor.execute(
            "SELECT userID, first_name, last_name, email, password FROM user WHERE userID = ?",
            (username,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"message": "Invalid credentials"}), 401

        ok, needs_rehash = verify_password(row[4], password)
        if not ok:
            return jsonify({"message": "Invalid credentials"}), 401

        if needs_rehash:
            try:
                cursor.execute(
                    "UPDATE user SET password = ? WHERE userID = ?",
                    (hash_password(password), username),
                )
                conn.commit()
            except ValueError:
                pass  # never block login on rehash failure
    finally:
        conn.close()

    profile = _row_to_profile(row[:4])
    token = _issue_token(username)
    return jsonify({"token": token, "user": profile}), 200


# ────── Profile ──────────────────────────────────────────────────────

@auth_routes.route("/me", methods=["GET"])
@rate_limit(limit=60, window=60, scope="me")
def me():
    decoded = _decode_token(request.headers.get("Authorization"))
    if not decoded:
        return jsonify({"message": "Invalid or missing token"}), 401

    username = decoded.get("username") or decoded.get("sub")
    conn = _conn()
    cursor = conn.cursor()
    try:
        _ensure_profile_columns(cursor)
        cursor.execute(
            "SELECT userID, first_name, last_name, email FROM user WHERE userID = ?",
            (username,),
        )
        row = cursor.fetchone()
    finally:
        conn.close()

    if not row:
        return jsonify({"message": "User no longer exists"}), 401
    return jsonify({"user": _row_to_profile(row)}), 200


@auth_routes.route("/dashboard", methods=["GET"])
def dashboard():
    decoded = _decode_token(request.headers.get("Authorization"))
    if not decoded:
        return jsonify({"message": "Missing or invalid token"}), 401
    return jsonify({"message": f"Welcome, {decoded.get('username') or decoded.get('sub')}!"})
