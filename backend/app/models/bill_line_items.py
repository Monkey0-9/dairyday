import uuid
from sqlalchemy import Column, ForeignKey, Date, Numeric, DateTime, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class BillLineItem(Base):
    __tablename__ = "bill_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    liters = Column(Numeric(10, 3), nullable=False)
    rate_per_liter = Column(Numeric(10, 3), nullable=False)
    line_amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    bill = relationship("Bill", foreign_keys=[bill_id], backref="line_items")

    __table_args__ = (
        Index('idx_bill_line_items_bill_id', 'bill_id'),
        Index('idx_bill_line_items_date', 'date'),
    )
