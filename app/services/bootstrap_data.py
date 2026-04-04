from __future__ import annotations

import logging

from app.db.engine import AsyncSessionLocal
from app.db import repository as repo
from app.models.telemetry import LocoType
from app.services.alert_engine import alert_engine
from app.services.health_engine import health_engine
from app.services.simulator import create_simulator
from app.storage.time_series import storage

logger = logging.getLogger(__name__)


async def bootstrap_mock_telemetry() -> None:
    seed_configs = [
        (LocoType.TE33A, "TE33A-001", "normal"),
        (LocoType.KZ8A, "KZ8A-001", "normal"),
    ]

    async with AsyncSessionLocal() as session:
        for loco_type, loco_id, scenario in seed_configs:
            exists = await repo.has_telemetry(session, loco_id)
            if exists:
                continue

            simulator = create_simulator(
                loco_type=loco_type,
                loco_id=loco_id,
                scenario=scenario,
                frequency=1.0,
            )
            store = storage.get_or_create(loco_id)

            for _ in range(60):
                frame = simulator.generate_once()
                health = health_engine.compute(frame)
                alerts = alert_engine.detect(frame)

                store.push_telemetry(frame)
                store.push_health(health)
                for alert in alerts.alerts:
                    store.push_alert(alert)

                await repo.save_telemetry(session, frame)
                await repo.save_health(session, health)
                for alert in alerts.alerts:
                    await repo.save_alert(session, alert)

            logger.info("Seeded telemetry history for %s", loco_id)
