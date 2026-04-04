from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.session_auth import (
    build_session_response,
    build_user_summary,
    clear_session_cookie,
    get_current_user,
    issue_session,
    revoke_request_session,
    set_session_cookie,
    verify_password,
)
from app.db import repository as repo
from app.db.engine import get_session
from app.db.models import UserRecord
from app.models.auth import LoginRequest, MessageResponse, SessionResponse, UserSummary

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=SessionResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> SessionResponse:
    user = await repo.get_user_by_email(session, payload.email)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not verify_password(payload.password, user.password_hash, user.password_salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token, expires_at = await issue_session(session, user, request)
    set_session_cookie(response, token, expires_at)
    return build_session_response(user, expires_at)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await revoke_request_session(request, session)
    clear_session_cookie(response)
    return MessageResponse(detail="Logged out.")


@router.get("/me", response_model=UserSummary)
async def me(user: UserRecord = Depends(get_current_user)) -> UserSummary:
    return build_user_summary(user)
