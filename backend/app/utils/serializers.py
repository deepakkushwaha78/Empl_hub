from datetime import UTC, datetime

from app.models.entities import Attendance, Employee, User
from app.schemas.api import AttendanceOut, EmployeeOut, UserOut


def user_out(user: User) -> UserOut:
    name = (
        f"{user.employee.first_name} {user.employee.last_name}"
        if user.employee
        else "Administrator"
    )
    return UserOut(
        id=user.id,
        name=name,
        email=user.email,
        role=user.role,
        employee_id=user.employee.id if user.employee else None,
        is_active=user.is_active,
    )


def employee_out(employee: Employee) -> EmployeeOut:
    return EmployeeOut(
        id=employee.id,
        employee_code=employee.employee_code,
        user_id=employee.user_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        name=f"{employee.first_name} {employee.last_name}",
        email=employee.user.email,
        phone=employee.phone,
        department_id=employee.department_id,
        department=employee.department.name if employee.department else None,
        designation=employee.designation,
        joining_date=employee.joining_date,
        manager_id=employee.manager_id,
        employment_status=employee.employment_status,
        role=employee.user.role,
        is_active=employee.user.is_active,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
    )


def attendance_out(record: Attendance) -> AttendanceOut:
    employee = record.employee
    minutes = record.working_minutes
    if minutes is None and record.check_in_time and record.check_out_time is None:
        start = record.check_in_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        minutes = max(0, int((datetime.now(UTC) - start).total_seconds() // 60))
    return AttendanceOut(
        id=record.id,
        employee_id=employee.id,
        employee_code=employee.employee_code,
        employee_name=f"{employee.first_name} {employee.last_name}",
        department=employee.department.name if employee.department else None,
        attendance_date=record.attendance_date,
        check_in_time=record.check_in_time,
        check_out_time=record.check_out_time,
        working_minutes=minutes,
        status=record.status,
        is_late=record.is_late,
        check_in_ip=record.check_in_ip,
        check_out_ip=record.check_out_ip,
    )
