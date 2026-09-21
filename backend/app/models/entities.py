from datetime import UTC, date, datetime, time
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


def enum_column(enum: type[StrEnum]) -> Enum:
    return Enum(
        enum,
        values_callable=lambda values: [item.value for item in values],
        native_enum=False,
        validate_strings=True,
    )


class Role(StrEnum):
    ADMIN = "admin"
    EMPLOYEE = "employee"


class EmploymentStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class AttendanceStatus(StrEnum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"
    LEAVE = "leave"
    WORK_FROM_HOME = "work_from_home"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(enum_column(Role), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    employee: Mapped["Employee | None"] = relationship(back_populates="user", uselist=False)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(32))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), index=True)
    designation: Mapped[str] = mapped_column(String(120))
    joining_date: Mapped[date] = mapped_column(Date)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        enum_column(EmploymentStatus), default=EmploymentStatus.ACTIVE
    )
    user: Mapped[User] = relationship(back_populates="employee")
    department: Mapped[Department | None] = relationship(back_populates="employees")
    manager: Mapped["Employee | None"] = relationship(remote_side="Employee.id")
    attendance: Mapped[list["Attendance"]] = relationship(back_populates="employee")


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_attendance_employee_date"),
        CheckConstraint(
            "working_minutes IS NULL OR working_minutes >= 0", name="ck_working_minutes"
        ),
        Index("ix_attendance_date_status", "attendance_date", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    attendance_date: Mapped[date] = mapped_column(Date, index=True)
    check_in_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    check_out_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    working_minutes: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[AttendanceStatus] = mapped_column(enum_column(AttendanceStatus))
    is_late: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    check_in_ip: Mapped[str | None] = mapped_column(String(45))
    check_out_ip: Mapped[str | None] = mapped_column(String(45))
    employee: Mapped[Employee] = relationship(back_populates="attendance")


class AttendanceSettings(Base):
    __tablename__ = "attendance_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    office_start_time: Mapped[time] = mapped_column(Time, default=time(9, 30))
    office_end_time: Mapped[time] = mapped_column(Time, default=time(18, 0))
    late_after_minutes: Mapped[int] = mapped_column(Integer, default=0)
    half_day_hours: Mapped[int] = mapped_column(Integer, default=4)
    full_day_hours: Mapped[int] = mapped_column(Integer, default=8)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    working_weekdays: Mapped[list[int]] = mapped_column(JSON, default=lambda: [0, 1, 2, 3, 4])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str | None] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(80))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    detail: Mapped[str | None] = mapped_column(Text)
    actor: Mapped[User | None] = relationship()
