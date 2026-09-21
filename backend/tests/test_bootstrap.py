import pytest
from sqlalchemy.orm import Session

from app.bootstrap_admin import bootstrap_admin
from app.core.security import verify_password


def test_bootstrap_creates_first_admin_once(db: Session) -> None:
    admin = bootstrap_admin(db, "first@example.com", "UniquePassword123!")
    assert admin.role.value == "admin"
    assert verify_password("UniquePassword123!", admin.password_hash)
    with pytest.raises(RuntimeError, match="already exists"):
        bootstrap_admin(db, "second@example.com", "AnotherPassword123!")
