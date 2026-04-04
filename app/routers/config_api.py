"""
REST: CRUD порогов и весов (требует HTTP Basic Auth).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.auth.basic_auth import require_auth
from app.config import get_thresholds, load_thresholds, save_thresholds

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/thresholds")
async def get_thresholds_api(_: str = Depends(require_auth)) -> dict[str, Any]:
    return get_thresholds()


@router.put("/thresholds")
async def update_thresholds(
    body: dict[str, Any],
    _: str = Depends(require_auth),
) -> dict[str, Any]:
    current = get_thresholds()
    current.update(body)
    save_thresholds(current)
    return current


@router.get("/weights")
async def get_weights(_: str = Depends(require_auth)) -> dict[str, float]:
    return get_thresholds().get("weights", {})


@router.put("/weights")
async def update_weights(
    body: dict[str, float],
    _: str = Depends(require_auth),
) -> dict[str, float]:
    current = get_thresholds()
    current["weights"] = body
    save_thresholds(current)
    return body
