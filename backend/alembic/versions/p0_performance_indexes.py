"""Add performance indexes and webhook enhancements.

Revision ID: p0_performance_indexes
Revises: 146209271ff7
Create Date: 2024-XX-XX

Changes:
- Add indexes for performance optimization (missing from initial)
- Add version column to bills for optimistic locking
- Add missing webhook audit columns
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'p0_performance_indexes'
down_revision = '146209271ff7'
branch_labels = None
depends_on = None


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


def upgrade():
    # 1. Add version column to bills (missing from initial)
    if not column_exists('bills', 'version'):
        op.add_column('bills', 
            sa.Column('version', sa.Integer(), server_default='1', nullable=False)
        )
    
    # 2. Add missing columns to webhook_events
    if not column_exists('webhook_events', 'event_type'):
        op.add_column('webhook_events', 
            sa.Column('event_type', sa.String(), nullable=True)
        )
    if not column_exists('webhook_events', 'status'):
        op.add_column('webhook_events', 
            sa.Column('status', sa.String(), server_default='received', nullable=True)
        )
    
    # 3. Add missing indexes for performance
    
    # Bills table
    if not index_exists('bills', 'idx_bills_created_at'):
        op.create_index('idx_bills_created_at', 'bills', ['created_at'])
    
    # Payments table
    for idx, col in [
        ('idx_payments_status', 'status'),
        ('idx_payments_provider', 'provider'),
        ('idx_payments_paid_at', 'paid_at'),
        ('idx_payments_provider_payment_id', 'provider_payment_id')
    ]:
        if not index_exists('payments', idx):
            op.create_index(idx, 'payments', [col])
    
    # Users table
    if not index_exists('users', 'idx_users_is_active'):
        op.create_index('idx_users_is_active', 'users', ['is_active'])
    
    # Webhook events
    if not index_exists('webhook_events', 'idx_webhook_event_type'):
        op.create_index('idx_webhook_event_type', 'webhook_events', ['event_type'])
    if not index_exists('webhook_events', 'idx_webhook_status_new'):
        op.create_index('idx_webhook_status_new', 'webhook_events', ['status'])
    
    # Idempotency keys
    if not index_exists('idempotency_keys', 'idx_idempotency_endpoint_new'):
        op.create_index('idx_idempotency_endpoint_new', 'idempotency_keys', ['endpoint'])
    if not index_exists('idempotency_keys', 'idx_idempotency_created_at'):
        op.create_index('idx_idempotency_created_at', 'idempotency_keys', ['created_at'])


def downgrade():
    op.drop_index('idx_idempotency_created_at', table_name='idempotency_keys')
    op.drop_index('idx_idempotency_endpoint_new', table_name='idempotency_keys')
    op.drop_index('idx_webhook_status_new', table_name='webhook_events')
    op.drop_index('idx_webhook_event_type', table_name='webhook_events')
    op.drop_index('idx_users_is_active', table_name='users')
    op.drop_index('idx_payments_provider_payment_id', table_name='payments')
    op.drop_index('idx_payments_paid_at', table_name='payments')
    op.drop_index('idx_payments_provider', table_name='payments')
    op.drop_index('idx_payments_status', table_name='payments')
    op.drop_index('idx_bills_created_at', table_name='bills')
    
    op.drop_column('webhook_events', 'status', schema=None)
    op.drop_column('webhook_events', 'event_type', schema=None)
    op.drop_column('bills', 'version', schema=None)
