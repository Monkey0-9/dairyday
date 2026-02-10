
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_db
import uuid
from decimal import Decimal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.base import Base
from sqlalchemy.pool import StaticPool

import os
print(f"DEBUG: ENVIRONMENT={os.environ.get('ENVIRONMENT')}")

async def run_debug():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_maker() as db:
        user = User(
            id=uuid.uuid4(),
            email="debug@example.com",
            name="Debug User",
            role="USER",
            is_active=True,
            hashed_password=get_password_hash("pass"),
        )
        db.add(user)
        await db.commit()
        
        async def override_get_db():
            yield db
            
        app.dependency_overrides[get_db] = override_get_db
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://localhost") as client:
            print("\n--- Login ---")
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": "debug@example.com", "password": "pass"}
            )
            print(f"Login Status: {response.status_code}")
            print(f"Login Headers: {dict(response.headers)}")
            print(f"Login Cookies: {dict(response.cookies)}")
            
            print("\n--- Logout ---")
            response = await client.post("/api/v1/auth/logout")
            print(f"Logout Status: {response.status_code}")
            print(f"Logout Body: {response.text}")

        app.dependency_overrides.clear()

if __name__ == "__main__":
    asyncio.run(run_debug())
