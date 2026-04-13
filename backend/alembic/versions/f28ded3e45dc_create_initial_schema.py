"""create initial schema

Revision ID: f28ded3e45dc
Revises: 
Create Date: 2026-03-29 02:52:14.720845
"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f28ded3e45dc'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('adherence_score', sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column('consistency_level', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)

    op.create_table(
        'adherence_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('adherence_date', sa.Date(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_adherence_records_adherence_date'), 'adherence_records', ['adherence_date'], unique=False)
    op.create_index(op.f('ix_adherence_records_user_id'), 'adherence_records', ['user_id'], unique=False)

    op.create_table(
        'behavior_tracking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('adherence_score', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_behavior_tracking_user_id'), 'behavior_tracking', ['user_id'], unique=False)

    op.create_table(
        'health_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('weight_kg', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('bmi', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('steps', sa.Integer(), nullable=True),
        sa.Column('sleep_hours', sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column('height_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_health_metrics_user_id'), 'health_metrics', ['user_id'], unique=False)

    op.create_table(
        'lab_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('test_name', sa.String(length=255), nullable=False),
        sa.Column('value', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('reference_range', sa.String(length=100), nullable=True),
        sa.Column('recorded_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_records_recorded_date'), 'lab_records', ['recorded_date'], unique=False)
    op.create_index(op.f('ix_lab_records_user_id'), 'lab_records', ['user_id'], unique=False)

    op.create_table(
        'plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plans_user_id'), 'plans', ['user_id'], unique=False)

    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('gender', sa.String(length=50), nullable=True),
        sa.Column('height_cm', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('weight_kg', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('goal_target_weight_kg', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('goal_timeline_weeks', sa.Integer(), nullable=True),
        sa.Column('health_conditions', sa.String(length=500), nullable=True),
        sa.Column('activity_level', sa.String(length=50), nullable=True),
        sa.Column('sleep_hours', sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column('diet_pattern', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_profiles_user_id'), 'profiles', ['user_id'], unique=True)

    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reminder_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('scheduled_time', sa.Time(), nullable=False),
        sa.Column('cadence', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reminders_user_id'), 'reminders', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reminders_user_id'), table_name='reminders')
    op.drop_table('reminders')
    op.drop_index(op.f('ix_profiles_user_id'), table_name='profiles')
    op.drop_table('profiles')
    op.drop_index(op.f('ix_plans_user_id'), table_name='plans')
    op.drop_table('plans')
    op.drop_index(op.f('ix_lab_records_user_id'), table_name='lab_records')
    op.drop_index(op.f('ix_lab_records_recorded_date'), table_name='lab_records')
    op.drop_table('lab_records')
    op.drop_index(op.f('ix_health_metrics_user_id'), table_name='health_metrics')
    op.drop_table('health_metrics')
    op.drop_index(op.f('ix_adherence_records_user_id'), table_name='adherence_records')
    op.drop_index(op.f('ix_adherence_records_adherence_date'), table_name='adherence_records')
    op.drop_table('adherence_records')
    op.drop_index(op.f('ix_behavior_tracking_user_id'), table_name='behavior_tracking')
    op.drop_table('behavior_tracking')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
