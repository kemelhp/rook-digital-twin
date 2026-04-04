"""
Генератор мок-телеметрии для локомотивов KZ8A и ТЭ33А.

Поддерживает следующие сценарии:
  normal       — нормальная работа
  acceleration — разгон
  braking      — торможение
  highload     — x10 событий/сек (нагрузочный тест)
  overheat     — перегрев узлов
  fuel_low     — низкий топливный уровень (только ТЭ33А)
  voltage_drop — просадка напряжения сети (только KZ8A)
  emergency    — аварийный режим, множественные алерты
"""

from __future__ import annotations

import asyncio
import math
import random
import time
import uuid
from typing import AsyncGenerator

from app.models.telemetry import (
    FanStatus,
    KZ8AResourceParams,
    KZ8ATelemetry,
    LocoType,
    NavigationParams,
    NodeMonitoringParams,
    SignalStatus,
    TE33AResourceParams,
    TE33ATelemetry,
    TelemetryFrame,
    TractionParams,
)

# ---------------------------------------------------------------------------
# Маршрут симулятора: Астана → Алматы (Казахстан)
# ---------------------------------------------------------------------------

ROUTE_WAYPOINTS = [
    (51.1694, 71.4491),   # Астана
    (50.9000, 71.9000),
    (50.4000, 72.5000),
    (49.8047, 73.1094),   # Караганда
    (49.2000, 73.8000),
    (48.5000, 74.5000),
    (47.8000, 75.3000),
    (43.2220, 76.8512),   # Алматы
]
ROUTE_TOTAL_KM = 1310.0  # Астана → Алматы ≈ 1310 км


def _interpolate_route(progress: float) -> tuple[float, float]:
    """Линейная интерполяция координат по прогрессу [0,1]."""
    if progress <= 0:
        return ROUTE_WAYPOINTS[0]
    if progress >= 1:
        return ROUTE_WAYPOINTS[-1]

    n = len(ROUTE_WAYPOINTS) - 1
    segment_len = 1.0 / n
    seg_idx = int(progress / segment_len)
    seg_idx = min(seg_idx, n - 1)
    local_t = (progress - seg_idx * segment_len) / segment_len

    lat0, lon0 = ROUTE_WAYPOINTS[seg_idx]
    lat1, lon1 = ROUTE_WAYPOINTS[seg_idx + 1]
    return lat0 + (lat1 - lat0) * local_t, lon0 + (lon1 - lon0) * local_t


# ---------------------------------------------------------------------------
# Утилиты
# ---------------------------------------------------------------------------

def _jitter(value: float, pct: float = 0.02) -> float:
    """Добавляет случайный шум ±pct% к значению."""
    return value * (1.0 + random.uniform(-pct, pct))


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _smooth(prev: float, target: float, alpha: float = 0.15) -> float:
    """EMA-сглаживание: alpha=1 — мгновенный переход."""
    return prev + alpha * (target - prev)


# ---------------------------------------------------------------------------
# Симулятор
# ---------------------------------------------------------------------------

class LocoSimulator:
    """
    Асинхронный симулятор телеметрии одного локомотива.

    Параметры:
        loco_type  — тип локомотива (KZ8A / TE33A)
        loco_id    — уникальный ID (по умолчанию генерируется)
        scenario   — начальный сценарий
        frequency  — частота генерации фреймов (Гц)
    """

    def __init__(
        self,
        loco_type: LocoType = LocoType.TE33A,
        loco_id: str | None = None,
        scenario: str = "normal",
        frequency: float = 1.0,
    ) -> None:
        self.loco_type = loco_type
        self.loco_id = loco_id or f"{loco_type.value}-{uuid.uuid4().hex[:6].upper()}"
        self.scenario = scenario
        self.frequency = frequency

        # Внутреннее состояние (плавные переходы)
        self._speed: float = 60.0
        self._odometer: float = 0.0
        self._start_time: float = time.time()
        self._tick: int = 0

        # Состояние специфичное для типа
        if loco_type == LocoType.KZ8A:
            self._catenary_voltage: float = 25.0
            self._dc_bus_voltage: float = 1800.0
            self._battery_voltage_kz: float = 110.0
            self._transformer_temp: float = 70.0
        else:
            self._fuel_level: float = 85.0
            self._engine_rpm: float = 700.0
            self._coolant_temp: float = 80.0
            self._oil_temp: float = 85.0
            self._battery_voltage_te: float = 68.0

        self._motor_temps: list[float] = [80.0] * (8 if loco_type == LocoType.KZ8A else 6)
        self._bearing_temps: list[float] = [45.0] * (8 if loco_type == LocoType.KZ8A else 6)

    # ------------------------------------------------------------------
    # Публичный API
    # ------------------------------------------------------------------

    def set_scenario(self, scenario: str) -> None:
        valid = {
            "normal", "acceleration", "braking", "highload",
            "overheat", "fuel_low", "voltage_drop", "emergency",
        }
        if scenario not in valid:
            raise ValueError(f"Unknown scenario: {scenario}. Valid: {valid}")
        self.scenario = scenario

    async def stream(self) -> AsyncGenerator[TelemetryFrame, None]:
        """Бесконечный асинхронный генератор фреймов телеметрии."""
        interval = 1.0 / self.frequency
        # В highload режиме интервал уменьшается в 10 раз
        while True:
            effective_interval = interval / 10 if self.scenario == "highload" else interval
            frame = self._generate_frame()
            yield frame
            await asyncio.sleep(effective_interval)

    def generate_once(self) -> TelemetryFrame:
        """Генерирует один фрейм (синхронно, для тестов)."""
        return self._generate_frame()

    # ------------------------------------------------------------------
    # Генерация фрейма
    # ------------------------------------------------------------------

    def _generate_frame(self) -> TelemetryFrame:
        self._tick += 1
        dt = 1.0 / self.frequency  # условный шаг по времени

        traction = self._build_traction(dt)
        nodes = self._build_nodes()
        nav = self._build_navigation(dt)

        if self.loco_type == LocoType.KZ8A:
            resources = self._build_kz8a_resources(traction)
            return KZ8ATelemetry(
                loco_id=self.loco_id,
                traction=traction,
                resources=resources,
                nodes=nodes,
                navigation=nav,
                scenario=self.scenario,
            )
        else:
            resources = self._build_te33a_resources(traction, dt)
            return TE33ATelemetry(
                loco_id=self.loco_id,
                traction=traction,
                resources=resources,
                nodes=nodes,
                navigation=nav,
                scenario=self.scenario,
            )

    # ------------------------------------------------------------------
    # Тяга и движение
    # ------------------------------------------------------------------

    def _build_traction(self, dt: float) -> TractionParams:
        s = self.scenario

        # Целевая скорость по сценарию
        if s == "acceleration":
            target_speed = 110.0
            controller_pos = 7
        elif s == "braking":
            target_speed = 20.0
            controller_pos = 0
        elif s in ("emergency", "overheat"):
            target_speed = 40.0
            controller_pos = 3
        elif s == "normal":
            # Синусоидальные колебания вокруг 70 км/ч
            target_speed = 70.0 + 15.0 * math.sin(self._tick * 0.05)
            controller_pos = 4
        else:
            target_speed = 65.0
            controller_pos = 4

        self._speed = _smooth(self._speed, target_speed, alpha=0.1)
        self._speed = _clamp(self._speed, 0, 120)

        axes = 8 if self.loco_type == LocoType.KZ8A else 6
        max_current = 1200 if self.loco_type == LocoType.KZ8A else 1000
        base_current = max_current * (controller_pos / 8) * (self._speed / 120)

        motor_currents = [
            _clamp(_jitter(base_current, 0.05), 0, max_current)
            for _ in range(axes)
        ]

        max_tractive = 833.0 if self.loco_type == LocoType.KZ8A else 500.0
        tractive_effort = _clamp(
            _jitter(max_tractive * controller_pos / 8, 0.04), 0, max_tractive
        )

        # Тормозное давление
        if s == "braking":
            brake_pipe = _jitter(400.0, 0.03)
            brake_cyl = _jitter(300.0, 0.05)
            brake_force = _jitter(350.0, 0.05)
        elif s == "emergency":
            brake_pipe = _jitter(300.0, 0.05)
            brake_cyl = _jitter(380.0, 0.03)
            brake_force = _jitter(480.0, 0.04)
        else:
            brake_pipe = _jitter(505.0, 0.02)
            brake_cyl = _jitter(10.0, 0.1)
            brake_force = _jitter(5.0, 0.2)

        return TractionParams(
            speed=round(self._speed, 1),
            tractive_effort=round(tractive_effort, 1),
            traction_motor_current=[round(c, 1) for c in motor_currents],
            controller_position=controller_pos,
            brake_pipe_pressure=round(brake_pipe, 1),
            brake_cylinder_pressure=round(brake_cyl, 1),
            brake_force=round(brake_force, 1),
        )

    # ------------------------------------------------------------------
    # Ресурсы KZ8A
    # ------------------------------------------------------------------

    def _build_kz8a_resources(self, traction: TractionParams) -> KZ8AResourceParams:
        s = self.scenario

        if s == "voltage_drop":
            catenary = _smooth(self._catenary_voltage, 20.5, 0.1)
            dc_bus = _smooth(self._dc_bus_voltage, 1600.0, 0.1)
        elif s == "emergency":
            catenary = _smooth(self._catenary_voltage, 19.5, 0.15)
            dc_bus = _smooth(self._dc_bus_voltage, 1520.0, 0.15)
        else:
            catenary = _smooth(self._catenary_voltage, 25.0, 0.05)
            dc_bus = _smooth(self._dc_bus_voltage, 1800.0, 0.05)

        self._catenary_voltage = _clamp(catenary, 19, 29)
        self._dc_bus_voltage = _clamp(dc_bus, 1500, 2000)

        traction_power = traction.tractive_effort * self._speed / 3.6  # кН * м/с = кВт
        traction_power = _clamp(_jitter(traction_power, 0.03), 0, 8800)

        regen = 0.0
        if s == "braking":
            regen = _jitter(traction_power * 0.8, 0.05)
        regen = _clamp(regen, 0, 7600)

        igbt_current = _clamp(_jitter(traction_power / (self._dc_bus_voltage / 1000 + 0.1) * 0.12, 0.04), 0, 1200)

        # Трансформатор греется под нагрузкой
        target_trans = 60.0 + (traction_power / 8800) * 50
        if s in ("overheat", "emergency"):
            target_trans = 135.0
        self._transformer_temp = _smooth(self._transformer_temp, target_trans, 0.05)
        self._transformer_temp = _clamp(self._transformer_temp, -50, 150)

        bat_target = 110.0
        if s == "emergency":
            bat_target = 92.0
        self._battery_voltage_kz = _smooth(self._battery_voltage_kz, bat_target, 0.03)

        return KZ8AResourceParams(
            catenary_voltage=round(self._catenary_voltage, 2),
            dc_bus_voltage=round(self._dc_bus_voltage, 1),
            igbt_current=round(igbt_current, 1),
            regen_power=round(regen, 1),
            traction_power=round(traction_power, 1),
            aux_voltage=round(_jitter(400.0, 0.01), 1),
            battery_voltage=round(self._battery_voltage_kz, 1),
            transformer_temp=round(self._transformer_temp, 1),
        )

    # ------------------------------------------------------------------
    # Ресурсы ТЭ33А
    # ------------------------------------------------------------------

    def _build_te33a_resources(self, traction: TractionParams, dt: float) -> TE33AResourceParams:
        s = self.scenario

        # Обороты двигателя
        target_rpm = 350 + (traction.controller_position / 8) * 700
        if s == "emergency":
            target_rpm = 900
        self._engine_rpm = _smooth(self._engine_rpm, target_rpm, 0.1)
        self._engine_rpm = _clamp(self._engine_rpm, 0, 1050)

        # Расход топлива
        fuel_consumption = 50 + (self._engine_rpm / 1050) * 550
        if s == "emergency":
            fuel_consumption = 580

        # Уровень топлива убывает
        consumed_per_tick = fuel_consumption / 3600 * dt * 0.01  # примерно
        if s == "fuel_low":
            self._fuel_level = _clamp(self._fuel_level - consumed_per_tick * 3, 5, 100)
            if self._fuel_level < 8:
                self._fuel_level = 8.0
        else:
            self._fuel_level = _clamp(self._fuel_level - consumed_per_tick, 10, 100)

        # Температура ОЖ
        coolant_target = 75 + (self._engine_rpm / 1050) * 20
        if s in ("overheat", "emergency"):
            coolant_target = 108.0
        self._coolant_temp = _smooth(self._coolant_temp, coolant_target, 0.05)
        self._coolant_temp = _clamp(self._coolant_temp, -40, 110)

        # Температура масла
        oil_target = 80 + (self._engine_rpm / 1050) * 25
        if s in ("overheat", "emergency"):
            oil_target = 125.0
        self._oil_temp = _smooth(self._oil_temp, oil_target, 0.05)
        self._oil_temp = _clamp(self._oil_temp, -40, 130)

        # Давление масла
        oil_pressure_target = 250 + (self._engine_rpm / 1050) * 250
        if s == "emergency":
            oil_pressure_target = 180  # просадка давления масла

        turbo_rpm = _clamp(_jitter(self._engine_rpm * 70, 0.05), 0, 90000)
        turbo_boost = _clamp(_jitter(100 + (self._engine_rpm / 1050) * 180, 0.04), 0, 350)
        exhaust_temp = _clamp(_jitter(200 + (self._engine_rpm / 1050) * 300, 0.03), 100, 700)
        if s in ("overheat", "emergency"):
            exhaust_temp = _clamp(exhaust_temp + 120, 100, 700)

        bat_target = 68.0
        if s == "emergency":
            bat_target = 55.0
        self._battery_voltage_te = _smooth(self._battery_voltage_te, bat_target, 0.03)

        water_in_fuel = s == "emergency" and random.random() < 0.3

        return TE33AResourceParams(
            fuel_level=round(self._fuel_level, 1),
            fuel_consumption=round(_jitter(fuel_consumption, 0.03), 1),
            fuel_temperature=round(_jitter(35.0, 0.05), 1),
            fuel_pressure=round(_jitter(450.0, 0.03), 1),
            oil_pressure=round(_clamp(_jitter(oil_pressure_target, 0.04), 0, 700), 1),
            oil_temperature=round(self._oil_temp, 1),
            engine_rpm=round(self._engine_rpm, 0),
            turbo_rpm=round(turbo_rpm, 0),
            turbo_boost_pressure=round(turbo_boost, 1),
            exhaust_temperature=round(exhaust_temp, 1),
            coolant_temperature=round(self._coolant_temp, 1),
            water_in_fuel=water_in_fuel,
            battery_voltage=round(self._battery_voltage_te, 1),
        )

    # ------------------------------------------------------------------
    # Мониторинг узлов
    # ------------------------------------------------------------------

    def _build_nodes(self) -> NodeMonitoringParams:
        s = self.scenario
        axes = len(self._motor_temps)

        for i in range(axes):
            base = 80.0
            if s in ("overheat", "emergency"):
                base = 170.0 + random.uniform(-10, 10)
            elif s == "acceleration":
                base = 120.0
            target = base + random.uniform(-5, 5)
            self._motor_temps[i] = _smooth(
                self._motor_temps[i], _clamp(target, -50, 200), 0.08
            )

            bear_base = 45.0
            if s in ("overheat", "emergency"):
                bear_base = 95.0 + random.uniform(-5, 5)
            bear_target = bear_base + random.uniform(-3, 3)
            self._bearing_temps[i] = _smooth(
                self._bearing_temps[i], _clamp(bear_target, -50, 120), 0.08
            )

        # Вентиляторы
        fan_statuses = []
        for i in range(axes):
            if s == "emergency" and random.random() < 0.25:
                fan_statuses.append(FanStatus.fault)
            elif s == "overheat" and i == 0:
                fan_statuses.append(FanStatus.stopped)
            else:
                fan_statuses.append(FanStatus.running)

        # Коды ошибок
        error_codes: list[str] = []
        active_alerts: list[str] = []
        if s == "emergency":
            error_codes = random.sample(
                ["E001_OVERTEMP", "E002_OVERVOLT", "E003_UNDERPRES", "E004_VIBRATION", "E005_FAULT"],
                k=random.randint(1, 3),
            )
            active_alerts = [f"ALERT_{c}" for c in error_codes]
        elif s == "overheat":
            error_codes = ["E001_OVERTEMP"]
            active_alerts = ["ALERT_HIGH_MOTOR_TEMP"]
        elif s == "fuel_low" and self.loco_type == LocoType.TE33A:
            active_alerts = ["ALERT_LOW_FUEL"]
        elif s == "voltage_drop" and self.loco_type == LocoType.KZ8A:
            active_alerts = ["ALERT_LOW_CATENARY_VOLTAGE"]

        return NodeMonitoringParams(
            motor_temperatures=[round(t, 1) for t in self._motor_temps],
            axle_bearing_temps=[round(t, 1) for t in self._bearing_temps],
            cooling_fan_statuses=fan_statuses,
            error_codes=error_codes,
            active_alerts=active_alerts,
        )

    # ------------------------------------------------------------------
    # Навигация
    # ------------------------------------------------------------------

    def _build_navigation(self, dt: float) -> NavigationParams:
        # Обновляем одометр
        self._odometer += self._speed * dt / 3600  # км

        progress = _clamp(self._odometer / ROUTE_TOTAL_KM, 0.0, 1.0)
        lat, lon = _interpolate_route(progress)

        # Небольшой шум координат (GPS-точность)
        lat += random.uniform(-0.0001, 0.0001)
        lon += random.uniform(-0.0001, 0.0001)

        # Светофор зависит от сценария
        if self.scenario == "emergency":
            signal = SignalStatus.red
        elif self.scenario == "braking":
            signal = SignalStatus.yellow
        else:
            signal = SignalStatus.green

        section_idx = int(progress * 10) + 1

        return NavigationParams(
            latitude=round(lat, 6),
            longitude=round(lon, 6),
            odometer=round(self._odometer, 2),
            route_section=f"P-{section_idx:02d}",
            speed_limit=80.0 if self.scenario in ("braking", "emergency") else 120.0,
            signal_status=signal,
            connection_status="connected",
        )


# ---------------------------------------------------------------------------
# Фабрика — удобное создание симуляторов
# ---------------------------------------------------------------------------

def create_simulator(
    loco_type: str | LocoType = "TE33A",
    scenario: str = "normal",
    frequency: float = 1.0,
    loco_id: str | None = None,
) -> LocoSimulator:
    lt = LocoType(loco_type) if isinstance(loco_type, str) else loco_type
    return LocoSimulator(loco_type=lt, loco_id=loco_id, scenario=scenario, frequency=frequency)
