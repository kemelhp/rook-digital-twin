"""
REST: история телеметрии и replay — читает из PostgreSQL.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db import repository as repo

router = APIRouter(prefix="/api", tags=["telemetry"])


@router.get("/telemetry/history")
async def get_telemetry_history(
    loco_id: str = Query(...),
    from_ts: float | None = Query(default=None),
    to_ts: float | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=10_000),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await repo.get_telemetry(session, loco_id, from_ts=from_ts, to_ts=to_ts, limit=limit)


@router.get("/telemetry/replay")
async def replay_telemetry(
    loco_id: str = Query(...),
    minutes: int = Query(default=5, ge=1, le=60),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await repo.get_replay(session, loco_id, minutes=minutes)
