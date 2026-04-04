"""
Детекция алертов из фрейма телеметрии.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from app.config import get_thresholds
from app.models.alerts import Alert, AlertSeverity, AlertStatus, AlertSummary
from app.models.telemetry import FanStatus, KZ8ATelemetry, TE33ATelemetry, TelemetryFrame


def _check(
    param_id: str,
    label: str,
    value: float,
    thresholds: dict[str, Any],
    unit: str,
    loco_id: str,
    loco_type: str,
) -> Alert | None:
    cfg = thresholds.get(param_id, {})
    if not cfg:
        return None

    warn = cfg.get("warning", [0, 9999])
    crit = cfg.get("critical", [0, 9999])

    severity: AlertSeverity | None = None
    threshold_val: float = 0.0
    message = ""
    recommendation = ""

    if value < crit[0] or value > crit[1]:
        severity = AlertSeverity.critical
        threshold_val = crit[0] if value < crit[0] else crit[1]
        message = f"{label} = {value} {unit} вышел за критические границы [{crit[0]}, {crit[1]}]"
        recommendation = "Немедленно остановить локомотив. Вызвать бригаду техобслуживания."
    elif value < warn[0] or value > warn[1]:
        severity = AlertSeverity.warning
        threshold_val = warn[0] if value < warn[0] else warn[1]
        message = f"{label} = {value} {unit} в зоне предупреждения [{warn[0]}, {warn[1]}]"
        recommendation = "Повысить внимание. Снизить нагрузку при необходимости."

    if severity is None:
        return None

    penalty = 15.0 if severity == AlertSeverity.critical else 5.0

    return Alert(
        alert_id=f"{param_id}_{uuid.uuid4().hex[:8]}",
        loco_id=loco_id,
        loco_type=loco_type,
        param_id=param_id,
        label=label,
        severity=severity,
        status=AlertStatus.active,
        value=value,
        threshold=threshold_val,
        unit=unit,
        message=message,
        recommendation=recommendation,
        penalty=penalty,
        triggered_at=time.time(),
    )


class AlertEngine:
    """Генерирует список алертов из одного фрейма телеметрии."""

    def detect(self, frame: TelemetryFrame) -> AlertSummary:
        cfg = get_thresholds()
        thresholds: dict[str, Any] = cfg.get("thresholds", {})

        alerts: list[Alert] = []
        loco_id = frame.loco_id
        loco_type = frame.loco_type.value
        t = frame.traction
        nodes = frame.nodes

        # --- Общие параметры ---
        checks = [
            ("speed", "Скорость", t.speed, "км/ч"),
            ("brake_pipe_pressure", "Давление тормозной магистрали", t.brake_pipe_pressure, "кПа"),
            ("brake_cylinder_pressure", "Давление тормозных цилиндров", t.brake_cylinder_pressure, "кПа"),
        ]

        if t.traction_motor_current:
            max_current = max(t.traction_motor_current)
            checks.append(("traction_motor_current", "Ток ТЭД (макс)", max_current, "А"))

        if nodes.motor_temperatures:
            checks.append(("motor_temperature", "Температура ТЭД (макс)", max(nodes.motor_temperatures), "°C"))

        if nodes.axle_bearing_temps:
            checks.append(("axle_bearing_temp", "Температура подшипников (макс)", max(nodes.axle_bearing_temps), "°C"))

        for param_id, label, value, unit in checks:
            alert = _check(param_id, label, value, thresholds, unit, loco_id, loco_type)
            if alert:
                alerts.append(alert)

        # --- Вентиляторы ---
        for i, status in enumerate(nodes.cooling_fan_statuses):
            if status == FanStatus.fault:
                alerts.append(Alert(
                    alert_id=f"fan_{i}_{uuid.uuid4().hex[:8]}",
                    loco_id=loco_id, loco_type=loco_type,
                    param_id=f"cooling_fan_{i}", label=f"Вентилятор {i+1}",
                    severity=AlertSeverity.critical, value=0, threshold=1,
                    message=f"Вентилятор {i+1} неисправен (fault)",
                    recommendation="Проверить вентилятор, при необходимости снизить нагрузку.",
                    penalty=15.0,
                ))
            elif status == FanStatus.stopped:
                alerts.append(Alert(
                    alert_id=f"fan_{i}_{uuid.uuid4().hex[:8]}",
                    loco_id=loco_id, loco_type=loco_type,
                    param_id=f"cooling_fan_{i}", label=f"Вентилятор {i+1}",
                    severity=AlertSeverity.warning, value=0, threshold=1,
                    message=f"Вентилятор {i+1} остановлен",
                    recommendation="Проверить состояние вентилятора при первой возможности.",
                    penalty=5.0,
                ))

        # --- Коды ошибок ---
        for code in nodes.error_codes:
            alerts.append(Alert(
                alert_id=f"dtc_{uuid.uuid4().hex[:8]}",
                loco_id=loco_id, loco_type=loco_type,
                param_id="error_code", label=f"DTC: {code}",
                severity=AlertSeverity.critical, value=0, threshold=0,
                message=f"Активный код ошибки: {code}",
                recommendation="Расшифровать DTC, обратиться в сервис.",
                penalty=15.0,
            ))

        # --- ТЭ33А специфика ---
        if isinstance(frame, TE33ATelemetry):
            r = frame.resources
            te_checks = [
                ("fuel_level", "Уровень топлива", r.fuel_level, "%"),
                ("coolant_temperature", "Температура ОЖ", r.coolant_temperature, "°C"),
                ("oil_temperature", "Температура масла", r.oil_temperature, "°C"),
                ("oil_pressure", "Давление масла", r.oil_pressure, "кПа"),
                ("engine_rpm", "Обороты дизеля", r.engine_rpm, "об/мин"),
                ("exhaust_temperature", "Температура выхлопа", r.exhaust_temperature, "°C"),
                ("battery_voltage_te33a", "АКБ (ТЭ33А)", r.battery_voltage, "В"),
            ]
            for param_id, label, value, unit in te_checks:
                alert = _check(param_id, label, value, thresholds, unit, loco_id, loco_type)
                if alert:
                    alerts.append(alert)

            if r.water_in_fuel:
                alerts.append(Alert(
                    alert_id=f"water_in_fuel_{uuid.uuid4().hex[:8]}",
                    loco_id=loco_id, loco_type=loco_type,
                    param_id="water_in_fuel", label="Вода в топливе",
                    severity=AlertSeverity.critical, value=1, threshold=0,
                    message="Обнаружена вода в топливном баке",
                    recommendation="Немедленно слить отстой, проверить фильтры. Возможно загрязнение.",
                    penalty=20.0,
                ))

        # --- KZ8A специфика ---
        elif isinstance(frame, KZ8ATelemetry):
            r = frame.resources
            kz_checks = [
                ("catenary_voltage", "Напряжение КС", r.catenary_voltage, "кВ"),
                ("dc_bus_voltage", "Шина DC", r.dc_bus_voltage, "В"),
                ("transformer_temp", "Температура трансформатора", r.transformer_temp, "°C"),
                ("battery_voltage_kz8a", "АКБ (KZ8A)", r.battery_voltage, "В"),
            ]
            for param_id, label, value, unit in kz_checks:
                alert = _check(param_id, label, value, thresholds, unit, loco_id, loco_type)
                if alert:
                    alerts.append(alert)

        critical_count = sum(1 for a in alerts if a.severity == AlertSeverity.critical)
        warning_count = sum(1 for a in alerts if a.severity == AlertSeverity.warning)
        info_count = sum(1 for a in alerts if a.severity == AlertSeverity.info)

        return AlertSummary(
            loco_id=loco_id,
            total=len(alerts),
            critical=critical_count,
            warning=warning_count,
            info=info_count,
            alerts=alerts,
        )


# Singleton
alert_engine = AlertEngine()
