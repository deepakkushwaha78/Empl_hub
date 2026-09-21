from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import Role, User

password_hasher = PasswordHasher()
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def jwt_secret() -> str:
    secret = get_settings().jwt_secret_key
    if not secret or len(secret) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return secret


def create_access_token(user: User) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role.value,
            "iat": now,
            "exp": now + timedelta(minutes=get_settings().jwt_expire_minutes),
        },
        jwt_secret(),
        algorithm="HS256",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    error = HTTPException(
        status_code=401,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise error
    try:
        payload = jwt.decode(credentials.credentials, jwt_secret(), algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise error from None
    user = db.get(User, user_id)
    if not user or not user.is_active or user.role.value != payload.get("role"):
        raise error
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_employee(user: User = Depends(get_current_user)) -> User:
    if (
        user.role != Role.EMPLOYEE
        or not user.employee
        or user.employee.employment_status.value != "active"
    ):
        raise HTTPException(status_code=403, detail="Active employee access required")
    return user
