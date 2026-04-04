from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class UserRole(str, Enum):
    viewer = "viewer"
    staff = "staff"
    admin = "admin"


def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    local_part, separator, domain_part = normalized.partition("@")
    if not separator or not local_part or "." not in domain_part:
        raise ValueError("Enter a valid email address.")
    return normalized


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.strip()) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return value


class UserCreateRequest(LoginRequest):
    full_name: str = Field(..., min_length=2, max_length=120)
    role: UserRole = UserRole.viewer

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least 2 characters.")
        return normalized


class UserSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: float
    last_login_at: float | None = None


class SessionResponse(BaseModel):
    user: UserSummary
    expires_at: float


class MessageResponse(BaseModel):
    detail: str
