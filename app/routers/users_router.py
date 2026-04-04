from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.session_auth import build_user_summary, create_user_account, require_admin, require_staff
from app.db import repository as repo
from app.db.engine import get_session
from app.db.models import UserRecord
from app.models.auth import UserCreateRequest, UserSummary

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserSummary])
async def list_all_users(
    _: UserRecord = Depends(require_staff),
    session: AsyncSession = Depends(get_session),
) -> list[UserSummary]:
    users = await repo.list_users(session, active_only=False)
    return [build_user_summary(user) for user in users]


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    _: UserRecord = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> UserSummary:
    try:
        user = await create_user_account(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return build_user_summary(user)
