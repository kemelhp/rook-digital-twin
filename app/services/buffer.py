"""
Кольцевой буфер телеметрии с EMA-сглаживанием.
"""

from __future__ import annotations

from collections import deque
from typing import Generic, TypeVar

T = TypeVar("T")


class RingBuffer(Generic[T]):
    """Ограниченный по размеру кольцевой буфер."""

    def __init__(self, maxlen: int) -> None:
        self._buf: deque[T] = deque(maxlen=maxlen)

    def push(self, item: T) -> None:
        self._buf.append(item)

    def last(self, n: int | None = None) -> list[T]:
        if n is None:
            return list(self._buf)
        return list(self._buf)[-n:]

    def __len__(self) -> int:
        return len(self._buf)

    def clear(self) -> None:
        self._buf.clear()


class EMAFilter:
    """
    Экспоненциально взвешенное скользящее среднее.
    alpha близко к 1.0 — быстрое следование, близко к 0.0 — сильное сглаживание.
    """

    def __init__(self, alpha: float = 0.2) -> None:
        if not (0.0 < alpha <= 1.0):
            raise ValueError("alpha must be in (0, 1]")
        self.alpha = alpha
        self._value: float | None = None

    def update(self, new_value: float) -> float:
        if self._value is None:
            self._value = new_value
        else:
            self._value = self.alpha * new_value + (1.0 - self.alpha) * self._value
        return self._value

    @property
    def value(self) -> float | None:
        return self._value

    def reset(self) -> None:
        self._value = None
