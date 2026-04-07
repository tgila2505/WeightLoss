"""phase14 seo tables

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd2e3f4a5b6c7'
down_revision = 'c1d2e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'seo_page',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=300), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('meta_description', sa.String(length=300), nullable=True),
        sa.Column('h1', sa.String(length=200), nullable=True),
        sa.Column('diet_type', sa.String(length=80), nullable=True),
        sa.Column('goal_type', sa.String(length=80), nullable=True),
        sa.Column('activity_level', sa.String(length=80), nullable=True),
        sa.Column('age_range', sa.String(length=40), nullable=True),
        sa.Column('content_json', postgresql.JSONB(), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('indexed', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_seo_page_slug', 'seo_page', ['slug'], unique=True)
    op.create_index('ix_seo_page_diet_type', 'seo_page', ['diet_type'])
    op.create_index('ix_seo_page_goal_type', 'seo_page', ['goal_type'])

    op.create_table(
        'blog_post',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=300), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('excerpt', sa.Text(), nullable=True),
        sa.Column('content_mdx', sa.Text(), nullable=True),
        sa.Column('author', sa.String(length=100), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_blog_post_slug', 'blog_post', ['slug'], unique=True)
    op.create_index('ix_blog_post_published_at', 'blog_post', ['published_at'])

    op.create_table(
        'user_generated_page',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('slug', sa.String(length=300), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('kg_lost', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('weeks_taken', sa.Integer(), nullable=True),
        sa.Column('diet_type', sa.String(length=80), nullable=True),
        sa.Column('testimonial', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_generated_page_slug', 'user_generated_page', ['slug'], unique=True)
    op.create_index('ix_user_generated_page_user_id', 'user_generated_page', ['user_id'])

    op.create_table(
        'keyword_mapping',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('keyword', sa.String(length=300), nullable=False),
        sa.Column('target_slug', sa.String(length=300), nullable=False),
        sa.Column('search_volume_est', sa.Integer(), nullable=True),
        sa.Column('difficulty_est', sa.Integer(), nullable=True),
        sa.Column('page_type', sa.String(length=40), nullable=False, server_default='pseo'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_keyword_mapping_keyword', 'keyword_mapping', ['keyword'], unique=True)
    op.create_index('ix_keyword_mapping_target_slug', 'keyword_mapping', ['target_slug'])


def downgrade() -> None:
    op.drop_table('keyword_mapping')
    op.drop_table('user_generated_page')
    op.drop_table('blog_post')
    op.drop_table('seo_page')
