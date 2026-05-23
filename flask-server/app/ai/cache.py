"""
Tiny thread-safe TTL cache.

Keeps news fetches and sentiment runs from re-hitting Finnhub/FinBERT
on every page-load and dramatically reduces tail latency.
"""
import time
import threading
from typing import Any, Optional


class TTLCache:
    def __init__(self, ttl_seconds: int = 600, max_entries: int = 512):
        self._ttl = ttl_seconds
        self._max = max_entries
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expiry, value = entry
            if expiry < time.time():
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if len(self._store) >= self._max:
                # Evict oldest by expiry — simple bounded eviction
                oldest = min(self._store.items(), key=lambda kv: kv[1][0])
                self._store.pop(oldest[0], None)
            self._store[key] = (time.time() + self._ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


# Public, per-purpose caches
news_cache = TTLCache(ttl_seconds=300)      # raw news per ticker (5 min)
report_cache = TTLCache(ttl_seconds=180)    # full sentiment report (3 min)
sentiment_cache = TTLCache(ttl_seconds=3600, max_entries=4096)  # per-text sentiment (1 hr)
symbol_cache = TTLCache(ttl_seconds=86400)  # ticker → company name (1 day)
