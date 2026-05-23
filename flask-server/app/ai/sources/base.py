"""
Pluggable news-source interface.

Every adapter implements `fetch(ticker, days)` returning a list of
RawArticle. Sources are composed by the pipeline — failures in one
do not fail the request, they just contribute zero articles.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from ..models import RawArticle


class NewsSource(ABC):
    name: str = "base"

    @abstractmethod
    def fetch(self, ticker: str, days: int = 7) -> list[RawArticle]:
        ...

    def __repr__(self) -> str:  # pragma: no cover
        return f"<NewsSource {self.name}>"
