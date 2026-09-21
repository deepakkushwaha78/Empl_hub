from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.entities import Department, Employee, Role, User


def test_employee_code_is_unique() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Department(name="Engineering"))
        session.flush()
        department = session.query(Department).one()
        for index in (1, 2):
            user = User(
                email=f"person{index}@example.com",
                password_hash="hashed",
                role=Role.EMPLOYEE,
            )
            session.add(user)
            session.flush()
            session.add(
                Employee(
                    employee_code="EMP001",
                    user_id=user.id,
                    first_name="Test",
                    last_name=str(index),
                    department_id=department.id,
                    designation="Engineer",
                    joining_date=date(2026, 9, 1),
                )
            )
            if index == 1:
                session.flush()
        with pytest.raises(IntegrityError):
            session.flush()
