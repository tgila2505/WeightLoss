"""admin console: is_admin column + app_config table

Revision ID: f5e6d7c8b9a0
Revises: d1e2f3a4b5c6
Create Date: 2026-04-09

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = 'f5e6d7c8b9a0'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_admin flag to users
    op.add_column(
        'users',
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )

    # Central app config key-value store
    op.create_table(
        'app_config',
        sa.Column('key', sa.String(255), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_by_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )

    # Seed default AI key rows so admin console always shows them
    op.execute(
        sa.text(
            """
            INSERT INTO app_config (key, value, description) VALUES
            ('groq_api_key',     '', 'Groq API key — primary AI inference provider'),
            ('mistral_api_key',  '', 'Mistral API key — fallback AI inference provider')
            ON CONFLICT (key) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_table('app_config')
    op.drop_column('users', 'is_admin')
