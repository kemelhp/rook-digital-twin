"""
Схемы алертов и рекомендаций.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import time


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertStatus(str, Enum):
    active = "active"
    resolved = "resolved"


class Alert(BaseModel):
    """Алерт по конкретному параметру."""
    alert_id: str = Field(..., description="Уникальный ID алерта")
    loco_id: str
    loco_type: str
    param_id: str = Field(..., description="ID параметра, вызвавшего алерт")
    label: str = Field(..., description="Человекочитаемое название параметра")
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.active
    value: float = Field(..., description="Текущее значение")
    threshold: float = Field(..., description="Порог, который был превышен")
    unit: str = Field(default="")
    message: str = Field(..., description="Описание проблемы")
    recommendation: str = Field(default="", description="Рекомендованное действие")
    penalty: float = Field(default=5.0, description="Штраф к индексу здоровья")
    triggered_at: float = Field(default_factory=time.time)
    resolved_at: Optional[float] = None


class AlertSummary(BaseModel):
    """Краткая сводка по активным алертам."""
    loco_id: str
    total: int
    critical: int
    warning: int
    info: int
    alerts: list[Alert]


Alert.model_rebuild()
