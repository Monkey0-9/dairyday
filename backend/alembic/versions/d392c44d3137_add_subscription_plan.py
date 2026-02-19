"""Add subscription plan

Revision ID: d392c44d3137
Revises: 0b2c0b9b74f0
Create Date: 2026-02-12 09:18:20.283718

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision: str = 'd392c44d3137'
down_revision: Union[str, Sequence[str], None] = '0b2c0b9b74f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('subscription_plan', sa.String(length=20), nullable=False, server_default='standard'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('subscription_plan')
    op.create_index(op.f('idx_consumption_date'), 'consumption', ['date'], unique=False)
    op.alter_column('consumption', 'user_id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.alter_column('consumption', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False,
               existing_server_default=sa.text('(gen_random_uuid())'))
    op.alter_column('bills', 'original_bill_id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=True)
    op.alter_column('bills', 'generated_at',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.NUMERIC(),
               existing_nullable=True)
    op.alter_column('bills', 'is_locked',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('(FALSE)'))
    op.alter_column('bills', 'user_id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False)
    op.alter_column('bills', 'id',
               existing_type=sa.UUID(),
               type_=sa.NUMERIC(),
               existing_nullable=False,
               existing_server_default=sa.text('(gen_random_uuid())'))
    op.create_table('consumption_audit',
    sa.Column('id', sa.NUMERIC(), server_default=sa.text('(gen_random_uuid())'), nullable=False),
    sa.Column('user_id', sa.NUMERIC(), nullable=False),
    sa.Column('admin_id', sa.NUMERIC(), nullable=False),
    sa.Column('date', sa.DATE(), nullable=False),
    sa.Column('old_quantity', sa.NUMERIC(precision=8, scale=3), nullable=True),
    sa.Column('new_quantity', sa.NUMERIC(precision=8, scale=3), nullable=False),
    sa.Column('created_at', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('source', sa.VARCHAR(length=10), nullable=True),
    sa.Column('version', sa.INTEGER(), nullable=True),
    sa.Column('note', sa.TEXT(), nullable=True),
    sa.Column('consumption_id', sa.NUMERIC(), nullable=True),
    sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['consumption_id'], ['consumption.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('audit_logs',
    sa.Column('id', sa.NUMERIC(), nullable=False),
    sa.Column('user_id', sa.NUMERIC(), nullable=True),
    sa.Column('action', sa.VARCHAR(length=100), nullable=False),
    sa.Column('target_type', sa.VARCHAR(length=50), nullable=False),
    sa.Column('target_id', sa.VARCHAR(length=100), nullable=True),
    sa.Column('details', sqlite.JSON(), nullable=True),
    sa.Column('ip_address', sa.VARCHAR(length=45), nullable=True),
    sa.Column('user_agent', sa.TEXT(), nullable=True),
    sa.Column('timestamp', sa.DATETIME(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###
