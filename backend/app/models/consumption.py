
import uuid
from sqlalchemy import Column, ForeignKey, Date, Numeric, Boolean, DateTime, text, UniqueConstraint, Index, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Consumption(Base):
    __tablename__ = "consumption"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False, default=0.0)
    locked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Traceability fields
    source = Column(String(10), nullable=False, default='MANUAL')  # MANUAL, API, IMPORT
    version = Column(Integer, nullable=False, default=1)
    is_archived = Column(Boolean, nullable=False, default=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="consumptions")

    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='uix_user_date'),
        Index('idx_consumption_user_date', 'user_id', 'date'),
        Index('idx_consumption_source', 'source'),
        Index('idx_consumption_version', 'version'),
        Index('idx_consumption_is_archived', 'is_archived'),
    )
