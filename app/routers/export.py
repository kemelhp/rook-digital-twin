"""
REST: экспорт данных в CSV / JSON — читает из PostgreSQL.
"""

from __future__ import annotations

import csv
import io
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.db import repository as repo

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export")
async def export_data(
    loco_id: str = Query(...),
    format: str = Query(default="json", pattern="^(json|csv)$"),
    minutes: int = Query(default=15, ge=1, le=1440),
    session: AsyncSession = Depends(get_session),
) -> Response:
    frames = await repo.get_replay(session, loco_id, minutes=minutes)

    if format == "json":
        content = json.dumps(frames, ensure_ascii=False, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="telemetry_{loco_id}.json"'},
        )

    # CSV
    if not frames:
        return Response(content="", media_type="text/csv")

    flat_rows = [_flatten(f) for f in frames]
    fieldnames = list(flat_rows[0].keys())

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(flat_rows)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="telemetry_{loco_id}.csv"'},
    )


def _flatten(d: dict, parent_key: str = "", sep: str = ".") -> dict:
    items: list = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(_flatten(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            items.append((new_key, str(v)))
        else:
            items.append((new_key, v))
    return dict(items)
