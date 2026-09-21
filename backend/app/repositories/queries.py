from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Attendance, AttendanceStatus, Employee, User


def employees_query(
    *, search: str | None = None, department_id: int | None = None, active: bool | None = None
) -> Select:
    query = (
        select(Employee)
        .join(User)
        .options(joinedload(Employee.user), joinedload(Employee.department))
    )
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Employee.employee_code.ilike(pattern),
                Employee.first_name.ilike(pattern),
                Employee.last_name.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)
    if active is not None:
        query = query.where(User.is_active == active)
    return query


def attendance_query(
    *,
    employee_id: int | None = None,
    department_id: int | None = None,
    status: AttendanceStatus | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
) -> Select:
    query = (
        select(Attendance)
        .join(Employee)
        .join(User)
        .options(
            joinedload(Attendance.employee).joinedload(Employee.user),
            joinedload(Attendance.employee).joinedload(Employee.department),
        )
    )
    if employee_id is not None:
        query = query.where(Attendance.employee_id == employee_id)
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)
    if status is not None:
        query = query.where(Attendance.status == status)
    if start_date is not None:
        query = query.where(Attendance.attendance_date >= start_date)
    if end_date is not None:
        query = query.where(Attendance.attendance_date <= end_date)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Employee.employee_code.ilike(pattern),
                Employee.first_name.ilike(pattern),
                Employee.last_name.ilike(pattern),
            )
        )
    return query


def paged(db: Session, query: Select, page: int, page_size: int) -> tuple[list, int]:
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return items, total
