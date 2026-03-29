"""add plan_refresh_needed to users

Revision ID: a8f3e1d2c9b4
Revises: f28ded3e45dc
Create Date: 2026-03-29 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a8f3e1d2c9b4'
down_revision = 'f28ded3e45dc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'plan_refresh_needed',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('0'),
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'plan_refresh_needed')
