"""
Security primitives: password hashing, rate limiting, HTTP hardening.

We use Werkzeug's pbkdf2:sha256 (600k iters by default in modern Werkzeug)
instead of bcrypt to avoid a new wheel dependency on Azure/Heroku-style
deploys. pbkdf2 is OWASP-acceptable and ships with Flask.
"""
from __future__ import annotations

import os
import re
import time
import secrets
import threading
from collections import deque
from functools import wraps

from flask import jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash


# ────── Password hashing ─────────────────────────────────────────────

_HASH_METHOD = "pbkdf2:sha256:600000"
_HASH_PREFIXES = ("pbkdf2:", "scrypt:", "argon2", "bcrypt$")


def hash_password(plain: str) -> str:
    if not plain or len(plain) < 6:
        raise ValueError("Password must be at least 6 characters.")
    return generate_password_hash(plain, method=_HASH_METHOD, salt_length=16)


def verify_password(stored: str, plain: str) -> tuple[bool, bool]:
    """
    Returns (ok, needs_rehash).
    `needs_rehash=True` when the stored value is legacy cleartext or an
    older hashing scheme — caller should re-hash on next successful login.
    """
    if not stored or plain is None:
        return False, False

    if stored.startswith(_HASH_PREFIXES):
        try:
            return check_password_hash(stored, plain), False
        except (ValueError, TypeError):
            return False, False

    # Legacy cleartext (pre-migration accounts) — match in constant time
    if secrets.compare_digest(stored, plain):
        return True, True
    return False, False


# ────── Validation helpers ───────────────────────────────────────────

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z' \-]{0,49}$")


def valid_username(s: str) -> bool: return bool(s and _USERNAME_RE.match(s))
def valid_email(s: str) -> bool: return bool(s and _EMAIL_RE.match(s) and len(s) <= 254)
def valid_name(s: str) -> bool: return bool(s and _NAME_RE.match(s.strip()))


# ────── In-memory token bucket rate limiter ──────────────────────────
#
# Good enough for single-instance Flask. For horizontal scale, swap the
# backing store for Redis (same interface).

class RateLimiter:
    def __init__(self):
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        """
        now = time.time()
        cutoff = now - window
        with self._lock:
            q = self._hits.setdefault(key, deque())
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False, int(q[0] + window - now) + 1
            q.append(now)
            return True, 0

    def gc(self, max_keys: int = 8192):
        """Trim memory growth — call periodically from a background sweeper."""
        with self._lock:
            if len(self._hits) <= max_keys:
                return
            for k in list(self._hits.keys())[: len(self._hits) - max_keys]:
                self._hits.pop(k, None)


_limiter = RateLimiter()


def _client_ip() -> str:
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limit(limit: int, window: int, scope: str = "default"):
    """
    Decorator: cap requests per client IP for a given route scope.
    """
    def deco(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            key = f"{scope}:{_client_ip()}"
            allowed, retry = _limiter.hit(key, limit, window)
            if not allowed:
                resp = jsonify({
                    "message": "Too many requests. Please slow down.",
                    "retry_after": retry,
                })
                resp.status_code = 429
                resp.headers["Retry-After"] = str(retry)
                return resp
            return fn(*args, **kwargs)
        return wrapped
    return deco


# ────── HTTP security headers ────────────────────────────────────────

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-XSS-Protection": "0",
}


def install_security_headers(app):
    """Attach baseline hardening headers to every response."""

    @app.after_request
    def _apply(resp):
        for k, v in _SECURITY_HEADERS.items():
            resp.headers.setdefault(k, v)
        # HSTS only on real HTTPS deployments
        if os.environ.get("FORCE_HSTS") == "1":
            resp.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return resp


# ────── Allowed CORS origins ─────────────────────────────────────────

def allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if not raw:
        # Local dev defaults — production must set ALLOWED_ORIGINS explicitly.
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5000",
        ]
    return [o.strip() for o in raw.split(",") if o.strip()]
