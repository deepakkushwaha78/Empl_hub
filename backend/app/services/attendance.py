from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.entities import Attendance, AttendanceStatus, Employee, User
from app.services.common import audit, organization_settings


def local_today(db: Session, now: datetime | None = None) -> date:
    instant = now or datetime.now(UTC)
    return instant.astimezone(ZoneInfo(organization_settings(db).timezone)).date()


def check_in(
    db: Session, user: User, ip: str | None, *, work_from_home: bool = False
) -> Attendance:
    now = datetime.now(UTC)
    settings = organization_settings(db)
    local = now.astimezone(ZoneInfo(settings.timezone))
    employee = db.scalar(select(Employee).where(Employee.id == user.employee.id).with_for_update())
    if employee is None:
        raise HTTPException(status_code=403, detail="Employee profile required")
    open_record = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id,
            Attendance.check_in_time.is_not(None),
            Attendance.check_out_time.is_(None),
        )
    )
    if open_record:
        raise HTTPException(status_code=409, detail="You are already checked in.")
    existing = db.scalar(
        select(Attendance).where(
            Attendance.employee_id == employee.id, Attendance.attendance_date == local.date()
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Attendance already recorded for today.")
    office_start = datetime.combine(
        local.date(), settings.office_start_time, tzinfo=ZoneInfo(settings.timezone)
    )
    late = local > office_start + timedelta(minutes=settings.late_after_minutes)
    status = (
        AttendanceStatus.WORK_FROM_HOME
        if work_from_home
        else AttendanceStatus.LATE
        if late
        else AttendanceStatus.PRESENT
    )
    record = Attendance(
        employee_id=employee.id,
        attendance_date=local.date(),
        check_in_time=now,
        status=status,
        is_late=late,
        check_in_ip=ip,
    )
    db.add(record)
    try:
        db.flush()
        audit(
            db,
            "employee.checked_in",
            user_id=user.id,
            resource_type="attendance",
            resource_id=str(record.id),
            ip_address=ip,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Attendance already recorded for today."
        ) from exc
    db.refresh(record)
    return record


def check_out(db: Session, user: User, ip: str | None) -> Attendance:
    db.scalar(select(Employee).where(Employee.id == user.employee.id).with_for_update())
    record = db.scalar(
        select(Attendance)
        .where(
            Attendance.employee_id == user.employee.id,
            Attendance.check_in_time.is_not(None),
            Attendance.check_out_time.is_(None),
        )
        .with_for_update()
    )
    if record is None:
        raise HTTPException(status_code=409, detail="No active check-in found.")
    now = datetime.now(UTC)
    start = (
        record.check_in_time.replace(tzinfo=UTC)
        if record.check_in_time.tzinfo is None
        else record.check_in_time
    )
    minutes = max(0, int((now - start).total_seconds() // 60))
    record.check_out_time = now
    record.working_minutes = minutes
    settings = organization_settings(db)
    if record.status != AttendanceStatus.WORK_FROM_HOME:
        if minutes < settings.half_day_hours * 60:
            record.status = AttendanceStatus.ABSENT
        elif minutes < settings.full_day_hours * 60:
            record.status = AttendanceStatus.HALF_DAY
    audit(
        db,
        "employee.checked_out",
        user_id=user.id,
        resource_type="attendance",
        resource_id=str(record.id),
        ip_address=ip,
    )
    record.check_out_ip = ip
    db.commit()
    db.refresh(record)
    return record
