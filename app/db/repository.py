"""
Async CRUD-операции с PostgreSQL.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AlertRecord,
    HealthRecord,
    TelemetryRecord,
    UserRecord,
    UserSessionRecord,
)
from app.models.alerts import Alert, AlertStatus
from app.models.auth import UserRole
from app.models.health_index import HealthGrade, HealthHistory, HealthIndex
from app.models.telemetry import TelemetryFrame


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _from_ts(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


# ---------------------------------------------------------------------------
# Telemetry
# ---------------------------------------------------------------------------


async def save_telemetry(session: AsyncSession, frame: TelemetryFrame) -> None:
    record = TelemetryRecord(
        loco_id=frame.loco_id,
        loco_type=frame.loco_type.value,
        scenario=frame.scenario,
        ts=_from_ts(frame.timestamp),
        speed=frame.traction.speed,
        payload=frame.model_dump(),
    )
    session.add(record)
    await session.commit()


async def get_telemetry(
    session: AsyncSession,
    loco_id: str,
    from_ts: float | None = None,
    to_ts: float | None = None,
    limit: int = 10_000,
) -> list[dict]:
    stmt = select(TelemetryRecord).where(TelemetryRecord.loco_id == loco_id)
    if from_ts is not None:
        stmt = stmt.where(TelemetryRecord.ts >= _from_ts(from_ts))
    if to_ts is not None:
        stmt = stmt.where(TelemetryRecord.ts <= _from_ts(to_ts))
    stmt = stmt.order_by(TelemetryRecord.ts.desc()).limit(limit)
    result = await session.execute(stmt)
    return [row.payload for row in result.scalars()]


async def has_telemetry(session: AsyncSession, loco_id: str) -> bool:
    stmt = select(TelemetryRecord.id).where(TelemetryRecord.loco_id == loco_id).limit(1)
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_replay(
    session: AsyncSession,
    loco_id: str,
    minutes: int = 5,
) -> list[dict]:
    import time

    cutoff = time.time() - minutes * 60
    return await get_telemetry(session, loco_id, from_ts=cutoff)


async def purge_old_telemetry(
    session: AsyncSession,
    retention_hours: int = 72,
) -> int:
    import time

    cutoff = _from_ts(time.time() - retention_hours * 3600)
    result = await session.execute(
        delete(TelemetryRecord).where(TelemetryRecord.ts < cutoff)
    )
    await session.commit()
    return result.rowcount  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


async def save_health(session: AsyncSession, hi: HealthIndex) -> None:
    record = HealthRecord(
        loco_id=hi.loco_id,
        loco_type=hi.loco_type,
        ts=_from_ts(hi.timestamp),
        index=hi.index,
        grade=hi.grade.value,
        alert_penalty=hi.alert_penalty,
        group_scores=[gs.model_dump() for gs in hi.group_scores],
        top_factors=[f.model_dump() for f in hi.top_factors],
    )
    session.add(record)
    await session.commit()


async def get_health_history(
    session: AsyncSession,
    loco_id: str,
    from_ts: float | None = None,
    to_ts: float | None = None,
    limit: int = 10_000,
) -> list[HealthHistory]:
    stmt = select(HealthRecord).where(HealthRecord.loco_id == loco_id)
    if from_ts is not None:
        stmt = stmt.where(HealthRecord.ts >= _from_ts(from_ts))
    if to_ts is not None:
        stmt = stmt.where(HealthRecord.ts <= _from_ts(to_ts))
    stmt = stmt.order_by(HealthRecord.ts.asc()).limit(limit)
    result = await session.execute(stmt)
    return [
        HealthHistory(
            timestamp=row.ts.timestamp(),
            index=row.index,
            grade=HealthGrade(row.grade),
        )
        for row in result.scalars()
    ]


async def get_latest_health(session: AsyncSession, loco_id: str) -> HealthRecord | None:
    stmt = (
        select(HealthRecord)
        .where(HealthRecord.loco_id == loco_id)
        .order_by(HealthRecord.ts.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


async def save_alert(session: AsyncSession, alert: Alert) -> None:
    record = AlertRecord(
        alert_id=alert.alert_id,
        loco_id=alert.loco_id,
        loco_type=alert.loco_type,
        param_id=alert.param_id,
        label=alert.label,
        severity=alert.severity.value,
        status=alert.status.value,
        value=alert.value,
        threshold=alert.threshold,
        unit=alert.unit,
        message=alert.message,
        recommendation=alert.recommendation,
        penalty=alert.penalty,
        triggered_at=_from_ts(alert.triggered_at),
        resolved_at=_from_ts(alert.resolved_at) if alert.resolved_at else None,
    )
    # Upsert: ignore if alert_id already exists
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    stmt = (
        pg_insert(AlertRecord)
        .values(
            alert_id=record.alert_id,
            loco_id=record.loco_id,
            loco_type=record.loco_type,
            param_id=record.param_id,
            label=record.label,
            severity=record.severity,
            status=record.status,
            value=record.value,
            threshold=record.threshold,
            unit=record.unit,
            message=record.message,
            recommendation=record.recommendation,
            penalty=record.penalty,
            triggered_at=record.triggered_at,
            resolved_at=record.resolved_at,
        )
        .on_conflict_do_nothing(index_elements=["alert_id"])
    )
    await session.execute(stmt)
    await session.commit()


async def get_alerts(
    session: AsyncSession,
    loco_id: str,
    active_only: bool = False,
    limit: int = 1000,
) -> list[Alert]:
    stmt = select(AlertRecord).where(AlertRecord.loco_id == loco_id)
    if active_only:
        stmt = stmt.where(AlertRecord.status == "active")
    stmt = stmt.order_by(AlertRecord.triggered_at.desc()).limit(limit)
    result = await session.execute(stmt)

    alerts = []
    for row in result.scalars():
        alerts.append(
            Alert(
                alert_id=row.alert_id,
                loco_id=row.loco_id,
                loco_type=row.loco_type,
                param_id=row.param_id,
                label=row.label,
                severity=row.severity,
                status=row.status,
                value=row.value,
                threshold=row.threshold,
                unit=row.unit,
                message=row.message,
                recommendation=row.recommendation,
                penalty=row.penalty,
                triggered_at=row.triggered_at.timestamp(),
                resolved_at=row.resolved_at.timestamp() if row.resolved_at else None,
            )
        )
    return alerts


# ---------------------------------------------------------------------------
# Users and sessions
# ---------------------------------------------------------------------------


async def get_user_by_email(
    session: AsyncSession,
    email: str,
) -> UserRecord | None:
    stmt = select(UserRecord).where(UserRecord.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(
    session: AsyncSession,
    user_id: int,
) -> UserRecord | None:
    stmt = select(UserRecord).where(UserRecord.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_users(
    session: AsyncSession,
    active_only: bool = False,
) -> list[UserRecord]:
    stmt = select(UserRecord).order_by(UserRecord.created_at.asc())
    if active_only:
        stmt = stmt.where(UserRecord.is_active.is_(True))
    result = await session.execute(stmt)
    return list(result.scalars())


async def create_user(
    session: AsyncSession,
    email: str,
    full_name: str,
    role: UserRole | str,
    password_hash: str,
    password_salt: str,
    is_active: bool = True,
) -> UserRecord:
    record = UserRecord(
        email=email,
        full_name=full_name,
        role=role.value if isinstance(role, UserRole) else role,
        password_hash=password_hash,
        password_salt=password_salt,
        is_active=is_active,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def create_user_session(
    session: AsyncSession,
    user_id: int,
    session_token_hash: str,
    expires_at: datetime,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> UserSessionRecord:
    record = UserSessionRecord(
        user_id=user_id,
        session_token_hash=session_token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def get_valid_session_with_user(
    session: AsyncSession,
    session_token_hash: str,
) -> tuple[UserSessionRecord, UserRecord] | None:
    stmt = (
        select(UserSessionRecord, UserRecord)
        .join(UserRecord, UserRecord.id == UserSessionRecord.user_id)
        .where(UserSessionRecord.session_token_hash == session_token_hash)
        .where(UserSessionRecord.revoked_at.is_(None))
        .where(UserSessionRecord.expires_at > _now())
        .where(UserRecord.is_active.is_(True))
        .limit(1)
    )
    result = await session.execute(stmt)
    row = result.first()
    if row is None:
        return None
    return row[0], row[1]


async def revoke_session(
    session: AsyncSession,
    session_token_hash: str,
) -> bool:
    record = await get_session_by_hash(session, session_token_hash)
    if record is None or record.revoked_at is not None:
        return False
    record.revoked_at = _now()
    await session.commit()
    return True


async def get_session_by_hash(
    session: AsyncSession,
    session_token_hash: str,
) -> UserSessionRecord | None:
    stmt = select(UserSessionRecord).where(
        UserSessionRecord.session_token_hash == session_token_hash
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def purge_expired_user_sessions(session: AsyncSession) -> int:
    result = await session.execute(
        delete(UserSessionRecord).where(UserSessionRecord.expires_at <= _now())
    )
    await session.commit()
    return result.rowcount or 0
