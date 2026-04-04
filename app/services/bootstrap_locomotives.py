from __future__ import annotations

from app.db.engine import AsyncSessionLocal
from app.db import repository as repo


DEFAULT_LOCOMOTIVES = [
    {
        "loco_id": "TE33A-001",
        "loco_type": "TE33A",
        "label": "ТЭ33А-001",
        "manufacturer": "GE Transportation (Evolution ES44ACi)",
    },
    {
        "loco_id": "TE33A-002",
        "loco_type": "TE33A",
        "label": "ТЭ33А-002",
        "manufacturer": "GE Transportation (Evolution ES44ACi)",
    },
    {
        "loco_id": "KZ8A-001",
        "loco_type": "KZ8A",
        "label": "KZ8A-001",
        "manufacturer": "Alstom (Prima T8)",
    },
    {
        "loco_id": "KZ8A-002",
        "loco_type": "KZ8A",
        "label": "KZ8A-002",
        "manufacturer": "Alstom (Prima T8)",
    },
]


async def bootstrap_locomotives() -> None:
    async with AsyncSessionLocal() as session:
        for item in DEFAULT_LOCOMOTIVES:
            existing = await repo.get_locomotive_by_id(session, item["loco_id"])
            if existing is not None:
                continue
            await repo.create_locomotive(
                session,
                loco_id=item["loco_id"],
                loco_type=item["loco_type"],
                label=item["label"],
                manufacturer=item["manufacturer"],
            )
