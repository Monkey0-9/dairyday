
import uuid
from sqlalchemy import Column, ForeignKey, Date, Numeric, Boolean, DateTime, text, UniqueConstraint, Index, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base
from app.db.guid import GUID

class Consumption(Base):
    __tablename__ = "consumption"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False, default=0.0)
    extra_qty = Column(Numeric(12, 3), nullable=False, default=0.0) # For pre-orders
    status = Column(String(20), nullable=False, default='PENDING') # PENDING, DELIVERED, CANCELLED, SKIPPED
    locked = Column(Boolean, default=False)
    note = Column(String, nullable=True) # Custom note from user or admin
    
    # Confirmation Workflow fields
    requested_quantity = Column(Numeric(12, 3), nullable=True)
    requested_extra_qty = Column(Numeric(12, 3), nullable=True)
    request_status = Column(String(20), nullable=True) # PENDING, APPROVED, REJECTED
    request_note = Column(String, nullable=True)
    confirmed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Traceability fields
    source = Column(String(10), nullable=False, default='MANUAL')  # MANUAL, API, IMPORT
    version = Column(Integer, nullable=False, default=1)
    is_archived = Column(Boolean, nullable=False, default=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], backref="consumptions")
    admin_confirm = relationship("User", foreign_keys=[confirmed_by])

    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='uix_user_date'),
        Index('idx_consumption_user_date', 'user_id', 'date'),
        Index('idx_consumption_source', 'source'),
        Index('idx_consumption_version', 'version'),
        Index('idx_consumption_is_archived', 'is_archived'),
    )
