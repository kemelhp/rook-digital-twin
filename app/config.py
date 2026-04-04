"""
Конфигурация приложения: ENV-переменные + загрузка thresholds.yaml.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic_settings import BaseSettings


CONFIG_DIR = Path(__file__).parent.parent / "config"


class Settings(BaseSettings):
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    auth_username: str = "admin"
    auth_password: str = "changeme"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    session_secret: str = "change-me-in-production"
    session_cookie_name: str = "rook_session"
    session_ttl_hours: int = 24
    session_cookie_secure: bool = False
    default_admin_email: str = "admin@rook.local"
    default_admin_password: str = "ChangeMe123!"
    default_admin_name: str = "Operations Admin"
    default_staff_email: str = "staff@rook.local"
    default_staff_password: str = "ChangeMe123!"
    default_staff_name: str = "Dispatch Staff"
    simulator_frequency_hz: float = 1.0
    simulator_loco_type: str = "TE33A"
    history_retention_hours: int = 72
    thresholds_path: Path = CONFIG_DIR / "thresholds.yaml"

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://loco:loco@localhost:5432/digital_twin"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_cors_origins() -> list[str]:
    settings = get_settings()
    return [
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ]


# ---------------------------------------------------------------------------
# Загрузка/сохранение YAML-конфига порогов
# ---------------------------------------------------------------------------

_thresholds_cache: dict[str, Any] | None = None


def load_thresholds() -> dict[str, Any]:
    global _thresholds_cache
    path = get_settings().thresholds_path
    with open(path, "r", encoding="utf-8") as f:
        _thresholds_cache = yaml.safe_load(f)
    return _thresholds_cache  # type: ignore[return-value]


def get_thresholds() -> dict[str, Any]:
    if _thresholds_cache is None:
        return load_thresholds()
    return _thresholds_cache


def save_thresholds(data: dict[str, Any]) -> None:
    global _thresholds_cache
    path = get_settings().thresholds_path
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
    _thresholds_cache = data
