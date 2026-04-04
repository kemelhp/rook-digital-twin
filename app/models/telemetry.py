"""
Pydantic-схемы телеметрии для локомотивов KZ8A и ТЭ33А.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import time


class LocoType(str, Enum):
    KZ8A = "KZ8A"
    TE33A = "TE33A"


class SignalStatus(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


class ConnectionStatus(str, Enum):
    connected = "connected"
    disconnected = "disconnected"


class FanStatus(str, Enum):
    running = "running"
    stopped = "stopped"
    fault = "fault"


# ---------------------------------------------------------------------------
# Общие параметры (оба типа)
# ---------------------------------------------------------------------------

class TractionParams(BaseModel):
    """Тяга и движение — общие для обоих локомотивов."""
    speed: float = Field(..., ge=0, le=120, description="Скорость, км/ч")
    tractive_effort: float = Field(..., ge=0, description="Тяговое усилие, кН")
    traction_motor_current: list[float] = Field(
        ..., description="Ток ТЭД по осям, А"
    )
    controller_position: int = Field(..., ge=0, le=8, description="Позиция контроллера, ступень")
    brake_pipe_pressure: float = Field(..., ge=0, le=600, description="Давление тормозной магистрали, кПа")
    brake_cylinder_pressure: float = Field(..., ge=0, le=400, description="Давление тормозных цилиндров, кПа")
    brake_force: float = Field(..., ge=0, le=500, description="Тормозное усилие, кН")


class NodeMonitoringParams(BaseModel):
    """Мониторинг узлов — общие для обоих локомотивов."""
    motor_temperatures: list[float] = Field(
        ..., description="Температура обмоток ТЭД по осям, °C"
    )
    axle_bearing_temps: list[float] = Field(
        ..., description="Температура осевых подшипников, °C"
    )
    cooling_fan_statuses: list[FanStatus] = Field(
        ..., description="Статус вентиляторов охлаждения"
    )
    error_codes: list[str] = Field(default_factory=list, description="Коды ошибок (DTC)")
    active_alerts: list[str] = Field(default_factory=list, description="Активные предупреждения")


class NavigationParams(BaseModel):
    """Контекст и навигация."""
    latitude: float = Field(..., ge=-90, le=90, description="Широта GPS, °")
    longitude: float = Field(..., ge=-180, le=180, description="Долгота GPS, °")
    odometer: float = Field(..., ge=0, description="Пройденный путь, км")
    route_section: str = Field(..., description="Участок пути")
    speed_limit: float = Field(..., ge=0, le=120, description="Ограничение скорости, км/ч")
    signal_status: SignalStatus = Field(..., description="Показание светофора")
    connection_status: ConnectionStatus = Field(..., description="Статус связи")


# ---------------------------------------------------------------------------
# KZ8A — параметры электровоза
# ---------------------------------------------------------------------------

class KZ8AResourceParams(BaseModel):
    """Ресурсы / энергия — только KZ8A."""
    catenary_voltage: float = Field(..., ge=19, le=29, description="Напряжение КС, кВ")
    dc_bus_voltage: float = Field(..., ge=1500, le=2000, description="Напряжение шины DC, В")
    igbt_current: float = Field(..., ge=0, le=1200, description="Ток IGBT-инвертора, А")
    regen_power: float = Field(..., ge=0, le=7600, description="Мощность рекуперации, кВт")
    traction_power: float = Field(..., ge=0, le=8800, description="Тяговая мощность, кВт")
    aux_voltage: float = Field(..., ge=380, le=420, description="Напряжение бортовых подсистем, В")
    battery_voltage: float = Field(..., ge=90, le=130, description="Напряжение АКБ, В")
    transformer_temp: float = Field(..., ge=-50, le=150, description="Температура трансформатора, °C")


class KZ8ATelemetry(BaseModel):
    """Полная телеметрия KZ8A."""
    loco_type: LocoType = LocoType.KZ8A
    loco_id: str = Field(..., description="Идентификатор локомотива")
    timestamp: float = Field(default_factory=time.time, description="Unix timestamp")
    traction: TractionParams
    resources: KZ8AResourceParams
    nodes: NodeMonitoringParams
    navigation: NavigationParams
    scenario: str = Field(default="normal", description="Текущий сценарий симулятора")


# ---------------------------------------------------------------------------
# ТЭ33А — параметры тепловоза
# ---------------------------------------------------------------------------

class TE33AResourceParams(BaseModel):
    """Ресурсы / двигатель — только ТЭ33А."""
    fuel_level: float = Field(..., ge=0, le=100, description="Уровень топлива, %")
    fuel_consumption: float = Field(..., ge=0, le=600, description="Расход топлива, л/ч")
    fuel_temperature: float = Field(..., ge=-40, le=80, description="Температура топлива, °C")
    fuel_pressure: float = Field(..., ge=200, le=800, description="Давление топлива, кПа")
    oil_pressure: float = Field(..., ge=0, le=700, description="Давление масла, кПа")
    oil_temperature: float = Field(..., ge=-40, le=130, description="Температура масла, °C")
    engine_rpm: float = Field(..., ge=0, le=1050, description="Обороты дизеля, об/мин")
    turbo_rpm: float = Field(..., ge=0, le=90000, description="Обороты турбокомпрессора, об/мин")
    turbo_boost_pressure: float = Field(..., ge=0, le=350, description="Давление наддува, кПа")
    exhaust_temperature: float = Field(..., ge=100, le=700, description="Температура выхлопа, °C")
    coolant_temperature: float = Field(..., ge=-40, le=110, description="Температура ОЖ, °C")
    water_in_fuel: bool = Field(default=False, description="Наличие воды в топливе")
    battery_voltage: float = Field(..., ge=50, le=80, description="Напряжение АКБ, В")


class TE33ATelemetry(BaseModel):
    """Полная телеметрия ТЭ33А."""
    loco_type: LocoType = LocoType.TE33A
    loco_id: str = Field(..., description="Идентификатор локомотива")
    timestamp: float = Field(default_factory=time.time, description="Unix timestamp")
    traction: TractionParams
    resources: TE33AResourceParams
    nodes: NodeMonitoringParams
    navigation: NavigationParams
    scenario: str = Field(default="normal", description="Текущий сценарий симулятора")


# ---------------------------------------------------------------------------
# Union-тип для унификации в API
# ---------------------------------------------------------------------------

TelemetryFrame = KZ8ATelemetry | TE33ATelemetry
