from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    verify_password,
)
from app.models.entities import AuditLog, EmploymentStatus, Role, User
from app.repositories.queries import paged
from app.schemas.api import LoginIn, LoginOut, Page, StatusUpdate, UserOut
from app.services.common import audit
from app.utils.serializers import user_out

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> LoginOut:
    email = str(payload.email).lower()
    ip = request.client.host if request.client else None
    cutoff = datetime.now(UTC) - timedelta(minutes=15)
    failed = (
        db.scalar(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "auth.login_failed",
                AuditLog.detail == email,
                AuditLog.ip_address == ip,
                AuditLog.occurred_at >= cutoff,
            )
        )
        or 0
    )
    if failed >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        audit(
            db, "auth.login_failed", user_id=user.id if user else None, ip_address=ip, detail=email
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    audit(db, "auth.login_success", user_id=user.id, ip_address=ip)
    db.commit()
    return LoginOut(access_token=create_access_token(user), user=user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return user_out(user)


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, bool]:
    audit(
        db,
        "auth.logout",
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"ok": True}


@router.get("/users", response_model=Page[UserOut])
def list_users(
    search: str | None = None,
    role: Role | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=422, detail="Invalid pagination")
    query = select(User).options(joinedload(User.employee))
    if search:
        query = query.where(User.email.ilike(f"%{search.strip()}%"))
    if role:
        query = query.where(User.role == role)
    if active is not None:
        query = query.where(User.is_active == active)
    items, total = paged(db, query.order_by(User.id), page, page_size)
    return {
        "items": [user_out(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/users/{user_id}/status", response_model=UserOut)
def set_user_status(
    user_id: int,
    payload: StatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserOut:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.id == target.id and not payload.is_active:
        raise HTTPException(status_code=409, detail="You cannot deactivate your own account")
    target.is_active = payload.is_active
    if target.employee:
        target.employee.employment_status = (
            EmploymentStatus.ACTIVE if payload.is_active else EmploymentStatus.INACTIVE
        )
    audit(
        db,
        "user.activated" if payload.is_active else "user.deactivated",
        user_id=actor.id,
        resource_type="user",
        resource_id=str(target.id),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return user_out(target)


class AdminCreate(LoginIn):
    password: str = Field(min_length=12, max_length=128)


@router.post("/admins", response_model=UserOut, status_code=201)
def create_admin(
    payload: AdminCreate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserOut:
    email = str(payload.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already exists")
    user = User(email=email, password_hash=hash_password(payload.password), role=Role.ADMIN)
    db.add(user)
    try:
        db.flush()
        audit(
            db,
            "admin.created",
            user_id=actor.id,
            resource_type="user",
            resource_id=str(user.id),
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists") from exc
    return user_out(user)
