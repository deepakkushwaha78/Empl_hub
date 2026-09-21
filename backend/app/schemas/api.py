from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.entities import AttendanceStatus, EmploymentStatus, Role


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    employee_id: int | None = None
    is_active: bool


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class DepartmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class DepartmentOut(DepartmentIn):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeCreate(BaseModel):
    employee_code: str = Field(min_length=1, max_length=32)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    department_id: int | None = None
    designation: str = Field(min_length=1, max_length=120)
    joining_date: date
    manager_id: int | None = None
    role: Role = Role.EMPLOYEE

    @field_validator("employee_code", "first_name", "last_name", "designation")
    @classmethod
    def nonblank_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be blank")
        return value


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    department_id: int | None = None
    designation: str | None = Field(default=None, min_length=1, max_length=120)
    joining_date: date | None = None
    manager_id: int | None = None

    @field_validator("first_name", "last_name", "designation")
    @classmethod
    def nonblank_fields(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Field cannot be blank")
        return value.strip() if value is not None else None


class StatusUpdate(BaseModel):
    is_active: bool


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    user_id: int
    first_name: str
    last_name: str
    name: str
    email: EmailStr
    phone: str | None
    department_id: int | None
    department: str | None
    designation: str
    joining_date: date
    manager_id: int | None
    employment_status: EmploymentStatus
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_code: str
    employee_name: str
    department: str | None
    attendance_date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    working_minutes: int | None
    status: AttendanceStatus
    is_late: bool
    check_in_ip: str | None
    check_out_ip: str | None


ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    items: list[ItemT]
    total: int
    page: int
    page_size: int


class TodayOut(BaseModel):
    date: date
    timezone: str
    state: Literal["not_checked_in", "checked_in", "checked_out"]
    record: AttendanceOut | None


class EmployeeDashboardOut(BaseModel):
    today: TodayOut
    month: str
    days_present: int
    days_absent: int
    days_late: int
    leave_days: int
    total_working_minutes: int


class DailyTrend(BaseModel):
    date: date
    present: int


class MonthlyTrend(BaseModel):
    month: str
    present: int


class DepartmentTrend(BaseModel):
    department: str
    present: int


class PresentVsAbsent(BaseModel):
    present: int
    absent: int


class AdminDashboardOut(BaseModel):
    date: date
    timezone: str
    total_employees: int
    present_today: int
    absent_today: int
    late_today: int
    currently_checked_in: int
    total_departments: int
    daily_trend: list[DailyTrend]
    monthly_trend: list[MonthlyTrend]
    department_attendance: list[DepartmentTrend]
    present_vs_absent: PresentVsAbsent


class ReportRowOut(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    department: str | None
    present_days: int
    absent_days: int
    late_days: int
    leave_days: int
    total_working_minutes: int
    average_working_minutes: int


class ReportOut(BaseModel):
    start_date: date
    end_date: date
    timezone: str
    rows: list[ReportRowOut]


class AuditOut(BaseModel):
    id: int
    user_id: int | None
    actor_email: str | None
    action: str
    resource_type: str | None
    resource_id: str | None
    ip_address: str | None
    occurred_at: datetime


class SettingsOut(BaseModel):
    timezone: str
    office_start_time: str
    office_end_time: str
    late_after_minutes: int
    half_day_hours: int
    full_day_hours: int


class AttendanceStatusUpdate(BaseModel):
    status: AttendanceStatus
