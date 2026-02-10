
import uuid
from sqlalchemy import Column, ForeignKey, String, Numeric, DateTime, text, UniqueConstraint, Index, Boolean, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month = Column(String, nullable=False) # ISO month: YYYY-MM
    total_liters = Column(Numeric(12, 3), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    status = Column(String, default="UNPAID") # 'PAID' or 'UNPAID'
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Locking Mechanism
    is_locked = Column(Boolean, nullable=False, default=False)
    generated_at = Column(DateTime(timezone=True), nullable=True)

    # Billing snapshot fields for immutable records
    price_per_liter_snapshot = Column(Numeric(10, 3), nullable=True)
    line_items_json = Column(JSON, nullable=True)

    # Adjustment bill fields
    is_adjustment = Column(Boolean, nullable=False, default=False)
    adjustment_reason = Column(Text, nullable=True)
    original_bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)

    # Version for optimistic locking
    version = Column(Integer, nullable=False, server_default='1')

    user = relationship("User", backref="bills", foreign_keys=[user_id])
    original_bill = relationship("Bill", remote_side=[id], foreign_keys=[original_bill_id])

    __table_args__ = (
        UniqueConstraint('user_id', 'month', name='uix_user_month_bill'),
        Index('idx_bills_user_month', 'user_id', 'month'),
        Index('idx_bills_status', 'status'),
        Index('idx_bills_created_at', 'created_at'),
        Index('idx_bills_original_bill_id', 'original_bill_id'),
    )
