"""
Source quality weights.

Tier 1 (1.00) — primary wire & flagship financial press.
Tier 2 (0.80) — strong financial outlets.
Tier 3 (0.60) — general business / mainstream business desks.
Tier 4 (0.40) — niche/blog/aggregator quality.
Tier 5 (0.20) — unknown / low signal.

We match by substring (case-insensitive) so feed-name variants
("seekingalpha.com" vs "Seeking Alpha") map correctly.
"""

_TIERS = [
    # Tier 1 — wire services and flagship financial press
    (1.00, [
        "reuters", "bloomberg", "the wall street journal", "wsj",
        "financial times", "ft.com",
    ]),
    # Tier 2 — strong dedicated financial outlets
    (0.80, [
        "cnbc", "barron", "marketwatch", "morningstar", "investor's business daily",
        "ibdinvestors", "investopedia", "fortune", "the economist", "businessweek",
    ]),
    # Tier 3 — mainstream business desks
    (0.60, [
        "associated press", "ap news", "yahoo finance", "yahoo!", "forbes",
        "guardian", "new york times", "nyt", "washington post", "bbc",
        "axios", "quartz", "the verge", "techcrunch",
    ]),
    # Tier 4 — niche / community / aggregator
    (0.40, [
        "seeking alpha", "seekingalpha", "zacks", "the motley fool", "fool.com",
        "benzinga", "investorplace", "thestreet", "247wallst", "247 wall st",
        "gurufocus", "simplywallst", "tipranks",
    ]),
]

_DEFAULT_WEIGHT = 0.30


def source_weight(source: str) -> float:
    if not source:
        return _DEFAULT_WEIGHT
    s = source.lower()
    for weight, needles in _TIERS:
        if any(n in s for n in needles):
            return weight
    return _DEFAULT_WEIGHT


def source_tier_label(weight: float) -> str:
    if weight >= 0.95:
        return "Tier 1 · Primary"
    if weight >= 0.75:
        return "Tier 2 · Strong"
    if weight >= 0.55:
        return "Tier 3 · Mainstream"
    if weight >= 0.35:
        return "Tier 4 · Niche"
    return "Tier 5 · Unverified"
