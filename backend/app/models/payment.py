
import uuid
from sqlalchemy import Column, ForeignKey, String, Numeric, DateTime, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=True) # 'razorpay' or 'stripe'
    provider_payment_id = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    status = Column(String, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    bill = relationship("Bill", backref="payments")
    __table_args__ = (
        Index('idx_payments_bill_id', 'bill_id'),
    )
