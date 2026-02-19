
import uuid
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, text
from sqlalchemy.sql import func
from app.db.base_class import Base
from app.db.guid import GUID


class User(Base):
    __tablename__ = "users"

    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    logto_id = Column(String, unique=True, nullable=True, index=True)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="USER")  # 'ADMIN' or 'USER'
    price_per_liter = Column(Numeric(10, 3), nullable=False, default=0.0)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=True)  # Added for auth
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # New fields for 2026 Dairy Management
    address = Column(String, nullable=True)
    # Standard daily delivery
    daily_target_qty = Column(Numeric(12, 3), nullable=False, default=1.0)
    language = Column(String(5), nullable=False, default='en')  # en, kn, ta...
    theme = Column(String(10), nullable=False, default='dark')  # dark, light
    font_size = Column(String(10), nullable=False, default='medium')
    subscription_plan = Column(
        String(20), nullable=False, default='standard'
    )  # standard, premium, gold
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
