from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.entities import AttendanceSettings, AuditLog


def organization_settings(db: Session) -> AttendanceSettings:
    settings = db.get(AttendanceSettings, 1)
    if settings is None:
        settings = AttendanceSettings(id=1)
        db.add(settings)
        db.flush()
    return settings


def audit(
    db: Session,
    action: str,
    *,
    user_id: int | None = None,
    ip_address: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            occurred_at=datetime.now(UTC),
        )
    )
