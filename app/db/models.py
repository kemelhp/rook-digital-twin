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
    ForeignKey,
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

    __table_args__ = (Index("ix_telemetry_loco_ts", "loco_id", "ts"),)


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

    __table_args__ = (Index("ix_health_loco_ts", "loco_id", "ts"),)


class AlertRecord(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    loco_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    loco_type: Mapped[str] = mapped_column(String(16), nullable=False)
    param_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active", index=True
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    penalty: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (Index("ix_alerts_loco_status", "loco_id", "status"),)


class LocomotiveRecord(Base):
    __tablename__ = "locomotives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    loco_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    loco_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(320), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(
        String(16), nullable=False, default="viewer", index=True
    )
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    password_salt: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class UserSessionRecord(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (Index("ix_user_sessions_user_expires", "user_id", "expires_at"),)
