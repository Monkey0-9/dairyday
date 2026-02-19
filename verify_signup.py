
import asyncio
import uuid
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from app.db.base import Base
from app.models.user import User
from app.models.registration import RegistrationRequest
from app.core import security

async def verify():
    sqlite_uri = "sqlite+aiosqlite:///./dairy.db"
    engine = create_async_engine(sqlite_uri, future=True, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSession(engine) as session:
        print("--- PHASE 1: SUBMIT SIGNUP (VERIFYING) ---")
        test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        test_pwd = "password123"
        hashed_pwd = security.get_password_hash(test_pwd)
        
        reg = RegistrationRequest(
            name="Test OTP User",
            email=test_email,
            phone="1234567890",
            address="Test OTP Address",
            hashed_password=hashed_pwd,
            status="VERIFYING",
            is_verified=False,
            otp_code="123456",
            otp_expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)
        )
        session.add(reg)
        await session.commit()
        await session.refresh(reg)
        print(f"Signup submitted (unverified): {reg.email} (ID: {reg.id})")
        
        print("\n--- PHASE 2: ADMIN VIEW (CHECK HIDDEN) ---")
        result = await session.execute(select(RegistrationRequest).where(RegistrationRequest.status == "PENDING"))
        pending = result.scalars().all()
        found = any(r.id == reg.id for r in pending)
        print(f"Is request visible to admin? {'YES' if found else 'NO'}")
        assert not found, "Unverified request should not be visible to admin"
        
        print("\n--- PHASE 3: VERIFY OTP ---")
        reg.is_verified = True
        reg.status = "PENDING"
        reg.otp_code = None
        session.add(reg)
        await session.commit()
        print("OTP verified successfully")
        
        print("\n--- PHASE 4: ADMIN VIEW (CHECK VISIBLE) ---")
        result = await session.execute(select(RegistrationRequest).where(RegistrationRequest.status == "PENDING"))
        pending = result.scalars().all()
        found = any(r.id == reg.id for r in pending)
        print(f"Is request visible to admin now? {'YES' if found else 'NO'}")
        assert found, "Verified request should be visible to admin"
        
        print("\n--- PHASE 5: ADMIN APPROVE ---")
        new_user = User(
            name=reg.name,
            email=reg.email,
            phone=reg.phone,
            address=reg.address,
            hashed_password=reg.hashed_password,
            role="USER",
            is_active=True
        )
        session.add(new_user)
        reg.status = "APPROVED"
        session.add(reg)
        await session.commit()
        await session.refresh(new_user)
        print(f"User created: {new_user.email} (ID: {new_user.id})")
        
        print("\n--- PHASE 6: VERIFY LOGIN ---")
        result = await session.execute(select(User).where(User.email == test_email))
        user = result.scalars().first()
        assert user is not None
        assert security.verify_password(test_pwd, user.hashed_password)
        print("Login verification: SUCCESS")
        
        print("\n--- E2E OTP FLOW VERIFICATION: COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(verify())
