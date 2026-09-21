from conftest import login, request
from sqlalchemy.orm import Session


def test_logout_audit_is_visible_only_to_admin(db: Session, users: dict) -> None:
    employee = login("john@example.com", "StrongEmployee123!")
    admin = login("admin@example.com", "StrongAdmin123!")
    assert request("POST", "/api/v1/auth/logout", token=employee).status_code == 200
    assert request("GET", "/api/v1/admin/audit-logs", token=employee).status_code == 403
    response = request(
        "GET", "/api/v1/admin/audit-logs", token=admin, params={"action": "auth.logout"}
    )
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["user_id"] == users["employee"].id
