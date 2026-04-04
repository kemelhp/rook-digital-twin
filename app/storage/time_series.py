"""
In-memory хранилище телеметрии и индексов здоровья (до 72 часов).
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any

from app.models.alerts import Alert
from app.models.health_index import HealthHistory, HealthIndex
from app.models.telemetry import TelemetryFrame


RETENTION_SECONDS = 72 * 3600  # 72 часа


@dataclass
class TimeSeriesStore:
    """Хранилище для одного локомотива."""

    loco_id: str
    telemetry: deque[TelemetryFrame] = field(default_factory=lambda: deque(maxlen=259_200))  # ~72ч при 1 Гц
    health: deque[HealthIndex] = field(default_factory=lambda: deque(maxlen=259_200))
    alerts: deque[Alert] = field(default_factory=lambda: deque(maxlen=50_000))

    def push_telemetry(self, frame: TelemetryFrame) -> None:
        self.telemetry.append(frame)

    def push_health(self, hi: HealthIndex) -> None:
        self.health.append(hi)

    def push_alert(self, alert: Alert) -> None:
        self.alerts.append(alert)

    def get_telemetry(self, from_ts: float | None = None, to_ts: float | None = None) -> list[TelemetryFrame]:
        frames = list(self.telemetry)
        if from_ts is not None:
            frames = [f for f in frames if f.timestamp >= from_ts]
        if to_ts is not None:
            frames = [f for f in frames if f.timestamp <= to_ts]
        return frames

    def get_health_history(self, from_ts: float | None = None, to_ts: float | None = None) -> list[HealthHistory]:
        records = list(self.health)
        if from_ts is not None:
            records = [r for r in records if r.timestamp >= from_ts]
        if to_ts is not None:
            records = [r for r in records if r.timestamp <= to_ts]
        return [HealthHistory(timestamp=r.timestamp, index=r.index, grade=r.grade) for r in records]

    def get_current_health(self) -> HealthIndex | None:
        return self.health[-1] if self.health else None

    def get_alerts(self, active_only: bool = False) -> list[Alert]:
        alerts = list(self.alerts)
        if active_only:
            alerts = [a for a in alerts if a.status == "active"]
        return alerts

    def get_replay(self, minutes: int = 5) -> list[TelemetryFrame]:
        cutoff = time.time() - minutes * 60
        return [f for f in self.telemetry if f.timestamp >= cutoff]

    def purge_old(self) -> None:
        """Удаляет записи старше RETENTION_SECONDS."""
        cutoff = time.time() - RETENTION_SECONDS
        # deque с maxlen обрезает автоматически, но алерты — без maxlen ограничения по времени
        while self.alerts and self.alerts[0].triggered_at < cutoff:
            self.alerts.popleft()


class InMemoryStorage:
    """Глобальное хранилище для всех локомотивов."""

    def __init__(self) -> None:
        self._stores: dict[str, TimeSeriesStore] = {}

    def get_or_create(self, loco_id: str) -> TimeSeriesStore:
        if loco_id not in self._stores:
            self._stores[loco_id] = TimeSeriesStore(loco_id=loco_id)
        return self._stores[loco_id]

    def list_locos(self) -> list[str]:
        return list(self._stores.keys())


# Singleton
storage = InMemoryStorage()
