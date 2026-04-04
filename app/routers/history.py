"""
REST: история телеметрии и replay — читает из PostgreSQL.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.timeseries_store import timeseries_store

router = APIRouter(prefix="/api", tags=["telemetry"])


@router.get("/telemetry/history")
async def get_telemetry_history(
    loco_id: str = Query(...),
    from_ts: float | None = Query(default=None),
    to_ts: float | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=10_000),
) -> list[dict]:
    return await timeseries_store.get_telemetry_history(
        loco_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
    )


@router.get("/telemetry/replay")
async def replay_telemetry(
    loco_id: str = Query(...),
    minutes: int = Query(default=5, ge=1, le=60),
) -> list[dict]:
    return await timeseries_store.get_replay(loco_id, minutes=minutes)
