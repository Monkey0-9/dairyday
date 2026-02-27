"""merge multiple heads

Revision ID: 4a8a6785a870
Revises: 91b0faf522a8, add_utr_payment_support
Create Date: 2026-02-25 15:35:33.641722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a8a6785a870'
down_revision: Union[str, Sequence[str], None] = ('91b0faf522a8', 'add_utr_payment_support')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
