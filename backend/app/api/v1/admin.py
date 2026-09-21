from collections import Counter
from datetime import date, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import require_admin
from app.models.entities import (
    Attendance,
    AttendanceStatus,
    AuditLog,
    Department,
    Employee,
    EmploymentStatus,
    User,
)
from app.repositories.queries import attendance_query, paged
from app.schemas.api import (
    AdminDashboardOut,
    AttendanceOut,
    AttendanceStatusUpdate,
    AuditOut,
    Page,
    ReportOut,
)
from app.services.attendance import local_today
from app.services.common import audit, organization_settings
from app.utils.serializers import attendance_out

router = APIRouter(prefix="/admin", tags=["admin"])
PRESENT_STATUSES = {
    AttendanceStatus.PRESENT,
    AttendanceStatus.LATE,
    AttendanceStatus.HALF_DAY,
    AttendanceStatus.WORK_FROM_HOME,
}


@router.get("/audit-logs", response_model=Page[AuditOut])
def audit_logs(
    action: str | None = None,
    user_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    query = select(AuditLog).options(joinedload(AuditLog.actor))
    if action:
        query = query.where(AuditLog.action == action)
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
    items, total = paged(
        db, query.order_by(AuditLog.occurred_at.desc(), AuditLog.id.desc()), page, page_size
    )
    return {
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "actor_email": item.actor.email if item.actor else None,
                "action": item.action,
                "resource_type": item.resource_type,
                "resource_id": item.resource_id,
                "ip_address": item.ip_address,
                "occurred_at": item.occurred_at,
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/dashboard", response_model=AdminDashboardOut)
def dashboard(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    current_date = local_today(db)
    employees = db.scalars(
        select(Employee)
        .join(User)
        .where(User.is_active.is_(True), Employee.employment_status == EmploymentStatus.ACTIVE)
    ).all()
    employee_ids = {employee.id for employee in employees}
    today_records = db.scalars(
        select(Attendance).where(Attendance.attendance_date == current_date)
    ).all()
    todays = [item for item in today_records if item.employee_id in employee_ids]
    present_ids = {item.employee_id for item in todays if item.status in PRESENT_STATUSES}
    settings = organization_settings(db)
    expected_today = (
        {employee.id for employee in employees if employee.joining_date <= current_date}
        if current_date.weekday() in settings.working_weekdays
        else set()
    )
    absent_today = len(
        expected_today
        - present_ids
        - {item.employee_id for item in todays if item.status == AttendanceStatus.LEAVE}
    )
    start = current_date - timedelta(days=6)
    trend_records = db.scalars(
        select(Attendance).where(
            Attendance.attendance_date >= start, Attendance.attendance_date <= current_date
        )
    ).all()
    daily_trend = [
        {
            "date": (start + timedelta(days=offset)).isoformat(),
            "present": sum(
                item.attendance_date == start + timedelta(days=offset)
                and item.status in PRESENT_STATUSES
                for item in trend_records
            ),
        }
        for offset in range(7)
    ]
    monthly_trend = []
    for offset in range(5, -1, -1):
        year = current_date.year
        month = current_date.month - offset
        while month <= 0:
            month += 12
            year -= 1
        count = (
            db.scalar(
                select(func.count(Attendance.id)).where(
                    func.extract("year", Attendance.attendance_date) == year,
                    func.extract("month", Attendance.attendance_date) == month,
                    Attendance.status.in_(PRESENT_STATUSES),
                )
            )
            or 0
        )
        monthly_trend.append({"month": f"{year}-{month:02d}", "present": count})
    department_counts = Counter(
        item.employee.department.name if item.employee.department else "Unassigned"
        for item in todays
        if item.status in PRESENT_STATUSES
    )
    return {
        "date": current_date,
        "timezone": organization_settings(db).timezone,
        "total_employees": len(employees),
        "present_today": len(present_ids),
        "absent_today": absent_today,
        "late_today": sum(item.is_late for item in todays),
        "currently_checked_in": sum(
            item.employee_id in employee_ids
            and item.check_in_time is not None
            and item.check_out_time is None
            for item in db.scalars(
                select(Attendance).where(Attendance.check_out_time.is_(None))
            ).all()
        ),
        "total_departments": db.scalar(select(func.count(Department.id))) or 0,
        "daily_trend": daily_trend,
        "monthly_trend": monthly_trend,
        "department_attendance": [
            {"department": name, "present": count} for name, count in department_counts.items()
        ],
        "present_vs_absent": {"present": len(present_ids), "absent": absent_today},
    }


@router.get("/attendance", response_model=Page[AttendanceOut])
def admin_attendance(
    search: str | None = None,
    employee_id: int | None = None,
    department_id: int | None = None,
    status: AttendanceStatus | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    query = attendance_query(
        search=search,
        employee_id=employee_id,
        department_id=department_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
    ).order_by(Attendance.attendance_date.desc(), Attendance.id.desc())
    items, total = paged(db, query, page, page_size)
    return {
        "items": [attendance_out(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/attendance/{attendance_id}", response_model=AttendanceOut)
def update_attendance_status(
    attendance_id: int,
    payload: AttendanceStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> dict:
    record = db.get(Attendance, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance not found")
    record.status = payload.status
    if payload.status == AttendanceStatus.LATE:
        record.is_late = True
    elif payload.status in {
        AttendanceStatus.PRESENT,
        AttendanceStatus.ABSENT,
        AttendanceStatus.LEAVE,
        AttendanceStatus.WORK_FROM_HOME,
    }:
        record.is_late = False
    audit(
        db,
        "attendance.updated",
        user_id=actor.id,
        resource_type="attendance",
        resource_id=str(record.id),
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return attendance_out(record).model_dump(mode="json")


class ManualAttendanceIn(BaseModel):
    employee_id: int
    attendance_date: date
    status: Literal["absent", "leave", "work_from_home"]


@router.post("/attendance/manual", response_model=AttendanceOut, status_code=201)
def create_manual_attendance(
    payload: ManualAttendanceIn,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
) -> dict:
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date == payload.attendance_date,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Attendance already recorded for this date")
    record = Attendance(
        employee_id=employee.id,
        attendance_date=payload.attendance_date,
        status=AttendanceStatus(payload.status),
        is_late=False,
    )
    db.add(record)
    try:
        db.flush()
        audit(
            db,
            "attendance.created_by_admin",
            user_id=actor.id,
            resource_type="attendance",
            resource_id=str(record.id),
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Attendance already recorded for this date"
        ) from exc
    return attendance_out(record).model_dump(mode="json")


class SettingsUpdate(BaseModel):
    timezone: str | None = None
    office_start_time: time | None = None
    office_end_time: time | None = None
    late_after_minutes: int | None = Field(default=None, ge=0, le=240)
    half_day_hours: int | None = Field(default=None, ge=1, le=24)
    full_day_hours: int | None = Field(default=None, ge=1, le=24)
    working_weekdays: list[int] | None = None


@router.put("/settings")
def update_settings(
    payload: SettingsUpdate, db: Session = Depends(get_db), actor: User = Depends(require_admin)
) -> dict:
    settings = organization_settings(db)
    changes = payload.model_dump(exclude_unset=True)
    if "timezone" in changes:
        try:
            ZoneInfo(changes["timezone"])
        except (KeyError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid timezone") from None
    if "working_weekdays" in changes and (
        not changes["working_weekdays"]
        or any(day not in range(7) for day in changes["working_weekdays"])
    ):
        raise HTTPException(status_code=422, detail="Working weekdays must be numbers from 0 to 6")
    if changes.get("half_day_hours", settings.half_day_hours) > changes.get(
        "full_day_hours", settings.full_day_hours
    ):
        raise HTTPException(status_code=422, detail="Half-day hours cannot exceed full-day hours")
    for key, value in changes.items():
        if value is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
        setattr(settings, key, value)
    audit(
        db,
        "attendance.settings_updated",
        user_id=actor.id,
        resource_type="attendance_settings",
        resource_id="1",
    )
    db.commit()
    return {
        "timezone": settings.timezone,
        "office_start_time": settings.office_start_time.isoformat(),
        "office_end_time": settings.office_end_time.isoformat(),
        "late_after_minutes": settings.late_after_minutes,
        "half_day_hours": settings.half_day_hours,
        "full_day_hours": settings.full_day_hours,
        "working_weekdays": settings.working_weekdays,
    }


@router.get("/reports", response_model=ReportOut)
def reports(
    start_date: date | None = None,
    end_date: date | None = None,
    period: str = Query(default="monthly", pattern="^(daily|weekly|monthly|custom)$"),
    employee_id: int | None = None,
    department_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    today = local_today(db)
    end = end_date or today
    start = start_date or (
        end
        if period == "daily"
        else end - timedelta(days=6)
        if period == "weekly"
        else end.replace(day=1)
    )
    if end < start or end > today or (end - start).days > 366:
        raise HTTPException(
            status_code=422,
            detail="Date range must end by today, be ordered, and be no longer than 366 days",
        )
    query = select(Employee)
    if employee_id is not None:
        query = query.where(Employee.id == employee_id)
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)
    employees = db.scalars(query.order_by(Employee.employee_code)).all()
    settings = organization_settings(db)
    records = db.scalars(
        select(Attendance).where(
            Attendance.attendance_date >= start, Attendance.attendance_date <= end
        )
    ).all()
    by_employee: dict[int, list[Attendance]] = {}
    for record in records:
        by_employee.setdefault(record.employee_id, []).append(record)
    rows = []
    for employee in employees:
        own = by_employee.get(employee.id, [])
        present = sum(item.status in PRESENT_STATUSES for item in own)
        leave = sum(item.status == AttendanceStatus.LEAVE for item in own)
        effective_start = max(start, employee.joining_date)
        working_days = sum(
            (effective_start + timedelta(days=day)).weekday() in settings.working_weekdays
            for day in range(max(0, (end - effective_start).days + 1))
        )
        minutes = sum(item.working_minutes or 0 for item in own)
        rows.append(
            {
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "department": employee.department.name if employee.department else None,
                "present_days": present,
                "absent_days": max(0, working_days - present - leave),
                "late_days": sum(item.is_late for item in own),
                "leave_days": leave,
                "total_working_minutes": minutes,
                "average_working_minutes": round(minutes / present) if present else 0,
            }
        )
    return {"start_date": start, "end_date": end, "timezone": settings.timezone, "rows": rows}
