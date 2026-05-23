"""
Immutable data model for the AI pipeline.

Everything that flows through the pipeline is one of these shapes,
which keeps the interfaces between stages obvious and testable.
"""
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class RawArticle:
    """Article as it comes off the wire from a news source."""
    headline: str
    summary: str
    url: str
    source: str
    published_at: int       # unix seconds
    provider: str           # e.g. "finnhub"


@dataclass
class ScoredArticle:
    """A relevant, deduped, sentiment-scored article."""
    headline: str
    summary: str
    url: str
    source: str
    published_at: int

    # Sentiment from the classifier
    sentiment_label: str            # "bullish" | "bearish" | "neutral"
    sentiment_score: float          # signed strength in [-1, +1]
    sentiment_confidence: float     # softmax max in [0, 1]
    distribution: dict              # {"bullish": p, "neutral": p, "bearish": p}

    # Pipeline-derived weights in [0, 1]
    relevance: float                # how on-topic for the ticker
    source_weight: float            # credibility weight
    recency_weight: float           # exponential decay by age
    impact: float                   # composite score driving aggregation

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Verdict:
    """Aggregate sentiment for a single ticker."""
    label: str                 # "bullish" | "bearish" | "neutral" | "mixed"
    score: float               # signed [-1..+1]
    confidence: float          # [0..1]
    momentum: float            # signed change in last 24h vs 7d
    distribution: dict         # bullish/neutral/bearish weights (sum 1.0)
    article_count: int
    sources: list              # top sources contributing
    top_drivers: list          # headlines with highest |impact|
    explanation: str           # human-readable rationale
    as_of: int                 # unix seconds


@dataclass
class TickerReport:
    """Final report returned by the pipeline."""
    ticker: str
    company: Optional[str]
    verdict: Verdict
    articles: list = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "ticker": self.ticker,
            "company": self.company,
            "verdict": asdict(self.verdict),
            "articles": [a.to_dict() for a in self.articles],
        }
