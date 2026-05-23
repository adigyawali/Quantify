"""
Sentivest AI pipeline.

A clean, modular news-and-sentiment system designed for accuracy,
explainability, and production-grade reliability.
"""
from .pipeline import analyze_ticker
from .symbols import search_symbols, get_company_name, list_trending

__all__ = ["analyze_ticker", "search_symbols", "get_company_name", "list_trending"]
