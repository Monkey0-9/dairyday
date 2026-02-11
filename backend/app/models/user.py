
import uuid
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="USER") # 'ADMIN', 'BILLING_ADMIN', or 'USER'
    price_per_liter = Column(Numeric(10, 3), nullable=False, default=0.0)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=True) # Added for auth
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    preferences = Column(JSON, nullable=True, default={})
