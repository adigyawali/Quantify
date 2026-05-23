"""
US equity market state — open / closed / pre / after.

Uses zoneinfo (stdlib) so we don't pull in pytz. All decisions are made
in America/New_York time. Holidays are an approximation good enough for
display purposes; we don't trade off this code.
"""
from __future__ import annotations

from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")

# Regular session
_OPEN = time(9, 30)
_CLOSE = time(16, 0)
# Extended hours surfaced as "Pre" / "After"
_PRE_OPEN = time(4, 0)
_AFTER_CLOSE = time(20, 0)


def _us_holidays(year: int) -> set[date]:
    """
    Approximate set of NYSE holidays for the given year.
    Calculated, not hard-coded, so it stays valid year-over-year.
    """
    h: set[date] = set()

    def nth_weekday(month: int, weekday: int, n: int) -> date:
        d = date(year, month, 1)
        # weekday(): Mon=0 .. Sun=6
        delta = (weekday - d.weekday()) % 7
        return d + timedelta(days=delta + (n - 1) * 7)

    def last_weekday(month: int, weekday: int) -> date:
        # Last <weekday> of <month>
        if month == 12:
            d = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            d = date(year, month + 1, 1) - timedelta(days=1)
        while d.weekday() != weekday:
            d -= timedelta(days=1)
        return d

    def observed(d: date) -> date:
        if d.weekday() == 5:   # Saturday → observed Friday
            return d - timedelta(days=1)
        if d.weekday() == 6:   # Sunday → observed Monday
            return d + timedelta(days=1)
        return d

    h.add(observed(date(year, 1, 1)))                 # New Year's Day
    h.add(nth_weekday(1, 0, 3))                       # MLK day (3rd Mon Jan)
    h.add(nth_weekday(2, 0, 3))                       # Presidents Day (3rd Mon Feb)
    h.add(last_weekday(5, 0))                         # Memorial Day (last Mon May)
    h.add(observed(date(year, 6, 19)))                # Juneteenth
    h.add(observed(date(year, 7, 4)))                 # Independence Day
    h.add(nth_weekday(9, 0, 1))                       # Labor Day (1st Mon Sep)
    h.add(nth_weekday(11, 3, 4))                      # Thanksgiving (4th Thu Nov)
    h.add(observed(date(year, 12, 25)))               # Christmas
    # Good Friday is hard without a Western Easter calculator; omitted intentionally.
    return h


def now_ny() -> datetime:
    return datetime.now(NY)


def market_state(now: datetime | None = None) -> dict:
    """
    Returns:
      {
        state: 'open' | 'pre' | 'after' | 'closed',
        label: human-readable,
        next_open_ts: epoch seconds (UTC) when market next opens (closed/after-hours only)
      }
    """
    if now is None:
        now = now_ny()
    elif now.tzinfo is None:
        now = now.replace(tzinfo=NY)
    else:
        now = now.astimezone(NY)

    today = now.date()
    is_weekend = today.weekday() >= 5
    is_holiday = today in _us_holidays(today.year)
    t = now.time()

    if is_weekend or is_holiday:
        state, label = "closed", "Market closed"
    elif _OPEN <= t < _CLOSE:
        state, label = "open", "Market open"
    elif _PRE_OPEN <= t < _OPEN:
        state, label = "pre", "Pre-market"
    elif _CLOSE <= t < _AFTER_CLOSE:
        state, label = "after", "After hours"
    else:
        state, label = "closed", "Market closed"

    return {
        "state": state,
        "label": label,
        "ny_time": now.isoformat(),
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
    }


def last_trading_day(now: datetime | None = None) -> date:
    """Most recent date the US market was (or is) open."""
    if now is None:
        now = now_ny()
    d = now.date()
    # If we're before today's open, last trading day is the previous one
    if now.time() < _OPEN:
        d -= timedelta(days=1)
    holidays = _us_holidays(d.year)
    while d.weekday() >= 5 or d in holidays:
        d -= timedelta(days=1)
        if d.year != now.year:
            holidays = _us_holidays(d.year)
    return d


def session_bounds(trading_day: date) -> tuple[int, int]:
    """
    Return (from_ts, to_ts) in UTC epoch seconds covering the regular session
    plus a small pre/post buffer so we capture extended-hours bars when the
    user views them.
    """
    start_ny = datetime.combine(trading_day, _PRE_OPEN, tzinfo=NY)
    end_ny = datetime.combine(trading_day, _AFTER_CLOSE, tzinfo=NY)
    return int(start_ny.timestamp()), int(end_ny.timestamp())
