from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, require_admin
from app.models.entities import Department, Employee, EmploymentStatus, User
from app.repositories.queries import employees_query, paged
from app.schemas.api import EmployeeCreate, EmployeeOut, EmployeeUpdate, Page, StatusUpdate
from app.services.common import audit
from app.utils.serializers import employee_out

router = APIRouter(prefix="/employees", tags=["employees"])


def validate_relations(
    db: Session, department_id: int | None, manager_id: int | None, self_id: int | None = None
) -> None:
    if department_id is not None and not db.get(Department, department_id):
        raise HTTPException(status_code=422, detail="Department does not exist")
    if manager_id is not None:
        if manager_id == self_id or not db.get(Employee, manager_id):
            raise HTTPException(status_code=422, detail="Invalid manager")


@router.get("", response_model=Page[EmployeeOut])
def list_employees(
    search: str | None = None,
    department_id: int | None = None,
    active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    items, total = paged(
        db,
        employees_query(search=search, department_id=department_id, active=active).order_by(
            Employee.id
        ),
        page,
        page_size,
    )
    return {
        "items": [employee_out(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> EmployeeOut:
    validate_relations(db, payload.department_id, payload.manager_id)
    user = User(
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.flush()
        employee = Employee(
            employee_code=payload.employee_code.strip().upper(),
            user_id=user.id,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            phone=payload.phone,
            department_id=payload.department_id,
            designation=payload.designation.strip(),
            joining_date=payload.joining_date,
            manager_id=payload.manager_id,
        )
        db.add(employee)
        db.flush()
        audit(
            db,
            "employee.created",
            user_id=actor.id,
            resource_type="employee",
            resource_id=str(employee.id),
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email or employee code already exists"
        ) from exc
    db.refresh(employee)
    return employee_out(employee)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: int, db: Session = Depends(get_db), actor: User = Depends(get_current_user)
) -> EmployeeOut:
    if actor.role.value != "admin" and (not actor.employee or actor.employee.id != employee_id):
        raise HTTPException(status_code=403, detail="Access denied")
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee_out(employee)


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> EmployeeOut:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    changes = payload.model_dump(exclude_unset=True)
    validate_relations(db, changes.get("department_id"), changes.get("manager_id"), employee_id)
    for field in ("first_name", "last_name", "designation", "joining_date"):
        if field in changes and changes[field] is None:
            raise HTTPException(status_code=422, detail=f"{field} cannot be null")
    if "email" in changes:
        if changes["email"] is None:
            raise HTTPException(status_code=422, detail="email cannot be null")
        employee.user.email = str(changes.pop("email")).lower()
    for field, value in changes.items():
        setattr(employee, field, value.strip() if isinstance(value, str) else value)
    try:
        audit(
            db,
            "employee.updated",
            user_id=actor.id,
            resource_type="employee",
            resource_id=str(employee.id),
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists") from exc
    db.refresh(employee)
    return employee_out(employee)


@router.patch("/{employee_id}/status", response_model=EmployeeOut)
def set_status(
    employee_id: int,
    payload: StatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> EmployeeOut:
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.user.is_active = payload.is_active
    employee.employment_status = (
        EmploymentStatus.ACTIVE if payload.is_active else EmploymentStatus.INACTIVE
    )
    audit(
        db,
        "employee.activated" if payload.is_active else "employee.deactivated",
        user_id=actor.id,
        resource_type="employee",
        resource_id=str(employee.id),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(employee)
    return employee_out(employee)
