"""preserve late arrival when status changes at checkout

Revision ID: 20260921_late_flag
Revises: dc6d2cc9734e
"""

import sqlalchemy as sa

from alembic import op

revision = "20260921_late_flag"
down_revision = "dc6d2cc9734e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "attendance", sa.Column("is_late", sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    op.drop_column("attendance", "is_late")
