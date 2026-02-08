"""Initial migration

Revision ID: f68c50394ceb
Revises: 
Create Date: 2026-01-22 22:32:20.407382

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f68c50394ceb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - creates all tables for Dairy Management System."""
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, 
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=False, server_default='USER'),
        sa.Column('price_per_liter', sa.Numeric(precision=10, scale=3), nullable=False, server_default='0.0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('hashed_password', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('email'),
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_index('idx_users_role', 'users', ['role'], unique=False)

    # Create consumption table
    op.create_table(
        'consumption',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=8, scale=3), nullable=False, server_default='0.0'),
        sa.Column('locked', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'date', name='uix_user_date'),
    )
    op.create_index('idx_consumption_user_date', 'consumption', ['user_id', 'date'], unique=False)
    op.create_index('idx_consumption_date', 'consumption', ['date'], unique=False)

    # Create consumption_audit table
    op.create_table(
        'consumption_audit',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('old_quantity', sa.Numeric(precision=8, scale=3), nullable=True),
        sa.Column('new_quantity', sa.Numeric(precision=8, scale=3), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_consumption_audit_user_id', 'consumption_audit', ['user_id'], unique=False)
    op.create_index('idx_consumption_audit_admin_id', 'consumption_audit', ['admin_id'], unique=False)

    # Create bills table
    op.create_table(
        'bills',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('month', sa.String(), nullable=False),  # Format: YYYY-MM
        sa.Column('total_liters', sa.Numeric(precision=12, scale=3), nullable=False, server_default='0.0'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.0'),
        sa.Column('status', sa.String(), nullable=True, server_default='UNPAID'),
        sa.Column('pdf_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'month', name='uix_user_month_bill'),
    )
    op.create_index('idx_bills_user_month', 'bills', ['user_id', 'month'], unique=False)
    op.create_index('idx_bills_status', 'bills', ['status'], unique=False)

    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('bill_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(), nullable=True),
        sa.Column('provider_payment_id', sa.String(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_payments_bill_id', 'payments', ['bill_id'], unique=False)
    op.create_index('idx_payments_provider_id', 'payments', ['provider_payment_id'], unique=False)

    # Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('request_hash', sa.String(), nullable=False),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('key', 'endpoint', name='uix_key_endpoint'),
    )
    op.create_index('idx_idempotency_key', 'idempotency_keys', ['key', 'endpoint'], unique=False)

    # Create webhook_events table
    op.create_table(
        'webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('processed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True,
                  server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('provider', 'event_id', name='uix_provider_event'),
    )
    op.create_index('idx_webhook_provider_event', 'webhook_events', ['provider', 'event_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('webhook_events')
    op.drop_table('idempotency_keys')
    op.drop_table('payments')
    op.drop_table('bills')
    op.drop_table('consumption_audit')
    op.drop_table('consumption')
    op.drop_table('users')

