"""add chat_messages table

Revision ID: e6f7a8b9c0d1
Revises: f5e6d7c8b9a0
Create Date: 2026-04-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e6f7a8b9c0d1"
down_revision: str = "f5e6d7c8b9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent", sa.String(20), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_conversation_id", "chat_messages")
    op.drop_index("ix_chat_messages_user_id", "chat_messages")
    op.drop_table("chat_messages")
