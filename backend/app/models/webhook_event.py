import uuid
from sqlalchemy import Column, String, DateTime, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False)
    event_id = Column(String, nullable=False)
    event_type = Column(String, nullable=True)
    payload = Column(JSON, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint('provider', 'event_id', name='uix_provider_event'),)
