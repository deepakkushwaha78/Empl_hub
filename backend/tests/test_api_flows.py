from datetime import date

from conftest import login, request
from sqlalchemy.orm import Session


def test_login_and_private_route(db: Session, users: dict) -> None:
    assert request("GET", "/api/v1/auth/me").status_code == 401
    assert (
        request(
            "POST", "/api/v1/auth/login", json={"email": "john@example.com", "password": "wrong"}
        ).status_code
        == 401
    )
    token = login("john@example.com", "StrongEmployee123!")
    response = request("GET", "/api/v1/auth/me", token=token)
    assert response.status_code == 200
    assert response.json()["role"] == "employee"
    assert "password_hash" not in response.text


def test_admin_employee_creation_and_restriction(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    employee = login("john@example.com", "StrongEmployee123!")
    payload = {
        "employee_code": "EMP003",
        "first_name": "Rahul",
        "last_name": "Sharma",
        "email": "rahul@example.com",
        "password": "StrongPassword123!",
        "designation": "Cloud Engineer",
        "joining_date": "2026-09-01",
    }
    assert request("POST", "/api/v1/employees", token=employee, json=payload).status_code == 403
    response = request("POST", "/api/v1/employees", token=admin, json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["employee_code"] == "EMP003"
    assert request("POST", "/api/v1/employees", token=admin, json=payload).status_code == 409
    assert request("GET", "/api/v1/employees", token=employee).status_code == 403
    assert (
        request("GET", "/api/v1/employees", token=admin, params={"search": "Rahul"}).json()["total"]
        == 1
    )


def test_check_in_duplicate_check_out_and_history(db: Session, users: dict) -> None:
    token = login("john@example.com", "StrongEmployee123!")
    assert request("POST", "/api/v1/attendance/check-out", token=token).status_code == 409
    checked_in = request("POST", "/api/v1/attendance/check-in", token=token)
    assert checked_in.status_code == 201, checked_in.text
    assert checked_in.json()["check_in_time"] is not None
    assert checked_in.json()["working_minutes"] >= 0
    assert request("POST", "/api/v1/attendance/check-in", token=token).status_code == 409
    checked_out = request("POST", "/api/v1/attendance/check-out", token=token)
    assert checked_out.status_code == 200, checked_out.text
    assert checked_out.json()["working_minutes"] >= 0
    assert request("POST", "/api/v1/attendance/check-out", token=token).status_code == 409
    history = request("GET", "/api/v1/attendance/me", token=token)
    assert history.status_code == 200
    assert history.json()["total"] == 1
    assert request("POST", "/api/v1/attendance/check-in", token=token).status_code == 409


def test_employee_cannot_see_other_attendance_or_admin(db: Session, users: dict) -> None:
    john = login("john@example.com", "StrongEmployee123!")
    sarah = login("sarah@example.com", "StrongEmployee123!")
    request("POST", "/api/v1/attendance/check-in", token=sarah)
    assert request("GET", "/api/v1/attendance/me", token=john).json()["total"] == 0
    assert request("GET", "/api/v1/admin/attendance", token=john).status_code == 403
    assert request("GET", "/api/v1/admin/dashboard", token=john).status_code == 403
    admin = login("admin@example.com", "StrongAdmin123!")
    assert request("GET", "/api/v1/admin/attendance", token=admin).json()["total"] == 1


def test_deactivated_user_cannot_use_existing_token(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    john = login("john@example.com", "StrongEmployee123!")
    employee_id = users["employee"].employee.id
    response = request(
        "PATCH", f"/api/v1/employees/{employee_id}/status", token=admin, json={"is_active": False}
    )
    assert response.status_code == 200, response.text
    assert request("GET", "/api/v1/auth/me", token=john).status_code == 401


def test_admin_reports(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    john = login("john@example.com", "StrongEmployee123!")
    request("POST", "/api/v1/attendance/check-in", token=john)
    today = date.today().isoformat()
    response = request(
        "GET", "/api/v1/admin/reports", token=admin, params={"start_date": today, "end_date": today}
    )
    assert response.status_code == 200, response.text
    assert response.json()["rows"]
