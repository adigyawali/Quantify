"""
End-to-end orchestrator.

  fetch ──► relevance filter ──► sentiment classify ──► dedupe ──► score & rank
        ╰─► aggregate verdict ──► explain ──► cache ──► return

Every stage is its own module so individual concerns can be evolved
independently and tested in isolation.
"""
from __future__ import annotations

import time
import traceback
from typing import Optional

from .cache import news_cache, report_cache
from .dedupe import dedupe_articles
from .explain import explain, top_drivers
from .models import RawArticle, ScoredArticle, TickerReport, Verdict
from .quality import source_weight
from .relevance import relevance_score
from .sentiment import (
    aggregate, article_impact, classify_batch, recency_weight,
)
from .sources import FinnhubSource
from .symbols import get_company_name

# Defaults
_WINDOW_DAYS = 7
_MIN_RELEVANCE = 0.30
_MAX_OUTPUT = 25


def _fetch_raw(ticker: str, days: int) -> list[RawArticle]:
    key = f"raw::{ticker.upper()}::{days}"
    cached = news_cache.get(key)
    if cached is not None:
        return cached
    src = FinnhubSource()
    items = src.fetch(ticker, days=days)
    news_cache.set(key, items)
    return items


def _classify_articles(raws: list[RawArticle]) -> list[dict]:
    # Combine headline + summary for richer classification context.
    texts = [
        (r.headline or "") + (". " + r.summary if r.summary else "")
        for r in raws
    ]
    return classify_batch(texts)


def analyze_ticker(
    ticker: str,
    days: int = _WINDOW_DAYS,
    min_relevance: float = _MIN_RELEVANCE,
    max_output: int = _MAX_OUTPUT,
    company: Optional[str] = None,
) -> TickerReport:
    """
    Build a full sentiment report for one ticker.

    Raises:
        RuntimeError if FINNHUB_API_KEY is not configured.
        requests.HTTPError on upstream failures (404, 429, etc.) so the
        route layer can map them to clean status codes.
    """
    ticker = ticker.upper().strip()
    now = int(time.time())

    cache_key = f"report::{ticker}::{days}"
    cached = report_cache.get(cache_key)
    if cached is not None:
        return cached

    # 0. Resolve company name (used for relevance + explanations)
    company = company or get_company_name(ticker)

    # 1. Fetch
    raws = _fetch_raw(ticker, days)
    if not raws:
        return _empty_report(ticker, company, now)

    # 2. Pre-filter for relevance BEFORE we spend FinBERT compute on noise
    pre = []
    for r in raws:
        rel = relevance_score(r.headline, r.summary, ticker, company)
        if rel >= min_relevance:
            pre.append((r, rel))

    # Fallback — if our filter dropped everything (rare for thinly covered
    # tickers), take the top N by headline length so we still respond.
    if not pre and raws:
        sorted_raw = sorted(raws, key=lambda x: -len(x.headline or ""))[:8]
        pre = [(r, 0.25) for r in sorted_raw]

    # 3. Sentiment classify
    sentiments = _classify_articles([r for r, _ in pre])

    # 4. Build ScoredArticles with weights
    scored: list[ScoredArticle] = []
    for (raw, rel), sent in zip(pre, sentiments):
        sw = source_weight(raw.source)
        rec = recency_weight(raw.published_at, now=now)
        impact = article_impact(
            source_weight=sw,
            recency=rec,
            relevance=rel,
            confidence=sent["confidence"],
        )
        scored.append(ScoredArticle(
            headline=raw.headline,
            summary=raw.summary,
            url=raw.url,
            source=raw.source,
            published_at=raw.published_at,
            sentiment_label=sent["label"],
            sentiment_score=sent["score"],
            sentiment_confidence=sent["confidence"],
            distribution=sent["distribution"],
            relevance=rel,
            source_weight=sw,
            recency_weight=rec,
            impact=impact,
        ))

    # 5. Dedupe — keep canonical (strongest source/relevance) per cluster
    scored = dedupe_articles(scored)

    # 6. Rank by impact descending
    scored.sort(key=lambda a: a.impact, reverse=True)
    scored = scored[:max_output]

    # 7. Aggregate
    agg = aggregate(scored, now=now)

    # 8. Explain
    explanation = explain(
        ticker, agg["label"], agg["score"], agg["confidence"],
        agg["momentum"], agg["distribution"], scored, company=company,
    )

    sources = []
    seen = set()
    for a in scored:
        if a.source and a.source not in seen:
            seen.add(a.source)
            sources.append(a.source)
        if len(sources) >= 5:
            break

    verdict = Verdict(
        label=agg["label"],
        score=agg["score"],
        confidence=agg["confidence"],
        momentum=agg["momentum"],
        distribution=agg["distribution"],
        article_count=len(scored),
        sources=sources,
        top_drivers=top_drivers(scored, n=3),
        explanation=explanation,
        as_of=now,
    )

    report = TickerReport(ticker=ticker, company=company, verdict=verdict, articles=scored)
    report_cache.set(cache_key, report)
    return report


def _empty_report(ticker: str, company: Optional[str], now: int) -> TickerReport:
    verdict = Verdict(
        label="neutral",
        score=0.0,
        confidence=0.0,
        momentum=0.0,
        distribution={"bullish": 0.0, "neutral": 1.0, "bearish": 0.0},
        article_count=0,
        sources=[],
        top_drivers=[],
        explanation=explain(ticker, "neutral", 0.0, 0.0, 0.0,
                            {"bullish": 0, "neutral": 1, "bearish": 0},
                            [], company=company),
        as_of=now,
    )
    return TickerReport(ticker=ticker, company=company, verdict=verdict, articles=[])
