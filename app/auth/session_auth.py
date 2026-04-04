from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import repository as repo
from app.db.engine import AsyncSessionLocal, get_session
from app.db.models import UserRecord, UserSessionRecord
from app.models.auth import SessionResponse, UserCreateRequest, UserRole, UserSummary

PBKDF2_ITERATIONS = 390_000


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _b64_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64_decode(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    local_part, separator, domain_part = normalized.partition("@")
    if not separator or not local_part or "." not in domain_part:
        raise ValueError("Enter a valid email address.")
    return normalized


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if len(password.strip()) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    salt_bytes = secrets.token_bytes(16) if salt is None else _b64_decode(salt)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PBKDF2_ITERATIONS,
    )
    return _b64_encode(digest), _b64_encode(salt_bytes)


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    computed_hash, _ = hash_password(password, salt=password_salt)
    return secrets.compare_digest(computed_hash, password_hash)


def create_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    secret = get_settings().session_secret.encode("utf-8")
    return hmac.new(secret, token.encode("utf-8"), hashlib.sha256).hexdigest()


def session_expiry() -> datetime:
    return _now() + timedelta(hours=get_settings().session_ttl_hours)


def build_user_summary(user: UserRecord) -> UserSummary:
    return UserSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at.timestamp(),
        last_login_at=user.last_login_at.timestamp() if user.last_login_at else None,
    )


def build_session_response(user: UserRecord, expires_at: datetime) -> SessionResponse:
    return SessionResponse(user=build_user_summary(user), expires_at=expires_at.timestamp())


def set_session_cookie(response: Response, token: str, expires_at: datetime) -> None:
    settings = get_settings()
    max_age = max(int((expires_at - _now()).total_seconds()), 0)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=get_settings().session_cookie_name,
        httponly=True,
        secure=get_settings().session_cookie_secure,
        samesite="lax",
        path="/",
    )


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client is None:
        return None
    return request.client.host


def _unauthorized(detail: str = "Authentication required") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> UserRecord:
    token = request.cookies.get(get_settings().session_cookie_name)
    if not token:
        raise _unauthorized()
    session_bundle = await repo.get_valid_session_with_user(session, hash_session_token(token))
    if session_bundle is None:
        raise _unauthorized("Session expired or invalid.")
    _, user = session_bundle
    return user


async def require_staff(user: UserRecord = Depends(get_current_user)) -> UserRecord:
    if user.role not in {UserRole.staff.value, UserRole.admin.value}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access is required.",
        )
    return user


async def require_admin(user: UserRecord = Depends(get_current_user)) -> UserRecord:
    if user.role != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required.",
        )
    return user


async def create_user_account(
    session: AsyncSession,
    payload: UserCreateRequest,
) -> UserRecord:
    email = normalize_email(payload.email)
    existing = await repo.get_user_by_email(session, email)
    if existing is not None:
        raise ValueError("A user with this email already exists.")
    password_hash, password_salt = hash_password(payload.password)
    return await repo.create_user(
        session,
        email=email,
        full_name=payload.full_name,
        role=payload.role,
        password_hash=password_hash,
        password_salt=password_salt,
    )


async def issue_session(
    session: AsyncSession,
    user: UserRecord,
    request: Request,
) -> tuple[str, datetime]:
    token = create_session_token()
    expires_at = session_expiry()
    user.last_login_at = _now()
    session.add(
        UserSessionRecord(
            user_id=user.id,
            session_token_hash=hash_session_token(token),
            expires_at=expires_at,
            user_agent=request.headers.get("user-agent"),
            ip_address=_get_client_ip(request),
        )
    )
    await session.commit()
    await session.refresh(user)
    return token, expires_at


async def revoke_request_session(
    request: Request,
    session: AsyncSession,
) -> None:
    token = request.cookies.get(get_settings().session_cookie_name)
    if not token:
        return
    await repo.revoke_session(session, hash_session_token(token))


async def bootstrap_default_users() -> None:
    settings = get_settings()
    defaults = [
        UserCreateRequest(
            email=settings.default_admin_email,
            password=settings.default_admin_password,
            full_name=settings.default_admin_name,
            role=UserRole.admin,
        ),
        UserCreateRequest(
            email=settings.default_staff_email,
            password=settings.default_staff_password,
            full_name=settings.default_staff_name,
            role=UserRole.staff,
        ),
    ]

    async with AsyncSessionLocal() as session:
        await repo.purge_expired_user_sessions(session)
        for payload in defaults:
            existing = await repo.get_user_by_email(session, payload.email)
            if existing is None:
                password_hash, password_salt = hash_password(payload.password)
                await repo.create_user(
                    session,
                    email=payload.email,
                    full_name=payload.full_name,
                    role=payload.role,
                    password_hash=password_hash,
                    password_salt=password_salt,
                )
