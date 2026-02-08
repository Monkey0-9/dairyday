"""Add traceability fields to consumption and create archive table

Revision ID: traceability_001
Revises: p0_performance_indexes
Create Date: 2026-01-26 14:30:00.000000

Changes:
- Add source, version, is_archived, archived_at fields to consumption table
- Create consumption_archive table for long-term storage
- Create bill_line_items table for immutable billing records
- Enhance consumption_audit table with source, version, note fields
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'traceability_001'
down_revision: Union[str, Sequence[str], None] = 'xxx_add_audit_and_versions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return table_name in insp.get_table_names()


def column_exists(table_name, column_name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = insp.get_columns(table_name)
    return any(c['name'] == column_name for c in columns)


def index_exists(table_name, index_name):
    bind = op.get_bind()
    insp = sa.inspect(bind)
    indexes = insp.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def upgrade() -> None:
    # Add traceability fields to consumption table
    if not column_exists('consumption', 'source'):
        op.add_column('consumption', 
            sa.Column('source', sa.String(length=10), nullable=False, server_default='MANUAL')
        )
    if not column_exists('consumption', 'version'):
        op.add_column('consumption', 
            sa.Column('version', sa.Integer(), nullable=False, server_default='1')
        )
    if not column_exists('consumption', 'is_archived'):
        op.add_column('consumption', 
            sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false')
        )
    if not column_exists('consumption', 'archived_at'):
        op.add_column('consumption', 
            sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True)
        )
    
    # Create consumption_archive table
    if not table_exists('consumption_archive'):
        op.create_table('consumption_archive',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, 
                      server_default=sa.text('gen_random_uuid()'), nullable=False),
            sa.Column('original_consumption_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('quantity', sa.Numeric(precision=10, scale=3), nullable=False),
            sa.Column('source', sa.String(length=10), nullable=True),
            sa.Column('version', sa.Integer(), nullable=True),
            sa.Column('archived_at', sa.DateTime(timezone=True), nullable=False,
                      server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('archived_payload', sa.JSON, nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                      server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['original_consumption_id'], ['consumption.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
    
    # Add indexes for consumption_archive
    if not index_exists('consumption_archive', 'idx_consumption_archive_user_date'):
        op.create_index('idx_consumption_archive_user_date', 'consumption_archive', ['user_id', 'date'])
    if not index_exists('consumption_archive', 'idx_consumption_archive_archived_at'):
        op.create_index('idx_consumption_archive_archived_at', 'consumption_archive', ['archived_at'])
    if not index_exists('consumption_archive', 'idx_consumption_archive_original_id'):
        op.create_index('idx_consumption_archive_original_id', 'consumption_archive', ['original_consumption_id'])
    
    # Add enhanced fields to consumption_audit table
    if not column_exists('consumption_audit', 'source'):
        op.add_column('consumption_audit', 
            sa.Column('source', sa.String(length=10), nullable=True)
        )
    if not column_exists('consumption_audit', 'version'):
        op.add_column('consumption_audit', 
            sa.Column('version', sa.Integer(), nullable=True)
        )
    if not column_exists('consumption_audit', 'note'):
        op.add_column('consumption_audit', 
            sa.Column('note', sa.Text(), nullable=True)
        )
    if not column_exists('consumption_audit', 'consumption_id'):
        op.add_column('consumption_audit', 
            sa.Column('consumption_id', postgresql.UUID(as_uuid=True), nullable=True)
        )
    
    # Add foreign key for consumption_id in consumption_audit
    # Note: create_foreign_key doesn't have a simple existence check in Alembic API, 
    # but we'll wrap it or rely on the column addition above.
    try:
        op.create_foreign_key('fk_consumption_audit_consumption_id', 'consumption_audit', 'consumption', 
                            ['consumption_id'], ['id'], ondelete='SET NULL')
    except Exception:
        pass
    
    # Create bill_line_items table for immutable billing records
    if not table_exists('bill_line_items'):
        op.create_table('bill_line_items',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, 
                      server_default=sa.text('gen_random_uuid()'), nullable=False),
            sa.Column('bill_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('liters', sa.Numeric(precision=10, scale=3), nullable=False),
            sa.Column('rate_per_liter', sa.Numeric(precision=10, scale=3), nullable=False),
            sa.Column('line_amount', sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                      server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
        )
    
    # Add indexes for bill_line_items
    if not index_exists('bill_line_items', 'idx_bill_line_items_bill_id'):
        op.create_index('idx_bill_line_items_bill_id', 'bill_line_items', ['bill_id'])
    if not index_exists('bill_line_items', 'idx_bill_line_items_date'):
        op.create_index('idx_bill_line_items_date', 'bill_line_items', ['date'])
    
    # Add billing snapshot fields to bills table
    if not column_exists('bills', 'price_per_liter_snapshot'):
        op.add_column('bills', 
            sa.Column('price_per_liter_snapshot', sa.Numeric(precision=10, scale=3), nullable=True)
        )
    if not column_exists('bills', 'line_items_json'):
        op.add_column('bills', 
            sa.Column('line_items_json', sa.JSON, nullable=True)
        )
    if not column_exists('bills', 'is_adjustment'):
        op.add_column('bills', 
            sa.Column('is_adjustment', sa.Boolean(), nullable=False, server_default='false')
        )
    if not column_exists('bills', 'adjustment_reason'):
        op.add_column('bills', 
            sa.Column('adjustment_reason', sa.Text(), nullable=True)
        )
    if not column_exists('bills', 'original_bill_id'):
        op.add_column('bills', 
            sa.Column('original_bill_id', postgresql.UUID(as_uuid=True), nullable=True)
        )
    
    # Add foreign key for original_bill_id
    try:
        op.create_foreign_key('fk_bills_original_bill_id', 'bills', 'bills', 
                            ['original_bill_id'], ['id'], ondelete='SET NULL')
    except Exception:
        pass
    
    # Add indexes for is_archived in consumption table
    if not index_exists('consumption', 'idx_consumption_is_archived'):
        op.create_index('idx_consumption_is_archived', 'consumption', ['is_archived'])
    if not index_exists('consumption', 'idx_consumption_source'):
        op.create_index('idx_consumption_source', 'consumption', ['source'])
    if not index_exists('consumption', 'idx_consumption_version'):
        op.create_index('idx_consumption_version', 'consumption', ['version'])


def downgrade() -> None:
    """Downgrade schema - remove traceability fields and archive tables."""
    
    # Drop billing snapshot fields from bills table
    op.drop_constraint('fk_bills_original_bill_id', 'bills', type_='foreignkey')
    op.drop_index('idx_bills_original_bill_id', table_name='bills')
    op.drop_column('bills', 'original_bill_id')
    op.drop_column('bills', 'adjustment_reason')
    op.drop_column('bills', 'is_adjustment')
    op.drop_column('bills', 'line_items_json')
    op.drop_column('bills', 'price_per_liter_snapshot')
    
    # Drop bill_line_items table
    op.drop_table('bill_line_items')
    
    # Drop enhanced fields from consumption_audit table
    op.drop_constraint('fk_consumption_audit_consumption_id', 'consumption_audit', type_='foreignkey')
    op.drop_column('consumption_audit', 'consumption_id')
    op.drop_column('consumption_audit', 'note')
    op.drop_column('consumption_audit', 'version')
    op.drop_column('consumption_audit', 'source')
    
    # Drop consumption_archive table
    op.drop_index('idx_consumption_archive_original_id', table_name='consumption_archive')
    op.drop_index('idx_consumption_archive_archived_at', table_name='consumption_archive')
    op.drop_index('idx_consumption_archive_user_date', table_name='consumption_archive')
    op.drop_table('consumption_archive')
    
    # Drop traceability fields from consumption table
    op.drop_index('idx_consumption_version', table_name='consumption')
    op.drop_index('idx_consumption_source', table_name='consumption')
    op.drop_index('idx_consumption_is_archived', table_name='consumption')
    op.drop_column('consumption', 'archived_at')
    op.drop_column('consumption', 'is_archived')
    op.drop_column('consumption', 'version')
    op.drop_column('consumption', 'source')