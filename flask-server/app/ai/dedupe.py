"""
Near-duplicate detection for news articles.

Two articles count as duplicates when their normalized headlines
share a high proportion of meaningful tokens (Jaccard ≥ 0.72) or
their headlines are identical after stopword removal.

When we collapse a duplicate group we keep the article with the
highest combined (source_weight × relevance) so the canonical
version is the most credible one.
"""
import re

_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "for", "to",
    "with", "by", "from", "as", "is", "are", "was", "were", "be", "been",
    "this", "that", "these", "those", "it", "its", "as", "than", "then",
    "after", "before", "over", "under", "into", "amid", "amidst", "via",
    "says", "say", "said", "reports", "report", "according", "stock", "stocks",
    "shares", "share", "company", "inc", "corp", "co", "ltd", "plc", "group",
    "update", "updates", "news", "today", "yesterday",
}

_TOKEN = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return {w for w in _TOKEN.findall((text or "").lower()) if len(w) > 2 and w not in _STOPWORDS}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def dedupe_articles(scored_articles: list, threshold: float = 0.62) -> list:
    """
    Greedy single-pass clustering. Articles are first sorted by quality
    (source_weight × relevance) descending so the strongest article in
    each near-dup group wins.
    """
    if not scored_articles:
        return []

    ranked = sorted(
        scored_articles,
        key=lambda a: (getattr(a, "source_weight", 0.0) * getattr(a, "relevance", 0.0)),
        reverse=True,
    )

    kept = []
    kept_tokens: list[set] = []

    for art in ranked:
        toks = _tokens(getattr(art, "headline", "") or "")
        is_dup = False
        for existing in kept_tokens:
            if _jaccard(toks, existing) >= threshold:
                is_dup = True
                break
        if not is_dup:
            kept.append(art)
            kept_tokens.append(toks)

    return kept
