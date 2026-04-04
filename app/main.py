"""
FastAPI приложение — цифровой двойник локомотива.
"""

from __future__ import annotations

import logging
import time

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.session_auth import bootstrap_default_users
from app.config import get_cors_origins, get_settings, load_thresholds
from app.db.engine import get_session
from app.db import repository as repo
from app.db.engine import create_tables
from app.models.locomotive import LocomotiveSample
from app.routers import (
    alerts_router,
    auth_router,
    config_api,
    export,
    health,
    history,
    users_router,
    websocket,
)
from app.services.timeseries_store import timeseries_store
from app.services.bootstrap_locomotives import bootstrap_locomotives

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Locomotive Digital Twin API",
        description="Real-time telemetry dashboard for KZ8A and TE33A locomotives",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Роутеры
    app.include_router(websocket.router)
    app.include_router(auth_router.router)
    app.include_router(users_router.router)
    app.include_router(health.router)
    app.include_router(history.router)
    app.include_router(alerts_router.router)
    app.include_router(config_api.router)
    app.include_router(export.router)

    @app.on_event("startup")
    async def startup() -> None:
        load_thresholds()
        await create_tables()
        await timeseries_store.initialize()
        await bootstrap_default_users()
        await bootstrap_locomotives()
        logger.info(
            "DB tables ready. App started on %s:%s",
            settings.app_host,
            settings.app_port,
        )

    @app.get("/api/healthcheck", tags=["system"])
    async def healthcheck() -> dict:
        return {"status": "ok", "timestamp": time.time(), "version": "1.0.0"}

    @app.get("/api/locomotive/profiles", tags=["system"])
    async def locomotive_profiles() -> list[dict]:
        return [
            {
                "id": "KZ8A",
                "name": "KZ8A Электровоз",
                "manufacturer": "Alstom (Prima T8)",
                "type": "electric",
                "max_speed_kmh": 120,
                "power_kw": 8800,
                "axes": 8,
                "traction": "25 кВ AC",
            },
            {
                "id": "TE33A",
                "name": "ТЭ33А Тепловоз",
                "manufacturer": "GE Transportation (Evolution ES44ACi)",
                "type": "diesel",
                "max_speed_kmh": 120,
                "power_kw": 3356,
                "axes": 6,
                "traction": "diesel-electric",
            },
        ]

    @app.get("/api/locomotives", response_model=list[LocomotiveSample], tags=["system"])
    async def locomotives(
        session: AsyncSession = Depends(get_session),
    ) -> list[LocomotiveSample]:
        rows = await repo.list_locomotives(session)
        return [
            LocomotiveSample(
                loco_id=row.loco_id,
                loco_type=row.loco_type,
                label=row.label,
                manufacturer=row.manufacturer,
                is_active=row.is_active,
            )
            for row in rows
        ]

    return app


app = create_app()
