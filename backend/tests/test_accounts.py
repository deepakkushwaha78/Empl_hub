from conftest import login, request
from sqlalchemy.orm import Session


def test_admin_account_management_and_self_deactivation_guard(db: Session, users: dict) -> None:
    admin = login("admin@example.com", "StrongAdmin123!")
    employee = login("john@example.com", "StrongEmployee123!")
    assert request("GET", "/api/v1/auth/users", token=employee).status_code == 403
    created = request(
        "POST",
        "/api/v1/auth/admins",
        token=admin,
        json={"email": "manager@example.com", "password": "StrongManager123!"},
    )
    assert created.status_code == 201
    account_id = created.json()["id"]
    listed = request("GET", "/api/v1/auth/users", token=admin)
    assert listed.status_code == 200
    assert listed.json()["total"] == 4
    disabled = request(
        "PATCH", f"/api/v1/auth/users/{account_id}/status", token=admin, json={"is_active": False}
    )
    assert disabled.status_code == 200
    assert disabled.json()["is_active"] is False
    assert (
        request(
            "POST",
            "/api/v1/auth/login",
            json={"email": "manager@example.com", "password": "StrongManager123!"},
        ).status_code
        == 401
    )
    assert (
        request(
            "PATCH",
            f"/api/v1/auth/users/{users['admin'].id}/status",
            token=admin,
            json={"is_active": False},
        ).status_code
        == 409
    )
