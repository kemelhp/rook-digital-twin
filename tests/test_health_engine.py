"""
Тесты движка индекса здоровья.
"""

import pytest
from app.models.health_index import HealthGrade
from app.services.health_engine import health_engine
from app.services.simulator import create_simulator


def test_normal_scenario_high_health():
    sim = create_simulator(loco_type="TE33A", scenario="normal")
    for _ in range(3):
        frame = sim.generate_once()
    hi = health_engine.compute(frame)
    assert hi.index >= 60, f"Expected high health in normal mode, got {hi.index}"
    assert hi.grade in (HealthGrade.A, HealthGrade.B, HealthGrade.C)


def test_emergency_scenario_low_health():
    sim = create_simulator(loco_type="TE33A", scenario="emergency")
    for _ in range(10):
        frame = sim.generate_once()
    hi = health_engine.compute(frame)
    assert hi.index < 60, f"Expected low health in emergency mode, got {hi.index}"


def test_health_has_top_factors():
    sim = create_simulator(loco_type="KZ8A", scenario="overheat")
    for _ in range(5):
        frame = sim.generate_once()
    hi = health_engine.compute(frame)
    assert len(hi.top_factors) > 0
    assert len(hi.group_scores) > 0


def test_grade_boundaries():
    sim = create_simulator(loco_type="KZ8A", scenario="normal")
    frame = sim.generate_once()
    hi = health_engine.compute(frame)
    grade_map = {
        (80, 100): HealthGrade.A,
        (60, 79): HealthGrade.B,
        (40, 59): HealthGrade.C,
        (20, 39): HealthGrade.D,
        (0, 19): HealthGrade.E,
    }
    expected = None
    for (lo, hi_bound), grade in grade_map.items():
        if lo <= hi.index <= hi_bound:
            expected = grade
            break
    assert hi.grade == expected, f"Grade mismatch: index={hi.index}, grade={hi.grade}, expected={expected}"
