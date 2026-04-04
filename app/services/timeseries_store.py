from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone

from sqlalchemy import text

from app.db.engine import AsyncSessionLocal
from app.models.health_index import HealthGrade, HealthHistory, HealthIndex
from app.models.telemetry import TelemetryFrame


def _from_ts(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


class TimeseriesStore:
    def __init__(self) -> None:
        self._initialized = False
        self._init_lock = asyncio.Lock()

    async def initialize(self) -> None:
        if self._initialized:
            return

        async with self._init_lock:
            if self._initialized:
                return

            async with AsyncSessionLocal() as session:
                await session.execute(
                    text("CREATE EXTENSION IF NOT EXISTS timescaledb")
                )
                await session.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS telemetry_timeseries (
                            ts TIMESTAMPTZ NOT NULL,
                            loco_id VARCHAR(64) NOT NULL,
                            loco_type VARCHAR(16) NOT NULL,
                            scenario VARCHAR(32) NOT NULL,
                            speed DOUBLE PRECISION NOT NULL,
                            health_index DOUBLE PRECISION,
                            payload JSONB NOT NULL
                        )
                        """
                    )
                )
                await session.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS health_timeseries (
                            ts TIMESTAMPTZ NOT NULL,
                            loco_id VARCHAR(64) NOT NULL,
                            loco_type VARCHAR(16) NOT NULL,
                            health_index DOUBLE PRECISION NOT NULL,
                            grade VARCHAR(1) NOT NULL,
                            alert_penalty DOUBLE PRECISION NOT NULL,
                            group_scores JSONB NOT NULL,
                            top_factors JSONB NOT NULL
                        )
                        """
                    )
                )
                await session.execute(
                    text(
                        "SELECT create_hypertable('telemetry_timeseries', 'ts', if_not_exists => TRUE)"
                    )
                )
                await session.execute(
                    text(
                        "SELECT create_hypertable('health_timeseries', 'ts', if_not_exists => TRUE)"
                    )
                )
                await session.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_telemetry_ts_loco_ts ON telemetry_timeseries (loco_id, ts DESC)"
                    )
                )
                await session.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_health_ts_loco_ts ON health_timeseries (loco_id, ts DESC)"
                    )
                )
                await session.commit()

            self._initialized = True

    async def write_frame_and_health(
        self, frame: TelemetryFrame, health: HealthIndex
    ) -> None:
        await self.initialize()
        async with AsyncSessionLocal() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO telemetry_timeseries (loco_id, loco_type, scenario, ts, speed, health_index, payload)
                    VALUES (:loco_id, :loco_type, :scenario, :ts, :speed, :health_index, CAST(:payload AS JSONB))
                    """
                ),
                {
                    "loco_id": frame.loco_id,
                    "loco_type": frame.loco_type.value,
                    "scenario": frame.scenario,
                    "ts": _from_ts(frame.timestamp),
                    "speed": frame.traction.speed,
                    "health_index": health.index,
                    "payload": frame.model_dump_json(),
                },
            )
            await session.execute(
                text(
                    """
                    INSERT INTO health_timeseries (loco_id, loco_type, ts, health_index, grade, alert_penalty, group_scores, top_factors)
                    VALUES (:loco_id, :loco_type, :ts, :health_index, :grade, :alert_penalty, CAST(:group_scores AS JSONB), CAST(:top_factors AS JSONB))
                    """
                ),
                {
                    "loco_id": health.loco_id,
                    "loco_type": health.loco_type,
                    "ts": _from_ts(health.timestamp),
                    "health_index": health.index,
                    "grade": health.grade.value,
                    "alert_penalty": health.alert_penalty,
                    "group_scores": json.dumps(
                        [item.model_dump() for item in health.group_scores]
                    ),
                    "top_factors": json.dumps(
                        [item.model_dump() for item in health.top_factors]
                    ),
                },
            )
            await session.commit()

    async def get_telemetry_history(
        self,
        loco_id: str,
        from_ts: float | None = None,
        to_ts: float | None = None,
        limit: int = 1000,
    ) -> list[dict]:
        await self.initialize()
        where_parts = ["loco_id = :loco_id"]
        params: dict[str, object] = {"loco_id": loco_id, "limit": limit}
        if from_ts is not None:
            where_parts.append("ts >= :from_ts")
            params["from_ts"] = _from_ts(from_ts)
        if to_ts is not None:
            where_parts.append("ts <= :to_ts")
            params["to_ts"] = _from_ts(to_ts)

        query = f"""
            SELECT payload
            FROM telemetry_timeseries
            WHERE {" AND ".join(where_parts)}
            ORDER BY ts DESC
            LIMIT :limit
        """

        async with AsyncSessionLocal() as session:
            result = await session.execute(text(query), params)
            rows = result.mappings().all()
            return [row["payload"] for row in rows]

    async def get_replay(self, loco_id: str, minutes: int = 5) -> list[dict]:
        cutoff = time.time() - minutes * 60
        return await self.get_telemetry_history(loco_id, from_ts=cutoff, limit=10_000)

    async def get_health_history(
        self,
        loco_id: str,
        from_ts: float | None = None,
        to_ts: float | None = None,
        limit: int = 1000,
    ) -> list[HealthHistory]:
        await self.initialize()
        where_parts = ["loco_id = :loco_id"]
        params: dict[str, object] = {"loco_id": loco_id, "limit": limit}
        if from_ts is not None:
            where_parts.append("ts >= :from_ts")
            params["from_ts"] = _from_ts(from_ts)
        if to_ts is not None:
            where_parts.append("ts <= :to_ts")
            params["to_ts"] = _from_ts(to_ts)

        query = f"""
            SELECT ts, health_index, grade
            FROM health_timeseries
            WHERE {" AND ".join(where_parts)}
            ORDER BY ts ASC
            LIMIT :limit
        """

        async with AsyncSessionLocal() as session:
            result = await session.execute(text(query), params)
            rows = result.mappings().all()
            return [
                HealthHistory(
                    timestamp=row["ts"].timestamp(),
                    index=row["health_index"],
                    grade=HealthGrade(row["grade"]),
                )
                for row in rows
            ]


timeseries_store = TimeseriesStore()
