"""
Схемы индекса здоровья локомотива.
"""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field
import time


class HealthGrade(str, Enum):
    A = "A"  # 80–100 — Норма
    B = "B"  # 60–79  — Хорошо
    C = "C"  # 40–59  — Внимание
    D = "D"  # 20–39  — Плохо
    E = "E"  # 0–19   — Критично


class HealthFactor(BaseModel):
    """Один фактор, влияющий на индекс здоровья."""
    param_id: str = Field(..., description="ID параметра")
    label: str = Field(..., description="Человекочитаемое название")
    value: float = Field(..., description="Текущее значение параметра")
    unit: str = Field(default="", description="Единица измерения")
    normalized: float = Field(..., ge=0, le=1, description="Нормализованное значение [0,1]")
    weight: float = Field(..., ge=0, le=1, description="Вес в группе")
    contribution: float = Field(..., description="Вклад в итоговый индекс (отрицательный = штраф)")
    group: str = Field(..., description="Группа: traction/resources/nodes/brakes/alerts")
    status: str = Field(..., description="ok / warning / critical")


class GroupScore(BaseModel):
    """Итоговый балл по группе параметров."""
    group: str
    score: float = Field(..., ge=0, le=100)
    weight: float


class HealthIndex(BaseModel):
    """Полный индекс здоровья локомотива."""
    loco_id: str
    loco_type: str
    timestamp: float = Field(default_factory=time.time)
    index: float = Field(..., ge=0, le=100, description="Индекс здоровья 0–100")
    grade: HealthGrade
    group_scores: list[GroupScore] = Field(default_factory=list)
    top_factors: list[HealthFactor] = Field(
        default_factory=list, description="Топ-5 факторов с наибольшим негативным вкладом"
    )
    alert_penalty: float = Field(default=0.0, description="Суммарный штраф за алерты")


class HealthHistory(BaseModel):
    """Историческая запись индекса здоровья."""
    timestamp: float
    index: float
    grade: HealthGrade


def grade_from_index(index: float) -> HealthGrade:
    if index >= 80:
        return HealthGrade.A
    elif index >= 60:
        return HealthGrade.B
    elif index >= 40:
        return HealthGrade.C
    elif index >= 20:
        return HealthGrade.D
    else:
        return HealthGrade.E
