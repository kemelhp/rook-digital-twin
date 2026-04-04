"""
WebSocket эндпоинт для потоковой телеметрии.

Параметры подключения (query):
  loco_type  — KZ8A | TE33A (default: TE33A)
  scenario   — normal | acceleration | ... (default: normal)
  frequency  — Гц (default: 1.0)
  loco_id    — опционально
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.models.telemetry import LocoType
from app.services.alert_engine import alert_engine
from app.services.health_engine import health_engine
from app.services.simulator import create_simulator
from app.services.timeseries_store import timeseries_store
from app.storage.time_series import storage

logger = logging.getLogger(__name__)
router = APIRouter()

HEARTBEAT_INTERVAL = 15.0  # секунды
DB_WRITE_EVERY = 5


@router.websocket("/ws/telemetry")
async def ws_telemetry(
    websocket: WebSocket,
    loco_type: str = Query(default="TE33A"),
    scenario: str = Query(default="normal"),
    frequency: float = Query(default=1.0, ge=0.1, le=100.0),
    loco_id: str | None = Query(default=None),
) -> None:
    await websocket.accept()

    try:
        lt = LocoType(loco_type.upper())
    except ValueError:
        await websocket.send_json({"error": f"Unknown loco_type: {loco_type}"})
        await websocket.close(code=1003)
        return

    sim = create_simulator(
        loco_type=lt,
        scenario=scenario,
        frequency=frequency,
        loco_id=loco_id,
    )
    store = storage.get_or_create(sim.loco_id)
    logger.info(
        "WS connected: loco=%s scenario=%s freq=%.1f", sim.loco_id, scenario, frequency
    )

    heartbeat_task = asyncio.create_task(_heartbeat(websocket))
    tick = 0

    try:
        async for frame in sim.stream():
            tick += 1
            # Обновить сценарий если клиент прислал команду (non-blocking check)
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                cmd = json.loads(raw)
                if "scenario" in cmd:
                    sim.set_scenario(cmd["scenario"])
            except (asyncio.TimeoutError, Exception):
                pass

            # Рассчитать здоровье и алерты
            hi = health_engine.compute(frame)
            alert_summary = alert_engine.detect(frame)

            # In-memory (всегда — быстрый доступ для текущего состояния)
            store.push_telemetry(frame)
            store.push_health(hi)
            for alert in alert_summary.alerts:
                store.push_alert(alert)

            if tick % DB_WRITE_EVERY == 0:
                asyncio.create_task(_persist(frame, hi))

            # Отправить клиенту
            payload = {
                "telemetry": frame.model_dump(),
                "health": hi.model_dump(),
                "alerts": alert_summary.model_dump(),
            }
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        logger.info("WS disconnected: loco=%s", sim.loco_id)
    except Exception as exc:
        logger.exception("WS error for loco=%s: %s", sim.loco_id, exc)
    finally:
        heartbeat_task.cancel()


async def _persist(frame, hi) -> None:
    try:
        await timeseries_store.write_frame_and_health(frame, hi)
    except Exception as exc:
        logger.warning("Timeseries write failed (non-fatal): %s", exc)


async def _heartbeat(websocket: WebSocket) -> None:
    """Периодически отправляет ping чтобы держать соединение живым."""
    while True:
        await asyncio.sleep(HEARTBEAT_INTERVAL)
        try:
            await websocket.send_json({"type": "ping"})
        except Exception:
            break
