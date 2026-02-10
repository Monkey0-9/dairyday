import uuid
from sqlalchemy import Column, ForeignKey, Date, Numeric, DateTime, text, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class ConsumptionAudit(Base):
    __tablename__ = "consumption_audit"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    old_quantity = Column(Numeric(8, 3), nullable=True)
    new_quantity = Column(Numeric(8, 3), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Enhanced traceability fields
    source = Column(String(10), nullable=True)  # Source of the change: MANUAL, API, IMPORT
    version = Column(Integer, nullable=True)  # Version number of the consumption record
    note = Column(Text, nullable=True)  # Admin notes/reason for change
    consumption_id = Column(UUID(as_uuid=True), ForeignKey("consumption.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    consumption = relationship("Consumption", foreign_keys=[consumption_id])
    admin = relationship("User", foreign_keys=[admin_id], backref="audit_actions")
    user = relationship("User", foreign_keys=[user_id], backref="audit_records")
