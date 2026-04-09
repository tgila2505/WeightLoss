"""merge_heads_before_profile_state

Revision ID: 519ddc1ee836
Revises: b97a32b65d23, c1d2e3f4a5b6
Create Date: 2026-04-08 18:38:54.099199
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '519ddc1ee836'
down_revision = ('b97a32b65d23', 'c1d2e3f4a5b6')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
