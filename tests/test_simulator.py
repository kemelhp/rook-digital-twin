"""
Тесты симулятора телеметрии.
"""

import pytest
from app.models.telemetry import KZ8ATelemetry, LocoType, TE33ATelemetry
from app.services.simulator import LocoSimulator, create_simulator


def test_te33a_normal_frame():
    sim = create_simulator(loco_type="TE33A", scenario="normal")
    frame = sim.generate_once()
    assert isinstance(frame, TE33ATelemetry)
    assert 0 <= frame.traction.speed <= 120
    assert frame.resources.fuel_level >= 0


def test_kz8a_normal_frame():
    sim = create_simulator(loco_type="KZ8A", scenario="normal")
    frame = sim.generate_once()
    assert isinstance(frame, KZ8ATelemetry)
    assert 0 <= frame.traction.speed <= 120
    assert 19 <= frame.resources.catenary_voltage <= 29


def test_emergency_scenario_has_alerts():
    sim = create_simulator(loco_type="TE33A", scenario="emergency")
    # Несколько тиков чтобы состояние накопилось
    for _ in range(5):
        frame = sim.generate_once()
    assert len(frame.nodes.error_codes) > 0 or len(frame.nodes.active_alerts) > 0


def test_voltage_drop_kz8a():
    sim = create_simulator(loco_type="KZ8A", scenario="voltage_drop")
    for _ in range(20):
        frame = sim.generate_once()
    assert frame.resources.catenary_voltage < 24.0


def test_overheat_motor_temp():
    sim = create_simulator(loco_type="TE33A", scenario="overheat")
    for _ in range(30):
        frame = sim.generate_once()
    assert max(frame.nodes.motor_temperatures) > 130.0


def test_fuel_low_decreases():
    sim = create_simulator(loco_type="TE33A", scenario="fuel_low")
    initial = sim.generate_once().resources.fuel_level
    for _ in range(50):
        frame = sim.generate_once()
    assert frame.resources.fuel_level <= initial


def test_set_scenario_invalid():
    sim = LocoSimulator()
    with pytest.raises(ValueError):
        sim.set_scenario("unknown_scenario")


def test_route_interpolation():
    sim = create_simulator(loco_type="TE33A")
    frame = sim.generate_once()
    # Астана → Алматы: широта 43–51, долгота 71–77
    assert 43.0 <= frame.navigation.latitude <= 52.0
    assert 71.0 <= frame.navigation.longitude <= 77.0
