"""
Расчёт индекса здоровья локомотива по формуле:
    index = sum(weight_i * normalized_i) * 100 - alert_penalties
"""

from __future__ import annotations

import time
from typing import Any

from app.config import get_thresholds
from app.models.health_index import (
    HealthFactor,
    HealthGrade,
    HealthIndex,
    GroupScore,
    grade_from_index,
)
from app.models.telemetry import (
    FanStatus,
    KZ8ATelemetry,
    TE33ATelemetry,
    TelemetryFrame,
)


def _normalize(value: float, warning: list[float], critical: list[float]) -> tuple[float, str]:
    """
    Возвращает (нормализованное_значение [0,1], статус).
    warning = [lo, hi]   — зона "Внимание"
    critical = [lo, hi]  — зона "Критично"
    """
    crit_lo, crit_hi = critical
    warn_lo, warn_hi = warning

    # Критичная зона
    if value < crit_lo or value > crit_hi:
        return 0.0, "critical"
    # Зона предупреждения
    if value < warn_lo or value > warn_hi:
        return 0.5, "warning"
    # Норма
    return 1.0, "ok"


def _fan_normalize(statuses: list[FanStatus]) -> tuple[float, str]:
    fault_count = sum(1 for s in statuses if s == FanStatus.fault)
    stopped_count = sum(1 for s in statuses if s == FanStatus.stopped)
    total = len(statuses)
    if total == 0:
        return 1.0, "ok"
    ratio_bad = (fault_count + stopped_count) / total
    if fault_count > 0:
        return max(0.0, 1.0 - ratio_bad * 2), "critical" if ratio_bad > 0.3 else "warning"
    if stopped_count > 0:
        return max(0.5, 1.0 - ratio_bad), "warning"
    return 1.0, "ok"


class HealthEngine:
    """Вычисляет HealthIndex из фрейма телеметрии."""

    def compute(self, frame: TelemetryFrame) -> HealthIndex:
        cfg = get_thresholds()
        weights: dict[str, float] = cfg.get("weights", {
            "traction": 0.30, "resources": 0.25,
            "nodes": 0.25, "brakes": 0.15, "alerts": 0.05,
        })
        penalties_cfg: dict[str, float] = cfg.get("alert_penalties", {
            "info": 2.0, "warning": 5.0, "critical": 15.0,
        })
        thresholds: dict[str, Any] = cfg.get("thresholds", {})

        factors: list[HealthFactor] = []

        # ------------------------------------------------------------------
        # Группа: тяга
        # ------------------------------------------------------------------
        traction_factors = self._eval_traction(frame, thresholds)
        factors.extend(traction_factors)

        # ------------------------------------------------------------------
        # Группа: ресурсы
        # ------------------------------------------------------------------
        resource_factors = self._eval_resources(frame, thresholds)
        factors.extend(resource_factors)

        # ------------------------------------------------------------------
        # Группа: узлы
        # ------------------------------------------------------------------
        node_factors = self._eval_nodes(frame, thresholds)
        factors.extend(node_factors)

        # ------------------------------------------------------------------
        # Группа: тормоза
        # ------------------------------------------------------------------
        brake_factors = self._eval_brakes(frame, thresholds)
        factors.extend(brake_factors)

        # ------------------------------------------------------------------
        # Расчёт баллов по группам
        # ------------------------------------------------------------------
        group_names = ("traction", "resources", "nodes", "brakes")
        group_scores: list[GroupScore] = []

        for group in group_names:
            gf = [f for f in factors if f.group == group]
            if not gf:
                score = 100.0
            else:
                total_w = sum(f.weight for f in gf)
                if total_w == 0:
                    score = 100.0
                else:
                    score = sum(f.normalized * f.weight for f in gf) / total_w * 100
            group_scores.append(GroupScore(group=group, score=round(score, 2), weight=weights.get(group, 0)))

        # Взвешенная сумма групп
        raw_index = sum(gs.score * gs.weight for gs in group_scores)

        # ------------------------------------------------------------------
        # Штрафы за алерты
        # ------------------------------------------------------------------
        active_alerts = frame.nodes.active_alerts
        error_codes = frame.nodes.error_codes
        fan_statuses = frame.nodes.cooling_fan_statuses

        alert_penalty = 0.0
        for _ in active_alerts:
            alert_penalty += penalties_cfg.get("warning", 5.0)
        for _ in error_codes:
            alert_penalty += penalties_cfg.get("critical", 15.0)
        for fs in fan_statuses:
            if fs == FanStatus.fault:
                alert_penalty += penalties_cfg.get("critical", 15.0)
            elif fs == FanStatus.stopped:
                alert_penalty += penalties_cfg.get("warning", 5.0)

        # Штраф за water_in_fuel (ТЭ33А)
        if isinstance(frame, TE33ATelemetry) and frame.resources.water_in_fuel:
            alert_penalty += penalties_cfg.get("critical", 15.0)

        final_index = max(0.0, min(100.0, raw_index - alert_penalty))

        # ------------------------------------------------------------------
        # Top-5 факторов с наибольшим негативным вкладом
        # ------------------------------------------------------------------
        # Вклад = weight * (1 - normalized) — чем больше, тем хуже
        for f in factors:
            f.contribution = round(-(1.0 - f.normalized) * f.weight * 100, 2)

        top5 = sorted(factors, key=lambda f: f.contribution)[:5]

        return HealthIndex(
            loco_id=frame.loco_id,
            loco_type=frame.loco_type.value,
            timestamp=time.time(),
            index=round(final_index, 2),
            grade=grade_from_index(final_index),
            group_scores=group_scores,
            top_factors=top5,
            alert_penalty=round(alert_penalty, 2),
        )

    # ------------------------------------------------------------------
    # Вспомогательные методы
    # ------------------------------------------------------------------

    def _eval_traction(self, frame: TelemetryFrame, thresholds: dict) -> list[HealthFactor]:
        t = frame.traction
        factors = []

        def th(key: str) -> tuple[list, list]:
            d = thresholds.get(key, {})
            return d.get("warning", [0, 9999]), d.get("critical", [0, 9999])

        # Скорость
        warn, crit = th("speed")
        norm, status = _normalize(t.speed, warn, crit)
        factors.append(HealthFactor(
            param_id="speed", label="Скорость", value=t.speed, unit="км/ч",
            normalized=norm, weight=0.1, contribution=0, group="traction", status=status,
        ))

        # Ток ТЭД — берём максимум по осям
        if t.traction_motor_current:
            max_current = max(t.traction_motor_current)
            warn, crit = th("traction_motor_current")
            norm, status = _normalize(max_current, warn, crit)
            factors.append(HealthFactor(
                param_id="traction_motor_current", label="Ток ТЭД (макс)", value=max_current,
                unit="А", normalized=norm, weight=0.3, contribution=0, group="traction", status=status,
            ))

        # Тяговое усилие — просто проверяем не выше макс.
        max_te = 833.0 if frame.loco_type.value == "KZ8A" else 500.0
        te_norm = _clamp_01(1.0 - max(0, t.tractive_effort - max_te * 0.95) / (max_te * 0.05 + 1))
        te_status = "ok" if te_norm >= 0.9 else ("warning" if te_norm >= 0.5 else "critical")
        factors.append(HealthFactor(
            param_id="tractive_effort", label="Тяговое усилие", value=t.tractive_effort,
            unit="кН", normalized=te_norm, weight=0.2, contribution=0, group="traction", status=te_status,
        ))

        return factors

    def _eval_brakes(self, frame: TelemetryFrame, thresholds: dict) -> list[HealthFactor]:
        t = frame.traction
        factors = []

        def th(key: str) -> tuple[list, list]:
            d = thresholds.get(key, {})
            return d.get("warning", [0, 9999]), d.get("critical", [0, 9999])

        warn, crit = th("brake_pipe_pressure")
        norm, status = _normalize(t.brake_pipe_pressure, warn, crit)
        factors.append(HealthFactor(
            param_id="brake_pipe_pressure", label="Давление тормозной магистрали",
            value=t.brake_pipe_pressure, unit="кПа",
            normalized=norm, weight=0.5, contribution=0, group="brakes", status=status,
        ))

        warn, crit = th("brake_cylinder_pressure")
        norm, status = _normalize(t.brake_cylinder_pressure, warn, crit)
        factors.append(HealthFactor(
            param_id="brake_cylinder_pressure", label="Давление тормозных цилиндров",
            value=t.brake_cylinder_pressure, unit="кПа",
            normalized=norm, weight=0.5, contribution=0, group="brakes", status=status,
        ))

        return factors

    def _eval_nodes(self, frame: TelemetryFrame, thresholds: dict) -> list[HealthFactor]:
        nodes = frame.nodes
        factors = []

        def th(key: str) -> tuple[list, list]:
            d = thresholds.get(key, {})
            return d.get("warning", [0, 9999]), d.get("critical", [0, 9999])

        # Температуры ТЭД — берём максимум
        if nodes.motor_temperatures:
            max_temp = max(nodes.motor_temperatures)
            warn, crit = th("motor_temperature")
            norm, status = _normalize(max_temp, warn, crit)
            factors.append(HealthFactor(
                param_id="motor_temperature", label="Температура ТЭД (макс)",
                value=max_temp, unit="°C",
                normalized=norm, weight=0.35, contribution=0, group="nodes", status=status,
            ))

        # Температуры подшипников
        if nodes.axle_bearing_temps:
            max_bear = max(nodes.axle_bearing_temps)
            warn, crit = th("axle_bearing_temp")
            norm, status = _normalize(max_bear, warn, crit)
            factors.append(HealthFactor(
                param_id="axle_bearing_temp", label="Температура подшипников (макс)",
                value=max_bear, unit="°C",
                normalized=norm, weight=0.35, contribution=0, group="nodes", status=status,
            ))

        # Вентиляторы
        fan_norm, fan_status = _fan_normalize(nodes.cooling_fan_statuses)
        factors.append(HealthFactor(
            param_id="cooling_fans", label="Вентиляторы охлаждения",
            value=float(sum(1 for s in nodes.cooling_fan_statuses if s == FanStatus.running)),
            unit="шт", normalized=fan_norm, weight=0.3,
            contribution=0, group="nodes", status=fan_status,
        ))

        return factors

    def _eval_resources(self, frame: TelemetryFrame, thresholds: dict) -> list[HealthFactor]:
        factors = []

        def th(key: str) -> tuple[list, list]:
            d = thresholds.get(key, {})
            return d.get("warning", [0, 9999]), d.get("critical", [0, 9999])

        if isinstance(frame, TE33ATelemetry):
            r = frame.resources

            for param_id, label, value, th_key, weight, unit in [
                ("fuel_level", "Уровень топлива", r.fuel_level, "fuel_level", 0.20, "%"),
                ("coolant_temperature", "Температура ОЖ", r.coolant_temperature, "coolant_temperature", 0.20, "°C"),
                ("oil_temperature", "Температура масла", r.oil_temperature, "oil_temperature", 0.15, "°C"),
                ("oil_pressure", "Давление масла", r.oil_pressure, "oil_pressure", 0.20, "кПа"),
                ("engine_rpm", "Обороты дизеля", r.engine_rpm, "engine_rpm", 0.10, "об/мин"),
                ("exhaust_temperature", "Температура выхлопа", r.exhaust_temperature, "exhaust_temperature", 0.10, "°C"),
                ("battery_voltage", "АКБ", r.battery_voltage, "battery_voltage_te33a", 0.05, "В"),
            ]:
                warn, crit = th(th_key)
                norm, status = _normalize(value, warn, crit)
                factors.append(HealthFactor(
                    param_id=param_id, label=label, value=value, unit=unit,
                    normalized=norm, weight=weight, contribution=0, group="resources", status=status,
                ))

            # water_in_fuel — булевый параметр
            wif_norm = 0.0 if r.water_in_fuel else 1.0
            factors.append(HealthFactor(
                param_id="water_in_fuel", label="Вода в топливе",
                value=float(r.water_in_fuel), unit="",
                normalized=wif_norm, weight=0.10, contribution=0, group="resources",
                status="critical" if r.water_in_fuel else "ok",
            ))

        elif isinstance(frame, KZ8ATelemetry):
            r = frame.resources

            for param_id, label, value, th_key, weight, unit in [
                ("catenary_voltage", "Напряжение КС", r.catenary_voltage, "catenary_voltage", 0.25, "кВ"),
                ("dc_bus_voltage", "Шина DC", r.dc_bus_voltage, "dc_bus_voltage", 0.20, "В"),
                ("transformer_temp", "Температура трансформатора", r.transformer_temp, "transformer_temp", 0.20, "°C"),
                ("battery_voltage", "АКБ", r.battery_voltage, "battery_voltage_kz8a", 0.10, "В"),
            ]:
                warn, crit = th(th_key)
                norm, status = _normalize(value, warn, crit)
                factors.append(HealthFactor(
                    param_id=param_id, label=label, value=value, unit=unit,
                    normalized=norm, weight=weight, contribution=0, group="resources", status=status,
                ))

            # Тяговая мощность (максимальная 8800 кВт)
            tp_norm = _clamp_01(1.0 - max(0, r.traction_power - 8800 * 0.97) / (8800 * 0.03 + 1))
            tp_status = "ok" if tp_norm >= 0.9 else "warning"
            factors.append(HealthFactor(
                param_id="traction_power", label="Тяговая мощность",
                value=r.traction_power, unit="кВт",
                normalized=tp_norm, weight=0.25, contribution=0, group="resources", status=tp_status,
            ))

        return factors


def _clamp_01(v: float) -> float:
    return max(0.0, min(1.0, v))


# Singleton
health_engine = HealthEngine()
