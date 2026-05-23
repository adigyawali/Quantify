"""
Sentiment classifier wrapper + aggregation.

We use FinBERT-tone (yiyanghkust/finbert-tone) which outputs a
probability distribution over [neutral, bullish, bearish].

This module owns:
  • lazy model loading (so import is fast and tests can stub it)
  • per-text TTL caching (FinBERT calls are expensive)
  • emoji/URL stripping before tokenization
  • signed scalar score in [-1, +1] derived from the distribution
  • weighted aggregation across many articles
  • momentum (recent 24h vs older portion of the window)
"""
from __future__ import annotations

import hashlib
import math
import re
import time
from typing import Iterable, Optional

from .cache import sentiment_cache

LABELS = ["neutral", "bullish", "bearish"]

_URL = re.compile(r"https?://\S+|www\.\S+")
_EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF]+", flags=re.UNICODE
)
_WHITESPACE = re.compile(r"\s+")

# Cap input length — FinBERT-tone uses BERT (max 512 tokens). We trim by
# characters which is conservative and avoids tokenizer initialization cost
# in the cleaner.
_MAX_CHARS = 1400

# Lazy globals so importing this module doesn't load PyTorch
_tokenizer = None
_model = None
_torch = None


def _ensure_loaded():
    """Loads FinBERT-tone on first use (slow, ~1-2s once)."""
    global _tokenizer, _model, _torch
    if _model is not None:
        return
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
    except ImportError as exc:
        raise RuntimeError(
            "FinBERT dependencies missing — install `torch` and `transformers`."
        ) from exc

    _torch = torch
    _tokenizer = AutoTokenizer.from_pretrained("yiyanghkust/finbert-tone")
    _model = AutoModelForSequenceClassification.from_pretrained("yiyanghkust/finbert-tone")
    _model.eval()


def _clean(text: str) -> str:
    if not text:
        return ""
    t = _URL.sub(" ", text)
    t = _EMOJI.sub(" ", t)
    t = _WHITESPACE.sub(" ", t).strip()
    return t[:_MAX_CHARS]


def _cache_key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest()


def _distribution_to_score(dist: dict) -> float:
    """
    Collapse the 3-class softmax into a signed scalar in [-1, +1].

    Neutral contributes 0; bullish positive; bearish negative.
    """
    return max(-1.0, min(1.0, dist["bullish"] - dist["bearish"]))


def classify_batch(texts: Iterable[str]) -> list[dict]:
    """
    Returns one result per input:
      {
        "label": "bullish" | "bearish" | "neutral",
        "score": float in [-1, +1],
        "confidence": float in [0, 1],     # max class probability
        "distribution": {"bullish":p, "neutral":p, "bearish":p}
      }
    """
    cleaned = [_clean(t) for t in texts]

    # Resolve from cache where possible
    results: list[Optional[dict]] = [None] * len(cleaned)
    todo_idx: list[int] = []
    todo_text: list[str] = []
    for i, t in enumerate(cleaned):
        if not t:
            results[i] = {
                "label": "neutral",
                "score": 0.0,
                "confidence": 0.0,
                "distribution": {"bullish": 0.0, "neutral": 1.0, "bearish": 0.0},
            }
            continue
        cached = sentiment_cache.get(_cache_key(t))
        if cached is not None:
            results[i] = cached
        else:
            todo_idx.append(i)
            todo_text.append(t)

    # Anything left → run FinBERT once for the whole batch
    if todo_text:
        _ensure_loaded()
        inputs = _tokenizer(
            todo_text, padding=True, truncation=True, max_length=512, return_tensors="pt"
        )
        with _torch.no_grad():
            outputs = _model(**inputs)
        probs = _torch.nn.functional.softmax(outputs.logits, dim=-1).cpu().numpy()
        argmax = probs.argmax(axis=1)
        for j, src_i in enumerate(todo_idx):
            p = probs[j]
            dist = {"neutral": float(p[0]), "bullish": float(p[1]), "bearish": float(p[2])}
            entry = {
                "label": LABELS[int(argmax[j])],
                "score": _distribution_to_score(dist),
                "confidence": float(p.max()),
                "distribution": dist,
            }
            results[src_i] = entry
            sentiment_cache.set(_cache_key(todo_text[j]), entry)

    return results  # type: ignore[return-value]


# ──────────────────────────────────────────────────────────────────────
# Aggregation
# ──────────────────────────────────────────────────────────────────────

def recency_weight(published_at: int, now: Optional[int] = None, half_life_hours: float = 48.0) -> float:
    """
    Exponential decay. half-life of 48h means a 2-day-old article
    counts half as much as a fresh one; 4-day-old counts a quarter.
    """
    if not published_at:
        return 0.4
    now = now or int(time.time())
    age_hours = max(0.0, (now - published_at) / 3600.0)
    return float(math.exp(-math.log(2) * age_hours / half_life_hours))


def article_impact(*, source_weight: float, recency: float, relevance: float, confidence: float) -> float:
    """
    Composite weight used both for ranking and aggregation.
    Multiplicative so any one near-zero factor zeroes the impact.
    """
    return max(0.0, min(1.0, source_weight * recency * relevance * (0.5 + 0.5 * confidence)))


def aggregate(scored_articles: list, now: Optional[int] = None) -> dict:
    """
    Aggregate signed sentiment across articles, weighted by impact.

    Returns:
      {
        "label", "score", "confidence",
        "distribution": {"bullish", "neutral", "bearish"},
        "momentum": signed delta of last-24h score vs full-window score
      }
    """
    if not scored_articles:
        return {
            "label": "neutral",
            "score": 0.0,
            "confidence": 0.0,
            "distribution": {"bullish": 0.0, "neutral": 1.0, "bearish": 0.0},
            "momentum": 0.0,
        }

    now = now or int(time.time())
    cutoff_24h = now - 24 * 3600

    total_w = 0.0
    weighted_score = 0.0
    weighted_dist = {"bullish": 0.0, "neutral": 0.0, "bearish": 0.0}

    recent_w = 0.0
    recent_score = 0.0

    for a in scored_articles:
        w = max(1e-6, a.impact)
        total_w += w
        weighted_score += a.sentiment_score * w
        for k in weighted_dist:
            weighted_dist[k] += a.distribution.get(k, 0.0) * w

        if a.published_at and a.published_at >= cutoff_24h:
            recent_w += w
            recent_score += a.sentiment_score * w

    overall_score = weighted_score / total_w
    for k in weighted_dist:
        weighted_dist[k] /= total_w

    # Label with hysteresis: require ≥0.15 magnitude to declare bull/bear,
    # AND clear dominance in the distribution. Otherwise neutral, with
    # "mixed" reserved for cases where bull and bear are both ≥ 0.30.
    bull, bear, neu = weighted_dist["bullish"], weighted_dist["bearish"], weighted_dist["neutral"]
    if bull >= 0.30 and bear >= 0.30 and abs(overall_score) < 0.20:
        label = "mixed"
    elif overall_score >= 0.15 and bull > bear:
        label = "bullish"
    elif overall_score <= -0.15 and bear > bull:
        label = "bearish"
    else:
        label = "neutral"

    # Confidence reflects (a) how concentrated the distribution is and
    # (b) how much corroborating evidence we have. Bounded in [0, 1].
    dominance = max(bull, bear, neu)
    evidence = min(1.0, math.log1p(len(scored_articles)) / math.log1p(15))
    confidence = max(0.0, min(1.0, 0.55 * dominance + 0.45 * evidence))

    momentum = (recent_score / recent_w - overall_score) if recent_w > 0 else 0.0

    return {
        "label": label,
        "score": float(overall_score),
        "confidence": float(confidence),
        "distribution": {k: float(v) for k, v in weighted_dist.items()},
        "momentum": float(momentum),
    }
