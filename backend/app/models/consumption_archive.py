import uuid
from sqlalchemy import Column, ForeignKey, Date, Numeric, DateTime, text, Index, String, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class ConsumptionArchive(Base):
    __tablename__ = "consumption_archive"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    original_consumption_id = Column(UUID(as_uuid=True), ForeignKey("consumption.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False)
    source = Column(String(10), nullable=True)  # Original source from consumption
    version = Column(Integer, nullable=True)  # Original version from consumption
    archived_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    archived_payload = Column(JSON, nullable=True)  # Full JSON backup of original consumption + audit rows
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    original_consumption = relationship("Consumption", foreign_keys=[original_consumption_id])
    user = relationship("User", foreign_keys=[user_id], backref="archived_consumptions")

    __table_args__ = (
        Index('idx_consumption_archive_user_date', 'user_id', 'date'),
        Index('idx_consumption_archive_archived_at', 'archived_at'),
        Index('idx_consumption_archive_original_id', 'original_consumption_id'),
    )
