"""
REST: текущий индекс здоровья (in-memory) + история (PostgreSQL).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.health_index import HealthHistory, HealthIndex
from app.services.timeseries_store import timeseries_store
from app.storage.time_series import storage

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthIndex)
async def get_current_health(loco_id: str = Query(...)) -> HealthIndex:
    # Текущее состояние — из in-memory (нет задержки)
    store = storage.get_or_create(loco_id)
    hi = store.get_current_health()
    if hi is None:
        raise HTTPException(status_code=404, detail="No health data yet for this loco")
    return hi


@router.get("/health/history", response_model=list[HealthHistory])
async def get_health_history(
    loco_id: str = Query(...),
    from_ts: float | None = Query(default=None),
    to_ts: float | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=10_000),
) -> list[HealthHistory]:
    return await timeseries_store.get_health_history(
        loco_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
    )
