"""add_hashed_password_only

Revision ID: 6b119a39259c
Revises: traceability_001
Create Date: 2026-02-09 11:59:22.730075

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b119a39259c'
down_revision: Union[str, Sequence[str], None] = 'traceability_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('hashed_password', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    pass
