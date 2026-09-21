from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.entities import Department, User
from app.schemas.api import DepartmentIn, DepartmentOut
from app.services.common import audit

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> list[Department]:
    return db.scalars(select(Department).order_by(Department.name)).all()


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(
    payload: DepartmentIn,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Department:
    department = Department(name=payload.name.strip(), description=payload.description)
    db.add(department)
    try:
        db.flush()
        audit(
            db,
            "department.created",
            user_id=actor.id,
            resource_type="department",
            resource_id=str(department.id),
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Department already exists") from exc
    db.refresh(department)
    return department
