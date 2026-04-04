"""
REST: активные алерты (in-memory) + история (PostgreSQL).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db import repository as repo
from app.models.alerts import Alert
from app.storage.time_series import storage

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts", response_model=list[Alert])
async def get_active_alerts(loco_id: str = Query(...)) -> list[Alert]:
    # Активные прямо сейчас — из in-memory (мгновенно)
    store = storage.get_or_create(loco_id)
    return store.get_alerts(active_only=True)


@router.get("/alerts/history", response_model=list[Alert])
async def get_alerts_history(
    loco_id: str = Query(...),
    active_only: bool = Query(default=False),
    limit: int = Query(default=500, ge=1, le=5000),
    session: AsyncSession = Depends(get_session),
) -> list[Alert]:
    # История — из PostgreSQL
    return await repo.get_alerts(session, loco_id, active_only=active_only, limit=limit)
