import uuid
from enum import Enum as PyEnum
from sqlalchemy import Column, ForeignKey, String, Numeric, DateTime, text, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base


class PaymentStatus(str, PyEnum):
    """Payment status enumeration."""
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"  # UTR submitted, awaiting admin
    PAID = "PAID"  # UTR verified by admin
    REJECTED = "REJECTED"  # UTR rejected by admin


class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    bill_id = Column(
        UUID(as_uuid=True), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False
    )
    provider = Column(String, nullable=True)  # 'razorpay' or 'stripe'
    provider_payment_id = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    status = Column(String, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # UTR (Bank Transfer/UPI) fields
    utr_number = Column(String(22), nullable=True)
    payment_method = Column(String(20), nullable=True)  # 'razorpay', 'bank_transfer', 'upi', 'imps', 'neft', 'rtgs', 'cash'
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    screenshot_url = Column(String(500), nullable=True)
    notes = Column(String(500), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    bill = relationship("Bill", backref="payments")
    user = relationship("User", foreign_keys=[user_id], backref="utr_payments")
    verifier = relationship("User", foreign_keys=[verified_by])
    
    __table_args__ = (
        Index("idx_payments_bill_id", "bill_id"),
        Index("idx_payments_status", "status"),
        Index("idx_payments_created_at", "created_at"),
        Index("idx_payments_utr_number", "utr_number"),
        Index("idx_payments_user_id", "user_id"),
        Index("idx_payments_pending_verification", "status", postgresql_where="status = 'PENDING_VERIFICATION'"),
        CheckConstraint(
            "status IN ('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'PENDING_VERIFICATION', 'PAID', 'REJECTED')",
            name="check_payment_status"
        ),
    )
