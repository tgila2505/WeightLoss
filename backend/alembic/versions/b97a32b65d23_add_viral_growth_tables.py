"""add_viral_growth_tables

Revision ID: b97a32b65d23
Revises: e5f6a7b8c9d0
Create Date: 2026-04-07 00:21:51.179216
"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b97a32b65d23'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'referrals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('referrer_user_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=12), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['referrer_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_referrals_code'), 'referrals', ['code'], unique=True)
    op.create_index(op.f('ix_referrals_referrer_user_id'), 'referrals', ['referrer_user_id'], unique=False)

    op.create_table(
        'shared_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=16), nullable=False),
        sa.Column('plan_data', sa.JSON(), nullable=False),
        sa.Column('views', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_shared_plans_slug'), 'shared_plans', ['slug'], unique=True)
    op.create_index(op.f('ix_shared_plans_user_id'), 'shared_plans', ['user_id'], unique=False)

    op.create_table(
        'referral_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('referral_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('CLICK', 'SIGNUP', 'PAID_CONVERSION', name='referraleventtype', native_enum=False), nullable=False),
        sa.Column('referred_user_id', sa.Integer(), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['referral_id'], ['referrals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referred_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_referral_events_referral_id'), 'referral_events', ['referral_id'], unique=False)
    op.create_index(op.f('ix_referral_events_referred_user_id'), 'referral_events', ['referred_user_id'], unique=False)

    op.create_table(
        'reward_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('referral_event_id', sa.Integer(), nullable=True),
        sa.Column('reward_type', sa.Enum('PREMIUM_DAYS', name='rewardtype', native_enum=False), nullable=False),
        sa.Column('reward_value', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('APPLIED', 'REVOKED', name='rewardstatus', native_enum=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['referral_event_id'], ['referral_events.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('referral_event_id'),
    )
    op.create_index(op.f('ix_reward_logs_user_id'), 'reward_logs', ['user_id'], unique=False)

    op.add_column('users', sa.Column('premium_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('leaderboard_opt_in', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('users', 'leaderboard_opt_in')
    op.drop_column('users', 'premium_until')
    op.drop_index(op.f('ix_reward_logs_user_id'), table_name='reward_logs')
    op.drop_table('reward_logs')
    op.drop_index(op.f('ix_referral_events_referred_user_id'), table_name='referral_events')
    op.drop_index(op.f('ix_referral_events_referral_id'), table_name='referral_events')
    op.drop_table('referral_events')
    op.drop_index(op.f('ix_shared_plans_user_id'), table_name='shared_plans')
    op.drop_index(op.f('ix_shared_plans_slug'), table_name='shared_plans')
    op.drop_table('shared_plans')
    op.drop_index(op.f('ix_referrals_referrer_user_id'), table_name='referrals')
    op.drop_index(op.f('ix_referrals_code'), table_name='referrals')
    op.drop_table('referrals')
