"""Add UTR payment fields and performance indexes

Revision ID: add_utr_payment_support
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_utr_payment_support'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add UTR fields to payments table and create performance indexes."""
    
    # 1. Add UTR columns to payments table
    op.add_column('payments', sa.Column('utr_number', sa.String(22), nullable=True))
    op.add_column('payments', sa.Column('payment_method', sa.String(20), nullable=True))
    op.add_column('payments', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('payments', sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('payments', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('payments', sa.Column('verified_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('payments', sa.Column('screenshot_url', sa.String(500), nullable=True))
    op.add_column('payments', sa.Column('notes', sa.String(500), nullable=True))
    op.add_column('payments', sa.Column('rejection_reason', sa.String(500), nullable=True))
    
    # 2. Create indexes for UTR queries
    op.create_index('idx_payments_utr_number', 'payments', ['utr_number'])
    op.create_index('idx_payments_user_id', 'payments', ['user_id'])
    
    # 3. Create partial index for pending UTR verifications (faster admin queries)
    op.execute("""
        CREATE INDEX idx_payments_pending_verification 
        ON payments (submitted_at DESC) 
        WHERE status = 'PENDING_VERIFICATION'
    """)
    
    # 4. Update check constraint to include new statuses
    op.execute("""
        ALTER TABLE payments 
        DROP CONSTRAINT IF EXISTS check_payment_status
    """)
    op.execute("""
        ALTER TABLE payments 
        ADD CONSTRAINT check_payment_status 
        CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'PENDING_VERIFICATION', 'PAID', 'REJECTED'))
    """)
    
    # 5. Add foreign key constraints
    op.create_foreign_key(
        'fk_payments_user_id_users',
        'payments', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_payments_verified_by_users',
        'payments', 'users',
        ['verified_by'], ['id'],
        ondelete='SET NULL'
    )
    
    # 6. Performance indexes for frequently queried columns
    
    # Consumption indexes (most frequently queried)
    op.create_index(
        'idx_consumption_user_date_range',
        'consumption',
        ['user_id', 'date'],
        postgresql_where="locked = false"
    )
    
    # Bills indexes
    op.create_index(
        'idx_bills_user_month_status',
        'bills',
        ['user_id', 'month', 'status']
    )
    
    # Users indexes for soft delete filtering
    op.create_index(
        'idx_users_active',
        'users',
        ['is_deleted', 'is_active', 'role']
    )
    
    # Audit log indexes
    op.create_index(
        'idx_consumption_audit_created_at',
        'consumption_audit',
        ['created_at DESC']
    )
    op.create_index(
        'idx_consumption_audit_user_date',
        'consumption_audit',
        ['user_id', 'date']
    )
    
    print("UTR payment support and performance indexes added successfully!")


def downgrade() -> None:
    """Remove UTR fields and indexes."""
    
    # 1. Drop indexes
    op.drop_index('idx_consumption_audit_user_date', table_name='consumption_audit')
    op.drop_index('idx_consumption_audit_created_at', table_name='consumption_audit')
    op.drop_index('idx_users_active', table_name='users')
    op.drop_index('idx_bills_user_month_status', table_name='bills')
    op.drop_index('idx_consumption_user_date_range', table_name='consumption')
    op.drop_index('idx_payments_pending_verification', table_name='payments')
    op.drop_index('idx_payments_user_id', table_name='payments')
    op.drop_index('idx_payments_utr_number', table_name='payments')
    
    # 2. Drop foreign keys
    op.drop_constraint('fk_payments_verified_by_users', 'payments', type_='foreignkey')
    op.drop_constraint('fk_payments_user_id_users', 'payments', type_='foreignkey')
    
    # 3. Revert check constraint
    op.execute("""
        ALTER TABLE payments 
        DROP CONSTRAINT IF EXISTS check_payment_status
    """)
    op.execute("""
        ALTER TABLE payments 
        ADD CONSTRAINT check_payment_status 
        CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'))
    """)
    
    # 4. Drop columns
    op.drop_column('payments', 'rejection_reason')
    op.drop_column('payments', 'notes')
    op.drop_column('payments', 'screenshot_url')
    op.drop_column('payments', 'verified_by')
    op.drop_column('payments', 'verified_at')
    op.drop_column('payments', 'submitted_at')
    op.drop_column('payments', 'user_id')
    op.drop_column('payments', 'payment_method')
    op.drop_column('payments', 'utr_number')
    
    print("UTR payment support removed (downgrade complete)")
