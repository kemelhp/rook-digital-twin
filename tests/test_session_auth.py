from __future__ import annotations

import pytest

from app.auth.session_auth import (
    create_session_token,
    hash_password,
    hash_session_token,
    normalize_email,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    password_hash, password_salt = hash_password("ChangeMe123!")

    assert verify_password("ChangeMe123!", password_hash, password_salt) is True
    assert verify_password("wrong-password", password_hash, password_salt) is False


def test_normalize_email_lowercases_and_trims() -> None:
    assert normalize_email("  USER@Example.com ") == "user@example.com"


@pytest.mark.parametrize("email", ["missing-at-symbol", "@rook.local", "user@localhost"])
def test_normalize_email_rejects_invalid_addresses(email: str) -> None:
    with pytest.raises(ValueError):
        normalize_email(email)


def test_session_token_hash_is_stable_for_same_input() -> None:
    token = create_session_token()

    assert hash_session_token(token) == hash_session_token(token)
    assert token != create_session_token()
