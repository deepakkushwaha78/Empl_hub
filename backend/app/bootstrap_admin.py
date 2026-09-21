"""Create the first admin without a built-in password."""

import argparse
import getpass
import os

from email_validator import validate_email
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.core.security import hash_password
from app.models.entities import Role, User


def bootstrap_admin(db: Session, email: str, password: str) -> User:
    if db.scalar(select(User.id).where(User.role == Role.ADMIN)) is not None:
        raise RuntimeError("An admin already exists; use an authenticated admin to create another")
    if not 12 <= len(password) <= 128:
        raise ValueError("Password must be between 12 and 128 characters")
    normalized = validate_email(email, check_deliverability=False).normalized.lower()
    if db.scalar(select(User.id).where(User.email == normalized)) is not None:
        raise RuntimeError("Email already exists")
    admin = User(email=normalized, password_hash=hash_password(password), role=Role.ADMIN)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create the first production admin")
    parser.add_argument("--email", required=True)
    args = parser.parse_args()
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD") or getpass.getpass("New admin password: ")
    with Session(get_engine()) as session:
        user = bootstrap_admin(session, args.email, password)
    print(f"Admin created: {user.email}")
