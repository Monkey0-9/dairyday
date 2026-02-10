
import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class AuditLog(Base):
    """
    Model for storing audit logs of critical operations.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., "CREATE_USER", "UPDATE_CONSUMPTION"
    target_type = Column(String(50), nullable=False)  # e.g., "USER", "CONSUMPTION"
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)  # Store before/after state or extra info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
