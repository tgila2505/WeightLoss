"""add_experiment_assignments

Revision ID: e5f6a7b8c9d0
Revises: d9e8f7a6b5c4
Create Date: 2026-04-07 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiment_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("experiment_key", sa.String(length=100), nullable=False),
        sa.Column("variant", sa.String(length=50), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "experiment_key", name="uq_experiment_assignment"),
    )
    op.create_index(
        op.f("ix_experiment_assignments_user_id"),
        "experiment_assignments",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_experiment_assignments_user_id"),
        table_name="experiment_assignments",
    )
    op.drop_table("experiment_assignments")
