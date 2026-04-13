"""questionnaire_tables

Revision ID: c3d4e5f6a7b8
Revises: a8f3e1d2c9b4
Create Date: 2026-04-05 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'c3d4e5f6a7b8'
down_revision = 'a8f3e1d2c9b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'questionnaire_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('node_id', sa.String(length=100), nullable=False),
        sa.Column('answers', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'node_id', name='uq_questionnaire_user_node'),
    )
    op.create_index(
        'ix_questionnaire_responses_user_id',
        'questionnaire_responses',
        ['user_id'],
    )

    op.create_table(
        'master_user_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profile_text', sa.Text(), nullable=False),
        sa.Column(
            'generated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('(CURRENT_TIMESTAMP)'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_master_user_profiles_user_id'),
    )
    op.create_index(
        'ix_master_user_profiles_user_id',
        'master_user_profiles',
        ['user_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_master_user_profiles_user_id', table_name='master_user_profiles')
    op.drop_table('master_user_profiles')
    op.drop_index('ix_questionnaire_responses_user_id', table_name='questionnaire_responses')
    op.drop_table('questionnaire_responses')
