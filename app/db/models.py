"""
SQLAlchemy ORM models.

Стратегия хранения:
  - telemetry  → полный фрейм как JSONB + индексированные скалярные поля
  - health     → индекс + grade + top_factors JSONB
  - alerts     → все поля нативно (нужен поиск/фильтрация)
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.engine import Base


class TelemetryRecord(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    loco_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    loco_type: Mapped[str] = mapped_column(String(16), nullable=False)
    scenario: Mapped[str] = mapped_column(String(32), nullable=False, default="normal")
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    # Быстрые скалярные поля для фильтрации без парсинга JSON
    speed: Mapped[float] = mapped_column(Float, nullable=False)
    health_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Полный фрейм
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    __table_args__ = (
        Index("ix_telemetry_loco_ts", "loco_id", "ts"),
    )


class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    loco_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    loco_type: Mapped[str] = mapped_column(String(16), nullable=False)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    index: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(1), nullable=False)
    alert_penalty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    group_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    top_factors: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    __table_args__ = (
        Index("ix_health_loco_ts", "loco_id", "ts"),
    )


class AlertRecord(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    loco_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    loco_type: Mapped[str] = mapped_column(String(16), nullable=False)
    param_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    penalty: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_alerts_loco_status", "loco_id", "status"),
    )
