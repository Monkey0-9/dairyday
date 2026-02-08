import uuid
from sqlalchemy import Column, String, DateTime, UniqueConstraint, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base

class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    request_hash = Column(String, nullable=False)
    response_body = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('key', 'endpoint', name='uix_key_endpoint'),)
