"""
Symbol database + fuzzy search.

A curated JSON list of the most-traded US equities and ETFs is bundled
with the server. Lookup is in-memory and instant. If the user searches
for something not in the local index we fall back to Finnhub's
/search endpoint and merge the results.

Ranking signals (highest first):
  • exact ticker match
  • ticker prefix match
  • exact word match in company name
  • prefix match on any word in company name
  • substring match anywhere
  • local-first (curated entries win over Finnhub fallbacks)
"""
from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from typing import Optional

from .cache import symbol_cache
from .sources.finnhub import FinnhubSource

_HERE = os.path.dirname(os.path.abspath(__file__))
_SYMBOL_FILE = os.path.normpath(os.path.join(_HERE, "..", "data", "symbols.json"))


@lru_cache(maxsize=1)
def _index() -> list[dict]:
    try:
        with open(_SYMBOL_FILE, "r", encoding="utf-8") as f:
            entries = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

    # De-dupe by ticker (preserve order from file)
    seen = set()
    out = []
    for e in entries:
        t = (e.get("ticker") or "").upper().strip()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append({
            "ticker": t,
            "name": e.get("name") or t,
            "sector": e.get("sector") or "",
            "exchange": e.get("exchange") or "",
        })
    return out


def get_company_name(ticker: str) -> Optional[str]:
    if not ticker:
        return None
    t = ticker.upper().strip()

    # 1. Curated index
    for entry in _index():
        if entry["ticker"] == t:
            return entry["name"]

    # 2. Cache (Finnhub responses)
    cached = symbol_cache.get(t)
    if cached:
        return cached

    # 3. Finnhub profile
    profile = FinnhubSource.company_profile(t)
    if profile and profile.get("name"):
        name = profile["name"]
        symbol_cache.set(t, name)
        return name

    return None


# ────── Search ───────────────────────────────────────────────────────────

_TOKEN = re.compile(r"[A-Za-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in _TOKEN.findall(text or "")]


def _score(entry: dict, q: str, q_tokens: list[str]) -> int:
    """Higher = better match. Returns 0 if no match."""
    t = entry["ticker"]
    name = entry["name"]
    name_lower = name.lower()
    name_tokens = _tokenize(name)
    qu = q.upper()
    ql = q.lower()

    if t == qu:
        return 1000
    if t.startswith(qu):
        return 900 - (len(t) - len(qu))
    if qu in t:
        return 700

    # whole-word company-name matches
    if q_tokens:
        first = q_tokens[0]
        if any(tok == first for tok in name_tokens):
            return 600
        if any(tok.startswith(first) for tok in name_tokens):
            return 500 - (len(name_tokens[0]) - len(first) if name_tokens else 0)

    if ql in name_lower:
        return 300

    # All query tokens matched somewhere in name?
    if q_tokens and all(any(tok in nt for nt in name_tokens) for tok in q_tokens):
        return 200

    return 0


def search_symbols(query: str, limit: int = 8, use_remote_fallback: bool = True) -> list[dict]:
    """
    Returns a ranked list of {ticker, name, sector, exchange, score} dicts.
    """
    q = (query or "").strip()
    if not q:
        return []

    q_tokens = _tokenize(q)
    results = []
    for entry in _index():
        s = _score(entry, q, q_tokens)
        if s > 0:
            results.append((s, entry))

    results.sort(key=lambda x: -x[0])
    local = [
        {**entry, "score": s, "source": "local"}
        for s, entry in results[:limit]
    ]

    if local or not use_remote_fallback:
        return local

    # Fallback to Finnhub for unknown queries (cached briefly)
    cached = symbol_cache.get(f"search::{q.lower()}")
    if cached is not None:
        return cached

    remote = FinnhubSource.symbol_search(q)
    cleaned = []
    seen = set()
    for r in remote[:limit]:
        sym = (r.get("symbol") or "").upper()
        if not sym or "." in sym or ":" in sym or sym in seen:
            continue  # skip foreign listings / dupes
        seen.add(sym)
        cleaned.append({
            "ticker": sym,
            "name": r.get("description") or sym,
            "sector": "",
            "exchange": "",
            "score": 100,
            "source": "remote",
        })

    symbol_cache.set(f"search::{q.lower()}", cleaned)
    return cleaned


# Static "trending" list — what we surface when the search box is empty.
_TRENDING_TICKERS = [
    "NVDA", "AAPL", "TSLA", "MSFT", "META", "GOOGL", "AMZN", "AMD",
    "PLTR", "NFLX", "AVGO", "TSM", "COIN", "SMCI", "SHOP", "UBER",
]


def list_trending() -> list[dict]:
    idx = {e["ticker"]: e for e in _index()}
    out = []
    for t in _TRENDING_TICKERS:
        if t in idx:
            out.append({**idx[t], "score": 0, "source": "trending"})
    return out
