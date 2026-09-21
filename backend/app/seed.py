"""Development-only sample data. Run: python -m app.seed --development."""

import argparse
import secrets
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_engine
from app.core.security import hash_password
from app.models.entities import AttendanceSettings, Department, Employee, Role, User

SAMPLES = [
    ("EMP001", "John", "Doe", "john@example.com", "DevOps Engineer", "DevOps"),
    ("EMP002", "Sarah", "Khan", "sarah@example.com", "Software Engineer", "Engineering"),
    ("EMP003", "Rahul", "Sharma", "rahul@example.com", "Cloud Engineer", "Cloud"),
]


def seed_development() -> list[tuple[str, str]]:
    if get_settings().environment == "production":
        raise RuntimeError("Development seed is disabled in production")
    credentials: list[tuple[str, str]] = []
    with Session(get_engine()) as db:
        if not db.get(AttendanceSettings, 1):
            db.add(AttendanceSettings(id=1))
        departments: dict[str, Department] = {}
        for name in {item[5] for item in SAMPLES}:
            department = db.scalar(select(Department).where(Department.name == name))
            if not department:
                department = Department(name=name)
                db.add(department)
                db.flush()
            departments[name] = department
        admin_email = "admin@example.com"
        if not db.scalar(select(User).where(User.email == admin_email)):
            password = secrets.token_urlsafe(18)
            db.add(User(email=admin_email, password_hash=hash_password(password), role=Role.ADMIN))
            credentials.append((admin_email, password))
        for code, first, last, email, designation, department_name in SAMPLES:
            if db.scalar(select(User).where(User.email == email)):
                continue
            password = secrets.token_urlsafe(18)
            user = User(email=email, password_hash=hash_password(password), role=Role.EMPLOYEE)
            db.add(user)
            db.flush()
            db.add(
                Employee(
                    employee_code=code,
                    user_id=user.id,
                    first_name=first,
                    last_name=last,
                    department_id=departments[department_name].id,
                    designation=designation,
                    joining_date=date(2026, 9, 1),
                )
            )
            credentials.append((email, password))
        db.commit()
    return credentials


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--development", action="store_true", help="Acknowledge creation of development accounts"
    )
    args = parser.parse_args()
    if not args.development:
        parser.error("Pass --development to seed sample accounts")
    created = seed_development()
    if created:
        print("Development credentials (shown once):")
        for email, password in created:
            print(f"{email}: {password}")
    else:
        print("Development accounts already exist; no passwords changed.")
