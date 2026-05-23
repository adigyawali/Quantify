"""
Natural-language explanation generator.

Deterministic, templated — no LLM call required. It looks at the
top-impact drivers, the distribution, momentum, and source mix to
produce a 1–3 sentence rationale that always reflects the actual
underlying numbers (not a hallucination).
"""
from collections import Counter

_LABEL_PHRASES = {
    "bullish": "leans bullish",
    "bearish": "leans bearish",
    "neutral": "is neutral",
    "mixed":   "is mixed — significant signal on both sides",
}

_MOMENTUM_PHRASES = {
    "strong_up":   "and recent 24h headlines are even more positive",
    "up":          "with a slight positive shift in the last 24h",
    "flat":        "with little change in the last 24h",
    "down":        "with a slight negative shift in the last 24h",
    "strong_down": "and recent 24h headlines have turned notably more negative",
}


def _momentum_bucket(m: float) -> str:
    if m >= 0.20:  return "strong_up"
    if m >= 0.05:  return "up"
    if m <= -0.20: return "strong_down"
    if m <= -0.05: return "down"
    return "flat"


def explain(ticker: str, verdict_label: str, score: float, confidence: float,
            momentum: float, distribution: dict, articles: list,
            company: str | None = None) -> str:
    """
    `articles` is a list of ScoredArticle, already sorted by impact desc.
    Returns a short paragraph (no markdown).
    """
    if not articles:
        return (
            f"No analyzable headlines were found for {ticker} in the last week. "
            "Sentiment is reported as neutral by default — try again later as news flows in."
        )

    bull = distribution.get("bullish", 0.0)
    bear = distribution.get("bearish", 0.0)
    pct_b = round(bull * 100)
    pct_r = round(bear * 100)
    pct_n = max(0, 100 - pct_b - pct_r)

    sources = Counter(a.source for a in articles[:10] if a.source)
    top_sources = [s for s, _ in sources.most_common(3)]
    src_phrase = ""
    if top_sources:
        if len(top_sources) == 1:
            src_phrase = f" via {top_sources[0]}"
        else:
            src_phrase = f" via {', '.join(top_sources[:-1])} and {top_sources[-1]}"

    label_phrase = _LABEL_PHRASES.get(verdict_label, _LABEL_PHRASES["neutral"])
    momentum_phrase = _MOMENTUM_PHRASES[_momentum_bucket(momentum)]

    who = company or ticker
    n = len(articles)

    sentence_1 = (
        f"Sentiment for {who} {label_phrase} "
        f"({pct_b}% bullish · {pct_n}% neutral · {pct_r}% bearish across {n} headlines), "
        f"{momentum_phrase}."
    )

    # Driver sentence — name the top supporting article if confidence is meaningful
    sentence_2 = ""
    driver = next(
        (a for a in articles if a.sentiment_label == verdict_label and a.impact > 0.15),
        None,
    )
    if driver:
        snippet = (driver.headline or "").strip().rstrip(".")
        if snippet:
            sentence_2 = f' Strongest driver: "{snippet}"{src_phrase}.'
    elif src_phrase:
        sentence_2 = f" Coverage{src_phrase}."

    # Confidence caveat
    if confidence < 0.45:
        sentence_3 = " Confidence is low — treat this as a soft signal."
    elif confidence < 0.65:
        sentence_3 = " Confidence is moderate."
    else:
        sentence_3 = ""

    return (sentence_1 + sentence_2 + sentence_3).strip()


def top_drivers(articles: list, n: int = 3) -> list:
    """Return the top-N impactful headlines for display."""
    out = []
    for a in articles[:n]:
        out.append({
            "headline": a.headline,
            "source": a.source,
            "sentiment": a.sentiment_label,
            "impact": round(a.impact, 3),
            "url": a.url,
        })
    return out
