from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_employee
from app.models.entities import Attendance, AttendanceStatus, User
from app.repositories.queries import attendance_query, paged
from app.schemas.api import (
    AttendanceOut,
    EmployeeDashboardOut,
    Page,
    SettingsOut,
    TodayOut,
)
from app.services.attendance import check_in, check_out, local_today
from app.services.common import organization_settings
from app.utils.serializers import attendance_out

router = APIRouter(prefix="/attendance", tags=["attendance"])


class CheckInIn(BaseModel):
    work_from_home: bool = False


@router.post("/check-in", response_model=AttendanceOut, status_code=201)
def check_in_route(
    request: Request,
    payload: CheckInIn | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_employee),
) -> AttendanceOut:
    return attendance_out(
        check_in(
            db,
            user,
            request.client.host if request.client else None,
            work_from_home=payload.work_from_home if payload else False,
        )
    )


@router.post("/check-out", response_model=AttendanceOut)
def check_out_route(
    request: Request, db: Session = Depends(get_db), user: User = Depends(require_employee)
) -> AttendanceOut:
    return attendance_out(check_out(db, user, request.client.host if request.client else None))


@router.get("/settings", response_model=SettingsOut)
def get_attendance_settings(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
) -> SettingsOut:
    settings = organization_settings(db)
    return SettingsOut(
        timezone=settings.timezone,
        office_start_time=settings.office_start_time.isoformat(),
        office_end_time=settings.office_end_time.isoformat(),
        late_after_minutes=settings.late_after_minutes,
        half_day_hours=settings.half_day_hours,
        full_day_hours=settings.full_day_hours,
    )


@router.get("/today", response_model=TodayOut)
def today(db: Session = Depends(get_db), user: User = Depends(require_employee)) -> dict:
    current_date = local_today(db)
    record = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == user.employee.id, Attendance.attendance_date == current_date
        )
    )
    state = (
        "not_checked_in" if not record else "checked_out" if record.check_out_time else "checked_in"
    )
    return {
        "date": current_date,
        "timezone": organization_settings(db).timezone,
        "state": state,
        "record": attendance_out(record) if record else None,
    }


@router.get("/me", response_model=Page[AttendanceOut])
def my_history(
    start_date: date | None = None,
    end_date: date | None = None,
    status: AttendanceStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_employee),
) -> dict:
    query = attendance_query(
        employee_id=user.employee.id, start_date=start_date, end_date=end_date, status=status
    ).order_by(Attendance.attendance_date.desc())
    items, total = paged(db, query, page, page_size)
    return {
        "items": [attendance_out(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/dashboard", response_model=EmployeeDashboardOut)
def employee_dashboard(
    db: Session = Depends(get_db), user: User = Depends(require_employee)
) -> dict:
    current_date = local_today(db)
    month_start = current_date.replace(day=1)
    records = db.scalars(
        select(Attendance).where(
            Attendance.employee_id == user.employee.id,
            Attendance.attendance_date >= month_start,
            Attendance.attendance_date <= current_date,
        )
    ).all()
    settings = organization_settings(db)
    working_days = (
        sum(
            1
            for day in range((current_date - max(month_start, user.employee.joining_date)).days + 1)
            if (max(month_start, user.employee.joining_date).toordinal() + day - 1) % 7
            in settings.working_weekdays
        )
        if user.employee.joining_date <= current_date
        else 0
    )
    leave = sum(item.status == AttendanceStatus.LEAVE for item in records)
    present = sum(
        item.status
        in {
            AttendanceStatus.PRESENT,
            AttendanceStatus.LATE,
            AttendanceStatus.HALF_DAY,
            AttendanceStatus.WORK_FROM_HOME,
        }
        for item in records
    )
    return {
        "today": today(db, user),
        "month": current_date.strftime("%B %Y"),
        "days_present": present,
        "days_absent": max(0, working_days - present - leave),
        "days_late": sum(item.is_late for item in records),
        "leave_days": leave,
        "total_working_minutes": sum(attendance_out(item).working_minutes or 0 for item in records),
    }
