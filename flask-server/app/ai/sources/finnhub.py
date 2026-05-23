"""
Finnhub adapter — news, quotes, profiles, intraday candles.
"""
from __future__ import annotations

import os
from datetime import date, timedelta

import requests

from ..models import RawArticle
from .base import NewsSource

_BASE = "https://finnhub.io/api/v1/company-news"
_PROFILE = "https://finnhub.io/api/v1/stock/profile2"
_SEARCH = "https://finnhub.io/api/v1/search"
_QUOTE = "https://finnhub.io/api/v1/quote"
_CANDLE = "https://finnhub.io/api/v1/stock/candle"


def _api_key() -> str | None:
    return os.environ.get("FINNHUB_API_KEY") or None


class FinnhubSource(NewsSource):
    name = "finnhub"

    def __init__(self, timeout: int = 8):
        self.timeout = timeout

    def fetch(self, ticker: str, days: int = 7) -> list[RawArticle]:
        api_key = _api_key()
        if not api_key:
            raise RuntimeError("FINNHUB_API_KEY not configured")

        range_to = date.today()
        range_from = range_to - timedelta(days=days)

        params = {
            "symbol": ticker.upper(),
            "from": range_from.strftime("%Y-%m-%d"),
            "to": range_to.strftime("%Y-%m-%d"),
            "token": api_key,
        }
        r = requests.get(_BASE, params=params, headers={"Accept-Encoding": "identity"}, timeout=self.timeout)
        r.raise_for_status()
        items = r.json() or []

        out: list[RawArticle] = []
        for item in items:
            headline = (item.get("headline") or "").strip()
            if not headline:
                continue
            out.append(RawArticle(
                headline=headline,
                summary=(item.get("summary") or "").strip(),
                url=item.get("url") or "",
                source=item.get("source") or "",
                published_at=int(item.get("datetime") or 0),
                provider=self.name,
            ))
        return out

    # ── Static helpers ───────────────────────────────────────────

    @staticmethod
    def company_profile(ticker: str, timeout: int = 5) -> dict | None:
        key = _api_key()
        if not key:
            return None
        try:
            r = requests.get(_PROFILE, params={"symbol": ticker, "token": key},
                             headers={"Accept-Encoding": "identity"}, timeout=timeout)
            if r.status_code != 200:
                return None
            data = r.json() or {}
            return data if data.get("name") else None
        except requests.RequestException:
            return None

    @staticmethod
    def quote(ticker: str, timeout: int = 5) -> dict | None:
        key = _api_key()
        if not key:
            return None
        try:
            r = requests.get(_QUOTE, params={"symbol": ticker, "token": key},
                             headers={"Accept-Encoding": "identity"}, timeout=timeout)
            if r.status_code != 200:
                return None
            data = r.json() or None
            # Finnhub returns all-zeros for invalid symbols
            if not data or (data.get("c") in (0, None) and data.get("pc") in (0, None)):
                return None
            return data
        except requests.RequestException:
            return None

    @staticmethod
    def candles(ticker: str, resolution: str, from_ts: int, to_ts: int, timeout: int = 8) -> dict | None:
        """
        Intraday/daily candles. `resolution` is one of 1, 5, 15, 30, 60, D, W, M.
        Returns the raw Finnhub payload {s, t, o, h, l, c, v} or None.
        """
        key = _api_key()
        if not key:
            return None
        try:
            r = requests.get(_CANDLE, params={
                "symbol": ticker,
                "resolution": resolution,
                "from": from_ts,
                "to": to_ts,
                "token": key,
            }, headers={"Accept-Encoding": "identity"}, timeout=timeout)
            if r.status_code != 200:
                return None
            data = r.json() or {}
            if data.get("s") != "ok" or not data.get("t"):
                return None
            return data
        except requests.RequestException:
            return None

    @staticmethod
    def symbol_search(query: str, timeout: int = 5) -> list[dict]:
        key = _api_key()
        if not key:
            return []
        try:
            r = requests.get(_SEARCH, params={"q": query, "token": key},
                             headers={"Accept-Encoding": "identity"}, timeout=timeout)
            if r.status_code != 200:
                return []
            data = r.json() or {}
            return data.get("result") or []
        except requests.RequestException:
            return []
