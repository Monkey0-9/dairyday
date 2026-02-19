"""add_2026_dairy_features

Revision ID: 0b2c0b9b74f0
Revises: 6b119a39259c
Create Date: 2026-02-11 23:56:46.532221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = '0b2c0b9b74f0'
down_revision: Union[str, Sequence[str], None] = '6b119a39259c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Using batch_alter_table for SQLite compatibility
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('address', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('daily_target_qty', sa.Numeric(precision=12, scale=3), server_default='1.0', nullable=False))
        batch_op.add_column(sa.Column('language', sa.String(length=5), server_default='en', nullable=False))
        batch_op.add_column(sa.Column('theme', sa.String(length=10), server_default='dark', nullable=False))
        batch_op.add_column(sa.Column('font_size', sa.String(length=10), server_default='medium', nullable=False))

    with op.batch_alter_table('consumption', schema=None) as batch_op:
        batch_op.add_column(sa.Column('extra_qty', sa.Numeric(precision=12, scale=3), server_default='0.0', nullable=False))
        batch_op.add_column(sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False))
        batch_op.add_column(sa.Column('note', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('consumption', schema=None) as batch_op:
        batch_op.drop_column('note')
        batch_op.drop_column('status')
        batch_op.drop_column('extra_qty')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('font_size')
        batch_op.drop_column('theme')
        batch_op.drop_column('language')
        batch_op.drop_column('daily_target_qty')
        batch_op.drop_column('address')
