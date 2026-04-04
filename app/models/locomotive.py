from __future__ import annotations

from pydantic import BaseModel


class LocomotiveSample(BaseModel):
    loco_id: str
    loco_type: str
    label: str
    manufacturer: str
    is_active: bool
