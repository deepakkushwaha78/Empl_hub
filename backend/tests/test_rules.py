from datetime import UTC, datetime, timedelta

from conftest import login, request
from sqlalchemy.orm import Session

from app.models.entities import Attendance, AttendanceSettings
from app.services.attendance import local_today


def test_manual_leave_is_audited_and_excluded_from_absence(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    today = local_today(db).isoformat()
    payload = {
        "employee_id": users["employee"].employee.id,
        "attendance_date": today,
        "status": "leave",
    }
    response = request("POST", "/api/v1/admin/attendance/manual", token=admin, json=payload)
    assert response.status_code == 201, response.text
    report = request(
        "GET", "/api/v1/admin/reports", token=admin, params={"start_date": today, "end_date": today}
    )
    row = next(
        item for item in report.json()["rows"] if item["employee_id"] == payload["employee_id"]
    )
    assert row["leave_days"] == 1
    assert row["absent_days"] == 0


def test_late_flag_survives_half_day_checkout(db: Session, users: dict) -> None:
    settings = db.get(AttendanceSettings, 1)
    settings.office_start_time = settings.office_start_time.replace(hour=0, minute=0)
    db.commit()
    employee = login("john@example.com", "StrongEmployee123!")
    checked_in = request("POST", "/api/v1/attendance/check-in", token=employee)
    assert checked_in.json()["is_late"] is True
    record = db.get(Attendance, checked_in.json()["id"])
    record.check_in_time = datetime.now(UTC) - timedelta(hours=5)
    db.commit()
    checked_out = request("POST", "/api/v1/attendance/check-out", token=employee)
    assert checked_out.json()["status"] == "half_day"
    assert checked_out.json()["is_late"] is True
    admin = login("admin@example.com", "StrongAdmin123!")
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


def test_short_session_is_absent_and_full_day_is_present(db: Session, users: dict) -> None:
    employee = login("john@example.com", "StrongEmployee123!")
    short = request("POST", "/api/v1/attendance/check-in", token=employee)
    assert short.status_code == 201
    short_out = request("POST", "/api/v1/attendance/check-out", token=employee)
    assert short_out.json()["status"] == "absent"
    other = login("sarah@example.com", "StrongEmployee123!")
    full = request("POST", "/api/v1/attendance/check-in", token=other)
    record = db.get(Attendance, full.json()["id"])
    record.check_in_time = datetime.now(UTC) - timedelta(hours=9)
    db.commit()
    full_out = request("POST", "/api/v1/attendance/check-out", token=other)
    assert full_out.json()["working_minutes"] >= 8 * 60
    assert full_out.json()["status"] in {"present", "late"}


def test_login_rate_limit(db: Session, users: dict) -> None:
    for _ in range(5):
        assert (
            request(
                "POST",
                "/api/v1/auth/login",
                json={"email": "john@example.com", "password": "wrong"},
            ).status_code
            == 401
        )
    assert (
        request(
            "POST", "/api/v1/auth/login", json={"email": "john@example.com", "password": "wrong"}
        ).status_code
        == 429
    )


def test_work_from_home_status_survives_checkout(db: Session, users: dict) -> None:
    employee = login("john@example.com", "StrongEmployee123!")
    checked_in = request(
        "POST", "/api/v1/attendance/check-in", token=employee, json={"work_from_home": True}
    )
    assert checked_in.status_code == 201
    assert checked_in.json()["status"] == "work_from_home"
    checked_out = request("POST", "/api/v1/attendance/check-out", token=employee)
    assert checked_out.status_code == 200
    assert checked_out.json()["status"] == "work_from_home"
