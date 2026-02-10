"""
Pytest configuration and fixtures for DairyOS tests.
"""
import os
import sys
import asyncio
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport
from app.db.base import Base
from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.models.consumption import Consumption
from app.core.security import get_password_hash
from decimal import Decimal
import uuid

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set test environment
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["SENTRY_DSN"] = ""  # Disable Sentry in tests
os.environ["POSTGRES_SERVER"] = "localhost"
os.environ["JWT_AUDIENCE"] = "dairy-os"
os.environ["JWT_ISSUER"] = "dairy-os"


# Create async engine for tests
@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def engine():
    """Create async engine for tests with function scope for isolation."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async_session_maker = async_sessionmaker(
        engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session
        # Rollback any uncommitted changes
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client with database dependency override."""
    from app.core.config import get_settings
    
    # Force settings override for JWT claims
    app_settings = get_settings()
    app_settings.JWT_AUDIENCE = "dairy-os"
    app_settings.JWT_ISSUER = "dairy-os"
    
    async def override_get_db():
        yield db_session
        
    async def override_get_settings():
        return app_settings
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        role="USER",
        price_per_liter=Decimal("60.00"),
        is_active=True,
        hashed_password=get_password_hash("password123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        name="Test Admin",
        role="ADMIN",
        price_per_liter=Decimal("60.00"),
        is_active=True,
        hashed_password=get_password_hash("adminpass123"),
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient, test_admin: User) -> str:
    """Get admin access token for tests."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin@example.com", "password": "adminpass123"}
    )
    assert response.status_code == 200
    data = response.json()
    token = data.get("access_token") or response.cookies.get("access_token")
    assert token is not None
    return token


@pytest_asyncio.fixture
async def user_token(client: AsyncClient, test_user: User) -> str:
    """Get user access token for tests."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    token = data.get("access_token") or response.cookies.get("access_token")
    assert token is not None
    return token


@pytest_asyncio.fixture
async def auth_headers(admin_token: str) -> dict:
    """Get authorization headers for admin requests."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def user_auth_headers(user_token: str) -> dict:
    """Get authorization headers for user requests."""
    return {"Authorization": f"Bearer {user_token}"}


@pytest_asyncio.fixture
async def test_consumption(db_session: AsyncSession, test_user: User) -> Consumption:
    """Create test consumption for a user."""
    from datetime import date
    consumption = Consumption(
        id=uuid.uuid4(),
        user_id=test_user.id,
        date=date.today(),
        quantity=Decimal("5.0")
    )
    db_session.add(consumption)
    await db_session.commit()
    await db_session.refresh(consumption)
    return consumption
