from datetime import timedelta

from conftest import login, request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AuditLog
from app.services.attendance import local_today


def test_validation_does_not_echo_password(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    response = request(
        "POST",
        "/api/v1/employees",
        token=admin,
        json={
            "employee_code": "EMP004",
            "first_name": "A",
            "last_name": "B",
            "email": "bad@example.com",
            "password": "secret123",
            "designation": "Engineer",
            "joining_date": "2026-09-01",
        },
    )
    assert response.status_code == 422
    assert "secret123" not in response.text
    assert response.headers["X-Request-ID"]


def test_settings_and_admin_creation_require_admin(db: Session, users: dict) -> None:
    employee = login("john@example.com", "StrongEmployee123!")
    admin = login("admin@example.com", "StrongAdmin123!")
    assert (
        request(
            "PUT", "/api/v1/admin/settings", token=employee, json={"timezone": "UTC"}
        ).status_code
        == 403
    )
    assert (
        request(
            "POST",
            "/api/v1/auth/admins",
            token=employee,
            json={"email": "boss@example.com", "password": "SecureAdminPassword123!"},
        ).status_code
        == 403
    )
    assert (
        request(
            "PUT", "/api/v1/admin/settings", token=admin, json={"timezone": "Invalid/Zone"}
        ).status_code
        == 422
    )
    response = request(
        "PUT",
        "/api/v1/admin/settings",
        token=admin,
        json={"office_start_time": "09:15:00", "timezone": "UTC"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["office_start_time"] == "09:15:00"
    assert (
        request(
            "POST",
            "/api/v1/auth/admins",
            token=admin,
            json={"email": "boss@example.com", "password": "SecureAdminPassword123!"},
        ).status_code
        == 201
    )


def test_report_rejects_future_range_and_attendance_is_audited(db: Session, users: dict) -> None:
    employee = login("john@example.com", "StrongEmployee123!")
    admin = login("admin@example.com", "StrongAdmin123!")
    check_in = request("POST", "/api/v1/attendance/check-in", token=employee)
    assert check_in.status_code == 201
    assert request("POST", "/api/v1/attendance/check-out", token=employee).status_code == 200
    future = (local_today(db) + timedelta(days=1)).isoformat()
    assert (
        request(
            "GET", "/api/v1/admin/reports", token=admin, params={"end_date": future}
        ).status_code
        == 422
    )
    actions = db.scalars(
        select(AuditLog.action).where(AuditLog.user_id == users["employee"].id)
    ).all()
    assert "employee.checked_in" in actions
    assert "employee.checked_out" in actions


def test_ready_checks_database_and_admin_status_edit_updates_late_metric(
    db: Session, users: dict
) -> None:
    assert request("GET", "/api/v1/ready").status_code == 200
    employee = login("john@example.com", "StrongEmployee123!")
    admin = login("admin@example.com", "StrongAdmin123!")
    record = request("POST", "/api/v1/attendance/check-in", token=employee).json()
    response = request(
        "PUT", f"/api/v1/admin/attendance/{record['id']}", token=admin, json={"status": "late"}
    )
    assert response.status_code == 200
    assert response.json()["is_late"] is True
    today = local_today(db).isoformat()
    report = request(
        "GET", "/api/v1/admin/reports", token=admin, params={"start_date": today, "end_date": today}
    )
    row = next(
        item
        for item in report.json()["rows"]
        if item["employee_id"] == users["employee"].employee.id
    )
    assert row["late_days"] == 1


def test_blank_employee_name_is_rejected(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    response = request(
        "POST",
        "/api/v1/employees",
        token=admin,
        json={
            "employee_code": "EMP005",
            "first_name": "   ",
            "last_name": "Person",
            "email": "blank@example.com",
            "password": "StrongPassword123!",
            "designation": "Engineer",
            "joining_date": "2026-09-01",
        },
    )
    assert response.status_code == 422
