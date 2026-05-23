"""
Market-data service layer.

A single server-side cache fronts every market call so that 10k concurrent
users browsing AAPL hit Finnhub once, not ten thousand times.

Design:
  - Stale-while-revalidate TTL cache (shared across requests via in-memory
    dict + threading.Lock; swap for Redis in clustered deploys).
  - Quote TTL is short during open hours, long when closed.
  - Movers endpoint pulls a curated universe and batches quote fetches.
  - All upstream errors degrade to "last good value" (the stale cache) and
    surface a `stale: true` flag so the UI can dim numbers if it wants.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable

from ..ai.market import NY, market_state, last_trading_day, session_bounds
from ..ai.sources.finnhub import FinnhubSource


log = logging.getLogger("tickr.market")


# ────── SWR cache ────────────────────────────────────────────────────

class SWRCache:
    """
    Stale-while-revalidate cache.

    `get_or_fetch` returns the freshest value it can:
      - fresh (within fresh_ttl)     → cache hit
      - stale (within stale_ttl)     → return stale, refresh in background
      - missing/expired              → block and fetch
    """

    def __init__(self):
        self._store: dict[str, dict] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._refreshing: set[str] = set()
        self._meta_lock = threading.Lock()

    def _lock_for(self, key: str) -> threading.Lock:
        with self._meta_lock:
            lock = self._locks.get(key)
            if not lock:
                lock = threading.Lock()
                self._locks[key] = lock
            return lock

    def get_or_fetch(
        self,
        key: str,
        fetcher: Callable[[], Any],
        fresh_ttl: int,
        stale_ttl: int = 0,
    ) -> tuple[Any, bool]:
        """Returns (value, is_stale)."""
        now = time.time()
        entry = self._store.get(key)

        if entry and entry["fresh_until"] > now:
            return entry["value"], False

        if entry and entry["stale_until"] > now:
            # Trigger async refresh, return stale immediately
            if key not in self._refreshing:
                self._refreshing.add(key)
                threading.Thread(
                    target=self._refresh,
                    args=(key, fetcher, fresh_ttl, stale_ttl),
                    daemon=True,
                ).start()
            return entry["value"], True

        # Cold or fully expired → block on a single fetch (thundering-herd safe)
        with self._lock_for(key):
            entry = self._store.get(key)
            now = time.time()
            if entry and entry["fresh_until"] > now:
                return entry["value"], False
            value = self._fetch_safe(fetcher)
            if value is None and entry is not None:
                return entry["value"], True  # serve last good even if expired
            self._store[key] = {
                "value": value,
                "fresh_until": now + fresh_ttl,
                "stale_until": now + fresh_ttl + stale_ttl,
                "updated": now,
            }
            return value, False

    def _refresh(self, key, fetcher, fresh_ttl, stale_ttl):
        try:
            value = self._fetch_safe(fetcher)
            if value is None:
                return
            now = time.time()
            self._store[key] = {
                "value": value,
                "fresh_until": now + fresh_ttl,
                "stale_until": now + fresh_ttl + stale_ttl,
                "updated": now,
            }
        finally:
            self._refreshing.discard(key)

    @staticmethod
    def _fetch_safe(fetcher):
        try:
            return fetcher()
        except Exception:  # noqa: BLE001 — cache must not propagate errors
            log.exception("Cache fetcher failed; returning None")
            return None

    def clear(self):
        self._store.clear()


_cache = SWRCache()


# ────── TTL policy ───────────────────────────────────────────────────

def _quote_ttl() -> tuple[int, int]:
    """(fresh_ttl, stale_ttl) for live quotes."""
    state = market_state()["state"]
    if state == "open":      return (15, 60)        # very fresh during open
    if state in ("pre", "after"): return (30, 120)
    return (300, 3600)                              # closed: ~5min fresh, 1hr stale ok


def _intraday_ttl() -> tuple[int, int]:
    state = market_state()["state"]
    if state == "open":      return (60, 300)
    if state in ("pre", "after"): return (120, 600)
    return (1800, 86400)


# ────── Public service API ───────────────────────────────────────────

def get_quote(ticker: str) -> dict | None:
    """Cached Finnhub quote with derived change / change_percent."""
    ticker = (ticker or "").upper().strip()
    if not ticker:
        return None
    fresh, stale = _quote_ttl()
    raw, is_stale = _cache.get_or_fetch(
        f"quote:{ticker}",
        lambda: FinnhubSource.quote(ticker),
        fresh, stale,
    )
    if not raw:
        return None
    current = raw.get("c")
    prev = raw.get("pc")
    change = (current - prev) if (current is not None and prev) else None
    pct = (change / prev * 100) if (change is not None and prev) else None
    return {
        "ticker": ticker,
        "price": current,
        "open": raw.get("o"),
        "high": raw.get("h"),
        "low": raw.get("l"),
        "previous_close": prev,
        "change": round(change, 4) if change is not None else None,
        "change_percent": round(pct, 4) if pct is not None else None,
        "as_of": raw.get("t") or int(time.time()),
        "stale": is_stale,
    }


def get_intraday(ticker: str) -> dict:
    """Cached intraday 5-min bars for the most recent trading day."""
    ticker = (ticker or "").upper().strip()
    fresh, stale = _intraday_ttl()
    day = last_trading_day()
    from_ts, to_ts = session_bounds(day)

    def _fetch():
        data = FinnhubSource.candles(ticker, "5", from_ts, to_ts)
        if not data:
            return None
        out = []
        for ts, close in zip(data["t"], data["c"]):
            when = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(NY)
            out.append({
                "date": when.strftime("%H:%M"),
                "ts": ts,
                "price": round(float(close), 4),
            })
        return out

    series, is_stale = _cache.get_or_fetch(
        f"intraday:{ticker}:{day.isoformat()}",
        _fetch, fresh, stale,
    )
    return {
        "history": series or [],
        "market": market_state(),
        "trading_day": day.isoformat(),
        "source": "finnhub" if series else "none",
        "stale": is_stale,
    }


def get_sparkline(ticker: str, points: int = 24) -> list[float] | None:
    """Short sparkline for dashboard cards — derived from intraday cache."""
    data = get_intraday(ticker)
    series = data.get("history") or []
    if not series:
        return None
    prices = [p["price"] for p in series]
    if len(prices) <= points:
        return prices
    # Downsample evenly
    step = len(prices) / points
    return [prices[int(i * step)] for i in range(points)]


# ────── Movers ───────────────────────────────────────────────────────

# A curated, liquid US-equity universe. Picked to balance:
#  - mega-caps (AAPL, MSFT, NVDA…) — high relevance
#  - high-volatility momentum names (TSLA, COIN, PLTR…) — interesting movers
#  - sector coverage (semis, software, EVs, banks, retail, energy)
MOVER_UNIVERSE = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO",
    "AMD", "NFLX", "JPM", "BAC", "WMT", "COST", "XOM", "CVX",
    "PLTR", "COIN", "SHOP", "UBER", "ABNB", "DIS", "PYPL", "SMCI",
    "INTC", "ORCL", "CRM", "ADBE", "QCOM", "MU",
]


def list_movers(limit: int = 8) -> dict:
    """
    Top gainers + top losers across the curated universe.
    Server-cached; never per-user.
    """
    state = market_state()
    fresh, stale = (30, 120) if state["state"] == "open" else (300, 1800)

    def _fetch():
        rows = []
        for sym in MOVER_UNIVERSE:
            q = get_quote(sym)
            if not q or q.get("price") is None or q.get("previous_close") in (None, 0):
                continue
            rows.append({
                "ticker": sym,
                "price": q["price"],
                "change": q["change"],
                "change_percent": q["change_percent"],
                "previous_close": q["previous_close"],
            })
        return rows

    rows, is_stale = _cache.get_or_fetch(
        "movers:all", _fetch, fresh, stale,
    )
    rows = rows or []
    rows_sorted = sorted(
        rows, key=lambda r: (r.get("change_percent") or 0), reverse=True
    )
    return {
        "gainers": rows_sorted[:limit],
        "losers": list(reversed(rows_sorted[-limit:])),
        "market": state,
        "stale": is_stale,
        "universe_size": len(MOVER_UNIVERSE),
        "as_of": int(time.time()),
    }
