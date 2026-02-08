"""Add bill versions and database constraints

Revision ID: xxx_add_audit_and_versions
Revises: 146209271ff7
Create Date: 2024-XX-XX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'xxx_add_audit_and_versions'
down_revision = 'p0_performance_indexes'
branch_labels = None
depends_on = None


def table_exists(table_name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table_name in insp.get_table_names()


def upgrade() -> None:
    # 1. Create bill_versions table (missing from initial)
    if not table_exists('bill_versions'):
        op.create_table(
            'bill_versions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('bill_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('bills.id', ondelete='CASCADE'), nullable=False),
            sa.Column('month', sa.String(7), nullable=False),
            sa.Column('total_liters', sa.Numeric(10, 3), nullable=False),
            sa.Column('price_per_liter', sa.Numeric(10, 2), nullable=False),
            sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('user_name', sa.String(255), nullable=False),
            sa.Column('daily_breakdown', sa.Text),  # JSON string of daily consumption
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
    
    # 2. Add CHECK constraint for consumption quantity >= 0 if not exists
    # Using Try/Except in SQL for safety on PostgreSQL
    if op.get_bind().dialect.name == 'postgresql':
        op.execute('''
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'chk_quantity_non_negative'
                ) THEN
                    ALTER TABLE consumption ADD CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0);
                END IF;
            END $$;
        ''')


def downgrade() -> None:
    op.execute('ALTER TABLE consumption DROP CONSTRAINT IF EXISTS chk_quantity_non_negative')
    op.drop_table('bill_versions')
