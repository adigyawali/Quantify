"""
Relevance filter.

An article is relevant to a ticker if it:
  1. mentions the ticker symbol (e.g. AAPL, $AAPL, (AAPL))
  2. mentions the company name (or a normalized variant)
  3. mentions a known alias / common short name

Articles that satisfy none of the above get a low relevance score
and are typically dropped before sentiment is even computed.
"""
import re

# Common suffixes to strip when normalizing company names so
# "Apple Inc." matches "Apple" in a headline.
_NAME_SUFFIXES = re.compile(
    r"\b(inc\.?|incorporated|corp\.?|corporation|co\.?|company|"
    r"plc|n\.?v\.?|s\.?a\.?|ltd\.?|limited|holdings?|group|"
    r"the|class [abc]|common stock|adr)\b",
    re.IGNORECASE,
)
_NON_ALPHA = re.compile(r"[^a-z0-9 ]+")

# Curated aliases. Map ticker -> list of additional names worth matching.
_ALIASES: dict[str, list[str]] = {
    "GOOGL": ["alphabet", "google"],
    "GOOG":  ["alphabet", "google"],
    "META":  ["facebook", "instagram", "whatsapp", "mark zuckerberg"],
    "TSLA":  ["elon musk"],
    "BRK.A": ["berkshire", "warren buffett"],
    "BRK.B": ["berkshire", "warren buffett"],
    "NVDA":  ["nvidia", "jensen huang"],
    "AAPL":  ["iphone", "ipad", "mac", "tim cook"],
    "MSFT":  ["microsoft", "windows", "azure", "satya nadella"],
    "AMZN":  ["amazon", "aws", "jeff bezos", "andy jassy"],
    "JPM":   ["jpmorgan", "jp morgan"],
    "BAC":   ["bank of america"],
    "BABA":  ["alibaba"],
    "TSM":   ["taiwan semiconductor", "tsmc"],
    "SPY":   ["s&p 500", "spdr"],
    "QQQ":   ["nasdaq 100"],
    "DIA":   ["dow jones"],
}


def _normalize(text: str) -> str:
    return _NON_ALPHA.sub(" ", text.lower())


def normalize_company(name: str) -> str:
    """Strip corporate suffixes — used both at match and storage time."""
    if not name:
        return ""
    stripped = _NAME_SUFFIXES.sub(" ", name)
    return " ".join(stripped.split()).strip()


def _ticker_patterns(ticker: str) -> list[re.Pattern]:
    t = re.escape(ticker.upper())
    return [
        re.compile(rf"\b\${t}\b"),                # $AAPL
        re.compile(rf"\b{t}\b"),                  # AAPL bare
        re.compile(rf"\(\s*{t}\s*[:.,)]"),        # (AAPL)
        re.compile(rf"\bnasdaq[:\s]+{t}\b", re.IGNORECASE),
        re.compile(rf"\bnyse[:\s]+{t}\b", re.IGNORECASE),
    ]


def relevance_score(headline: str, summary: str, ticker: str, company: str | None) -> float:
    """
    Returns a value in [0, 1].

    A score below ~0.25 is "incidental mention or off-topic"
    and the article should be dropped from sentiment aggregation.
    """
    text_raw = f"{headline or ''} {summary or ''}"
    text = _normalize(text_raw)
    if not text.strip():
        return 0.0

    score = 0.0
    hits = 0

    # 1. Strong ticker patterns
    for pat in _ticker_patterns(ticker):
        if pat.search(text_raw):
            score += 0.55
            hits += 1
            break

    # 2. Bare ticker as a token (case-insensitive) — fallback if regex above missed
    if hits == 0:
        if re.search(rf"\b{re.escape(ticker.lower())}\b", text):
            score += 0.35
            hits += 1

    # 3. Company name
    if company:
        normalized = _normalize(normalize_company(company))
        tokens = [t for t in normalized.split() if len(t) >= 3]
        if tokens:
            full_hit = re.search(rf"\b{re.escape(normalized)}\b", text) is not None
            partial_hit = sum(1 for t in tokens if re.search(rf"\b{re.escape(t)}\b", text)) >= max(1, len(tokens) // 2)
            if full_hit:
                score += 0.45
                hits += 1
            elif partial_hit:
                score += 0.25
                hits += 1

    # 4. Aliases
    for alias in _ALIASES.get(ticker.upper(), []):
        if re.search(rf"\b{re.escape(alias.lower())}\b", text):
            score += 0.20
            hits += 1
            break  # only one alias bonus

    # 5. Headline-position bonus — mentions in the headline are stronger signal
    headline_norm = _normalize(headline or "")
    if headline_norm:
        if re.search(rf"\b{re.escape(ticker.lower())}\b", headline_norm) or (
            company and re.search(rf"\b{re.escape(_normalize(normalize_company(company)).split()[0])}\b", headline_norm)
        ):
            score += 0.15

    return max(0.0, min(score, 1.0))
