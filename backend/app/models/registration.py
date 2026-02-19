
import uuid
from sqlalchemy import Column, String, DateTime, text, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base
from app.db.guid import GUID


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    status = Column(
        String,
        default="VERIFYING",
        nullable=False
    )  # VERIFYING, PENDING, APPROVED, REJECTED
    is_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
