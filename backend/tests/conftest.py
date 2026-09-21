import asyncio
from collections.abc import Iterator
from datetime import date

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import models as _models  # noqa: F401
from app.core.config import get_settings
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app as fastapi_app
from app.models.entities import AttendanceSettings, Department, Employee, Role, User


@pytest.fixture
def db(monkeypatch: pytest.MonkeyPatch) -> Iterator[Session]:
    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret-key-with-adequate-length")
    get_settings.cache_clear()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(AttendanceSettings(id=1, timezone="Asia/Kolkata"))
        session.add(Department(name="Engineering"))
        session.commit()

        def override_db() -> Iterator[Session]:
            yield session

        fastapi_app.dependency_overrides[get_db] = override_db
        yield session
    fastapi_app.dependency_overrides.clear()
    engine.dispose()
    get_settings.cache_clear()


@pytest.fixture
def users(db: Session) -> dict[str, User]:
    department = db.query(Department).one()
    admin = User(
        email="admin@example.com", password_hash=hash_password("StrongAdmin123!"), role=Role.ADMIN
    )
    employee = User(
        email="john@example.com",
        password_hash=hash_password("StrongEmployee123!"),
        role=Role.EMPLOYEE,
    )
    other = User(
        email="sarah@example.com",
        password_hash=hash_password("StrongEmployee123!"),
        role=Role.EMPLOYEE,
    )
    db.add_all([admin, employee, other])
    db.flush()
    db.add_all(
        [
            Employee(
                employee_code="EMP001",
                user_id=employee.id,
                first_name="John",
                last_name="Doe",
                department_id=department.id,
                designation="Engineer",
                joining_date=date(2026, 9, 1),
            ),
            Employee(
                employee_code="EMP002",
                user_id=other.id,
                first_name="Sarah",
                last_name="Khan",
                department_id=department.id,
                designation="Engineer",
                joining_date=date(2026, 9, 1),
            ),
        ]
    )
    db.commit()
    return {"admin": admin, "employee": employee, "other": other}


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    json: dict | None = None,
    params: dict | None = None,
) -> httpx.Response:
    async def send() -> httpx.Response:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=fastapi_app), base_url="http://testserver"
        ) as client:
            return await client.request(method, path, headers=headers, json=json, params=params)

    return asyncio.run(send())


def login(email: str, password: str) -> str:
    response = request("POST", "/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]
